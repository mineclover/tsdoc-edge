/**
 * Graph Service - Shared relationship-graph analysis
 * @packageDocumentation
 */

import { DEPENDENCY_GRAPH_EDGE_KINDS, graphEdgeSemantic } from '../graph-analysis/edge-semantics';
import type { CanonicalAliasContext } from '../indexer';
import type { DatabaseManager } from '../storage/DatabaseManager';

/** The slice of {@link DatabaseManager} the graph algorithms read from. */
export type GraphDataSource = Pick<
  DatabaseManager,
  | 'getUnifiedRelationshipsBySymbol'
  | 'getAllUnifiedRelationships'
  | 'getAllSymbolRows'
  | 'getRelationshipEdges'
>;

/** A symbol affected by a change at a given depth */
export interface ImpactNode {
  symbolId: string;
  depth: number;
  path: string[];
  relationshipType: string;
  category: string;
}

/** Direction of an impact traversal */
export type ImpactDirection = 'downstream' | 'upstream' | 'both';

/** Options for impact analysis */
export interface ImpactOptions {
  depth: number;
  /** Anything other than 'downstream' or 'upstream' traverses both directions. */
  direction: ImpactDirection | string;
  category?: string;
  minConfidence?: number;
}

/** A node in a relationship path */
export interface PathNode {
  symbolId: string;
  relationshipType: string;
  category: string;
}

/** A path between two symbols through relationships */
export interface SymbolPath {
  nodes: PathNode[];
  length: number;
  strength: number;
}

/** An edge in the relationship graph */
interface GraphEdge {
  to: string;
  type: string;
  category: string;
}

/** Options for path analysis */
export interface PathOptions {
  maxLength: number;
  category?: string;
}

/** Result of a path search, with the facts needed to report on it */
export interface PathSearchResult {
  /** Unique paths found, in discovery order (callers sort and slice). */
  paths: SymbolPath[];
  /** Symbols with outgoing relationships in the searched graph. */
  nodeCount: number;
  buildTimeMs: number;
  searchTimeMs: number;
  /** The BFS stopped after {@link GraphService.MAX_PATH_ITERATIONS} iterations. */
  iterationLimitReached: boolean;
  /** The BFS stopped after {@link GraphService.MAX_PATHS} paths. */
  pathLimitReached: boolean;
}

/** A cluster of related symbols in the architecture */
export interface Cluster {
  /** Cluster identifier */
  id: number;
  symbols: string[];
  internalEdges: number;
  externalEdges: number;
  cohesion: number;
  dominantCategory: string;
}

/** Options for cluster analysis */
export interface ClusterOptions {
  minSize: number;
  category?: string;
}

/** Result of a cluster analysis */
export interface ClusterAnalysis {
  /** Clusters of at least `minSize` symbols, unsorted. */
  clusters: Cluster[];
  /** Symbols in the (undirected) relationship graph. */
  symbolCount: number;
  /** Undirected edges in the relationship graph. */
  edgeCount: number;
}

/** Graph metrics for a symbol */
export interface SymbolMetrics {
  symbolId: string;
  symbolName: string;
  degree: number;
  inDegree: number;
  outDegree: number;
  betweenness: number;
  pageRank: number;
  importance: number;
}

/** Options for metrics analysis */
export interface MetricsOptions {
  category?: string;
}

/** Qualitative change-risk bucket */
export type RiskLevel = 'Low' | 'Medium' | 'High';

type DirectedGraph = {
  outgoing: Map<string, Set<string>>;
  incoming: Map<string, Set<string>>;
  symbolNames: Map<string, string>;
};

