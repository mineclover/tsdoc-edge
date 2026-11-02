/**
 * Unified 3-Tier Data Trace Command (`tsdoc-edge symbol trace` / `tsdoc-edge relationship trace`).
 *
 * @packageDocumentation
 * @doc [[Data Lineage and Slicing]]
 * @doc [[CliCommandSurfaceSpecification]]
 * @context Subcommand under `symbol trace` and `relationship trace` for tracing TypeScript type/field flows, cross-boundary domain lineage (`tsdoc-edge` + `samchon` + `oa-sdk`), and AST variable/parameter dataflow slices.
 * @functionality Resolves target types, fields, functions, or checkpoints; executes `DataTraceService`; and formats human-readable, `--llm` Markdown, or `--json` reports.
 * @sideEffect console: Writes 3-Tier Data Trace reports or `--json` payloads to stdout
 * @sideEffect database: Reads active revisions from `GraphRepository` and `SpecGraphRepository` in read-only mode (read)
 * @sideEffect filesystem: Reads TypeScript source files and optional `.oa-trace.json` sidecars on demand (read)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  type DataTraceReport,
  DataTraceService,
  type DataTraceTier,
  formatDataTraceLlmMarkdown,
} from '../graph-analysis';
import { GraphRepository } from '../storage/GraphRepository';
import { SpecGraphRepository } from '../storage/SpecGraphRepository';
import { BaseCommand, type CommandResult } from './BaseCommand';
import { resolveCanonicalGraphDbPath, resolveSpecGraphDbPath } from './canonicalReadHelper';

export { formatDataTraceLlmMarkdown };

const VALID_TIERS = new Set<DataTraceTier>(['all', 'type-flow', 'boundary-lineage', 'code-slice']);

/**
 * CLI command for executing 3-Tier Data Trace queries (`symbol trace` / `relationship trace`).
 *
 * @doc [[Data Lineage and Slicing]]
 * @doc [[CliCommandSurfaceSpecification]]
 * @public
 */
export class DataTraceCommand extends BaseCommand {
  /**
   * Return the canonical subcommand name.
   *
   * @returns Command identifier `'data-trace'`
   * @public
   */
  getName(): string {
    return 'data-trace';
  }

  /**
   * Return the short description shown in command listings.
   *
   * @returns Human-readable description
   * @public
   */
  getDescription(): string {
    return 'Trace 3-tier data flow: Type/Field roles, Cross-Boundary Lineage, and AST Code Slicing';
  }

