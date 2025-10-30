/**
 * Markdown comment importer to TypeScript files
 * @packageDocumentation
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as ts from 'typescript';
import type { CommentState, FileCommentState } from '../types/comment-state';

// TypeScript compiler API internal types
/**
 * NodeWithJSDoc interface
 * @public
 */
interface NodeWithJSDoc extends ts.Node {
  jsDoc?: ts.JSDoc[];
}

/**
 * Imports comment states from Markdown and applies to TypeScript files
 *
 * @public
 */
export class CommentImporter {
  /**
   * Parse markdown file to FileCommentState
   *
   * @param markdownPath - Path to markdown file
   * @returns File comment state
   * @public
   */
  parseMarkdown(markdownPath: string): FileCommentState {
    /**
     * content
     * @public
     */
    const content = fs.readFileSync(markdownPath, 'utf-8');
    /**
     * lines
     * @public
     */
    const lines = content.split('\n');

    // Extract file path from first line
    /**
     * filePathMatch
     * @public
     */
    const filePathMatch = lines[0].match(/^# (.+)$/);
    if (!filePathMatch) {
      throw new Error('Invalid markdown format: missing file path header');
    }
    /**
     * filePath
     * @public
     */
    const filePath = filePathMatch[1];

    // Extract last updated
    /**
     * lastUpdatedMatch
     * @public
     */
    const lastUpdatedMatch = lines[2].match(/^Last Updated: (.+)$/);
    /**
     * lastUpdated
     * @public
     */
    const lastUpdated = lastUpdatedMatch ? lastUpdatedMatch[1] : new Date().toISOString();

    /**
     * comments
     * @public
     */
    const comments: CommentState[] = [];
    /**
     * currentComment
     * @public
     */
    let currentComment: Partial<CommentState> | null = null;
    /**
     * inFullComment
     * @public
     */
    let inFullComment = false;
    /**
     * inCollapsedComment
     * @public
     */
    let inCollapsedComment = false;
    /**
     * commentBuffer
     * @public
     */
    let commentBuffer: string[] = [];

    /**
     * i
     * @public
     */
    for (let i = 4; i < lines.length; i++) {
      /**
       * line
       * @public
       */
      const line = lines[i];

      // New comment section
      if (line.startsWith('## Comment')) {
        if (currentComment && this.isCompleteComment(currentComment)) {
          comments.push(currentComment as CommentState);
        }

        /**
         * symbolMatch
         * @public
         */
        const symbolMatch = line.match(/^## Comment \d+: (.+)$/);
        currentComment = {
          symbol: symbolMatch ? symbolMatch[1] : 'unknown',
        };
        continue;
      }

      if (!currentComment) continue;

      // Parse location
      if (line.startsWith('**Location**:')) {
        /**
         * match
         * @public
         */
        const match = line.match(/Line (\d+)-(\d+), Column (\d+)/);
        if (match) {
          currentComment.location = {
            filePath,
            line: parseInt(match[1], 10),
            column: parseInt(match[3], 10),
            endLine: parseInt(match[2], 10),
          };
        } else {
          // Fallback for old format
          /**
           * oldMatch
           * @public
           */
          const oldMatch = line.match(/Line (\d+), Column (\d+)/);
          if (oldMatch) {
            currentComment.location = {
              filePath,
              line: parseInt(oldMatch[1], 10),
              column: parseInt(oldMatch[2], 10),
              endLine: parseInt(oldMatch[1], 10),
            };
          }
        }
        continue;
      }

      // Parse hash
      if (line.startsWith('**Hash**:')) {
        /**
         * match
         * @public
         */
        const match = line.match(/`([a-f0-9]+)`/);
        if (match) {
          currentComment.contentHash = match[1];
        }
        continue;
      }

      // Parse status
      if (line.startsWith('**Status**:')) {
        /**
         * match
         * @public
         */
        const match = line.match(/`(expanded|collapsed)`/);
        if (match) {
          currentComment.status = match[1] as 'expanded' | 'collapsed';
        }
        continue;
      }

      // Full comment section
      if (line === '### Full Comment') {
        inFullComment = true;
        inCollapsedComment = false;
        commentBuffer = [];
        continue;
      }

      // Collapsed comment section
      if (line === '### Collapsed Form') {
        if (commentBuffer.length > 0) {
          currentComment.fullComment = commentBuffer.join('\n');
        }
        inFullComment = false;
        inCollapsedComment = true;
        commentBuffer = [];
        continue;
      }

      // Code block markers
      if (line === '```typescript') {
        continue;
      }
      if (line === '```') {
        if (inFullComment) {
          currentComment.fullComment = commentBuffer.join('\n');
        } else if (inCollapsedComment) {
          currentComment.collapsedComment = commentBuffer.join('\n');
        }
        inFullComment = false;
        inCollapsedComment = false;
        commentBuffer = [];
        continue;
      }

      // Collect comment content
      if (inFullComment || inCollapsedComment) {
        commentBuffer.push(line);
      }

      // Comment separator
      if (line === '---') {
        if (currentComment && this.isCompleteComment(currentComment)) {
          currentComment.id = this.generateCommentId(currentComment as CommentState);
          currentComment.lastUpdated = lastUpdated;
          comments.push(currentComment as CommentState);
        }
        currentComment = null;
      }
    }

    // Add last comment if exists
    if (currentComment && this.isCompleteComment(currentComment)) {
      currentComment.id = this.generateCommentId(currentComment as CommentState);
      currentComment.lastUpdated = lastUpdated;
      comments.push(currentComment as CommentState);
    }

    return {
      filePath,
      lastUpdated,
      comments,
    };
  }

  /**
   * Check if comment state is complete
   *
   * @param comment - Partial comment state
   * @returns True if complete
   */
  private isCompleteComment(comment: Partial<CommentState>): boolean {
    return !!(
      comment.location &&
      comment.symbol &&
      comment.status &&
      comment.fullComment &&
      comment.collapsedComment &&
      comment.contentHash
    );
  }

  /**
   * Generate unique ID for a comment
   *
   * @param comment - Comment state
   * @returns Unique ID string
   */
  private generateCommentId(comment: CommentState): string {
    return `${comment.location.filePath}:${comment.location.line}:${comment.location.column}`;
  }

  /**
   * Generate content hash for a comment
   *
   * @param fullComment - Full comment text
   * @param symbolName - Symbol name
   * @returns SHA-256 hash string
   */
  private generateContentHash(fullComment: string, symbolName: string): string {
    /**
     * content
     * @public
     */
    const content = `${symbolName}:${fullComment.trim()}`;
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Extract comments from source code with hash matching
   *
   * @param sourceCode - Source code content
   * @returns Map of hash to comment range
   */
  private extractSourceComments(
    sourceCode: string
  ): Map<string, { start: number; end: number; text: string; symbol: string }> {
    /**
     * commentMap
     * @public
     */
    const commentMap = new Map<
      string,
      { start: number; end: number; text: string; symbol: string }
    >();
    /**
     * sourceFile
     * @public
     */
    const sourceFile = ts.createSourceFile('temp.ts', sourceCode, ts.ScriptTarget.Latest, true);

    /**
     * visit
     * @public
     */
    const visit = (node: ts.Node) => {
      /**
       * jsDocComments
       * @public
       */
      const jsDocComments = (node as NodeWithJSDoc).jsDoc;
      if (jsDocComments && jsDocComments.length > 0) {
        /**
         * jsDoc
         * @public
         */
        for (const jsDoc of jsDocComments) {
          /**
           * fullText
           * @public
           */
          const fullText = jsDoc.getFullText();
          /**
           * symbolName
           * @public
           */
          const symbolName = this.getSymbolName(node);

          /**
           * { line }
           * @public
           */
          const { line } = sourceFile.getLineAndCharacterOfPosition(jsDoc.pos);
          /**
           * { line: endLine }
           * @public
           */
          const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(jsDoc.end);

          /**
           * hash
           * @public
           */
          const hash = this.generateContentHash(fullText, symbolName);

          commentMap.set(hash, {
            start: line + 1, // 1-based
            end: endLine + 1,
            text: fullText,
            symbol: symbolName,
          });
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return commentMap;
  }

  /**
   * Get symbol name from TypeScript node
   *
   * @param node - TypeScript AST node
   * @returns Symbol name or 'unknown'
   */
  private getSymbolName(node: ts.Node): string {
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
    if (ts.isVariableDeclaration(node) && node.name) {
      return node.name.getText();
    }
    if (ts.isTypeAliasDeclaration(node) && node.name) {
      return node.name.text;
    }
    return 'unknown';
  }

  /**
   * Apply comment states to TypeScript file
   *
   * @param filePath - Path to TypeScript file
   * @param fileState - File comment state from markdown
   * @returns Updated source code
   * @public
   */
  applyComments(filePath: string, fileState: FileCommentState): string {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    /**
     * sourceCode
     * @public
     */
    const sourceCode = fs.readFileSync(filePath, 'utf-8');
    /**
     * lines
     * @public
     */
    const lines = sourceCode.split('\n');

    // Extract comments from source with hash
    /**
     * sourceComments
     * @public
     */
    const sourceComments = this.extractSourceComments(sourceCode);

    // Build replacement map: hash -> replacement text
    /**
     * replacementMap
     * @public
     */
    const replacementMap = new Map<string, string>();
    /**
     * comment
     * @public
     */
    for (const comment of fileState.comments) {
      /**
       * replacement
       * @public
       */
      const replacement =
        comment.status === 'collapsed' ? comment.collapsedComment : comment.fullComment;
      replacementMap.set(comment.contentHash, replacement);
    }

    // Build line ranges to replace
    /**
     * replaceRanges
     * @public
     */
    const replaceRanges: Array<{ start: number; end: number; replacement: string }> = [];

    /**
     * [hash, range]
     * @public
     */
    for (const [hash, range] of sourceComments.entries()) {
      /**
       * replacement
       * @public
       */
      const replacement = replacementMap.get(hash);
      if (replacement !== undefined) {
        replaceRanges.push({
          start: range.start,
          end: range.end,
          replacement,
        });
      }
    }

    // Sort by start line (descending) to replace from bottom to top
    replaceRanges.sort((a, b) => b.start - a.start);

    // Apply replacements
    /**
     * result
     * @public
     */
    const result = [...lines];
    /**
     * range
     * @public
     */
    for (const range of replaceRanges) {
      // Remove old comment lines (1-based line numbers)
      result.splice(range.start - 1, range.end - range.start + 1, range.replacement);
    }

    return result.join('\n');
  }

  /**
   * Import and apply comments from markdown file to TypeScript file
   *
   * @param markdownPath - Path to markdown file
   * @param overwrite - Whether to overwrite the original file
   * @returns Updated file path
   * @public
   */
  importFile(markdownPath: string, overwrite: boolean = false): string {
    /**
     * fileState
     * @public
     */
    const fileState = this.parseMarkdown(markdownPath);
    /**
     * updatedCode
     * @public
     */
    const updatedCode = this.applyComments(fileState.filePath, fileState);

    if (overwrite) {
      fs.writeFileSync(fileState.filePath, updatedCode, 'utf-8');
      return fileState.filePath;
    } else {
      /**
       * backupPath
       * @public
       */
      const backupPath = `${fileState.filePath}.backup`;
      fs.writeFileSync(backupPath, updatedCode, 'utf-8');
      return backupPath;
    }
  }
}
