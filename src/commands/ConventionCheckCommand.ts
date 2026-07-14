/** CLI adapter for the revision-pinned spec-binding convention loop. */

import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConfigManager } from '../config/ConfigManager';
import {
  type ConventionCheckResult,
  ConventionCheckService,
  type ConventionFailureThreshold,
  type ConventionGateDecision,
  compileConventionPackFile,
  evaluateConventionGate,
  evaluateTtscGraphLintFile,
  loadJestJsonEvidence,
  parseCoverageMetricThresholds,
} from '../convention';
import { DEFAULT_CANONICAL_GRAPH_DATABASE } from '../indexer';
import type { CoverageMetricGateRequest } from '../metrics/CoverageMetricGate';
import { AnalysisInputRevisionRepository } from '../storage/AnalysisInputRevisionRepository';
import { ConventionCheckHistoryRepository } from '../storage/ConventionCheckHistoryRepository';
import { CoverageMetricReportRepository } from '../storage/CoverageMetricReportRepository';
import { GraphRepository } from '../storage/GraphRepository';
import { SpecGraphRepository } from '../storage/SpecGraphRepository';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

export type { ConventionFailureThreshold, ConventionGateDecision } from '../convention';

export type ConventionCheckCommandOutput = ConventionCheckResult & {
  readonly gate: ConventionGateDecision;
  readonly inputRevisionStore?: {
    readonly databasePath: string;
    readonly pins: readonly {
      readonly plane: 'evidence' | 'enrichment' | 'policy';
      readonly workspaceId: string;
      readonly revisionId: string;
    }[];
  };
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
    return `tsdoc-edge convention check (--pack <file> | --replay <history-id>) [options]

  Required:
    --pack <file>                 Workspace-local convention pack JSON
    --replay <history-id>          Recompute one retained check from --history-db

  Options:
    --graph-db <file>             Canonical graph DB (default: .tsdoc/canonical-graph.db)
    --code-revision <id>          Exact retained code revision (default: active revision)
    --suppression-as-of <time>    RFC3339 clock required by expiring suppressions
    --expected-manifest <id>      Exact convention manifest lock for CI/release checks
    --spec-db <file>              Use the active managed SpecGraph revision for spec/bindings
    --coverage-report-db <file>  Source-identified coverage report DB
    --coverage-report-id <id>    Bind one coverage report to this check
    --coverage-gate <level>      report-only|warning|error (default: report-only)
    --coverage-thresholds <list> metric.id=0.8,other.metric=0.9 (fraction)
    --evidence <file>             Complete Jest JSON artifact for verification bindings
    --input-revisions-db <file>  Store exact evidence/enrichment/policy revisions
    --graph-lint-rules <file>     Upstream ttsc graph-lint rules JSON
    --history-db <file>           Append history, or required store for --replay
    --fail-on <level>             error|warning|info|never (default: error)
    --json                        Print the complete pinned result as JSON
    --output <file>               Write JSON outside the canonical DB directory

  This v1 checks exact implementation/verification/constraint/governance
  bindings plus configured naming, TSDoc tag, and optional ttsc graph-lint rules
  on one saved graph revision.`;
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
      const replayId = this.getOption(args, '--replay');
      if (!packPath && !replayId) {
        this.printError('--pack <file> or --replay <history-id> is required');
        return this.failure('Convention input is required', 2);
      }
      if (packPath && replayId) {
        this.printError('--pack and --replay cannot be combined');
        return this.failure('Ambiguous convention input', 2);
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
      const inputRevisionsDatabase = this.getOption(args, '--input-revisions-db');
      const historyDatabase = this.getOption(args, '--history-db');
      const specDatabase = this.getOption(args, '--spec-db');
      const coverageReportDatabase = this.getOption(args, '--coverage-report-db');
      const coverageReportId = this.getOption(args, '--coverage-report-id');
      const coverageGate = this.getOption(args, '--coverage-gate');
      const coverageThresholdsInput = this.getOption(args, '--coverage-thresholds');
      if (coverageGate && !isCoverageMetricGateRequest(coverageGate)) {
        this.printError('--coverage-gate must be report-only, warning, or error');
        return this.failure('Invalid coverage metric gate', 2);
      }
      if (coverageGate && !coverageReportId) {
        this.printError('--coverage-gate requires --coverage-report-id');
        return this.failure('Coverage report is required for coverage gate', 2);
      }
      if (coverageReportDatabase && !coverageReportId) {
        this.printError('--coverage-report-db requires --coverage-report-id');
        return this.failure('Coverage report ID is required', 2);
      }
      if (coverageThresholdsInput && !coverageReportId) {
        this.printError('--coverage-thresholds requires --coverage-report-id');
        return this.failure('Coverage report is required for coverage thresholds', 2);
      }
      if (replayId && !historyDatabase) {
        this.printError('--replay requires --history-db <file>');
        return this.failure('Retained history database is required', 2);
      }
      if (
        replayId &&
        [
          '--code-revision',
          '--evidence',
          '--expected-manifest',
          '--spec-db',
          '--coverage-report-db',
          '--coverage-report-id',
          '--coverage-gate',
          '--coverage-thresholds',
          '--suppression-as-of',
          '--fail-on',
          '--graph-lint-rules',
          '--input-revisions-db',
        ].some((option) => this.getOption(args, option) !== undefined)
      ) {
        this.printError('--replay selects all execution inputs from retained history');
        return this.failure('Replay input override is not allowed', 2);
      }
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
        const absolutePack = packPath ? path.resolve(process.cwd(), packPath) : undefined;
        const absoluteHistory = historyDatabase
          ? path.resolve(process.cwd(), historyDatabase)
          : undefined;
        const absoluteSpec = specDatabase ? path.resolve(process.cwd(), specDatabase) : undefined;
        const absoluteCoverageReport = coverageReportDatabase
          ? path.resolve(process.cwd(), coverageReportDatabase)
          : coverageReportId
            ? path.resolve(process.cwd(), '.tsdoc/coverage-metrics.db')
            : undefined;
        const absoluteInputRevisions = inputRevisionsDatabase
          ? path.resolve(process.cwd(), inputRevisionsDatabase)
          : undefined;
        const protectedGraphPaths = [
          graphDatabaseInput,
          graphDatabase,
          ...[graphDatabaseInput, graphDatabase].flatMap((database) => [
            `${database}-wal`,
            `${database}-shm`,
            `${database}-journal`,
          ]),
        ];
        const protectedHistoryPaths = absoluteHistory
          ? [
              absoluteHistory,
              `${absoluteHistory}-wal`,
              `${absoluteHistory}-shm`,
              `${absoluteHistory}-journal`,
            ]
          : [];
        const protectedSpecPaths = absoluteSpec
          ? [absoluteSpec, `${absoluteSpec}-wal`, `${absoluteSpec}-shm`, `${absoluteSpec}-journal`]
          : [];
        const protectedCoveragePaths = absoluteCoverageReport
          ? [
              absoluteCoverageReport,
              `${absoluteCoverageReport}-wal`,
              `${absoluteCoverageReport}-shm`,
              `${absoluteCoverageReport}-journal`,
            ]
          : [];
        const protectedInputRevisionPaths = absoluteInputRevisions
          ? [
              absoluteInputRevisions,
              `${absoluteInputRevisions}-wal`,
              `${absoluteInputRevisions}-shm`,
              `${absoluteInputRevisions}-journal`,
            ]
          : [];
        if (
          sameFile(path.dirname(absoluteOutput), path.dirname(graphDatabase)) ||
          protectedGraphPaths.some((protectedPath) => sameFile(absoluteOutput, protectedPath)) ||
          protectedHistoryPaths.some((protectedPath) => sameFile(absoluteOutput, protectedPath)) ||
          protectedSpecPaths.some((protectedPath) => sameFile(absoluteOutput, protectedPath)) ||
          protectedCoveragePaths.some((protectedPath) => sameFile(absoluteOutput, protectedPath)) ||
          protectedInputRevisionPaths.some((protectedPath) =>
            sameFile(absoluteOutput, protectedPath)
          ) ||
          (absolutePack !== undefined && sameFile(absoluteOutput, absolutePack))
        ) {
          const message =
            '--output must not overwrite a canonical graph/spec/coverage/history/input-revision database, its sidecars, or the convention pack';
          this.printError(message);
          return this.failure(message, 2);
        }
      }

      let repository: GraphRepository | undefined;
      let specRepository: SpecGraphRepository | undefined;
      let coverageRepository: CoverageMetricReportRepository | undefined;
      try {
        if (replayId) {
          if (!historyDatabase) return this.failure('Retained history database is required', 2);
          repository = new GraphRepository(graphDatabase, { readOnly: true });
          return this.replay(replayId, historyDatabase, repository, args, outputPath);
        }
        if (!packPath) return this.failure('Convention pack is required', 2);
        const managedSpec = specDatabase
          ? (() => {
              specRepository = new SpecGraphRepository(path.resolve(process.cwd(), specDatabase), {
                readOnly: true,
              });
              const active = specRepository.readActiveRevision();
              if (!active) {
                throw new Error(`Managed spec database has no active revision: ${specDatabase}`);
              }
              return active;
            })()
          : undefined;
        const pack = compileConventionPackFile(packPath, {
          workspaceRoot: process.cwd(),
          ...(managedSpec ? { managedSpec } : {}),
        });
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
        const coverage = coverageReportId
          ? (() => {
              const databasePath = path.resolve(
                process.cwd(),
                coverageReportDatabase ?? '.tsdoc/coverage-metrics.db'
              );
              coverageRepository = new CoverageMetricReportRepository(databasePath, {
                readOnly: true,
              });
              const report = coverageRepository.readReport({
                workspaceId: pack.manifest.scope.workspaceId,
                reportId: coverageReportId,
              });
              if (!report) {
                throw new Error(
                  `Coverage metric report not found: ${pack.manifest.scope.workspaceId}/${coverageReportId}`
                );
              }
              return {
                reportId: report.reportId,
                graphRevisionId: codeRevision.metadata.revisionId,
                graphFingerprint: codeRevision.graph.fingerprint,
                requestedGate: (coverageGate ?? 'report-only') as CoverageMetricGateRequest,
                metrics: report.metrics,
                ...(coverageThresholdsInput
                  ? { thresholds: parseCoverageMetricThresholds(coverageThresholdsInput) }
                  : {}),
              };
            })()
          : undefined;
        const governance = ConfigManager.getInstance(process.cwd()).get().specGovernance;
        const graphLintRulesPath = this.getOption(args, '--graph-lint-rules');
        const graphLint = graphLintRulesPath
          ? await evaluateTtscGraphLintFile({
              workspaceRoot: process.cwd(),
              graph: codeRevision.graph,
              filePath: graphLintRulesPath,
            })
          : undefined;
        const result = new ConventionCheckService().run({
          pack,
          codeRevision,
          workspaceRoot: process.cwd(),
          ...(evidence ? { evidence } : {}),
          ...(governance?.naming ? { naming: governance.naming } : {}),
          ...(governance?.tsdoc ? { tsdoc: governance.tsdoc } : {}),
          ...(graphLint ? { graphLint } : {}),
          ...(coverage ? { coverage } : {}),
          ...(this.getOption(args, '--expected-manifest')
            ? { expectedManifestId: this.getOption(args, '--expected-manifest') }
            : {}),
          ...(this.getOption(args, '--suppression-as-of')
            ? { suppressionAsOf: this.getOption(args, '--suppression-as-of') }
            : {}),
        });
        const gate = evaluateConventionGate(result, failOn);
        const inputRevisionStore = inputRevisionsDatabase
          ? persistInputRevisions(
              path.resolve(process.cwd(), inputRevisionsDatabase),
              result,
              codeRevision.graph.rootDir
            )
          : undefined;
        const historyId = historyDatabase
          ? appendHistory(path.resolve(process.cwd(), historyDatabase), result, gate)
          : undefined;
        const output: ConventionCheckCommandOutput = Object.freeze({
          ...result,
          gate,
          ...(inputRevisionStore ? { inputRevisionStore } : {}),
        });
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
        specRepository?.close();
        coverageRepository?.close();
      }
    });
  }

  private replay(
    historyId: string,
    historyDatabase: string,
    graphRepository: GraphRepository,
    args: readonly string[],
    outputPath?: string
  ): CommandResult {
    const history = new ConventionCheckHistoryRepository(
      path.resolve(process.cwd(), historyDatabase),
      {
        readOnly: true,
      }
    );
    try {
      const retained = history.read(historyId);
      if (!retained) return this.failure(`Retained convention history not found: ${historyId}`, 2);
      const codeRevision = graphRepository.readRevision(retained.check.codeRevisionId);
      if (!codeRevision) {
        return this.failure(
          `historical-input-missing: code revision ${retained.check.codeRevisionId}`,
          2
        );
      }
      const result = new ConventionCheckService().run({
        pack: retained.pack,
        codeRevision,
        workspaceRoot: process.cwd(),
        evidence: retained.inputs.evidence,
        enrichment: retained.inputs.enrichment,
        naming: retained.evaluationConfig.naming,
        tsdoc: retained.evaluationConfig.tsdoc,
        graphLint: retained.check.graphLint,
        ...(retained.check.coverage
          ? {
              coverage: {
                reportId: retained.check.coverage.reportId,
                graphRevisionId: retained.check.coverage.graphRevisionId,
                graphFingerprint: retained.check.coverage.graphFingerprint,
                requestedGate: retained.check.coverage.requestedGate,
                metrics: retained.check.coverage.metrics.map(({ metric }) => metric),
                thresholds: retained.check.coverage.thresholds,
              },
            }
          : {}),
        ...(retained.evaluationConfig.suppressionAsOf
          ? { suppressionAsOf: retained.evaluationConfig.suppressionAsOf }
          : {}),
      });
      const gate = evaluateConventionGate(result, retained.gate.failureThreshold);
      if (
        result.checkId !== retained.check.checkId ||
        result.conformance.reportId !== retained.check.conformance.reportId ||
        result.naming.reportId !== retained.check.naming.reportId ||
        result.tsdoc.reportId !== retained.check.tsdoc.reportId ||
        gate.gateId !== retained.gate.gateId ||
        result.coverage?.reportId !== retained.check.coverage?.reportId ||
        result.coverage?.requestedGate !== retained.check.coverage?.requestedGate ||
        JSON.stringify(result.coverage?.thresholds) !==
          JSON.stringify(retained.check.coverage?.thresholds)
      ) {
        return this.failure(`Retained replay diverged: ${historyId}`, 2);
      }
      const output: ConventionCheckCommandOutput = Object.freeze({ ...result, gate });
      const json = JSON.stringify(output, null, 2);
      if (outputPath) atomicWriteFile(path.resolve(process.cwd(), outputPath), `${json}\n`);
      if (this.hasFlag([...args], '--json')) console.log(json);
      else this.printHumanResult(result, gate, outputPath, historyId);
      return gate.failed
        ? { exitCode: 1, message: `Retained convention replay reproduced ${historyId}` }
        : this.success(`Retained convention replay reproduced: ${historyId}`);
    } finally {
      history.close();
    }
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
    console.log(`${colors.bold}Graph-lint report:${colors.reset} ${result.graphLint.reportId}`);
    if (result.coverage) {
      console.log(
        `${colors.bold}Coverage report:${colors.reset} ${result.coverage.reportId} ` +
          `(${result.coverage.requestedGate}, ${result.coverage.findings.length} finding(s))`
      );
    }
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
    if (result.graphLint.findings.length > 0) {
      this.printSection('Graph-lint Findings');
      for (const finding of result.graphLint.findings) {
        console.log(
          `${findingColor(finding.outcome)}✗ ${finding.ruleId}${colors.reset} ` +
            `[${finding.severity}] ${finding.message}`
        );
      }
    }
    if (outputPath) this.printInfo(`JSON report written to ${path.resolve(outputPath)}`);
    if (historyId) this.printInfo(`Retained convention history: ${historyId}`);
  }
}

