/** Unified command group for convention-pack operations. */

import { BaseCommand, type CommandResult } from './BaseCommand';
import { ConventionCheckCommand } from './ConventionCheckCommand';
import { ConventionInputsCommand } from './ConventionInputsCommand';
import { ConventionRetentionCommand } from './ConventionRetentionCommand';

/** Route convention subcommands without widening the v1 capability claim. */
export class ConventionCommand extends BaseCommand {
  getName(): string {
    return 'convention';
  }

  getAlias(): string[] {
    return ['conv'];
  }

  getDescription(): string {
    return 'Revision-pinned spec-binding convention management';
  }

  protected getUsage(): string {
    return `tsdoc-edge convention <subcommand> [options]

  Subcommands:
    check       Check one convention pack against a saved graph revision
    inputs      List or read exact evidence/enrichment/policy revisions
    retention   Manage exact history pins and tombstone-based retention GC

  Example:
    tsdoc-edge convention check --pack managed/conventions/tsdoc-edge-core.json --json
    tsdoc-edge convention check --pack managed/conventions/tsdoc-edge-core-policy.json --spec-db .tsdoc/spec-graph.db --json
    tsdoc-edge convention inputs list --input-revisions-db .tsdoc/analysis-inputs.db --json
    tsdoc-edge convention retention gc --history-db .tsdoc/convention-history.db --before 2026-01-01T00:00:00Z --dry-run`;
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        return this.displayHelp();
      }
      const [subcommand, ...subcommandArgs] = args;
      if (subcommand === 'check') return new ConventionCheckCommand().execute(subcommandArgs);
      if (subcommand === 'inputs') return new ConventionInputsCommand().execute(subcommandArgs);
      if (subcommand === 'retention')
        return new ConventionRetentionCommand().execute(subcommandArgs);
      this.printError(`Unknown convention subcommand: ${subcommand}`);
      return this.failure(`Unknown convention subcommand: ${subcommand}`, 2);
    });
  }
}
