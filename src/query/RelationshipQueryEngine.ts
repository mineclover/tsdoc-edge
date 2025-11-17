/**
 * Relationship Query Engine
 * @packageDocumentation
 * @responsibility Provide high-level relationship querying capabilities
 *
 * @problem Need to traverse relationship graph efficiently to gather context
 * @solves Provides fluent API for relationship queries with filtering and traversal
 * @context SSOT principle: Minimal context, maximum information through relationships
 *
 * @doc [[RelationshipQueryEngine]]
 */

import type { DatabaseManager } from '../storage/DatabaseManager';
import type { UnifiedRelationship, RelationshipType, RelationshipCategory } from '../types/relationships/unified';

/**
 * Query options for relationship traversal
 * @public
 */
export interface RelationshipQueryOptions {
  /** Filter by relationship types */
  types?: RelationshipType[];

  /** Filter by relationship categories */
  categories?: RelationshipCategory[];

  /** Maximum depth for graph traversal */
  maxDepth?: number;

  /** Include reverse relationships (incoming edges) */
  includeReverse?: boolean;

  /** Minimum confidence threshold */
  minConfidence?: number;

  /** Exclude specific relationship types */
  excludeTypes?: RelationshipType[];
}

/**
 * Relationship query result with context
 * @public
 */
export interface RelationshipContext {
  /** Target symbol ID */
  symbolId: string;

  /** Direct relationships (1-hop) */
  direct: UnifiedRelationship[];

  /** Indirect relationships (2+ hops) */
  indirect: UnifiedRelationship[];

  /** Related symbols grouped by relationship type */
  byType: Record<string, string[]>;

  /** Related symbols grouped by category */
  byCategory: Record<string, string[]>;

  /** Documentation references */
  documentation: string[];

  /** Test coverage */
  tests: string[];

  /** Code dependencies */
  dependencies: string[];

  /** Semantic neighbors (same domain/feature) */
  semanticNeighbors: string[];
}

/**
 * Relationship Query Engine
 *
 * Provides fluent API for querying and traversing the relationship graph.
 *
 * @public
 * @example
 * ```typescript
 * const engine = new RelationshipQueryEngine(dbManager);
 *
 * // Get all relationships for a symbol
 * const context = engine.getContext('class-databasemanager');
 *
 * // Find related documentation
 * const docs = engine.findRelated('class-databasemanager', { types: ['doc-reference'] });
 *
 * // Traverse relationship graph
 * const neighbors = engine.traverse('class-databasemanager', { maxDepth: 2 });
 * ```
 */
export class RelationshipQueryEngine {
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  /**
   * Get comprehensive relationship context for a symbol
   *
   * @param symbolId - Target symbol ID
   * @param options - Query options
   * @returns Relationship context with all connected symbols
   *
   * @example
   * ```typescript
   * const context = engine.getContext('class-databasemanager');
   * console.log(`Documentation: ${context.documentation.join(', ')}`);
   * console.log(`Tests: ${context.tests.length} test cases`);
   * console.log(`Dependencies: ${context.dependencies.length} modules`);
   * ```
   */
  getContext(symbolId: string, options: RelationshipQueryOptions = {}): RelationshipContext {
    const allRelationships = this.db.getAllUnifiedRelationships();

    // Filter relationships
    const filtered = this.filterRelationships(allRelationships, options);

    // Find direct relationships
    const direct = filtered.filter(rel => {
      const from = Array.isArray(rel.from) ? rel.from : [rel.from];
      const to = Array.isArray(rel.to) ? rel.to : [rel.to];
      return from.includes(symbolId) || to.includes(symbolId);
    });

    // Find indirect relationships (2-hop)
    const directSymbols = new Set<string>();
    for (const rel of direct) {
      const from = Array.isArray(rel.from) ? rel.from : [rel.from];
      const to = Array.isArray(rel.to) ? rel.to : [rel.to];
      [...from, ...to].forEach(s => {
        if (s !== symbolId) directSymbols.add(s);
      });
    }

    const indirect = filtered.filter(rel => {
      const from = Array.isArray(rel.from) ? rel.from : [rel.from];
      const to = Array.isArray(rel.to) ? rel.to : [rel.to];
      const symbols = [...from, ...to];

      // Must connect to a direct neighbor but not include the original symbol
      return symbols.some(s => directSymbols.has(s)) && !symbols.includes(symbolId);
    });

    // Group by type
    const byType: Record<string, string[]> = {};
    for (const rel of direct) {
      if (!byType[rel.type]) byType[rel.type] = [];
      const to = Array.isArray(rel.to) ? rel.to : [rel.to];
      to.forEach(t => {
        if (t !== symbolId && !byType[rel.type].includes(t)) {
          byType[rel.type].push(t);
        }
      });
    }

    // Group by category
    const byCategory: Record<string, string[]> = {};
    for (const rel of direct) {
      if (!byCategory[rel.category]) byCategory[rel.category] = [];
      const to = Array.isArray(rel.to) ? rel.to : [rel.to];
      to.forEach(t => {
        if (t !== symbolId && !byCategory[rel.category].includes(t)) {
          byCategory[rel.category].push(t);
        }
      });
    }

    // Extract specific relationship types
    const documentation = byType['doc-reference'] || [];
    const tests = [
      ...(byType['test-coverage'] || []),
      ...(byType['contains'] || []),
    ];
    const dependencies = byType['code-dependency'] || [];
    const semanticNeighbors = [
      ...(byType['naming-pattern-relation'] || []),
      ...(byType['feature-grouping'] || []),
      ...(byType['explicit-semantic-relation'] || []),
    ];

    return {
      symbolId,
      direct,
      indirect,
      byType,
      byCategory,
      documentation,
      tests,
      dependencies,
      semanticNeighbors,
    };
  }

