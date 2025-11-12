/**
 * Temporal Order Analyzer
 *
 * @packageDocumentation
 * @responsibility Detect temporal-order relationships (execution sequence)
 *
 * @problem Execution order dependencies are implicit in code
 * @solves Identifies "A must execute before B" relationships
 * @context Essential for understanding initialization, lifecycle, and sequential logic
 *
 * @functionality
 * - Detect sequential function calls
 * - Detect lifecycle method ordering
 * - Detect promise chain ordering
 * - Build temporal-order relationships
 */

import * as ts from 'typescript';
import type { SymbolGraph } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships';

/**
 * Temporal order site
 */
interface TemporalOrderSite {
  firstSymbolId: string;
  firstSymbolName: string;
  secondSymbolId: string;
  secondSymbolName: string;
  filePath: string;
  line: number;
  pattern: 'sequential-calls' | 'lifecycle' | 'promise-chain' | 'setup-teardown';
}

/**
 * Temporal Order Analyzer
 *
 * @public
 * @responsibility Detect and analyze temporal-order relationships
 */
export class TemporalOrderAnalyzer {
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
   * Analyze temporal-order relationships
   *
   * @returns Array of temporal-order relationships
   * @public
   */
  analyze(): UnifiedRelationship[] {
    if (!this.program) {
      console.warn('TemporalOrderAnalyzer: No program provided, cannot analyze');
      return [];
    }

    const relationships: UnifiedRelationship[] = [];
    const sites: TemporalOrderSite[] = [];

    // Extract temporal order sites
    for (const sourceFile of this.sourceFiles.values()) {
      const filePath = sourceFile.fileName;
      if (filePath.includes('node_modules') || /\.(test|spec)\.tsx?$/.test(filePath)) {
        continue;
      }

      this.extractTemporalOrderSites(sourceFile, sites);
    }

    // Create relationships
    const seenPairs = new Set<string>();

    for (const site of sites) {
      const pairKey = `${site.firstSymbolId}->${site.secondSymbolId}`;
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);

      const relationship = this.createRelationship(site);
      relationships.push(relationship);
    }