/**
 * Relationship-graph analysis shared by the relationship-* commands
 *
 * @doc [[GraphService]]
 * @public
 * @responsibility Run impact, path, cluster and centrality analysis over the relationship graph
 * @contract Read relationships through a GraphDataSource; never write to it
 *
 * @problem Each relationship command carried its own copy of the graph traversal code
 * @solves One service per graph question so commands only parse arguments and format output
 * @context Backs relationship-impact, relationship-path, relationship-clusters, relationship-metrics
 *
 * @functionality
 * - Impact analysis: BFS over unified relationships (legacy DB) or canonical dependency edges
 * - Path finding: bounded BFS with cycle avoidance and de-duplication
 * - Clustering: greedy label propagation over the undirected relationship graph
 * - Metrics: degree, sampled betweenness, PageRank and a composite importance score
 *
 * @decision Keep the algorithms bit-for-bit identical to the command implementations they replace
 * @rationale The refactor must not change any number a user can already observe
 * @consequences Sampling limits (200 BFS sources, 100 paths, 50,000 iterations) stay as constants
 *
 * @depends DatabaseManager
 * @depType internal
 * @depReason Source of symbols and unified relationships
 */
export class GraphService {
  /** Path search stops after this many collected paths. */
  static readonly MAX_PATHS = 100;
  /** Path search stops after this many BFS iterations. */
  static readonly MAX_PATH_ITERATIONS = 50000;
  /** Betweenness is approximated from this many BFS sources. */
  static readonly BETWEENNESS_SAMPLE_SIZE = 200;

  constructor(private readonly dataSource: GraphDataSource) {}

  /**
   * Analyze change impact using BFS traversal over the unified relationships.
   *
   * @param startSymbolId - Symbol whose change is being assessed
   * @param options - Depth, direction and relationship filters
   * @returns Affected symbols in breadth-first order
   */
  analyzeImpact(startSymbolId: string, options: ImpactOptions): ImpactNode[] {
    const visited = new Set<string>();
    const impactNodes: ImpactNode[] = [];
    const queue: Array<{ symbolId: string; depth: number; path: string[] }> = [
      { symbolId: startSymbolId, depth: 0, path: [startSymbolId] },
    ];

    visited.add(startSymbolId);

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;

      if (current.depth >= options.depth) continue;

      let relationships = this.dataSource.getUnifiedRelationshipsBySymbol(current.symbolId);

      if (options.category) {
        relationships = relationships.filter((r) => r.category === options.category);
      }
      if (options.minConfidence !== undefined) {
        const minConfidence = options.minConfidence;
        relationships = relationships.filter((r) => r.confidence >= minConfidence);
      }

      for (const rel of relationships) {
        const fromSymbols = Array.isArray(rel.from) ? rel.from : [rel.from];
        const toSymbols = Array.isArray(rel.to) ? rel.to : [rel.to];

        let nextSymbols: string[] = [];

        if (options.direction === 'downstream') {
          // Who uses current symbol
          if (fromSymbols.includes(current.symbolId)) {
            nextSymbols = toSymbols;
          }
        } else if (options.direction === 'upstream') {
          // What current symbol uses
          if (toSymbols.includes(current.symbolId)) {
            nextSymbols = fromSymbols;
          }
        } else {
          // Both directions
          if (fromSymbols.includes(current.symbolId)) {
            nextSymbols.push(...toSymbols);
          }
          if (toSymbols.includes(current.symbolId)) {
            nextSymbols.push(...fromSymbols);
          }
        }

        for (const nextSymbol of nextSymbols) {
          if (!visited.has(nextSymbol) && nextSymbol !== startSymbolId) {
            visited.add(nextSymbol);

            const newPath = [...current.path, nextSymbol];

            impactNodes.push({
              symbolId: nextSymbol,
              depth: current.depth + 1,
              path: newPath,
              relationshipType: rel.type,
              category: rel.category,
            });

            queue.push({
              symbolId: nextSymbol,
              depth: current.depth + 1,
              path: newPath,
            });
          }
        }
      }
    }

