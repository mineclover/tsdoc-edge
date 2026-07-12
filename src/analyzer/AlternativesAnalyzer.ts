/**
 * Alternatives Analyzer
 *
 * @doc [[AlternativesAnalyzer]]
 * @packageDocumentation
 * @responsibility Detect substitution and fallback relationships
 *
 * @problem Alternative implementations and fallback patterns are implicit
 * @solves Static analysis of interface implementations and fallback logic
 * @context Essential for understanding system resilience and flexibility
 *
 * @functionality
 * - Detect substitution (multiple implementations of same interface)
 * - Detect fallback patterns (try-catch, null coalescing, conditionals)
 * - Identify alternative execution paths
 * - Map resilience strategies
 */

import * as ts from 'typescript';
import type { SymbolGraph } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships';

/**
 * Substitution relationship (A OR B can be used)
 */
interface Substitution {
  symbolA: string;
  symbolB: string;
  interface: string;
  reason: string;
  filePath: string;
  line: number;
  confidence: number;
}

/**
 * Fallback relationship (Try A, if fails use B)
 */
interface Fallback {
  primary: string;
  fallback: string;
  pattern: 'try-catch' | 'null-coalescing' | 'conditional' | 'default-param';
  reason: string;
  filePath: string;
  line: number;
  confidence: number;
}

/**
 * Alternatives Analyzer
 *
 * @public
 * @responsibility Detect and analyze alternative relationships
 */
export class AlternativesAnalyzer {
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
   * @returns void - No return value
   * @public
   */
  setProgram(program: ts.Program): void {
    this.program = program;
    this.checker = program.getTypeChecker();
  }

  /**
   * Analyze all alternative relationships
   *
   * @returns Array of alternative relationships
   * @public
   */
  analyze(): UnifiedRelationship[] {
    const relationships: UnifiedRelationship[] = [];

    if (!this.program || !this.checker) {
      console.warn('AlternativesAnalyzer: No program provided, cannot analyze alternatives');
      return [];
    }

    // Detect substitution relationships
    const substitutions = this.detectSubstitutions();
    relationships.push(...this.createSubstitutionRelationships(substitutions));

    // Detect fallback relationships
    const fallbacks = this.detectFallbacks();
    relationships.push(...this.createFallbackRelationships(fallbacks));

    return relationships;
  }

  /**
   * Detect substitution relationships (same interface implementations)
   *
   * @returns Array of substitution relationships
   * @private
   */
  private detectSubstitutions(): Substitution[] {
    if (!this.program || !this.checker) return [];

    const substitutions: Substitution[] = [];
    const implementationsByInterface = new Map<
      string,
      Array<{ symbolId: string; filePath: string; line: number }>
    >();

    // Find all class implementations
    for (const sourceFile of this.program.getSourceFiles()) {
      if (sourceFile.isDeclarationFile) continue;

      const filePath = sourceFile.fileName.replace(/\\/g, '/');

      // Skip node_modules and test files
      if (filePath.includes('node_modules') || /\.(test|spec)\.tsx?$/.test(filePath)) {
        continue;
      }

      this.extractImplementations(sourceFile, filePath, implementationsByInterface);
    }

    // Create substitution relationships for classes implementing same interface
    for (const [interfaceName, implementations] of implementationsByInterface.entries()) {
      if (implementations.length >= 2) {
        // Create pairwise substitution relationships
        for (let i = 0; i < implementations.length; i++) {
          for (let j = i + 1; j < implementations.length; j++) {
            const implA = implementations[i];
            const implB = implementations[j];

            substitutions.push({
              symbolA: implA.symbolId,
              symbolB: implB.symbolId,
              interface: interfaceName,
              reason: `Both implement ${interfaceName}`,
              filePath: implA.filePath,
              line: implA.line,
              confidence: 0.9,
            });
          }
        }
      }
    }

    return substitutions;
  }

