/**
 * Unified Symbol Command
 * Routes to appropriate symbol subcommand
 * @packageDocumentation
 */

import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { DepsCommand } from './DepsCommand';
import { FindMethodCommand } from './FindMethodCommand';
import { OrphansCommand } from './OrphansCommand';
import { SymbolFixCommand } from './SymbolFixCommand';
import { SymbolQueryCommand } from './SymbolQueryCommand';
import { SymbolRenameCommand } from './SymbolRenameCommand';
import { WhoUsesCommand } from './WhoUsesCommand';

const SUBCOMMANDS = {
  query: { command: SymbolQueryCommand, description: 'Query symbol information' },
  fix: { command: SymbolFixCommand, description: 'Fix symbol issues' },
  rename: { command: SymbolRenameCommand, description: 'Rename symbols across codebase' },
  deps: { command: DepsCommand, description: 'Show symbol dependencies' },
  'who-uses': { command: WhoUsesCommand, description: 'Show who uses a symbol' },
  orphans: { command: OrphansCommand, description: 'Find orphaned symbols' },
  'find-method': { command: FindMethodCommand, description: 'Find methods by name' },
} as const;

/** Available symbol subcommand names */
type SubcommandName = keyof typeof SUBCOMMANDS;

/**
 * Unified command for all symbol operations
 * @public
 */
export class SymbolUnifiedCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'symbol';
  }

  /**
   * getAlias method
   * @returns Returns string[]
   * @public
   */
  getAlias(): string[] {
    return ['sym'];
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Unified symbol operations (query|deps|who-uses|orphans|...)';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    const subcommandList = Object.entries(SUBCOMMANDS)
      .map(([name, { description }]) => `  ${name.padEnd(12)} ${description}`)
      .join('\n');

    return `tsdoc-edge symbol <subcommand> [options]

Subcommands:
${subcommandList}

Options:
  --human      Output in human-readable format (default: XML)

Examples:
  tsdoc-edge symbol query <symbol-id>
  tsdoc-edge symbol deps <symbol-name>
  tsdoc-edge symbol who-uses <symbol-name>
  tsdoc-edge symbol orphans --exclude-tests
  tsdoc-edge symbol find-method DatabaseManager.insert

Use 'tsdoc-edge symbol <subcommand> --help' for subcommand details.`;
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // --human is a shared output flag that may precede the subcommand name
      const nameIndex = args.findIndex((arg) => arg !== '--human');

      // Only show unified help if no args or first arg is help flag
      if (nameIndex === -1 || args[nameIndex] === '--help' || args[nameIndex] === '-h') {
        return this.displayHelp();
      }

      const subcommandName = args[nameIndex] as SubcommandName;
      // Pass every other argument (including --human) through to the subcommand
      const subcommandArgs = [...args.slice(0, nameIndex), ...args.slice(nameIndex + 1)];

      if (!(subcommandName in SUBCOMMANDS)) {
        this.printError(`Unknown subcommand: ${subcommandName}`);
        console.log();
        console.log('Available subcommands:');
        for (const [name, { description }] of Object.entries(SUBCOMMANDS)) {
          console.log(`  ${colors.cyan}${name.padEnd(10)}${colors.reset} ${description}`);
        }
        console.log();
        return this.failure(`Unknown subcommand: ${subcommandName}`);
      }

      const { command: CommandClass } = SUBCOMMANDS[subcommandName];
      const subcommand = new CommandClass();
      return subcommand.execute(subcommandArgs);
    });
  }
}
