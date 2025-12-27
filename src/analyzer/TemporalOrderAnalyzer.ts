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
 * @doc [[TemporalOrderAnalyzer]]
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
   * @returns void - No return value
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

        // Pattern 3: Promise chains (.then())
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
          if (node.expression.name.text === 'then' || node.expression.name.text === 'catch') {
            this.analyzePromiseChain(node, sourceFile, sites);
          }
        }

        // Pattern 4: Constructor field initialization order
        if (ts.isConstructorDeclaration(node)) {
          this.analyzeConstructorSequence(node, sourceFile, sites);
        }

        // Pattern 5: Async/await chains
        if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isArrowFunction(node)) {
          if (node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword)) {
            if (node.body && ts.isBlock(node.body)) {
              this.analyzeAsyncSequence(node.body, sourceFile, sites);
            }
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

    const methodName = node.expression.text;

    // beforeEach/beforeAll always runs before the test
    // afterEach/afterAll always runs after the test
    const beforeHooks = ['beforeEach', 'beforeAll', 'setup'];
    const afterHooks = ['afterEach', 'afterAll', 'teardown'];

    if (beforeHooks.includes(methodName) || afterHooks.includes(methodName)) {
      // Extract the callback function from the lifecycle hook
      if (node.arguments.length > 0) {
        const callback = node.arguments[0];

        // Look for function calls within the callback
        if (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback)) {
          if (callback.body && ts.isBlock(callback.body)) {
            // Extract calls from the lifecycle callback
            const calls: ts.CallExpression[] = [];

            const extractCalls = (node: ts.Node) => {
              if (ts.isCallExpression(node)) {
                calls.push(node);
              }
              ts.forEachChild(node, extractCalls);
            };

            extractCalls(callback.body);

            // Create temporal relationships for calls within lifecycle hooks
            for (let i = 0; i < calls.length - 1; i++) {
              const first = calls[i];
              const second = calls[i + 1];

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
                  pattern: 'setup-teardown'
                });
              }
            }
          }
        }
      }
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
   * Analyze constructor field initialization sequence
   *
   * @param constructor - Constructor declaration node
   * @param sourceFile - Source file
   * @param sites - Array to collect sites
   * @private
   */
  private analyzeConstructorSequence(constructor: ts.ConstructorDeclaration, sourceFile: ts.SourceFile, sites: TemporalOrderSite[]): void {
    if (!constructor.body) return;

    const assignments: { target: string; index: number; node: ts.Node }[] = [];

    // Collect field assignments and method calls
    for (let i = 0; i < constructor.body.statements.length; i++) {
      const stmt = constructor.body.statements[i];

      // this.field = value
      if (ts.isExpressionStatement(stmt) && ts.isBinaryExpression(stmt.expression)) {
        if (stmt.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
            ts.isPropertyAccessExpression(stmt.expression.left) &&
            stmt.expression.left.expression.kind === ts.SyntaxKind.ThisKeyword) {
          const fieldName = stmt.expression.left.name.text;
          assignments.push({ target: fieldName, index: i, node: stmt });
        }
      }
    }

    // Create sequential relationships for field initialization order
    for (let i = 0; i < assignments.length - 1; i++) {
      const first = assignments[i];
      const second = assignments[i + 1];

      const line = sourceFile.getLineAndCharacterOfPosition(first.node.getStart(sourceFile)).line + 1;

      // Try to resolve these as properties of the containing class
      sites.push({
        firstSymbolId: `property-${first.target.toLowerCase()}`,
        firstSymbolName: first.target,
        secondSymbolId: `property-${second.target.toLowerCase()}`,
        secondSymbolName: second.target,
        filePath: sourceFile.fileName,
        line,
        pattern: 'sequential-calls'
      });
    }
  }

  /**
   * Analyze async/await execution sequences
   *
   * @param block - Block node from async function
   * @param sourceFile - Source file
   * @param sites - Array to collect sites
   * @private
   */
  private analyzeAsyncSequence(block: ts.Block, sourceFile: ts.SourceFile, sites: TemporalOrderSite[]): void {
    const awaitCalls: { expr: ts.CallExpression; index: number }[] = [];

    // Collect await expressions
    for (let i = 0; i < block.statements.length; i++) {
      const stmt = block.statements[i];

      // await functionName()
      if (ts.isExpressionStatement(stmt) && ts.isAwaitExpression(stmt.expression)) {
        if (ts.isCallExpression(stmt.expression.expression)) {
          awaitCalls.push({ expr: stmt.expression.expression, index: i });
        }
      }
      // const x = await functionName()
      else if (ts.isVariableStatement(stmt)) {
        for (const decl of stmt.declarationList.declarations) {
          if (decl.initializer && ts.isAwaitExpression(decl.initializer)) {
            if (ts.isCallExpression(decl.initializer.expression)) {
              awaitCalls.push({ expr: decl.initializer.expression, index: i });
            }
          }
        }
      }
      // return await functionName()
      else if (ts.isReturnStatement(stmt) && stmt.expression && ts.isAwaitExpression(stmt.expression)) {
        if (ts.isCallExpression(stmt.expression.expression)) {
          awaitCalls.push({ expr: stmt.expression.expression, index: i });
        }
      }
    }

    // Find sequential await pairs
    for (let i = 0; i < awaitCalls.length - 1; i++) {
      const first = awaitCalls[i].expr;
      const second = awaitCalls[i + 1].expr;

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
      // For this.method(), get the method name
      name = expression.name.text;
      // Also try to get the full qualified name
      const obj = expression.expression;
      if (ts.isIdentifier(obj)) {
        name = `${obj.text}.${name}`;
      }
    } else if (ts.isCallExpression(expression)) {
      return this.findSymbolForExpression(expression.expression, sourceFile);
    }

    if (!name) return null;

    // Try nameIndex first for O(1) lookup
    if (this.graph.nameIndex && this.graph.nameIndex.has(name)) {
      const symbolIds = this.graph.nameIndex.get(name);
      if (symbolIds && symbolIds.length > 0) {
        const symbolId = symbolIds[0];
        const symbol = this.graph.symbols.get(symbolId);
        if (symbol) {
          return { id: symbolId, name: symbol.name };
        }
      }
    }

    // Fallback: search through all symbols for partial match
    for (const [symbolId, symbol] of this.graph.symbols.entries()) {
      if (symbol.name === name || symbol.name.endsWith(`.${name}`)) {
        return { id: symbolId, name: symbol.name };
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