  /**
   * Return detailed CLI usage instructions.
   *
   * @returns Usage text
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge symbol trace <target> [to-target] [options]
tsdoc-edge relationship trace <target> [to-target] [options]

Traces data across 3 complementary tiers:
  1. type-flow         Type/Field structure, Producer/Transformer/Writer/Reader/Consumer roles,
                       Polymorphic Dispatches, and Shared-State Junctions (junctionsBetween)
  2. boundary-lineage  [[Checkpoint]] & SpecGraph bindings, @samchon/typespec-evidence constants,
                       oa-sdk (@oa-*, .oa-trace.json, UI:|FSM:|TX:|SYS:), and Repository Bridges
  3. code-slice        On-demand TypeScript AST variable & parameter def-use slicing +
                       Fail-Closed Trust-Loss Boundaries (any, as unknown as T, JSON.parse)

Options:
  --to <symbol>         Destination symbol for Producer -> Junction/Repository -> Consumer bridging
  --tier <tier>         Filter tier: all | type-flow | boundary-lineage | code-slice (default: all)
  --depth <n>           Maximum traversal and call-binding depth 1..6 (default: 3)
  --include-tests       Include test symbols in usages and slices
  --include-external    Include external/stdlib symbols
  --llm                 Output compact LLM-optimized Markdown
  --json                Output structured machine-readable JSON

Examples:
  tsdoc-edge symbol trace SpecGraphRevision.bindings
  tsdoc-edge symbol trace SpecGraphRevision --tier=type-flow
  tsdoc-edge relationship trace SpecExtractCommand.execute ConventionCheckCommand.execute
  tsdoc-edge symbol trace "extractManagedSpecGraph(options)" --tier=code-slice
  tsdoc-edge symbol trace SpecGraphRepository --tier=boundary-lineage --json`;
  }

  /**
   * Execute the 3-Tier Data Trace command.
   *
   * @param args - Command-line arguments passed after `symbol trace` or `relationship trace`
   * @returns Command execution result
   * @public
   */
  execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(() => {
      if (args.length === 0 || this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const flagError = this.validateAllowedFlags(
        args,
        ['--include-tests', '--include-external', '--llm', '--json'],
        ['--to', '--tier', '--depth']
      );
      if (flagError) return flagError;

      for (const flag of ['--to', '--tier', '--depth']) {
        const equalPrefix = `${flag}=`;
        const equalArg = args.find((arg) => arg.startsWith(equalPrefix));
        const standaloneIndex = args.indexOf(flag);
        const rawValue = equalArg ? equalArg.slice(equalPrefix.length) : undefined;
        const standaloneMissing =
          standaloneIndex !== -1 &&
          (standaloneIndex + 1 >= args.length || args[standaloneIndex + 1].startsWith('-'));
        if (
          (equalArg !== undefined &&
            rawValue !== undefined &&
            (rawValue.trim() === '' || rawValue.trim().startsWith('-'))) ||
          standaloneMissing
        ) {
          const msg = `Missing value for ${flag}. Expected a non-empty value that does not start with '-'.`;
          if (this.hasFlag(args, '--json')) {
            console.log(JSON.stringify({ success: false, error: msg }, null, 2));
          } else {
            this.printError(msg);
          }
          return this.failure(msg);
        }
      }

      const valueFlags = ['--to', '--tier', '--depth'];
      const positional = this.getPositionalArgs(args, valueFlags);
      if (positional.length === 0) {
        this.printError('Target symbol, field (Type.field), or function(param) is required.');
        console.log();
        return this.displayHelp();
      }

      const target = positional[0];
      const toTarget = this.getOption(args, '--to') ?? positional[1];
      const rawTier = (this.getOption(args, '--tier') ?? 'all') as DataTraceTier;
      if (!VALID_TIERS.has(rawTier)) {
        this.printError(
          `Invalid --tier '${rawTier}'. Expected one of: all, type-flow, boundary-lineage, code-slice`
        );
        return this.failure(`Invalid --tier: ${rawTier}`);
      }

      const rawDepth = this.getOption(args, '--depth');
      const maxDepth =
        rawDepth && /^[1-6]$/.test(rawDepth.trim())
          ? Number.parseInt(rawDepth, 10)
          : rawDepth
            ? Number.NaN
            : 3;
      if (!Number.isFinite(maxDepth) || maxDepth < 1 || maxDepth > 6) {
        this.printError(`Invalid --depth '${rawDepth}'. Expected an integer between 1 and 6.`);
        return this.failure(`Invalid --depth: ${rawDepth}`);
      }

      const includeTests = this.hasFlag(args, '--include-tests');
      const includeExternal = this.hasFlag(args, '--include-external');
      const llm = this.hasFlag(args, '--llm');
      const json = this.hasFlag(args, '--json');

      const cwd = process.cwd();
      const graphDbPath = resolveCanonicalGraphDbPath(cwd);
      if (!fs.existsSync(graphDbPath)) {
        const msg =
          'Canonical @ttsc/graph database not found (.tsdoc/canonical-graph.db). Run "tsdoc-edge sync" first.';
        if (json) {
          console.log(JSON.stringify({ success: false, error: msg }, null, 2));
        } else {
          this.printError(msg);
        }
        return this.failure(msg);
      }

      let graphRepo: GraphRepository | null = null;
      let specRepo: SpecGraphRepository | null = null;
      try {
        graphRepo = new GraphRepository(graphDbPath, { readOnly: true });
        const activeGraph = graphRepo.readActiveRevision();
        if (!activeGraph) {
          const msg =
            'No active revision in .tsdoc/canonical-graph.db. Run "tsdoc-edge sync" first.';
          if (json) {
            console.log(JSON.stringify({ success: false, error: msg }, null, 2));
          } else {
            this.printError(msg);
          }
          return this.failure(msg);
        }

        const specDbPath = resolveSpecGraphDbPath(cwd);
        if (fs.existsSync(specDbPath)) {
          try {
            specRepo = new SpecGraphRepository(specDbPath, { readOnly: true });
          } catch {
            specRepo = null;
          }
        }
        const activeSpec = specRepo?.readActiveRevision() ?? null;

        const service = new DataTraceService(activeGraph.graph, {
          specGraph: activeSpec,
          workspaceRoot: path.resolve(cwd, activeGraph.graph.rootDir || cwd),
        });

        const report = service.trace({
          target,
          toTarget,
          tier: rawTier,
          maxDepth,
          includeTests,
          includeExternal,
          workspaceRoot: path.resolve(cwd, activeGraph.graph.rootDir || cwd),
        });

        if (json) {
          console.log(JSON.stringify(report, null, 2));
          return report.status === 'missing'
            ? this.failure(`Target not found: ${target}`)
            : this.success();
        }

        if (report.status === 'missing') {
          if (llm) {
            console.log(formatDataTraceLlmMarkdown(report));
          } else {
            this.printError(`No canonical symbol or field matched '${target}'.`);
            console.log('Tip: Use `tsdoc-edge symbol query <name>` to search available symbols.');
          }
          return this.failure(`Target not found: ${target}`);
        }

        if (llm) {
          console.log(formatDataTraceLlmMarkdown(report));
        } else {
          this.renderHumanReport(report);
        }

        return this.success();
      } finally {
        specRepo?.close();
        graphRepo?.close();
      }
    });
  }