    return relationships;
  }

  /**
   * Extract temporal order sites from source file
   *
   * @param sourceFile - Source file
   * @param sites - Array to collect sites
   * @private
   */
  private extractTemporalOrderSites(sourceFile: ts.SourceFile, sites: TemporalOrderSite[]): void {
    const visit = (node: ts.Node): void => {
      try {
        // Pattern 1: Sequential function calls in a block
        if (ts.isBlock(node)) {
          this.analyzeSequentialCalls(node, sourceFile, sites);
        }

        // Pattern 2: Lifecycle methods (beforeEach, afterEach, etc.)
        if (ts.isCallExpression(node)) {
          this.analyzeLifecyclePattern(node, sourceFile, sites);
        }

        // Pattern 3: Promise chains
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
          if (node.expression.name.text === 'then') {
            this.analyzePromiseChain(node, sourceFile, sites);
          }
        }
      } catch (error) {
        // Skip nodes that cause errors
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  /**
   * Analyze sequential function calls in a block
   *
   * @param block - Block node
   * @param sourceFile - Source file
   * @param sites - Array to collect sites
   * @private
   */
  private analyzeSequentialCalls(block: ts.Node, sourceFile: ts.SourceFile, sites: TemporalOrderSite[]): void {
    if (!ts.isBlock(block)) return;

    const statements = block.statements;
    if (!statements || statements.length < 2) return;

    const callExpressions: { expr: ts.CallExpression; index: number }[] = [];

    // Collect call expressions (including awaited calls)
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];

      // Direct call: functionName()
      if (ts.isExpressionStatement(stmt) && ts.isCallExpression(stmt.expression)) {
        callExpressions.push({ expr: stmt.expression, index: i });
      }
      // Await call: await functionName()
      else if (ts.isExpressionStatement(stmt) && ts.isAwaitExpression(stmt.expression)) {
        if (ts.isCallExpression(stmt.expression.expression)) {
          callExpressions.push({ expr: stmt.expression.expression, index: i });
        }
      }
      // Variable assignment with call: const x = functionName()
      else if (ts.isVariableStatement(stmt)) {
        for (const decl of stmt.declarationList.declarations) {
          if (decl.initializer && ts.isCallExpression(decl.initializer)) {
            callExpressions.push({ expr: decl.initializer, index: i });
          }
          // const x = await functionName()
          else if (decl.initializer && ts.isAwaitExpression(decl.initializer)) {
            if (ts.isCallExpression(decl.initializer.expression)) {
              callExpressions.push({ expr: decl.initializer.expression, index: i });
            }
          }
        }
      }
    }

    // Find sequential pairs
    for (let i = 0; i < callExpressions.length - 1; i++) {
      const first = callExpressions[i].expr;
      const second = callExpressions[i + 1].expr;

      const firstSymbol = this.findSymbolForExpression(first.expression, sourceFile);
      const secondSymbol = this.findSymbolForExpression(second.expression, sourceFile);

      if (firstSymbol && secondSymbol && firstSymbol.id !== secondSymbol.id) {
        const line = sourceFile.getLineAndCharacterOfPosition(first.getStart(sourceFile)).line + 1;

        sites.push({
          firstSymbolId: firstSymbol.id,
          firstSymbolName: firstSymbol.name,
          secondSymbolId: secondSymbol.id,
          secondSymbolName: secondSymbol.name,
          filePath: sourceFile.fileName,
          line,
          pattern: 'sequential-calls'
        });
      }
    }
  }

  /**
   * Analyze lifecycle patterns
   *
   * @param node - Call expression node
   * @param sourceFile - Source file
   * @param sites - Array to collect sites
   * @private
   */
  private analyzeLifecyclePattern(node: ts.CallExpression, sourceFile: ts.SourceFile, sites: TemporalOrderSite[]): void {
    if (!ts.isIdentifier(node.expression)) return;

    const lifecycleNames = ['beforeEach', 'afterEach', 'beforeAll', 'afterAll', 'setup', 'teardown'];
    const methodName = node.expression.text;

    if (lifecycleNames.includes(methodName)) {
      // This is a lifecycle method - could extract ordering info if needed
      // For now, we just note its existence
    }
  }

  /**
   * Analyze promise chains
   *
   * @param node - Call expression node
   * @param sourceFile - Source file
   * @param sites - Array to collect sites
   * @private
   */
  private analyzePromiseChain(node: ts.CallExpression, sourceFile: ts.SourceFile, sites: TemporalOrderSite[]): void {
    if (!ts.isPropertyAccessExpression(node.expression)) return;

    const promiseSymbol = this.findSymbolForExpression(node.expression.expression, sourceFile);

    if (node.arguments.length > 0 && promiseSymbol) {
      const callbackArg = node.arguments[0];
      const callbackSymbol = this.findSymbolForExpression(callbackArg, sourceFile);

      if (callbackSymbol && promiseSymbol.id !== callbackSymbol.id) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

        sites.push({
          firstSymbolId: promiseSymbol.id,
          firstSymbolName: promiseSymbol.name,
          secondSymbolId: callbackSymbol.id,
          secondSymbolName: callbackSymbol.name,
          filePath: sourceFile.fileName,
          line,
          pattern: 'promise-chain'
        });
      }
    }
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
   * Create relationship from temporal order site
   *
   * @param site - Temporal order site
   * @returns Unified relationship
   * @private
   */
  private createRelationship(site: TemporalOrderSite): UnifiedRelationship {
    const timestamp = new Date().toISOString();
    const confidence = site.pattern === 'sequential-calls' ? 0.7 : 0.6;

    return {
      id: `temporal-order-${site.firstSymbolId}-${site.secondSymbolId}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
      type: 'temporal-order',
      from: site.firstSymbolId,
      to: site.secondSymbolId,
      direction: 'unidirectional',
      strength: 'medium',
      category: 'behavioral',
      evidence: [
        {
          type: 'code',
          source: site.filePath,
          lineNumber: site.line,
          snippet: `${site.firstSymbolName} → ${site.secondSymbolName}`,
          confidence,
          context: `Temporal ordering via ${site.pattern}`
        }
      ],
      discoveredBy: 'ast-parsing',
      confidence,
      filePath: site.filePath,
      line: site.line,
      properties: {
        pattern: site.pattern,
        first: site.firstSymbolName,
        second: site.secondSymbolName
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      description: `${site.firstSymbolName} must execute before ${site.secondSymbolName} (${site.pattern})`
    };
  }

  /**
   * Get temporal order statistics
   *
   * @param relationships - Array of temporal order relationships
   * @returns Statistics
   * @public
   */
  getStatistics(relationships: UnifiedRelationship[]): {
    totalOrders: number;
    byPattern: Record<string, number>;
  } {
    const byPattern: Record<string, number> = {
      'sequential-calls': 0,
      'lifecycle': 0,
      'promise-chain': 0,
      'setup-teardown': 0
    };

    for (const rel of relationships) {
      const pattern = rel.properties?.pattern;
      if (pattern && pattern in byPattern) {
        byPattern[pattern]++;
      }
    }

    return {
      totalOrders: relationships.length,
      byPattern
    };
  }
}
