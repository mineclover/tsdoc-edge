/**
 * Dependency chain analyzer
 * Builds and analyzes dependency chains for circular detection and hotspot analysis
 * @packageDocumentation
 */

import type { SymbolGraph } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships';

/**
 * Dependency chain result
 */
export interface DependencyChain {
  id: string;
  chainType: 'linear' | 'fan-out' | 'fan-in' | 'diamond';
  startSymbolId: string;
  endSymbolId: string;
  path: string[];
  length: number;
  hasCircular: boolean;
  circularPath?: string[];
}

/**
 * Circular dependency detection result
 */
export interface CircularDependency {
  path: string[];
  length: number;
  symbols: string[];
}

/**
 * Hotspot analysis result
 */
export interface Hotspot {
  symbolId: string;
  incomingCount: number;
  outgoingCount: number;
  score: number; // Bottleneck score
  rank: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Dependency chain analyzer
 * @doc [[DependencyChainAnalyzer]]
 * @public
 */
export class DependencyChainAnalyzer {
  private graph: SymbolGraph;

  constructor(graph: SymbolGraph) {
    this.graph = graph;
  }

  /**
   * Build all dependency chains from a symbol
   * @param startSymbolId - Starting symbol ID
   * @param maxDepth - Maximum chain depth (default: 10)
   * @returns Array of dependency chains
   */
  buildChains(startSymbolId: string, maxDepth: number = 10): DependencyChain[] {
    const chains: DependencyChain[] = [];
    const visited = new Set<string>();

    const dfs = (currentId: string, path: string[], depth: number) => {
      if (depth > maxDepth) return;
      if (visited.has(currentId)) {
        // Circular dependency detected
        const circularIndex = path.indexOf(currentId);
        if (circularIndex !== -1) {
          chains.push({
            id: `chain-${path.join('-')}`,
            chainType: 'linear',
            startSymbolId,
            endSymbolId: currentId,
            path: [...path, currentId],
            length: path.length + 1,
            hasCircular: true,
            circularPath: path.slice(circularIndex),
          });
        }
        return;
      }

      visited.add(currentId);

      const dependencies = this.graph.adjacencyList.get(currentId) || [];

      if (dependencies.length === 0 && path.length > 0) {
        // End of chain
        chains.push({
          id: `chain-${path.join('-')}`,
          chainType: this.determineChainType(path),
          startSymbolId,
          endSymbolId: currentId,
          path: [...path, currentId],
          length: path.length + 1,
          hasCircular: false,
        });
      } else {
        for (const depId of dependencies) {
          dfs(depId, [...path, currentId], depth + 1);
        }
      }

      visited.delete(currentId);
    };

    dfs(startSymbolId, [], 0);
    return chains;
  }

