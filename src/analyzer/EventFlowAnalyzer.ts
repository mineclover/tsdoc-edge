/**
 * Event Flow Analyzer
 *
 * @doc [[EventFlowAnalyzer]]
 * @packageDocumentation
 * @responsibility Detect event-flow relationships (EventEmitter, addEventListener, Pub/Sub)
 *
 * @problem Event-driven architectures are hard to trace without runtime execution
 * @solves Static analysis of event emission and consumption patterns
 * @context Essential for understanding async communication and data flow
 *
 * @functionality
 * - Detect EventEmitter patterns (.emit, .on, .once)
 * - Detect DOM event patterns (addEventListener, removeEventListener)
 * - Detect Pub/Sub patterns (publish/subscribe, emit/listen)
 * - Match event names between producers and consumers
 */

import * as ts from 'typescript';
import type { SymbolGraph } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships';

/**
 * Event emission site
 */
interface EventEmission {
  symbolId: string;
  symbolName: string;
  eventName: string;
  filePath: string;
  line: number;
  pattern: 'emit' | 'dispatchEvent' | 'publish' | 'trigger';
}

/**
 * Event consumption site
 */
interface EventConsumption {
  symbolId: string;
  symbolName: string;
  eventName: string;
  filePath: string;
  line: number;
  pattern: 'on' | 'addEventListener' | 'subscribe' | 'listen';
}

/**
 * Event Flow Analyzer
 *
 * @public
 * @responsibility Detect and analyze event-flow relationships
 */
export class EventFlowAnalyzer {
  private graph: SymbolGraph;
  private program: ts.Program | null = null;

  constructor(graph: SymbolGraph, program?: ts.Program) {
    this.graph = graph;
    this.program = program || null;
  }

  /**
   * Set TypeScript program for AST analysis
   *
   * @param program - TypeScript program
   * @returns void - No return value
   * @public
   */
  setProgram(program: ts.Program): void {
    this.program = program;
  }

