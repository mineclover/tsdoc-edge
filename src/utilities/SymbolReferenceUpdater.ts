/**
 * Symbol Reference Updater - Update symbol references across documentation
 *
 * @packageDocumentation
 * @responsibility Find and update all references to a documentation symbol
 * @contract Scan documents, find symbol references, update safely
 *
 * @problem Symbol names need to be changed but references are scattered across many files
 * @solves Automatically finds and updates all [[Symbol]] references
 * @context TSDoc Edge SSOT documentation system
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Type of symbol reference
 */
export type SymbolReferenceType = 'h1-primary' | 'h2-auxiliary' | 'h3-sub-auxiliary' | 'inline';

/**
 * Symbol reference information
 */
export interface SymbolReference {
  /** File containing the reference */
  file: string;
  /** Line number (1-indexed) */
  line: number;
  /** Column number (1-indexed) */
  column: number;
  /** Type of reference */
  type: SymbolReferenceType;
  /** Old symbol name */
  oldSymbol: string;
  /** New symbol name */
  newSymbol: string;
  /** Full line content (for context) */
  lineContent: string;
  /** Old text to replace */
  oldText: string;
  /** New text to replace with */
  newText: string;
}

/**
 * Symbol update options
 */
export interface SymbolUpdateOptions {
  /** Base directory for scanning */
  baseDir: string;
  /** Dry run mode (no actual changes) */
  dryRun?: boolean;
  /** Update H1 primary definitions */
  updateH1?: boolean;
  /** Update H2 auxiliary definitions */
  updateH2?: boolean;
  /** Update H3 sub-auxiliary definitions */
  updateH3?: boolean;
  /** Update inline references */
  updateInline?: boolean;
}

/**
 * Symbol update result
 */
export interface SymbolUpdateResult {
  /** Total references found */
  totalReferences: number;
  /** References updated */
  updated: number;
  /** Files modified */
  filesModified: string[];
  /** Errors encountered */
  errors: Array<{ file: string; error: string }>;
  /** H1 primary definitions found */
  h1Count: number;
  /** H2 auxiliary definitions found */
  h2Count: number;
  /** H3 sub-auxiliary definitions found */
  h3Count: number;
  /** Inline references found */
  inlineCount: number;
}

/**
 * Symbol Reference Updater
 *
 * Finds and updates all references to a documentation symbol
 *
 * @public
 * @responsibility Update symbol names across documentation
 * @contract Maintain SSOT principle (exactly 1 H1 definition)
 */
