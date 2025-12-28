/**
 * Symbol search engine for querying and finding symbols
 * @packageDocumentation
 */

import type { Symbol, SymbolQuery, SymbolQueryResult } from '../types/graph';
import type { SymbolGraphBuilder } from './SymbolGraphBuilder';

/**
 * Search engine for finding symbols based on various criteria
 *
 * @id 004
 * @public
 * @responsibility Provide fast and flexible symbol search capabilities
 * @contract Execute multi-criteria symbol queries with filtering
 * @architecture Query layer over symbol graph
 * @testScenario Search by name pattern
 * @testScenario Search by type
 * @testScenario Search by relationship
 * @testScenario Complex multi-criteria search
 * @testScenario Find undocumented symbols
 * @testScenario Find untested symbols
 * @doc [[SymbolGraphFeatures#Search]]
 *
 * @problem Need efficient multi-criteria queries on symbol graph with complex filters (name, type, relationships, documentation status)
 * @solves Provides unified query interface with regex pattern matching and relationship-based filtering
 * @context CLI commands and validators need to quickly find symbols matching specific criteria for analysis and reporting
 *
 * @functionality
 * - Multi-criteria search: Name pattern, type, file path, documentation status
 * - Relationship filtering: Find symbols by dependencies or reverse dependencies
 * - Specialized finders: Undocumented, untested, orphaned, missing responsibility/contract
 * - Performance tracking: Measures query execution time
 * - Regex support: Case-insensitive pattern matching for flexible queries
 *
 * @decision Use filter chaining instead of SQL-like query builder
 * @rationale Simpler implementation, no query parsing needed, leverages native Array.filter performance
 * @consequences Straightforward code, easy to extend with new filters, performance scales with filter count
 *
 * @depends SymbolGraphBuilder
 * @depType internal
 * @depReason Requires access to complete symbol graph for querying
 */
export class SymbolSearchEngine {
  private graphBuilder: SymbolGraphBuilder;

  /**
   * Creates a new SymbolSearchEngine
   * @param graphBuilder - Symbol graph builder to search
   */
  constructor(graphBuilder: SymbolGraphBuilder) {
    this.graphBuilder = graphBuilder;
  }

  /**
   * Execute a symbol search query
   * @param query - Search query parameters
   * @returns Query results with matching symbols
   * @testScenario Search by name pattern
   * @testScenario Search by type
   * @testScenario Search by relationship
   * @testScenario Complex multi-criteria search
   */
  search(query: SymbolQuery): SymbolQueryResult {
    const startTime = performance.now();
    let results = this.graphBuilder.getAllSymbols();

    // Filter by name pattern
    if (query.name) {
      const nameRegex = new RegExp(query.name, 'i');
      results = results.filter((s) => nameRegex.test(s.name));
    }

    // Filter by type
    if (query.type) {
      results = results.filter((s) => s.type === query.type);
    }

    // Filter by file path
    if (query.filePath) {
      const pathRegex = new RegExp(query.filePath, 'i');
      results = results.filter((s) => pathRegex.test(s.filePath));
    }

    // Filter by contract existence
    if (query.hasContract !== undefined) {
      results = results.filter((s) => !!s.contract === query.hasContract);
    }

    // Filter by testing existence
    if (query.hasTesting !== undefined) {
      results = results.filter((s) => s.tests.length > 0 === query.hasTesting);
    }

    // Filter by public API
    if (query.isPublic !== undefined) {
      results = results.filter((s) => s.isPublic === query.isPublic);
    }

    // Filter by relationships
    if (query.relatedTo) {
      results = this.filterByRelationship(results, query.relatedTo, 'any');
    }

    if (query.dependsOn) {
      results = this.filterByRelationship(results, query.dependsOn, 'dependsOn');
    }

    if (query.usedBy) {
      results = this.filterByRelationship(results, query.usedBy, 'usedBy');
    }

    const endTime = performance.now();

    return {
      symbols: results,
      totalCount: results.length,
      executionTime: endTime - startTime,
    };
  }

  /**
   * Filter symbols by relationship to another symbol
   * @param symbols - Symbols to filter
   * @param targetName - Target symbol name
   * @param relationType - Type of relationship
   * @returns Filtered symbols
   */
  private filterByRelationship(
    symbols: Symbol[],
    targetName: string,
    relationType: 'any' | 'dependsOn' | 'usedBy'
  ): Symbol[] {
    const targetSymbols = this.graphBuilder.getSymbolsByName(targetName);
    const targetIds = new Set(targetSymbols.map((s) => s.id));

    return symbols.filter((symbol) => {
      if (relationType === 'dependsOn') {
        const deps = this.graphBuilder.getDependencies(symbol.id);
        return deps.some((depId) => targetIds.has(depId));
      } else if (relationType === 'usedBy') {
        const dependents = this.graphBuilder.getDependents(symbol.id);
        return dependents.some((depId) => targetIds.has(depId));
      } else {
        // any relationship
        const deps = this.graphBuilder.getDependencies(symbol.id);
        const dependents = this.graphBuilder.getDependents(symbol.id);
        return (
          deps.some((depId) => targetIds.has(depId)) ||
          dependents.some((depId) => targetIds.has(depId))
        );
      }
    });
  }

