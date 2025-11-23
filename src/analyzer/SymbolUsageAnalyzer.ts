/**
 * Symbol Usage Analyzer
 *
 * Analyzes test case AST to find which symbols are actually used/tested
 * within the test body (new ClassName(), instance.method(), etc.)
 *
 * @module SymbolUsageAnalyzer
 */

import * as ts from 'typescript';

/**
 * Symbol usage information
 */
export interface SymbolUsage {
  /** Symbol name being used */
  symbolName: string;
  /** Type of usage */
  usageType: 'constructor' | 'method-call' | 'property-access' | 'static-call';
  /** Line number where used */
  line: number;
  /** Method name if applicable */
  methodName?: string;
}

/**
 * Result of usage analysis
 */
export interface UsageAnalysisResult {
  /** All symbol usages found */
  usages: SymbolUsage[];
  /** Unique symbol names used */
  usedSymbolNames: Set<string>;
}

/**
 * Analyzes symbol usage in test cases
 */
export class SymbolUsageAnalyzer {
  /**
   * Analyze symbol usage in a test case
   *
   * @param testCaseSource - Source code of the test case (just the it/test block)
   * @returns Usage analysis result
   */
  analyzeUsage(testCaseSource: string): UsageAnalysisResult {
    const sourceFile = ts.createSourceFile(
      'temp.ts',
      testCaseSource,
      ts.ScriptTarget.Latest,
      true
    );

    const usages: SymbolUsage[] = [];
    const usedSymbolNames = new Set<string>();

    const visit = (node: ts.Node): void => {
      // 1. Constructor calls: new ClassName()
      if (ts.isNewExpression(node)) {
        const symbolName = this.extractSymbolName(node.expression);
        if (symbolName) {
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
          usages.push({
            symbolName,
            usageType: 'constructor',
            line,
          });
          usedSymbolNames.add(symbolName);
        }
      }

      // 2. Method calls: instance.method()
      if (ts.isCallExpression(node)) {
        if (ts.isPropertyAccessExpression(node.expression)) {
          const obj = node.expression.expression;
          const method = node.expression.name.text;

          // Check if this is a direct class call (e.g., ClassName.staticMethod())
          if (ts.isIdentifier(obj)) {
            const symbolName = obj.text;
            if (this.isPascalCase(symbolName)) {
              const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
              usages.push({
                symbolName,
                usageType: 'static-call',
                line,
                methodName: method,
              });
              usedSymbolNames.add(symbolName);
            }
          }
        }
      }

      // 3. Property access: instance.property
      if (ts.isPropertyAccessExpression(node)) {
        const obj = node.expression;
        if (ts.isIdentifier(obj) && this.isPascalCase(obj.text)) {
          const symbolName = obj.text;
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
          usages.push({
            symbolName,
            usageType: 'property-access',
            line,
            methodName: node.name.text,
          });
          usedSymbolNames.add(symbolName);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return { usages, usedSymbolNames };
  }

  /**
   * Extract symbol name from expression
   */
  private extractSymbolName(expression: ts.Expression): string | null {
    if (ts.isIdentifier(expression)) {
      return expression.text;
    }
    if (ts.isPropertyAccessExpression(expression)) {
      // For cases like module.ClassName
      return expression.name.text;
    }
    return null;
  }

  /**
   * Check if a name is PascalCase (likely a class name)
   */
  private isPascalCase(name: string): boolean {
    return /^[A-Z][a-zA-Z0-9]*$/.test(name);
  }

  /**
   * Filter imported symbols to only those actually used in test
   *
   * @param importedSymbols - Symbols imported in the test file
   * @param testCaseSource - Source code of the test case
   * @returns Symbols that are actually used
   */
  filterToUsedSymbols(importedSymbols: string[], testCaseSource: string): string[] {
    const { usedSymbolNames } = this.analyzeUsage(testCaseSource);

    return importedSymbols.filter(symbol => usedSymbolNames.has(symbol));
  }
}
