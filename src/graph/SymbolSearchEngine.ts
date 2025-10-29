/**
 * Symbol search engine for querying and finding symbols
 * @packageDocumentation
 */

import { Symbol, SymbolQuery, SymbolQueryResult } from '../types/graph';
import { SymbolGraphBuilder } from './SymbolGraphBuilder';

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
   * @param tag - Tag to search for (e.g., "deprecated", "internal")
   * @returns Symbols with the tag
   */
  findByTag(tag: string): Symbol[] {
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

      for (const depId of deps) {
        dfs(depId, [...path, currentId]);
      }

      visited.delete(currentId);
    };

    // Find all root symbols (symbols with no dependents from exported symbols)
    const roots = this.graphBuilder
      .getAllSymbols()
      .filter((s) => s.isExported && this.graphBuilder.getDependents(s.id).length === 0);

    for (const root of roots) {
      dfs(root.id, []);
    }

    return paths;
  }
}
