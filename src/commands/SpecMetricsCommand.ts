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
    const { documentQuality: q, lifecycle: l, specGraph: g, module7Aspects: m } = metrics;
    const c = metrics.codeConnectivity;
    console.log();
    this.printHeader(`Specification Metrics (${metrics.scope})`);

    const gradeColor =
      metrics.grade === 'A' || metrics.grade === 'B'
        ? colors.green
        : metrics.grade === 'C'
          ? colors.yellow
          : colors.red;
    const filled = Math.round((metrics.healthScore / 100) * 25);
    console.log(
      `${colors.bold}Spec Health:${colors.reset} ${gradeColor}${'█'.repeat(filled)}${'░'.repeat(25 - filled)} ${metrics.healthScore}/100 (${metrics.grade})${colors.reset}`
    );
    console.log(
      `${colors.dim}  weights: completeness 30% · lifecycle 20% · module aspects 20% · code links 30% (conformance excluded)${colors.reset}`
    );
    console.log();

    console.log(`${colors.bold}1. Completeness (feature-spec template)${colors.reset}`);
    console.log(
      `  Documents ${q.totalDocuments} · complete ${q.completeCount} (${q.completenessRate}%) · avg score ${q.averageOverallScore} (design ${q.averageDesignScore}, impl ${q.averageImplementationScore})`
    );
    console.log(
      `  Scenarios ${q.totalScenarios} · examples ${q.totalExamples} · [[concept]] links ${q.totalConceptLinks} · code refs ${q.totalCodeLinks}`
    );
    console.log();

    console.log(`${colors.bold}2. Lifecycle (frontmatter status)${colors.reset}`);
    const dist = (Object.entries(l.distribution) as Array<[string, number]>)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => `${status} ${count}`)
      .join(' · ');
    console.log(`  ${dist || 'no documents'} · active/approved ${l.activeRatio}%`);
    console.log(`  Ready for next status: ${l.readyForPromotionCount}`);
    console.log();

    console.log(`${colors.bold}3. SpecGraph (.tsdoc/spec-graph.db)${colors.reset}`);
    if (g.hasSpecGraph) {
      console.log(
        `  ${g.nodeCount} nodes · ${g.edgeCount} edges · ${g.bindingCount} bindings · ${g.obligationCount} obligations`
      );
      console.log(
        `  ${colors.dim}Conformance not evaluated here; run 'tsdoc-edge convention check'.${colors.reset}`
      );
    } else {
      console.log(
        `  ${colors.yellow}No active revision${colors.reset} (run 'tsdoc-edge spec extract')`
      );
    }
    console.log();

    console.log(
      `${colors.bold}4. Module-spec aspects (share of ${m.analyzedFiles} source files with a matching JSDoc tag)${colors.reset}`
    );
    const a = m.aspectCoverage;
    console.log(
      `  purpose ${a.purpose}% · input ${a.input}% · output ${a.output}% · context ${a.context}% · logic ${a.logic}% · effect ${a.effect}% · scope ${a.scope}%  (mean ${m.averageAspectScore})`
    );
    console.log();

    console.log(`${colors.bold}5. Code ↔ spec links (.tsdoc.db)${colors.reset}`);
    console.log(
      `  Exported symbols with doc-reference: ${c.exportedSymbolsWithDocReference}/${c.exportedSymbols} (${c.specCoverageRate}%)`
    );
    console.log(
      `  Footnote anchors resolved: ${c.validCodeLinksCount}/${c.validCodeLinksCount + c.brokenCodeLinks.length} (${c.linkIntegrityRate}%)`
    );
    console.log();

    if (metrics.recommendations.length > 0) {
      console.log(`${colors.bold}Recommendations${colors.reset}`);
      const list = detail ? metrics.recommendations : metrics.recommendations.slice(0, 5);
      for (const rec of list) {
        const icon =
          rec.severity === 'error'
            ? `${colors.red}✗${colors.reset}`
            : rec.severity === 'warning'
              ? `${colors.yellow}!${colors.reset}`
              : `${colors.cyan}i${colors.reset}`;
        console.log(`  ${icon} [${rec.category}] ${rec.message}`);
      }
      if (!detail && metrics.recommendations.length > 5) {
        console.log(
          `  ${colors.dim}... ${metrics.recommendations.length - 5} more (--detail)${colors.reset}`
        );
      }
      console.log();
    }
  }
}
