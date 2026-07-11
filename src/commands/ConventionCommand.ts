/** Unified command group for convention-pack operations. */

import { BaseCommand, type CommandResult } from './BaseCommand';
import { ConventionCheckCommand } from './ConventionCheckCommand';

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

  Example:
    tsdoc-edge convention check --pack managed/conventions/tsdoc-edge-core.json --json`;
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        return this.displayHelp();
      }
      const [subcommand, ...subcommandArgs] = args;
      if (subcommand === 'check') return new ConventionCheckCommand().execute(subcommandArgs);
      this.printError(`Unknown convention subcommand: ${subcommand}`);
      return this.failure(`Unknown convention subcommand: ${subcommand}`, 2);
    });
  }
}
