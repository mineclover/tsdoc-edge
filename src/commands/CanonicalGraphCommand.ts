/** Operator access to saved ttsc canonical graph revisions and revision retention. */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  type ActiveCanonicalGraphRevision,
  type CanonicalGraphRevisionSummary,
  GraphRepository,
  type GraphRepositoryPruneResult,
} from '../storage/GraphRepository';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * Inspect active and retained canonical graph revisions or prune old historical revisions.
 *
 * @public
 */
export class CanonicalGraphCommand extends BaseCommand {
  /**
   * Command name.
   * @returns Command identifier
   * @public
   */
  getName(): string {
    return 'canonical-graph';
  }

  /**
   * Command description.
   * @returns Short human summary
   * @public
   */
  getDescription(): string {
    return 'Inspect or prune saved ttsc canonical graph revisions';
  }

  protected getUsage(): string {
    return `tsdoc-edge canonical-graph <status|list|read|prune> [options]

Options:
  --graph-db <file>       Canonical graph SQLite path (default: .tsdoc/canonical-graph.db)
  --revision-id <id>      Exact retained revision ID (required by read)
  --keep <count>          Maximum revisions to retain including active (default: 2; prune only)
  --vacuum                Run SQLite VACUUM after pruning deleted revisions (prune only)
  --json                  Print machine-readable output`;
  }

  /**
   * Execute canonical-graph subcommand.
   * @param args - CLI arguments
   * @returns Command execution result
   * @public
   */
  execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(() => {
      if (this.hasHelpFlag(args)) return this.displayHelp();
      const operation = args[0];
      if (
        operation !== 'status' &&
        operation !== 'list' &&
        operation !== 'read' &&
        operation !== 'prune'
      ) {
        return this.failure('Use canonical-graph status, list, read, or prune', 2);
      }
      const invalid = validateArguments(args.slice(1));
      if (invalid) return this.failure(invalid, 2);

      const input =
        option(args, '--graph-db') ?? configuredDatabasePath() ?? '.tsdoc/canonical-graph.db';
      const databasePath = path.resolve(process.cwd(), input);
      if (!fs.existsSync(databasePath)) {
        return this.operatorFailure(`Canonical graph database not found: ${databasePath}`, 2);
      }

      if (operation === 'prune') {
        if (option(args, '--revision-id') !== undefined) {
          return this.failure('--revision-id cannot be combined with prune', 2);
        }
        const rawKeep = option(args, '--keep');
        let keepLatest = configuredMaxRetainedRevisions() ?? 2;
        if (rawKeep !== undefined) {
          if (!/^\d+$/.test(rawKeep) || Number(rawKeep) < 1) {
            return this.failure('--keep must be a positive integer', 2);
          }
          keepLatest = Number(rawKeep);
        }
        const vacuum = this.hasFlag(args, '--vacuum');
        const repository = new GraphRepository(databasePath);
        try {
          const pruned = repository.pruneRevisions({ keepLatest, vacuum });
          this.printGraphOutput(
            {
              operation,
              databasePath: relativeDatabasePath(databasePath),
              keepLatest,
              pruned,
            },
            args
          );
          return this.success(
            `Canonical graph revisions pruned: ${pruned.deletedRevisionIds.length} deleted, ${pruned.retainedRevisionIds.length} retained`
          );
        } finally {
          repository.close();
        }
      }

      if (option(args, '--keep') !== undefined || this.hasFlag(args, '--vacuum')) {
        return this.failure('--keep and --vacuum are only supported with prune', 2);
      }

      const repository = new GraphRepository(databasePath, { readOnly: true });
      try {
        const summaries = repository.listRevisionSummaries();
        if (operation === 'list') {
          this.printGraphOutput(
            { operation, databasePath: relativeDatabasePath(databasePath), summaries },
            args
          );
          return this.success(`Canonical graph revisions listed: ${summaries.length}`);
        }

        if (operation === 'status') {
          this.printGraphOutput(
            {
              operation,
              databasePath: relativeDatabasePath(databasePath),
              active: summaries.find((summary) => summary.active) ?? null,
              retainedRevisionCount: summaries.length,
            },
            args
          );
          return this.success('Canonical graph status read');
        }

        const revisionId = option(args, '--revision-id');
        if (!revisionId) return this.failure('--revision-id is required for read', 2);
        const revision = repository.readRevision(revisionId);
        if (!revision) return this.failure(`Canonical graph revision not found: ${revisionId}`, 2);
        this.printGraphOutput(
          { operation, databasePath: relativeDatabasePath(databasePath), revision },
          args
        );
        return this.success(`Canonical graph revision read: ${revisionId}`);
      } finally {
        repository.close();
      }
    });
  }

  private printGraphOutput(
    value: {
      readonly operation: string;
      readonly databasePath: string;
      readonly summaries?: readonly CanonicalGraphRevisionSummary[];
      readonly active?: CanonicalGraphRevisionSummary | null;
      readonly retainedRevisionCount?: number;
      readonly revision?: ActiveCanonicalGraphRevision;
      readonly keepLatest?: number;
      readonly pruned?: GraphRepositoryPruneResult;
    },
    args: readonly string[]
  ): void {
    if (this.hasFlag([...args], '--json')) {
      console.log(JSON.stringify(value, null, 2));
      return;
    }
    this.printHeader('Canonical Graph');
    console.log(`${colors.bold}Operation:${colors.reset} ${value.operation}`);
    console.log(`${colors.bold}Database:${colors.reset} ${value.databasePath}`);
    if (value.summaries) {
      console.log(`${colors.bold}Revisions:${colors.reset} ${value.summaries.length}`);
      for (const summary of value.summaries) {
        console.log(
          `  ${summary.active ? '* ' : '  '}${summary.revisionId} nodes=${summary.nodeCount} edges=${summary.edgeCount}`
        );
      }
    }
    if (value.active !== undefined) {
      console.log(
        `${colors.bold}Active:${colors.reset} ${value.active?.revisionId ?? 'none'} (${value.retainedRevisionCount ?? 0} retained)`
      );
    }
    if (value.revision) {
      console.log(`${colors.bold}Revision:${colors.reset} ${value.revision.metadata.revisionId}`);
      console.log(
        `  nodes=${value.revision.metadata.nodeCount} edges=${value.revision.metadata.edgeCount}`
      );
    }
    if (value.pruned) {
      console.log(`${colors.bold}Keep Latest:${colors.reset} ${value.keepLatest ?? 0}`);
      console.log(
        `${colors.bold}Active:${colors.reset} ${value.pruned.activeRevisionId ?? 'none'}`
      );
      console.log(
        `${colors.bold}Retained:${colors.reset} ${value.pruned.retainedRevisionIds.length}`
      );
      console.log(
        `${colors.bold}Deleted:${colors.reset} ${value.pruned.deletedRevisionIds.length}${value.pruned.vacuumed ? ' (vacuumed)' : ''}`
      );
    }
  }
}

