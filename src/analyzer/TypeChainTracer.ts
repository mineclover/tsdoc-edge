/**
 * Traces type dependency chains and analyzes type relationships
 * @packageDocumentation
 */

import type {
  InterfaceDependency,
  InterfaceDependencyGraph,
  InterfaceInfo,
} from '../types/domain/interface';
import type {
  TypeChain,
  TypeChainAnalysisResult,
  TypeChainOptions,
  TypeChainStep,
  TypeDependencyNode,
} from '../types/domain/type-chain';

/**
 * Traces and analyzes type dependency chains
 *
 * @public
 * @responsibility Track type dependency paths and detect circular dependencies
 * @contract Provide complete type chain analysis with cycle detection and root finding
 */
export class TypeChainTracer {
  private graph: InterfaceDependencyGraph;
  private dependencyMap: Map<string, InterfaceDependency[]>;

  constructor(graph: InterfaceDependencyGraph) {
    this.graph = graph;
    this.dependencyMap = this.buildDependencyMap();
  }

  /**
   * Build adjacency map for efficient lookups
   */
  private buildDependencyMap(): Map<string, InterfaceDependency[]> {
    const map = new Map<string, InterfaceDependency[]>();

    for (const dep of this.graph.dependencies) {
      if (!map.has(dep.from)) {
        map.set(dep.from, []);
      }
      map.get(dep.from)!.push(dep);
    }

    return map;
  }