export class SymbolReferenceUpdater {
  /**
   * Find all references to a symbol
   *
   * @param oldSymbol - Old symbol name (without [[ ]])
   * @param baseDir - Base directory for scanning
   * @param newSymbol - New symbol name (optional, for calculating new text)
   * @returns Array of symbol references found
   */
  async findReferences(oldSymbol: string, baseDir: string, newSymbol?: string): Promise<SymbolReference[]> {
    const references: SymbolReference[] = [];

    // Get all markdown files
    const files = this.findMarkdownFiles(baseDir);

    // Scan each file
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const lineNum = i + 1;

          // Check if this line is inside a code block
          const isInCodeBlock = this.isLineInCodeBlock(lines, i);
          if (isInCodeBlock) {
            continue;
          }

          // Find H1 primary definition: # [[Symbol]]
          const h1Match = line.match(/^#\s+\[\[(.+?)\]\]/);
          if (h1Match && h1Match[1] === oldSymbol) {
            references.push({
              file,
              line: lineNum,
              column: line.indexOf('[[') + 1,
              type: 'h1-primary',
              oldSymbol,
              newSymbol: newSymbol || oldSymbol,
              lineContent: line,
              oldText: `# [[${oldSymbol}]]`,
              newText: `# [[${newSymbol || oldSymbol}]]`,
            });
            continue; // Don't check for inline in H1 line
          }

          // Find H2 auxiliary definition: ## [[Symbol]]
          const h2Match = line.match(/^##\s+\[\[(.+?)\]\]/);
          if (h2Match && h2Match[1] === oldSymbol) {
            references.push({
              file,
              line: lineNum,
              column: line.indexOf('[[') + 1,
              type: 'h2-auxiliary',
              oldSymbol,
              newSymbol: newSymbol || oldSymbol,
              lineContent: line,
              oldText: `## [[${oldSymbol}]]`,
              newText: `## [[${newSymbol || oldSymbol}]]`,
            });
            continue; // Don't check for inline in H2 line
          }

          // Find H3 sub-auxiliary definition: ### [[Symbol]]
          const h3Match = line.match(/^###\s+\[\[(.+?)\]\]/);
          if (h3Match && h3Match[1] === oldSymbol) {
            references.push({
              file,
              line: lineNum,
              column: line.indexOf('[[') + 1,
              type: 'h3-sub-auxiliary',
              oldSymbol,
              newSymbol: newSymbol || oldSymbol,
              lineContent: line,
              oldText: `### [[${oldSymbol}]]`,
              newText: `### [[${newSymbol || oldSymbol}]]`,
            });
            continue; // Don't check for inline in H3 line
          }

          // Find inline references: [[Symbol]]
          const inlinePattern = /\[\[(.+?)\]\]/g;
          let match;
          while ((match = inlinePattern.exec(line)) !== null) {
            if (match[1] === oldSymbol) {
              references.push({
                file,
                line: lineNum,
                column: match.index + 1,
                type: 'inline',
                oldSymbol,
                newSymbol: newSymbol || oldSymbol,
                lineContent: line,
                oldText: `[[${oldSymbol}]]`,
                newText: `[[${newSymbol || oldSymbol}]]`,
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error scanning ${file}:`, error);
      }
    }

    return references;
  }

  /**
   * Update all references from oldSymbol to newSymbol
   *
   * @param oldSymbol - Old symbol name
   * @param newSymbol - New symbol name
   * @param options - Update options
   * @returns Update result
   */
  async updateReferences(
    oldSymbol: string,
    newSymbol: string,
    options: SymbolUpdateOptions
  ): Promise<SymbolUpdateResult> {
    const result: SymbolUpdateResult = {
      totalReferences: 0,
      updated: 0,
      filesModified: [],
      errors: [],
      h1Count: 0,
      h2Count: 0,
      h3Count: 0,
      inlineCount: 0,
    };

    // Find all references
    const references = await this.findReferences(oldSymbol, options.baseDir, newSymbol);
    result.totalReferences = references.length;

    // Count by type
    result.h1Count = references.filter((r) => r.type === 'h1-primary').length;
    result.h2Count = references.filter((r) => r.type === 'h2-auxiliary').length;
    result.h3Count = references.filter((r) => r.type === 'h3-sub-auxiliary').length;
    result.inlineCount = references.filter((r) => r.type === 'inline').length;

    if (options.dryRun) {
      return result;
    }

    // Filter references based on options
    const refsToUpdate = references.filter((ref) => {
      if (ref.type === 'h1-primary' && options.updateH1 !== false) return true;
      if (ref.type === 'h2-auxiliary' && options.updateH2 !== false) return true;
      if (ref.type === 'h3-sub-auxiliary' && options.updateH3 !== false) return true;
      if (ref.type === 'inline' && options.updateInline !== false) return true;
      return false;
    });

    // Group by file
    const refsByFile = new Map<string, SymbolReference[]>();
    for (const ref of refsToUpdate) {
      if (!refsByFile.has(ref.file)) {
        refsByFile.set(ref.file, []);
      }
      refsByFile.get(ref.file)!.push(ref);
    }

    // Update each file
    for (const [file, fileRefs] of refsByFile) {
      try {
        const updated = await this.updateFileReferences(file, fileRefs);
        result.updated += updated;
        if (updated > 0) {
          result.filesModified.push(file);
        }
      } catch (error) {
        result.errors.push({
          file,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return result;
  }

  /**
   * Check if a line is inside a code block
   */
  private isLineInCodeBlock(lines: string[], lineIndex: number): boolean {
    let inCodeBlock = false;
    for (let i = 0; i <= lineIndex; i++) {
      const line = lines[i].trim();
      if (line.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
      }
    }
    return inCodeBlock;
  }

  /**
   * Update references in a single file
   */
  private async updateFileReferences(
    file: string,
    references: SymbolReference[]
  ): Promise<number> {
    let content = fs.readFileSync(file, 'utf-8');
    let updated = 0;

    // Sort by line and column (descending) to avoid offset issues
    const sortedRefs = references.sort((a, b) => {
      if (a.line !== b.line) return b.line - a.line;
      return b.column - a.column;
    });

    const lines = content.split('\n');

    for (const ref of sortedRefs) {
      const lineIndex = ref.line - 1;
      if (lineIndex >= 0 && lineIndex < lines.length) {
        const line = lines[lineIndex];
        const newLine = line.replace(ref.oldText, ref.newText);

        if (newLine !== line) {
          lines[lineIndex] = newLine;
          updated++;
        }
      }
    }

    fs.writeFileSync(file, lines.join('\n'), 'utf-8');
    return updated;
  }

  /**
   * Find all markdown files recursively
   */
  private findMarkdownFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];

    const files: string[] = [];
    const stat = fs.statSync(dir);

    if (stat.isFile()) {
      return dir.endsWith('.md') ? [dir] : [];
    }

    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      // Skip node_modules, .tsdoc, and other hidden directories
      if (entry === 'node_modules' || entry === '.tsdoc' || entry.startsWith('.')) {
        continue;
      }

      const fullPath = path.join(dir, entry);
      const entryStat = fs.statSync(fullPath);

      if (entryStat.isDirectory()) {
        files.push(...this.findMarkdownFiles(fullPath));
      } else if (entry.endsWith('.md')) {
        files.push(fullPath);
      }
    }

    return files;
  }
}
