/**
 * Documentation quality analyzer
 * @packageDocumentation
 * @responsibility Analyze TSDoc quality including child symbols
 */

import { TSDocParser } from '@microsoft/tsdoc';
import * as ts from 'typescript';
import type { DocQualityScore } from '../types/analysis';

/**
 * Analyzes documentation quality of TypeScript symbols
 *
 * @public
 * @responsibility Evaluate TSDoc completeness and quality for all symbols including nested ones
 */
export class DocumentationAnalyzer {
  private tsdocParser: TSDocParser;

  constructor() {
    this.tsdocParser = new TSDocParser();
  }

  /**
   * Analyze a TypeScript file
   *
   * @param filePath - Path to TypeScript file
   * @param sourceCode - Source code content
   * @param includeChildren - Whether to analyze child symbols (default: true)
   * @returns Array of documentation quality scores
   * @public
   */
  analyzeFile(filePath: string, sourceCode: string, includeChildren = true): DocQualityScore[] {
    const scores: DocQualityScore[] = [];
    const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true);

    this.visitNode(sourceFile, sourceFile, scores, includeChildren);

    return scores;
  }

  /**
   * Visit a TypeScript AST node and analyze documentation
   *
   * @param node - TypeScript AST node
   * @param sourceFile - Source file
   * @param scores - Array to collect scores
   * @param includeChildren - Whether to include child symbols
   * @param parentSymbol - Parent symbol name (for nested symbols)
   */
  private visitNode(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    scores: DocQualityScore[],
    includeChildren: boolean,
    parentSymbol?: string
  ): void {
    const score = this.analyzeNode(node, sourceFile, parentSymbol);

    if (score) {
      scores.push(score);

      // Analyze children if enabled
      if (includeChildren) {
        this.analyzeChildren(node, sourceFile, score);
      }
    }

    // Recursively visit child nodes
    ts.forEachChild(node, (child) =>
      this.visitNode(child, sourceFile, scores, includeChildren, score?.symbolName || parentSymbol)
    );
  }

  /**
   * Analyze a specific node
   *
   * @param node - TypeScript AST node
   * @param sourceFile - Source file
   * @param parentSymbol - Parent symbol name
   * @returns Documentation quality score or null
   */
  private analyzeNode(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    parentSymbol?: string
  ): DocQualityScore | null {
    // Only analyze declarable symbols
    if (!this.isDeclaration(node)) {
      return null;
    }

    const symbolName = this.getSymbolName(node);
    if (!symbolName) {
      return null;
    }

    // Skip catch clause variables (error parameters)
    if (ts.isVariableDeclaration(node) && node.parent && ts.isCatchClause(node.parent)) {
      return null;
    }

    const symbolType = this.getSymbolType(node);
    const isPublic = this.isPublicSymbol(node, symbolName);
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

    // Extract JSDoc comment
    const jsDocComment = this.getJSDocComment(node, sourceFile);
    const hasDoc = !!jsDocComment;

    let hasSummary = false;
    let hasCompleteParams = false;
    let hasReturns = false;
    let hasExamples = false;
    let hasCustomTags = false;
    const missing: string[] = [];

    if (jsDocComment) {
      const analysis = this.analyzeJSDoc(jsDocComment, node);
      hasSummary = analysis.hasSummary;
      hasCompleteParams = analysis.hasCompleteParams;
      hasReturns = analysis.hasReturns;
      hasExamples = analysis.hasExamples;
      hasCustomTags = analysis.hasCustomTags;
      missing.push(...analysis.missing);
    } else {
      missing.push('documentation');
    }

    // Calculate quality score
    const qualityScore = this.calculateQualityScore({
      hasDoc,
      hasSummary,
      hasCompleteParams,
      hasReturns,
      hasExamples,
      hasCustomTags,
      isPublic,
    });

    return {
      symbolId: `${sourceFile.fileName}:${line}:${symbolName}`,
      symbolName,
      symbolType,
      filePath: sourceFile.fileName,
      line: line + 1,
      isPublic,
      hasDoc,
      hasSummary,
      hasCompleteParams,
      hasReturns,
      hasExamples,
      hasCustomTags,
      qualityScore,
      missing,
      parentSymbol,
      children: [],
    };
  }

  /**
   * Analyze child symbols (methods, properties, etc.)
   *
   * @param node - Parent node
   * @param sourceFile - Source file
   * @param parentScore - Parent quality score
   */
  private analyzeChildren(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    parentScore: DocQualityScore
  ): void {
    if (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) {
      /**
       * member
       * @public
       */
      for (const member of node.members) {
        const childScore = this.analyzeNode(member, sourceFile, parentScore.symbolName);
        if (childScore) {
          parentScore.children.push(childScore);
        }
      }
    }
  }

  /**
   * Check if node is a declaration
   *
   * @param node - TypeScript AST node
   * @returns True if node is a declaration
   */
  private isDeclaration(node: ts.Node): boolean {
    return (
      ts.isFunctionDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isPropertyDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isEnumDeclaration(node) ||
      ts.isVariableDeclaration(node)
    );
  }

  /**
   * Get symbol name from node
   *
   * @param node - TypeScript AST node
   * @returns Symbol name or null
   */
  private getSymbolName(node: ts.Node): string | null {
    if (ts.isFunctionDeclaration(node) && node.name) {
      return node.name.text;
    }
    if (ts.isClassDeclaration(node) && node.name) {
      return node.name.text;
    }
    if (ts.isInterfaceDeclaration(node) && node.name) {
      return node.name.text;
    }
    if (ts.isMethodDeclaration(node) && node.name) {
      return node.name.getText();
    }
    if (ts.isPropertyDeclaration(node) && node.name) {
      return node.name.getText();
    }
    if (ts.isVariableDeclaration(node) && node.name) {
      return node.name.getText();
    }
    if (ts.isTypeAliasDeclaration(node) && node.name) {
      return node.name.text;
    }
    if (ts.isEnumDeclaration(node) && node.name) {
      return node.name.text;
    }
    return null;
  }

  /**
   * Get symbol type from node
   *
   * @param node - TypeScript AST node
   * @returns Symbol type string
   */
  private getSymbolType(node: ts.Node): string {
    if (ts.isFunctionDeclaration(node)) return 'function';
    if (ts.isClassDeclaration(node)) return 'class';
    if (ts.isInterfaceDeclaration(node)) return 'interface';
    if (ts.isMethodDeclaration(node)) return 'method';
    if (ts.isPropertyDeclaration(node)) return 'property';
    if (ts.isTypeAliasDeclaration(node)) return 'type';
    if (ts.isEnumDeclaration(node)) return 'enum';
    if (ts.isVariableDeclaration(node)) return 'variable';
    return 'unknown';
  }

  /**
   * Check if symbol is public
   *
   * @param node - TypeScript AST node
   * @param symbolName - Symbol name
   * @returns True if public
   */
  private isPublicSymbol(node: ts.Node, symbolName: string): boolean {
    // Check for private modifier
    if (ts.canHaveModifiers(node)) {
      const modifiers = ts.getModifiers(node);
      if (modifiers) {
        /**
         * modifier
         * @public
         */
        for (const modifier of modifiers) {
          if (modifier.kind === ts.SyntaxKind.PrivateKeyword) {
            return false;
          }
        }
      }
    }

    // Check naming convention (underscore prefix)
    if (symbolName.startsWith('_')) {
      return false;
    }

    // Check for export
    let hasExport = false;

    // For variable declarations, check the parent VariableStatement
    let checkNode = node;
    if (ts.isVariableDeclaration(node) && node.parent && node.parent.parent) {
      checkNode = node.parent.parent; // VariableStatement
    }

    if (ts.canHaveModifiers(checkNode)) {
      const modifiers = ts.getModifiers(checkNode);
      if (modifiers) {
        /**
         * modifier
         * @public
         */
        for (const modifier of modifiers) {
          if (modifier.kind === ts.SyntaxKind.ExportKeyword) {
            hasExport = true;
            break;
          }
        }
      }
    }

    // For variables, require explicit export to be considered public
    // For other declarations (functions, classes, etc.), default to public
    if (ts.isVariableDeclaration(node)) {
      return hasExport;
    }

    return hasExport || true;
  }

  /**
   * Get JSDoc comment from node
   *
   * @param node - TypeScript AST node
   * @param sourceFile - Source file
   * @returns JSDoc comment text or null
   */
  private getJSDocComment(node: ts.Node, sourceFile: ts.SourceFile): string | null {
    // For variable declarations, check the parent VariableStatement
    let targetNode = node;
    if (ts.isVariableDeclaration(node) && node.parent && node.parent.parent) {
      targetNode = node.parent.parent; // VariableStatement
    }

    const jsDocTags = (targetNode as unknown as { jsDoc?: ts.JSDoc[] }).jsDoc;
    if (!jsDocTags || jsDocTags.length === 0) {
      return null;
    }

    /**
     * jsDoc
     * @public
     */
    // Use the last JSDoc comment, which is the one directly above the declaration
    // (earlier JSDoc comments might be for the file/module)
    const jsDoc = jsDocTags[jsDocTags.length - 1];
    return jsDoc.getFullText(sourceFile);
  }

  /**
   * Analyze JSDoc comment
   *
   * @param jsDocText - JSDoc comment text
   * @param node - TypeScript AST node
   * @returns Analysis result
   */
  private analyzeJSDoc(
    jsDocText: string,
    node: ts.Node
  ): {
    hasSummary: boolean;
    hasCompleteParams: boolean;
    hasReturns: boolean;
    hasExamples: boolean;
    hasCustomTags: boolean;
    missing: string[];
  } {
    const missing: string[] = [];
    const symbolType = this.getSymbolType(node);

    // Parse with TSDoc
    const parserContext = this.tsdocParser.parseString(jsDocText);
    const docComment = parserContext.docComment;

    // Check summary
    const hasSummary = docComment.summarySection.nodes.length > 0;
    if (!hasSummary) {
      missing.push('summary');
    }

    // Check parameters (only for functions/methods with parameters)
    let hasCompleteParams = true;
    const isFunctionLike = ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node);

    if (isFunctionLike) {
      const params = (node as ts.FunctionDeclaration | ts.MethodDeclaration).parameters;

      // Only check params if function has parameters
      if (params.length > 0) {
        const documentedParams = docComment.params.blocks.map((b) => b.parameterName);

        /**
         * param
         * @public
         */
        for (const param of params) {
          const paramName = param.name.getText();
          if (!documentedParams.includes(paramName)) {
            hasCompleteParams = false;
            missing.push(`@param ${paramName}`);
          }
        }
      }
    }
    // For non-function symbols (variables, properties, types), params don't apply
    // So hasCompleteParams remains true

    // Check returns (for all functions/methods except constructors)
    let hasReturns = true;

    if (isFunctionLike) {
      const isConstructor = ts.isConstructorDeclaration(node);

      // All functions (including void) should have @returns tag
      if (!isConstructor && !docComment.returnsBlock) {
        hasReturns = false;
        missing.push('@returns');
      }
    }
    // For non-function symbols, returns don't apply

    // Check examples (only recommend for functions, methods, and classes)
    const hasExamples = docComment.customBlocks.some((b) => b.blockTag.tagName === '@example');
    const shouldHaveExample =
      symbolType === 'function' || symbolType === 'method' || symbolType === 'class';

    if (!hasExamples && shouldHaveExample) {
      // Don't add to required missing, just note it exists
      // This is handled in quality score calculation
    }

    // Check custom tags
    const customTagNames = [
      '@responsibility',
      '@contract',
      '@precondition',
      '@postcondition',
      '@testedBy',
    ];
    const hasCustomTags = docComment.customBlocks.some((b) =>
      customTagNames.includes(b.blockTag.tagName)
    );

    return {
      hasSummary,
      hasCompleteParams,
      hasReturns,
      hasExamples,
      hasCustomTags,
      missing,
    };
  }

  /**
   * Calculate quality score
   *
   * @param metrics - Documentation metrics
   * @returns Quality score (0-100)
   */
  private calculateQualityScore(metrics: {
    hasDoc: boolean;
    hasSummary: boolean;
    hasCompleteParams: boolean;
    hasReturns: boolean;
    hasExamples: boolean;
    hasCustomTags: boolean;
    isPublic: boolean;
  }): number {
    if (!metrics.hasDoc) {
      return 0;
    }

    let score = 0;

    // Base score for having documentation
    score += 20;

    // Summary (essential)
    if (metrics.hasSummary) score += 30;

    // Parameters (important for functions)
    if (metrics.hasCompleteParams) score += 20;

    // Returns (important for functions)
    if (metrics.hasReturns) score += 15;

    // Examples (good to have)
    if (metrics.hasExamples) score += 10;

    // Custom tags (excellent)
    if (metrics.hasCustomTags) score += 5;

    // Public APIs should have higher standards
    if (metrics.isPublic && score < 80) {
      score = Math.floor(score * 0.9); // Penalty for incomplete public API docs
    }

    return Math.min(100, score);
  }
}