  /**
   * Find all paths between two types
   *
   * @param source - Source type name
   * @param target - Target type name
   * @param options - Search options
   * @returns Type chain analysis result
   * @public
   */
  findChain(source: string, target: string, options: TypeChainOptions = {}): TypeChainAnalysisResult {
    const maxDepth = options.maxDepth ?? 10;
    const findAllPaths = options.findAllPaths ?? true;
    const chains: TypeChain[] = [];
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const currentPath: string[] = [];

    const dfs = (current: string, depth: number, steps: TypeChainStep[]): void => {
      // Max depth check
      if (depth > maxDepth) {
        return;
      }

      // Cycle detection
      if (currentPath.includes(current)) {
        const cycleStart = currentPath.indexOf(current);
        const cycle = [...currentPath.slice(cycleStart), current];
        if (!this.hasCycle(cycles, cycle)) {
          cycles.push(cycle);
        }
        return;
      }

      // Found target
      if (current === target) {
        chains.push({
          source,
          target,
          steps: [...steps],
          length: steps.length,
          exists: true,
          path: [source, ...steps.map((s) => s.to)],
        });

        if (!findAllPaths) {
          return;
        }
      }

      // Mark as visiting
      currentPath.push(current);

      // Explore dependencies
      const dependencies = this.dependencyMap.get(current) || [];
      for (const dep of dependencies) {
        // Apply filters
        if (!this.shouldFollowDependency(dep, options)) {
          continue;
        }

        const nextStep: TypeChainStep = {
          from: dep.from,
          to: dep.to,
          dependency: dep,
          stepNumber: steps.length,
          depth,
        };

        dfs(dep.to, depth + 1, [...steps, nextStep]);
      }

      // Unmark
      currentPath.pop();
    };

    dfs(source, 0, []);

    return {
      source,
      target,
      chains,
      totalTypes: new Set(chains.flatMap((c) => c.path)).size,
      maxDepth: Math.max(...chains.map((c) => c.length), 0),
      cycles,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Build dependency tree from a type
   *
   * @param source - Root type name
   * @param options - Analysis options
   * @returns Type chain analysis result with tree
   * @public
   */
  buildDependencyTree(source: string, options: TypeChainOptions = {}): TypeChainAnalysisResult {
    const maxDepth = options.maxDepth ?? 10;
    const visited = new Set<string>();
    const cycles: string[][] = [];
    const currentPath: string[] = [];
    let totalTypes = 0;
    let actualMaxDepth = 0;

    const buildNode = (typeName: string, depth: number, dependency?: InterfaceDependency): TypeDependencyNode => {
      totalTypes++;
      actualMaxDepth = Math.max(actualMaxDepth, depth);

      // Cycle detection
      if (currentPath.includes(typeName)) {
        const cycleStart = currentPath.indexOf(typeName);
        const cycle = [...currentPath.slice(cycleStart), typeName];
        if (!this.hasCycle(cycles, cycle)) {
          cycles.push(cycle);
        }
        return {
          typeName,
          depth,
          children: [],
          dependency,
          visited: true,
          childCount: 0,
        };
      }

      // Max depth check
      if (depth >= maxDepth) {
        return {
          typeName,
          depth,
          children: [],
          dependency,
          childCount: 0,
        };
      }

      // Already visited (but not in current path - cross-reference)
      if (visited.has(typeName)) {
        return {
          typeName,
          depth,
          children: [],
          dependency,
          visited: true,
          childCount: 0,
        };
      }

      visited.add(typeName);
      currentPath.push(typeName);

      const children: TypeDependencyNode[] = [];
      const dependencies = this.dependencyMap.get(typeName) || [];

      for (const dep of dependencies) {
        if (!this.shouldFollowDependency(dep, options)) {
          continue;
        }

        const childNode = buildNode(dep.to, depth + 1, dep);
        children.push(childNode);
      }

      currentPath.pop();

      return {
        typeName,
        depth,
        children,
        dependency,
        childCount: children.length,
      };
    };

    const tree = buildNode(source, 0);

    return {
      source,
      chains: [],
      tree,
      totalTypes,
      maxDepth: actualMaxDepth,
      cycles,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Find root types (types with no dependencies on them)
   *
   * @param options - Analysis options
   * @returns Array of root type names
   * @public
   */
  findRootTypes(options: TypeChainOptions = {}): string[] {
    const allTypes = new Set(this.graph.interfaces.keys());
    const dependentTypes = new Set<string>();

    // Collect all types that are depended upon
    for (const dep of this.graph.dependencies) {
      if (this.shouldFollowDependency(dep, options)) {
        dependentTypes.add(dep.to);
      }
    }

    // Root types = types that exist but no one depends on them
    const rootTypes: string[] = [];
    for (const type of allTypes) {
      if (!dependentTypes.has(type)) {
        rootTypes.push(type);
      }
    }

    return rootTypes;
  }

  /**
   * Find leaf types (types that don't depend on anything)
   *
   * @param options - Analysis options
   * @returns Array of leaf type names
   * @public
   */
  findLeafTypes(options: TypeChainOptions = {}): string[] {
    const allTypes = new Set(this.graph.interfaces.keys());
    const typesWithDeps = new Set<string>();

    // Collect all types that have dependencies
    for (const dep of this.graph.dependencies) {
      if (this.shouldFollowDependency(dep, options)) {
        typesWithDeps.add(dep.from);
      }
    }

    // Leaf types = types that don't depend on anything
    const leafTypes: string[] = [];
    for (const type of allTypes) {
      if (!typesWithDeps.has(type)) {
        leafTypes.push(type);
      }
    }

    return leafTypes;
  }

  /**
   * Detect all circular dependencies in the graph
   *
   * @param options - Analysis options
   * @returns Array of cycles (each cycle is an array of type names)
   * @public
   */
  detectCircularDependencies(options: TypeChainOptions = {}): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const currentPath: string[] = [];

    const dfs = (current: string): void => {
      if (currentPath.includes(current)) {
        const cycleStart = currentPath.indexOf(current);
        const cycle = [...currentPath.slice(cycleStart), current];
        if (!this.hasCycle(cycles, cycle)) {
          cycles.push(cycle);
        }
        return;
      }

      if (visited.has(current)) {
        return;
      }

      visited.add(current);
      currentPath.push(current);

      const dependencies = this.dependencyMap.get(current) || [];
      for (const dep of dependencies) {
        if (this.shouldFollowDependency(dep, options)) {
          dfs(dep.to);
        }
      }

      currentPath.pop();
    };

    // Start DFS from all types
    for (const type of this.graph.interfaces.keys()) {
      if (!visited.has(type)) {
        dfs(type);
      }
    }

    return cycles;
  }

  /**
   * Get all direct dependencies of a type
   *
   * @param typeName - Type name
   * @param options - Filter options
   * @returns Array of dependencies
   * @public
   */
  getDirectDependencies(typeName: string, options: TypeChainOptions = {}): InterfaceDependency[] {
    const deps = this.dependencyMap.get(typeName) || [];
    return deps.filter((dep) => this.shouldFollowDependency(dep, options));
  }

  /**
   * Get all types that depend on this type (reverse dependencies)
   *
   * @param typeName - Type name
   * @param options - Filter options
   * @returns Array of reverse dependencies
   * @public
   */
  getReverseDependencies(typeName: string, options: TypeChainOptions = {}): InterfaceDependency[] {
    return this.graph.dependencies.filter(
      (dep) => dep.to === typeName && this.shouldFollowDependency(dep, options)
    );
  }

  /**
   * Get overall statistics of the type graph
   *
   * @param options - Filter options
   * @returns Statistics about the type graph
   * @public
   */
  getGraphStatistics(options: TypeChainOptions = {}) {
    const allTypes = Array.from(this.graph.interfaces.keys());
    const filteredDeps = this.graph.dependencies.filter((dep) => this.shouldFollowDependency(dep, options));

    // Count composite types (types with dependencies)
    const compositesSet = new Set<string>();
    for (const dep of filteredDeps) {
      compositesSet.add(dep.from);
    }

    const composites = compositesSet.size;
    const complete = allTypes.length - composites;

    // Calculate average dependencies per type
    const depCounts = new Map<string, number>();
    for (const dep of filteredDeps) {
      depCounts.set(dep.from, (depCounts.get(dep.from) || 0) + 1);
    }
    const totalDeps = Array.from(depCounts.values()).reduce((sum, count) => sum + count, 0);
    const avgDeps = allTypes.length > 0 ? totalDeps / allTypes.length : 0;

    // Detect cycles
    const cycles = this.detectCircularDependencies(options);

    return {
      totalTypes: allTypes.length,
      composites,
      compositesPercentage: allTypes.length > 0 ? (composites / allTypes.length) * 100 : 0,
      complete,
      completePercentage: allTypes.length > 0 ? (complete / allTypes.length) * 100 : 0,
      totalDependencies: filteredDeps.length,
      averageDependencies: Number(avgDeps.toFixed(2)),
      circularDependencies: cycles.length,
      hasCircularDependencies: cycles.length > 0,
      cycles,
    };
  }

  /**
   * Check if dependency should be followed based on options
   */
  private shouldFollowDependency(dep: InterfaceDependency, options: TypeChainOptions): boolean {
    // Filter by external
    if (!options.includeExternal && dep.isExternal) {
      return false;
    }

    // Filter by dependency type
    if (options.dependencyTypes && !options.dependencyTypes.includes(dep.dependencyType)) {
      return false;
    }

    // Filter by data flow
    if (options.dataFlow && dep.dataFlow !== options.dataFlow) {
      return false;
    }

    // Filter primitives
    if (!options.includePrimitives) {
      const primitives = ['string', 'number', 'boolean', 'void', 'any', 'unknown', 'never', 'null', 'undefined'];
      if (primitives.includes(dep.to.toLowerCase())) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a cycle already exists in the list
   */
  private hasCycle(cycles: string[][], newCycle: string[]): boolean {
    return cycles.some((cycle) => this.isSameCycle(cycle, newCycle));
  }

  /**
   * Check if two cycles are the same (order-independent circular comparison)
   */
  private isSameCycle(cycle1: string[], cycle2: string[]): boolean {
    if (cycle1.length !== cycle2.length) {
      return false;
    }

    // Normalize cycles by starting from the smallest element
    const normalize = (cycle: string[]) => {
      let minIndex = 0;
      for (let i = 0; i < cycle.length; i++) {
        if (cycle[i] < cycle[minIndex]) {
          minIndex = i;
        }
      }
      return [...cycle.slice(minIndex), ...cycle.slice(0, minIndex)];
    };

    const norm1 = normalize(cycle1);
    const norm2 = normalize(cycle2);

    return norm1.every((val, idx) => val === norm2[idx]);
  }
}
