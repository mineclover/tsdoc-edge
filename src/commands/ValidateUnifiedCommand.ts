/**
 * Unified Validate Command
 * Routes to appropriate validation subcommand
 * @packageDocumentation
 */

import { BaseCommand, type CommandResult } from './BaseCommand';
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

type SubcommandName = keyof typeof SUBCOMMANDS;

/**
 * Unified command for all validation operations
 * @public
 */
export class ValidateUnifiedCommand extends BaseCommand {
  getName(): string {
    return 'val';
  }

  getDescription(): string {
    return 'Unified validation (connectivity|docs|generated|spec|refs)';
  }

  protected getUsage(): string {
    const subcommandList = Object.entries(SUBCOMMANDS)
      .map(([name, { description }]) => `  ${name.padEnd(14)} ${description}`)
      .join('\n');

    return `tsdoc-edge val <subcommand> [options]

Subcommands:
${subcommandList}

Examples:
  tsdoc-edge val connectivity
  tsdoc-edge val docs
  tsdoc-edge val generated
  tsdoc-edge val spec <spec-file>
  tsdoc-edge val refs

Use 'tsdoc-edge val <subcommand> --help' for subcommand details.`;
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
