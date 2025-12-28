/**
 * Todos Command - Show TODO items from future plans
 * @packageDocumentation
 */

import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';

/**
 * Command for showing TODO items from plans
 *
 * @public
 * @responsibility Display all TODO items from future plans
 * @contract Reads database, extracts todos, displays with stats
 * @doc [[TodosCommand]]
 * @doc [[CLI Commands#todos]]
 *
 * @problem Need to see all pending work items across codebase
 * @solves Shows all @plan tags formatted as TODO list
 * @context Part of project tracking and planning
 *
 * @functionality
 * - Database query: Extract all future plans
 * - TODO formatting: Show as task list with icons
 * - Status display: Visual indicators (✅🔄📌❌)
 * - Priority coloring: Red (high), Yellow (medium), Cyan (low)
 * - Effort estimates: Show estimated effort if provided
 * - Summary stats: Total TODO count
 *
 * @decision Use DatabaseManager for TODO data
 * @rationale TODOs are stored as future plans in database
 * @consequences Requires database to be built first
 *
 * @depends DatabaseManager
 * @depType internal
 * @depReason TODO data storage
 */
export class TodosCommand extends BaseCommand {
  private dbManager?: DatabaseManager;

  constructor(dbManager?: DatabaseManager) {
    super();
    this.dbManager = dbManager;
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'todos';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Show TODO items from future plans';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return 'tsdoc-edge todos';
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      this.printHeader('TSDoc Edge - TODO List');

      if (!this.dbManager) {
        const dbCheck = this.checkDatabaseExists();
        if (dbCheck) return dbCheck;
      }

      const dbPath = this.getDatabasePath();
      const jsonlPath = this.getJsonlPath();
      const dbManager = this.dbManager || new DatabaseManager(dbPath, jsonlPath);

      try {
        this.printSection('📊 Database Statistics');
        const stats = dbManager.getStatistics();
        console.log(`   Total Symbols: ${colors.green}${stats.totalSymbols}${colors.reset}`);
        console.log(`   Total Enhanced Docs: ${colors.green}${stats.totalEnhancedDocs}${colors.reset}`);
        console.log(`   DB Size: ${colors.green}${(stats.dbSize / 1024).toFixed(2)} KB${colors.reset}`);
        console.log();

        // Query future plans (TODO items)
        this.printSection('📋 Future Plans (TODO)');

        // Use Drizzle ORM to query enhanced docs with future plans
        const results = dbManager.getAllEnhancedDocsWithPlans();

        let totalTodos = 0;
        for (const row of results) {
          const plans = JSON.parse(row.futurePlans || '[]');
          if (plans.length > 0) {
            console.log();
            console.log(`${colors.bold}Symbol: ${row.symbolId}${colors.reset}`);
            console.log();

            for (const plan of plans) {
              totalTodos++;
              const statusIcon =
                plan.status === 'completed'
                  ? `${colors.green}✅`
                  : plan.status === 'in-progress'
                    ? `${colors.yellow}🔄`
                    : `${colors.blue}📌`;

              const priorityColor =
                plan.priority === 'high' ? colors.red : plan.priority === 'medium' ? colors.yellow : colors.cyan;

              console.log(`${statusIcon} ${colors.bold}[${plan.id}]${colors.reset} ${plan.title}`);
              console.log(`   Status: ${colors.bold}${plan.status}${colors.reset}`);
              console.log(`   Priority: ${priorityColor}${plan.priority}${colors.reset}`);
              if (plan.targetMilestone) {
                console.log(`   Milestone: ${colors.cyan}${plan.targetMilestone}${colors.reset}`);
              }
              if (plan.estimatedEffort) {
                console.log(`   Effort: ${colors.yellow}${plan.estimatedEffort}${colors.reset}`);
              }
              console.log(`   Description: ${plan.description}`);
              if (plan.completedAt) {
                console.log(`   Completed: ${colors.green}${plan.completedAt}${colors.reset}`);
              }
              console.log();
            }
          }
        }

        console.log();
        this.printSection('📈 Summary');
        console.log(`   Total TODO items: ${colors.green}${totalTodos}${colors.reset}`);
        console.log();

        return this.success();
      } finally {
        if (!this.dbManager) {
          dbManager.close();
        }
      }
    });
  }
}
