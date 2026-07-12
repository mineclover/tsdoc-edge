/** CLI adapter for the revision-pinned spec-binding convention loop. */

import { createHash, randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConfigManager } from '../config/ConfigManager';
import {
  type ConventionCheckResult,
  ConventionCheckService,
  compileConventionPackFile,
  loadJestJsonEvidence,
} from '../convention';
import { DEFAULT_CANONICAL_GRAPH_DATABASE } from '../indexer';
import { ConventionCheckHistoryRepository } from '../storage/ConventionCheckHistoryRepository';
import { GraphRepository } from '../storage/GraphRepository';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

export type ConventionFailureThreshold = 'error' | 'warning' | 'info' | 'never';
export const CONVENTION_GATE_CONTRACT_VERSION = '1.0' as const;
export const CONVENTION_GATE_EVALUATOR_ID = 'tsdoc-edge/convention-gate' as const;
export const CONVENTION_GATE_EVALUATOR_VERSION = '1.0.0' as const;

export interface ConventionGateDecision {
  readonly contractVersion: typeof CONVENTION_GATE_CONTRACT_VERSION;
  readonly evaluatorId: typeof CONVENTION_GATE_EVALUATOR_ID;
  readonly evaluatorVersion: typeof CONVENTION_GATE_EVALUATOR_VERSION;
  readonly gateId: string;
  readonly failureThreshold: ConventionFailureThreshold;
  readonly failed: boolean;
  readonly blockingFindingIds: readonly string[];
}

export type ConventionCheckCommandOutput = ConventionCheckResult & {
  readonly gate: ConventionGateDecision;
};

/** Check one authored convention pack against a saved canonical graph revision. */
export class ConventionCheckCommand extends BaseCommand {
  getName(): string {
    return 'convention-check';
  }

  getDescription(): string {
    return 'Check a revision-pinned spec-binding convention pack';
  }

