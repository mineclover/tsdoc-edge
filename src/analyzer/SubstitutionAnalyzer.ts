/**
 * Substitution Analyzer
 *
 * @packageDocumentation
 * @responsibility Detect substitution relationships (interchangeable implementations)
 *
 * @problem LSP compliance and substitutability are not explicitly tracked
 * @solves Identifies classes that can be substituted for each other
 * @context Essential for dependency injection, strategy pattern, polymorphism
 *
 * @functionality
 * - Detect classes implementing the same interface
 * - Detect classes extending the same base class
 * - Build substitution relationships between siblings
 */

import type { SymbolGraph } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships';

/**
 * Substitution group (classes that can substitute each other)
 */
interface SubstitutionGroup {
  baseType: string;        // Interface or base class
  baseSymbolId: string;
  implementations: {
    symbolId: string;
    symbolName: string;
    filePath: string;
    line: number;
  }[];
  relationshipType: 'interface' | 'inheritance';
}

/**
 * Substitution Analyzer
 *
 * @doc [[SubstitutionAnalyzer]]
 * @public
 * @responsibility Detect and analyze substitution relationships
 */
export class SubstitutionAnalyzer {
  private graph: SymbolGraph;

  constructor(graph: SymbolGraph) {
    this.graph = graph;
  }

  /**
   * Analyze substitution relationships
   * Uses existing dependency data to find classes implementing same interface
   *
   * @returns Array of substitution relationships
   * @public
   */
  analyze(): UnifiedRelationship[] {
    const groups = this.findSubstitutionGroups();
    const relationships: UnifiedRelationship[] = [];

    // Create pairwise substitution relationships
    for (const group of groups) {
      if (group.implementations.length < 2) {
        continue; // Need at least 2 implementations for substitution
      }

      // Create relationships between all pairs
      for (let i = 0; i < group.implementations.length; i++) {
        for (let j = i + 1; j < group.implementations.length; j++) {
          const impl1 = group.implementations[i];
          const impl2 = group.implementations[j];

          const relationship = this.createSubstitutionRelationship(
            impl1,
            impl2,
            group
          );

          relationships.push(relationship);
        }
      }
    }

    return relationships;
  }

  /**
   * Find groups of classes that can substitute each other
   *
   * @returns Array of substitution groups
   * @private
   */
  private findSubstitutionGroups(): SubstitutionGroup[] {
    const groups: SubstitutionGroup[] = [];
    const interfaceMap = new Map<string, SubstitutionGroup>();
    const baseClassMap = new Map<string, SubstitutionGroup>();

    // Scan all relationships
    for (const rel of this.graph.relationships) {
      const symbol = this.graph.symbols.get(rel.from);
      if (!symbol) continue;

      // Check for interface implementation
      if (rel.type === 'implements') {
        const baseSymbolId = rel.to;
        const baseSymbol = this.graph.symbols.get(baseSymbolId);

        if (baseSymbol) {
          if (!interfaceMap.has(baseSymbolId)) {
            interfaceMap.set(baseSymbolId, {
              baseType: baseSymbol.name,
              baseSymbolId,
              implementations: [],
              relationshipType: 'interface'
            });
          }

          const group = interfaceMap.get(baseSymbolId)!;
          group.implementations.push({
            symbolId: symbol.id,
            symbolName: symbol.name,
            filePath: symbol.filePath,
            line: symbol.line
          });
        }
      }

      // Check for inheritance (extends)
      if (rel.type === 'extends') {
        const baseSymbolId = rel.to;
        const baseSymbol = this.graph.symbols.get(baseSymbolId);

        if (baseSymbol) {
          if (!baseClassMap.has(baseSymbolId)) {
            baseClassMap.set(baseSymbolId, {
              baseType: baseSymbol.name,
              baseSymbolId,
              implementations: [],
              relationshipType: 'inheritance'
            });
          }

          const group = baseClassMap.get(baseSymbolId)!;
          group.implementations.push({
            symbolId: symbol.id,
            symbolName: symbol.name,
            filePath: symbol.filePath,
            line: symbol.line
          });
        }
      }
    }

    // Combine all groups
    groups.push(...interfaceMap.values(), ...baseClassMap.values());

    return groups;
  }

  /**
   * Create substitution relationship between two implementations
   *
   * @param impl1 - First implementation
   * @param impl2 - Second implementation
   * @param group - Substitution group
   * @returns Unified relationship
   * @private
   */
  private createSubstitutionRelationship(
    impl1: SubstitutionGroup['implementations'][0],
    impl2: SubstitutionGroup['implementations'][0],
    group: SubstitutionGroup
  ): UnifiedRelationship {
    const timestamp = new Date().toISOString();

    // Confidence based on relationship type
    const confidence = group.relationshipType === 'interface' ? 0.9 : 0.8;

    return {
      id: `substitution-${impl1.symbolId}-${impl2.symbolId}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
      type: 'substitution',
      from: [impl1.symbolId, impl2.symbolId],
      to: group.baseSymbolId,
      direction: 'undirected',
      strength: 'medium',
      category: 'alternative',
      evidence: [
        {
          type: 'code',
          source: impl1.filePath,
          lineNumber: impl1.line,
          snippet: `${impl1.symbolName} ${group.relationshipType === 'interface' ? 'implements' : 'extends'} ${group.baseType}`,
          confidence: 1.0,
          context: `Implementation of ${group.baseType}`
        },
        {
          type: 'code',
          source: impl2.filePath,
          lineNumber: impl2.line,
          snippet: `${impl2.symbolName} ${group.relationshipType === 'interface' ? 'implements' : 'extends'} ${group.baseType}`,
          confidence: 1.0,
          context: `Implementation of ${group.baseType}`
        }
      ],
      discoveredBy: 'static-analysis',
      confidence,
      filePath: impl1.filePath,
      line: impl1.line,
      properties: {
        baseType: group.baseType,
        baseSymbolId: group.baseSymbolId,
        relationshipType: group.relationshipType,
        impl1: impl1.symbolName,
        impl2: impl2.symbolName,
        totalImplementations: group.implementations.length
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      description: `${impl1.symbolName} and ${impl2.symbolName} are interchangeable (both ${group.relationshipType === 'interface' ? 'implement' : 'extend'} ${group.baseType})`
    };
  }

  /**
   * Get substitution statistics
   *
   * @param relationships - Array of substitution relationships
   * @returns Statistics object
   * @public
   */
  getStatistics(relationships: UnifiedRelationship[]): {
    totalSubstitutions: number;
    interfaceBased: number;
    inheritanceBased: number;
    baseTypes: Set<string>;
    averageImplementations: number;
  } {
    const baseTypes = new Set<string>();
    let interfaceBased = 0;
    let inheritanceBased = 0;
    const implCounts = new Map<string, number>();

    for (const rel of relationships) {
      const baseType = rel.properties?.baseType;
      if (baseType) {
        baseTypes.add(baseType);
        implCounts.set(baseType, (implCounts.get(baseType) || 0) + 1);
      }

      if (rel.properties?.relationshipType === 'interface') {
        interfaceBased++;
      } else if (rel.properties?.relationshipType === 'inheritance') {
        inheritanceBased++;
      }
    }

    const totalImpl = Array.from(implCounts.values()).reduce((a, b) => a + b, 0);
    const averageImplementations = baseTypes.size > 0 ? totalImpl / baseTypes.size : 0;

    return {
      totalSubstitutions: relationships.length,
      interfaceBased,
      inheritanceBased,
      baseTypes,
      averageImplementations
    };
  }
}
