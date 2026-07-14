/** Operate immutable coverage metric baselines and their trend comparisons. */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConfigManager } from '../config/ConfigManager';
import {
  compareCoverageMetricBaseline,
  createCoverageMetricBaseline,
} from '../metrics/CoverageMetricBaseline';
import { CoverageMetricBaselineRepository } from '../storage/CoverageMetricBaselineRepository';
import { CoverageMetricReportRepository } from '../storage/CoverageMetricReportRepository';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/** Save or compare source-identified coverage metric reports. */
export class CoverageBaselineCommand extends BaseCommand {
  getName(): string {
    return 'coverage-baseline';
  }

  getAlias(): string[] {
    return ['coverage-trend'];
  }

  getDescription(): string {
    return 'Save and compare immutable coverage metric baselines';
  }

  protected getUsage(): string {
    return `tsdoc-edge coverage-baseline <save|compare|list|read> [options]

  Options:
    --workspace <id>             Workspace identity (default: project.name)
    --report-db <file>           Source report DB (default: .tsdoc/coverage-metrics.db)
    --baseline-db <file>         Baseline DB (default: .tsdoc/coverage-baselines.db)
    --report-id <id>             Exact coverage report identity
    --baseline-id <id>           Baseline identity (required for compare/read)
    --graph-revision <id>        Canonical graph revision used by the observation
    --graph-fingerprint <value>  Canonical graph fingerprint used by the observation
    --json                       Print machine-readable output`;
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      if (this.hasHelpFlag(args)) return this.displayHelp();
      const operation = args[0];
      if (
        operation !== 'save' &&
        operation !== 'compare' &&
        operation !== 'list' &&
        operation !== 'read'
      ) {
        return this.failure('Use coverage-baseline save, compare, list, or read', 2);
      }
      const invalid = validateArguments(args.slice(1));
      if (invalid) return this.failure(invalid, 2);

      const config = ConfigManager.getInstance(process.cwd()).get();
      const workspaceId =
        this.getOption(args, '--workspace') ?? config.project?.name ?? path.basename(process.cwd());
      const reportDatabasePath = path.resolve(
        process.cwd(),
        this.getOption(args, '--report-db') ?? '.tsdoc/coverage-metrics.db'
      );
      const baselineDatabasePath = path.resolve(
        process.cwd(),
        this.getOption(args, '--baseline-db') ?? '.tsdoc/coverage-baselines.db'
      );
      if (operation === 'list' || operation === 'read') {
        if (!fs.existsSync(baselineDatabasePath)) {
          const message = `Coverage baseline database not found: ${baselineDatabasePath}`;
          return this.operatorFailure(message, 2);
        }
        const baselines = new CoverageMetricBaselineRepository(baselineDatabasePath, {
          readOnly: true,
        });
        try {
          if (operation === 'list') {
            const pins = baselines.listBaselinePins(workspaceId);
            this.printBaselineOutput(
              {
                operation,
                workspaceId,
                baselineDatabasePath: relativeDatabasePath(baselineDatabasePath),
                pins,
              },
              args
            );
            return this.success(`Coverage baselines listed: ${pins.length}`);
          }
          const baselineId = this.getOption(args, '--baseline-id');
          if (!baselineId) return this.failure('--baseline-id is required for read', 2);
          const baseline = baselines.readBaseline({ workspaceId, baselineId });
          if (!baseline)
            return this.failure(`Coverage baseline not found: ${workspaceId}/${baselineId}`, 2);
          this.printBaselineOutput(
            {
              operation,
              workspaceId,
              baselineDatabasePath: relativeDatabasePath(baselineDatabasePath),
              baseline,
            },
            args
          );
          return this.success(`Coverage baseline read: ${baseline.baselineId}`);
        } finally {
          baselines.close();
        }
      }
      const reportId = this.getOption(args, '--report-id');
      if (!reportId) return this.failure('--report-id is required', 2);
      if (operation === 'compare' && !this.getOption(args, '--baseline-id')) {
        return this.failure('--baseline-id is required for compare', 2);
      }
      const graphRevisionId = this.getOption(args, '--graph-revision');
      const graphFingerprint = this.getOption(args, '--graph-fingerprint');
      if ((graphRevisionId && !graphFingerprint) || (!graphRevisionId && graphFingerprint)) {
        return this.failure(
          '--graph-revision and --graph-fingerprint must be provided together',
          2
        );
      }
      if (!fs.existsSync(reportDatabasePath)) {
        const message = `Coverage report database not found: ${reportDatabasePath}`;
        return this.operatorFailure(message, 2);
      }
      if (operation === 'compare' && !fs.existsSync(baselineDatabasePath)) {
        const message = `Coverage baseline database not found: ${baselineDatabasePath}`;
        return this.operatorFailure(message, 2);
      }

      const reports = new CoverageMetricReportRepository(reportDatabasePath, { readOnly: true });
      try {
        const report = reports.readReport({ workspaceId, reportId });
        if (!report)
          return this.failure(`Coverage report not found: ${workspaceId}/${reportId}`, 2);

        const baselines = new CoverageMetricBaselineRepository(baselineDatabasePath, {
          readOnly: operation === 'compare',
        });
        try {
          if (operation === 'save') {
            const baseline = createCoverageMetricBaseline({
              workspaceId,
              reportId: report.reportId,
              metrics: report.metrics,
              ...(graphRevisionId ? { graphRevisionId } : {}),
              ...(graphFingerprint ? { graphFingerprint } : {}),
            });
            baselines.storeBaseline(baseline);
            const output = {
              operation,
              workspaceId,
              reportId: report.reportId,
              baselineId: baseline.baselineId,
              inputIdentity: baseline.inputIdentity,
              metricIds: baseline.metrics.map((metric) => metric.metricId),
            };
            this.printBaselineOutput(output, args);
            return this.success(`Coverage baseline saved: ${baseline.baselineId}`);
          }

          const baselineId = this.getOption(args, '--baseline-id');
          if (!baselineId) return this.failure('--baseline-id is required for compare', 2);
          const baseline = baselines.readBaseline({ workspaceId, baselineId });
          if (!baseline)
            return this.failure(`Coverage baseline not found: ${workspaceId}/${baselineId}`, 2);
          const comparison = compareCoverageMetricBaseline(baseline, {
            workspaceId,
            metrics: report.metrics,
            ...(graphRevisionId ? { graphRevisionId } : {}),
            ...(graphFingerprint ? { graphFingerprint } : {}),
          });
          this.printBaselineOutput({ operation, reportId: report.reportId, ...comparison }, args);
          return this.success(`Coverage baseline compared: ${baseline.baselineId}`);
        } finally {
          baselines.close();
        }
      } finally {
        reports.close();
      }
    });
  }

  private printBaselineOutput(value: unknown, args: readonly string[]): void {
    if (this.hasFlag([...args], '--json')) {
      console.log(JSON.stringify(value, null, 2));
      return;
    }
    const output = value as {
      operation: string;
      baselineId?: string;
      comparisons?: readonly unknown[];
      pins?: readonly { workspaceId: string; baselineId: string }[];
      baselineDatabasePath?: string;
    };
    this.printHeader('Coverage Baseline');
    console.log(`${colors.bold}Operation:${colors.reset} ${output.operation}`);
    if (output.baselineId)
      console.log(`${colors.bold}Baseline:${colors.reset} ${output.baselineId}`);
    if (output.baselineDatabasePath)
      console.log(`${colors.bold}Database:${colors.reset} ${output.baselineDatabasePath}`);
    if (output.pins) console.log(`${colors.bold}Baselines:${colors.reset} ${output.pins.length}`);
    if (output.comparisons) {
      console.log(`${colors.bold}Metrics compared:${colors.reset} ${output.comparisons.length}`);
    }
  }
}