const VALUE_OPTIONS = new Set(['--graph-db', '--revision-id', '--keep']);
const BOOLEAN_OPTIONS = new Set(['--json', '--vacuum', '--help', '-h']);

function validateArguments(args: readonly string[]): string | undefined {
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    const name = argument === '-h' ? '--help' : argument;
    if (BOOLEAN_OPTIONS.has(argument)) {
      if (seen.has(name)) return `Duplicate canonical-graph option: ${name}`;
      seen.add(name);
      continue;
    }
    const [optionName, inlineValue] = argument.split('=', 2);
    if (!VALUE_OPTIONS.has(optionName)) return `Unknown canonical-graph option: ${optionName}`;
    if (seen.has(optionName)) return `Duplicate canonical-graph option: ${optionName}`;
    const value = inlineValue ?? args[index + 1];
    if (!value || (!inlineValue && value.startsWith('-')))
      return `Canonical-graph option requires a value: ${optionName}`;
    seen.add(optionName);
    if (inlineValue === undefined) index += 1;
  }
  return undefined;
}

function option(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index !== -1) return args[index + 1];
  const inline = args.find((argument) => argument.startsWith(`${name}=`));
  return inline?.slice(name.length + 1);
}

function configuredCanonicalGraph(): {
  databasePath?: string;
  maxRetainedRevisions?: number;
} | null {
  try {
    const parsed: unknown = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), '.tsdoc.config.json'), 'utf8')
    );
    const config = parsed as {
      canonicalGraph?: { databasePath?: string; maxRetainedRevisions?: number };
    };
    return config.canonicalGraph ?? null;
  } catch {
    return null;
  }
}

function configuredDatabasePath(): string | undefined {
  const value = configuredCanonicalGraph()?.databasePath;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function configuredMaxRetainedRevisions(): number | undefined {
  const value = configuredCanonicalGraph()?.maxRetainedRevisions;
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 ? value : undefined;
}

function relativeDatabasePath(databasePath: string): string {
  return path.relative(process.cwd(), databasePath).split(path.sep).join('/') || '.';
}
