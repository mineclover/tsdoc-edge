/**
 * TSDoc comment exporter to Markdown format
 *
 * @packageDocumentation
 * @doc [[CommentStateTypes]]
 * @context Extracts full and collapsed TSDoc comment snapshots from TypeScript ASTs into `.tsdoc-comments` Markdown storage
 * @functionality AST JSDoc extraction, SHA-256 content hashing, collapsed single-line comment synthesis, and Markdown state serialization
 * @sideEffect filesystem: Creates comment state directories and writes exported comment Markdown files to disk (write)
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import { getDirectJsDocs, readTsdocComment, TSDocParser } from '../parser/TSDocParser';
import type { CommentLocation, CommentState, FileCommentState } from '../types/state';

/**
 * Exports TSDoc comments from TypeScript files to Markdown format
 *
 * @doc [[CommentStateTypes]]
 * @context Serializes `CommentState` and `FileCommentState` snapshots for comment fold/unfold workflows
 * @functionality Parses TypeScript JSDoc ranges, computes content hashes, builds collapsed summaries, and writes Markdown state files
 * @sideEffect filesystem: Creates comment state directories and writes exported comment Markdown files to disk (write)
 * @public
 */
export class CommentExporter {
  private readonly tsdocParser = new TSDocParser();
  /**
   * Extract comments from a TypeScript file
   *
   * @param filePath - Path to TypeScript file
   * @param sourceCode - Source code content
   * @returns Array of comment states
   * @public
   */
  extractComments(filePath: string, sourceCode: string): CommentState[] {
    const comments: CommentState[] = [];
    const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true);

    this.visitNode(sourceFile, filePath, sourceCode, comments);

    return comments;
  }

  /**
   * Visit a TypeScript AST node and extract comments
   *
   * @param node - TypeScript AST node
   * @param filePath - Source file path
   * @param sourceCode - Full source code
   * @param comments - Array to collect comment states
   */
  private visitNode(
    node: ts.Node,
    filePath: string,
    sourceCode: string,
    comments: CommentState[]
  ): void {
    const jsDocComments = getDirectJsDocs(node);

    if (jsDocComments.length > 0) {
      for (const jsDoc of jsDocComments) {
        const fullText = jsDoc.getFullText();
        const symbolName = this.getSymbolName(node);

        // Get location
        const sourceFile = node.getSourceFile();
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(jsDoc.pos);
        const endPos = jsDoc.end;
        const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(endPos);

        const location: CommentLocation = {
          filePath,
          line: line + 1, // 1-based
          column: character,
          endLine: endLine + 1,
        };

        // Create collapsed form
        const collapsedComment = this.createCollapsedForm(fullText);

        const state: CommentState = {
          id: this.generateCommentId(location),
          contentHash: this.generateContentHash(fullText, symbolName),
          location,
          symbol: symbolName,
          status: 'expanded', // Default to expanded
          fullComment: fullText,
          collapsedComment,
          lastUpdated: new Date().toISOString(),
        };

        comments.push(state);
      }
    }

    // Recursively visit child nodes
    ts.forEachChild(node, (child) => this.visitNode(child, filePath, sourceCode, comments));
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
    if (ts.isInterfaceDeclaration(node)) {
      return node.name.text;
    }
    if (ts.isMethodDeclaration(node)) {
      return node.name.getText();
    }
    if (ts.isVariableDeclaration(node)) {
      return node.name.getText();
    }
    if (ts.isTypeAliasDeclaration(node)) {
      return node.name.text;
    }
    return 'unknown';
  }

  /**
   * Create collapsed form of a comment (summary only)
   *
   * @param fullComment - Full TSDoc comment
   * @returns Collapsed comment (single line)
   */
  private createCollapsedForm(fullComment: string): string {
    const trimmed = fullComment.trim();
    const structured = trimmed.startsWith('/**')
      ? readTsdocComment(this.tsdocParser.parseString(trimmed).docComment)
      : null;
    const summary = structured?.summary.split('\n')[0]?.trim() || 'Comment';

    return `/** ${summary} */`;
  }

  /**
   * Generate unique ID for a comment
   *
   * @param location - Comment location
   * @returns Unique ID string
   */
  private generateCommentId(location: CommentLocation): string {
    return `${location.filePath}:${location.line}:${location.column}`;
  }

  /**
   * Generate content hash for a comment
   *
   * @param fullComment - Full comment text
   * @param symbolName - Symbol name
   * @returns SHA-256 hash string
   */
  private generateContentHash(fullComment: string, symbolName: string): string {
    const content = `${symbolName}:${fullComment.trim()}`;
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Export comments to Markdown format
   *
   * @param fileState - File comment state
   * @returns Markdown string
   * @public
   */
  exportToMarkdown(fileState: FileCommentState): string {
    let markdown = `# ${fileState.filePath}\n\n`;
    markdown += `Last Updated: ${fileState.lastUpdated}\n\n`;

    for (let i = 0; i < fileState.comments.length; i++) {
      const comment = fileState.comments[i];
      markdown += `## Comment ${i + 1}: ${comment.symbol}\n\n`;
      markdown += `**Location**: Line ${comment.location.line}-${comment.location.endLine}, Column ${comment.location.column}\n`;
      markdown += `**Symbol**: ${comment.symbol}\n`;
      markdown += `**Hash**: \`${comment.contentHash}\`\n`;
      markdown += `**Status**: \`${comment.status}\`\n\n`;

      markdown += `### Full Comment\n\n`;
      markdown += '```typescript\n';
      markdown += comment.fullComment;
      markdown += '\n```\n\n';

      markdown += `### Collapsed Form\n\n`;
      markdown += '```typescript\n';
      markdown += comment.collapsedComment;
      markdown += '\n```\n\n';

      markdown += '---\n\n';
    }

    return markdown;
  }

  /**
   * Export file comments to markdown file
   *
   * @param filePath - Source file path
   * @param sourceCode - Source code content
   * @param outputDir - Output directory for markdown files
   * @returns Path to created markdown file
   * @public
   */
  exportFile(filePath: string, sourceCode: string, outputDir: string): string {
    const comments = this.extractComments(filePath, sourceCode);

    const fileState: FileCommentState = {
      filePath,
      lastUpdated: new Date().toISOString(),
      comments,
    };

    const markdown = this.exportToMarkdown(fileState);

    // Create output path
    const relativePath = filePath.replace(/^(\.\/|\/)?/, '');
    const markdownPath = path.join(outputDir, `${relativePath}.md`);

    // Create directory if needed
    const dir = path.dirname(markdownPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write markdown file
    fs.writeFileSync(markdownPath, markdown, 'utf-8');

    return markdownPath;
  }
}
