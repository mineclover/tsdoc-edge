/**
 * File Reference Updater - Update file path references across documentation
 *
 * @packageDocumentation
 * @responsibility Find and update all references to a file path
 * @contract Scan documents, find references, update safely
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Type of file reference
 */
export type ReferenceType = 'backlink' | 'path' | 'relative' | 'markdown-link';

/**
 * File reference information
 */
export interface FileReference {
  /** File containing the reference */
  file: string;
  /** Line number (1-indexed) */
  line: number;
  /** Column number (1-indexed) */
  column: number;
  /** Type of reference */
  type: ReferenceType;
  /** Old text to replace */
  oldText: string;
  /** New text to replace with */
  newText: string;
  /** Full line content (for context) */
  lineContent: string;
}

/**
 * Reference update options
 */
export interface UpdateOptions {
  /** Base directory for scanning */
  baseDir: string;
  /** Dry run mode (no actual changes) */
  dryRun?: boolean;
  /** Update backlinks */
  updateBacklinks?: boolean;
  /** Update path references */
  updatePaths?: boolean;
  /** Update relative links */
  updateRelativeLinks?: boolean;
  /** Update markdown links */
  updateMarkdownLinks?: boolean;
}

/**
 * Update result
 */
export interface UpdateResult {
  /** Total references found */
  totalReferences: number;
  /** References updated */
  updated: number;
  /** Files modified */
  filesModified: string[];
  /** Errors encountered */
  errors: Array<{ file: string; error: string }>;
}

/**
 * File Reference Updater
 *
 * Finds and updates all references to a file path across documentation
 *
 * @public
 */