  /**
   * Extract implementation relationships from source file
   *
   * @param sourceFile - TypeScript source file
   * @param filePath - File path
   * @param implementationsByInterface - Map to collect implementations
   * @private
   */
  private extractImplementations(
    sourceFile: ts.SourceFile,
    filePath: string,
    implementationsByInterface: Map<
      string,
      Array<{ symbolId: string; filePath: string; line: number }>
    >
  ): void {
    const visit = (node: ts.Node): void => {
      try {
        // class MyClass implements IInterface
        if (ts.isClassDeclaration(node) && node.name && node.heritageClauses) {
          const className = node.name.text;
          const symbolId = this.findSymbolByName(className);

          if (symbolId) {
            for (const clause of node.heritageClauses) {
              if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
                for (const type of clause.types) {
                  const interfaceName = type.expression.getText(sourceFile);

                  if (!implementationsByInterface.has(interfaceName)) {
                    implementationsByInterface.set(interfaceName, []);
                  }

                  const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
                  implementationsByInterface.get(interfaceName)?.push({
                    symbolId,
                    filePath,
                    line,
                  });
                }
              }
            }
          }
        }

        ts.forEachChild(node, visit);
      } catch (_error) {
        // Skip this node on error
        return;
      }
    };

    visit(sourceFile);
  }

  /**
   * Detect fallback relationships
   *
   * @returns Array of fallback relationships
   * @private
   */
  private detectFallbacks(): Fallback[] {
    if (!this.program) return [];

    const fallbacks: Fallback[] = [];

    for (const sourceFile of this.program.getSourceFiles()) {
      if (sourceFile.isDeclarationFile) continue;

      const filePath = sourceFile.fileName.replace(/\\/g, '/');

      // Skip node_modules and test files
      if (filePath.includes('node_modules') || /\.(test|spec)\.tsx?$/.test(filePath)) {
        continue;
      }

      this.extractFallbackPatterns(sourceFile, filePath, fallbacks);
    }

    return fallbacks;
  }

  /**
   * Extract fallback patterns from source file
   *
   * @param sourceFile - TypeScript source file
   * @param filePath - File path
   * @param fallbacks - Array to collect fallbacks
   * @private
   */
  private extractFallbackPatterns(
    sourceFile: ts.SourceFile,
    filePath: string,
    fallbacks: Fallback[]
  ): void {
    const visit = (node: ts.Node): void => {
      try {
        // Pattern 1: try-catch fallback
        if (ts.isTryStatement(node)) {
          const trySymbol = this.findSymbolInBlock(node.tryBlock, sourceFile);
          const catchSymbol = node.catchClause
            ? this.findSymbolInBlock(node.catchClause.block, sourceFile)
            : null;

          if (trySymbol && catchSymbol && trySymbol !== catchSymbol) {
            const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

            fallbacks.push({
              primary: trySymbol,
              fallback: catchSymbol,
              pattern: 'try-catch',
              reason: 'Try-catch fallback pattern',
              filePath,
              line,
              confidence: 0.8,
            });
          }
        }

        // Pattern 2: Null coalescing (a ?? b)
        if (ts.isBinaryExpression(node)) {
          if (node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
            const primarySymbol = this.findSymbolInExpression(node.left, sourceFile);
            const fallbackSymbol = this.findSymbolInExpression(node.right, sourceFile);

            if (primarySymbol && fallbackSymbol && primarySymbol !== fallbackSymbol) {
              const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

              fallbacks.push({
                primary: primarySymbol,
                fallback: fallbackSymbol,
                pattern: 'null-coalescing',
                reason: 'Null coalescing operator (??)',
                filePath,
                line,
                confidence: 0.9,
              });
            }
          }

          // Pattern 3: Logical OR fallback (a || b)
          if (node.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
            const primarySymbol = this.findSymbolInExpression(node.left, sourceFile);
            const fallbackSymbol = this.findSymbolInExpression(node.right, sourceFile);

            if (primarySymbol && fallbackSymbol && primarySymbol !== fallbackSymbol) {
              const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

              fallbacks.push({
                primary: primarySymbol,
                fallback: fallbackSymbol,
                pattern: 'null-coalescing',
                reason: 'Logical OR fallback (||)',
                filePath,
                line,
                confidence: 0.7,
              });
            }
          }
        }

        // Pattern 4: Conditional fallback (if-else)
        if (ts.isIfStatement(node) && node.elseStatement) {
          const ifSymbol = this.findSymbolInBlock(node.thenStatement, sourceFile);
          const elseSymbol = this.findSymbolInBlock(node.elseStatement, sourceFile);

          if (ifSymbol && elseSymbol && ifSymbol !== elseSymbol) {
            const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

            fallbacks.push({
              primary: ifSymbol,
              fallback: elseSymbol,
              pattern: 'conditional',
              reason: 'Conditional fallback (if-else)',
              filePath,
              line,
              confidence: 0.6,
            });
          }
        }

        ts.forEachChild(node, visit);
      } catch (_error) {
        // Skip this node on error
        return;
      }
    };

    visit(sourceFile);
  }

  /**
   * Find symbol in a block statement
   *
   * @param statement - Statement node
   * @param sourceFile - Source file
   * @returns Symbol ID or null
   * @private
   */
  private findSymbolInBlock(statement: ts.Statement, sourceFile: ts.SourceFile): string | null {
    let foundSymbol: string | null = null;

    const visit = (node: ts.Node): void => {
      if (foundSymbol) return; // Already found

      // Look for function calls
      if (ts.isCallExpression(node)) {
        const symbol = this.findSymbolInExpression(node.expression, sourceFile);
        if (symbol) {
          foundSymbol = symbol;
          return;
        }
      }

      // Look for identifiers
      if (ts.isIdentifier(node)) {
        const symbol = this.findSymbolByName(node.text);
        if (symbol) {
          foundSymbol = symbol;
          return;
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(statement);
    return foundSymbol;
  }

  /**
   * Find symbol in an expression
   *
   * @param expression - Expression node
   * @param sourceFile - Source file
   * @returns Symbol ID or null
   * @private
   */
  private findSymbolInExpression(
    expression: ts.Expression,
    sourceFile: ts.SourceFile
  ): string | null {
    if (ts.isIdentifier(expression)) {
      return this.findSymbolByName(expression.text);
    }

    if (ts.isPropertyAccessExpression(expression)) {
      return this.findSymbolByName(expression.name.text);
    }

    if (ts.isCallExpression(expression)) {
      return this.findSymbolInExpression(expression.expression, sourceFile);
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
   * Create relationships from substitution constraints
   *
   * @param substitutions - Substitution constraints
   * @returns Array of relationships
   * @private
   */
  private createSubstitutionRelationships(substitutions: Substitution[]): UnifiedRelationship[] {
    return substitutions.map((sub) => ({
      id: `substitution-${sub.symbolA}-${sub.symbolB}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
      type: 'substitution',
      category: 'alternative',
      from: sub.symbolA,
      to: sub.symbolB,
      direction: 'bidirectional',
      strength: 'strong',
      evidence: [
        {
          type: 'code',
          source: sub.filePath,
          lineNumber: sub.line,
          confidence: sub.confidence,
        },
      ],
      discoveredBy: 'static-analysis',
      confidence: sub.confidence,
      properties: {
        interface: sub.interface,
        reason: sub.reason,
      },
      description: sub.reason,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }

  /**
   * Create relationships from fallback patterns
   *
   * @param fallbacks - Fallback patterns
   * @returns Array of relationships
   * @private
   */
  private createFallbackRelationships(fallbacks: Fallback[]): UnifiedRelationship[] {
    return fallbacks.map((fb) => ({
      id: `fallback-${fb.primary}-${fb.fallback}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
      type: 'fallback',
      category: 'alternative',
      from: fb.primary,
      to: fb.fallback,
      direction: 'unidirectional',
      strength:
        fb.pattern === 'try-catch' || fb.pattern === 'null-coalescing' ? 'strong' : 'medium',
      evidence: [
        {
          type: 'code',
          source: fb.filePath,
          lineNumber: fb.line,
          confidence: fb.confidence,
        },
      ],
      discoveredBy: 'ast-parsing',
      confidence: fb.confidence,
      properties: {
        pattern: fb.pattern,
        reason: fb.reason,
      },
      description: fb.reason,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }

  /**
   * Get statistics about alternatives
   *
   * @param relationships - Alternative relationships
   * @returns Statistics object
   * @public
   */
  getStatistics(relationships: UnifiedRelationship[]): {
    totalAlternatives: number;
    substitutions: number;
    fallbacks: number;
    byPattern: Record<string, number>;
  } {
    const stats = {
      totalAlternatives: relationships.length,
      substitutions: 0,
      fallbacks: 0,
      byPattern: {} as Record<string, number>,
    };

    for (const rel of relationships) {
      if (rel.type === 'substitution') {
        stats.substitutions++;
      } else if (rel.type === 'fallback') {
        stats.fallbacks++;
        const pattern = rel.properties?.pattern || 'unknown';
        stats.byPattern[pattern] = (stats.byPattern[pattern] || 0) + 1;
      }
    }

    return stats;
  }
}