    return impactNodes;
  }

  /**
   * Traverse canonical dependency facts with the same filters as the legacy lane.
   *
   * @param context - Open canonical graph context
   * @param startSymbol - Canonical id of the symbol being assessed
   * @param options - Depth, direction and relationship filters; confidence defaults to 0.5
   * @returns Affected canonical nodes sorted by depth then id
   */
  analyzeCanonicalImpact(
    context: CanonicalAliasContext,
    startSymbol: string,
    options: ImpactOptions
  ): ImpactNode[] {
    const { depth: maxDepth, direction, category, minConfidence = 0.5 } = options;

    // Canonical compiler facts have confidence 1.0.
    if (minConfidence > 1) return [];

    const allowedKinds = new Set(DEPENDENCY_GRAPH_EDGE_KINDS);
    const visited = new Set([startSymbol]);
    const queue: Array<{ symbolId: string; depth: number; path: string[] }> = [
      { symbolId: startSymbol, depth: 0, path: [startSymbol] },
    ];
    const result: ImpactNode[] = [];

    for (let cursor = 0; cursor < queue.length; cursor++) {
      const current = queue[cursor];
      if (current.depth >= maxDepth) continue;

      const candidates = [
        ...(direction !== 'upstream'
          ? context.analysis.index
              .getIncomingEdges(current.symbolId)
              .map((edge) => ({ edge, nextId: edge.from }))
          : []),
        ...(direction !== 'downstream'
          ? context.analysis.index
              .getOutgoingEdges(current.symbolId)
              .map((edge) => ({ edge, nextId: edge.to }))
          : []),
      ].sort(
        (left, right) =>
          left.nextId.localeCompare(right.nextId) || left.edge.kind.localeCompare(right.edge.kind)
      );

      for (const { edge, nextId } of candidates) {
        if (!allowedKinds.has(edge.kind) || visited.has(nextId)) continue;
        const semantic = graphEdgeSemantic(edge.kind);
        const relationshipCategory = semantic.relationshipCategory ?? semantic.category;
        if (category && relationshipCategory !== category) continue;

        const node = context.analysis.index.getNode(nextId);
        if (!node) continue;
        visited.add(nextId);
        const nextDepth = current.depth + 1;
        const nextPath = [...current.path, nextId];
        result.push({
          symbolId: nextId,
          depth: nextDepth,
          path: nextPath,
          relationshipType: semantic.relationshipType ?? edge.kind,
          category: relationshipCategory,
        });
        if (node.external !== true) {
          queue.push({ symbolId: nextId, depth: nextDepth, path: nextPath });
        }
      }
    }

    return result.sort(
      (left, right) => left.depth - right.depth || left.symbolId.localeCompare(right.symbolId)
    );
  }

  /**
   * Assess risk level based on impact.
   *
   * @param impactCount - Number of affected symbols
   * @param maxDepth - Deepest level reached
   * @returns Low, Medium or High
   */
  assessRisk(impactCount: number, maxDepth: number): RiskLevel {
    if (impactCount === 0) return 'Low';
    if (impactCount >= 20 || maxDepth >= 4) return 'High';
    if (impactCount >= 5 || maxDepth >= 2) return 'Medium';
    return 'Low';
  }

  /**
   * Find connection paths between two symbols with a bounded BFS.
   *
   * Collects at most {@link GraphService.MAX_PATHS} paths and runs at most
   * {@link GraphService.MAX_PATH_ITERATIONS} iterations; the result flags which limit stopped it.
   *
   * @param fromSymbol - Source symbol id
   * @param toSymbol - Target symbol id
   * @param options - Maximum path length and category filter
   * @returns Unique paths plus search statistics
   */
  findPaths(fromSymbol: string, toSymbol: string, options: PathOptions): PathSearchResult {
    const startBuild = Date.now();
    const adjacency = this.buildPathAdjacency(options.category);
    const buildTimeMs = Date.now() - startBuild;

    const startSearch = Date.now();
    const search = this.searchPaths(adjacency, fromSymbol, toSymbol, options.maxLength);
    const searchTimeMs = Date.now() - startSearch;

    return {
      paths: search.paths,
      nodeCount: adjacency.size,
      buildTimeMs,
      searchTimeMs,
      iterationLimitReached: search.iterationLimitReached,
      pathLimitReached: search.pathLimitReached,
    };
  }

  /**
   * Find architectural clusters with greedy label propagation.
   *
   * @param options - Minimum cluster size and category filter
   * @returns Clusters (unsorted) and the size of the graph they were found in
   */
  findClusters(options: ClusterOptions): ClusterAnalysis {
    const adjacencyMap = this.buildClusterAdjacency(options.category);
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
        const neighbors = adjacencyMap.get(symbol) || new Map();

        if (currentCluster === undefined || neighbors.size === 0) continue;

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
      if (clusterSymbols.length < options.minSize) continue;

      const symbolSet = new Set(clusterSymbols);
      let internalEdges = 0;
      let externalEdges = 0;
      const categoryCount = new Map<string, number>();

      for (const symbol of clusterSymbols) {
        const neighbors = adjacencyMap.get(symbol) || new Map();

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

    return {
      clusters,
      symbolCount: symbols.length,
      edgeCount: this.countUndirectedEdges(adjacencyMap),
    };
  }

  /**
   * Calculate centrality metrics for every symbol.
   *
   * @param options - Category filter
   * @returns One metrics record per known symbol, in symbol-table order
   */
  calculateMetrics(options: MetricsOptions = {}): SymbolMetrics[] {
    const { outgoing, incoming, symbolNames } = this.buildMetricsGraph(options.category);
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

    // Calculate betweenness centrality (approximate using the first sampled sources)
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
   * Interpret metrics to provide a one-line insight.
   *
   * @param metrics - Metrics of one symbol
   * @returns Human-readable classification
   */
  interpretMetrics(metrics: SymbolMetrics): string {
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

  /** Build the forward adjacency list used by path finding. */
  private buildPathAdjacency(category?: string): Map<string, GraphEdge[]> {
    const adjacency = new Map<string, GraphEdge[]>();

    let relationships = this.dataSource.getAllUnifiedRelationships();

    if (category) {
      relationships = relationships.filter((r) => r.category === category);
    }

    for (const rel of relationships) {
      try {
        const fromSymbols = Array.isArray(rel.from) ? rel.from : [rel.from];
        const toSymbols = Array.isArray(rel.to) ? rel.to : [rel.to];

        for (const from of fromSymbols) {
          if (!from) continue;

          if (!adjacency.has(from)) {
            adjacency.set(from, []);
          }

          for (const to of toSymbols) {
            if (!to) continue;

            adjacency.get(from)?.push({
              to,
              type: rel.type,
              category: rel.category,
            });
          }
        }
      } catch (_error) {}
    }

    return adjacency;
  }

  /** Memory-bounded BFS with path tracking. */
  private searchPaths(
    forward: Map<string, GraphEdge[]>,
    fromSymbol: string,
    toSymbol: string,
    maxLength: number
  ): { paths: SymbolPath[]; iterationLimitReached: boolean; pathLimitReached: boolean } {
    const allPaths: SymbolPath[] = [];
    const maxPaths = GraphService.MAX_PATHS;

    // Early termination checks
    if (!forward.has(fromSymbol) && fromSymbol !== toSymbol) {
      return { paths: [], iterationLimitReached: false, pathLimitReached: false };
    }

    const queue: Array<{
      symbolId: string;
      path: PathNode[];
      visited: Set<string>;
    }> = [
      {
        symbolId: fromSymbol,
        path: [{ symbolId: fromSymbol, relationshipType: '', category: '' }],
        visited: new Set([fromSymbol]),
      },
    ];

    let iterations = 0;
    const maxIterations = GraphService.MAX_PATH_ITERATIONS;

    while (queue.length > 0 && iterations < maxIterations && allPaths.length < maxPaths) {
      iterations++;

      const next = queue.shift();
      if (!next) break;
      const { symbolId, path, visited } = next;

      // Check if we've reached the target
      if (symbolId === toSymbol && path.length > 1) {
        allPaths.push({
          nodes: path,
          length: path.length - 1,
          strength: this.calculatePathStrength(path),
        });

        // Continue searching for more paths
        continue;
      }

      // Don't expand if we've reached max length
      if (path.length > maxLength) continue;

      const neighbors = forward.get(symbolId);
      if (!neighbors) continue;

      for (const edge of neighbors) {
        // Avoid cycles (except allow reaching target)
        if (visited.has(edge.to) && edge.to !== toSymbol) continue;

        const newPath = [
          ...path.slice(0, -1),
          {
            symbolId: path[path.length - 1].symbolId,
            relationshipType: edge.type,
            category: edge.category,
          },
          {
            symbolId: edge.to,
            relationshipType: '',
            category: '',
          },
        ];

        const newVisited = new Set(visited);
        newVisited.add(edge.to);

        queue.push({
          symbolId: edge.to,
          path: newPath,
          visited: newVisited,
        });
      }
    }

    // Deduplicate paths
    const uniquePaths = new Map<string, SymbolPath>();
    for (const pathData of allPaths) {
      const key = pathData.nodes.map((n) => n.symbolId).join('→');
      const existing = uniquePaths.get(key);
      if (!existing || existing.strength < pathData.strength) {
        uniquePaths.set(key, pathData);
      }
    }

    return {
      paths: Array.from(uniquePaths.values()),
      iterationLimitReached: iterations >= maxIterations,
      pathLimitReached: allPaths.length >= maxPaths,
    };
  }

  /** Shorter paths = stronger connection. */
  private calculatePathStrength(path: PathNode[]): number {
    if (path.length <= 1) return 1.0;
    return 1.0 / path.length;
  }

  /** Build the undirected adjacency map used by clustering. */
  private buildClusterAdjacency(category?: string): Map<string, Map<string, string>> {
    let relationships = this.dataSource.getAllUnifiedRelationships();

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

  private countUndirectedEdges(adjacencyMap: Map<string, Map<string, string>>): number {
    let total = 0;
    for (const neighbors of adjacencyMap.values()) {
      total += neighbors.size;
    }
    return Math.floor(total / 2);
  }

  /**
   * Build the directed graph used by the metrics.
   * Uses getRelationshipEdges for efficient edge retrieval (avoids JSON.parse).
   */
  private buildMetricsGraph(category?: string): DirectedGraph {
    const outgoing = new Map<string, Set<string>>();
    const incoming = new Map<string, Set<string>>();
    const symbolNames = new Map<string, string>();

    for (const symbol of this.dataSource.getAllSymbolRows()) {
      symbolNames.set(symbol.id, symbol.name);
      outgoing.set(symbol.id, new Set());
      incoming.set(symbol.id, new Set());
    }

    // Get edges directly from join table (no JSON.parse needed)
    for (const { fromSymbolId, toSymbolId } of this.dataSource.getRelationshipEdges(category)) {
      // Handle symbols not in the known set (external dependencies)
      if (!outgoing.has(fromSymbolId)) outgoing.set(fromSymbolId, new Set());
      if (!incoming.has(toSymbolId)) incoming.set(toSymbolId, new Set());

      outgoing.get(fromSymbolId)?.add(toSymbolId);
      incoming.get(toSymbolId)?.add(fromSymbolId);
    }

    return { outgoing, incoming, symbolNames };
  }

  /** Betweenness centrality approximated from the first BETWEENNESS_SAMPLE_SIZE sources. */
  private calculateBetweenness(
    outgoing: Map<string, Set<string>>,
    symbols: string[]
  ): Map<string, number> {
    const betweenness = new Map<string, number>();
    for (const symbol of symbols) {
      betweenness.set(symbol, 0);
    }

    const sampleSize = Math.min(symbols.length, GraphService.BETWEENNESS_SAMPLE_SIZE);
    const sampledSources = symbols.slice(0, sampleSize);

    for (const source of sampledSources) {
      // BFS from source
      const distances = new Map<string, number>();
      const pathCounts = new Map<string, number>();
      const queue: string[] = [source];

      distances.set(source, 0);
      pathCounts.set(source, 1);

      while (queue.length > 0) {
        const current = queue.shift();
        if (current === undefined) break;
        const currentDist = distances.get(current) ?? 0;
        const neighbors = outgoing.get(current) || new Set();

        for (const neighbor of neighbors) {
          if (!distances.has(neighbor)) {
            distances.set(neighbor, currentDist + 1);
            pathCounts.set(neighbor, 0);
            queue.push(neighbor);
          }

          if (distances.get(neighbor) === currentDist + 1) {
            pathCounts.set(
              neighbor,
              (pathCounts.get(neighbor) || 0) + (pathCounts.get(current) || 0)
            );
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

        for (const incomingSymbol of incomingSymbols) {
          const outDegree = outgoing.get(incomingSymbol)?.size || 1;
          sum += (pageRank.get(incomingSymbol) || 0) / outDegree;
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
}
