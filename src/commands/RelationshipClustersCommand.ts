/**
 * Relationship Clusters Command
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { CanonicalGraphNode } from '../indexer/contracts';
import { DatabaseManager } from '../storage/DatabaseManager';
import { GraphRepository } from '../storage/GraphRepository';
import { BaseCommand, type CommandResult } from './BaseCommand';

/** A cluster of related symbols in the architecture */
interface Cluster {
  /** Cluster identifier */
  id: number;
  symbols: string[];
  internalEdges: number;
  externalEdges: number;
  cohesion: number;
  dominantCategory: string;
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
  execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(() => {
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const invalid = this.validateAllowedFlags(
        args,
        ['--detailed', '--include-external', '--json'],
        ['--min-size', '--max-clusters', '--category']
      );
      if (invalid) return invalid;
      const options = {
        minSize: Number.parseInt(this.getOption(args, '--min-size') || '3', 10),
        maxClusters: Number.parseInt(this.getOption(args, '--max-clusters') || '20', 10),
        category: this.getOption(args, '--category'),
        detailed: args.includes('--detailed'),
        includeExternal: this.hasFlag(args, '--include-external'),
        json: this.hasFlag(args, '--json'),
      };
      if (options.json) return this.executeJsonClusters(options);

      const canonical = this.openCanonical();
      const dbPath = this.getDatabasePath();
      const dbManager = canonical ? undefined : new DatabaseManager(dbPath);
      try {
        console.log();
        this.printInfo('Building symbol graph...');

        // Build adjacency map
        const adjacencyMap = canonical
          ? this.buildCanonicalAdjacency(
              canonical.revision.graph.nodes,
              canonical.revision.graph.edges,
              options.category,
              options.includeExternal
            )
          : this.buildAdjacencyMap(dbManager as DatabaseManager, options.category);
        const symbols = Array.from(adjacencyMap.keys());

        this.printInfo(`Graph: ${symbols.length} symbols, ${this.countEdges(adjacencyMap)} edges`);
        console.log();

        // Find clusters using greedy modularity
        this.printInfo('Running community detection...');
        const clusters = this.findClusters(adjacencyMap, options.minSize);

        this.printInfo(`Found ${clusters.length} clusters`);
        console.log();

        if (clusters.length === 0) {
          console.log('  No clusters found meeting the criteria.');
          console.log();
          return this.success('Analysis complete');
        }

        // Sort by cohesion
        clusters.sort((a, b) => b.cohesion - a.cohesion);

        const displayClusters = clusters.slice(0, options.maxClusters);
        // Display clusters
        this.printHeader('Architectural Cluster Analysis');
        this.printSection('Architectural Clusters');
        console.log(
          `  ${this.colors.dim}Showing top ${Math.min(options.maxClusters, clusters.length)} clusters sorted by cohesion${this.colors.reset}`
        );
        console.log();

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
            console.log(
              `    ${this.colors.dim}Sample: ${samples.join(', ')}...${this.colors.reset}`
            );
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
          `  Total symbols clustered: ${this.colors.cyan}${totalSymbols}${this.colors.reset} / ${symbols.length}`
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

        return this.success(`Found ${clusters.length} architectural clusters`);
      } finally {
        dbManager?.close();
        canonical?.repository.close();
      }
    });
  }

  private executeJsonClusters(options: {
    minSize: number;
    maxClusters: number;
    category?: string;
    detailed: boolean;
    includeExternal: boolean;
    json: boolean;
  }): CommandResult {
    const canonical = this.openCanonical();
    const db = canonical ? undefined : new DatabaseManager(this.getDatabasePath());
    try {
      const adjacency = canonical
        ? this.buildCanonicalAdjacency(
            canonical.revision.graph.nodes,
            canonical.revision.graph.edges,
            options.category,
            options.includeExternal
          )
        : this.buildAdjacencyMap(db as DatabaseManager, options.category);
      const clusters = this.findClusters(adjacency, options.minSize)
        .sort((left, right) => right.cohesion - left.cohesion)
        .slice(0, options.maxClusters);
      console.log(
        JSON.stringify(
          { clusters, totalClusters: clusters.length, symbols: adjacency.size },
          null,
          2
        )
      );
      return this.success(`Found ${clusters.length} architectural clusters`);
    } finally {
      db?.close();
      canonical?.repository.close();
    }
  }

  private buildCanonicalAdjacency(
    nodes: readonly CanonicalGraphNode[],
    edges: readonly { from: string; to: string; kind: string }[],
    category: string | undefined,
    includeExternal: boolean
  ): Map<string, Map<string, string>> {
    const allowed = new Set(
      nodes.filter((node) => includeExternal || !this.isExternal(node)).map((node) => node.id)
    );
    const map = new Map<string, Map<string, string>>();
    for (const id of allowed) map.set(id, new Map());
    for (const edge of edges)
      if (
        (!category || edge.kind.includes(category)) &&
        allowed.has(edge.from) &&
        allowed.has(edge.to)
      ) {
        map.get(edge.from)?.set(edge.to, edge.kind);
        map.get(edge.to)?.set(edge.from, edge.kind);
      }
    return map;
  }
  private isExternal(node: Pick<CanonicalGraphNode, 'external' | 'file'>): boolean {
    return (
      node.external === true ||
      /(?:bundled:|(?:^|[\\/])libs[\\/]|(?:^|[\\/])node_modules[\\/])/.test(node.file ?? '')
    );
  }
  private openCanonical(): {
    repository: GraphRepository;
    revision: NonNullable<ReturnType<GraphRepository['readActiveRevision']>>;
  } | null {
    const configPath = path.join(process.cwd(), '.tsdoc.config.json');
    let configured: string | undefined;
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const config = parsed as { canonicalGraph?: { databasePath?: string } };
      configured = config.canonicalGraph?.databasePath;
    } catch {}
    const db = path.resolve(
      process.cwd(),
      process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB ?? configured ?? '.tsdoc/canonical-graph.db'
    );
    if (!fs.existsSync(db)) return null;
    let repository: GraphRepository | undefined;
    try {
      repository = new GraphRepository(db, { readOnly: true });
      const revision = repository.readActiveRevision();
      if (!revision) {
        repository.close();
        return null;
      }
      return { repository, revision };
    } catch {
      return null;
    }
  }

  /**
   * Build adjacency map from relationships
   */
  private buildAdjacencyMap(
    dbManager: DatabaseManager,
    category?: string
  ): Map<string, Map<string, string>> {
    // Use Drizzle ORM to query relationships
    let relationships = dbManager.getAllUnifiedRelationships();

    if (category) {
      relationships = relationships.filter((r) => r.category === category);
    }

    const adjacencyMap = new Map<string, Map<string, string>>();

    for (const rel of relationships) {
      const fromSymbols = Array.isArray(rel.from) ? rel.from : [rel.from];
      const toSymbols = Array.isArray(rel.to) ? rel.to : [rel.to];

      for (const from of fromSymbols) {
        if (!adjacencyMap.has(from)) {
          adjacencyMap.set(from, new Map());
        }

        for (const to of toSymbols) {
          adjacencyMap.get(from)?.set(to, rel.category);

          // Add reverse for undirected clustering
          if (!adjacencyMap.has(to)) {
            adjacencyMap.set(to, new Map());
          }
          adjacencyMap.get(to)?.set(from, rel.category);
        }
      }
    }

    return adjacencyMap;
  }

  /**
   * Count total edges in graph
   */
  private countEdges(adjacencyMap: Map<string, Map<string, string>>): number {
    let total = 0;
    for (const neighbors of adjacencyMap.values()) {
      total += neighbors.size;
    }
    return Math.floor(total / 2); // Divide by 2 for undirected
  }

  /**
   * Find clusters using greedy modularity optimization
   */
  private findClusters(adjacencyMap: Map<string, Map<string, string>>, minSize: number): Cluster[] {
    const symbols = Array.from(adjacencyMap.keys());
    const clusterAssignment = new Map<string, number>();

    // Initialize: each symbol in its own cluster
    for (let i = 0; i < symbols.length; i++) {
      clusterAssignment.set(symbols[i], i);
    }

    // Greedy merging based on shared neighbors
    let changed = true;
    let iteration = 0;
    const maxIterations = 10;

    while (changed && iteration < maxIterations) {
      changed = false;
      iteration++;

      for (const symbol of symbols) {
        const currentCluster = clusterAssignment.get(symbol);
        if (currentCluster === undefined) continue;
        const neighbors = adjacencyMap.get(symbol) ?? new Map<string, string>();

        if (neighbors.size === 0) continue;

        // Count neighbors in each cluster
        const clusterScores = new Map<number, number>();
        for (const neighbor of neighbors.keys()) {
          const neighborCluster = clusterAssignment.get(neighbor);
          if (neighborCluster === undefined) continue;
          clusterScores.set(neighborCluster, (clusterScores.get(neighborCluster) || 0) + 1);
        }

        // Find best cluster (most neighbors)
        let bestCluster = currentCluster;
        let bestScore = clusterScores.get(currentCluster) || 0;

        for (const [cluster, score] of clusterScores.entries()) {
          if (score > bestScore) {
            bestCluster = cluster;
            bestScore = score;
          }
        }

        // Move if beneficial
        if (bestCluster !== currentCluster) {
          clusterAssignment.set(symbol, bestCluster);
          changed = true;
        }
      }
    }

    // Build cluster objects
    const clusterMap = new Map<number, string[]>();
    for (const [symbol, cluster] of clusterAssignment.entries()) {
      if (!clusterMap.has(cluster)) {
        clusterMap.set(cluster, []);
      }
      clusterMap.get(cluster)?.push(symbol);
    }

    // Calculate metrics for each cluster
    const clusters: Cluster[] = [];

    for (const [id, clusterSymbols] of clusterMap.entries()) {
      if (clusterSymbols.length < minSize) continue;

      const symbolSet = new Set(clusterSymbols);
      let internalEdges = 0;
      let externalEdges = 0;
      const categoryCount = new Map<string, number>();

      for (const symbol of clusterSymbols) {
        const neighbors = adjacencyMap.get(symbol) ?? new Map<string, string>();

        for (const [neighbor, category] of neighbors.entries()) {
          if (symbolSet.has(neighbor)) {
            internalEdges++;
            categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
          } else {
            externalEdges++;
          }
        }
      }

      // Divide by 2 for undirected edges
      internalEdges = Math.floor(internalEdges / 2);

      const cohesion =
        internalEdges + externalEdges > 0 ? internalEdges / (internalEdges + externalEdges) : 0;

      // Find dominant category
      let dominantCategory = 'mixed';
      let maxCount = 0;
      for (const [category, count] of categoryCount.entries()) {
        if (count > maxCount) {
          maxCount = count;
          dominantCategory = category;
        }
      }

      clusters.push({
        id,
        symbols: clusterSymbols,
        internalEdges,
        externalEdges,
        cohesion,
        dominantCategory,
      });
    }

    return clusters;
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
