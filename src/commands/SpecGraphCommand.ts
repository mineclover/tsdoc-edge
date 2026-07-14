/** Read-only operator access to saved managed SpecGraph revisions. */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { SpecGraphRevision } from '../spec-graph';
import { SpecGraphRepository, type SpecGraphRevisionSummary } from '../storage/SpecGraphRepository';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/** Inspect active and retained managed specification revisions without mutation. */
export class SpecGraphCommand extends BaseCommand {
  getName(): string {
    return 'spec-graph';
  }

  getDescription(): string {
    return 'Inspect saved managed SpecGraph revisions read-only';
  }

  protected getUsage(): string {
    return `tsdoc-edge spec graph <status|list|read> [options]

Options:
  --spec-db <file>        SpecGraph SQLite path (default: .tsdoc/spec-graph.db)
  --revision-id <id>      Exact retained revision ID (required by read)
  --json                  Print machine-readable output`;
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      if (this.hasHelpFlag(args)) return this.displayHelp();
      const operation = args[0];
      if (operation !== 'status' && operation !== 'list' && operation !== 'read') {
        return this.failure('Use spec graph status, list, or read', 2);
      }
      const invalid = validateArguments(args.slice(1));
      if (invalid) return this.failure(invalid, 2);

      const input = option(args, '--spec-db') ?? '.tsdoc/spec-graph.db';
      const databasePath = path.resolve(process.cwd(), input);
      if (!fs.existsSync(databasePath)) {
        return this.operatorFailure(`Spec graph database not found: ${databasePath}`, 2);
      }

      const repository = new SpecGraphRepository(databasePath, { readOnly: true });
      try {
        const summaries = repository.listRevisionSummaries();
        if (operation === 'list') {
          this.printGraphOutput(
            { operation, databasePath: relativeDatabasePath(databasePath), summaries },
            args
          );
          return this.success(`Spec graph revisions listed: ${summaries.length}`);
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
          return this.success('Spec graph status read');
        }

        const revisionId = option(args, '--revision-id');
        if (!revisionId) return this.failure('--revision-id is required for read', 2);
        const revision = repository.readRevision(revisionId);
        if (!revision) return this.failure(`Spec graph revision not found: ${revisionId}`, 2);
        this.printGraphOutput(
          { operation, databasePath: relativeDatabasePath(databasePath), revision },
          args
        );
        return this.success(`Spec graph revision read: ${revisionId}`);
      } finally {
        repository.close();
      }
    });
  }

  private printGraphOutput(
    value: {
      readonly operation: string;
      readonly databasePath: string;
      readonly summaries?: readonly SpecGraphRevisionSummary[];
      readonly active?: SpecGraphRevisionSummary | null;
      readonly retainedRevisionCount?: number;
      readonly revision?: SpecGraphRevision;
    },
    args: readonly string[]
  ): void {
    if (this.hasFlag([...args], '--json')) {
      console.log(JSON.stringify(value, null, 2));
      return;
    }
    this.printHeader('Spec Graph');
    console.log(`${colors.bold}Operation:${colors.reset} ${value.operation}`);
    console.log(`${colors.bold}Database:${colors.reset} ${value.databasePath}`);
    if (value.summaries) {
      console.log(`${colors.bold}Revisions:${colors.reset} ${value.summaries.length}`);
      for (const summary of value.summaries) {
        console.log(
          `  ${summary.active ? '* ' : '  '}${summary.revisionId} nodes=${summary.nodeCount} edges=${summary.edgeCount} bindings=${summary.bindingCount}`
        );
      }
    }
    if (value.active !== undefined) {
      console.log(
        `${colors.bold}Active:${colors.reset} ${value.active?.revisionId ?? 'none'} (${value.retainedRevisionCount ?? 0} retained)`
      );
    }
    if (value.revision) {
      console.log(`${colors.bold}Revision:${colors.reset} ${value.revision.revisionId}`);
      console.log(
        `  nodes=${value.revision.nodes.length} edges=${value.revision.edges.length} bindings=${value.revision.bindings.length}`
      );
    }
  }
}

const VALUE_OPTIONS = new Set(['--spec-db', '--revision-id']);
const BOOLEAN_OPTIONS = new Set(['--json', '--help', '-h']);

function validateArguments(args: readonly string[]): string | undefined {
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    const name = argument === '-h' ? '--help' : argument;
    if (BOOLEAN_OPTIONS.has(argument)) {
      if (seen.has(name)) return `Duplicate spec graph option: ${name}`;
      seen.add(name);
      continue;
    }
    const [optionName, inlineValue] = argument.split('=', 2);
    if (!VALUE_OPTIONS.has(optionName)) return `Unknown spec graph option: ${optionName}`;
    if (seen.has(optionName)) return `Duplicate spec graph option: ${optionName}`;
    const value = inlineValue ?? args[index + 1];
    if (!value || (!inlineValue && value.startsWith('-')))
      return `Spec graph option requires a value: ${optionName}`;
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

function relativeDatabasePath(databasePath: string): string {
  return path.relative(process.cwd(), databasePath).split(path.sep).join('/') || '.';
}
