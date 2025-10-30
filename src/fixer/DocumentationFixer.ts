/**
 * Documentation fixer - automatically improves TSDoc comments
 * @packageDocumentation
 * @responsibility Automatically add or improve TSDoc comments based on analysis
 */

import * as fs from 'node:fs';
import * as ts from 'typescript';
import type { DocQualityScore } from '../types/analysis';

/**
 * Options for fixing documentation
 */
export interface FixOptions {
  /** Add missing summaries */
  addSummary?: boolean;
  /** Add missing @param tags */
  addParams?: boolean;
  /** Add missing @returns tags */
  addReturns?: boolean;
  /** Add @example tags */
  addExamples?: boolean;
  /** Add custom tags (@responsibility, @contract) */
  addCustomTags?: boolean;
  /** Dry run - don't actually modify files */
  dryRun?: boolean;
  /** Minimum quality score to fix */
  minScore?: number;
}

/**
 * Result of fixing a file
 */
export interface FixResult {
  /** File path */
  filePath: string;
  /** Number of symbols fixed */
  symbolsFixed: number;
  /** Was the file modified */
  modified: boolean;
  /** Error if any */
  error?: string;
}

/**
 * Fixes documentation issues automatically
 *
 * @public
 * @responsibility Generate and insert missing TSDoc comments
 */
