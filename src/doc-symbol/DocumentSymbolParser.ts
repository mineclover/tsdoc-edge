/**
 * Document symbol parser for [[]] notation
 * @packageDocumentation
 * @responsibility Parse [[]] symbols from markdown documents
 * @doc [[Document Symbol System]]
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConfigManager } from '../config/ConfigManager';
import { FrontmatterParser } from '../parser/FrontmatterParser';
import type {
  CodeReference,
  DocumentSymbol,
  ParsedDocSymbols,
  SymbolFootnoteRef,
} from '../types/feature';

/**
 * Parses [[]] document symbols from markdown
 *
 * @doc [[DocumentSymbolParser]]
 * @public
 * @responsibility Extract primary, auxiliary, and reference [[]] symbols
 */
export class DocumentSymbolParser {
  private frontmatterParser: FrontmatterParser;
  private configManager: ConfigManager;

  constructor() {
    this.frontmatterParser = new FrontmatterParser();
    this.configManager = ConfigManager.getInstance();
  }

  /**
   * Parse document for `[[]]` symbols
   *
   * @param filePath - Markdown file path
   * @param options - Optional parsing options (`forceManaged` bypasses managedDir filtering while keeping `excludeDirs`)
   * @returns Parsed symbols (null if not managed document)
   * @public
   */
  parse(filePath: string, options?: { forceManaged?: boolean }): ParsedDocSymbols | null {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    // Parse frontmatter
    const { metadata, body } = this.frontmatterParser.parse(content);

    // Calculate frontmatter line count to offset 1-indexed line numbers
    const frontmatterLines = (content.slice(0, content.length - body.length).match(/\n/g) || [])
      .length;

    // Check if document is managed
    if (!this.isManagedDocument(filePath, metadata, options?.forceManaged)) {
      return null;
    }

    // Extract source file path from frontmatter first; fall back to body **Source**:
    // outside fenced code blocks and before ## Backlinks so fenced markdown examples
    // can never hijack or overwrite sourceFilePath.
    let sourceFilePath =
      typeof metadata.source === 'string' && metadata.source.trim().length > 0
        ? metadata.source.trim()
        : undefined;
    const bodyWithoutFencedCode = this.removeFencedCodeBlocks(body);
    if (!sourceFilePath) {
      const backlinksMatch = /^\s*##?\s+Backlinks\b/im.exec(bodyWithoutFencedCode);
      const bodyBeforeBacklinks =
        backlinksMatch !== null
          ? bodyWithoutFencedCode.slice(0, backlinksMatch.index)
          : bodyWithoutFencedCode;
      const sourceMatch = bodyBeforeBacklinks.match(/^\s*\*\*Source\*\*:\s*`([^`\n]+)`/m);
      if (sourceMatch) {
        sourceFilePath = sourceMatch[1].trim();
      }
    }

    // Remove code blocks if configured
    const config = this.configManager.get();
    const contentToParse = config.documentManagement?.ignoreCodeBlocks
      ? this.removeCodeBlocks(body)
      : body;

    const lines = contentToParse.split('\n');

    const result: ParsedDocSymbols = {
      filePath,
      auxiliaries: [],
      references: [],
      codeReferences: [],
      symbolFootnoteRefs: [],
      sourceFilePath,
    };

    let inBacklinksSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = frontmatterLines + i + 1;

      // Check for Backlinks section boundary
      if (/^\s*##?\s+Backlinks\b/i.test(line)) {
        inBacklinksSection = true;
        continue;
      }
      if (inBacklinksSection && /^\s*#{1,2}\s+/i.test(line)) {
        inBacklinksSection = false;
      }
      if (inBacklinksSection) {
        continue;
      }

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

      // Check for symbol footnote references [^sym-XXX] or [^SymbolName]
      const footnoteRefs = this.extractSymbolFootnoteReferences(line, lineNum);
      result.symbolFootnoteRefs.push(...footnoteRefs);
    }

    if (result.primary && metadata.codeImplementation === 'not-applicable') {
      result.primary.codeImplementation = 'not-applicable';
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
    for (const match of line.matchAll(regex)) {
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
    for (const match of line.matchAll(regex)) {
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
   * Extract symbol footnote references [^sym-XXX] or [^SymbolName]
   *
   * @param line - Line content
   * @param lineNum - Line number
   * @returns Symbol footnote references found
   */
  private extractSymbolFootnoteReferences(line: string, lineNum: number): SymbolFootnoteRef[] {
    const refs: SymbolFootnoteRef[] = [];

    // Match [^identifier] where identifier is sym-XXX or any other identifier
    // But exclude footnote definitions like [^identifier]:
    const regex = /\[\^([^\]]+)\](?!:)/g;
    for (const match of line.matchAll(regex)) {
      const identifier = match[1].trim();

      // Check if it's an ID reference (sym-XXX pattern)
      const isIdRef = /^sym-\w+$/.test(identifier);

      refs.push({
        identifier,
        line: lineNum,
        isIdRef,
      });
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
   * Check if document should be managed by TSDoc Edge
   *
   * @param filePath - Document file path
   * @param metadata - Frontmatter metadata
   * @returns Whether document is managed
   *
   * @remarks
   * Checks (in order):
   * 1. If documentManagement is disabled, all documents are processed
   * 2. If in excludeDirs, not managed
   * 3. If requireFrontmatter is true, check metadata.tsdoc === 'managed'
   * 4. If in managedDirs, managed
   */
  private isManagedDocument(
    filePath: string,
    metadata: Record<string, unknown>,
    forceManaged = false
  ): boolean {
    const config = this.configManager.get();
    const docMgmt = config.documentManagement;

    // Feature disabled - process all documents
    if (!docMgmt?.enabled) {
      return true;
    }

    const normalizedPath = path.normalize(filePath);

    // Check exclude directories
    if (docMgmt.excludeDirs) {
      const isExcluded = docMgmt.excludeDirs.some((dir: string) => {
        const normalizedDir = path.normalize(dir);
        // Check if the path contains this directory as a path segment (not substring)
        const pathParts = normalizedPath.split(path.sep);
        return pathParts.includes(normalizedDir);
      });
      if (isExcluded) {
        return false;
      }
    }

    if (forceManaged) {
      return true;
    }

    // Require frontmatter check
    if (docMgmt.requireFrontmatter) {
      return metadata?.tsdoc === 'managed';
    }

    // Check managed directories
    if (docMgmt.managedDirs && docMgmt.managedDirs.length > 0) {
      return docMgmt.managedDirs.some((dir: string) => {
        const normalizedDir = path.normalize(dir);
        // Check if the path contains this directory as a path segment (not substring)
        const pathParts = normalizedPath.split(path.sep);
        return pathParts.includes(normalizedDir);
      });
    }

    // Default: process if no specific rules
    return true;
  }

  /**
   * Remove fenced code blocks from markdown content while preserving line count
   *
   * @param content - Markdown content
   * @returns Content with fenced code blocks replaced by matching newlines
   * @public
   */
  removeFencedCodeBlocks(content: string): string {
    return content.replace(
      /(?:^|\n)[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n[ \t]*\1[ \t]*(?=\n|$)/g,
      (match) => {
        const newlineCount = (match.match(/\n/g) || []).length;
        return '\n'.repeat(newlineCount);
      }
    );
  }

  /**
   * Remove inline code spans from markdown content
   */
  private removeInlineCode(content: string): string {
    return content.replace(/`[^`\n]+`/g, '');
  }

  /**
   * Remove code blocks from markdown content
   *
   * @param content - Markdown content
   * @returns Content with code blocks removed
   *
   * @remarks
   * Removes both fenced code blocks (\`\`\`) and inline code spans
   * This prevents example code from being treated as actual references
   */
  private removeCodeBlocks(content: string): string {
    return this.removeInlineCode(this.removeFencedCodeBlocks(content));
  }

  /**
   * Parse multiple documents
   *
   * @param filePaths - Document file paths
   * @returns Parsed symbols for each file (excludes non-managed documents)
   */
  parseMultiple(filePaths: string[]): ParsedDocSymbols[] {
    return filePaths
      .map((filePath) => this.parse(filePath))
      .filter((result): result is ParsedDocSymbols => result !== null);
  }
}
