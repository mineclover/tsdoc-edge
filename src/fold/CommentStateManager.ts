/**
 * Comment state manager for fold/unfold operations
 * @packageDocumentation
 */

import * as fs from 'fs';
import * as path from 'path';
import { CommentExporter } from './CommentExporter';
import { CommentImporter } from './CommentImporter';
import { ConfigManager } from '../config/ConfigManager';
import {
  StateStorage,
  FileCommentState,
  CommentState,
  CollapseOptions,
  ExpandOptions,
  ExportResult,
  ImportResult,
  FileStatusSummary,
} from '../types/comment-state';

/**
 * Manages comment states across the project
 *
 * @public
 */
export class CommentStateManager {
  private storage: StateStorage;
  private storageDir: string;
  private exporter: CommentExporter;
  private importer: CommentImporter;

  /**
   * Create a new CommentStateManager
   *
   * @param storageDir - Directory to store comment state markdown files (optional, defaults to config)
   * @public
   */
  constructor(storageDir?: string) {
    // Use provided storageDir or get from config
    if (storageDir) {
      this.storageDir = storageDir;
    } else {
      const configManager = ConfigManager.getInstance();
      this.storageDir = configManager.resolvePath(
        configManager.get().paths.commentsDir
      );
    }

    this.exporter = new CommentExporter();
    this.importer = new CommentImporter();

    this.storage = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      files: {},
    };

