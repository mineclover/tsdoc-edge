/**
 * Behavioral Analyzer
 *
 * @doc [[BehavioralAnalyzer]]
 * @packageDocumentation
 * @responsibility Detect behavioral relationships (collaboration, composition, temporal-order)
 *
 * @problem Behavioral relationships and design patterns are implicit in code
 * @solves Static analysis of class interactions, method delegation, and execution order
 * @context Essential for understanding system architecture and control flow
 *
 * @functionality
 * - Detect collaboration patterns (method delegation, design patterns)
 * - Detect composition patterns (feature aggregation, whole-part)
 * - Detect temporal-order patterns (lifecycle methods, initialization)
 */

import * as ts from 'typescript';
import type { SymbolGraph } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships';

/**
 * Collaboration relationship
 */
interface Collaboration {
  symbolA: string;
  symbolB: string;
  pattern: 'delegation' | 'strategy' | 'observer' | 'mediator' | 'general';
  reason: string;
  filePath: string;
  line: number;
  confidence: number;
}

/**
 * Composition relationship
 */
interface Composition {
  whole: string;
  parts: string[];
  pattern: 'aggregation' | 'composition' | 'feature';
  reason: string;
  filePath: string;
  line: number;
  confidence: number;
}

/**
 * Temporal order relationship
 */
interface TemporalOrder {
  before: string;
  after: string;
  pattern: 'lifecycle' | 'initialization' | 'sequential-call' | 'dependency-chain';
  reason: string;
  filePath: string;
  line: number;
  confidence: number;
}

/**
 * Behavioral Analyzer
 *
 * @public
 * @responsibility Detect and analyze behavioral relationships
 */
export class BehavioralAnalyzer {
  private graph: SymbolGraph;
  private program: ts.Program | null = null;
  private checker: ts.TypeChecker | null = null;

  constructor(graph: SymbolGraph, program?: ts.Program) {
    this.graph = graph;
    this.program = program || null;
    this.checker = program ? program.getTypeChecker() : null;
  }

  /**
   * Set TypeScript program for AST analysis
   *
   * @param program - TypeScript program
   * @public
   */
  setProgram(program: ts.Program): void {
    this.program = program;
    this.checker = program.getTypeChecker();
  }

  /**
   * Analyze all behavioral relationships
   *
   * @returns Array of behavioral relationships
   * @public
   */
  analyze(): UnifiedRelationship[] {
    const relationships: UnifiedRelationship[] = [];

    if (!this.program || !this.checker) {
      console.warn('BehavioralAnalyzer: No program provided, cannot analyze behavior');
      return [];
    }

    // Detect collaboration patterns
    const collaborations = this.detectCollaborations();
    relationships.push(...this.createCollaborationRelationships(collaborations));

    // Detect composition patterns
    const compositions = this.detectCompositions();
    relationships.push(...this.createCompositionRelationships(compositions));

    // Detect temporal-order patterns
    const temporalOrders = this.detectTemporalOrder();
    relationships.push(...this.createTemporalOrderRelationships(temporalOrders));

    return relationships;
  }

  /**
   * Detect collaboration relationships
   *
   * @returns Array of collaboration relationships
   * @private
   */
  private detectCollaborations(): Collaboration[] {
    if (!this.program) return [];

    const collaborations: Collaboration[] = [];

    for (const sourceFile of this.program.getSourceFiles()) {
      if (sourceFile.isDeclarationFile) continue;

      const filePath = sourceFile.fileName.replace(/\\/g, '/');

      // Skip node_modules and test files
      if (filePath.includes('node_modules') || /\.(test|spec)\.tsx?$/.test(filePath)) {
        continue;
      }

      this.extractCollaborationPatterns(sourceFile, filePath, collaborations);
    }

    return collaborations;
  }

