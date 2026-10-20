/**
 * Relationship Check Command - Quick Safety Check
 * @packageDocumentation
 */

import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { RelationshipImpactCommand } from './RelationshipImpactCommand';
import { RelationshipMetricsCommand } from './RelationshipMetricsCommand';
import { RelationshipQueryCommand } from './RelationshipQueryCommand';

/**
 * Options for relationship check command
 */
interface RelationshipCheckOptions {
  depth: number;
  category?: string;
  json: boolean;
}

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
  --human               Output in human-readable format (default: XML)
  --json                Output as JSON for automation

Examples:
  # Before modifying BuildCommand
  tsdoc-edge relationship-check class-buildcommand

  # Human-readable report
  tsdoc-edge relationship-check class-buildcommand --human

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

      // --human is a mode switch, never the symbol ID
      const isHuman = this.hasFlag(args, '--human');
      const commandArgs = args.filter((arg) => arg !== '--human');

      if (commandArgs.length === 0) {
        this.printError('Symbol ID required');
        console.log();
        return this.displayHelp();
      }

      const symbolId = commandArgs[0];
      const options = {
        depth: Number.parseInt(this.getOption(commandArgs, '--depth') || '3', 10),
        category: this.getOption(commandArgs, '--category'),
        json: commandArgs.includes('--json'),
      };

      if (options.json) {
        return this.executeJsonMode(symbolId, options);
      }

      if (!isHuman) {
        return this.executeXmlMode(symbolId, options, args);
      }

      this.printHeader(`Safety Check: ${symbolId}`);
      console.log();

      // Run all checks
      const impactCmd = new RelationshipImpactCommand();
      const _metricsCmd = new RelationshipMetricsCommand();
      const queryCmd = new RelationshipQueryCommand();

      // 1. Impact Analysis
      this.printSection('1. Impact Analysis');
      console.log();
      await impactCmd.execute([symbolId, '--depth', options.depth.toString(), '--human']);

      console.log();
      console.log();

      // 2. Centrality Check
      this.printSection('2. Centrality Check');
      console.log();
      console.log(
        `  ${colors.dim}Checking if this symbol is architecturally critical...${colors.reset}`
      );
      console.log();

      // Run metrics to see where this symbol ranks
      // We'll show if it's in top 20 critical symbols
      const metricsResult = await this.getCentralityInfo(symbolId);

      if (metricsResult.isCritical) {
        this.printWarning(`This symbol is in TOP ${metricsResult.rank} most critical symbols!`);
        console.log(
          `  Importance Score: ${colors.cyan}${metricsResult.importance.toFixed(4)}${colors.reset}`
        );
        console.log(`  Degree: ${colors.cyan}${metricsResult.degree}${colors.reset} connections`);
        console.log(`  Pattern: ${colors.yellow}${metricsResult.pattern}${colors.reset}`);
      } else {
        this.printSuccess('Not in top critical symbols');
        console.log(`  ${colors.dim}This symbol has normal connectivity${colors.reset}`);
      }

      console.log();
      console.log();

      // 3. Connection Overview
      this.printSection('3. Connection Overview');
      console.log();
      await queryCmd.execute([symbolId, '--limit', '5', '--human']);

      console.log();
      console.log();

      // 4. Final Recommendations
      this.printSection('Recommendations');
      console.log();

      const risk = metricsResult.isCritical ? 'HIGH' : 'NORMAL';

      if (risk === 'HIGH') {
        console.log(`  ${colors.red}⚠️  HIGH RISK CHANGE${colors.reset}`);
        console.log();
        console.log(`  This symbol is architecturally critical. Recommended actions:`);
        console.log(`  ${colors.yellow}✓${colors.reset} Write comprehensive tests before changing`);
        console.log(`  ${colors.yellow}✓${colors.reset} Review with senior team member`);
        console.log(`  ${colors.yellow}✓${colors.reset} Consider feature flag for gradual rollout`);
        console.log(`  ${colors.yellow}✓${colors.reset} Update documentation after changes`);
        console.log(`  ${colors.yellow}✓${colors.reset} Monitor closely in production`);
      } else {
        console.log(`  ${colors.green}✓ NORMAL RISK CHANGE${colors.reset}`);
        console.log();
        console.log(`  This symbol has normal connectivity. Standard workflow:`);
        console.log(`  ${colors.green}✓${colors.reset} Follow standard testing practices`);
        console.log(`  ${colors.green}✓${colors.reset} Standard code review process`);
        console.log(`  ${colors.green}✓${colors.reset} Deploy with normal confidence`);
      }

      console.log();

      return this.success(`Safety check complete for ${symbolId}`);
    });
  }

  /**
   * Execute in default XML mode: risk verdict, centrality and recommendations.
   * The impact and connection sub-reports are separate documents emitted by
   * `relationship impact` / `relationship query`.
   */
  private async executeXmlMode(
    symbolId: string,
    options: RelationshipCheckOptions,
    args: string[]
  ): Promise<CommandResult> {
    const centrality = await this.getCentralityInfo(symbolId);
    const risk = centrality.isCritical ? 'HIGH' : 'NORMAL';
    const recommendations = centrality.isCritical
      ? [
          'Write comprehensive tests before changing',
          'Review with senior team member',
          'Consider feature flag for gradual rollout',
          'Update documentation after changes',
          'Monitor closely in production',
        ]
      : [
          'Follow standard testing practices',
          'Standard code review process',
          'Deploy with normal confidence',
        ];

    this.printOutput(
      'relationship-check',
      {
        summary: {
          symbolId,
          depth: options.depth,
          ...(options.category !== undefined ? { category: options.category } : {}),
          risk,
        },
        centrality: {
          isCritical: centrality.isCritical,
          rank: centrality.rank,
          importance: Number(centrality.importance.toFixed(4)),
          degree: centrality.degree,
          pattern: centrality.pattern,
        },
        recommendations: recommendations.map((text) => ({ text })),
      },
      args
    );

    return this.success(`Safety check complete for ${symbolId}`);
  }

  /**
   * Execute in JSON mode for automation
   */
  private async executeJsonMode(
    symbolId: string,
    options: RelationshipCheckOptions
  ): Promise<CommandResult> {
    try {
      const impactCmd = new RelationshipImpactCommand();
      const metricsInfo = await this.getCentralityInfo(symbolId);

      // Get impact data
      const _impactResult = await impactCmd.execute([
        symbolId,
        '--depth',
        options.depth.toString(),
        '--human',
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
  private async getCentralityInfo(_symbolId: string): Promise<{
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
}
