/**
 * Fallback Analyzer
 *
 * @packageDocumentation
 * @responsibility Detect fallback relationships (error recovery, default values)
 *
 * @problem Fallback logic is implicit and not tracked
 * @solves Identifies primary-secondary relationships for error recovery
 * @context Essential for understanding resilience and error handling
 *
 * @functionality
 * - Detect try-catch blocks
 * - Detect || and ?? operators
 * - Detect conditional fallbacks
 * - Build fallback relationships
 */

import * as ts from 'typescript';
import type { SymbolGraph } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships';

/**
 * Fallback site information
 */
interface FallbackSite {
  primarySymbolId: string;
  primaryName: string;
  fallbackSymbolId: string;
  fallbackName: string;
  filePath: string;
  line: number;
  pattern: 'try-catch' | 'logical-or' | 'nullish-coalesce' | 'conditional';
}

/**
 * Fallback Analyzer
 *
 * @public
 * @responsibility Detect and analyze fallback relationships
 */
export class FallbackAnalyzer {
  private graph: SymbolGraph;
  private program: ts.Program | null = null;
  private sourceFiles: Map<string, ts.SourceFile> = new Map();

  constructor(graph: SymbolGraph, program?: ts.Program) {
    this.graph = graph;
    this.program = program || null;

    if (this.program) {
      for (const sourceFile of this.program.getSourceFiles()) {
        if (!sourceFile.isDeclarationFile) {
          const normalized = sourceFile.fileName.replace(/\\/g, '/');
          this.sourceFiles.set(normalized, sourceFile);
          this.sourceFiles.set(sourceFile.fileName, sourceFile);
        }
      }
    }
  }

  /**
   * Set TypeScript program for AST analysis
   *
   * @param program - TypeScript program
   * @public
   */
  setProgram(program: ts.Program): void {
    this.program = program;

    for (const sourceFile of program.getSourceFiles()) {
      if (!sourceFile.isDeclarationFile) {
        const normalized = sourceFile.fileName.replace(/\\/g, '/');
        this.sourceFiles.set(normalized, sourceFile);
        this.sourceFiles.set(sourceFile.fileName, sourceFile);
      }
    }
  }

  /**
   * Analyze fallback relationships
   *
   * @returns Array of fallback relationships
   * @public
   */
  analyze(): UnifiedRelationship[] {
    if (!this.program) {
      console.warn('FallbackAnalyzer: No program provided, cannot analyze fallbacks');
      return [];
    }

    const relationships: UnifiedRelationship[] = [];
    const sites: FallbackSite[] = [];

    // Extract fallback sites
    for (const sourceFile of this.sourceFiles.values()) {
      const filePath = sourceFile.fileName;
      if (filePath.includes('node_modules') || /\.(test|spec)\.tsx?$/.test(filePath)) {
        continue;
      }

      this.extractFallbackSites(sourceFile, sites);
    }

    // Create relationships
    const seenPairs = new Set<string>();

    for (const site of sites) {
      const pairKey = `${site.primarySymbolId}->${site.fallbackSymbolId}`;
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);

      const relationship = this.createRelationship(site);
      relationships.push(relationship);
    }