  /**
   * Analyze event flows across all source files
   *
   * @returns Array of event-flow relationships
   * @public
   */
  analyze(): UnifiedRelationship[] {
    if (!this.program) {
      console.warn('EventFlowAnalyzer: No program provided, cannot analyze events');
      return [];
    }

    const emissions: EventEmission[] = [];
    const consumptions: EventConsumption[] = [];

    // Extract event emissions and consumptions from all files
    for (const sourceFile of this.program.getSourceFiles()) {
      if (sourceFile.isDeclarationFile) continue;

      const filePath = sourceFile.fileName.replace(/\\/g, '/');

      // Skip node_modules
      if (filePath.includes('node_modules')) continue;

      this.extractEventPatterns(sourceFile, filePath, emissions, consumptions);
    }

    // Match emissions with consumptions by event name
    const relationships: UnifiedRelationship[] = [];

    for (const emission of emissions) {
      const matchingConsumptions = consumptions.filter((c) => c.eventName === emission.eventName);

      for (const consumption of matchingConsumptions) {
        // Skip self-references
        if (emission.symbolId === consumption.symbolId) continue;

        const relationship: UnifiedRelationship = {
          id: `event-flow-${emission.symbolId}-${consumption.symbolId}-${emission.eventName}`
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, ''),
          type: 'event-flow',
          category: 'data-flow',
          from: emission.symbolId,
          to: consumption.symbolId,
          direction: 'unidirectional',
          strength: 'medium',
          evidence: [
            {
              type: 'code',
              source: emission.filePath,
              lineNumber: emission.line,
              confidence: 0.8,
            },
            {
              type: 'code',
              source: consumption.filePath,
              lineNumber: consumption.line,
              confidence: 0.8,
            },
          ],
          discoveredBy: 'static-analysis',
          confidence: 0.8,
          filePath: emission.filePath,
          line: emission.line,
          properties: {
            eventName: emission.eventName,
            producerPattern: emission.pattern,
            consumerPattern: consumption.pattern,
            producer: emission.symbolName,
            consumer: consumption.symbolName,
          },
          description: `Event '${emission.eventName}' emitted by ${emission.symbolName} and consumed by ${consumption.symbolName}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        relationships.push(relationship);
      }
    }

    return relationships;
  }

  /**
   * Extract event patterns from a source file
   *
   * @param sourceFile - TypeScript source file
   * @param filePath - File path
   * @param emissions - Array to collect emissions
   * @param consumptions - Array to collect consumptions
   */
  private extractEventPatterns(
    sourceFile: ts.SourceFile,
    filePath: string,
    emissions: EventEmission[],
    consumptions: EventConsumption[]
  ): void {
    const visit = (node: ts.Node): void => {
      try {
        // Pattern 1: EventEmitter - .emit('eventName', data)
        if (ts.isCallExpression(node)) {
          const expression = node.expression;

          if (ts.isPropertyAccessExpression(expression)) {
            const methodName = expression.name.text;
            const objectExpression = expression.expression;

            // Emit patterns
            if (
              methodName === 'emit' ||
              methodName === 'trigger' ||
              methodName === 'dispatchEvent'
            ) {
              const eventName = this.extractEventName(node.arguments[0]);
              if (eventName) {
                const symbolId = this.findSymbolIdForNode(objectExpression, sourceFile);
                if (symbolId) {
                  const line =
                    sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

                  emissions.push({
                    symbolId,
                    symbolName: this.getSymbolName(symbolId),
                    eventName,
                    filePath,
                    line,
                    pattern: methodName === 'dispatchEvent' ? 'dispatchEvent' : 'emit',
                  });
                }
              }
            }

            // Consumption patterns
            if (
              methodName === 'on' ||
              methodName === 'addEventListener' ||
              methodName === 'subscribe' ||
              methodName === 'listen' ||
              methodName === 'once'
            ) {
              const eventName = this.extractEventName(node.arguments[0]);
              if (eventName) {
                const symbolId = this.findSymbolIdForNode(objectExpression, sourceFile);
                if (symbolId) {
                  const line =
                    sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

                  consumptions.push({
                    symbolId,
                    symbolName: this.getSymbolName(symbolId),
                    eventName,
                    filePath,
                    line,
                    pattern: methodName === 'addEventListener' ? 'addEventListener' : 'on',
                  });
                }
              }
            }
          }
        }
      } catch (_error) {
        // Skip nodes that cause errors (e.g., synthetic nodes)
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  /**
   * Extract event name from argument (handle string literals and constants)
   *
   * @param arg - Argument node
   * @returns Event name or null
   */
  private extractEventName(arg: ts.Expression | undefined): string | null {
    if (!arg) return null;

    // String literal: 'click', "data-ready"
    if (ts.isStringLiteral(arg)) {
      return arg.text;
    }

    // Template literal: `event-${type}`
    if (ts.isTemplateExpression(arg)) {
      // For now, skip template literals (runtime-dependent)
      return null;
    }

    // Identifier: EVENT_NAME constant
    if (ts.isIdentifier(arg)) {
      // Try to resolve constant value (simplified)
      return arg.text;
    }

    return null;
  }

  /**
   * Find symbol ID for a node (simplified)
   *
   * @param node - AST node
   * @param sourceFile - Source file
   * @returns Symbol ID or null
   */
  private findSymbolIdForNode(node: ts.Node, sourceFile: ts.SourceFile): string | null {
    // Get the identifier
    let identifier: string | null = null;

    if (ts.isIdentifier(node)) {
      identifier = node.text;
    } else if (ts.isPropertyAccessExpression(node)) {
      identifier = node.expression.getText(sourceFile);
    } else if (node.kind === ts.SyntaxKind.ThisKeyword) {
      // For 'this', try to find the enclosing class
      let parent = node.parent;
      while (parent) {
        if (ts.isClassDeclaration(parent) && parent.name) {
          identifier = parent.name.text;
          break;
        }
        parent = parent.parent;
      }
    } else {
      identifier = node.getText(sourceFile).split('.')[0];
    }

    if (!identifier) return null;

    // Try to find symbol in graph by name
    for (const [symbolId, symbol] of this.graph.symbols.entries()) {
      if (symbol.name === identifier) {
        return symbolId;
      }
    }

    return null;
  }

  /**
   * Get symbol name from ID
   *
   * @param symbolId - Symbol ID
   * @returns Symbol name
   */
  private getSymbolName(symbolId: string): string {
    const symbol = this.graph.symbols.get(symbolId);
    return symbol?.name || symbolId;
  }

  /**
   * Get statistics about event flows
   *
   * @param relationships - Event flow relationships
   * @returns Statistics object
   * @public
   */
  getStatistics(relationships: UnifiedRelationship[]): {
    totalEvents: number;
    uniqueEventNames: Set<string>;
    producerCount: number;
    consumerCount: number;
    byPattern: Record<string, number>;
  } {
    const uniqueEventNames = new Set<string>();
    const producers = new Set<string>();
    const consumers = new Set<string>();
    const byPattern: Record<string, number> = {};

    for (const rel of relationships) {
      const eventName = rel.properties?.eventName;
      if (eventName) {
        uniqueEventNames.add(eventName);
      }

      producers.add(rel.from as string);
      consumers.add(rel.to as string);

      const pattern = `${rel.properties?.producerPattern} → ${rel.properties?.consumerPattern}`;
      byPattern[pattern] = (byPattern[pattern] || 0) + 1;
    }

    return {
      totalEvents: relationships.length,
      uniqueEventNames,
      producerCount: producers.size,
      consumerCount: consumers.size,
      byPattern,
    };
  }
}
