/**
 * Unified Validate Command
 * Routes to appropriate validation subcommand
 * @packageDocumentation
 */

import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { ValidateCommand } from './ValidateCommand';
import { ValidateDocsCommand } from './ValidateDocsCommand';
import { ValidateGeneratedDocsCommand } from './ValidateGeneratedDocsCommand';
import { ValidateSpecCommand } from './ValidateSpecCommand';
import { ValidateSymbolRefsCommand } from './ValidateSymbolRefsCommand';

const SUBCOMMANDS = {
  connectivity: { command: ValidateCommand, description: 'Validate symbol connectivity' },
  docs: { command: ValidateDocsCommand, description: 'Validate documentation files' },
  generated: { command: ValidateGeneratedDocsCommand, description: 'Validate generated docs' },
  spec: { command: ValidateSpecCommand, description: 'Validate specification files' },
  refs: { command: ValidateSymbolRefsCommand, description: 'Validate symbol references' },
} as const;

/** Available validation subcommand names */
type SubcommandName = keyof typeof SUBCOMMANDS;

/**
 * Unified command for all validation operations
 * @public
 */
export class ValidateUnifiedCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'val';
  }

  /**
   * getAlias method
   * @returns Returns string[]
   * @public
   */
  getAlias(): string[] {
    return ['v', 'validate'];
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Unified validation (connectivity|docs|generated|spec|refs)';
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

    return `tsdoc-edge val <subcommand> [options]

Subcommands:
${subcommandList}

Options:
  --human       Output in human-readable format (default: XML)

Examples:
  tsdoc-edge val connectivity
  tsdoc-edge val docs
  tsdoc-edge val generated
  tsdoc-edge val spec <spec-file>
  tsdoc-edge val refs

Use 'tsdoc-edge val <subcommand> --help' for subcommand details.`;
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
          console.log(`  ${colors.cyan}${name.padEnd(14)}${colors.reset} ${description}`);
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
