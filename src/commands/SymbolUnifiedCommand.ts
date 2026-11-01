/**
 * Unified Symbol Command
 * Routes to appropriate symbol subcommand
 *
 * @packageDocumentation
 * @doc [[CliCommandSurfaceSpecification]]
 * @doc [[SymbolQueryCommand]]
 * @context Unified `symbol` command group in the 20-command CLI surface
 * @functionality Routes 13 symbol subcommands (`query`, `deps`, `who-uses`, `orphans`, `find-method`, `tree`, `core-api`, `undocumented`, `untested`, `parse`, `promote`, `fix`, `rename`)
 * @sideEffect console: Writes subcommand routing errors and subcommand listings to stdout
 */

import { BaseCommand, type CommandResult } from './BaseCommand';
import { CoreApiCommand } from './CoreApiCommand';
import { DepsCommand } from './DepsCommand';
import { FindMethodCommand } from './FindMethodCommand';
import { OrphansCommand } from './OrphansCommand';
import { ParseCommand } from './ParseCommand';
import { PromoteSymbolCommand } from './PromoteSymbolCommand';
import { SymbolFixCommand } from './SymbolFixCommand';
import { SymbolQueryCommand } from './SymbolQueryCommand';
import { SymbolRenameCommand } from './SymbolRenameCommand';
import { TreeCommand } from './TreeCommand';
import { UndocumentedCommand } from './UndocumentedCommand';
import { UntestedCommand } from './UntestedCommand';
import { WhoUsesCommand } from './WhoUsesCommand';

const SUBCOMMANDS = {
  query: {
    command: SymbolQueryCommand,
    description: 'Query code symbols (Canonical @ttsc/graph) and [[Symbol]] checkpoints',
  },
  deps: { command: DepsCommand, description: 'Show symbol dependencies' },
  'who-uses': { command: WhoUsesCommand, description: 'Show who uses a symbol' },
  orphans: { command: OrphansCommand, description: 'Find orphaned symbols' },
  'find-method': { command: FindMethodCommand, description: 'Find methods by name' },
  tree: { command: TreeCommand, description: 'Show symbol hierarchy tree' },
  'core-api': { command: CoreApiCommand, description: 'Show exported core API symbols' },
  undocumented: { command: UndocumentedCommand, description: 'Find undocumented symbols' },
  untested: { command: UntestedCommand, description: 'Find symbols without test coverage' },
  parse: { command: ParseCommand, description: 'Parse and display enhanced TSDoc for a file' },
  promote: {
    command: PromoteSymbolCommand,
    description: 'Promote auxiliary heading to canonical H1',
  },
  fix: { command: SymbolFixCommand, description: 'Fix [[Symbol]] issues' },
  rename: { command: SymbolRenameCommand, description: 'Rename [[Symbol]] across docs and code' },
} as const;

/** Available symbol subcommand names */
type SubcommandName = keyof typeof SUBCOMMANDS;

/**
 * Unified command for all symbol operations
 *
 * @doc [[CliCommandSurfaceSpecification]]
 * @doc [[SymbolQueryCommand]]
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
      .map(([name, { description }]) => `  ${name.padEnd(14)} ${description}`)
      .join('\n');

    return `tsdoc-edge symbol <subcommand> [options]

Subcommands:
${subcommandList}

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
      // Only show unified help if no args or first arg is help flag
      if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        return this.displayHelp();
      }

      const subcommandName = args[0] as SubcommandName;
      const subcommandArgs = args.slice(1);

      if (!(subcommandName in SUBCOMMANDS)) {
        this.printError(`Unknown subcommand: ${subcommandName}`);
        console.log();
        console.log('Available subcommands:');
        for (const [name, { description }] of Object.entries(SUBCOMMANDS)) {
          console.log(`  ${this.colors.cyan}${name.padEnd(14)}${this.colors.reset} ${description}`);
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