export class DocumentationFixer {
  /**
   * Fix documentation for a file based on quality scores
   *
   * @param filePath - Path to TypeScript file
   * @param scores - Documentation quality scores
   * @param options - Fix options
   * @returns Fix result
   * @public
   */
  fixFile(filePath: string, scores: DocQualityScore[], options: FixOptions = {}): FixResult {
    /**
     * {
     *       addSummary = true,
     *       addParams = true,
     *       addReturns = true,
     *       addExamples = false,
     *       addCustomTags = false,
     *       dryRun = false,
     *       minScore = 70,
     *     }
     * @public
     */
    const {
      addSummary = true,
      addParams = true,
      addReturns = true,
      addExamples = false,
      addCustomTags = false,
      dryRun = false,
      minScore = 70,
    } = options;

    try {
      /**
       * sourceCode
       * @public
       */
      const sourceCode = fs.readFileSync(filePath, 'utf-8');
      /**
       * sourceFile
       * @public
       */
      const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true);

      // Filter scores that need fixing
      /**
       * needsFixing
       * @public
       */
      const needsFixing = scores.filter(
        (s) => s.filePath === filePath && s.qualityScore < minScore
      );

      if (needsFixing.length === 0) {
        return {
          filePath,
          symbolsFixed: 0,
          modified: false,
        };
      }

      // Build fixes
      /**
       * fixes
       * @public
       */
      const fixes: Array<{ start: number; end: number; replacement: string; isAppend?: boolean }> =
        [];

      /**
       * score
       * @public
       */
      for (const score of needsFixing) {
        /**
         * fix
         * @public
         */
        const fix = this.generateFix(sourceFile, score, {
          addSummary,
          addParams,
          addReturns,
          addExamples,
          addCustomTags,
        });

        if (fix) {
          fixes.push(fix);
        }
      }

      if (fixes.length === 0) {
        return {
          filePath,
          symbolsFixed: 0,
          modified: false,
        };
      }

      // Apply fixes (from end to start to preserve positions)
      /**
       * lines
       * @public
       */
      const lines = sourceCode.split('\n');
      fixes.sort((a, b) => b.start - a.start);

      /**
       * fix
       * @public
       */
      for (const fix of fixes) {
        /**
         * startLine
         * @public
         */
        const startLine = this.getLineNumber(sourceCode, fix.start);
        /**
         * endLine
         * @public
         */
        const endLine = this.getLineNumber(sourceCode, fix.end);

        if (fix.isAppend) {
          // Append to existing JSDoc (insert before closing */)
          lines.splice(endLine, 0, fix.replacement);
        } else {
          // Insert new comment before the declaration
          /**
           * indent
           * @public
           */
          const indent = this.getIndentation(lines[startLine]);
          /**
           * comment
           * @public
           */
          const comment = this.formatComment(fix.replacement, indent);
          lines.splice(startLine, 0, comment);
        }
      }

      /**
       * newContent
       * @public
       */
      const newContent = lines.join('\n');

      if (!dryRun) {
        fs.writeFileSync(filePath, newContent, 'utf-8');
      }

      return {
        filePath,
        symbolsFixed: fixes.length,
        modified: true,
      };
      /**
       * error
       * @public
       */
    } catch (error) {
      return {
        filePath,
        symbolsFixed: 0,
        modified: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Generate fix for a symbol
   *
   * @param sourceFile - TypeScript source file
   * @param score - Quality score
   * @param options - Fix options
   * @returns Fix or null
   */
  private generateFix(
    sourceFile: ts.SourceFile,
    score: DocQualityScore,
    options: {
      addSummary: boolean;
      addParams: boolean;
      addReturns: boolean;
      addExamples: boolean;
      addCustomTags: boolean;
    }
  ): { start: number; end: number; replacement: string; isAppend?: boolean } | null {
    // Find the node at the line
    /**
     * node
     * @public
     */
    const node = this.findNodeAtLine(sourceFile, score.line - 1);
    if (!node) {
      return null;
    }

    // Generate documentation parts to add
    /**
     * parts
     * @public
     */
    const parts: string[] = [];

    // If no documentation exists, generate full documentation
    if (!score.hasDoc) {
      // Summary
      if (options.addSummary) {
        parts.push(this.generateSummary(node, score.symbolName));
      }

      // Parameters
      if (options.addParams) {
        /**
         * params
         * @public
         */
        const params = this.extractParameters(node);
        /**
         * param
         * @public
         */
        for (const param of params) {
          parts.push(`@param ${param.name} - ${param.description}`);
        }
      }

      // Returns
      if (options.addReturns) {
        /**
         * returnType
         * @public
         */
        const returnType = this.extractReturnType(node);
        if (returnType && returnType !== 'void') {
          parts.push(`@returns ${this.generateReturnsDescription(returnType)}`);
        }
      }

      // Custom tags
      if (options.addCustomTags && score.isPublic) {
        parts.push('@public');
      }

      if (parts.length === 0) {
        return null;
      }

      return {
        start: node.getStart(),
        end: node.getStart(),
        replacement: parts.join('\n'),
      };
    }

    // If documentation exists but is incomplete, add missing parts
    // Parse missing items from score.missing
    /**
     * missing
     * @public
     */
    for (const missing of score.missing) {
      if (missing === 'summary' && options.addSummary) {
        // Can't easily add summary to existing doc, skip for now
        continue;
      }

      if (missing.startsWith('@param') && options.addParams) {
        // Extract param name from missing string "@param paramName"
        /**
         * match
         * @public
         */
        const match = missing.match(/@param\s+(\w+)/);
        if (match) {
          /**
           * paramName
           * @public
           */
          const paramName = match[1];
          /**
           * param
           * @public
           */
          const param = this.extractParameters(node).find((p) => p.name === paramName);
          if (param) {
            parts.push(`@param ${param.name} - ${param.description}`);
          }
        }
      }

      if (missing === '@returns' && options.addReturns) {
        /**
         * returnType
         * @public
         */
        const returnType = this.extractReturnType(node);
        if (returnType && returnType !== 'void') {
          parts.push(`@returns ${this.generateReturnsDescription(returnType)}`);
        }
      }
    }

    if (parts.length === 0) {
      return null;
    }

    // For existing documentation, we need to append to the existing JSDoc
    // This is a simplified approach - we'll add new tags before the closing */
    /**
     * jsDocComment
     * @public
     */
    const jsDocComment = this.getExistingJSDocComment(node, sourceFile);
    if (!jsDocComment) {
      return null;
    }

    // Get indentation from the JSDoc start
    /**
     * { line: startLine }
     * @public
     */
    const { line: startLine } = sourceFile.getLineAndCharacterOfPosition(jsDocComment.getStart());
    /**
     * sourceLines
     * @public
     */
    const sourceLines = sourceFile.getFullText().split('\n');
    /**
     * indent
     * @public
     */
    const indent = this.getIndentation(sourceLines[startLine]);

    // Format the new tags with proper indentation
    /**
     * formattedParts
     * @public
     */
    const formattedParts = parts.map((p) => `${indent} * ${p}`).join('\n');

    return {
      start: jsDocComment.end,
      end: jsDocComment.end,
      replacement: formattedParts,
      isAppend: true,
    };
  }

  /**
   * Get existing JSDoc comment node
   *
   * @param node - TypeScript AST node
   * @param sourceFile - Source file
   * @returns JSDoc node or null
   */
  private getExistingJSDocComment(node: ts.Node, _sourceFile: ts.SourceFile): ts.JSDoc | null {
    // For variable declarations, check the parent VariableStatement
    /**
     * targetNode
     * @public
     */
    let targetNode = node;
    if (ts.isVariableDeclaration(node) && node.parent && node.parent.parent) {
      targetNode = node.parent.parent; // VariableStatement
    }

    /**
     * jsDocTags
     * @public
     */
    const jsDocTags = (targetNode as unknown as { jsDoc?: ts.JSDoc[] }).jsDoc;
    if (!jsDocTags || jsDocTags.length === 0) {
      return null;
    }

    return jsDocTags[0];
  }

  /**
   * Find node at a specific line
   *
   * @param sourceFile - Source file
   * @param line - Line number (0-based)
   * @returns Node or null
   */
  private findNodeAtLine(sourceFile: ts.SourceFile, line: number): ts.Node | null {
    /**
     * result
     * @public
     */
    let result: ts.Node | null = null;

    /**
     * visit
     * @public
     */
    const visit = (node: ts.Node) => {
      /**
       * { line: nodeLine }
       * @public
       */
      const { line: nodeLine } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      if (nodeLine === line) {
        // Skip catch clause variables (error parameters)
        if (ts.isVariableDeclaration(node) && node.parent && ts.isCatchClause(node.parent)) {
          return;
        }
        result = node;
        return;
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return result;
  }

  /**
   * Generate summary for a symbol
   *
   * @param node - TypeScript node
   * @param symbolName - Symbol name
   * @returns Summary text
   */
  private generateSummary(node: ts.Node, symbolName: string): string {
    if (ts.isFunctionDeclaration(node)) {
      return `${symbolName} function`;
    }
    if (ts.isClassDeclaration(node)) {
      return `${symbolName} class`;
    }
    if (ts.isInterfaceDeclaration(node)) {
      return `${symbolName} interface`;
    }
    if (ts.isMethodDeclaration(node)) {
      return `${symbolName} method`;
    }
    if (ts.isPropertyDeclaration(node)) {
      return `${symbolName} property`;
    }
    return symbolName;
  }

  /**
   * Extract parameters from a node
   *
   * @param node - TypeScript node
   * @returns Array of parameters
   */
  private extractParameters(
    node: ts.Node
  ): Array<{ name: string; type: string; description: string }> {
    if (!ts.isFunctionDeclaration(node) && !ts.isMethodDeclaration(node)) {
      return [];
    }

    return node.parameters.map((param) => {
      /**
       * name
       * @public
       */
      const name = param.name.getText();
      /**
       * type
       * @public
       */
      const type = param.type ? param.type.getText() : 'any';
      /**
       * description
       * @public
       */
      const description = `${name} parameter`;

      return { name, type, description };
    });
  }

  /**
   * Extract return type from a node
   *
   * @param node - TypeScript node
   * @returns Return type or null
   */
  private extractReturnType(node: ts.Node): string | null {
    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
      if (node.type) {
        return node.type.getText();
      }
    }
    return null;
  }

  /**
   * Generate returns description
   *
   * @param returnType - Return type
   * @returns Description
   */
  private generateReturnsDescription(returnType: string): string {
    return `Returns ${returnType}`;
  }

  /**
   * Get line number for a position
   *
   * @param sourceCode - Source code
   * @param position - Character position
   * @returns Line number (0-based)
   */
  private getLineNumber(sourceCode: string, position: number): number {
    return sourceCode.substring(0, position).split('\n').length - 1;
  }

  /**
   * Get indentation of a line
   *
   * @param line - Line content
   * @returns Indentation string
   */
  private getIndentation(line: string): string {
    /**
     * match
     * @public
     */
    const match = line.match(/^(\s*)/);
    return match ? match[1] : '';
  }

  /**
   * Format comment with proper indentation
   *
   * @param content - Comment content
   * @param indent - Indentation string
   * @returns Formatted comment
   */
  private formatComment(content: string, indent: string): string {
    /**
     * lines
     * @public
     */
    const lines = content.split('\n');
    /**
     * formatted
     * @public
     */
    const formatted = [
      `${indent}/**`,
      ...lines.map((line) => `${indent} * ${line}`),
      `${indent} */`,
    ];
    return formatted.join('\n');
  }
}
