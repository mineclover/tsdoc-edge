/**
 * Relationship Metrics Command
 * @packageDocumentation
 */

import { BaseCommand, type CommandResult } from './BaseCommand';
import { DatabaseManager, type UnifiedRelationshipRow } from '../storage/DatabaseManager';

/** Graph metrics for a symbol */
interface SymbolMetrics {
  symbolId: string;
  symbolName: string;
  degree: number;
  inDegree: number;
  outDegree: number;
  betweenness: number;
  pageRank: number;
  importance: number;
}

/**
 * Command for calculating graph metrics to identify key symbols
 * @doc [[RelationshipMetricsCommand]]
 * @public
 */
export class RelationshipMetricsCommand extends BaseCommand {
  getName(): string {
    return 'relationship-metrics';
  }

  getDescription(): string {
    return 'Calculate graph metrics to identify architecturally important symbols';
  }

  protected getUsage(): string {
    return `tsdoc-edge relationship-metrics [options]

Calculates centrality and importance metrics for symbols in the relationship graph.
Helps identify architectural hubs, bottlenecks, and critical integration points.

Options:
  --top <n>             Show top N symbols (default: 20)
  --category <cat>      Only consider relationships in this category
  --metric <metric>     Sort by: degree, betweenness, pagerank, importance (default: importance)
  --detailed            Show detailed metrics for each symbol

Metrics:
  Degree       - Total connections (in + out)
  In-Degree    - Number of symbols depending on this
  Out-Degree   - Number of symbols this depends on
  Betweenness  - How often symbol appears on shortest paths (bridge/hub indicator)
  PageRank     - Importance based on incoming connections quality
  Importance   - Composite score combining all metrics

Interpretation:
  High Degree + High Betweenness = Critical integration hub
  High In-Degree + Low Out-Degree = Core dependency (should be stable)
  High Out-Degree + Low In-Degree = Orchestrator (coordinates many components)
  High PageRank = Important symbol referenced by other important symbols

Examples:
  # Find most important symbols
  tsdoc-edge relationship-metrics

  # Find structural hubs
  tsdoc-edge relationship-metrics --category structural --metric betweenness

  # Find top orchestrators
  tsdoc-edge relationship-metrics --metric degree --top 10

  # Detailed analysis
  tsdoc-edge relationship-metrics --detailed --top 15`;
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const options = {
        top: Number.parseInt(this.getOption(args, '--top') || '20', 10),
        category: this.getOption(args, '--category'),
        metric: (this.getOption(args, '--metric') || 'importance') as keyof SymbolMetrics,
        detailed: args.includes('--detailed'),
      };

      // Validate metric
      const validMetrics = ['degree', 'betweenness', 'pagerank', 'importance'];
      if (!validMetrics.includes(options.metric)) {
        this.printError(`Invalid metric: ${options.metric}`);
        this.printInfo(`Valid metrics: ${validMetrics.join(', ')}`);
        return { success: false, message: 'Invalid metric', exitCode: 1 };
      }

      this.printHeader('Symbol Importance Analysis');

      const dbPath = this.getDatabasePath();
      const dbManager = new DatabaseManager(dbPath);

      console.log();
      this.printInfo('Building relationship graph...');

      // Build adjacency lists
      const { outgoing, incoming, symbolNames } = this.buildGraph(dbManager, options.category);

      this.printInfo(`Analyzing ${symbolNames.size} symbols...`);
      console.log();

      // Calculate all metrics
      this.printInfo('Calculating centrality metrics...');
      const metrics = this.calculateMetrics(outgoing, incoming, symbolNames);

      // Sort by selected metric
      metrics.sort((a, b) => {
        const aVal = a[options.metric];
        const bVal = b[options.metric];
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return bVal - aVal;
        }
        return 0;
      });

      const topSymbols = metrics.slice(0, options.top);

      console.log();

      // Display results
      this.printSection(`Top ${topSymbols.length} Symbols by ${this.capitalize(options.metric)}`);
      console.log();