  /**
   * Find related symbols matching specific criteria
   *
   * @param symbolId - Source symbol ID
   * @param options - Query options
   * @returns Array of related symbol IDs
   *
   * @example
   * ```typescript
   * // Find all documentation for this symbol
   * const docs = engine.findRelated('class-databasemanager', {
   *   types: ['doc-reference']
   * });
   *
   * // Find semantic neighbors
   * const neighbors = engine.findRelated('class-databasemanager', {
   *   categories: ['semantic']
   * });
   * ```
   */
  findRelated(symbolId: string, options: RelationshipQueryOptions = {}): string[] {
    const context = this.getContext(symbolId, options);

    const related = new Set<string>();
    for (const rel of context.direct) {
      const from = Array.isArray(rel.from) ? rel.from : [rel.from];
      const to = Array.isArray(rel.to) ? rel.to : [rel.to];
      [...from, ...to].forEach(s => {
        if (s !== symbolId) related.add(s);
      });
    }

    return Array.from(related);
  }

  /**
   * Traverse relationship graph with depth control
   *
   * @param symbolId - Starting symbol ID
   * @param options - Query options with maxDepth
   * @returns Map of symbol IDs to their depth from source
   *
   * @example
   * ```typescript
   * // Find all symbols within 2 hops
   * const neighbors = engine.traverse('class-databasemanager', { maxDepth: 2 });
   *
   * // Get symbols at each depth level
   * for (const [symbol, depth] of neighbors) {
   *   console.log(`${symbol} is ${depth} hops away`);
   * }
   * ```
   */
  traverse(symbolId: string, options: RelationshipQueryOptions = {}): Map<string, number> {
    const maxDepth = options.maxDepth || 1;
    const visited = new Map<string, number>();
    const queue: Array<{ symbol: string; depth: number }> = [{ symbol: symbolId, depth: 0 }];

    visited.set(symbolId, 0);

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.depth >= maxDepth) continue;

      // Find neighbors
      const neighbors = this.findRelated(current.symbol, options);

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          const depth = current.depth + 1;
          visited.set(neighbor, depth);
          queue.push({ symbol: neighbor, depth });
        }
      }
    }

    return visited;
  }

  /**
   * Get relationship path between two symbols
   *
   * @param fromId - Source symbol ID
   * @param toId - Target symbol ID
   * @param options - Query options
   * @returns Array of symbol IDs representing the path, or null if no path found
   *
   * @example
   * ```typescript
   * const path = engine.findPath('class-buildcommand', 'class-databasemanager');
   * if (path) {
   *   console.log(`Path: ${path.join(' → ')}`);
   * }
   * ```
   */
  findPath(fromId: string, toId: string, options: RelationshipQueryOptions = {}): string[] | null {
    const visited = new Set<string>();
    const queue: Array<{ symbol: string; path: string[] }> = [{ symbol: fromId, path: [fromId] }];

    visited.add(fromId);

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.symbol === toId) {
        return current.path;
      }

      // Find neighbors
      const neighbors = this.findRelated(current.symbol, options);

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({
            symbol: neighbor,
            path: [...current.path, neighbor],
          });
        }
      }
    }

    return null;
  }

  /**
   * Filter relationships based on query options
   * @private
   */
  private filterRelationships(
    relationships: UnifiedRelationship[],
    options: RelationshipQueryOptions
  ): UnifiedRelationship[] {
    let filtered = relationships;

    // Filter by types
    if (options.types && options.types.length > 0) {
      filtered = filtered.filter(rel => options.types!.includes(rel.type as RelationshipType));
    }

    // Filter by categories
    if (options.categories && options.categories.length > 0) {
      filtered = filtered.filter(rel => options.categories!.includes(rel.category as RelationshipCategory));
    }

    // Filter by confidence
    if (options.minConfidence !== undefined) {
      filtered = filtered.filter(rel => rel.confidence >= options.minConfidence!);
    }

    // Exclude types
    if (options.excludeTypes && options.excludeTypes.length > 0) {
      filtered = filtered.filter(rel => !options.excludeTypes!.includes(rel.type as RelationshipType));
    }

    return filtered;
  }

  /**
   * Get statistics about relationships for a symbol
   *
   * @param symbolId - Target symbol ID
   * @returns Statistics object
   *
   * @example
   * ```typescript
   * const stats = engine.getStatistics('class-databasemanager');
   * console.log(`Total relationships: ${stats.total}`);
   * console.log(`Documentation coverage: ${stats.documentation > 0 ? 'Yes' : 'No'}`);
   * ```
   */
  getStatistics(symbolId: string): {
    total: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
    documentation: number;
    tests: number;
    dependencies: number;
    semanticNeighbors: number;
  } {
    const context = this.getContext(symbolId);

    const byType: Record<string, number> = {};
    for (const type in context.byType) {
      byType[type] = context.byType[type].length;
    }

    const byCategory: Record<string, number> = {};
    for (const cat in context.byCategory) {
      byCategory[cat] = context.byCategory[cat].length;
    }

    return {
      total: context.direct.length,
      byType,
      byCategory,
      documentation: context.documentation.length,
      tests: context.tests.length,
      dependencies: context.dependencies.length,
      semanticNeighbors: context.semanticNeighbors.length,
    };
  }
}
