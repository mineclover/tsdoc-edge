/**
 * Spec Metrics Command - Comprehensive specification metrics and cross-system dashboard
 * @packageDocumentation
 */

import { SpecMetricsAggregator, type UnifiedSpecMetrics } from '../spec/SpecMetricsAggregator';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * Command for displaying specification metrics and cross-system connectivity
 *
 * @doc [[SpecMetricsCommand]]
 * @public
 * @responsibility Display multi-dimensional specification metrics, conformance, and code connectivity
 * @contract Aggregate spec quality, lifecycle, graph, 7-aspects, and report health score
 */
export class SpecMetricsCommand extends BaseCommand {
  private aggregator: SpecMetricsAggregator;

  constructor(aggregator?: SpecMetricsAggregator) {
    super();
    this.aggregator = aggregator || new SpecMetricsAggregator();
  }

  /**
   * Get command name
   * @returns Command name
   * @public
   */
  getName(): string {
    return 'spec-metrics';
  }

  /**
   * Get command aliases
   * @returns Command aliases
   * @public
   */
  getAlias(): string[] {
    return ['sp-metrics', 'sp-m'];
  }

  /**
   * Get command description
   * @returns Command description
   * @public
   */
  getDescription(): string {
    return 'Display specification metrics, conformance, and connectivity dashboard';
  }

  /**
   * Get command usage
   * @returns Usage string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge spec-metrics [options]
  tsdoc-edge spec metrics [options]

Options:
  --dir <path>       Managed specifications directory (default: managed)
  --db <path>        Symbol SQLite database path (default: .tsdoc.db)
  --spec-db <path>   SpecGraph SQLite database path (default: .tsdoc/spec-graph.db)
  --json             Output results as JSON
  --detail           Show detailed breakdown of recommendations`;
  }

  /**
   * Execute command
   * @param args - Command line arguments
   * @returns Command result
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const json = args.includes('--json');
      const detail = args.includes('--detail');

      let dir: string | undefined;
      const dirIdx = args.indexOf('--dir');
      if (dirIdx !== -1 && args[dirIdx + 1]) {
        dir = args[dirIdx + 1];
      }

      let dbPath: string | undefined;
      const dbIdx = args.indexOf('--db');
      if (dbIdx !== -1 && args[dbIdx + 1]) {
        dbPath = args[dbIdx + 1];
      }

      let specDbPath: string | undefined;
      const specDbIdx = args.indexOf('--spec-db');
      if (specDbIdx !== -1 && args[specDbIdx + 1]) {
        specDbPath = args[specDbIdx + 1];
      }

      const metrics = this.aggregator.aggregate({
        managedDir: dir,
        dbPath,
        specDbPath,
      });

      if (json) {
        console.log(JSON.stringify(metrics, null, 2));
      } else {
        this.printDashboard(metrics, detail);
      }

      return {
        exitCode: 0,
        message: `Spec Health Score: ${metrics.healthScore}/100 (Grade: ${metrics.grade})`,
      };
    });
  }

  /**
   * Print terminal dashboard
   */
  private printDashboard(metrics: UnifiedSpecMetrics, detail: boolean): void {
    console.log();
    this.printHeader('Specification Metrics & Interconnection Dashboard');

    // Health Score Banner
    const gradeColor =
      metrics.grade === 'A'
        ? colors.green
        : metrics.grade === 'B'
          ? colors.cyan
          : metrics.grade === 'C'
            ? colors.yellow
            : colors.red;

    const barLength = 25;
    const filled = Math.round((metrics.healthScore / 100) * barLength);
    const empty = barLength - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);

    console.log(
      `${colors.bold}Spec Health Score:${colors.reset} ${gradeColor}${bar} ${metrics.healthScore}/100${colors.reset} (Grade: ${gradeColor}${metrics.grade}${colors.reset})`
    );
    console.log();

    // 1. Document Quality & Completeness
    console.log(`${colors.bold}1. Document Quality & Completeness:${colors.reset}`);
    console.log(`  - Total Specifications:     ${metrics.documentQuality.totalDocuments} files`);
    console.log(
      `  - Completeness Rate:        ${metrics.documentQuality.completenessRate}% (${metrics.documentQuality.completeCount} complete, ${metrics.documentQuality.incompleteCount} incomplete)`
    );
    console.log(`  - Average Design Score:     ${metrics.documentQuality.averageDesignScore}/100`);
    console.log(
      `  - Average Implementation:   ${metrics.documentQuality.averageImplementationScore}/100`
    );
    console.log(`  - Usage Scenarios:          ${metrics.documentQuality.totalScenarios} recorded`);
    console.log(
      `  - Code References:          ${metrics.documentQuality.totalCodeLinks} anchors (${metrics.documentQuality.totalConceptLinks} concept links)`
    );
    console.log();

