/**
 * Depth-based symbol graph traversal
 * @packageDocumentation
 * @responsibility Traverse symbol graph by depth levels
 */

import type { Symbol } from '../types/graph';
import type { SymbolGraphBuilder } from './SymbolGraphBuilder';

/**
 * Traversal direction
 * @public
 */
export type TraversalDirection = 'dependencies' | 'dependents' | 'both';

/**
 * Traversal options
 * @public
 */
export interface TraversalOptions {
  /**
   * Maximum depth to traverse
   */
  maxDepth: number;

  /**
   * Traversal direction
   */
  direction: TraversalDirection;

  /**
   * Filter function for symbols
   */
  filter?: (symbol: Symbol) => boolean;
}

/**
 * Result of depth traversal
 * @public
 */
export interface TraversalResult {
  /**
   * Symbols grouped by depth level
   */
  symbolsByDepth: Map<number, Symbol[]>;

  /**
   * Total symbols found
   */
  totalSymbols: number;

  /**
   * Maximum depth reached
   */
  maxDepthReached: number;
}

/**
 * Traverses symbol graph by depth levels using BFS
 *
 * @doc [[SymbolGraphFeatures#Traversal]]
 * @public
 */
export class DepthTraverser {
  private graphBuilder: SymbolGraphBuilder;

  /**
   * Creates a new DepthTraverser
   * @param graphBuilder - Symbol graph builder
   */
  constructor(graphBuilder: SymbolGraphBuilder) {
    this.graphBuilder = graphBuilder;
  }

  /**
   * Traverse from entry points to specified depth
   *
   * @param entryPoints - Starting symbol IDs
   * @param options - Traversal options
   * @returns Traversal result with symbols grouped by depth
   */
  traverse(entryPoints: string[], options: TraversalOptions): TraversalResult {
    const symbolsByDepth = new Map<number, Symbol[]>();
    const visited = new Set<string>();
    const queue: Array<{ symbolId: string; depth: number }> = [];

    // Initialize with entry points at depth 0
    for (const symbolId of entryPoints) {
      queue.push({ symbolId, depth: 0 });
      visited.add(symbolId);
    }

    let maxDepthReached = 0;

    // BFS traversal
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;

      const { symbolId, depth } = item;

      // Skip if exceeded max depth
      if (depth > options.maxDepth) {
        continue;
      }

      // Get symbol
      const symbol = this.graphBuilder.getSymbol(symbolId);
      if (!symbol) {
        continue;
      }

      // Apply filter if provided
      if (options.filter && !options.filter(symbol)) {
        continue;
      }

      // Add to current depth level
      const currentLevel = symbolsByDepth.get(depth) || [];
      currentLevel.push(symbol);
      symbolsByDepth.set(depth, currentLevel);

      maxDepthReached = Math.max(maxDepthReached, depth);

      // Get next level symbols
      if (depth < options.maxDepth) {
        const nextSymbols = this.getNextSymbols(symbolId, options.direction);

        for (const nextId of nextSymbols) {
          if (!visited.has(nextId)) {
            visited.add(nextId);
            queue.push({ symbolId: nextId, depth: depth + 1 });
          }
        }
      }
    }

    // Count total symbols
    let totalSymbols = 0;
    for (const symbols of symbolsByDepth.values()) {
      totalSymbols += symbols.length;
    }

    return {
      symbolsByDepth,
      totalSymbols,
      maxDepthReached,
    };
  }

  /**
   * Get next symbols based on direction
   *
   * @param symbolId - Current symbol ID
   * @param direction - Traversal direction
   * @returns Array of next symbol IDs
   */
  private getNextSymbols(symbolId: string, direction: TraversalDirection): string[] {
    const result: string[] = [];

    if (direction === 'dependencies' || direction === 'both') {
      const deps = this.graphBuilder.getDependencies(symbolId);
      result.push(...deps);
    }

    if (direction === 'dependents' || direction === 'both') {
      const users = this.graphBuilder.getDependents(symbolId);
      result.push(...users);
    }

    return result;
  }

  /**
   * Get all exported symbols as entry points
   *
   * @returns Array of exported symbol IDs
   */
  getExportedSymbols(): string[] {
    const allSymbols = this.graphBuilder.getAllSymbols();
    return allSymbols.filter((s) => s.isExported).map((s) => s.id);
  }

  /**
   * Find symbol by name
   *
   * @param name - Symbol name
   * @returns Symbol ID or null if not found
   */
  findSymbolByName(name: string): string | null {
    const allSymbols = this.graphBuilder.getAllSymbols();
    const symbol = allSymbols.find((s) => s.name === name);
    return symbol ? symbol.id : null;
  }
}
