/**
 * Unified Spec Command
 * Routes to appropriate spec subcommand
 * @packageDocumentation
 */

import { BaseCommand, type CommandResult } from './BaseCommand';
import { CheckDuplicatesCommand } from './CheckDuplicatesCommand';
import { SpecBumpCommand } from './SpecBumpCommand';
import { SpecDiffCommand } from './SpecDiffCommand';
import { SpecExtractCommand } from './SpecExtractCommand';
import { SpecGraphCommand } from './SpecGraphCommand';
import { SpecHistoryCommand } from './SpecHistoryCommand';
import { SpecMetricsCommand } from './SpecMetricsCommand';
import { SpecStatusCommand } from './SpecStatusCommand';
import { ValidateSpecCommand } from './ValidateSpecCommand';

const SUBCOMMANDS = {
  extract: {
    command: SpecExtractCommand,
    description: 'Compile managed project specs into SpecGraph',
  },
  graph: {
    command: SpecGraphCommand,
    description: 'Inspect saved SpecGraph revisions read-only',
  },
  metrics: { command: SpecMetricsCommand, description: 'Display specification metrics dashboard' },
  validate: { command: ValidateSpecCommand, description: 'Validate specifications' },
  duplicates: {
    command: CheckDuplicatesCommand,
    description: 'Check for duplicate content across specifications',
  },
  status: { command: SpecStatusCommand, description: 'Manage specification status' },
  history: { command: SpecHistoryCommand, description: 'Show specification version history' },
  diff: { command: SpecDiffCommand, description: 'Compare specification versions' },
  bump: { command: SpecBumpCommand, description: 'Bump specification version' },
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
   * getAlias method
   * @returns Short alias for specification operations
   * @public
   */
  getAlias(): string[] {
    return ['sp'];
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Unified spec operations (extract|graph|metrics|validate|duplicates|status|history|diff|bump)';
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

    return `tsdoc-edge spec <subcommand> [options]

Subcommands:
${subcommandList}

Examples:
  tsdoc-edge spec status show managed/features/work-context.md
  tsdoc-edge spec history managed/features/work-context.md
  tsdoc-edge spec diff v1.0 v2.0 managed/features/work-context.md
  tsdoc-edge spec bump managed/features/work-context.md --minor
  tsdoc-edge spec validate managed
  tsdoc-edge spec metrics

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
          console.log(`  ${this.colors.cyan}${name.padEnd(12)}${this.colors.reset} ${description}`);
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