export class FileReferenceUpdater {
  /**
   * Find all references to a file path
   *
   * @param oldPath - Old file path (absolute or relative)
   * @param baseDir - Base directory for scanning
   * @param newPath - New file path (optional, for calculating new text)
   * @returns Array of file references found
   */
  async findReferences(
    oldPath: string,
    baseDir: string,
    newPath?: string
  ): Promise<FileReference[]> {
    const references: FileReference[] = [];

    // Normalize paths
    const absoluteOldPath = path.isAbsolute(oldPath) ? oldPath : path.resolve(baseDir, oldPath);
    const relativeOldPath = path.relative(baseDir, absoluteOldPath);

    const absoluteNewPath = newPath
      ? path.isAbsolute(newPath)
        ? newPath
        : path.resolve(baseDir, newPath)
      : undefined;
    const relativeNewPath = absoluteNewPath ? path.relative(baseDir, absoluteNewPath) : undefined;

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

          // Find backlink references: → /path/to/file.md
          const backlinkMatches = this.findBacklinkReferences(
            line,
            relativeOldPath,
            absoluteOldPath
          );
          for (const match of backlinkMatches) {
            const ref: FileReference = {
              file,
              line: lineNum,
              column: match.column,
              type: 'backlink',
              oldText: match.text,
              newText: match.text, // Will be updated below if newPath provided
              lineContent: line,
            };
            if (newPath && relativeNewPath && absoluteNewPath) {
              ref.newText = this.calculateNewText(
                ref,
                relativeOldPath,
                relativeNewPath,
                absoluteOldPath,
                absoluteNewPath,
                baseDir
              );
            }
            references.push(ref);
          }

          // Find path references: Path: file.md or (file.md)
          const pathMatches = this.findPathReferences(line, relativeOldPath);
          for (const match of pathMatches) {
            const ref: FileReference = {
              file,
              line: lineNum,
              column: match.column,
              type: 'path',
              oldText: match.text,
              newText: match.text,
              lineContent: line,
            };
            if (newPath && relativeNewPath && absoluteNewPath) {
              ref.newText = this.calculateNewText(
                ref,
                relativeOldPath,
                relativeNewPath,
                absoluteOldPath,
                absoluteNewPath,
                baseDir
              );
            }
            references.push(ref);
          }

          // Find relative path references
          const relativeMatches = this.findRelativeReferences(line, file, absoluteOldPath, baseDir);
          for (const match of relativeMatches) {
            const ref: FileReference = {
              file,
              line: lineNum,
              column: match.column,
              type: 'relative',
              oldText: match.text,
              newText: match.text,
              lineContent: line,
            };
            if (newPath && relativeNewPath && absoluteNewPath) {
              ref.newText = this.calculateNewText(
                ref,
                relativeOldPath,
                relativeNewPath,
                absoluteOldPath,
                absoluteNewPath,
                baseDir
              );
            }
            references.push(ref);
          }

          // Find markdown links: [text](path)
          const markdownMatches = this.findMarkdownLinkReferences(
            line,
            relativeOldPath,
            absoluteOldPath
          );
          for (const match of markdownMatches) {
            const ref: FileReference = {
              file,
              line: lineNum,
              column: match.column,
              type: 'markdown-link',
              oldText: match.text,
              newText: match.text,
              lineContent: line,
            };
            if (newPath && relativeNewPath && absoluteNewPath) {
              ref.newText = this.calculateNewText(
                ref,
                relativeOldPath,
                relativeNewPath,
                absoluteOldPath,
                absoluteNewPath,
                baseDir
              );
            }
            references.push(ref);
          }
        }
      } catch (error) {
        console.error(`Error scanning ${file}:`, error);
      }
    }

    return references;
  }

  /**
   * Update all references from oldPath to newPath
   *
   * @param oldPath - Old file path
   * @param newPath - New file path
   * @param options - Update options
   * @returns Update result
   */
  async updateReferences(
    oldPath: string,
    newPath: string,
    options: UpdateOptions
  ): Promise<UpdateResult> {
    const result: UpdateResult = {
      totalReferences: 0,
      updated: 0,
      filesModified: [],
      errors: [],
    };

    // Find all references
    const references = await this.findReferences(oldPath, options.baseDir);
    result.totalReferences = references.length;

    if (references.length === 0) {
      return result;
    }

    // Calculate new text for each reference
    const absoluteOldPath = path.isAbsolute(oldPath)
      ? oldPath
      : path.resolve(options.baseDir, oldPath);
    const absoluteNewPath = path.isAbsolute(newPath)
      ? newPath
      : path.resolve(options.baseDir, newPath);
    const relativeOldPath = path.relative(options.baseDir, absoluteOldPath);
    const relativeNewPath = path.relative(options.baseDir, absoluteNewPath);

    for (const ref of references) {
      ref.newText = this.calculateNewText(
        ref,
        relativeOldPath,
        relativeNewPath,
        absoluteOldPath,
        absoluteNewPath,
        options.baseDir
      );
    }

    // Group references by file
    const refsByFile = new Map<string, FileReference[]>();
    for (const ref of references) {
      if (!refsByFile.has(ref.file)) {
        refsByFile.set(ref.file, []);
      }
      refsByFile.get(ref.file)?.push(ref);
    }

    // Update each file
    for (const [file, fileRefs] of refsByFile) {
      try {
        if (options.dryRun) {
          result.updated += fileRefs.length;
          if (!result.filesModified.includes(file)) {
            result.filesModified.push(file);
          }
        } else {
          const updated = await this.updateFileReferences(file, fileRefs);
          result.updated += updated;
          if (updated > 0 && !result.filesModified.includes(file)) {
            result.filesModified.push(file);
          }
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
   * Find backlink references in a line
   */
  private findBacklinkReferences(
    line: string,
    relativeOldPath: string,
    absoluteOldPath: string
  ): Array<{ text: string; column: number }> {
    const matches: Array<{ text: string; column: number }> = [];

    // Pattern: → /path/to/file.md or → path/to/file.md
    const backlinkPattern = /→\s+(\/)?([^\s]+\.md)/g;
    let match;

    while ((match = backlinkPattern.exec(line)) !== null) {
      const foundPath = match[2];
      if (foundPath === relativeOldPath || foundPath === path.basename(absoluteOldPath)) {
        matches.push({
          text: match[0],
          column: match.index + 1,
        });
      }
    }

    return matches;
  }

  /**
   * Find path references in a line
   */
  private findPathReferences(
    line: string,
    relativeOldPath: string
  ): Array<{ text: string; column: number }> {
    const matches: Array<{ text: string; column: number }> = [];
    const basename = path.basename(relativeOldPath);

    // Pattern: Path: file.md or (file.md) or **Path**: `file.md`
    const patterns = [/Path:\s*([^\s)]+\.md)/gi, /\(([^)]+\.md)\)/g, /`([^`]+\.md)`/g];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const foundPath = match[1];
        if (foundPath === basename || foundPath === relativeOldPath) {
          matches.push({
            text: match[0],
            column: match.index + 1,
          });
        }
      }
    }

    return matches;
  }

  /**
   * Find relative path references
   */
  private findRelativeReferences(
    line: string,
    currentFile: string,
    targetPath: string,
    _baseDir: string
  ): Array<{ text: string; column: number }> {
    const matches: Array<{ text: string; column: number }> = [];

    // Pattern: ../path/file.md or ./file.md
    const relativePattern = /(\.\.[/\\][\w\-/\\]+\.md|\.[/\\][\w\-/\\]+\.md)/g;
    let match;

    while ((match = relativePattern.exec(line)) !== null) {
      const relativePath = match[1];
      const currentDir = path.dirname(currentFile);
      const resolvedPath = path.resolve(currentDir, relativePath);

      if (resolvedPath === targetPath) {
        matches.push({
          text: match[0],
          column: match.index + 1,
        });
      }
    }

    return matches;
  }

  /**
   * Find markdown link references
   */
  private findMarkdownLinkReferences(
    line: string,
    relativeOldPath: string,
    absoluteOldPath: string
  ): Array<{ text: string; column: number }> {
    const matches: Array<{ text: string; column: number }> = [];

    // Pattern: [text](path.md)
    const markdownLinkPattern = /\[([^\]]+)\]\(([^)]+\.md)\)/g;
    let match;

    while ((match = markdownLinkPattern.exec(line)) !== null) {
      const linkPath = match[2];
      if (linkPath === relativeOldPath || linkPath === path.basename(absoluteOldPath)) {
        matches.push({
          text: match[0],
          column: match.index + 1,
        });
      }
    }

    return matches;
  }

  /**
   * Calculate new text for a reference
   */
  private calculateNewText(
    ref: FileReference,
    relativeOldPath: string,
    relativeNewPath: string,
    _absoluteOldPath: string,
    absoluteNewPath: string,
    _baseDir: string
  ): string {
    const basename = path.basename(relativeNewPath);

    switch (ref.type) {
      case 'backlink':
        // → /old/path.md → → /new/path.md
        return ref.oldText.replace(relativeOldPath, relativeNewPath);

      case 'path':
        // Path: old.md → Path: new.md or (old.md) → (new.md)
        if (ref.oldText.includes(relativeOldPath)) {
          return ref.oldText.replace(relativeOldPath, relativeNewPath);
        }
        return ref.oldText.replace(path.basename(relativeOldPath), basename);

      case 'relative': {
        // ../old/path.md → calculate new relative path
        const currentDir = path.dirname(ref.file);
        const newRelativePath = path.relative(currentDir, absoluteNewPath);
        return newRelativePath;
      }

      case 'markdown-link':
        // [text](old.md) → [text](new.md)
        return ref.oldText.replace(relativeOldPath, relativeNewPath);

      default:
        return ref.oldText;
    }
  }

  /**
   * Update references in a single file
   */
  private async updateFileReferences(file: string, references: FileReference[]): Promise<number> {
    const content = fs.readFileSync(file, 'utf-8');
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