  private renderHumanReport(report: DataTraceReport): void {
    const titleSuffix = report.query.toTarget ? ` → ${report.query.toTarget}` : '';
    this.printHeader(`3-Tier Data Trace: ${report.query.target}${titleSuffix}`);

    if (report.status === 'ambiguous') {
      console.log(`⚠️ Ambiguous Target — Candidate IDs: ${(report.candidateIds ?? []).join(', ')}`);
    }

    console.log('🎯 Resolved Target(s):');
    for (const t of report.resolvedTargets) {
      const loc = t.file ? ` (${t.file}${t.startLine ? `:${t.startLine}` : ''})` : '';
      console.log(
        `  • ${t.qualifiedName} [${t.kind}]${loc} — origin=${t.origin}, role=${t.authorityRole}`
      );
      if (t.signature) {
        console.log(`    Signature: ${t.signature}`);
      }
      if (t.literals.length > 0) {
        console.log(`    Literals:  ${t.literals.join(' | ')}`);
      }
      if (Object.keys(t.constraints).length > 0) {
        console.log(`    Constraints: ${JSON.stringify(t.constraints)}`);
      }
    }
    if (report.resolvedToTargets.length > 0) {
      console.log('🏁 Resolved Destination(s):');
      for (const dst of report.resolvedToTargets) {
        const loc = dst.file ? ` (${dst.file}${dst.startLine ? `:${dst.startLine}` : ''})` : '';
        console.log(`  • ${dst.qualifiedName} [${dst.kind}]${loc}`);
      }
    }
    console.log();

    if (report.typeFlow) {
      console.log('━━ Tier 1: Type & Field Flow ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      if (report.typeFlow.targetFields.length > 0) {
        console.log(`  Fields / Members (${report.typeFlow.targetFields.length}):`);
        for (const f of report.typeFlow.targetFields.slice(0, 20)) {
          const ro = f.readonly ? 'readonly ' : '';
          const sig = f.signature ? `: ${f.signature}` : '';
          const lits = f.literals.length > 0 ? ` [literals: ${f.literals.join(', ')}]` : '';
          console.log(`    - ${ro}${f.name}${sig}${lits}`);
        }
      }
      if (report.typeFlow.outgoingTypeRefs.length > 0) {
        console.log(`  Outgoing Type References (${report.typeFlow.outgoingTypeRefs.length}):`);
        for (const ref of report.typeFlow.outgoingTypeRefs.slice(0, 15)) {
          console.log(
            `    - ${ref.fieldOrOwner} ──type_ref──▶ ${ref.targetName} [${ref.targetKind}]`
          );
        }
      }
      if (report.typeFlow.roleClassifiedUsages.length > 0) {
        console.log(`  Role-Classified Usages (${report.typeFlow.roleClassifiedUsages.length}):`);
        for (const u of report.typeFlow.roleClassifiedUsages.slice(0, 25)) {
          const badge = `[${u.role.toUpperCase()}]`.padEnd(13);
          const loc = u.file ? ` (${u.file}${u.line ? `:${u.line}` : ''})` : '';
          const xform =
            u.transformedFromType && u.transformedToType
              ? ` {${u.transformedFromType} -> ${u.transformedToType}}`
              : '';
          console.log(
            `    ${badge} ${u.symbolName} [${u.symbolKind}] via ${u.edgeKind}${xform}${loc}`
          );
          if (u.evidenceSnippet) {
            console.log(`                  ↳ ${u.evidenceSnippet}`);
          }
        }
      } else {
        console.log('  Role-Classified Usages: none');
      }

      if (report.typeFlow.polymorphicDispatches.length > 0) {
        console.log(`  Polymorphic Dispatches (${report.typeFlow.polymorphicDispatches.length}):`);
        for (const p of report.typeFlow.polymorphicDispatches.slice(0, 15)) {
          console.log(`    - ${p.concreteMemberName} ──${p.relation}──▶ ${p.interfaceMemberName}`);
        }
      }

      if (report.typeFlow.sharedStateJunctions.length > 0) {
        console.log(
          `  Shared-State / Store Junctions (${report.typeFlow.sharedStateJunctions.length}):`
        );
        for (const j of report.typeFlow.sharedStateJunctions.slice(0, 15)) {
          console.log(`    ⇄ [${j.junctionName} (${j.junctionKind})] ${j.explanation}`);
        }
      }
      console.log();
    }

    if (report.boundaryLineage) {
      console.log(
        `━━ Tier 2: Cross-Boundary Domain Lineage (state: ${report.boundaryLineage.lineageState}) ━━`
      );
      if (report.boundaryLineage.checkpoints.length > 0) {
        console.log(
          `  Governing Checkpoints & Spec Bindings (${report.boundaryLineage.checkpoints.length}):`
        );
        for (const cp of report.boundaryLineage.checkpoints) {
          const bind = cp.specBindingId ? ` [${cp.specBindingId}]` : '';
          const doc = cp.docPath ? ` (${cp.docPath})` : '';
          console.log(`    • [[${cp.checkpoint}]] (${cp.bindingRole})${bind}${doc}`);
          for (const c of cp.contracts.slice(0, 3)) console.log(`      @contract: ${c}`);
          for (const inv of cp.invariants.slice(0, 3)) console.log(`      @invariant: ${inv}`);
          for (const se of cp.sideEffects.slice(0, 3)) console.log(`      @sideEffect: ${se}`);
        }
      }
      if (report.boundaryLineage.provenanceLinks.length > 0) {
        console.log(
          `  Directional Provenance Links (${report.boundaryLineage.provenanceLinks.length}):`
        );
        for (const link of report.boundaryLineage.provenanceLinks.slice(0, 20)) {
          console.log(
            `    • ${link.fromAuthority} ──[${link.relation}]──▶ ${link.toTarget} (${link.sourceKind}: ${link.evidence})`
          );
        }
      }
      if (report.boundaryLineage.evidenceArtifacts.length > 0) {
        console.log(
          `  Ecosystem Evidence Artifacts (${report.boundaryLineage.evidenceArtifacts.length}):`
        );
        for (const art of report.boundaryLineage.evidenceArtifacts) {
          console.log(
            `    • [${art.artifactKind}] ${art.symbolName}: ${JSON.stringify(art.properties)}`
          );
        }
      }
      if (report.boundaryLineage.persistenceBridges.length > 0) {
        console.log(
          `  Persistence / Repository Bridges (${report.boundaryLineage.persistenceBridges.length}):`
        );
        for (const b of report.boundaryLineage.persistenceBridges) {
          console.log(`    • Store/Repository: ${b.storeOrRepoName}`);
          for (const w of b.writers.slice(0, 8)) {
            console.log(
              `      [WRITE] ${w.symbolName} ──calls──▶ ${b.storeOrRepoName}.${w.method}`
            );
          }
          for (const r of b.readers.slice(0, 8)) {
            console.log(
              `      [READ]  ${r.symbolName} ──calls──▶ ${b.storeOrRepoName}.${r.method}`
            );
          }
        }
      }
      if (report.boundaryLineage.telemetrySymbols.length > 0) {
        console.log(
          `  Telemetry / FSM Tracking Symbols (${report.boundaryLineage.telemetrySymbols.length}):`
        );
        for (const tm of report.boundaryLineage.telemetrySymbols) {
          console.log(
            `    • ${tm.symbol} (plane=${tm.plane}, domain=${tm.domain}, entity=${tm.entity}, action=${tm.action})`
          );
        }
      }
      console.log();
    }

    if (report.codeSlice) {
      console.log(
        `━━ Tier 3: AST Variable & Parameter Dataflow Slice (${report.codeSlice.slices.length} function(s), ${report.codeSlice.totalSteps} step(s), ${report.codeSlice.totalTrustBoundaries} trust boundary warning(s)) ━━`
      );
      for (const slice of report.codeSlice.slices) {
        console.log(
          `  ▸ ${slice.functionName} (${slice.file}:${slice.startLine}-${slice.endLine}) [seed: ${slice.seedExpression}]`
        );
        for (const step of slice.steps) {
          const argBinding =
            step.calleeName !== undefined
              ? ` ──▶ ${step.calleeName}(arg#${step.argIndex}${step.boundParamName ? `:${step.boundParamName}` : ''})`
              : '';
          console.log(
            `    #${step.stepIndex} [${step.operation.padEnd(11)}] L${step.line}: ${step.expression}${argBinding}`
          );
        }
        for (const tb of slice.trustBoundaries) {
          console.log(
            `    ⚠️  [${tb.kind}] L${tb.line} (${tb.failClosedStatus}): ${tb.reason} — ${tb.expression}`
          );
        }
      }
      console.log();
    }
  }
}
