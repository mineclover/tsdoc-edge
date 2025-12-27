/**
 * Unified Symbol Command
 * Routes to appropriate symbol subcommand
 * @packageDocumentation
 */

import { BaseCommand, type CommandResult } from './BaseCommand';
import { SymbolQueryCommand } from './SymbolQueryCommand';
import { SymbolFixCommand } from './SymbolFixCommand';
import { SymbolRenameCommand } from './SymbolRenameCommand';

const SUBCOMMANDS = {
  query: { command: SymbolQueryCommand, description: 'Query symbol information' },
  fix: { command: SymbolFixCommand, description: 'Fix symbol issues' },
  rename: { command: SymbolRenameCommand, description: 'Rename symbols across codebase' },
} as const;

/** Available symbol subcommand names */
type SubcommandName = keyof typeof SUBCOMMANDS;

/**
 * Unified command for all symbol operations
 * @public
 */
export class SymbolUnifiedCommand extends BaseCommand {
  getName(): string {
    return 'symbol';
  }

  getDescription(): string {
    return 'Unified symbol operations (query|fix|rename)';
  }

  protected getUsage(): string {
    const subcommandList = Object.entries(SUBCOMMANDS)
      .map(([name, { description }]) => `  ${name.padEnd(10)} ${description}`)
      .join('\n');

    return `tsdoc-edge symbol <subcommand> [options]

Subcommands:
${subcommandList}

Examples:
  tsdoc-edge symbol query <symbol-id>
  tsdoc-edge symbol fix <symbol-id>
  tsdoc-edge symbol rename <old-name> <new-name>

Use 'tsdoc-edge symbol <subcommand> --help' for subcommand details.`;
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      if (args.length === 0 || this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const subcommandName = args[0] as SubcommandName;
      const subcommandArgs = args.slice(1);

      if (!(subcommandName in SUBCOMMANDS)) {
        this.printError(`Unknown subcommand: ${subcommandName}`);
        console.log();
        console.log('Available subcommands:');
        for (const [name, { description }] of Object.entries(SUBCOMMANDS)) {
          console.log(`  ${this.colors.cyan}${name.padEnd(10)}${this.colors.reset} ${description}`);
        }
        console.log();
        return this.failure(`Unknown subcommand: ${subcommandName}`);
      }

      const { command: CommandClass } = SUBCOMMANDS[subcommandName];
      const subcommand = new CommandClass();
      return subcommand.execute(subcommandArgs);
    });
  }

  private get colors() {
    return {
      reset: '\x1b[0m',
      cyan: '\x1b[36m',
    };
  }
}
