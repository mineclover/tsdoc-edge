/** Operate exact convention history pins and tombstone-based retention GC. */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  ConventionCheckHistoryRepository,
  type ConventionHistoryRetentionResult,
  type ConventionHistorySummary,
} from '../storage/ConventionCheckHistoryRepository';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/** Keep current history view separate from exact retained-history lookup. */
export class ConventionRetentionCommand extends BaseCommand {
  getName(): string {
    return 'convention-retention';
  }

  getDescription(): string {
    return 'Pin, list, and tombstone retained convention history';
  }

  protected getUsage(): string {
    return `tsdoc-edge convention retention <list|pin|unpin|gc> [options]

  Required:
    --history-db <file>          Convention history database

  Options:
    --history-id <id>            Exact history ID for pin/unpin
    --workspace <id>             Restrict list/gc to one workspace
    --before <time>              RFC3339 cutoff for list/gc
    --reason <text>              Pin/tombstone reason
    --dry-run                    Show GC candidates without mutating history
    --json                       Print machine-readable output`;
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      if (this.hasHelpFlag(args)) return this.displayHelp();
      const operation = args[0];
      if (
        operation !== 'list' &&
        operation !== 'pin' &&
        operation !== 'unpin' &&
        operation !== 'gc'
      ) {
        return this.failure('Use convention retention list, pin, unpin, or gc', 2);
      }
      const invalid = validateArguments(args.slice(1));
      if (invalid) return this.failure(invalid, 2);
      const databaseInput = this.getOption(args, '--history-db');
      if (!databaseInput) return this.failure('--history-db is required', 2);
      const databasePath = path.resolve(process.cwd(), databaseInput);
      if (!fs.existsSync(databasePath)) {
        return this.operatorFailure(`Convention history database not found: ${databasePath}`, 2);
      }
      const historyId = this.getOption(args, '--history-id');
      if ((operation === 'pin' || operation === 'unpin') && !historyId) {
        return this.failure(`--history-id is required for ${operation}`, 2);
      }
      const before = this.getOption(args, '--before');
      if ((operation === 'list' || operation === 'gc') && !before) {
        return this.failure(`--before is required for ${operation}`, 2);
      }
      const dryRun = this.hasFlag(args, '--dry-run');
      if (dryRun && operation !== 'gc') return this.failure('--dry-run is only valid for gc', 2);
      const readOnly = operation === 'list' || (operation === 'gc' && dryRun);
      const history = new ConventionCheckHistoryRepository(databasePath, { readOnly });
      const requiredHistoryId = historyId ?? '';
      const requiredBefore = before ?? '';
      try {
        if (operation === 'list') {
          const summaries = history.listSummaries({
            ...(this.getOption(args, '--workspace')
              ? { workspaceId: this.getOption(args, '--workspace') }
              : {}),
            ...(before ? { before: normalizeTimestamp(before) } : {}),
          });
          this.printRetentionOutput({ operation, summaries }, args);
          return this.success(`Convention history listed: ${summaries.length}`);
        }

        if (operation === 'pin') {
          const pin = history.pin(
            requiredHistoryId,
            this.getOption(args, '--reason') ?? 'operator pin'
          );
          this.printRetentionOutput({ operation, pin }, args);
          return this.success(`Convention history pinned: ${pin.historyId}`);
        }

        if (operation === 'unpin') {
          const removed = history.unpin(requiredHistoryId);
          if (!removed) return this.failure(`Convention history pin not found: ${historyId}`, 2);
          this.printRetentionOutput(
            { operation, historyId: requiredHistoryId, unpinned: true },
            args
          );
          return this.success(`Convention history unpinned: ${historyId}`);
        }

        const cutoff = normalizeTimestamp(requiredBefore);
        if (dryRun) {
          const summaries = history.listSummaries({
            ...(this.getOption(args, '--workspace')
              ? { workspaceId: this.getOption(args, '--workspace') }
              : {}),
            before: cutoff,
          });
          this.printRetentionOutput({ operation, dryRun: true, before: cutoff, summaries }, args);
          return this.success(`Convention history GC preview: ${summaries.length}`);
        }
        const result = history.collectGarbage({
          before: cutoff,
          ...(this.getOption(args, '--workspace')
            ? { workspaceId: this.getOption(args, '--workspace') }
            : {}),
          ...(this.getOption(args, '--reason') ? { reason: this.getOption(args, '--reason') } : {}),
        });
        this.printRetentionOutput({ operation, ...result }, args);
        return this.success(`Convention history GC complete: ${result.tombstoned.length}`);
      } finally {
        history.close();
      }
    });
  }

  private printRetentionOutput(value: unknown, args: readonly string[]): void {
    if (this.hasFlag([...args], '--json')) {
      console.log(JSON.stringify(value, null, 2));
      return;
    }
    const output = value as {
      operation: string;
      summaries?: readonly ConventionHistorySummary[];
      dryRun?: boolean;
      tombstoned?: ConventionHistoryRetentionResult['tombstoned'];
      skippedPinned?: readonly ConventionHistorySummary[];
    };
    this.printHeader('Convention History Retention');
    console.log(`${colors.bold}Operation:${colors.reset} ${output.operation}`);
    if (output.summaries)
      console.log(`${colors.bold}Records:${colors.reset} ${output.summaries.length}`);
    if (output.dryRun) console.log(`${colors.bold}Mode:${colors.reset} dry-run`);
    if (output.tombstoned)
      console.log(`${colors.bold}Tombstoned:${colors.reset} ${output.tombstoned.length}`);
    if (output.skippedPinned)
      console.log(`${colors.bold}Pinned/skipped:${colors.reset} ${output.skippedPinned.length}`);
  }
}

const VALUE_OPTIONS = new Set([
  '--history-db',
  '--history-id',
  '--workspace',
  '--before',
  '--reason',
]);
const BOOLEAN_OPTIONS = new Set(['--dry-run', '--json', '--help', '-h']);

function validateArguments(args: readonly string[]): string | undefined {
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (BOOLEAN_OPTIONS.has(argument)) {
      const name = argument === '-h' ? '--help' : argument;
      if (seen.has(name)) return `Duplicate convention-retention option: ${name}`;
      seen.add(name);
      continue;
    }
    const [name, inlineValue] = argument.split('=', 2);
    if (!VALUE_OPTIONS.has(name)) return `Unknown convention-retention option: ${name}`;
    if (seen.has(name)) return `Duplicate convention-retention option: ${name}`;
    const value = inlineValue ?? args[index + 1];
    if (!value || (!inlineValue && value.startsWith('-')))
      return `Convention-retention option requires a value: ${name}`;
    seen.add(name);
    if (inlineValue === undefined) index += 1;
  }
  return undefined;
}

function normalizeTimestamp(value: string): string {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) throw new Error(`Invalid RFC3339 timestamp: ${value}`);
  return parsed.toISOString();
}