  protected getUsage(): string {
    return `tsdoc-edge convention check --pack <file> [options]

  Required:
    --pack <file>                 Workspace-local convention pack JSON

  Options:
    --graph-db <file>             Canonical graph DB (default: .tsdoc/canonical-graph.db)
    --code-revision <id>          Exact retained code revision (default: active revision)
    --suppression-as-of <time>    RFC3339 clock required by expiring suppressions
    --expected-manifest <id>      Exact convention manifest lock for CI/release checks
    --evidence <file>             Complete Jest JSON artifact for verification bindings
    --history-db <file>           Append validated retained inputs and result history
    --fail-on <level>             error|warning|info|never (default: error)
    --json                        Print the complete pinned result as JSON
    --output <file>               Write JSON outside the canonical DB directory

  This v1 checks exact implementation/verification/constraint/governance
  bindings plus configured naming and TSDoc tag conventions on one saved graph revision.`;
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      const argumentError = validateConventionArguments(args);
      if (argumentError) {
        this.printError(argumentError);
        return this.failure(argumentError, 2);
      }
      if (this.hasHelpFlag(args)) return this.displayHelp();
      const packPath = this.getOption(args, '--pack');
      if (!packPath) {
        this.printError('--pack <file> is required');
        return this.failure('--pack <file> is required', 2);
      }
      const failOn = this.failureThreshold(args);
      if (!failOn) {
        this.printError('--fail-on must be one of error, warning, info, or never');
        return this.failure('Invalid --fail-on value', 2);
      }
      const graphDatabaseInput = path.resolve(
        process.cwd(),
        this.getOption(args, '--graph-db') ??
          process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB ??
          DEFAULT_CANONICAL_GRAPH_DATABASE
      );
      if (!fs.existsSync(graphDatabaseInput)) {
        const message = `Canonical graph database not found: ${graphDatabaseInput}. Run build --canonical-graph first.`;
        this.printError(message);
        return this.failure(message, 2);
      }
      const graphDatabase = fs.realpathSync(graphDatabaseInput);
      const outputPath = this.getOption(args, '--output');
      const evidencePath = this.getOption(args, '--evidence');
      if (
        outputPath &&
        evidencePath &&
        sameFile(path.resolve(process.cwd(), outputPath), path.resolve(process.cwd(), evidencePath))
      ) {
        const message = '--output must not overwrite the Jest evidence artifact';
        this.printError(message);
        return this.failure(message, 2);
      }
      if (outputPath) {
        const absoluteOutput = path.resolve(process.cwd(), outputPath);
        const absolutePack = path.resolve(process.cwd(), packPath);
        const protectedGraphPaths = [
          graphDatabaseInput,
          graphDatabase,
          ...[graphDatabaseInput, graphDatabase].flatMap((database) => [
            `${database}-wal`,
            `${database}-shm`,
            `${database}-journal`,
          ]),
        ];
        if (
          sameFile(path.dirname(absoluteOutput), path.dirname(graphDatabase)) ||
          protectedGraphPaths.some((protectedPath) => sameFile(absoluteOutput, protectedPath)) ||
          sameFile(absoluteOutput, absolutePack)
        ) {
          const message =
            '--output must be outside the canonical graph DB directory and must not overwrite the convention pack';
          this.printError(message);
          return this.failure(message, 2);
        }
      }

      let repository: GraphRepository | undefined;
      try {
        const pack = compileConventionPackFile(packPath, { workspaceRoot: process.cwd() });
        const evidence = evidencePath
          ? loadJestJsonEvidence({
              artifactPath: evidencePath,
              workspaceRoot: process.cwd(),
              workspaceId: pack.manifest.scope.workspaceId,
            })
          : undefined;
        repository = new GraphRepository(graphDatabase, { readOnly: true });
        const requestedRevisionId = this.getOption(args, '--code-revision');
        const codeRevision = requestedRevisionId
          ? repository.readRevision(requestedRevisionId)
          : repository.readActiveRevision();
        if (!codeRevision) {
          const message = requestedRevisionId
            ? `Canonical graph revision not found: ${requestedRevisionId}`
            : `Canonical graph database has no active revision: ${graphDatabase}`;
          this.printError(message);
          return this.failure(message, 2);
        }
        const governance = ConfigManager.getInstance(process.cwd()).get().specGovernance;
        const result = new ConventionCheckService().run({
          pack,
          codeRevision,
          workspaceRoot: process.cwd(),
          ...(evidence ? { evidence } : {}),
          ...(governance?.naming ? { naming: governance.naming } : {}),
          ...(governance?.tsdoc ? { tsdoc: governance.tsdoc } : {}),
          ...(this.getOption(args, '--expected-manifest')
            ? { expectedManifestId: this.getOption(args, '--expected-manifest') }
            : {}),
          ...(this.getOption(args, '--suppression-as-of')
            ? { suppressionAsOf: this.getOption(args, '--suppression-as-of') }
            : {}),
        });
        const blocking = blockingFindings(result, failOn);
        const gate = gateDecision(result.checkId, failOn, blocking);
        const historyDatabase = this.getOption(args, '--history-db');
        const historyId = historyDatabase
          ? appendHistory(path.resolve(process.cwd(), historyDatabase), result)
          : undefined;
        const output: ConventionCheckCommandOutput = Object.freeze({ ...result, gate });
        const json = JSON.stringify(output, null, 2);
        if (outputPath) {
          const absoluteOutput = path.resolve(process.cwd(), outputPath);
          fs.mkdirSync(path.dirname(absoluteOutput), { recursive: true });
          atomicWriteFile(absoluteOutput, `${json}\n`);
        }
        if (this.hasFlag(args, '--json')) console.log(json);
        else this.printHumanResult(result, gate, outputPath, historyId);

        if (gate.failed) {
          return {
            exitCode: 1,
            message: `Convention check failed with ${gate.blockingFindingIds.length} blocking finding(s)`,
          };
        }
        return this.success('Convention check passed');
      } catch (error) {
        const normalized = error instanceof Error ? error : new Error(String(error));
        this.printError(normalized.message);
        return this.failure(normalized, 2);
      } finally {
        repository?.close();
      }
    });
  }

  private failureThreshold(args: string[]): ConventionFailureThreshold | null {
    const value = this.getOption(args, '--fail-on') ?? 'error';
    return value === 'error' || value === 'warning' || value === 'info' || value === 'never'
      ? value
      : null;
  }

  private printHumanResult(
    result: ConventionCheckResult,
    gate: ConventionGateDecision,
    outputPath?: string,
    historyId?: string
  ): void {
    this.printHeader('Convention Pack Check');
    console.log(
      `${colors.bold}Pack:${colors.reset} ${result.pack.packId}@${result.pack.packVersion}`
    );
    console.log(`${colors.bold}Manifest:${colors.reset} ${result.pack.manifestId}`);
    console.log(`${colors.bold}Code revision:${colors.reset} ${result.codeRevisionId}`);
    console.log(`${colors.bold}Spec revision:${colors.reset} ${result.inputStamp.specRevisionId}`);
    console.log(
      `${colors.bold}Policy revision:${colors.reset} ${result.inputStamp.policyRevisionId}`
    );
    console.log(
      `${colors.bold}Evidence revision:${colors.reset} ${result.inputStamp.evidenceRevisionId}`
    );
    console.log(
      `${colors.bold}Effective view:${colors.reset} ${result.inputStamp.effectiveViewId}`
    );
    console.log(`${colors.bold}Binding set:${colors.reset} ${result.bindingResolutionSetId}`);
    console.log(`${colors.bold}Naming report:${colors.reset} ${result.naming.reportId}`);
    console.log(`${colors.bold}TSDoc report:${colors.reset} ${result.tsdoc.reportId}`);
    console.log(`${colors.bold}Report:${colors.reset} ${result.conformance.reportId}`);
    console.log(
      `${colors.bold}Gate:${colors.reset} ${gate.gateId} (${gate.failureThreshold}, ${gate.failed ? 'failed' : 'passed'})`
    );
    console.log();
    this.printSection('Findings');
    for (const finding of result.conformance.findings) {
      const color = findingColor(finding.outcome);
      const mark =
        finding.outcome === 'satisfied' ? '✓' : finding.outcome === 'suppressed' ? '⊘' : '✗';
      console.log(
        `${color}${mark} ${finding.declarationId}${colors.reset} ` +
          `[${finding.severity}] ${finding.ruleId} → ${finding.outcome}`
      );
      for (const diagnostic of finding.diagnosticCodes) {
        console.log(`  ${colors.dim}${diagnostic}${colors.reset}`);
      }
      if (finding.suppressionId) {
        console.log(`  ${colors.yellow}suppression: ${finding.suppressionId}${colors.reset}`);
      }
    }
    console.log();
    this.printSection('Summary');
    const summary = result.conformance.summary;
    console.log(
      `total=${summary.total} satisfied=${summary.satisfied} violated=${summary.violated} ` +
        `indeterminate=${summary.indeterminate} suppressed=${summary.suppressed} disabled=${summary.disabled}`
    );
    if (result.conformance.unappliedSuppressionIds.length > 0) {
      this.printWarning(
        `Unapplied suppressions: ${result.conformance.unappliedSuppressionIds.join(', ')}`
      );
    }
    if (result.naming.findings.length > 0) {
      this.printSection('Naming Findings');
      for (const finding of result.naming.findings) {
        console.log(
          `${findingColor(finding.outcome)}✗ ${finding.ruleId}${colors.reset} ` +
            `[${finding.severity}] ${finding.file} → ${finding.subject} (expected ${finding.expected})`
        );
      }
    }
    if (result.tsdoc.findings.length > 0) {
      this.printSection('TSDoc Findings');
      for (const finding of result.tsdoc.findings) {
        console.log(
          `${findingColor(finding.outcome)}✗ ${finding.ruleId}${colors.reset} ` +
            `[${finding.severity}] ${finding.file} → ${finding.nodeId} ` +
            `(missing ${finding.missingTags.map((tag) => `@${tag}`).join(', ')})`
        );
      }
    }
    if (outputPath) this.printInfo(`JSON report written to ${path.resolve(outputPath)}`);
    if (historyId) this.printInfo(`Retained convention history: ${historyId}`);
  }
}

