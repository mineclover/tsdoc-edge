/**
 * Relationship Clusters Command
 * @packageDocumentation
 */

import { type ClusterAnalysis, GraphService } from '../graph/GraphService';
import { DatabaseManager } from '../storage/DatabaseManager';
import { BaseCommand, type CommandResult } from './BaseCommand';

/** Everything one cluster analysis found, independent of how it is printed */
interface ClusterReport {
  options: { minSize: number; maxClusters: number; category?: string; detailed: boolean };
  /** Clusters are already sorted by cohesion, best first */
  analysis: ClusterAnalysis;
}

/**
 * Command for finding architectural clusters using community detection
 * @doc [[RelationshipClustersCommand]]
 * @public
 */
export class RelationshipClustersCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'relationship-clusters';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Find architectural clusters using community detection';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge relationship-clusters [options]

Discovers architectural modules/components by analyzing relationship density.
Uses a greedy modularity optimization algorithm to group highly connected symbols.

Options:
  --min-size <n>        Minimum cluster size (default: 3)
  --max-clusters <n>    Maximum number of clusters to show (default: 20)
  --category <cat>      Only consider relationships in this category
  --detailed            Show all symbols in each cluster
  --human               Output in human-readable format (default: XML)

Metrics:
  Cohesion = Internal edges / (Internal + External edges)
  Higher cohesion indicates stronger architectural boundaries

