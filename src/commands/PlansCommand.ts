/**
 * Plans Command - Show future plans from documentation
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';
import type { FuturePlan } from '../types/tags';

/**
 * Command for showing future plans
 *
 * @public
 * @responsibility Display future plans from enhanced documentation
 * @contract Reads database, extracts plans, displays with filtering
 * @doc [[PlansCommand]]
 * @doc [[CLI Commands#plans]]
 *
 * @problem Need to track and visualize future plans across codebase
 * @solves Shows all @plan tags from enhanced docs with status and priority
 * @context Part of project planning and tracking
 *
 * @functionality
 * - Database query: Extract future plans from enhanced_docs table
 * - Status filtering: Optional --status= filter
 * - Priority sorting: High > Medium > Low
 * - Detailed display: ID, title, status, priority, milestone, implementer
 * - Summary statistics: Total plan count
 *
 * @decision Use DatabaseManager for plan data
 * @rationale Plans stored in database with symbol associations
 * @consequences Requires database to be built first
 *
 * @depends DatabaseManager
 * @depType internal
 * @depReason Plan data storage
 */
export class PlansCommand extends BaseCommand {
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
    return 'plans';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Show future plans from documentation';
  }

  protected getUsage(): string {
    return `tsdoc-edge plans [--status=<status>]

  Options:
    --status=<status>  Filter by status (planned, in-progress, completed, cancelled)`;
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

      const status = args[0]; // Optional: --status=planned

      this.printHeader('Future Plans');

      const dbPath = path.join(process.cwd(), '.tsdoc', 'symbols.db');

      if (!fs.existsSync(dbPath)) {
        this.printError('Database not found. Run "tsdoc-edge build src" first.');
        console.log();
        return this.failure('Database not found');
      }

      const jsonlPath = path.join(process.cwd(), '.tsdoc', 'data');
      const dbManager = this.dbManager || new DatabaseManager(dbPath, jsonlPath);

      try {
        const query = `
          SELECT
            future_plans as plans,
            symbol_id as symbolId
          FROM enhanced_docs
        `;

        const stmt = dbManager.db.prepare(query);
        const results = stmt.all() as Array<{ plans: string; symbolId: string }>;

        const allPlans: Array<{ plan: FuturePlan; symbolId: string }> = [];

        for (const row of results) {
          const plans = JSON.parse(row.plans || '[]');
          for (const plan of plans) {
            allPlans.push({ plan, symbolId: row.symbolId });
          }
        }

        // Filter by status if provided
        let filteredPlans = allPlans;
        if (status?.startsWith('--status=')) {
          const statusValue = status.split('=')[1];
          filteredPlans = allPlans.filter(({ plan }) => plan.status === statusValue);
        }

        // Sort by priority (high > medium > low)
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        filteredPlans.sort((a, b) => {
          const aPriority = priorityOrder[a.plan.priority as keyof typeof priorityOrder] ?? 2;
          const bPriority = priorityOrder[b.plan.priority as keyof typeof priorityOrder] ?? 2;
          return aPriority - bPriority;
        });

        if (filteredPlans.length === 0) {
          this.printSuccess('No future plans found');
          console.log();
          return this.success();
        }

        console.log(`Total plans: ${colors.bold}${filteredPlans.length}${colors.reset}`);
        console.log();

        for (const { plan, symbolId } of filteredPlans) {
          const statusIcon =
            plan.status === 'completed'
              ? `${colors.green}✅`
              : plan.status === 'in-progress'
                ? `${colors.yellow}🔄`
                : plan.status === 'cancelled'
                  ? `${colors.red}❌`
                  : `${colors.blue}📌`;

          const priorityColor =
            plan.priority === 'high' ? colors.red : plan.priority === 'medium' ? colors.yellow : colors.cyan;

          console.log(`${statusIcon} ${colors.bold}${plan.id}${colors.reset} - ${plan.title}`);
          console.log(`   Symbol: ${symbolId}`);
          console.log(`   Status: ${colors.bold}${plan.status}${colors.reset}`);

          if (plan.priority) {
            console.log(`   Priority: ${priorityColor}${plan.priority}${colors.reset}`);
          }

          if (plan.targetSymbol) {
            console.log(`   Target: ${plan.targetSymbol}${plan.targetMethod ? `#${plan.targetMethod}` : ''}`);
          }

          if (plan.implementedBy) {
            console.log(`   Implemented by: ${colors.green}${plan.implementedBy}${colors.reset}`);
          }

          if (plan.targetMilestone) {
            console.log(`   Milestone: ${colors.cyan}${plan.targetMilestone}${colors.reset}`);
          }

          console.log(`   ${plan.description.substring(0, 100)}${plan.description.length > 100 ? '...' : ''}`);
          console.log();
        }

        return this.success();
      } finally {
        if (!this.dbManager) {
          dbManager.close();
        }
      }
    });
  }
}