    this.loadStorage();
  }

  /**
   * Load storage from disk
   */
  private loadStorage(): void {
    if (!fs.existsSync(this.storageDir)) {
      return;
    }

    // Load all markdown files
    this.walkDir(this.storageDir, (markdownPath) => {
      if (markdownPath.endsWith('.md')) {
        try {
          const fileState = this.importer.parseMarkdown(markdownPath);
          this.storage.files[fileState.filePath] = fileState;
        } catch (error) {
          console.error(`Error loading ${markdownPath}:`, error);
        }
      }
    });
  }

  /**
   * Walk directory recursively
   *
   * @param dir - Directory path
   * @param callback - Callback for each file
   */
  private walkDir(dir: string, callback: (filePath: string) => void): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        this.walkDir(fullPath, callback);
      } else {
        callback(fullPath);
      }
    }
  }

  /**
   * Export comments from a file to markdown
   *
   * @param filePath - Path to TypeScript file
   * @returns Path to created markdown file
   * @public
   */
  exportFile(filePath: string): string {
    const sourceCode = fs.readFileSync(filePath, 'utf-8');
    const markdownPath = this.exporter.exportFile(filePath, sourceCode, this.storageDir);

    // Update storage
    const fileState = this.importer.parseMarkdown(markdownPath);
    this.storage.files[filePath] = fileState;
    this.storage.lastUpdated = new Date().toISOString();

    return markdownPath;
  }

  /**
   * Export all TypeScript files in a directory
   *
   * @param sourceDir - Source directory to scan
   * @param pattern - Glob pattern for files (default: **\/*.ts)
   * @returns Export result
   * @public
   */
  exportAll(sourceDir: string, pattern: string = '**/*.ts'): ExportResult {
    const exportedFiles: string[] = [];
    let filesExported = 0;
    let commentsExported = 0;

    this.walkDir(sourceDir, (filePath) => {
      if (filePath.endsWith('.ts') && !filePath.endsWith('.test.ts')) {
        try {
          const markdownPath = this.exportFile(filePath);
          exportedFiles.push(markdownPath);
          filesExported++;

          const fileState = this.storage.files[filePath];
          commentsExported += fileState.comments.length;
        } catch (error) {
          console.error(`Error exporting ${filePath}:`, error);
        }
      }
    });

    return {
      filesExported,
      commentsExported,
      outputDir: this.storageDir,
      exportedFiles,
    };
  }

  /**
   * Import comments from markdown and apply to file
   *
   * @param filePath - Path to TypeScript file
   * @param overwrite - Whether to overwrite the original file
   * @returns Updated file path
   * @public
   */
  importFile(filePath: string, overwrite: boolean = false): string {
    const markdownPath = this.getMarkdownPath(filePath);

    if (!fs.existsSync(markdownPath)) {
      throw new Error(`Markdown file not found: ${markdownPath}`);
    }

    return this.importer.importFile(markdownPath, overwrite);
  }

  /**
   * Import all markdown files and apply to TypeScript files
   *
   * @param overwrite - Whether to overwrite original files
   * @returns Import result
   * @public
   */
  importAll(overwrite: boolean = false): ImportResult {
    const updatedFiles: string[] = [];
    const errors: string[] = [];
    let filesUpdated = 0;
    let commentsUpdated = 0;

    for (const filePath in this.storage.files) {
      try {
        const updated = this.importFile(filePath, overwrite);
        updatedFiles.push(updated);
        filesUpdated++;

        const fileState = this.storage.files[filePath];
        commentsUpdated += fileState.comments.length;
      } catch (error) {
        errors.push(`Error importing ${filePath}: ${error}`);
      }
    }

    return {
      filesUpdated,
      commentsUpdated,
      updatedFiles,
      errors,
    };
  }

  /**
   * Collapse comments in a file
   *
   * @param filePath - Path to TypeScript file
   * @param options - Collapse options
   * @public
   */
  collapse(filePath: string, options: CollapseOptions = {}): void {
    // Export if not already exported
    if (!this.storage.files[filePath]) {
      this.exportFile(filePath);
    }

    const fileState = this.storage.files[filePath];

    for (const comment of fileState.comments) {
      if (this.shouldCollapse(comment, options)) {
        comment.status = 'collapsed';
        comment.lastUpdated = new Date().toISOString();
      }
    }

    fileState.lastUpdated = new Date().toISOString();
    this.saveFileState(fileState);
  }

  /**
   * Check if comment should be collapsed
   *
   * @param comment - Comment state
   * @param options - Collapse options
   * @returns True if should collapse
   */
  private shouldCollapse(comment: CommentState, options: CollapseOptions): boolean {
    // Check minimum lines
    if (options.minLines) {
      const lines = comment.fullComment.split('\n').length;
      if (lines < options.minLines) {
        return false;
      }
    }

    // Check pattern
    if (options.pattern) {
      const regex = new RegExp(options.pattern);
      if (!regex.test(comment.symbol)) {
        return false;
      }
    }

    // Check private/public
    if (options.privateOnly && !comment.symbol.startsWith('_')) {
      return false;
    }

    if (options.publicOnly && comment.symbol.startsWith('_')) {
      return false;
    }

    return true;
  }

  /**
   * Expand comments in a file
   *
   * @param filePath - Path to TypeScript file
   * @param options - Expand options
   * @public
   */
  expand(filePath: string, options: ExpandOptions = {}): void {
    const fileState = this.storage.files[filePath];

    if (!fileState) {
      throw new Error(`File not in storage: ${filePath}`);
    }

    for (const comment of fileState.comments) {
      if (this.shouldExpand(comment, options)) {
        comment.status = 'expanded';
        comment.lastUpdated = new Date().toISOString();
      }
    }

    fileState.lastUpdated = new Date().toISOString();
    this.saveFileState(fileState);
  }

  /**
   * Check if comment should be expanded
   *
   * @param comment - Comment state
   * @param options - Expand options
   * @returns True if should expand
   */
  private shouldExpand(comment: CommentState, options: ExpandOptions): boolean {
    if (options.all) {
      return true;
    }

    if (options.pattern) {
      const regex = new RegExp(options.pattern);
      return regex.test(comment.symbol);
    }

    return true;
  }

  /**
   * Get status summary for a file
   *
   * @param filePath - Path to TypeScript file
   * @returns File status summary
   * @public
   */
  getStatus(filePath: string): FileStatusSummary {
    const fileState = this.storage.files[filePath];

    if (!fileState) {
      return {
        filePath,
        totalComments: 0,
        collapsedComments: 0,
        expandedComments: 0,
        lastUpdated: 'never',
      };
    }

    const collapsedComments = fileState.comments.filter((c) => c.status === 'collapsed').length;
    const expandedComments = fileState.comments.filter((c) => c.status === 'expanded').length;

    return {
      filePath,
      totalComments: fileState.comments.length,
      collapsedComments,
      expandedComments,
      lastUpdated: fileState.lastUpdated,
    };
  }

  /**
   * Get status summary for all files
   *
   * @returns Array of file status summaries
   * @public
   */
  getAllStatus(): FileStatusSummary[] {
    return Object.keys(this.storage.files).map((filePath) => this.getStatus(filePath));
  }

  /**
   * Save file state to markdown
   *
   * @param fileState - File comment state
   */
  private saveFileState(fileState: FileCommentState): void {
    const markdown = this.exporter.exportToMarkdown(fileState);
    const markdownPath = this.getMarkdownPath(fileState.filePath);

    const dir = path.dirname(markdownPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(markdownPath, markdown, 'utf-8');
  }

  /**
   * Get markdown path for a source file
   *
   * @param filePath - Source file path
   * @returns Markdown file path
   */
  private getMarkdownPath(filePath: string): string {
    const relativePath = filePath.replace(/^(\.\/|\/)?/, '');
    return path.join(this.storageDir, `${relativePath}.md`);
  }
}