  /**
   * Extract collaboration patterns from source file
   *
   * @param sourceFile - TypeScript source file
   * @param filePath - File path
   * @param collaborations - Array to collect collaborations
   * @private
   */
  private extractCollaborationPatterns(
    sourceFile: ts.SourceFile,
    filePath: string,
    collaborations: Collaboration[]
  ): void {
    const visit = (node: ts.Node): void => {
      try {
        // Pattern 1: Method delegation (this.dependency.method())
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
          const expr = node.expression;

          // Check if it's a property access on 'this'
          if (expr.expression.kind === ts.SyntaxKind.ThisKeyword ||
              (ts.isPropertyAccessExpression(expr.expression) &&
               expr.expression.expression.kind === ts.SyntaxKind.ThisKeyword)) {

            // Get the current class
            const classNode = this.findParentClass(node);
            if (classNode && classNode.name) {
              const className = classNode.name.text;
              const classSymbol = this.findSymbolByName(className);

              // Get the called method name
              const methodName = expr.name.text;
              const targetSymbol = this.findSymbolByName(methodName);

              if (classSymbol && targetSymbol && classSymbol !== targetSymbol) {
                const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

                collaborations.push({
                  symbolA: classSymbol,
                  symbolB: targetSymbol,
                  pattern: 'delegation',
                  reason: `${className} delegates to ${methodName}`,
                  filePath,
                  line,
                  confidence: 0.8,
                });
              }
            }
          }
        }

        // Pattern 2: Constructor dependency injection (collaboration indicator)
        if (ts.isConstructorDeclaration(node)) {
          const classNode = this.findParentClass(node);
          if (classNode && classNode.name) {
            const className = classNode.name.text;
            const classSymbol = this.findSymbolByName(className);

            if (classSymbol) {
              for (const param of node.parameters) {
                if (param.type && ts.isTypeReferenceNode(param.type)) {
                  const typeName = param.type.typeName.getText(sourceFile);
                  const depSymbol = this.findSymbolByName(typeName);

                  if (depSymbol) {
                    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

                    collaborations.push({
                      symbolA: classSymbol,
                      symbolB: depSymbol,
                      pattern: 'general',
                      reason: `${className} collaborates with ${typeName} via DI`,
                      filePath,
                      line,
                      confidence: 0.7,
                    });
                  }
                }
              }
            }
          }
        }

        ts.forEachChild(node, visit);
      } catch (error) {
        // Skip this node on error
        return;
      }
    };

