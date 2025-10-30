/**
 * Maps dependencies between interfaces
 * @packageDocumentation
 */

import type { InterfaceDependency, InterfaceDependencyGraph, InterfaceInfo } from '../types/domain';

/**
 * Type analysis result
 */
interface TypeAnalysisResult {
  typeName: string;
  relation: 'direct' | 'generic-param' | 'union' | 'intersection' | 'array';
  genericContext?: string;
  isExternal: boolean;
  importSource?: string;
  typeCategory: 'interface' | 'type-alias' | 'class' | 'enum' | 'unknown';
}

/**
 * Maps and analyzes dependencies between interfaces
 *
 * @public
 * @responsibility Identify and map dependencies between interfaces
 * @contract Build complete dependency graph with all relationship types
 */
export class InterfaceDependencyMapper {
  private importMap: Map<string, { source: string; isTypeOnly: boolean }> = new Map();

  /**
   * Build dependency graph from interface information
   *
   * @param interfaces - Array of interface information
   * @param importMap - Optional import information map for external type detection
   * @returns Complete dependency graph
   * @public
   */
  buildDependencyGraph(
    interfaces: InterfaceInfo[],
    importMap?: Map<string, { source: string; isTypeOnly: boolean }>
  ): InterfaceDependencyGraph {
    const interfaceMap = new Map<string, InterfaceInfo>();
    const dependencies: InterfaceDependency[] = [];

    // Store import map for external type detection
    if (importMap) {
      this.importMap = importMap;
    }

    // Index interfaces by name
    for (const iface of interfaces) {
      interfaceMap.set(iface.symbol.name, iface);
    }

    // Extract dependencies for each interface
    for (const iface of interfaces) {
      const ifaceDeps = this.extractDependencies(iface, interfaceMap);
      dependencies.push(...ifaceDeps);
    }

    return {
      interfaces: interfaceMap,
      dependencies,
      domains: new Map(), // Will be populated by DomainStructureAnalyzer
    };
  }

  /**
   * Extract dependencies from a single interface
   *
   * @param iface - Interface to analyze
   * @param interfaceMap - Map of all known interfaces
   * @returns Array of dependencies
   */
  private extractDependencies(
    iface: InterfaceInfo,
    interfaceMap: Map<string, InterfaceInfo>
  ): InterfaceDependency[] {
    const dependencies: InterfaceDependency[] = [];
    const fromName = iface.symbol.name;

    // 1. Dependencies from extends clause
    for (const extendedInterface of iface.extends) {
      const targetName = this.extractInterfaceName(extendedInterface);
      if (interfaceMap.has(targetName)) {
        dependencies.push({
          from: fromName,
          to: targetName,
          dependencyType: 'extends',
          location: 'extends',
        });
      }
    }

    // 2. Dependencies from property types
    for (const property of iface.properties) {
      const typeAnalysis = this.analyzeTypeString(property.type, interfaceMap);
      for (const result of typeAnalysis) {
        dependencies.push({
          from: fromName,
          to: result.typeName,
          dependencyType: 'composition',
          via: property.name,
          location: 'property',
          typeRelation: result.relation,
          genericContext: result.genericContext,
          isExternal: result.isExternal,
          importSource: result.importSource,
          dataFlow: 'output', // Properties expose data
          typeCategory: result.typeCategory,
        });
      }
    }

    // 3. Dependencies from method parameters and return types
    for (const method of iface.methods) {
      // Check parameters
      for (const param of method.parameters) {
        const typeAnalysis = this.analyzeTypeString(param.type, interfaceMap);
        for (const result of typeAnalysis) {
          dependencies.push({
            from: fromName,
            to: result.typeName,
            dependencyType: 'parameter',
            via: `${method.name}(${param.name})`,
            location: 'method',
            typeRelation: result.relation,
            genericContext: result.genericContext,
            isExternal: result.isExternal,
            importSource: result.importSource,
            dataFlow: 'input', // Parameters receive data
            typeCategory: result.typeCategory,
          });
        }
      }

      // Check return type
      const returnAnalysis = this.analyzeTypeString(method.returnType, interfaceMap);
      for (const result of returnAnalysis) {
        dependencies.push({
          from: fromName,
          to: result.typeName,
          dependencyType: 'return',
          via: method.name,
          location: 'method',
          typeRelation: result.relation,
          genericContext: result.genericContext,
          isExternal: result.isExternal,
          importSource: result.importSource,
          dataFlow: 'output', // Return types provide data
          typeCategory: result.typeCategory,
        });
      }
    }

    // 4. Dependencies from type parameters
    for (const _typeParam of iface.typeParameters) {
      // Type parameters themselves don't create dependencies,
      // but their usage in properties/methods are already captured above
    }

    return dependencies;
  }

