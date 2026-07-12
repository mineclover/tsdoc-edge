/**
 * Document Symbol Lister
 * @packageDocumentation
 * @responsibility List all explicitly defined document symbols from managed/ directory
 *
 * @problem Need to see only intentionally managed concepts, not auto-generated code symbols
 * @solves Scans managed/ for H1 [[Symbol]] definitions and extracts summaries
 * @context SSOT principle: Each document symbol represents a core project concept
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Document Symbol metadata
 * Represents an explicitly defined project concept
 */
export interface DocumentSymbol {
  /** Symbol name (without brackets) */
  name: string;

  /** Relative path from project root */
  filePath: string;

  /** Category (directory name: features, architecture, workflows, concepts, etc.) */
  category: string;

  /** First paragraph or summary section after H1 */
  summary: string;

  /** Line number of H1 definition */
  h1Line: number;

  /** Count of [[Symbol]] references in this document */
  referenceCount: number;
}

/**
 * Document Symbol Lister
 *
 * Scans managed documentation directory for explicit symbol definitions.
 *
 * @public
 * @example
 * ```typescript
 * const lister = new DocumentSymbolLister('/path/to/managed');
 * const symbols = lister.listAllSymbols();
 * console.log(`Found ${symbols.length} document symbols`);
 * ```
 */
export class DocumentSymbolLister {
  private managedDir: string;

  /**
   * Create a DocumentSymbolLister
   * @param managedDir - Path to managed/ directory
   */
  constructor(managedDir: string) {
    this.managedDir = managedDir;
  }

  /**
   * List all document symbols from managed/ directory
   *
   * @returns Array of document symbols, sorted alphabetically by name
   */
  listAllSymbols(): DocumentSymbol[] {
    const symbols: DocumentSymbol[] = [];

    if (!fs.existsSync(this.managedDir)) {
      return symbols;
    }

    const markdownFiles = this.getAllMarkdownFiles(this.managedDir);

    for (const filePath of markdownFiles) {
      const symbol = this.extractSymbolFromFile(filePath);
      if (symbol) {
        symbols.push(symbol);
      }
    }

    // Sort alphabetically by name
    symbols.sort((a, b) => a.name.localeCompare(b.name));

    return symbols;
  }

  /**
   * Get document symbols grouped by category
   *
   * @returns Map of category to symbols
   */
  getSymbolsByCategory(): Map<string, DocumentSymbol[]> {
    const symbols = this.listAllSymbols();
    const byCategory = new Map<string, DocumentSymbol[]>();

    for (const symbol of symbols) {
      if (!byCategory.has(symbol.category)) {
        byCategory.set(symbol.category, []);
      }
      byCategory.get(symbol.category)?.push(symbol);
    }

    return byCategory;
  }

  /**
   * Extract document symbol from a markdown file
   *
   * @param filePath - Absolute path to markdown file
   * @returns Document symbol or null if no H1 [[Symbol]] found
   */
  private extractSymbolFromFile(filePath: string): DocumentSymbol | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // Find H1 with [[Symbol]] pattern
      let h1Match: { name: string; line: number } | null = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^#\s+\[\[([^\]]+)\]\]/);

        if (match) {
          h1Match = {
            name: match[1],
            line: i + 1,
          };
          break;
        }
      }

      if (!h1Match) {
        return null;
      }

      // Extract summary (first non-empty paragraph after H1)
      const summary = this.extractSummary(lines, h1Match.line - 1);

      // Count [[Symbol]] references in the document
      const referenceCount = this.countSymbolReferences(content);

      // Determine category from directory structure
      const relativePath = path.relative(this.managedDir, filePath);
      const category = this.extractCategory(relativePath);

      return {
        name: h1Match.name,
        filePath: relativePath,
        category,
        summary,
        h1Line: h1Match.line,
        referenceCount,
      };
    } catch (_error) {
      // Skip files that can't be read
      return null;
    }
  }

  /**
   * Extract summary from lines after H1
   *
   * @param lines - All lines in the file
   * @param h1Index - Index of H1 line
   * @returns Summary text
   */
  private extractSummary(lines: string[], h1Index: number): string {
    const summaryLines: string[] = [];
    let foundContent = false;

    // Start from line after H1
    for (let i = h1Index + 1; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines at the beginning
      if (!foundContent && line === '') {
        continue;
      }

      // Stop at next heading
      if (line.startsWith('#')) {
        break;
      }

      // Stop at horizontal rule
      if (line.startsWith('---') || line.startsWith('***')) {
        break;
      }

      // Skip metadata blocks (> **Key**: value) but keep regular blockquotes
      if (line.startsWith('>')) {
        // Check if it's a metadata block (> **Key**: value)
        if (line.match(/^>\s*\*\*[^*]+\*\*:/)) {
          continue; // Skip metadata
        }
        // Otherwise, it's a summary blockquote - keep it but remove the >
        const blockquoteContent = line.substring(1).trim();
        if (blockquoteContent !== '') {
          foundContent = true;
          summaryLines.push(blockquoteContent);
          // Blockquotes are usually single-line summaries
          break;
        }
        continue;
      }

      if (line !== '') {
        foundContent = true;
        summaryLines.push(line);

        // Stop after first paragraph (max 3 lines)
        if (summaryLines.length >= 3) {
          break;
        }
      } else if (foundContent) {
        // Empty line after content = end of paragraph
        break;
      }
    }

    return summaryLines.join(' ').trim() || '(No summary available)';
  }

  /**
   * Count [[Symbol]] references in content
   *
   * @param content - File content
   * @returns Number of [[Symbol]] references
   */
  private countSymbolReferences(content: string): number {
    const matches = content.match(/\[\[([^\]]+)\]\]/g);
    return matches ? matches.length : 0;
  }

  /**
   * Extract category from relative path
   *
   * @param relativePath - Relative path from managed/
   * @returns Category name
   */
  private extractCategory(relativePath: string): string {
    const parts = relativePath.split(path.sep);

    if (parts.length > 1) {
      // Return first directory name (e.g., "features", "architecture")
      return parts[0];
    }

    return 'root';
  }

  /**
   * Get all markdown files recursively
   *
   * @param dir - Directory to scan
   * @returns Array of absolute file paths
   */
  private getAllMarkdownFiles(dir: string): string[] {
    const files: string[] = [];

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          files.push(...this.getAllMarkdownFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    } catch {
      // Ignore errors (permissions, etc.)
    }

    return files;
  }
}
