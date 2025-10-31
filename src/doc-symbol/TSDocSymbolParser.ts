/**
 * TSDoc @doc tag parser for code-to-document connections
 * @packageDocumentation
 * @responsibility Parse @doc [[]] tags from TypeScript code
 */

import * as fs from 'node:fs';
import * as ts from 'typescript';
import type { CodeConnection } from '../types/doc-symbol';

/**
 * Parses @doc tags from TSDoc comments
 *
 * @public
 * @responsibility Extract @doc [[Symbol]] tags from code
 */
export class TSDocSymbolParser {
  /**
   * Parse @doc tags from a code file
   *
   * @param filePath - Code file path
   * @returns Code connections
   */
  parseCodeFile(filePath: string): CodeConnection[] {
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const sourceFile = ts.createSourceFile(
      filePath,
      fs.readFileSync(filePath, 'utf-8'),
      ts.ScriptTarget.Latest,
      true
    );

    const connections: CodeConnection[] = [];

    const visit = (node: ts.Node) => {
      // Get JSDoc tags
      const jsDocTags = ts.getJSDocTags(node);

      if (jsDocTags && jsDocTags.length > 0) {
        const symbolName = this.getSymbolName(node);

        for (const tag of jsDocTags) {
          if (tag.tagName.text === 'doc') {
            const parsed = this.parseDocTag(tag);

            if (parsed && symbolName) {
              connections.push({
                codeSymbol: symbolName,
                filePath,
                line: this.getLine(sourceFile, node),
                docSymbol: parsed.symbol,
                section: parsed.section,
              });
            }
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return connections;
  }

  /**
   * Parse @doc tag content
   *
   * @param tag - JSDoc tag
   * @returns Parsed doc reference
   */
  private parseDocTag(tag: ts.JSDocTag): { symbol: string; section?: string } | null {
    const comment = this.getTagComment(tag);
    if (!comment) {
      return null;
    }

    // Match [[Symbol]] or [[Symbol#Section]]
    const match = comment.match(/\[\[([^\]#]+)(?:#([^\]]+))?\]\]/);
    if (!match) {
      return null;
    }

    return {
      symbol: match[1].trim(),
      section: match[2]?.trim(),
    };
  }

  /**
   * Get symbol name from node
   */
  private getSymbolName(node: ts.Node): string | undefined {
    if (ts.isClassDeclaration(node) && node.name) {
      return node.name.text;
    }
    if (ts.isFunctionDeclaration(node) && node.name) {
      return node.name.text;
    }
    if (ts.isInterfaceDeclaration(node) && node.name) {
      return node.name.text;
    }
    if (ts.isTypeAliasDeclaration(node) && node.name) {
      return node.name.text;
    }
    if (ts.isMethodDeclaration(node) && node.name) {
      return (node.name as ts.Identifier).text;
    }
    if (ts.isPropertyDeclaration(node) && node.name) {
      return (node.name as ts.Identifier).text;
    }
    return undefined;
  }

  /**
   * Get comment text from JSDoc tag
   */
  private getTagComment(tag: ts.JSDocTag): string | undefined {
    if (typeof tag.comment === 'string') {
      return tag.comment;
    }
    if (Array.isArray(tag.comment)) {
      return tag.comment.map((c) => c.text).join('');
    }
    return undefined;
  }

  /**
   * Get line number from node
   */
  private getLine(sourceFile: ts.SourceFile, node: ts.Node): number {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    return line + 1;
  }

  /**
   * Parse multiple code files
   *
   * @param filePaths - Code file paths
   * @returns All code connections
   */
  parseMultiple(filePaths: string[]): CodeConnection[] {
    const allConnections: CodeConnection[] = [];

    for (const filePath of filePaths) {
      const connections = this.parseCodeFile(filePath);
      allConnections.push(...connections);
    }

    return allConnections;
  }
}
