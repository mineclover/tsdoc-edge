/**
 * I/O Dependency Analyzer
 *
 * @doc [[IODependencyAnalyzer]]
 * @packageDocumentation
 * @responsibility Detect data flow relationships between symbols
 *
 * @problem Output of A matches input of B, but no explicit connection documented
 * @solves Automatic detection of I/O dependencies via type matching
 * @context Data pipeline analysis for SSOT completeness
 *
 * @functionality
 * - Match return types with parameter types
 * - Find event flow patterns
 * - Calculate confidence scores
 */

import type { Symbol, SymbolGraph } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships';

/**
 * I/O Dependency Analyzer
 *
 * @public
 * @responsibility Detect data flow relationships via type analysis
 * @requires SymbolGraph
 */
export class IODependencyAnalyzer {
  private graph: SymbolGraph;

  constructor(graph: SymbolGraph) {
    this.graph = graph;
  }

  /**
   * Analyze I/O dependencies across all symbols
   *
   * @returns Array of I/O dependency relationships
   * @public
   */
  analyze(): UnifiedRelationship[] {
    const relationships: UnifiedRelationship[] = [];

    // Build both maps in a single pass for better performance
    const { producers, consumers } = this.buildTypeMaps();

    // Find matches with early filtering
    for (const [typeName, producerSymbols] of producers.entries()) {
      const consumerSymbols = consumers.get(typeName);

      if (!consumerSymbols || producerSymbols.length === 0 || consumerSymbols.length === 0) {
        continue; // Skip if no matches possible
      }

      for (const producer of producerSymbols) {
        for (const consumer of consumerSymbols) {
          // Don't relate a symbol to itself
          if (producer.symbolId === consumer.symbolId) continue;

          const relationship = this.createIODependency(producer, consumer, typeName);

          relationships.push(relationship);
        }
      }
    }

    return relationships;
  }

  /**
   * Build producer and consumer maps in a single pass (optimization)
   */
  private buildTypeMaps(): {
    producers: Map<string, Array<{ symbolId: string; symbolName: string; returnType: string }>>;
    consumers: Map<string, Array<{ symbolId: string; symbolName: string; paramType: string }>>;
  } {
    const producers = new Map<
      string,
      Array<{ symbolId: string; symbolName: string; returnType: string }>
    >();
    const consumers = new Map<
      string,
      Array<{ symbolId: string; symbolName: string; paramType: string }>
    >();

    // Single pass through all symbols
    for (const [symbolId, symbol] of this.graph.symbols.entries()) {
      // Only process functions and methods
      if (symbol.type !== 'function' && symbol.type !== 'method') {
        continue;
      }

      // Extract return type (producer)
      const returnType = this.extractReturnType(symbol);
      if (returnType && !this.isPrimitiveType(returnType)) {
        if (!producers.has(returnType)) {
          producers.set(returnType, []);
        }
        producers.get(returnType)?.push({
          symbolId,
          symbolName: symbol.name,
          returnType,
        });
      }

      // Extract parameter types (consumer)
      const paramTypes = this.extractParameterTypes(symbol);
      for (const paramType of paramTypes) {
        if (!this.isPrimitiveType(paramType)) {
          if (!consumers.has(paramType)) {
            consumers.set(paramType, []);
          }
          consumers.get(paramType)?.push({
            symbolId,
            symbolName: symbol.name,
            paramType,
          });
        }
      }
    }

    return { producers, consumers };
  }