    return relationships;
  }

  /**
   * Extract fallback sites from source file
   *
   * @param sourceFile - Source file
   * @param sites - Array to collect sites
   * @private
   */
  private extractFallbackSites(sourceFile: ts.SourceFile, sites: FallbackSite[]): void {
    const visit = (node: ts.Node): void => {
      try {
        // Pattern 1: try-catch blocks
        if (ts.isTryStatement(node)) {
          this.analyzeTryCatch(node, sourceFile, sites);
        }

        // Pattern 2: Logical OR (||)
        if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
          this.analyzeBinaryExpression(node, sourceFile, sites, 'logical-or');
        }

        // Pattern 3: Nullish coalescing (??)
        if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
          this.analyzeBinaryExpression(node, sourceFile, sites, 'nullish-coalesce');
        }

        // Pattern 4: Conditional expressions
        if (ts.isConditionalExpression(node)) {
          this.analyzeConditional(node, sourceFile, sites);
        }
      } catch (error) {
        // Skip nodes that cause errors
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  /**
   * Analyze try-catch block
   *
   * @param node - Try statement node
   * @param sourceFile - Source file
   * @param sites - Array to collect sites
   * @private
   */
  private analyzeTryCatch(node: ts.TryStatement, sourceFile: ts.SourceFile, sites: FallbackSite[]): void {
    if (!node.catchClause) return;

    // Try to find function calls in try and catch blocks
    const tryCallExpressions = this.findCallExpressions(node.tryBlock);
    const catchCallExpressions = this.findCallExpressions(node.catchClause.block);

    if (tryCallExpressions.length > 0 && catchCallExpressions.length > 0) {
      const primaryCall = tryCallExpressions[0];
      const fallbackCall = catchCallExpressions[0];

      const primarySymbol = this.findSymbolForExpression(primaryCall.expression, sourceFile);
      const fallbackSymbol = this.findSymbolForExpression(fallbackCall.expression, sourceFile);

      if (primarySymbol && fallbackSymbol && primarySymbol.id !== fallbackSymbol.id) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

        sites.push({
          primarySymbolId: primarySymbol.id,
          primaryName: primarySymbol.name,
          fallbackSymbolId: fallbackSymbol.id,
          fallbackName: fallbackSymbol.name,
          filePath: sourceFile.fileName,
          line,
          pattern: 'try-catch'
        });
      }
    }
  }

  /**
   * Analyze binary expression (|| or ??)
   *
   * @param node - Binary expression node
   * @param sourceFile - Source file
   * @param sites - Array to collect sites
   * @param pattern - Pattern type
   * @private
   */
  private analyzeBinaryExpression(
    node: ts.BinaryExpression,
    sourceFile: ts.SourceFile,
    sites: FallbackSite[],
    pattern: 'logical-or' | 'nullish-coalesce'
  ): void {
    const primarySymbol = this.findSymbolForExpression(node.left, sourceFile);
    const fallbackSymbol = this.findSymbolForExpression(node.right, sourceFile);

    if (primarySymbol && fallbackSymbol && primarySymbol.id !== fallbackSymbol.id) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

      sites.push({
        primarySymbolId: primarySymbol.id,
        primaryName: primarySymbol.name,
        fallbackSymbolId: fallbackSymbol.id,
        fallbackName: fallbackSymbol.name,
        filePath: sourceFile.fileName,
        line,
        pattern
      });
    }
  }

  /**
   * Analyze conditional expression
   *
   * @param node - Conditional expression node
   * @param sourceFile - Source file
   * @param sites - Array to collect sites
   * @private
   */
  private analyzeConditional(node: ts.ConditionalExpression, sourceFile: ts.SourceFile, sites: FallbackSite[]): void {
    const primarySymbol = this.findSymbolForExpression(node.whenTrue, sourceFile);
    const fallbackSymbol = this.findSymbolForExpression(node.whenFalse, sourceFile);

    if (primarySymbol && fallbackSymbol && primarySymbol.id !== fallbackSymbol.id) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

      sites.push({
        primarySymbolId: primarySymbol.id,
        primaryName: primarySymbol.name,
        fallbackSymbolId: fallbackSymbol.id,
        fallbackName: fallbackSymbol.name,
        filePath: sourceFile.fileName,
        line,
        pattern: 'conditional'
      });
    }
  }

  /**
   * Find call expressions in a node
   *
   * @param node - Node to search
   * @returns Array of call expressions
   * @private
   */
  private findCallExpressions(node: ts.Node): ts.CallExpression[] {
    const calls: ts.CallExpression[] = [];

    const visit = (n: ts.Node): void => {
      if (ts.isCallExpression(n)) {
        calls.push(n);
      }
      ts.forEachChild(n, visit);
    };

    visit(node);
    return calls;
  }

  /**
   * Find symbol for expression
   *
   * @param expression - Expression node
   * @param sourceFile - Source file
   * @returns Symbol or null
   * @private
   */
  private findSymbolForExpression(expression: ts.Expression, sourceFile: ts.SourceFile): { id: string; name: string } | null {
    let name: string | null = null;

    if (ts.isIdentifier(expression)) {
      name = expression.text;
    } else if (ts.isPropertyAccessExpression(expression)) {
      name = expression.name.text;
    } else if (ts.isCallExpression(expression)) {
      return this.findSymbolForExpression(expression.expression, sourceFile);
    }

    if (!name) return null;

    // Find symbol by name
    for (const symbol of this.graph.symbols.values()) {
      if (symbol.name === name) {
        return { id: symbol.id, name: symbol.name };
      }
    }

    return null;
  }

  /**
   * Create relationship from fallback site
   *
   * @param site - Fallback site
   * @returns Unified relationship
   * @private
   */
  private createRelationship(site: FallbackSite): UnifiedRelationship {
    const timestamp = new Date().toISOString();
    const confidence = site.pattern === 'try-catch' ? 0.9 : 0.7;

    return {
      id: `fallback-${site.primarySymbolId}-${site.fallbackSymbolId}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
      type: 'fallback',
      from: site.primarySymbolId,
      to: site.fallbackSymbolId,
      direction: 'unidirectional',
      strength: 'medium',
      category: 'alternative',
      evidence: [
        {
          type: 'code',
          source: site.filePath,
          lineNumber: site.line,
          snippet: `${site.pattern}: ${site.primaryName} fallback to ${site.fallbackName}`,
          confidence,
          context: `Fallback pattern detected`
        }
      ],
      discoveredBy: 'ast-parsing',
      confidence,
      filePath: site.filePath,
      line: site.line,
      properties: {
        pattern: site.pattern,
        primary: site.primaryName,
        fallback: site.fallbackName
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      description: `${site.primaryName} falls back to ${site.fallbackName} (${site.pattern})`
    };
  }

  /**
   * Get fallback statistics
   *
   * @param relationships - Array of fallback relationships
   * @returns Statistics
   * @public
   */
  getStatistics(relationships: UnifiedRelationship[]): {
    totalFallbacks: number;
    byPattern: Record<string, number>;
  } {
    const byPattern: Record<string, number> = {
      'try-catch': 0,
      'logical-or': 0,
      'nullish-coalesce': 0,
      'conditional': 0
    };

    for (const rel of relationships) {
      const pattern = rel.properties?.pattern;
      if (pattern && pattern in byPattern) {
        byPattern[pattern]++;
      }
    }

    return {
      totalFallbacks: relationships.length,
      byPattern
    };
  }
}
