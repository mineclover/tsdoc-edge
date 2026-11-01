/**
 * Unified workspace synchronization command
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConfigManager } from '../config/ConfigManager';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { BuildCommand } from './BuildCommand';
import { IndexDocsCommand } from './IndexDocsCommand';
import { SpecExtractCommand } from './SpecExtractCommand';
import { UpdateBacklinksCommand } from './UpdateBacklinksCommand';
import { ValidateDocsCommand } from './ValidateDocsCommand';

/**
 * Execution report for one synchronization stage
 * @public
 */
export interface SyncStageReport {
  readonly stage: 'build' | 'docs' | 'specs' | 'backlinks';
  readonly status: 'passed' | 'skipped' | 'failed';
  readonly durationMs: number;
  readonly message: string;
}

/**
 * Structured report emitted by `tsdoc-edge sync --json`
 * @public
 */
export interface SyncPipelineReport {
  readonly status: 'passed' | 'failed';
  readonly mode: 'write' | 'dry-run' | 'check';
  readonly sourceDir: string;
  readonly docsDir: string | null;
  readonly canonicalGraphEnabled: boolean;
  readonly durationMs: number;
  readonly stages: readonly SyncStageReport[];
}

/**
 * Injectable subcommand dependencies for isolated testing
 * @public
 */
export interface SyncCommandDependencies {
  readonly configManager?: ConfigManager;
  readonly buildCommandFactory?: (configManager: ConfigManager) => BaseCommand;
  readonly indexDocsCommandFactory?: () => BaseCommand;
  readonly validateDocsCommandFactory?: () => BaseCommand;
  readonly specExtractCommandFactory?: () => BaseCommand;
  readonly updateBacklinksCommandFactory?: () => BaseCommand;
}

/**
 * Synchronizes the symbol database, canonical `@ttsc/graph` revision, managed
 * checkpoint index, executable `SpecGraph`, and Markdown backlinks in one step.
 *
 * @doc [[SyncCommand]]
 * @public
 * @responsibility Orchestrate multi-plane SSOT synchronization without manual multi-command drift
 * @contract Never mutates SQLite databases or Markdown files when `--dry-run` or `--check` is active
 * @sideEffect Writes `.tsdoc.db`, `.tsdoc/canonical-graph.db`, `.tsdoc/doc-symbols.json`, `.tsdoc/spec-graph.db`, and managed Markdown backlinks in write mode
 */
export class SyncCommand extends BaseCommand {
  private readonly configManager: ConfigManager;

  constructor(private readonly dependencies: SyncCommandDependencies = {}) {
    super();
    this.configManager = dependencies.configManager ?? ConfigManager.getInstance();
  }

  /**
   * Command name
   * @returns Command identifier
   * @public
   */
  getName(): string {
    return 'sync';
  }

  /**
   * Command description
   * @returns Summary description
   * @public
   */
  getDescription(): string {
    return 'Synchronize symbols, canonical graph, managed checkpoints, SpecGraph, and backlinks';
  }

