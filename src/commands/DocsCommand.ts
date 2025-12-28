/**
 * Unified Docs Command
 * Routes to appropriate docs subcommand
 * @packageDocumentation
 */

import { BaseCommand, type CommandResult } from './BaseCommand';
import { IndexDocsCommand } from './IndexDocsCommand';
import { UpdateBacklinksCommand } from './UpdateBacklinksCommand';
import { CheckLinksCommand } from './CheckLinksCommand';
import { UpdateSymbolRefsCommand } from './UpdateSymbolRefsCommand';
import { GenerateDocsCommand } from './GenerateDocsCommand';
import { ValidateDocsCommand } from './ValidateDocsCommand';
import { FindUnusedDocsCommand } from './FindUnusedDocsCommand';

const SUBCOMMANDS = {
  index: { command: IndexDocsCommand, description: 'Index document symbols from markdown' },
  backlinks: { command: UpdateBacklinksCommand, description: 'Update backlinks in documents' },
  'check-links': { command: CheckLinksCommand, description: 'Check for broken links' },
  'update-refs': { command: UpdateSymbolRefsCommand, description: 'Update code symbol references' },
  generate: { command: GenerateDocsCommand, description: 'Generate markdown documentation' },
  validate: { command: ValidateDocsCommand, description: 'Validate documentation' },
  'find-unused': { command: FindUnusedDocsCommand, description: 'Find unused documents' },
} as const;

type SubcommandName = keyof typeof SUBCOMMANDS;

/**
 * Unified command for all docs operations
 * @public
 */
export class DocsCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'docs';
  }

  /**
   * getAlias method
   * @returns Returns string[]
   * @public
   */
  getAlias(): string[] {
    return ['d'];
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Unified docs operations (index|backlinks|check-links|generate|...)';
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

    return `tsdoc-edge docs <subcommand> [options]

Subcommands:
${subcommandList}

Examples:
  tsdoc-edge docs index managed
  tsdoc-edge docs backlinks managed
  tsdoc-edge docs check-links managed
  tsdoc-edge docs generate src
  tsdoc-edge docs validate managed

Use 'tsdoc-edge docs <subcommand> --help' for subcommand details.`;
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