  /**
   * Extract interface name from type reference
   *
   * @param typeRef - Type reference string (e.g., "User", "Array<User>", "User | null")
   * @returns Base interface name
   */
  private extractInterfaceName(typeRef: string): string {
    // Remove generic parameters and get base type
    // e.g., "Array<User>" -> "Array", "User<T>" -> "User"
    const match = typeRef.match(/^([A-Z][a-zA-Z0-9]*)/);
    return match ? match[1] : typeRef;
  }

  /**
   * Analyze type string with context awareness
   *
   * @param typeStr - Type string to analyze
   * @param interfaceMap - Map of known interfaces
   * @returns Array of type analysis results
   */
  private analyzeTypeString(
    typeStr: string,
    interfaceMap: Map<string, InterfaceInfo>
  ): TypeAnalysisResult[] {
    const results: TypeAnalysisResult[] = [];

    // Check for union types (User | Admin)
    if (typeStr.includes('|')) {
      const unionTypes = typeStr.split('|').map((t) => t.trim());
      for (const unionType of unionTypes) {
        const subResults = this.analyzeSimpleType(unionType, interfaceMap, 'union');
        results.push(...subResults);
      }
      return results;
    }

    // Check for intersection types (User & Permissions)
    if (typeStr.includes('&')) {
      const intersectionTypes = typeStr.split('&').map((t) => t.trim());
      for (const intersectionType of intersectionTypes) {
        const subResults = this.analyzeSimpleType(intersectionType, interfaceMap, 'intersection');
        results.push(...subResults);
      }
      return results;
    }

    // Check for array types (User[])
    if (typeStr.endsWith('[]')) {
      const elementType = typeStr.slice(0, -2).trim();
      const subResults = this.analyzeSimpleType(elementType, interfaceMap, 'array');
      results.push(...subResults);
      return results;
    }

    // Check for generic types (Promise<User>, Map<string, User>)
    const genericMatch = typeStr.match(/^([A-Z][a-zA-Z0-9]*)<(.+)>$/);
    if (genericMatch) {
      const containerType = genericMatch[1];
      const typeParams = this.splitGenericParams(genericMatch[2]);

      // Recursively analyze generic parameters
      for (const typeParam of typeParams) {
        const subResults = this.analyzeSimpleType(
          typeParam.trim(),
          interfaceMap,
          'generic-param',
          containerType
        );
        results.push(...subResults);
      }
      return results;
    }

    // Simple direct type
    const subResults = this.analyzeSimpleType(typeStr, interfaceMap, 'direct');
    results.push(...subResults);

    return results;
  }

  /**
   * Analyze a simple (non-composite) type
   *
   * @param typeStr - Simple type string
   * @param interfaceMap - Map of known interfaces
   * @param relation - Type relation
   * @param genericContainer - Generic container type if applicable
   * @returns Array of type analysis results
   */
  private analyzeSimpleType(
    typeStr: string,
    interfaceMap: Map<string, InterfaceInfo>,
    relation: 'direct' | 'generic-param' | 'union' | 'intersection' | 'array',
    genericContainer?: string
  ): TypeAnalysisResult[] {
    const results: TypeAnalysisResult[] = [];

    // Extract PascalCase identifiers
    const regex = /\b([A-Z][a-zA-Z0-9]*)\b/g;
    const matches = Array.from(typeStr.matchAll(regex));

    for (const match of matches) {
      const typeName = match[1];

      // Filter out built-in types
      if (!this.isKnownInterface(typeName, interfaceMap) && !this.importMap.has(typeName)) {
        continue;
      }

      const importInfo = this.importMap.get(typeName);
      const isExternal = !!importInfo && !importInfo.source.startsWith('.');

      results.push({
        typeName,
        relation,
        genericContext: genericContainer ? `${genericContainer}<${typeName}>` : undefined,
        isExternal,
        importSource: importInfo?.source,
        typeCategory: interfaceMap.has(typeName) ? 'interface' : 'unknown',
      });
    }

    return results;
  }

