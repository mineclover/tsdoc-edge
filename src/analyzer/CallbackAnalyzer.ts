/**
 * Callback Analyzer
 *
 * @doc [[CallbackAnalyzer]]
 * @packageDocumentation
 * @responsibility Detect callback relationships (function parameters, Promises, async/await)
 *
 * @problem Callback relationships are implicit and hard to track
 * @solves Static analysis of callback passing and async control flow
 * @context Essential for understanding async execution and dependency inversion
 *
 * @functionality
 * - Detect function parameters passed as callbacks
 * - Detect Promise.then/.catch chains
 * - Detect async/await patterns
 * - Map callback providers to callback consumers
 */

import * as ts from 'typescript';
import type { SymbolGraph } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships';

/**
 * Callback usage site
 */
interface CallbackUsage {
  callerSymbolId: string;
  callerName: string;
  callbackSymbolId: string;
  callbackName: string;
  filePath: string;
  line: number;
  pattern: 'parameter' | 'promise-then' | 'promise-catch' | 'async-await';
}

/**
 * Callback Analyzer
 *
 * @public
 * @responsibility Detect and analyze callback relationships
 */
export class CallbackAnalyzer {
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
   * Analyze callback relationships across all source files
   *
   * @returns Array of callback relationships
   * @public
   */
  analyze(): UnifiedRelationship[] {
    if (!this.program) {
      console.warn('CallbackAnalyzer: No program provided, cannot analyze callbacks');
      return [];
    }

    const callbackUsages: CallbackUsage[] = [];

    // Extract callback usages from all files
    for (const sourceFile of this.program.getSourceFiles()) {
      if (sourceFile.isDeclarationFile) continue;

      const filePath = sourceFile.fileName.replace(/\\/g, '/');

      // Skip node_modules and test files
      if (filePath.includes('node_modules') || /\.(test|spec)\.tsx?$/.test(filePath)) {
        continue;
      }

      this.extractCallbackPatterns(sourceFile, filePath, callbackUsages);
    }

    // Create relationships
    const relationships: UnifiedRelationship[] = [];
    const seenPairs = new Set<string>();

    for (const usage of callbackUsages) {
      const pairKey = `${usage.callerSymbolId}->${usage.callbackSymbolId}`;

      // Skip duplicates
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);

      const strength = usage.pattern === 'async-await' ? 'strong' : 'medium';
      const confidence = usage.pattern === 'parameter' ? 0.7 : 0.8;

      const relationship: UnifiedRelationship = {
        id: `callback-${usage.callerSymbolId}-${usage.callbackSymbolId}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
        type: 'callback',
        category: 'behavioral',
        from: usage.callerSymbolId,
        to: usage.callbackSymbolId,
        direction: 'unidirectional',
        strength,
        evidence: [
          {
            type: 'code',
            source: usage.filePath,
            lineNumber: usage.line,
            confidence,
          },
        ],
        discoveredBy: 'static-analysis',
        confidence,
        filePath: usage.filePath,
        line: usage.line,
        properties: {
          pattern: usage.pattern,
          caller: usage.callerName,
          callback: usage.callbackName,
        },
        description: `${usage.callerName} uses ${usage.callbackName} as callback (${usage.pattern})`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      relationships.push(relationship);
    }

    return relationships;
  }

  /**
   * Extract callback patterns from a source file
   *
   * @param sourceFile - TypeScript source file
   * @param filePath - File path
   * @param usages - Array to collect callback usages
   */
  private extractCallbackPatterns(
    sourceFile: ts.SourceFile,
    filePath: string,
    usages: CallbackUsage[]
  ): void {
    const visit = (node: ts.Node): void => {
      try {
        // Pattern 1: Function parameter callbacks
        // Example: processData(data, handleResult)
        if (ts.isCallExpression(node)) {
          const callerSymbolId = this.findSymbolIdForExpression(node.expression, sourceFile);

          if (callerSymbolId) {
            const callerName = this.getSymbolName(callerSymbolId);

            for (const arg of node.arguments) {
              // Check if argument is a function or identifier referring to a function
              if (
                ts.isArrowFunction(arg) ||
                ts.isFunctionExpression(arg) ||
                ts.isIdentifier(arg)
              ) {
                const callbackSymbolId = this.findSymbolIdForExpression(arg, sourceFile);

                if (callbackSymbolId && callbackSymbolId !== callerSymbolId) {
                  const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

                usages.push({
                  callerSymbolId,
                  callerName,
                  callbackSymbolId,
                  callbackName: this.getSymbolName(callbackSymbolId),
                  filePath,
                  line,
                  pattern: 'parameter',
                });
              }
            }
          }
        }

        // Pattern 2: Promise.then(callback) / Promise.catch(callback)
        const expression = node.expression;
        if (ts.isPropertyAccessExpression(expression) && expression.name) {
          const methodName = expression.name.text;

          if (methodName === 'then' || methodName === 'catch') {
            const promiseSymbolId = this.findSymbolIdForExpression(
              expression.expression,
              sourceFile
            );

            if (promiseSymbolId && node.arguments.length > 0) {
              const callbackArg = node.arguments[0];
              const callbackSymbolId = this.findSymbolIdForExpression(callbackArg, sourceFile);

              if (callbackSymbolId && callbackSymbolId !== promiseSymbolId) {
                const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
                const pattern = methodName === 'then' ? 'promise-then' : 'promise-catch';

                usages.push({
                  callerSymbolId: promiseSymbolId,
                  callerName: this.getSymbolName(promiseSymbolId),
                  callbackSymbolId,
                  callbackName: this.getSymbolName(callbackSymbolId),
                  filePath,
                  line,
                  pattern: pattern as any,
                });
              }
            }
          }
        }
      }

      // Pattern 3: await asyncFunction()
      if (ts.isAwaitExpression(node)) {
        const expression = node.expression;

        if (ts.isCallExpression(expression)) {
          const asyncFunctionSymbolId = this.findSymbolIdForExpression(
            expression.expression,
            sourceFile
          );

          if (asyncFunctionSymbolId) {
            // Find the enclosing function that contains this await
            const enclosingSymbolId = this.findEnclosingFunctionSymbol(node, sourceFile);

            if (enclosingSymbolId && enclosingSymbolId !== asyncFunctionSymbolId) {
              const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

              usages.push({
                callerSymbolId: enclosingSymbolId,
                callerName: this.getSymbolName(enclosingSymbolId),
                callbackSymbolId: asyncFunctionSymbolId,
                callbackName: this.getSymbolName(asyncFunctionSymbolId),
                filePath,
                line,
                pattern: 'async-await',
              });
            }
          }
        }
      }
      } catch (error) {
        // Skip nodes that cause errors (e.g., synthetic nodes)
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  /**
   * Find symbol ID for an expression
   *
   * @param expression - AST expression
   * @param sourceFile - Source file
   * @returns Symbol ID or null
   */
  private findSymbolIdForExpression(
    expression: ts.Expression,
    sourceFile: ts.SourceFile
  ): string | null {
    let identifier: string | null = null;

    if (ts.isIdentifier(expression)) {
      identifier = expression.text;
    } else if (ts.isPropertyAccessExpression(expression)) {
      // For obj.method(), get obj
      identifier = expression.expression.getText(sourceFile);
    } else if (ts.isArrowFunction(expression) || ts.isFunctionExpression(expression)) {
      // For inline functions, try to find if they're assigned to a variable
      // For now, return null (could be enhanced)
      return null;
    } else {
      identifier = expression.getText(sourceFile).split('.')[0].split('(')[0];
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
   * Find the enclosing function symbol for a node
   *
   * @param node - AST node
   * @param sourceFile - Source file
   * @returns Symbol ID or null
   */
  private findEnclosingFunctionSymbol(node: ts.Node, sourceFile: ts.SourceFile): string | null {
    let parent = node.parent;

    while (parent) {
      // Check for function declaration
      if (ts.isFunctionDeclaration(parent) && parent.name) {
        return this.findSymbolIdForExpression(parent.name, sourceFile);
      }

      // Check for method declaration
      if (ts.isMethodDeclaration(parent) && ts.isIdentifier(parent.name)) {
        return this.findSymbolIdForExpression(parent.name, sourceFile);
      }

      // Check for arrow function assigned to variable
      if (ts.isVariableDeclaration(parent) && parent.name && ts.isIdentifier(parent.name)) {
        return this.findSymbolIdForExpression(parent.name, sourceFile);
      }

      parent = parent.parent;
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
   * Get statistics about callbacks
   *
   * @param relationships - Callback relationships
   * @returns Statistics object
   * @public
   */
  getStatistics(relationships: UnifiedRelationship[]): {
    totalCallbacks: number;
    byPattern: Record<string, number>;
    uniqueCallers: number;
    uniqueCallbacks: number;
  } {
    const byPattern: Record<string, number> = {};
    const callers = new Set<string>();
    const callbacks = new Set<string>();

    for (const rel of relationships) {
      const pattern = rel.properties?.pattern || 'unknown';
      byPattern[pattern] = (byPattern[pattern] || 0) + 1;

      callers.add(rel.from as string);
      callbacks.add(rel.to as string);
    }

    return {
      totalCallbacks: relationships.length,
      byPattern,
      uniqueCallers: callers.size,
      uniqueCallbacks: callbacks.size,
    };
  }
}
