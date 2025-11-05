/**
 * Symbol graph builder for tracking relationships and connectivity
 * @packageDocumentation
 */

import type { Symbol, SymbolGraph, SymbolRelationship } from '../types/graph';

/**
 * Builds and maintains a graph of all symbols and their relationships
 *
 * @id 006
 * @public
 * @responsibility Build and maintain symbol graph structure
 * @contract Initialize empty symbol graph and provide symbol/relationship management
 * @architecture Core component for connectivity tracking
 * @testScenario Add symbols to graph
 * @testScenario Add relationships between symbols
 * @testScenario Search by name and file path
 * @testScenario Find dependencies and reverse dependencies
 * @doc [[SymbolGraphFeatures#Builder]]
 *
 * @problem Need to track all code symbols and their relationships across the entire codebase
 * @solves Provides a centralized graph data structure with efficient indexing for name, file, and dependency lookups
 * @context TypeScript projects have complex dependency chains that need to be analyzed for documentation connectivity and SSOT compliance
 *
 * @functionality
 * - Symbol management: Add, retrieve, search symbols by ID, name, or file
 * - Relationship tracking: Manage dependencies and reverse dependencies between symbols
 * - Index maintenance: Automatic indexing by name and file path for fast lookups
 * - Graph analysis: Circular dependency detection, statistics calculation
 * - Adjacency lists: Bidirectional adjacency lists for efficient traversal
 *
 * @decision Use adjacency list representation instead of adjacency matrix
 * @rationale Sparse graphs (most symbols don't depend on each other) benefit from adjacency lists with O(1) edge lookup and O(V+E) space complexity
 * @consequences Better memory efficiency for large codebases, efficient DFS/BFS traversal for dependency analysis
 *
 * @depends Symbol, SymbolGraph, SymbolRelationship
 * @depType internal
 * @depReason Core type definitions for graph structure
 */
export class SymbolGraphBuilder {
  private graph: SymbolGraph;

  /**
   * Creates a new SymbolGraphBuilder instance
   * @contract Initialize empty symbol graph
   */
  constructor() {
    this.graph = {
      symbols: new Map(),
      relationships: [],
      nameIndex: new Map(),
      fileIndex: new Map(),
      adjacencyList: new Map(),
      reverseAdjacencyList: new Map(),
    };
  }

  /**
   * Add a symbol to the graph
   * @param symbol - Symbol to add
   * @precondition Symbol must have unique ID
   * @postcondition Symbol is indexed and searchable
   * @returns void - No return value
   */
  addSymbol(symbol: Symbol): void {
    // Add to main symbols map
    this.graph.symbols.set(symbol.id, symbol);

    // Update name index
    const nameEntry = this.graph.nameIndex.get(symbol.name) || [];
    nameEntry.push(symbol.id);
    this.graph.nameIndex.set(symbol.name, nameEntry);

    // Update file index
    const fileEntry = this.graph.fileIndex.get(symbol.filePath) || [];
    fileEntry.push(symbol.id);
    this.graph.fileIndex.set(symbol.filePath, fileEntry);

    // Initialize adjacency lists
    if (!this.graph.adjacencyList.has(symbol.id)) {
      this.graph.adjacencyList.set(symbol.id, []);
    }
    if (!this.graph.reverseAdjacencyList.has(symbol.id)) {
      this.graph.reverseAdjacencyList.set(symbol.id, []);
    }
  }

  /**
   * Add a relationship between symbols
   * @param relationship - Relationship to add
   * @precondition Both from and to symbols must exist in graph
   * @postcondition Relationship is tracked in adjacency lists
   * @returns void - No return value
   */
  addRelationship(relationship: SymbolRelationship): void {
    this.graph.relationships.push(relationship);

    // Update adjacency list (from -> to)
    const adjacent = this.graph.adjacencyList.get(relationship.from) || [];
    if (!adjacent.includes(relationship.to)) {
      adjacent.push(relationship.to);
      this.graph.adjacencyList.set(relationship.from, adjacent);
    }

    // Update reverse adjacency list (to <- from)
    const reverseAdjacent = this.graph.reverseAdjacencyList.get(relationship.to) || [];
    if (!reverseAdjacent.includes(relationship.from)) {
      reverseAdjacent.push(relationship.from);
      this.graph.reverseAdjacencyList.set(relationship.to, reverseAdjacent);
    }
  }

  /**
   * Get a symbol by ID
   * @param id - Symbol ID
   * @returns Symbol or undefined if not found
   */
  getSymbol(id: string): Symbol | undefined {
    return this.graph.symbols.get(id);
  }

