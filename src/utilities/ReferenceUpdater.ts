import * as fs from 'fs';
import * as path from 'path';

/**
 * Type of reference found in documentation
 *
 * @public
 */
export type ReferenceType = 'backlink' | 'path' | 'relative' | 'markdown-link';

/**
 * A reference to a file path found in documentation
 *
 * @public
 */
export interface FileReference {
  /** File containing the reference */
  file: string;
  /** Line number (1-indexed) */
  line: number;
  /** Type of reference */
  type: ReferenceType;
  /** Original text */
  oldText: string;
  /** Replacement text */
  newText: string;
  /** Full line content for context */
  context: string;
}

/**
 * Finds and updates file path references in documentation
 *
 * Scans markdown files for references to file paths and provides
 * utilities to update them when files are renamed or moved.
 *
 * @public
 */
export class ReferenceUpdater {
  private managedDir: string;

  constructor(managedDir: string = 'managed') {
    this.managedDir = path.resolve(managedDir);
  }

  /**
   * Find all references to a file path
   *
   * @param oldPath - Original file path (relative to managed/)
   * @returns Array of file references
   *
   * @public
   */
  findReferences(oldPath: string): FileReference[] {
    const references: FileReference[] = [];
    const absoluteOldPath = this.resolveToManaged(oldPath);
    const relativeOldPath = path.relative(this.managedDir, absoluteOldPath);

    // Get all markdown files in managed directory
    const markdownFiles = this.getAllMarkdownFiles(this.managedDir);

    for (const file of markdownFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;

        // Check for backlinks: "→ /managed/features/file.md"
        const backlinkMatch = line.match(/→\s+([^\s]+\.md)/);
        if (backlinkMatch) {
          const referencedPath = backlinkMatch[1];
          if (this.pathsMatch(referencedPath, absoluteOldPath, relativeOldPath)) {
            references.push({
              file,
              line: lineNumber,
              type: 'backlink',
              oldText: backlinkMatch[0],
              newText: '', // Will be filled later
              context: line.trim()
            });
          }
        }

        // Check for path references: "Path: features/file.md" or "(file.md)"
        const pathMatch = line.match(/Path:\s*([^\s)]+\.md)|`([^`]+\.md)`|\(([^)]+\.md)\)/);
        if (pathMatch) {
          const referencedPath = pathMatch[1] || pathMatch[2] || pathMatch[3];
          if (this.pathsMatch(referencedPath, absoluteOldPath, relativeOldPath)) {
            references.push({
              file,
              line: lineNumber,
              type: 'path',
              oldText: pathMatch[0],
              newText: '', // Will be filled later
              context: line.trim()
            });
          }
        }

        // Check for markdown links: [text](../path/file.md)
        const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+\.md)\)/g;
        let match;
        while ((match = markdownLinkRegex.exec(line)) !== null) {
          const referencedPath = match[2];
          const resolvedPath = path.resolve(path.dirname(file), referencedPath);

          if (this.pathsMatch(resolvedPath, absoluteOldPath, relativeOldPath)) {
            references.push({
              file,
              line: lineNumber,
              type: 'markdown-link',
              oldText: match[0],
              newText: '', // Will be filled later
              context: line.trim()
            });
          }
        }

        // Check for relative paths: "../features/file.md"
        const relativeMatch = line.match(/(?:\.\.\/|\.\/)[^\s)]+\.md/g);
        if (relativeMatch) {
          for (const relativePath of relativeMatch) {
            const resolvedPath = path.resolve(path.dirname(file), relativePath);
            if (this.pathsMatch(resolvedPath, absoluteOldPath, relativeOldPath)) {
              references.push({
                file,
                line: lineNumber,
                type: 'relative',
                oldText: relativePath,
                newText: '', // Will be filled later
                context: line.trim()
              });
            }
          }
        }
      }
    }

    return references;
  }

  /**
   * Update references with new file path
   *
   * @param references - References to update
   * @param newPath - New file path (relative to managed/)
   *
   * @public
   */
  updateReferences(references: FileReference[], newPath: string): void {
    const absoluteNewPath = this.resolveToManaged(newPath);
    const relativeNewPath = path.relative(this.managedDir, absoluteNewPath);

    // Calculate new text for each reference
    for (const ref of references) {
      ref.newText = this.calculateNewText(ref, absoluteNewPath, relativeNewPath);
    }

    // Group by file
    const byFile = new Map<string, FileReference[]>();
    for (const ref of references) {
      if (!byFile.has(ref.file)) {
        byFile.set(ref.file, []);
      }
      byFile.get(ref.file)!.push(ref);
    }

    // Update each file
    for (const [file, refs] of byFile.entries()) {
      this.updateFile(file, refs);
    }
  }

  /**
   * Calculate new text for a reference
   *
   * @private
   */
  private calculateNewText(
    ref: FileReference,
    absoluteNewPath: string,
    relativeNewPath: string
  ): string {
    switch (ref.type) {
      case 'backlink':
        return ref.oldText.replace(/→\s+[^\s]+\.md/, `→ ${absoluteNewPath}`);

      case 'path':
        if (ref.oldText.includes('Path:')) {
          return ref.oldText.replace(/Path:\s*[^\s)]+\.md/, `Path: ${relativeNewPath}`);
        } else if (ref.oldText.startsWith('`')) {
          const fileName = path.basename(absoluteNewPath);
          return ref.oldText.replace(/`[^`]+\.md`/, `\`${fileName}\``);
        } else if (ref.oldText.startsWith('(')) {
          const fileName = path.basename(absoluteNewPath);
          return ref.oldText.replace(/\([^)]+\.md\)/, `(${fileName})`);
        }
        return ref.oldText;

      case 'markdown-link':
        // Calculate relative path from the referencing file to new location
        const refDir = path.dirname(ref.file);
        const newRelativePath = path.relative(refDir, absoluteNewPath);
        return ref.oldText.replace(/\]\([^)]+\.md\)/, `](${newRelativePath})`);

      case 'relative':
        // Calculate new relative path
        const refDirRel = path.dirname(ref.file);
        const newRelPath = path.relative(refDirRel, absoluteNewPath);
        return newRelPath;

      default:
        return ref.oldText;
    }
  }

  /**
   * Update a single file with new references
   *
   * @private
   */
  private updateFile(filePath: string, references: FileReference[]): void {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Sort by line number descending to avoid line number shifts
    references.sort((a, b) => b.line - a.line);

    for (const ref of references) {
      const lineIndex = ref.line - 1;
      if (lineIndex >= 0 && lineIndex < lines.length) {
        lines[lineIndex] = lines[lineIndex].replace(ref.oldText, ref.newText);
      }
    }

    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  }

  /**
   * Check if paths match (handles various path formats)
   *
   * @private
   */
  private pathsMatch(
    referencedPath: string,
    absoluteOldPath: string,
    relativeOldPath: string
  ): boolean {
    // Try absolute match
    if (referencedPath === absoluteOldPath) {
      return true;
    }

    // Try relative match
    if (referencedPath === relativeOldPath) {
      return true;
    }

    // Try basename match
    if (path.basename(referencedPath) === path.basename(absoluteOldPath)) {
      return true;
    }

    // Try resolving if it starts with ../
    if (referencedPath.startsWith('../') || referencedPath.startsWith('./')) {
      const resolved = path.resolve(this.managedDir, referencedPath);
      if (resolved === absoluteOldPath) {
        return true;
      }
    }

    return false;
  }

  /**
   * Resolve path relative to managed directory
   *
   * @private
   */
  private resolveToManaged(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.resolve(this.managedDir, filePath);
  }

  /**
   * Get all markdown files recursively
   *
   * @private
   */
  private getAllMarkdownFiles(dir: string, results: string[] = []): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        this.getAllMarkdownFiles(fullPath, results);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(fullPath);
      }
    }

    return results;
  }
}
