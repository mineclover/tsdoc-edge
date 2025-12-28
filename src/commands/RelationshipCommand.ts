/**
 * Unified Relationship Command
 * Routes to appropriate subcommand: query, impact, path, clusters, metrics, etc.
 * @packageDocumentation
 */

import { BaseCommand, type CommandResult } from './BaseCommand';
import { RelationshipQueryCommand } from './RelationshipQueryCommand';
import { RelationshipImpactCommand } from './RelationshipImpactCommand';
import { RelationshipPathCommand } from './RelationshipPathCommand';
import { RelationshipClustersCommand } from './RelationshipClustersCommand';
import { RelationshipMetricsCommand } from './RelationshipMetricsCommand';
import { RelationshipValidateCommand } from './RelationshipValidateCommand';
import { RelationshipExportCommand } from './RelationshipExportCommand';
import { RelationshipStatsCommand } from './RelationshipStatsCommand';
import { RelationshipCheckCommand } from './RelationshipCheckCommand';
import { RelationshipVisualizeCommand } from './RelationshipVisualizeCommand';
import { RelationshipHelpCommand } from './RelationshipHelpCommand';
import { AnalyzeRelationshipsCommand } from './AnalyzeRelationshipsCommand';
import { TypeChainCommand, DetectCircularTypesCommand, FindRootTypesCommand } from './TypeChainCommand';

const SUBCOMMANDS = {
  query: { command: RelationshipQueryCommand, description: 'Query relationships for a symbol' },
  impact: { command: RelationshipImpactCommand, description: 'Analyze change impact' },
  path: { command: RelationshipPathCommand, description: 'Find paths between symbols' },
  clusters: { command: RelationshipClustersCommand, description: 'Discover architectural modules' },
  metrics: { command: RelationshipMetricsCommand, description: 'Calculate importance metrics' },
  validate: { command: RelationshipValidateCommand, description: 'Check data integrity' },
  export: { command: RelationshipExportCommand, description: 'Export to external formats' },
  stats: { command: RelationshipStatsCommand, description: 'Show statistics' },
  check: { command: RelationshipCheckCommand, description: 'Check relationships' },
  visualize: { command: RelationshipVisualizeCommand, description: 'Visualize relationships' },
  analyze: { command: AnalyzeRelationshipsCommand, description: 'Run relationship analyzers' },
  'type-chain': { command: TypeChainCommand, description: 'Show type dependency chain' },
  cycles: { command: DetectCircularTypesCommand, description: 'Detect circular dependencies' },
  roots: { command: FindRootTypesCommand, description: 'Find root types (no incoming deps)' },
  help: { command: RelationshipHelpCommand, description: 'Interactive guide' },
} as const;

/** Available relationship subcommand names */
type SubcommandName = keyof typeof SUBCOMMANDS;

/**
 * Unified command for all relationship operations
 * @public
 */
export class RelationshipCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'relationship';
  }

  /**
   * getAlias method
   * @returns Returns string[]
   * @public
   */
  getAlias(): string[] {
    return ['rel', 'r'];
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Unified relationship analysis (query|impact|path|clusters|...)';
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

    return `tsdoc-edge relationship <subcommand> [options]

Subcommands:
${subcommandList}

Examples:
  tsdoc-edge relationship query <symbol-id>
  tsdoc-edge relationship impact <symbol-id> --depth 5
  tsdoc-edge relationship path <from> <to>
  tsdoc-edge relationship clusters --min-size 5
  tsdoc-edge relationship analyze --type=calls
  tsdoc-edge relationship type-chain TypeA TypeB
  tsdoc-edge relationship cycles
  tsdoc-edge relationship roots

Use 'tsdoc-edge relationship <subcommand> --help' for subcommand details.`;
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

      // Check if valid subcommand
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

      // Create and execute subcommand
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