      for (let i = 0; i < topSymbols.length; i++) {
        const symbol = topSymbols[i];
        const rank = i + 1;

        console.log(`  ${this.colors.bold}${rank}. ${symbol.symbolName}${this.colors.reset}`);
        console.log(`     ID: ${this.colors.dim}${symbol.symbolId}${this.colors.reset}`);

        if (options.detailed) {
          console.log(`     Degree: ${this.colors.cyan}${symbol.degree}${this.colors.reset} (in: ${symbol.inDegree}, out: ${symbol.outDegree})`);
          console.log(`     Betweenness: ${this.colors.cyan}${symbol.betweenness.toFixed(4)}${this.colors.reset}`);
          console.log(`     PageRank: ${this.colors.cyan}${symbol.pageRank.toFixed(6)}${this.colors.reset}`);
          console.log(`     Importance: ${this.colors.cyan}${symbol.importance.toFixed(2)}${this.colors.reset}`);
          console.log(`     ${this.colors.dim}${this.interpretMetrics(symbol)}${this.colors.reset}`);
        } else {
          const metricValue = symbol[options.metric];
          const displayValue = typeof metricValue === 'number'
            ? (metricValue < 1 ? metricValue.toFixed(6) : metricValue.toFixed(2))
            : metricValue;
          console.log(`     ${this.capitalize(options.metric)}: ${this.colors.cyan}${displayValue}${this.colors.reset}`);
          console.log(`     ${this.colors.dim}${this.interpretMetrics(symbol)}${this.colors.reset}`);
        }

        console.log();
      }

      // Overall statistics
      console.log();
      this.printSection('Graph Statistics');

      const avgDegree = metrics.reduce((sum, m) => sum + m.degree, 0) / metrics.length;
      const avgBetweenness = metrics.reduce((sum, m) => sum + m.betweenness, 0) / metrics.length;
      const totalEdges = metrics.reduce((sum, m) => sum + m.outDegree, 0);

      console.log(`  Total symbols: ${this.colors.cyan}${metrics.length}${this.colors.reset}`);
      console.log(`  Total relationships: ${this.colors.cyan}${totalEdges}${this.colors.reset}`);
      console.log(`  Average degree: ${this.colors.cyan}${avgDegree.toFixed(2)}${this.colors.reset}`);
      console.log(`  Average betweenness: ${this.colors.cyan}${avgBetweenness.toFixed(4)}${this.colors.reset}`);
      console.log();

      // Distribution
      const hubs = metrics.filter((m) => m.degree > avgDegree * 2).length;
      const bridges = metrics.filter((m) => m.betweenness > avgBetweenness * 2).length;
      const isolates = metrics.filter((m) => m.degree === 0).length;

      console.log(`  ${this.colors.dim}Distribution:${this.colors.reset}`);
      console.log(`    Hubs (2x avg degree): ${this.colors.cyan}${hubs}${this.colors.reset} symbols`);
      console.log(`    Bridges (2x avg betweenness): ${this.colors.cyan}${bridges}${this.colors.reset} symbols`);
      console.log(`    Isolated symbols: ${this.colors.cyan}${isolates}${this.colors.reset} symbols`);
      console.log();

      // Recommendations
      this.printSection('Architectural Insights');

      const criticalHubs = metrics.filter((m) => m.degree > 50 && m.betweenness > 0.01);
      if (criticalHubs.length > 0) {
        this.printWarning(`${criticalHubs.length} critical hub(s) with high degree and betweenness`);
        console.log(`  ${this.colors.dim}These are architectural bottlenecks - changes will have wide impact${this.colors.reset}`);
        for (const hub of criticalHubs.slice(0, 5)) {
          console.log(`    • ${hub.symbolName} (degree: ${hub.degree}, betweenness: ${hub.betweenness.toFixed(4)})`);
        }
        console.log();
      }