    visit(sourceFile);
  }

  /**
   * Detect composition relationships
   *
   * @returns Array of composition relationships
   * @private
   */
  private detectCompositions(): Composition[] {
    if (!this.program) return [];

    const compositions: Composition[] = [];

    for (const sourceFile of this.program.getSourceFiles()) {
      if (sourceFile.isDeclarationFile) continue;

      const filePath = sourceFile.fileName.replace(/\\/g, '/');

      // Skip node_modules and test files
      if (filePath.includes('node_modules') || /\.(test|spec)\.tsx?$/.test(filePath)) {
        continue;
      }

      this.extractCompositionPatterns(sourceFile, filePath, compositions);
    }

    return compositions;
  }

  /**
   * Extract composition patterns from source file
   *
   * @param sourceFile - TypeScript source file
   * @param filePath - File path
   * @param compositions - Array to collect compositions
   * @private
   */
  private extractCompositionPatterns(
    sourceFile: ts.SourceFile,
    filePath: string,
    compositions: Composition[]
  ): void {
    const visit = (node: ts.Node): void => {
      try {
        // Pattern: Class with multiple properties (aggregation/composition)
        if (ts.isClassDeclaration(node) && node.name) {
          const className = node.name.text;
          const classSymbol = this.findSymbolByName(className);

          if (classSymbol) {
            const parts: string[] = [];

            // Collect property types
            for (const member of node.members) {
              if (ts.isPropertyDeclaration(member) && member.type) {
                if (ts.isTypeReferenceNode(member.type)) {
                  const typeName = member.type.typeName.getText(sourceFile);
                  const partSymbol = this.findSymbolByName(typeName);

                  if (partSymbol && !parts.includes(partSymbol)) {
                    parts.push(partSymbol);
                  }
                }
              }
            }

            // If class has 2+ properties, consider it composition
            if (parts.length >= 2) {
              const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

              compositions.push({
                whole: classSymbol,
                parts,
                pattern: 'composition',
                reason: `${className} is composed of ${parts.length} parts`,
                filePath,
                line,
                confidence: 0.8,
              });
            }
          }
        }

        ts.forEachChild(node, visit);
      } catch (error) {
        // Skip this node on error
        return;
      }
    };

    visit(sourceFile);
  }

  /**
   * Detect temporal-order relationships
   *
   * @returns Array of temporal-order relationships
   * @private
   */
  private detectTemporalOrder(): TemporalOrder[] {
    if (!this.program) return [];

    const temporalOrders: TemporalOrder[] = [];

    for (const sourceFile of this.program.getSourceFiles()) {
      if (sourceFile.isDeclarationFile) continue;

      const filePath = sourceFile.fileName.replace(/\\/g, '/');

      // Skip node_modules and test files
      if (filePath.includes('node_modules') || /\.(test|spec)\.tsx?$/.test(filePath)) {
        continue;
      }

      this.extractTemporalOrderPatterns(sourceFile, filePath, temporalOrders);
    }

    return temporalOrders;
  }

  /**
   * Extract temporal-order patterns from source file
   *
   * @param sourceFile - TypeScript source file
   * @param filePath - File path
   * @param temporalOrders - Array to collect temporal orders
   * @private
   */
  private extractTemporalOrderPatterns(
    sourceFile: ts.SourceFile,
    filePath: string,
    temporalOrders: TemporalOrder[]
  ): void {
    const visit = (node: ts.Node): void => {
      try {
        // Pattern 1: Lifecycle methods (constructor → init → start)
        if (ts.isClassDeclaration(node) && node.name) {
          const className = node.name.text;
          const classSymbol = this.findSymbolByName(className);

          if (classSymbol) {
            const lifecycleMethods: Array<{ name: string; symbol: string; order: number }> = [];

            // Detect lifecycle methods
            for (const member of node.members) {
              if (ts.isMethodDeclaration(member) && member.name) {
                const methodName = member.name.getText(sourceFile);
                const methodSymbol = this.findSymbolByName(methodName);

                if (methodSymbol) {
                  let order = 999;

                  // Assign order based on common lifecycle names
                  if (methodName.includes('init') || methodName.includes('initialize')) {
                    order = 1;
                  } else if (methodName.includes('start') || methodName.includes('begin')) {
                    order = 2;
                  } else if (methodName.includes('execute') || methodName.includes('run')) {
                    order = 3;
                  } else if (methodName.includes('stop') || methodName.includes('end')) {
                    order = 4;
                  } else if (methodName.includes('destroy') || methodName.includes('cleanup')) {
                    order = 5;
                  }

                  if (order < 999) {
                    lifecycleMethods.push({ name: methodName, symbol: methodSymbol, order });
                  }
                }
              }
            }

            // Create temporal-order relationships
            lifecycleMethods.sort((a, b) => a.order - b.order);
            for (let i = 0; i < lifecycleMethods.length - 1; i++) {
              const before = lifecycleMethods[i];
              const after = lifecycleMethods[i + 1];
              const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

              temporalOrders.push({
                before: before.symbol,
                after: after.symbol,
                pattern: 'lifecycle',
                reason: `${before.name} executes before ${after.name} in lifecycle`,
                filePath,
                line,
                confidence: 0.9,
              });
            }
          }
        }

        // Pattern 2: Sequential calls in a function
        if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
          if (node.body) {
            const calls = this.extractSequentialCalls(node.body, sourceFile);

            if (calls.length >= 2) {
              // Create temporal-order for sequential calls
              for (let i = 0; i < calls.length - 1; i++) {
                const beforeCall = calls[i];
                const afterCall = calls[i + 1];

                if (beforeCall.symbol && afterCall.symbol) {
                  temporalOrders.push({
                    before: beforeCall.symbol,
                    after: afterCall.symbol,
                    pattern: 'sequential-call',
                    reason: `Sequential execution: ${beforeCall.name} → ${afterCall.name}`,
                    filePath,
                    line: beforeCall.line,
                    confidence: 0.7,
                  });
                }
              }
            }
          }
        }

        ts.forEachChild(node, visit);
      } catch (error) {
        // Skip this node on error
        return;
      }
    };

    visit(sourceFile);
  }

  /**
   * Extract sequential calls from a block
   *
   * @param block - Block statement
   * @param sourceFile - Source file
   * @returns Array of call information
   * @private
   */
  private extractSequentialCalls(
    block: ts.Block,
    sourceFile: ts.SourceFile
  ): Array<{ symbol: string | null; name: string; line: number }> {
    const calls: Array<{ symbol: string | null; name: string; line: number }> = [];

    for (const statement of block.statements) {
      if (ts.isExpressionStatement(statement)) {
        const expr = statement.expression;

        if (ts.isCallExpression(expr)) {
          let callName = '';
          let callSymbol: string | null = null;

          if (ts.isIdentifier(expr.expression)) {
            callName = expr.expression.text;
            callSymbol = this.findSymbolByName(callName);
          } else if (ts.isPropertyAccessExpression(expr.expression)) {
            callName = expr.expression.name.text;
            callSymbol = this.findSymbolByName(callName);
          }

          if (callName) {
            const line = sourceFile.getLineAndCharacterOfPosition(statement.getStart()).line + 1;
            calls.push({ symbol: callSymbol, name: callName, line });
          }
        }
      }
    }

    return calls;
  }

  /**
   * Find parent class of a node
   *
   * @param node - AST node
   * @returns Class declaration or null
   * @private
   */
  private findParentClass(node: ts.Node): ts.ClassDeclaration | null {
    let current: ts.Node | undefined = node;

    while (current) {
      if (ts.isClassDeclaration(current)) {
        return current;
      }
      current = current.parent;
    }

    return null;
  }

  /**
   * Find symbol ID by name
   *
   * @param name - Symbol name
   * @returns Symbol ID or null
   * @private
   */
  private findSymbolByName(name: string): string | null {
    for (const [symbolId, symbol] of this.graph.symbols.entries()) {
      if (symbol.name === name) {
        return symbolId;
      }
    }
    return null;
  }

  /**
   * Create relationships from collaborations
   *
   * @param collaborations - Collaboration patterns
   * @returns Array of relationships
   * @private
   */
  private createCollaborationRelationships(collaborations: Collaboration[]): UnifiedRelationship[] {
    return collaborations.map((collab) => ({
      id: `collaboration-${collab.symbolA}-${collab.symbolB}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
      type: 'collaboration',
      category: 'behavioral',
      from: collab.symbolA,
      to: collab.symbolB,
      direction: 'unidirectional',
      strength: 'medium',
      evidence: [
        {
          type: 'code',
          source: collab.filePath,
          lineNumber: collab.line,
          confidence: collab.confidence,
        },
      ],
      discoveredBy: 'ast-parsing',
      confidence: collab.confidence,
      properties: {
        pattern: collab.pattern,
        reason: collab.reason,
      },
      description: collab.reason,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }

  /**
   * Create relationships from compositions
   *
   * @param compositions - Composition patterns
   * @returns Array of relationships
   * @private
   */
  private createCompositionRelationships(compositions: Composition[]): UnifiedRelationship[] {
    const relationships: UnifiedRelationship[] = [];

    for (const comp of compositions) {
      // Create one composition relationship from whole to all parts
      relationships.push({
        id: `composition-${comp.whole}-${comp.parts.join('-')}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
        type: 'composition',
        category: 'behavioral',
        from: comp.whole,
        to: comp.parts,
        direction: 'undirected',
        strength: 'strong',
        evidence: [
          {
            type: 'code',
            source: comp.filePath,
            lineNumber: comp.line,
            confidence: comp.confidence,
          },
        ],
        discoveredBy: 'ast-parsing',
        confidence: comp.confidence,
        properties: {
          pattern: comp.pattern,
          partCount: comp.parts.length,
          reason: comp.reason,
        },
        description: comp.reason,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return relationships;
  }

  /**
   * Create relationships from temporal orders
   *
   * @param temporalOrders - Temporal order patterns
   * @returns Array of relationships
   * @private
   */
  private createTemporalOrderRelationships(temporalOrders: TemporalOrder[]): UnifiedRelationship[] {
    return temporalOrders.map((order) => ({
      id: `temporal-order-${order.before}-${order.after}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
      type: 'temporal-order',
      category: 'behavioral',
      from: order.before,
      to: order.after,
      direction: 'unidirectional',
      strength: order.pattern === 'lifecycle' ? 'strong' : 'medium',
      evidence: [
        {
          type: 'code',
          source: order.filePath,
          lineNumber: order.line,
          confidence: order.confidence,
        },
      ],
      discoveredBy: 'ast-parsing',
      confidence: order.confidence,
      properties: {
        pattern: order.pattern,
        reason: order.reason,
      },
      description: order.reason,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }

  /**
   * Get statistics about behavioral relationships
   *
   * @param relationships - Behavioral relationships
   * @returns Statistics object
   * @public
   */
  getStatistics(relationships: UnifiedRelationship[]): {
    totalBehavioral: number;
    collaborations: number;
    compositions: number;
    temporalOrders: number;
    byPattern: Record<string, number>;
  } {
    const stats = {
      totalBehavioral: relationships.length,
      collaborations: 0,
      compositions: 0,
      temporalOrders: 0,
      byPattern: {} as Record<string, number>,
    };

    for (const rel of relationships) {
      if (rel.type === 'collaboration') {
        stats.collaborations++;
      } else if (rel.type === 'composition') {
        stats.compositions++;
      } else if (rel.type === 'temporal-order') {
        stats.temporalOrders++;
      }

      const pattern = rel.properties?.pattern || 'unknown';
      stats.byPattern[pattern] = (stats.byPattern[pattern] || 0) + 1;
    }

    return stats;
  }
}