type GateFinding =
  | ConventionCheckResult['conformance']['findings'][number]
  | ConventionCheckResult['naming']['findings'][number]
  | ConventionCheckResult['tsdoc']['findings'][number];

function allFindings(result: ConventionCheckResult): readonly GateFinding[] {
  return [...result.conformance.findings, ...result.naming.findings, ...result.tsdoc.findings];
}

function blockingFindings(
  result: ConventionCheckResult,
  threshold: ConventionFailureThreshold
): readonly GateFinding[] {
  if (threshold === 'never') return [];
  const minimum = severityRank(threshold);
  return allFindings(result).filter(
    (finding) =>
      (finding.outcome === 'violated' || finding.outcome === 'indeterminate') &&
      severityRank(finding.severity) >= minimum
  );
}

function severityRank(value: Exclude<ConventionFailureThreshold, 'never'>): number {
  return value === 'error' ? 3 : value === 'warning' ? 2 : 1;
}

function gateDecision(
  checkId: string,
  failureThreshold: ConventionFailureThreshold,
  blocking: readonly GateFinding[]
): ConventionGateDecision {
  const blockingFindingIds = Object.freeze(blocking.map((finding) => finding.findingId));
  const identity = JSON.stringify({
    contractVersion: CONVENTION_GATE_CONTRACT_VERSION,
    evaluatorId: CONVENTION_GATE_EVALUATOR_ID,
    evaluatorVersion: CONVENTION_GATE_EVALUATOR_VERSION,
    checkId,
    failureThreshold,
    blockingFindingIds,
  });
  return Object.freeze({
    contractVersion: CONVENTION_GATE_CONTRACT_VERSION,
    evaluatorId: CONVENTION_GATE_EVALUATOR_ID,
    evaluatorVersion: CONVENTION_GATE_EVALUATOR_VERSION,
    gateId: `convention-gate:${createHash('sha256').update(identity).digest('hex')}`,
    failureThreshold,
    failed: blockingFindingIds.length > 0,
    blockingFindingIds,
  });
}