const VALUE_OPTIONS = new Set([
  '--workspace',
  '--report-db',
  '--baseline-db',
  '--report-id',
  '--baseline-id',
  '--graph-revision',
  '--graph-fingerprint',
]);
const BOOLEAN_OPTIONS = new Set(['--json', '--help', '-h']);

function validateArguments(args: readonly string[]): string | undefined {
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (BOOLEAN_OPTIONS.has(argument)) {
      const name = argument === '-h' ? '--help' : argument;
      if (seen.has(name)) return `Duplicate coverage-baseline option: ${name}`;
      seen.add(name);
      continue;
    }
    const [name, inlineValue] = argument.split('=', 2);
    if (!VALUE_OPTIONS.has(name)) return `Unknown coverage-baseline option: ${name}`;
    if (seen.has(name)) return `Duplicate coverage-baseline option: ${name}`;
    const value = inlineValue ?? args[index + 1];
    if (!value || (!inlineValue && value.startsWith('-'))) {
      return `Coverage-baseline option requires a value: ${name}`;
    }
    seen.add(name);
    if (inlineValue === undefined) index += 1;
  }
  return undefined;
}

function relativeDatabasePath(databasePath: string): string {
  return path.relative(process.cwd(), databasePath).split(path.sep).join('/') || '.';
}