  /**
   * Detect all circular dependencies in the graph
   * @returns Array of circular dependencies
   */
  detectCircularDependencies(): CircularDependency[] {
    const circulars: CircularDependency[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (symbolId: string, path: string[]): boolean => {
      visited.add(symbolId);
      recursionStack.add(symbolId);

      const dependencies = this.graph.adjacencyList.get(symbolId) || [];

      for (const depId of dependencies) {
        if (!visited.has(depId)) {
          if (dfs(depId, [...path, symbolId])) {
            return true;
          }
        } else if (recursionStack.has(depId)) {
          // Circular dependency found
          const circularIndex = path.indexOf(depId);
          const circularPath = [...path.slice(circularIndex), symbolId, depId];

          circulars.push({
            path: circularPath,
            length: circularPath.length,
            symbols: [...new Set(circularPath)],
          });
          return true;
        }
      }

      recursionStack.delete(symbolId);
      return false;
    };

    for (const symbolId of this.graph.symbols.keys()) {
      if (!visited.has(symbolId)) {
        dfs(symbolId, []);
      }
    }

    return circulars;
  }

  /**
   * Analyze hotspots (bottleneck symbols)
   * @param topN - Number of top hotspots to return (default: 20)
   * @returns Array of hotspots sorted by score
   */
  analyzeHotspots(topN: number = 20): Hotspot[] {
    const hotspots: Hotspot[] = [];

    for (const [symbolId, symbol] of this.graph.symbols.entries()) {
      const outgoing = this.graph.adjacencyList.get(symbolId)?.length || 0;

      // Count incoming dependencies
      let incoming = 0;
      for (const deps of this.graph.adjacencyList.values()) {
        if (deps.includes(symbolId)) {
          incoming++;
        }
      }

      // Calculate bottleneck score
      // Higher score = more central/critical
      const score = incoming * 2 + outgoing; // Weight incoming more heavily

      let rank: 'critical' | 'high' | 'medium' | 'low';
      if (score >= 20) rank = 'critical';
      else if (score >= 10) rank = 'high';
      else if (score >= 5) rank = 'medium';
      else rank = 'low';

      hotspots.push({
        symbolId,
        incomingCount: incoming,
        outgoingCount: outgoing,
        score,
        rank,
      });
    }

    // Sort by score descending
    return hotspots
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
  }

  /**
   * Determine chain type based on path structure
   *
   * Chain patterns:
   * - linear: A -> B -> C (each node has exactly one outgoing edge)
   * - fan-out: A -> B, A -> C, A -> D (one node has multiple outgoing edges)
   * - fan-in: A -> D, B -> D, C -> D (multiple nodes converge to one)
   * - diamond: A -> B -> D, A -> C -> D (both fan-out and fan-in)
   *
   * @performance O(n) time complexity with pre-computed incoming edges
   */
  private determineChainType(path: string[]): 'linear' | 'fan-out' | 'fan-in' | 'diamond' {
    if (path.length <= 1) {
      return 'linear';
    }

    let hasFanOut = false;
    let hasFanIn = false;

    // Pre-compute incoming edges for all nodes in path (O(n))
    const incomingCounts = new Map<string, number>();
    const pathSet = new Set(path);

    for (const node of path) {
      const deps = this.graph.adjacencyList.get(node) || [];
      for (const dep of deps) {
        if (pathSet.has(dep)) {
          incomingCounts.set(dep, (incomingCounts.get(dep) || 0) + 1);
        }
      }
    }

    // Check for fan-out and fan-in patterns (O(n))
    for (let i = 0; i < path.length; i++) {
      const currentNode = path[i];
      const dependencies = this.graph.adjacencyList.get(currentNode) || [];

      // Fan-out: Current node has multiple outgoing edges in the path
      const outgoingInPath = dependencies.filter(dep => pathSet.has(dep));
      if (outgoingInPath.length > 1) {
        hasFanOut = true;
      }

      // Fan-in: Current node has multiple incoming edges
      const incoming = incomingCounts.get(currentNode) || 0;
      if (incoming > 1) {
        hasFanIn = true;
      }

      // Early exit if both patterns found
      if (hasFanOut && hasFanIn) {
        return 'diamond';
      }
    }

    // Determine pattern
    if (hasFanOut && hasFanIn) {
      return 'diamond';
    } else if (hasFanOut) {
      return 'fan-out';
    } else if (hasFanIn) {
      return 'fan-in';
    } else {
      return 'linear';
    }
  }

  /**
   * Calculate complexity score for a chain
   * @param chain - Dependency chain
   * @returns Complexity score (0-10)
   */
  calculateComplexity(chain: DependencyChain): number {
    let score = 0;

    // Length factor (longer chains = more complex)
    score += Math.min(chain.length / 2, 5);

    // Circular factor (circular = highly complex)
    if (chain.hasCircular) {
      score += 5;
    }

    return Math.min(score, 10);
  }

  /**
   * Analyze circular dependencies and return as UnifiedRelationships
   *
   * @returns Array of circular-dependency relationships
   * @public
   */
  analyzeCircularDependencies(): UnifiedRelationship[] {
    const circulars = this.detectCircularDependencies();
    const relationships: UnifiedRelationship[] = [];
    const seenCycles = new Set<string>();

    for (const circular of circulars) {
      // Create a canonical key to avoid duplicate cycles (A→B→A same as B→A→B)
      const sortedSymbols = [...circular.symbols].sort();
      const cycleKey = sortedSymbols.join('→');

      if (seenCycles.has(cycleKey)) continue;
      seenCycles.add(cycleKey);

      const timestamp = new Date().toISOString();

      // Get symbol info for evidence
      const firstSymbol = this.graph.symbols.get(circular.path[0]);
      const lastSymbol = this.graph.symbols.get(circular.path[circular.path.length - 1]);

      const relationship: UnifiedRelationship = {
        id: `circular-dependency-${sortedSymbols.join('-')}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 100), // Limit ID length
        type: 'circular-dependency',
        category: 'quality',
        from: circular.path[0],
        to: circular.path[circular.path.length - 1],
        direction: 'bidirectional',
        strength: 'strong',
        evidence: [
          {
            type: 'code',
            source: firstSymbol?.filePath || '',
            lineNumber: firstSymbol?.line,
            snippet: `Cycle: ${circular.path.join(' → ')}`,
            confidence: 1.0,
            context: `Circular dependency with ${circular.length} symbols`,
          },
        ],
        discoveredBy: 'static-analysis',
        confidence: 1.0,
        filePath: firstSymbol?.filePath,
        line: firstSymbol?.line,
        properties: {
          cyclePath: circular.path,
          cycleLength: circular.length,
          involvedSymbols: circular.symbols,
          riskLevel: circular.length > 3 ? 'high' : circular.length > 2 ? 'medium' : 'low',
        },
        createdAt: timestamp,
        updatedAt: timestamp,
        description: `Circular dependency: ${circular.path.join(' → ')}`,
      };

      relationships.push(relationship);
    }

    return relationships;
  }

  /**
   * Get statistics for circular dependencies
   *
   * @param relationships - Circular dependency relationships
   * @returns Statistics object
   * @public
   */
  getCircularStatistics(relationships: UnifiedRelationship[]): {
    totalCycles: number;
    byLength: Record<number, number>;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    affectedSymbols: Set<string>;
  } {
    const byLength: Record<number, number> = {};
    const affectedSymbols = new Set<string>();
    let highRisk = 0;
    let mediumRisk = 0;
    let lowRisk = 0;

    for (const rel of relationships) {
      const length = rel.properties?.cycleLength || 0;
      byLength[length] = (byLength[length] || 0) + 1;

      const involvedSymbols = rel.properties?.involvedSymbols as string[] || [];
      for (const sym of involvedSymbols) {
        affectedSymbols.add(sym);
      }

      const riskLevel = rel.properties?.riskLevel;
      if (riskLevel === 'high') highRisk++;
      else if (riskLevel === 'medium') mediumRisk++;
      else lowRisk++;
    }

    return {
      totalCycles: relationships.length,
      byLength,
      highRisk,
      mediumRisk,
      lowRisk,
      affectedSymbols,
    };
  }
}