  /**
   * Usage instructions
   * @returns Usage text
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge sync [source-directory] [options]

  Default source directory: configured project.srcDirs[0] or 'src'

  Options:
    --force                 Force full symbol rebuild (ignore file hashes)
    --canonical-graph       Require canonical @ttsc/graph refresh
    --no-canonical-graph    Skip canonical @ttsc/graph refresh
    --router-module <path>  Override graph-router artifact-source module
    --docs-dir <dir>        Override managed documentation directory
    --skip-specs            Skip managed/specs SpecGraph compilation
    --skip-backlinks        Skip Markdown backlink synchronization
    --dry-run, -n           Preview document/backlink changes without writing to disk
    --check                 Verify document validation and backlink freshness (CI gate)
    --json                  Emit structured JSON pipeline report`;
  }

  /**
   * Execute unified synchronization pipeline
   * @param args - CLI arguments
   * @returns Command execution result
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const flagError = this.validateAllowedFlags(
        args,
        [
          '--force',
          '--canonical-graph',
          '--no-canonical-graph',
          '--skip-specs',
          '--skip-backlinks',
          '--dry-run',
          '-n',
          '--check',
          '--json',
        ],
        ['--router-module', '--docs-dir']
      );
      if (flagError) {
        return flagError;
      }

      const startedAt = Date.now();
      const config = this.configManager.get();
      const rootDir = this.configManager.getProjectRoot();
      const dryRun = this.hasFlag(args, '--dry-run') || this.hasFlag(args, '-n');
      const checkOnly = this.hasFlag(args, '--check');
      const readOnlyMode = dryRun || checkOnly;
      const jsonMode = this.hasFlag(args, '--json');
      const force = this.hasFlag(args, '--force');

      const positional = this.getPositionalArgs(args, ['--router-module', '--docs-dir']);
      const sourceDir = positional[0] ?? config.project.srcDirs?.[0] ?? 'src';
      const docsDir = this.resolveDocsDir(args, rootDir);
      const canonicalPlan = this.resolveCanonicalPlan(args, rootDir);

      if (!jsonMode) {
        this.printHeader(
          checkOnly
            ? 'TSDoc Edge - Sync Check (Read-Only)'
            : dryRun
              ? 'TSDoc Edge - Sync Preview (Dry Run)'
              : 'TSDoc Edge - Unified Workspace Sync'
        );
      }

      const stages: SyncStageReport[] = [];

      // Stage 1: Build (Code + Canonical Graph)
      if (readOnlyMode) {
        stages.push({
          stage: 'build',
          status: 'skipped',
          durationMs: 0,
          message: 'Skipped database rebuild in read-only (--dry-run/--check) mode',
        });
      } else {
        const buildArgs: string[] = [sourceDir];
        if (force) {
          buildArgs.push('--force');
        }
        if (canonicalPlan.enabled) {
          buildArgs.push('--canonical-graph');
          if (canonicalPlan.explicitRouterModule) {
            buildArgs.push(`--router-module=${canonicalPlan.explicitRouterModule}`);
          }
        }
        const buildCmd = this.dependencies.buildCommandFactory
          ? this.dependencies.buildCommandFactory(this.configManager)
          : new BuildCommand(this.configManager);
        const buildStage = await this.runStage('build', jsonMode, () =>
          this.runMuted(true, () => buildCmd.execute(buildArgs))
        );
        stages.push(buildStage.report);
        if (buildStage.result.exitCode !== 0) {
          return this.finishReport(
            stages,
            startedAt,
            sourceDir,
            docsDir,
            canonicalPlan.enabled,
            dryRun,
            checkOnly,
            jsonMode,
            buildStage.result
          );
        }
      }

      // Stage 2: Managed Checkpoints (Index + Validate)
      if (!docsDir) {
        stages.push({
          stage: 'docs',
          status: 'skipped',
          durationMs: 0,
          message: 'No managed/docs directory found on disk',
        });
      } else if (readOnlyMode) {
        const validateCmd = this.dependencies.validateDocsCommandFactory
          ? this.dependencies.validateDocsCommandFactory()
          : new ValidateDocsCommand();
        const docsStage = await this.runStage('docs', jsonMode, () =>
          this.runMuted(jsonMode, () => validateCmd.execute([docsDir]))
        );
        stages.push(docsStage.report);
        if (docsStage.result.exitCode !== 0) {
          return this.finishReport(
            stages,
            startedAt,
            sourceDir,
            docsDir,
            canonicalPlan.enabled,
            dryRun,
            checkOnly,
            jsonMode,
            docsStage.result
          );
        }
      } else {
        const indexCmd = this.dependencies.indexDocsCommandFactory
          ? this.dependencies.indexDocsCommandFactory()
          : new IndexDocsCommand();
        const validateCmd = this.dependencies.validateDocsCommandFactory
          ? this.dependencies.validateDocsCommandFactory()
          : new ValidateDocsCommand();
        const docsStage = await this.runStage('docs', jsonMode, () =>
          this.runMuted(jsonMode, async () => {
            const indexRes = await indexCmd.execute([docsDir]);
            if (indexRes.exitCode !== 0) {
              return indexRes;
            }
            return validateCmd.execute([docsDir]);
          })
        );
        stages.push(docsStage.report);
        if (docsStage.result.exitCode !== 0) {
          return this.finishReport(
            stages,
            startedAt,
            sourceDir,
            docsDir,
            canonicalPlan.enabled,
            dryRun,
            checkOnly,
            jsonMode,
            docsStage.result
          );
        }
      }

      // Stage 3: Executable SpecGraph Extraction
      const authoredSpecDirs = config.specGovernance?.authoredSpecDirs ?? [];
      const hasAuthoredSpecDir = authoredSpecDirs.some((dir) =>
        fs.existsSync(path.resolve(rootDir, dir))
      );
      if (this.hasFlag(args, '--skip-specs')) {
        stages.push({
          stage: 'specs',
          status: 'skipped',
          durationMs: 0,
          message: 'Skipped via --skip-specs',
        });
      } else if (readOnlyMode) {
        stages.push({
          stage: 'specs',
          status: 'skipped',
          durationMs: 0,
          message: 'Skipped SpecGraph write in read-only (--dry-run/--check) mode',
        });
      } else if (!hasAuthoredSpecDir) {
        stages.push({
          stage: 'specs',
          status: 'skipped',
          durationMs: 0,
          message: 'No configured authoredSpecDirs directory present on disk',
        });
      } else {
        const specCmd = this.dependencies.specExtractCommandFactory
          ? this.dependencies.specExtractCommandFactory()
          : new SpecExtractCommand();
        const specStage = await this.runStage('specs', jsonMode, () =>
          this.runMuted(jsonMode, () => specCmd.execute([]))
        );
        stages.push(specStage.report);
        if (specStage.result.exitCode !== 0) {
          return this.finishReport(
            stages,
            startedAt,
            sourceDir,
            docsDir,
            canonicalPlan.enabled,
            dryRun,
            checkOnly,
            jsonMode,
            specStage.result
          );
        }
      }

      // Stage 4: Bidirectional Backlinks
      if (this.hasFlag(args, '--skip-backlinks') || !docsDir) {
        stages.push({
          stage: 'backlinks',
          status: 'skipped',
          durationMs: 0,
          message: docsDir ? 'Skipped via --skip-backlinks' : 'No managed/docs directory found',
        });
      } else {
        const backlinksArgs = [docsDir, ...(checkOnly ? ['--check'] : dryRun ? ['--dry-run'] : [])];
        const backlinksCmd = this.dependencies.updateBacklinksCommandFactory
          ? this.dependencies.updateBacklinksCommandFactory()
          : new UpdateBacklinksCommand();
        const backlinksStage = await this.runStage('backlinks', jsonMode, () =>
          this.runMuted(jsonMode, () => backlinksCmd.execute(backlinksArgs))
        );
        stages.push(backlinksStage.report);
        if (backlinksStage.result.exitCode !== 0) {
          return this.finishReport(
            stages,
            startedAt,
            sourceDir,
            docsDir,
            canonicalPlan.enabled,
            dryRun,
            checkOnly,
            jsonMode,
            backlinksStage.result
          );
        }
      }

      return this.finishReport(
        stages,
        startedAt,
        sourceDir,
        docsDir,
        canonicalPlan.enabled,
        dryRun,
        checkOnly,
        jsonMode,
        this.success('Workspace synchronization completed')
      );
    });
  }

  private resolveDocsDir(args: readonly string[], rootDir: string): string | null {
    const explicit = this.getOption([...args], '--docs-dir');
    if (explicit) {
      return explicit;
    }

    const managedDirs = this.configManager.get().documentManagement?.managedDirs ?? [];
    for (const candidate of managedDirs) {
      if (fs.existsSync(path.resolve(rootDir, candidate))) {
        return candidate;
      }
    }

    for (const fallback of ['managed', 'docs']) {
      if (fs.existsSync(path.resolve(rootDir, fallback))) {
        return fallback;
      }
    }

    return null;
  }

  private resolveCanonicalPlan(
    args: readonly string[],
    rootDir: string
  ): { enabled: boolean; explicitRouterModule?: string } {
    if (this.hasFlag([...args], '--no-canonical-graph')) {
      return { enabled: false };
    }

    const explicitRouterModule = this.getOption([...args], '--router-module');
    const explicitFlag =
      this.hasFlag([...args], '--canonical-graph') ||
      process.env.TSDOC_EDGE_CANONICAL_GRAPH === '1';

    if (explicitFlag || explicitRouterModule || process.env.TSDOC_EDGE_GRAPH_ROUTER_MODULE) {
      return { enabled: true, explicitRouterModule };
    }

    const configuredRouter = this.configManager.get().canonicalGraph?.routerModule;
    if (!configuredRouter) {
      return { enabled: false };
    }

    if (configuredRouter.startsWith('.') || path.isAbsolute(configuredRouter)) {
      const resolvedPath = path.isAbsolute(configuredRouter)
        ? configuredRouter
        : path.resolve(rootDir, configuredRouter);
      return { enabled: fs.existsSync(resolvedPath) };
    }

    return { enabled: true };
  }

  private async runStage(
    stage: SyncStageReport['stage'],
    jsonMode: boolean,
    fn: () => Promise<CommandResult>
  ): Promise<{ report: SyncStageReport; result: CommandResult }> {
    const t0 = Date.now();
    const result = await fn();
    const durationMs = Date.now() - t0;
    const status: SyncStageReport['status'] = result.exitCode === 0 ? 'passed' : 'failed';
    const message =
      result.message ?? (status === 'passed' ? `${stage} completed` : `${stage} failed`);
    const report: SyncStageReport = { stage, status, durationMs, message };

    if (!jsonMode) {
      const badge =
        status === 'passed' ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
      console.log(
        `  ${badge} ${colors.bold}[${stage}]${colors.reset} ${message} ${colors.dim}(${durationMs}ms)${colors.reset}`
      );
    }

    return { report, result };
  }

  private async runMuted(
    muteStdout: boolean,
    fn: () => Promise<CommandResult>
  ): Promise<CommandResult> {
    if (!muteStdout) {
      return fn();
    }
    const originalLog = console.log;
    console.log = () => undefined;
    try {
      return await fn();
    } finally {
      console.log = originalLog;
    }
  }

  private finishReport(
    stages: readonly SyncStageReport[],
    startedAt: number,
    sourceDir: string,
    docsDir: string | null,
    canonicalGraphEnabled: boolean,
    dryRun: boolean,
    checkOnly: boolean,
    jsonMode: boolean,
    finalResult: CommandResult
  ): CommandResult {
    const durationMs = Date.now() - startedAt;
    const status: SyncPipelineReport['status'] = finalResult.exitCode === 0 ? 'passed' : 'failed';
    const mode: SyncPipelineReport['mode'] = checkOnly ? 'check' : dryRun ? 'dry-run' : 'write';

    if (jsonMode) {
      const payload: SyncPipelineReport = {
        status,
        mode,
        sourceDir,
        docsDir,
        canonicalGraphEnabled,
        durationMs,
        stages,
      };
      console.log(JSON.stringify(payload, null, 2));
      return finalResult;
    }

    console.log();
    this.printSection('Sync Summary');
    for (const s of stages) {
      const icon =
        s.status === 'passed'
          ? `${colors.green}✓${colors.reset}`
          : s.status === 'skipped'
            ? `${colors.dim}↷${colors.reset}`
            : `${colors.red}✗${colors.reset}`;
      console.log(
        `  ${icon} ${s.stage.padEnd(10)} ${s.status.padEnd(8)} ${colors.dim}${s.message}${colors.reset}`
      );
    }
    console.log();
    if (finalResult.exitCode === 0) {
      this.printSuccess(`Sync ${mode} completed in ${durationMs}ms`);
    } else {
      this.printError(`Sync ${mode} failed: ${finalResult.message ?? 'stage failure'}`);
    }
    console.log();

    return finalResult;
  }
}