  /**
   * Get symbols by name
   * @param name - Symbol name
   * @returns Array of matching symbols
   */
  getSymbolsByName(name: string): Symbol[] {
    const ids = this.graph.nameIndex.get(name) || [];
    return ids.map((id) => this.graph.symbols.get(id)).filter((s): s is Symbol => !!s);
  }

  /**
   * Get all symbols in a file
   * @param filePath - File path
   * @returns Array of symbols in the file
   */
  getSymbolsInFile(filePath: string): Symbol[] {
    const ids = this.graph.fileIndex.get(filePath) || [];
    return ids.map((id) => this.graph.symbols.get(id)).filter((s): s is Symbol => !!s);
  }

  /**
   * Get all relationships for a symbol
   * @param symbolId - Symbol ID
   * @returns Array of relationships
   */
  getRelationships(symbolId: string): SymbolRelationship[] {
    return this.graph.relationships.filter((r) => r.from === symbolId || r.to === symbolId);
  }

  /**
   * Get symbols that the given symbol depends on
   * @param symbolId - Symbol ID
   * @returns Array of dependency symbol IDs
   */
  getDependencies(symbolId: string): string[] {
    return this.graph.adjacencyList.get(symbolId) || [];
  }

  /**
   * Get symbols that depend on the given symbol
   * @param symbolId - Symbol ID
   * @returns Array of dependent symbol IDs
   */
  getDependents(symbolId: string): string[] {
    return this.graph.reverseAdjacencyList.get(symbolId) || [];
  }

  /**
   * Detect circular dependencies in the graph
   * @returns Array of circular dependency chains
   * @testScenario Simple cycle: A -> B -> A
   * @testScenario Complex cycle: A -> B -> C -> A
   * @testScenario No cycles
   */
  detectCircularDependencies(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (symbolId: string, path: string[]): void => {
      visited.add(symbolId);
      recursionStack.add(symbolId);
      path.push(symbolId);

      const dependencies = this.getDependencies(symbolId);
      /**
       * depId
       * @public
       */
      for (const depId of dependencies) {
        if (!visited.has(depId)) {
          dfs(depId, [...path]);
        } else if (recursionStack.has(depId)) {
          // Found a cycle
          const cycleStart = path.indexOf(depId);
          const cycle = path.slice(cycleStart);
          cycle.push(depId); // Complete the cycle
          cycles.push(cycle);
        }
      }

      recursionStack.delete(symbolId);
    };

    /**
     * symbolId
     * @public
     */
    for (const symbolId of this.graph.symbols.keys()) {
      if (!visited.has(symbolId)) {
        dfs(symbolId, []);
      }
    }

    return cycles;
  }

  /**
   * Get the complete symbol graph
   * @returns The symbol graph
   */
  getGraph(): SymbolGraph {
    return this.graph;
  }

  /**
   * Get all symbols
   * @returns Array of all symbols
   */
  getAllSymbols(): Symbol[] {
    return Array.from(this.graph.symbols.values());
  }

  /**
   * Clear the graph
   * @postcondition Graph is empty
   * @returns void - No return value
   */
  clear(): void {
    this.graph.symbols.clear();
    this.graph.relationships = [];
    this.graph.nameIndex.clear();
    this.graph.fileIndex.clear();
    this.graph.adjacencyList.clear();
    this.graph.reverseAdjacencyList.clear();
  }

  /**
   * Get graph statistics
   * @returns Statistics about the graph
   */
  getStatistics(): {
    totalSymbols: number;
    totalRelationships: number;
    avgDependencies: number;
    maxDependencies: number;
    orphanedSymbols: number;
  } {
    const totalSymbols = this.graph.symbols.size;
    const totalRelationships = this.graph.relationships.length;

    let totalDeps = 0;
    let maxDeps = 0;
    let orphaned = 0;

    /**
     * symbolId
     * @public
     */
    for (const symbolId of this.graph.symbols.keys()) {
      const deps = this.getDependencies(symbolId).length;
      const dependents = this.getDependents(symbolId).length;

      totalDeps += deps;
      maxDeps = Math.max(maxDeps, deps);

      if (deps === 0 && dependents === 0) {
        orphaned++;
      }
    }

    return {
      totalSymbols,
      totalRelationships,
      avgDependencies: totalSymbols > 0 ? totalDeps / totalSymbols : 0,
      maxDependencies: maxDeps,
      orphanedSymbols: orphaned,
    };
  }
}