  /**
   * Split generic type parameters handling nested generics
   *
   * @param params - Generic parameters string
   * @returns Array of individual parameters
   */
  private splitGenericParams(params: string): string[] {
    const result: string[] = [];
    let depth = 0;
    let current = '';

    for (const char of params) {
      if (char === '<') {
        depth++;
        current += char;
      } else if (char === '>') {
        depth--;
        current += char;
      } else if (char === ',' && depth === 0) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    if (current) {
      result.push(current.trim());
    }

    return result;
  }

  /**
   * Check if a type name is a known interface
   *
   * @param typeName - Type name
   * @param interfaceMap - Map of known interfaces
   * @returns True if it's a known interface
   */
  private isKnownInterface(typeName: string, interfaceMap: Map<string, InterfaceInfo>): boolean {
    // Filter out common built-in types
    const builtInTypes = new Set([
      'Array',
      'Promise',
      'Map',
      'Set',
      'Record',
      'Partial',
      'Required',
      'Readonly',
      'Pick',
      'Omit',
      'Exclude',
      'Extract',
      'NonNullable',
      'ReturnType',
      'InstanceType',
      'ThisType',
      'String',
      'Number',
      'Boolean',
      'Date',
      'Error',
      'RegExp',
    ]);

    if (builtInTypes.has(typeName)) {
      return false;
    }

    return interfaceMap.has(typeName);
  }

  /**
   * Get dependencies for a specific interface
   *
   * @param interfaceName - Interface name
   * @param graph - Dependency graph
   * @returns Dependencies from this interface
   * @public
   */
  getDependencies(interfaceName: string, graph: InterfaceDependencyGraph): InterfaceDependency[] {
    return graph.dependencies.filter((dep) => dep.from === interfaceName);
  }

  /**
   * Get dependents of a specific interface
   *
   * @param interfaceName - Interface name
   * @param graph - Dependency graph
   * @returns Interfaces that depend on this interface
   * @public
   */
  getDependents(interfaceName: string, graph: InterfaceDependencyGraph): InterfaceDependency[] {
    return graph.dependencies.filter((dep) => dep.to === interfaceName);
  }

  /**
   * Find circular dependencies
   *
   * @param graph - Dependency graph
   * @returns Array of circular dependency chains
   * @public
   */
  findCircularDependencies(graph: InterfaceDependencyGraph): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const interfaceName of graph.interfaces.keys()) {
      if (!visited.has(interfaceName)) {
        this.detectCycle(interfaceName, graph, visited, recursionStack, [], cycles);
      }
    }

    return cycles;
  }

  /**
   * Detect cycle using DFS
   *
   * @param current - Current interface
   * @param graph - Dependency graph
   * @param visited - Visited set
   * @param recursionStack - Current recursion stack
   * @param path - Current path
   * @param cycles - Accumulated cycles
   */
  private detectCycle(
    current: string,
    graph: InterfaceDependencyGraph,
    visited: Set<string>,
    recursionStack: Set<string>,
    path: string[],
    cycles: string[][]
  ): void {
    visited.add(current);
    recursionStack.add(current);
    path.push(current);

    const deps = this.getDependencies(current, graph);

    for (const dep of deps) {
      const neighbor = dep.to;

      if (!visited.has(neighbor)) {
        this.detectCycle(neighbor, graph, visited, recursionStack, path, cycles);
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          const cycle = [...path.slice(cycleStart), neighbor];
          cycles.push(cycle);
        }
      }
    }

    path.pop();
    recursionStack.delete(current);
  }

  /**
   * Calculate dependency metrics for an interface
   *
   * @param interfaceName - Interface name
   * @param graph - Dependency graph
   * @returns Dependency metrics
   * @public
   */
  calculateMetrics(
    interfaceName: string,
    graph: InterfaceDependencyGraph
  ): {
    efferentCoupling: number; // Number of interfaces this depends on
    afferentCoupling: number; // Number of interfaces that depend on this
    instability: number; // efferent / (efferent + afferent), 0=stable, 1=unstable
  } {
    const efferentCoupling = this.getDependencies(interfaceName, graph).length;
    const afferentCoupling = this.getDependents(interfaceName, graph).length;
    const instability =
      efferentCoupling + afferentCoupling === 0
        ? 0
        : efferentCoupling / (efferentCoupling + afferentCoupling);

    return {
      efferentCoupling,
      afferentCoupling,
      instability,
    };
  }
}