function appendHistory(
  databasePath: string,
  result: ConventionCheckResult,
  gate: ConventionGateDecision
): string {
  const repository = new ConventionCheckHistoryRepository(databasePath);
  try {
    return repository.append({
      check: result,
      inputs: result.retainedInputs,
      pack: result.retainedPack,
      evaluationConfig: result.retainedEvaluationConfig,
      gate,
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

function isCoverageMetricGateRequest(value: string): value is CoverageMetricGateRequest {
  return value === 'report-only' || value === 'warning' || value === 'error';
}

function persistInputRevisions(
  databasePath: string,
  result: ConventionCheckResult,
  graphRoot: string
): NonNullable<ConventionCheckCommandOutput['inputRevisionStore']> {
  const repository = new AnalysisInputRevisionRepository(databasePath);
  const workspaceId = result.pack.scope.workspaceId;
  const pins = [
    {
      plane: 'evidence' as const,
      workspaceId,
      revisionId: result.retainedInputs.evidence.revisionId,
    },
    {
      plane: 'enrichment' as const,
      workspaceId,
      revisionId: result.retainedInputs.enrichment.revisionId,
    },
    {
      plane: 'policy' as const,
      workspaceId,
      revisionId: result.retainedInputs.policy.revisionId,
    },
  ];
  try {
    repository.storeRevision(pins[0], result.retainedInputs.evidence);
    repository.storeRevision(pins[1], result.retainedInputs.enrichment);
    repository.storeRevision(pins[2], result.retainedInputs.policy);
    return Object.freeze({
      databasePath: path.relative(graphRoot, databasePath).split(path.sep).join('/') || '.',
      pins: Object.freeze(pins),
    });
  } finally {
    repository.close();
  }
}

const CONVENTION_VALUE_OPTIONS = new Set([
  '--pack',
  '--graph-db',
  '--code-revision',
  '--suppression-as-of',
  '--expected-manifest',
  '--spec-db',
  '--coverage-report-db',
  '--coverage-report-id',
  '--coverage-gate',
  '--coverage-thresholds',
  '--fail-on',
  '--output',
  '--evidence',
  '--graph-lint-rules',
  '--history-db',
  '--input-revisions-db',
  '--replay',
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