  /**
   * Find symbols with no documentation
   * @returns Undocumented symbols
   */
  findUndocumented(): Symbol[] {
    return this.graphBuilder.getAllSymbols().filter((s) => !s.summary || s.summary.trim() === '');
  }

  /**
   * Find symbols with no tests
   * @returns Untested symbols
   */
  findUntested(): Symbol[] {
    return this.graphBuilder.getAllSymbols().filter((s) => s.tests.length === 0);
  }

  /**
   * Find symbols with no defined responsibility
   * @returns Symbols without responsibility
   */
  findWithoutResponsibility(): Symbol[] {
    return this.graphBuilder.getAllSymbols().filter((s) => !s.responsibility);
  }

  /**
   * Find symbols with no contract
   * @returns Symbols without contract
   */
  findWithoutContract(): Symbol[] {
    return this.graphBuilder.getAllSymbols().filter((s) => !s.contract);
  }

  /**
   * Find orphaned symbols (no relationships)
   * @returns Orphaned symbols
   */
  findOrphaned(): Symbol[] {
    return this.graphBuilder.getAllSymbols().filter((s) => {
      const deps = this.graphBuilder.getDependencies(s.id);
      const dependents = this.graphBuilder.getDependents(s.id);
      return deps.length === 0 && dependents.length === 0 && !s.isExported;
    });
  }

  /**
   * Find symbols by tag or annotation
   * @param _tag - Tag to search for (e.g., "deprecated", "internal")
   * @returns Symbols with the tag
   */
  findByTag(_tag: string): Symbol[] {
    // This would require parsing tag information from the doc comments
    // For now, return empty array - to be implemented with enhanced parser
    return [];
  }

  /**
   * Get symbol path (dependency chain from root to symbol)
   * @param symbolId - Target symbol ID
   * @returns Path of symbol IDs from root to target
   */
  getSymbolPath(symbolId: string): string[][] {
    const paths: string[][] = [];
    const visited = new Set<string>();

    const dfs = (currentId: string, path: string[]): void => {
      if (currentId === symbolId) {
        paths.push([...path, currentId]);
        return;
      }

      if (visited.has(currentId)) {
        return;
      }

      visited.add(currentId);
      const deps = this.graphBuilder.getDependencies(currentId);

      /**
       * depId
       * @public
       */
      for (const depId of deps) {
        dfs(depId, [...path, currentId]);
      }

      visited.delete(currentId);
    };

    // Find all root symbols (symbols with no dependents from exported symbols)
    const roots = this.graphBuilder
      .getAllSymbols()
      .filter((s) => s.isExported && this.graphBuilder.getDependents(s.id).length === 0);

    /**
     * root
     * @public
     */
    for (const root of roots) {
      dfs(root.id, []);
    }

    return paths;
  }

