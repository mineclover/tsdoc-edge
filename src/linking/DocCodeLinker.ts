/**
 * Document-Code bidirectional linker
 * @packageDocumentation
 * @responsibility Build and maintain bidirectional links between docs and code
 */

import * as fs from 'node:fs';
import * as ts from 'typescript';
import { getDirectJsDocs, readTsdocComment, TSDocParser } from '../parser/TSDocParser';
import type { CodeLink, DocLink, LinkIndex } from '../types/core';

/**
 * Builds bidirectional index between documentation and code
 *
 * @public
 * @responsibility Parse and index doc-code links
 */
export class DocCodeLinker {
  private readonly tsdocParser = new TSDocParser();

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
   * Parse TSDoc `@see` and `{@link}` tags via `@microsoft/tsdoc` `DocComment` AST
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
    const visitedJsDocPositions = new Set<number>();

    const visit = (node: ts.Node) => {
      const jsDocs = getDirectJsDocs(node);
      if (jsDocs.length > 0) {
        const symbolName = this.getSymbolName(node) || 'unknown';
        const codeLine = this.getLine(sourceFile, node);

        for (const jsDoc of jsDocs) {
          const startPos = jsDoc.getStart(sourceFile);
          if (visitedJsDocPositions.has(startPos)) {
            continue;
          }
          visitedJsDocPositions.add(startPos);

          const structured = readTsdocComment(
            this.tsdocParser.parseString(jsDoc.getText(sourceFile)).docComment
          );
          const recordedKeys = new Set<string>();

          for (const seeTarget of structured.see) {
            this.tryPushDocLink(
              links,
              recordedKeys,
              codePath,
              codeLine,
              symbolName,
              'see',
              seeTarget
            );
          }

          for (const linkTarget of structured.links) {
            this.tryPushDocLink(
              links,
              recordedKeys,
              codePath,
              codeLine,
              symbolName,
              'link',
              linkTarget
            );
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return links;
  }

  /**
   * Parse and append a normalized documentation link target if it points to a Markdown doc file
   */
  private tryPushDocLink(
    links: DocLink[],
    recordedKeys: Set<string>,
    codePath: string,
    codeLine: number,
    symbolName: string,
    tagType: 'see' | 'link',
    rawTarget: string
  ): void {
    const cleaned = rawTarget.trim().replace(/^file:\/\//, '');
    if (!cleaned) {
      return;
    }

    const firstToken = cleaned.split(/\s+/)[0];
    const [docPath, section] = firstToken.split('#');
    const normalizedDoc = docPath.trim();
    if (!this.isDocFile(normalizedDoc)) {
      return;
    }

    const normalizedSection = section?.trim() || undefined;
    const dedupKey = `${normalizedDoc}#${normalizedSection ?? ''}`;
    if (recordedKeys.has(dedupKey)) {
      return;
    }
    recordedKeys.add(dedupKey);

    links.push({
      codePath,
      codeLine,
      symbolName,
      tagType,
      targetDoc: normalizedDoc,
      targetSection: normalizedSection,
    });
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
    if (ts.isInterfaceDeclaration(node)) {
      return node.name.text;
    }
    if (ts.isTypeAliasDeclaration(node)) {
      return node.name.text;
    }
    if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
      return node.name.text;
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
