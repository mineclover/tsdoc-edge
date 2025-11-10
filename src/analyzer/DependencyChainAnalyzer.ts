/**
 * Dependency chain analyzer
 * Builds and analyzes dependency chains for circular detection and hotspot analysis
 * @packageDocumentation
 */

import type { SymbolGraph } from '../types/graph';

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
   */
  private determineChainType(path: string[]): 'linear' | 'fan-out' | 'fan-in' | 'diamond' {
    if (path.length <= 1) {
      return 'linear';
    }

    let hasFanOut = false;
    let hasFanIn = false;

    // Check each node in the path
    for (let i = 0; i < path.length - 1; i++) {
      const currentNode = path[i];
      const dependencies = this.graph.adjacencyList.get(currentNode) || [];

      // Fan-out: Current node has multiple outgoing edges
      if (dependencies.length > 1) {
        hasFanOut = true;
      }

      // Fan-in: Multiple nodes point to the same target
      if (i < path.length - 1) {
        const nextNode = path[i + 1];
        let incomingCount = 0;

        // Count how many nodes in the path point to nextNode
        for (let j = 0; j < path.length; j++) {
          if (j !== i) {
            const deps = this.graph.adjacencyList.get(path[j]) || [];
            if (deps.includes(nextNode)) {
              incomingCount++;
            }
          }
        }

        if (incomingCount > 1) {
          hasFanIn = true;
        }
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
   * Calculate risk score for a chain
   * @param chain - Dependency chain
   * @returns Risk score (0-10)
   */
  calculateRisk(chain: DependencyChain): number {
    let score = 0;

    // Long chains are risky
    if (chain.length > 5) {
      score += 3;
    }
    if (chain.length > 10) {
      score += 3;
    }

    // Circular dependencies are very risky
    if (chain.hasCircular) {
      score += 4;
    }

    return Math.min(score, 10);
  }
}
