/**
 * Unified Ontology Command
 * Routes to appropriate ontology subcommand
 * @packageDocumentation
 */

import { BaseCommand, type CommandResult } from './BaseCommand';
import { OntologyStatsCommand } from './OntologyStatsCommand';
import { OntologyListCommand } from './OntologyListCommand';

const SUBCOMMANDS = {
  stats: { command: OntologyStatsCommand, description: 'Show ontology statistics' },
  list: { command: OntologyListCommand, description: 'List ontology elements' },
} as const;

type SubcommandName = keyof typeof SUBCOMMANDS;

/**
 * Unified command for all ontology operations
 * @public
 */
export class OntologyCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'ontology';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Unified ontology operations (stats|list)';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    const subcommandList = Object.entries(SUBCOMMANDS)
      .map(([name, { description }]) => `  ${name.padEnd(8)} ${description}`)
      .join('\n');

    return `tsdoc-edge ontology <subcommand> [options]

Subcommands:
${subcommandList}

Examples:
  tsdoc-edge ontology stats
  tsdoc-edge ontology list --nodes class
  tsdoc-edge ontology list --rels test-coverage
  tsdoc-edge ontology list --category structural

Use 'tsdoc-edge ontology <subcommand> --help' for subcommand details.`;
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
          console.log(`  ${this.colors.cyan}${name.padEnd(8)}${this.colors.reset} ${description}`);
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
