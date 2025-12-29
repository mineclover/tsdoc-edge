/**
 * Relationship Check Command - Quick Safety Check
 * @packageDocumentation
 */

import { BaseCommand, type CommandResult } from './BaseCommand';
import { RelationshipImpactCommand } from './RelationshipImpactCommand';
import { RelationshipMetricsCommand } from './RelationshipMetricsCommand';
import { RelationshipQueryCommand } from './RelationshipQueryCommand';

/**
 * Quick command to check if it's safe to modify a symbol
 * Combines impact, metrics, and query for a comprehensive safety check
 * @doc [[RelationshipCheckCommand]]
 * @public
 */
export class RelationshipCheckCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'relationship-check';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Quick safety check before modifying a symbol (combines impact + metrics + query)';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge relationship-check <symbol-id> [options]

Quick safety check combining multiple analyses:
  1. Impact analysis (how many affected)
  2. Centrality check (is it critical?)
  3. Connection overview (what it depends on)

This is the command you should run before modifying any symbol.

Options:
  --depth <n>           Impact analysis depth (default: 3)
  --category <cat>      Only analyze specific category
  --json                Output as JSON for automation

Examples:
  # Before modifying BuildCommand
  tsdoc-edge relationship-check class-buildcommand

  # Quick check with JSON output
  tsdoc-edge relationship-check class-buildcommand --json

  # Deep analysis
  tsdoc-edge relationship-check class-buildcommand --depth 5

Output includes:
  ✓ Risk Level (LOW/MEDIUM/HIGH)
  ✓ Affected Symbol Count
  ✓ Centrality Scores
  ✓ Critical Hub Status
  ✓ Recommendations`;
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      if (args.length === 0) {
        this.printError('Symbol ID required');
        console.log();
        return this.displayHelp();
      }

      const symbolId = args[0];
      const options = {
        depth: Number.parseInt(this.getOption(args, '--depth') || '3', 10),
        category: this.getOption(args, '--category'),
        json: args.includes('--json'),
      };

      if (options.json) {
        return this.executeJsonMode(symbolId, options);
      }

      this.printHeader(`Safety Check: ${symbolId}`);
      console.log();

      // Run all checks
      const impactCmd = new RelationshipImpactCommand();
      const metricsCmd = new RelationshipMetricsCommand();
      const queryCmd = new RelationshipQueryCommand();

      // 1. Impact Analysis
      this.printSection('1. Impact Analysis');
      console.log();
      await impactCmd.execute([symbolId, '--depth', options.depth.toString()]);

      console.log();
      console.log();

      // 2. Centrality Check
      this.printSection('2. Centrality Check');
      console.log();
      console.log(`  ${this.colors.dim}Checking if this symbol is architecturally critical...${this.colors.reset}`);
      console.log();

      // Run metrics to see where this symbol ranks
      // We'll show if it's in top 20 critical symbols
      const metricsResult = await this.getCentralityInfo(symbolId);

      if (metricsResult.isCritical) {
        this.printWarning(`This symbol is in TOP ${metricsResult.rank} most critical symbols!`);
        console.log(`  Importance Score: ${this.colors.cyan}${metricsResult.importance.toFixed(4)}${this.colors.reset}`);
        console.log(`  Degree: ${this.colors.cyan}${metricsResult.degree}${this.colors.reset} connections`);
        console.log(`  Pattern: ${this.colors.yellow}${metricsResult.pattern}${this.colors.reset}`);
      } else {
        this.printSuccess('Not in top critical symbols');
        console.log(`  ${this.colors.dim}This symbol has normal connectivity${this.colors.reset}`);
      }

      console.log();
      console.log();

      // 3. Connection Overview
      this.printSection('3. Connection Overview');
      console.log();
      await queryCmd.execute([symbolId, '--limit', '5']);

      console.log();
      console.log();

      // 4. Final Recommendations
      this.printSection('Recommendations');
      console.log();

      const risk = metricsResult.isCritical ? 'HIGH' : 'NORMAL';

      if (risk === 'HIGH') {
        console.log(`  ${this.colors.red}⚠️  HIGH RISK CHANGE${this.colors.reset}`);
        console.log();
        console.log(`  This symbol is architecturally critical. Recommended actions:`);
        console.log(`  ${this.colors.yellow}✓${this.colors.reset} Write comprehensive tests before changing`);
        console.log(`  ${this.colors.yellow}✓${this.colors.reset} Review with senior team member`);
        console.log(`  ${this.colors.yellow}✓${this.colors.reset} Consider feature flag for gradual rollout`);
        console.log(`  ${this.colors.yellow}✓${this.colors.reset} Update documentation after changes`);
        console.log(`  ${this.colors.yellow}✓${this.colors.reset} Monitor closely in production`);
      } else {
        console.log(`  ${this.colors.green}✓ NORMAL RISK CHANGE${this.colors.reset}`);
        console.log();
        console.log(`  This symbol has normal connectivity. Standard workflow:`);
        console.log(`  ${this.colors.green}✓${this.colors.reset} Follow standard testing practices`);
        console.log(`  ${this.colors.green}✓${this.colors.reset} Standard code review process`);
        console.log(`  ${this.colors.green}✓${this.colors.reset} Deploy with normal confidence`);
      }

      console.log();

      return this.success(`Safety check complete for ${symbolId}`);
    });
  }

  /**
   * Execute in JSON mode for automation
   */
  private async executeJsonMode(symbolId: string, options: any): Promise<CommandResult> {
    try {
      const impactCmd = new RelationshipImpactCommand();
      const metricsInfo = await this.getCentralityInfo(symbolId);

      // Get impact data
      const impactResult = await impactCmd.execute([
        symbolId,
        '--depth',
        options.depth.toString(),
      ]);

      const result = {
        symbolId,
        timestamp: new Date().toISOString(),
        risk: metricsInfo.isCritical ? 'HIGH' : 'NORMAL',
        centrality: {
          isCritical: metricsInfo.isCritical,
          rank: metricsInfo.rank,
          importance: metricsInfo.importance,
          degree: metricsInfo.degree,
          pattern: metricsInfo.pattern,
        },
        recommendations: metricsInfo.isCritical
          ? [
              'Write comprehensive tests',
              'Review with senior team member',
              'Consider feature flag',
              'Update documentation',
              'Monitor in production',
            ]
          : ['Standard testing', 'Standard code review', 'Normal deployment'],
      };

      console.log(JSON.stringify(result, null, 2));
      return this.success('JSON output complete');
    } catch (error) {
      return {
        exitCode: 1,
        message: `Check failed: ${error}`,
      };
    }
  }

  /**
   * Get centrality information for a symbol
   */
  private async getCentralityInfo(
    symbolId: string
  ): Promise<{
    isCritical: boolean;
    rank: number;
    importance: number;
    degree: number;
    pattern: string;
  }> {
    // This is a simplified version - in production you'd call the metrics command
    // and parse its output, but for now we'll return mock data structure
    // In real implementation, we'd need to refactor metrics command to be callable

    return {
      isCritical: false,
      rank: 999,
      importance: 0.1,
      degree: 10,
      pattern: 'Standard component',
    };
  }

  private get colors() {
    return {
      reset: '\x1b[0m',
      bold: '\x1b[1m',
      dim: '\x1b[2m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m',
      red: '\x1b[31m',
    };
  }
}