function appendHistory(databasePath: string, result: ConventionCheckResult): string {
  const repository = new ConventionCheckHistoryRepository(databasePath);
  try {
    return repository.append({
      check: result,
      inputs: result.retainedInputs,
    }).historyId;
  } finally {
    repository.close();
  }
}

function findingColor(
  outcome: ConventionCheckResult['conformance']['findings'][number]['outcome']
): string {
  if (outcome === 'satisfied') return colors.green;
  if (outcome === 'suppressed' || outcome === 'disabled') return colors.yellow;
  return colors.red;
}

function sameFile(left: string, right: string): boolean {
  const leftResolved = path.resolve(left);
  const rightResolved = path.resolve(right);
  const leftIdentity = canonicalPathIdentity(leftResolved);
  const rightIdentity = canonicalPathIdentity(rightResolved);
  if (leftIdentity === rightIdentity) return true;
  if (!fs.existsSync(leftResolved) || !fs.existsSync(rightResolved)) return false;
  const leftReal = fs.realpathSync(leftResolved);
  const rightReal = fs.realpathSync(rightResolved);
  if (leftReal === rightReal) return true;
  const leftStat = fs.statSync(leftResolved);
  const rightStat = fs.statSync(rightResolved);
  return leftStat.dev === rightStat.dev && leftStat.ino === rightStat.ino;
}

function canonicalPathIdentity(value: string): string {
  let existingAncestor = path.resolve(value);
  const suffix: string[] = [];
  while (!fs.existsSync(existingAncestor)) {
    const parent = path.dirname(existingAncestor);
    if (parent === existingAncestor) return path.resolve(value);
    suffix.unshift(path.basename(existingAncestor));
    existingAncestor = parent;
  }
  return path.join(fs.realpathSync(existingAncestor), ...suffix);
}

const CONVENTION_VALUE_OPTIONS = new Set([
  '--pack',
  '--graph-db',
  '--code-revision',
  '--suppression-as-of',
  '--expected-manifest',
  '--fail-on',
  '--output',
  '--evidence',
  '--history-db',
]);
const CONVENTION_BOOLEAN_OPTIONS = new Set(['--json', '--help', '-h']);

function validateConventionArguments(args: readonly string[]): string | null {
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (CONVENTION_BOOLEAN_OPTIONS.has(argument)) {
      const identity = argument === '-h' ? '--help' : argument;
      if (seen.has(identity)) return `Duplicate convention option: ${identity}`;
      seen.add(identity);
      continue;
    }
    if (CONVENTION_VALUE_OPTIONS.has(argument)) {
      if (seen.has(argument)) return `Duplicate convention option: ${argument}`;
      seen.add(argument);
      const value = args[index + 1];
      if (!value || value.startsWith('-')) {
        return `Convention option requires a value: ${argument}`;
      }
      index += 1;
      continue;
    }
    if (argument.startsWith('--') && argument.includes('=')) {
      const separator = argument.indexOf('=');
      const option = argument.slice(0, separator);
      const value = argument.slice(separator + 1);
      if (!CONVENTION_VALUE_OPTIONS.has(option)) {
        return `Unknown convention option: ${option}`;
      }
      if (seen.has(option)) return `Duplicate convention option: ${option}`;
      if (!value) return `Convention option requires a value: ${option}`;
      seen.add(option);
      continue;
    }
    if (argument.startsWith('-')) return `Unknown convention option: ${argument}`;
    return `Unexpected convention argument: ${argument}`;
  }
  return null;
}

function atomicWriteFile(filePath: string, content: string): void {
  const temporaryPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${randomUUID()}.tmp`
  );
  try {
    fs.writeFileSync(temporaryPath, content, { encoding: 'utf8', flag: 'wx' });
    fs.renameSync(temporaryPath, filePath);
  } finally {
    fs.rmSync(temporaryPath, { force: true });
  }
}