Examples:
  # Find architectural modules
  tsdoc-edge relationship-clusters

  # Focus on structural relationships
  tsdoc-edge relationship-clusters --category structural

  # Find large modules only
  tsdoc-edge relationship-clusters --min-size 10

  # Show detailed symbol lists
  tsdoc-edge relationship-clusters --detailed --max-clusters 10`;
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

      const options = {
        minSize: Number.parseInt(this.getOption(args, '--min-size') || '3', 10),
        maxClusters: Number.parseInt(this.getOption(args, '--max-clusters') || '20', 10),
        category: this.getOption(args, '--category'),
        detailed: args.includes('--detailed'),
      };

      const isHuman = this.hasFlag(args, '--human');
      if (isHuman) {
        this.printHeader('Architectural Cluster Analysis');
      }

      const dbPath = this.getDatabasePath();
      const dbManager = new DatabaseManager(dbPath);

      // Build the relationship graph and find clusters using greedy modularity
      const analysis = new GraphService(dbManager).findClusters({
        minSize: options.minSize,
        category: options.category,
      });
      dbManager.close();

      // Sort by cohesion
      analysis.clusters.sort((a, b) => b.cohesion - a.cohesion);

      const report: ClusterReport = { options, analysis };
      if (isHuman) {
        this.printHuman(report);
      } else {
        this.printXml(report);
      }

      if (analysis.clusters.length === 0) {
        return this.success('Analysis complete');
      }
      return this.success(`Found ${analysis.clusters.length} architectural clusters`);
    });
  }

  /** Print the colored terminal report. */
  private printHuman(report: ClusterReport): void {
    const { options, analysis } = report;
    const { clusters } = analysis;

    console.log();
    this.printInfo('Building symbol graph...');
    this.printInfo(`Graph: ${analysis.symbolCount} symbols, ${analysis.edgeCount} edges`);
    console.log();

    this.printInfo('Running community detection...');

    this.printInfo(`Found ${clusters.length} clusters`);
    console.log();

    if (clusters.length === 0) {
      console.log('  No clusters found meeting the criteria.');
      console.log();
      return;
    }

    // Display clusters
    this.printSection('Architectural Clusters');
    console.log(
      `  ${this.colors.dim}Showing top ${Math.min(options.maxClusters, clusters.length)} clusters sorted by cohesion${this.colors.reset}`
    );
    console.log();

    const displayClusters = clusters.slice(0, options.maxClusters);

    for (let i = 0; i < displayClusters.length; i++) {
      const cluster = displayClusters[i];
      const cohesionBar = '█'.repeat(Math.round(cluster.cohesion * 20));
      const quality =
        cluster.cohesion > 0.7
          ? this.colors.green
          : cluster.cohesion > 0.5
            ? this.colors.yellow
            : this.colors.red;

      console.log(`  ${this.colors.bold}Cluster ${i + 1}${this.colors.reset}`);
      console.log(
        `    Size: ${this.colors.cyan}${cluster.symbols.length}${this.colors.reset} symbols`
      );
      console.log(
        `    Internal edges: ${this.colors.cyan}${cluster.internalEdges}${this.colors.reset}`
      );
      console.log(
        `    External edges: ${this.colors.cyan}${cluster.externalEdges}${this.colors.reset}`
      );
      console.log(
        `    Cohesion: ${quality}${cohesionBar}${this.colors.reset} ${(cluster.cohesion * 100).toFixed(1)}%`
      );
      console.log(
        `    Dominant category: ${this.colors.cyan}${cluster.dominantCategory}${this.colors.reset}`
      );

      if (options.detailed) {
        console.log(`    ${this.colors.dim}Symbols:${this.colors.reset}`);
        const sortedSymbols = [...cluster.symbols].sort();
        for (const symbol of sortedSymbols.slice(0, 20)) {
          console.log(`      ${this.colors.dim}• ${symbol}${this.colors.reset}`);
        }
        if (cluster.symbols.length > 20) {
          console.log(
            `      ${this.colors.dim}... and ${cluster.symbols.length - 20} more${this.colors.reset}`
          );
        }
      } else {
        // Show sample symbols
        const samples = cluster.symbols.slice(0, 3);
        console.log(`    ${this.colors.dim}Sample: ${samples.join(', ')}...${this.colors.reset}`);
      }

      console.log();
    }

    // Overall statistics
    console.log();
    this.printSection('Cluster Statistics');

    const totalSymbols = clusters.reduce((sum, c) => sum + c.symbols.length, 0);
    const avgSize = totalSymbols / clusters.length;
    const avgCohesion = clusters.reduce((sum, c) => sum + c.cohesion, 0) / clusters.length;
    const highCohesion = clusters.filter((c) => c.cohesion > 0.7).length;

    console.log(`  Total clusters: ${this.colors.cyan}${clusters.length}${this.colors.reset}`);
    console.log(
      `  Total symbols clustered: ${this.colors.cyan}${totalSymbols}${this.colors.reset} / ${analysis.symbolCount}`
    );
    console.log(
      `  Average cluster size: ${this.colors.cyan}${avgSize.toFixed(1)}${this.colors.reset} symbols`
    );
    console.log(
      `  Average cohesion: ${this.colors.cyan}${(avgCohesion * 100).toFixed(1)}%${this.colors.reset}`
    );
    console.log(
      `  High cohesion (>70%): ${this.colors.cyan}${highCohesion}${this.colors.reset} clusters`
    );
    console.log();

    // Category distribution
    const categoryCount = new Map<string, number>();
    for (const cluster of clusters) {
      categoryCount.set(
        cluster.dominantCategory,
        (categoryCount.get(cluster.dominantCategory) || 0) + 1
      );
    }

    console.log(`  ${this.colors.dim}Clusters by dominant category:${this.colors.reset}`);
    for (const [category, count] of Array.from(categoryCount.entries()).sort(
      (a, b) => b[1] - a[1]
    )) {
      console.log(`    ${category}: ${this.colors.cyan}${count}${this.colors.reset} clusters`);
    }
    console.log();

    // Recommendations
    const lowCohesion = clusters.filter((c) => c.cohesion < 0.5);
    if (lowCohesion.length > 0) {
      this.printSection('Recommendations');
      this.printWarning(
        `${lowCohesion.length} cluster(s) have low cohesion (<50%), suggesting weak architectural boundaries`
      );
      console.log(
        `  ${this.colors.dim}Consider refactoring to improve modularity${this.colors.reset}`
      );
      console.log();
    }
  }

  /** Print the machine-readable XML report. */
  private printXml(report: ClusterReport): void {
    const { options, analysis } = report;
    const { clusters } = analysis;

    const totalSymbols = clusters.reduce((sum, c) => sum + c.symbols.length, 0);
    const categoryCount = new Map<string, number>();
    for (const cluster of clusters) {
      categoryCount.set(
        cluster.dominantCategory,
        (categoryCount.get(cluster.dominantCategory) || 0) + 1
      );
    }

    this.printOutput(
      'relationship-clusters',
      {
        query: {
          minSize: options.minSize,
          maxClusters: options.maxClusters,
          detailed: options.detailed,
          ...(options.category ? { category: options.category } : {}),
        },
        summary: {
          graphSymbols: analysis.symbolCount,
          graphEdges: analysis.edgeCount,
          totalClusters: clusters.length,
          shownClusters: Math.min(options.maxClusters, clusters.length),
          totalSymbolsClustered: totalSymbols,
          averageClusterSize: clusters.length > 0 ? (totalSymbols / clusters.length).toFixed(1) : 0,
          averageCohesionPercent:
            clusters.length > 0
              ? (
                  (clusters.reduce((sum, c) => sum + c.cohesion, 0) / clusters.length) *
                  100
                ).toFixed(1)
              : 0,
          highCohesionClusters: clusters.filter((c) => c.cohesion > 0.7).length,
          lowCohesionClusters: clusters.filter((c) => c.cohesion < 0.5).length,
        },
        clusters: clusters.slice(0, options.maxClusters).map((cluster, index) => ({
          rank: index + 1,
          size: cluster.symbols.length,
          internalEdges: cluster.internalEdges,
          externalEdges: cluster.externalEdges,
          cohesionPercent: (cluster.cohesion * 100).toFixed(1),
          dominantCategory: cluster.dominantCategory,
          // --detailed lists every member (sorted); otherwise a three-symbol sample.
          symbols: (options.detailed
            ? [...cluster.symbols].sort()
            : cluster.symbols.slice(0, 3)
          ).map((symbolId) => ({ symbolId })),
        })),
        categories: Array.from(categoryCount.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([category, count]) => ({ category, clusters: count })),
      },
      []
    );
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
