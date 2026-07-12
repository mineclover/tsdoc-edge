/** Compile configured managed specifications and atomically promote their projection. */

import * as path from 'node:path';
import { ConfigManager } from '../config/ConfigManager';
import { extractManagedSpecGraph } from '../spec-graph';
import { SpecGraphRepository } from '../storage/SpecGraphRepository';
import { BaseCommand, type CommandResult } from './BaseCommand';

/** Extract managed project specs into the immutable SpecGraph repository. */
export class SpecExtractCommand extends BaseCommand {
  getName(): string {
    return 'spec-extract';
  }

  getDescription(): string {
    return 'Compile configured managed project specifications into a SpecGraph revision';
  }

  protected getUsage(): string {
    return `tsdoc-edge spec extract [options]

Options:
  --spec-db <file>                SpecGraph SQLite path (default: .tsdoc/spec-graph.db)
  --expected-active <revisionId>  Compare-and-swap active revision guard
  --json                          Print the compiled revision

The configured specGovernance.authoredSpecDirs are the only authored inputs.`;
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      if (args.includes('--help') || args.includes('-h')) return this.displayHelp();
      const invalid = validateArguments(args);
      if (invalid) return this.failure(invalid, 2);
      const config = ConfigManager.getInstance(process.cwd()).get();
      const dirs = config.specGovernance?.authoredSpecDirs ?? [];
      if (!dirs.length) {
        return this.failure('specGovernance.authoredSpecDirs must contain at least one root', 2);
      }
      const revision = extractManagedSpecGraph({
        workspaceRoot: process.cwd(),
        workspaceId: config.project.name,
        authoredSpecDirs: dirs,
      });
      const databasePath = path.resolve(
        process.cwd(),
        option(args, '--spec-db') ?? '.tsdoc/spec-graph.db'
      );
      const repository = new SpecGraphRepository(databasePath);
      try {
        const active = repository.replaceActiveRevision(revision, {
          ...(option(args, '--expected-active')
            ? { expectedActiveRevisionId: option(args, '--expected-active') }
            : {}),
        });
        if (args.includes('--json')) console.log(JSON.stringify(active, null, 2));
        else {
          this.printSuccess(`Managed spec revision active: ${active.revisionId}`);
          console.log(
            `  nodes=${active.nodes.length} edges=${active.edges.length} bindings=${active.bindings.length}`
          );
        }
        return this.success('Managed spec extraction completed');
      } finally {
        repository.close();
      }
    });
  }
}

const VALUE_OPTIONS = new Set(['--spec-db', '--expected-active']);
const BOOLEAN_OPTIONS = new Set(['--json', '--help', '-h']);

function validateArguments(args: readonly string[]): string | undefined {
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    const name = argument === '-h' ? '--help' : argument;
    if (BOOLEAN_OPTIONS.has(argument)) {
      if (seen.has(name)) return `Duplicate spec extract option: ${name}`;
      seen.add(name);
      continue;
    }
    if (!VALUE_OPTIONS.has(argument)) return `Unknown spec extract option: ${argument}`;
    if (seen.has(argument)) return `Duplicate spec extract option: ${argument}`;
    if (!args[index + 1] || args[index + 1]?.startsWith('-')) {
      return `Spec extract option requires a value: ${argument}`;
    }
    seen.add(argument);
    index += 1;
  }
  return undefined;
}

function option(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}