  /**
   * Get related documentation for implementing a symbol
   * Returns symbols that contain information necessary for implementing the target symbol
   *
   * @param symbolId - Target symbol ID
   * @param maxDistance - Maximum relationship distance to search (default: 2)
   * @returns Related symbols with relevance scores
   * @public
   * @responsibility Find nearest and most relevant symbols for implementation context
   * @contract Return symbols ordered by relevance, including dependencies, dependents, and co-located symbols
   */
  getRelatedDocumentation(
    symbolId: string,
    maxDistance: number = 2
  ): Array<{ symbol: Symbol; relevance: number; reason: string }> {
    const targetSymbol = this.graphBuilder.getSymbol(symbolId);
    if (!targetSymbol) {
      return [];
    }

    const related: Map<string, { symbol: Symbol; relevance: number; reasons: Set<string> }> =
      new Map();

    // 1. Direct dependencies (highest relevance)
    const directDeps = this.graphBuilder.getDependencies(symbolId);
    for (const depId of directDeps) {
      const depSymbol = this.graphBuilder.getSymbol(depId);
      if (depSymbol) {
        this.addRelated(related, depSymbol, 1.0, 'direct dependency');
      }
    }

    // 2. Direct dependents (high relevance for understanding usage)
    const directDependents = this.graphBuilder.getDependents(symbolId);
    for (const depId of directDependents) {
      const depSymbol = this.graphBuilder.getSymbol(depId);
      if (depSymbol) {
        this.addRelated(related, depSymbol, 0.8, 'used by');
      }
    }

    // 3. Symbols in the same file (medium-high relevance)
    const sameFileSymbols = this.graphBuilder
      .getAllSymbols()
      .filter((s) => s.filePath === targetSymbol.filePath && s.id !== symbolId);
    for (const symbol of sameFileSymbols) {
      this.addRelated(related, symbol, 0.6, 'co-located in same file');
    }

    // 4. Transitive dependencies (if maxDistance > 1)
    if (maxDistance > 1) {
      const transitiveDeps = this.getTransitiveDependencies(symbolId, maxDistance);
      for (const depId of transitiveDeps) {
        if (!directDeps.includes(depId)) {
          const depSymbol = this.graphBuilder.getSymbol(depId);
          if (depSymbol) {
            this.addRelated(related, depSymbol, 0.4, 'transitive dependency');
          }
        }
      }
    }

    // 5. Symbols with same responsibility (medium relevance)
    if (targetSymbol.responsibility) {
      const sameResponsibility = this.graphBuilder
        .getAllSymbols()
        .filter(
          (s) =>
            s.id !== symbolId &&
            s.responsibility &&
            s.responsibility.description === targetSymbol.responsibility?.description
        );
      for (const symbol of sameResponsibility) {
        this.addRelated(related, symbol, 0.5, 'shared responsibility');
      }
    }

    // 6. Symbols with related contracts (medium relevance)
    if (targetSymbol.contract) {
      const targetContract = targetSymbol.contract;
      const relatedContracts = this.graphBuilder
        .getAllSymbols()
        .filter(
          (s) =>
            s.id !== symbolId && s.contract && this.contractsRelated(s.contract, targetContract)
        );
      for (const symbol of relatedContracts) {
        this.addRelated(related, symbol, 0.5, 'related contract');
      }
    }

    // Convert to array and sort by relevance
    return Array.from(related.values())
      .map((item) => ({
        symbol: item.symbol,
        relevance: item.relevance,
        reason: Array.from(item.reasons).join(', '),
      }))
      .sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Add or update related symbol with relevance score
   * @param related - Map of related symbols
   * @param symbol - Symbol to add
   * @param relevance - Relevance score
   * @param reason - Reason for relation
   */
  private addRelated(
    related: Map<string, { symbol: Symbol; relevance: number; reasons: Set<string> }>,
    symbol: Symbol,
    relevance: number,
    reason: string
  ): void {
    const existing = related.get(symbol.id);
    if (existing) {
      existing.relevance = Math.max(existing.relevance, relevance);
      existing.reasons.add(reason);
    } else {
      related.set(symbol.id, {
        symbol,
        relevance,
        reasons: new Set([reason]),
      });
    }
  }

  /**
   * Get transitive dependencies up to a certain distance
   * @param symbolId - Starting symbol ID
   * @param maxDistance - Maximum distance to traverse
   * @returns Array of symbol IDs
   */
  private getTransitiveDependencies(symbolId: string, maxDistance: number): string[] {
    const visited = new Set<string>();
    const queue: Array<{ id: string; distance: number }> = [{ id: symbolId, distance: 0 }];
    const result: string[] = [];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;

      if (visited.has(current.id) || current.distance >= maxDistance) {
        continue;
      }

      visited.add(current.id);

      const deps = this.graphBuilder.getDependencies(current.id);
      for (const depId of deps) {
        if (!visited.has(depId)) {
          queue.push({ id: depId, distance: current.distance + 1 });
          if (current.distance + 1 <= maxDistance && depId !== symbolId) {
            result.push(depId);
          }
        }
      }
    }

    return result;
  }

  /**
   * Check if two contracts are related
   * @param contract1 - First contract
   * @param contract2 - Second contract
   * @returns True if contracts are related
   */
  private contractsRelated(
    contract1: { preconditions: string[]; postconditions: string[] },
    contract2: { preconditions: string[]; postconditions: string[] }
  ): boolean {
    // Check if postconditions of one match preconditions of another
    for (const post of contract1.postconditions) {
      if (contract2.preconditions.some((pre) => this.conditionsOverlap(pre, post))) {
        return true;
      }
    }
    for (const post of contract2.postconditions) {
      if (contract1.preconditions.some((pre) => this.conditionsOverlap(pre, post))) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if two conditions overlap (simple keyword matching)
   * @param condition1 - First condition
   * @param condition2 - Second condition
   * @returns True if conditions overlap
   */
  private conditionsOverlap(condition1: string, condition2: string): boolean {
    const words1 = new Set(
      condition1
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 3)
    );
    const words2 = new Set(
      condition2
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 3)
    );

    let commonWords = 0;
    for (const word of words1) {
      if (words2.has(word)) {
        commonWords++;
      }
    }

    return commonWords >= 2; // At least 2 common significant words
  }
}