  /**
   * Create I/O dependency relationship
   */
  private createIODependency(
    producer: { symbolId: string; symbolName: string; returnType: string },
    consumer: { symbolId: string; symbolName: string; paramType: string },
    dataType: string
  ): UnifiedRelationship {
    const producerSymbol = this.graph.symbols.get(producer.symbolId);
    const consumerSymbol = this.graph.symbols.get(consumer.symbolId);

    const confidence = this.calculateConfidence(producerSymbol, consumerSymbol, dataType);

    return {
      id: `io-dep-${producer.symbolId}-${consumer.symbolId}`,
      type: 'io-dependency',
      category: 'data-flow',
      from: producer.symbolId,
      to: consumer.symbolId,
      direction: 'unidirectional',
      strength: confidence > 0.8 ? 'strong' : confidence > 0.5 ? 'medium' : 'weak',
      evidence: [
        {
          type: 'type-signature',
          source: producerSymbol?.filePath || '',
          lineNumber: producerSymbol?.line,
          snippet: `${producer.symbolName}() returns ${dataType}`,
          confidence: confidence,
          context: `Consumed by ${consumer.symbolName}()`,
        },
      ],
      discoveredBy: 'type-inference',
      confidence,
      filePath: producerSymbol?.filePath,
      line: producerSymbol?.line,
      properties: {
        dataType,
        producerMethod: producer.symbolName,
        consumerMethod: consumer.symbolName,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      description: `${producer.symbolName} produces ${dataType} consumed by ${consumer.symbolName}`,
    };
  }

  /**
   * Extract return type from symbol
   */
  private extractReturnType(symbol: Symbol): string | null {
    // First check metadata.declaredType (from database)
    if (symbol.metadata?.declaredType) {
      return symbol.metadata.declaredType as string;
    }

    // Try to extract from summary or tags
    const summary = symbol.summary || '';

    // Look for @returns tag or return type annotation
    const returnsMatch = summary.match(/@returns?\s+\{([^}]+)\}/);
    if (returnsMatch) {
      return returnsMatch[1];
    }

    // Look for type annotation in metadata
    if (symbol.metadata?.returnType) {
      return symbol.metadata.returnType as string;
    }

    return null;
  }

  /**
   * Extract parameter types from symbol
   */
  private extractParameterTypes(symbol: Symbol): string[] {
    const types: string[] = [];

    // First check metadata.parameterTypes (from database)
    if (symbol.metadata?.parameterTypes) {
      const paramTypes = symbol.metadata.parameterTypes as Array<{ name: string; type?: string }>;
      for (const param of paramTypes) {
        if (param.type) {
          types.push(param.type);
        }
      }
      return types;
    }

    // Fallback: Look for @param tags with type annotations in summary
    const summary = symbol.summary || '';
    const paramMatches = summary.matchAll(/@param\s+\{([^}]+)\}/g);

    for (const match of paramMatches) {
      types.push(match[1]);
    }

    // Legacy fallback: Look for types in metadata
    if (symbol.metadata?.paramTypes) {
      const paramTypes = symbol.metadata.paramTypes as string[];
      types.push(...paramTypes);
    }

    return types;
  }

  /**
   * Check if type is primitive (should be ignored)
   */
  private isPrimitiveType(typeName: string): boolean {
    const primitives = new Set([
      'string',
      'number',
      'boolean',
      'void',
      'any',
      'unknown',
      'never',
      'null',
      'undefined',
      'object',
      'Array',
      'Promise',
    ]);

    // Remove generic parameters
    const baseType = typeName.split('<')[0].trim();

    return primitives.has(baseType);
  }

  /**
   * Calculate confidence score for I/O dependency
   */
  private calculateConfidence(
    producer: Symbol | undefined,
    consumer: Symbol | undefined,
    dataType: string
  ): number {
    let confidence = 0.5; // Base confidence

    if (!producer || !consumer) return confidence;

    // Higher confidence if in same file
    if (producer.filePath === consumer.filePath) {
      confidence += 0.2;
    }

    // Higher confidence if consumer imports producer
    const consumerDeps = this.graph.adjacencyList.get(consumer.id) || [];
    if (consumerDeps.includes(producer.id)) {
      confidence += 0.2;
    }

    // Higher confidence if dataType is a custom type (not generic)
    if (dataType[0] === dataType[0].toUpperCase() && !dataType.includes('<')) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }
}