    // 2. Lifecycle Governance
    console.log(`${colors.bold}2. Lifecycle Governance:${colors.reset}`);
    const d = metrics.lifecycle.distribution;
    console.log(
      `  - Distribution:             Active: ${d.active || 0} (${metrics.lifecycle.distributionPercentages.active}%) | Draft: ${d.draft || 0} (${metrics.lifecycle.distributionPercentages.draft}%) | Review: ${d.review || 0}`
    );
    console.log(`  - Active/Approved Ratio:    ${metrics.lifecycle.activeRatio}%`);
    console.log(
      `  - Promotion Ready:          ${metrics.lifecycle.readyForPromotionCount} documents ready for status advancement`
    );
    console.log();

    // 3. SpecGraph Conformance
    console.log(`${colors.bold}3. SpecGraph Conformance:${colors.reset}`);
    if (metrics.graphConformance.hasSpecGraph) {
      console.log(
        `  - Revision:                 ${metrics.graphConformance.revisionId?.slice(0, 24)}...`
      );
      console.log(
        `  - Graph Elements:           ${metrics.graphConformance.nodeCount} nodes, ${metrics.graphConformance.edgeCount} edges, ${metrics.graphConformance.bindingCount} bindings`
      );
      console.log(
        `  - Conformance Rate:         ${colors.green}${metrics.graphConformance.conformanceRate}%${colors.reset} (${metrics.graphConformance.outcomes.satisfied} satisfied, ${metrics.graphConformance.outcomes.violated} violated)`
      );
    } else {
      console.log(
        `  - Status:                   ${colors.yellow}No compiled SpecGraph projection found${colors.reset} (run 'tsdoc-edge spec extract')`
      );
    }
    console.log();

    // 4. Module Spec 7-Aspects
    console.log(`${colors.bold}4. Module Specification 7-Aspect Coverage:${colors.reset}`);
    const a = metrics.module7Aspects.aspectCoverage;
    console.log(
      `  - Purpose: ${a.purpose}% | Input: ${a.input}% | Output: ${a.output}% | Context: ${a.context}%`
    );
    console.log(`  - Logic:   ${a.logic}% | Effect: ${a.effect}% | Scope: ${a.scope}%`);
    console.log(
      `  - 7-Aspect Mean Score:      ${metrics.module7Aspects.averageAspectScore}/100 across ${metrics.module7Aspects.analyzedSymbols} source files`
    );
    console.log();

    // 5. Code-to-Spec Connectivity
    console.log(`${colors.bold}5. Code-to-Spec Bidirectional Connectivity:${colors.reset}`);
    console.log(
      `  - Total Symbols in Graph:   ${metrics.codeConnectivity.totalSymbols} (${metrics.codeConnectivity.exportedSymbols} exported)`
    );
    console.log(
      `  - Symbols with Spec Links:  ${metrics.codeConnectivity.symbolsWithSpecReference} (${metrics.codeConnectivity.specCoverageRate}% coverage)`
    );
    console.log(
      `  - Link Integrity:           ${metrics.codeConnectivity.linkIntegrityRate}% (${metrics.codeConnectivity.validCodeLinksCount} valid, ${metrics.codeConnectivity.brokenCodeLinksCount} broken)`
    );
    console.log();

    // Recommendations
    if (metrics.recommendations.length > 0) {
      console.log(`${colors.bold}Actionable Recommendations:${colors.reset}`);
      const list = detail ? metrics.recommendations : metrics.recommendations.slice(0, 3);
      for (const rec of list) {
        const icon =
          rec.severity === 'error'
            ? `${colors.red}✗${colors.reset}`
            : rec.severity === 'warning'
              ? `${colors.yellow}⚠${colors.reset}`
              : `${colors.cyan}ℹ${colors.reset}`;

        console.log(`  ${icon} [${rec.category.toUpperCase()}] ${rec.message}`);
      }
      if (!detail && metrics.recommendations.length > 3) {
        console.log(
          `  ${colors.dim}... and ${metrics.recommendations.length - 3} more recommendations (run with --detail)${colors.reset}`
        );
      }
      console.log();
    }
  }
}