      const coreComponents = metrics.filter((m) => m.inDegree > 20 && m.outDegree < 10);
      if (coreComponents.length > 0) {
        this.printInfo(`${coreComponents.length} core component(s) with many dependents`);
        console.log(`  ${this.colors.dim}These should be stable - many symbols depend on them${this.colors.reset}`);
        for (const core of coreComponents.slice(0, 3)) {
          console.log(`    • ${core.symbolName} (in: ${core.inDegree}, out: ${core.outDegree})`);
        }
        console.log();
      }

      dbManager.close();

      return this.success(`Analyzed ${metrics.length} symbols`);
    });
  }

  /**
   * Build directed graph from relationships
   */
  private buildGraph(
    dbManager: DatabaseManager,
    category?: string
  ): {
    outgoing: Map<string, Set<string>>;
    incoming: Map<string, Set<string>>;
    symbolNames: Map<string, string>;
  } {
    // Use Drizzle ORM methods
    const allRelationships = dbManager.getAllUnifiedRelationshipRows();
    const relationships = category
      ? allRelationships.filter(r => r.category === category)
      : allRelationships;

    const outgoing = new Map<string, Set<string>>();
    const incoming = new Map<string, Set<string>>();
    const symbolNames = new Map<string, string>();

    // Get all symbol names using Drizzle
    const symbols = dbManager.getAllSymbolRows();
    for (const symbol of symbols) {
      symbolNames.set(symbol.id, symbol.name);
      outgoing.set(symbol.id, new Set());
      incoming.set(symbol.id, new Set());
    }

    // Build adjacency lists
    for (const rel of relationships) {
      const fromSymbols = JSON.parse(rel.from_symbols);
      const toSymbols = JSON.parse(rel.to_symbols);

      for (const from of fromSymbols) {
        for (const to of toSymbols) {
          if (from !== to) {
            // Directed edges
            if (!outgoing.has(from)) outgoing.set(from, new Set());
            if (!incoming.has(to)) incoming.set(to, new Set());

            outgoing.get(from)!.add(to);
            incoming.get(to)!.add(from);
          }
        }
      }
    }

    return { outgoing, incoming, symbolNames };
  }

  /**
   * Calculate all centrality metrics
   */
  private calculateMetrics(
    outgoing: Map<string, Set<string>>,
    incoming: Map<string, Set<string>>,
    symbolNames: Map<string, string>
  ): SymbolMetrics[] {
    const symbols = Array.from(symbolNames.keys());
    const metrics: SymbolMetrics[] = [];

    // Calculate degree metrics
    for (const symbolId of symbols) {
      const outDegree = outgoing.get(symbolId)?.size || 0;
      const inDegree = incoming.get(symbolId)?.size || 0;
      const degree = outDegree + inDegree;

      metrics.push({
        symbolId,
        symbolName: symbolNames.get(symbolId) || symbolId,
        degree,
        inDegree,
        outDegree,
        betweenness: 0,
        pageRank: 0,
        importance: 0,
      });
    }

    // Calculate betweenness centrality (approximate using random sampling)
    const betweennessMap = this.calculateBetweenness(outgoing, symbols);
    for (const metric of metrics) {
      metric.betweenness = betweennessMap.get(metric.symbolId) || 0;
    }

    // Calculate PageRank
    const pageRankMap = this.calculatePageRank(outgoing, incoming, symbols);
    for (const metric of metrics) {
      metric.pageRank = pageRankMap.get(metric.symbolId) || 0;
    }

    // Calculate composite importance score
    const maxDegree = Math.max(...metrics.map((m) => m.degree), 1);
    const maxBetweenness = Math.max(...metrics.map((m) => m.betweenness), 1);
    const maxPageRank = Math.max(...metrics.map((m) => m.pageRank), 1);

    for (const metric of metrics) {
      metric.importance =
        (metric.degree / maxDegree) * 0.4 +
        (metric.betweenness / maxBetweenness) * 0.3 +
        (metric.pageRank / maxPageRank) * 0.3;
    }

    return metrics;
  }

  /**
   * Calculate betweenness centrality using random sampling
   */
  private calculateBetweenness(
    outgoing: Map<string, Set<string>>,
    symbols: string[]
  ): Map<string, number> {
    const betweenness = new Map<string, number>();
    for (const symbol of symbols) {
      betweenness.set(symbol, 0);
    }

    // Sample random paths (limit for performance)
    const sampleSize = Math.min(symbols.length, 200);
    const sampledSources = symbols.slice(0, sampleSize);

    for (const source of sampledSources) {
      // BFS from source
      const distances = new Map<string, number>();
      const pathCounts = new Map<string, number>();
      const queue: string[] = [source];

      distances.set(source, 0);
      pathCounts.set(source, 1);

      while (queue.length > 0) {
        const current = queue.shift()!;
        const currentDist = distances.get(current)!;
        const neighbors = outgoing.get(current) || new Set();

        for (const neighbor of neighbors) {
          if (!distances.has(neighbor)) {
            distances.set(neighbor, currentDist + 1);
            pathCounts.set(neighbor, 0);
            queue.push(neighbor);
          }

          if (distances.get(neighbor) === currentDist + 1) {
            pathCounts.set(neighbor, (pathCounts.get(neighbor) || 0) + (pathCounts.get(current) || 0));
          }
        }
      }

      // Count paths through each node
      for (const [symbol, count] of pathCounts.entries()) {
        if (symbol !== source && count > 0) {
          betweenness.set(symbol, (betweenness.get(symbol) || 0) + count);
        }
      }
    }

    // Normalize
    const total = symbols.length * (symbols.length - 1);
    if (total > 0) {
      for (const [symbol, value] of betweenness.entries()) {
        betweenness.set(symbol, value / total);
      }
    }

    return betweenness;
  }

  /**
   * Calculate PageRank
   */
  private calculatePageRank(
    outgoing: Map<string, Set<string>>,
    incoming: Map<string, Set<string>>,
    symbols: string[]
  ): Map<string, number> {
    const dampingFactor = 0.85;
    const iterations = 20;
    const n = symbols.length;

    const pageRank = new Map<string, number>();
    const newPageRank = new Map<string, number>();

    // Initialize
    for (const symbol of symbols) {
      pageRank.set(symbol, 1.0 / n);
    }

    // Iterate
    for (let iter = 0; iter < iterations; iter++) {
      for (const symbol of symbols) {
        let sum = 0;
        const incomingSymbols = incoming.get(symbol) || new Set();

        for (const incoming_symbol of incomingSymbols) {
          const outDegree = outgoing.get(incoming_symbol)?.size || 1;
          sum += (pageRank.get(incoming_symbol) || 0) / outDegree;
        }

        newPageRank.set(symbol, (1 - dampingFactor) / n + dampingFactor * sum);
      }

      // Update
      for (const symbol of symbols) {
        pageRank.set(symbol, newPageRank.get(symbol) || 0);
      }
    }

    return pageRank;
  }

  /**
   * Interpret metrics to provide insights
   */
  private interpretMetrics(metrics: SymbolMetrics): string {
    const { inDegree, outDegree, betweenness, degree } = metrics;

    if (degree > 50 && betweenness > 0.01) {
      return 'Critical hub - architectural bottleneck';
    }

    if (inDegree > 20 && outDegree < 10) {
      return 'Core dependency - many symbols depend on this';
    }

    if (outDegree > 20 && inDegree < 10) {
      return 'Orchestrator - coordinates many components';
    }

    if (betweenness > 0.01) {
      return 'Bridge - connects different parts of the system';
    }

    if (degree > 20) {
      return 'Hub - highly connected symbol';
    }

    if (inDegree > outDegree * 2) {
      return 'Widely used - stable interface recommended';
    }

    if (outDegree > inDegree * 2) {
      return 'Integration point - depends on many symbols';
    }

    return 'Standard component';
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private getOption(args: string[], flag: string): string | undefined {
    const index = args.indexOf(flag);
    if (index !== -1 && index + 1 < args.length) {
      return args[index + 1];
    }
    return undefined;
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
