/**
 * Document-Code bidirectional linker
 * @packageDocumentation
 * @responsibility Build and maintain bidirectional links between docs and code
 */

import * as fs from 'node:fs';
import * as ts from 'typescript';
import type { CodeLink, DocLink, LinkIndex } from '../types/core';

/**
 * Builds bidirectional index between documentation and code
 *
 * @public
 * @responsibility Parse and index doc-code links
 */
export class DocCodeLinker {
  /**
   * Build bidirectional link index
   *
   * @param codeFiles - Code file paths
   * @param docFiles - Documentation file paths
   * @returns Link index
   */
  buildIndex(codeFiles: string[], docFiles: string[]): LinkIndex {
    const codeToDoc = new Map<string, DocLink[]>();
    const docToCode = new Map<string, CodeLink[]>();
    const symbolToDoc = new Map<string, string[]>();
    const docToSymbol = new Map<string, string[]>();

    // Parse markdown links (doc → code)
    for (const docFile of docFiles) {
      const links = this.parseMarkdownLinks(docFile);
      docToCode.set(docFile, links);

      for (const link of links) {
        if (link.targetSymbol) {
          const docs = symbolToDoc.get(link.targetSymbol) || [];
          docs.push(docFile);
          symbolToDoc.set(link.targetSymbol, docs);

          const symbols = docToSymbol.get(docFile) || [];
          if (!symbols.includes(link.targetSymbol)) {
            symbols.push(link.targetSymbol);
            docToSymbol.set(docFile, symbols);
          }
        }
      }
    }

    // Parse TSDoc tags (code → doc)
    for (const codeFile of codeFiles) {
      const links = this.parseDocTags(codeFile);
      codeToDoc.set(codeFile, links);
    }

    return {
      codeToDoc,
      docToCode,
      symbolToDoc,
      docToSymbol,
    };
  }

  /**
   * Find all links from document to code
   *
   * @param docPath - Document path
   * @returns Code links
   */
  findCodeLinks(docPath: string): CodeLink[] {
    return this.parseMarkdownLinks(docPath);
  }

  /**
   * Find all links from code to documents
   *
   * @param codePath - Code file path
   * @returns Doc links
   */
  findDocLinks(codePath: string): DocLink[] {
    return this.parseDocTags(codePath);
  }

  /**
   * Parse markdown links to code
   *
   * @param docPath - Document path
   * @returns Parsed code links
   */
  private parseMarkdownLinks(docPath: string): CodeLink[] {
    if (!fs.existsSync(docPath)) {
      return [];
    }

    const content = fs.readFileSync(docPath, 'utf-8');
    const links: CodeLink[] = [];

    // Regex: [text](path#symbol) or [text](path#Class.method)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Reset lastIndex for each line
      linkRegex.lastIndex = 0;

      for (const match of line.matchAll(linkRegex)) {
        const [, text, target] = match;

        // Split path and anchor
        const [filePath, anchor] = target.split('#');

        // Check if it's a code file
        if (this.isCodeFile(filePath)) {
          let symbolName: string | undefined;
          let memberName: string | undefined;

          if (anchor) {
            // Parse "Class.method" or just "Class"
            const parts = anchor.split('.');
            symbolName = parts[0];
            memberName = parts[1];
          }

          links.push({
            docPath,
            docLine: i + 1,
            text,
            targetFile: filePath,
            targetSymbol: symbolName,
            targetMember: memberName,
          });
        }
      }
    }

    return links;
  }

  /**
   * Parse TSDoc @see and @link tags
   *
   * @param codePath - Code file path
   * @returns Parsed doc links
   */
  private parseDocTags(codePath: string): DocLink[] {
    if (!fs.existsSync(codePath)) {
      return [];
    }

    const sourceFile = ts.createSourceFile(
      codePath,
      fs.readFileSync(codePath, 'utf-8'),
      ts.ScriptTarget.Latest,
      true
    );

    const links: DocLink[] = [];

    const visit = (node: ts.Node) => {
      // Check for JSDoc comments
      const jsDocTags = ts.getJSDocTags(node);

      if (jsDocTags && jsDocTags.length > 0) {
        const symbolName = this.getSymbolName(node);

        for (const tag of jsDocTags) {
          const tagName = tag.tagName.text;

          if (tagName === 'see' || tagName === 'link') {
            const comment = this.getTagComment(tag);

            if (comment && this.isDocFile(comment)) {
              const [docPath, section] = comment.split('#');

              links.push({
                codePath,
                codeLine: this.getLine(sourceFile, node),
                symbolName: symbolName || 'unknown',
                tagType: tagName,
                targetDoc: docPath.trim(),
                targetSection: section?.trim(),
              });
            }
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return links;
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
    return undefined;
  }

  /**
   * Get comment text from JSDoc tag
   */
  private getTagComment(tag: ts.JSDocTag): string | undefined {
    // Handle JSDocSeeTag specially - TypeScript parses "@see path/to/file.md" in complex ways:
    // - For "doc.md": name has the full text, comment may be "*" from multiline JSDoc
    // - For "/absolute/path.md": name is empty, comment has the full path
    // - For "docs/guide.md": name is "docs", comment is "/guide.md" (TS interprets as code reference)
    if (ts.isJSDocSeeTag(tag)) {
      const seeTag = tag as ts.JSDocSeeTag;
      const nameText = seeTag.name?.getText() || '';
      let commentText = typeof tag.comment === 'string' ? tag.comment : '';

      // Filter out JSDoc comment line markers (* from multiline comments)
      if (commentText === '*' || commentText.startsWith('* ')) {
        commentText = '';
      }

      // Combine name and comment to reconstruct the original path
      const combined = nameText + commentText;
      if (combined) {
        return combined;
      }
    }

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
   * Check if file is a code file
   */
  private isCodeFile(filePath: string): boolean {
    return /\.(ts|tsx|js|jsx)$/.test(filePath);
  }

  /**
   * Check if file is a documentation file
   */
  private isDocFile(filePath: string): boolean {
    return /\.(md|mdx)$/.test(filePath);
  }
}
