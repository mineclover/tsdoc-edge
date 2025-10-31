/**
 * Document symbol parser for [[]] notation
 * @packageDocumentation
 * @responsibility Parse [[]] symbols from markdown documents
 */

import * as fs from 'node:fs';
import type {
  CodeReference,
  DocumentSymbol,
  ParsedDocSymbols,
} from '../types/doc-symbol';

/**
 * Parses [[]] document symbols from markdown
 *
 * @doc [[DocumentSymbolSystem#Parser]]
 * @public
 * @responsibility Extract primary, auxiliary, and reference [[]] symbols
 */
export class DocumentSymbolParser {
  /**
   * Parse document for [[]] symbols
   *
   * @param filePath - Markdown file path
   * @returns Parsed symbols
   */
  parse(filePath: string): ParsedDocSymbols {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    const result: ParsedDocSymbols = {
      filePath,
      auxiliaries: [],
      references: [],
      codeReferences: [],
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Check for heading with [[]]
      const headingMatch = line.match(/^(#+)\s+\[\[([^\]]+)\]\]/);
      if (headingMatch) {
        const [, hashes, symbolName] = headingMatch;
        const level = hashes.length;

        const symbol: DocumentSymbol = {
          name: symbolName.trim(),
          type: level === 1 ? 'primary' : 'auxiliary',
          filePath,
          line: lineNum,
          level,
        };

        if (level === 1) {
          result.primary = symbol;
        } else {
          result.auxiliaries.push(symbol);
        }
        continue;
      }

      // Check for inline [[]] references
      const inlineRefs = this.extractInlineReferences(line, filePath, lineNum);
      result.references.push(...inlineRefs);

      // Check for code references [text](path)
      const codeRefs = this.extractCodeReferences(line, lineNum);
      result.codeReferences.push(...codeRefs);
    }

    return result;
  }

  /**
   * Extract inline [[]] references from a line
   *
   * @param line - Line content
   * @param filePath - File path
   * @param lineNum - Line number
   * @returns References found
   */
  private extractInlineReferences(
    line: string,
    filePath: string,
    lineNum: number
  ): DocumentSymbol[] {
    const refs: DocumentSymbol[] = [];

    // Match [[Symbol]] or [[Symbol#Section]]
    const regex = /\[\[([^\]#]+)(?:#([^\]]+))?\]\]/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(line)) !== null) {
      const symbolName = match[1].trim();
      const section = match[2]?.trim();

      refs.push({
        name: symbolName,
        type: 'reference',
        filePath,
        line: lineNum,
        level: 0, // inline
        section,
      });
    }

    return refs;
  }

  /**
   * Extract code references [text](path#symbol)
   *
   * @param line - Line content
   * @param lineNum - Line number
   * @returns Code references found
   */
  private extractCodeReferences(line: string, lineNum: number): CodeReference[] {
    const refs: CodeReference[] = [];

    // Match [text](path), [text](path#Symbol), or [text](path#Symbol.member)
    const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(line)) !== null) {
      const [, text, target] = match;

      // Parse target: path#Symbol.member
      const [targetFile, anchor] = target.split('#');

      // Only process code files
      if (this.isCodeFile(targetFile)) {
        let targetSymbol: string | undefined;
        let targetMember: string | undefined;

        if (anchor) {
          const parts = anchor.split('.');
          targetSymbol = parts[0];
          targetMember = parts[1];
        }

        refs.push({
          text: text.trim(),
          targetFile: targetFile.trim(),
          targetSymbol: targetSymbol?.trim(),
          targetMember: targetMember?.trim(),
          line: lineNum,
        });
      }
    }

    return refs;
  }

  /**
   * Check if file is a code file
   */
  private isCodeFile(filePath: string): boolean {
    return /\.(ts|tsx|js|jsx)$/.test(filePath);
  }

  /**
   * Parse multiple documents
   *
   * @param filePaths - Document file paths
   * @returns Parsed symbols for each file
   */
  parseMultiple(filePaths: string[]): ParsedDocSymbols[] {
    return filePaths.map((filePath) => this.parse(filePath));
  }
}
