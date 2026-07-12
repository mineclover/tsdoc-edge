/**
 * Unified Spec Command
 * Routes to appropriate spec subcommand
 * @packageDocumentation
 */

import { BaseCommand, type CommandResult } from './BaseCommand';
import { SpecBumpCommand } from './SpecBumpCommand';
import { SpecDiffCommand } from './SpecDiffCommand';
import { SpecExtractCommand } from './SpecExtractCommand';
import { SpecHistoryCommand } from './SpecHistoryCommand';
import { SpecStatusCommand } from './SpecStatusCommand';
import { ValidateSpecCommand } from './ValidateSpecCommand';

const SUBCOMMANDS = {
  status: { command: SpecStatusCommand, description: 'Manage specification status' },
  history: { command: SpecHistoryCommand, description: 'Show specification version history' },
  diff: { command: SpecDiffCommand, description: 'Compare specification versions' },
  bump: { command: SpecBumpCommand, description: 'Bump specification version' },
  validate: { command: ValidateSpecCommand, description: 'Validate specifications' },
  extract: {
    command: SpecExtractCommand,
    description: 'Compile managed project specs into SpecGraph',
  },
} as const;

type SubcommandName = keyof typeof SUBCOMMANDS;

/**
 * Unified command for all spec operations
 * @public
 */
export class SpecCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'spec';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Unified spec operations (status|history|diff|bump|validate)';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    const subcommandList = Object.entries(SUBCOMMANDS)
      .map(([name, { description }]) => `  ${name.padEnd(10)} ${description}`)
      .join('\n');

    return `tsdoc-edge spec <subcommand> [options]

Subcommands:
${subcommandList}

Examples:
  tsdoc-edge spec status show managed/features/work-context.md
  tsdoc-edge spec history managed/features/work-context.md
  tsdoc-edge spec diff v1.0 v2.0 managed/features/work-context.md
  tsdoc-edge spec bump managed/features/work-context.md --minor
  tsdoc-edge spec validate managed

Use 'tsdoc-edge spec <subcommand> --help' for subcommand details.`;
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
