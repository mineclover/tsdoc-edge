/**
 * File scanner for full codebase scanning
 * @packageDocumentation
 * @responsibility Scan project directory and build symbol database
 * @architecture Scanner Layer - Full Scan Process
 */

import * as fs from 'fs';
import * as path from 'path';
import { TSDocParser } from '../parser/TSDocParser';
import { SymbolRegistryManager } from '../storage/SymbolRegistryManager';
import { DatabaseManager } from '../storage/DatabaseManager';
import { Symbol } from '../types/graph';

/**
 * Scanner configuration
 */
export interface ScannerConfig {
  /** Root directory to scan */
  rootDir: string;
  /** File patterns to include (glob) */
  include?: string[];
  /** File patterns to exclude (glob) */
  exclude?: string[];
  /** Whether to follow symlinks */
  followSymlinks?: boolean;
}

/**
 * Scan result statistics
 */
export interface ScanResult {
  /** Total files scanned */
  filesScanned: number;
  /** Total symbols found */
  symbolsFound: number;
  /** Symbols matched with registry */
  symbolsMatched: number;
  /** Symbols inserted into DB */
  symbolsInserted: number;
  /** Errors encountered */
  errors: string[];
  /** Duration in milliseconds */
  duration: number;
}

/**
 * File scanner for full codebase indexing
 *
 * @public
 * @responsibility Scan TypeScript files and build symbol database
 * @contract Scan directory → Parse TSDoc → Match Registry → Insert DB
 * @testScenario Scan single file
 * @testScenario Scan directory with multiple files
 * @testScenario Handle parse errors
 * @testScenario Match symbols with registry
 * @testScenario Insert into database
 */
export class FileScanner {
  private parser: TSDocParser;
  private registry: SymbolRegistryManager;
  private db: DatabaseManager;
  private config: ScannerConfig;

  /**
   * Create a new FileScanner
   * @param registry - Symbol registry manager
   * @param db - Database manager
   * @param config - Scanner configuration
   */
  constructor(
    registry: SymbolRegistryManager,
    db: DatabaseManager,
    config: ScannerConfig
  ) {
    this.parser = new TSDocParser();
    this.registry = registry;
    this.db = db;
    this.config = {
      include: ['**/*.ts', '**/*.tsx'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.ts', '**/*.spec.ts'],
      followSymlinks: false,
      ...config,
    };
  }

  /**
   * Scan entire project and build database
   * @returns Scan result statistics
   * @contract Scan all TypeScript files and populate database
   */
  async scan(): Promise<ScanResult> {
    const startTime = Date.now();
    const result: ScanResult = {
      filesScanned: 0,
      symbolsFound: 0,
      symbolsMatched: 0,
      symbolsInserted: 0,
      errors: [],
      duration: 0,
    };

    try {
      const files = this.findTypeScriptFiles(this.config.rootDir);

      for (const filePath of files) {
        try {
          await this.scanFile(filePath, result);
          result.filesScanned++;
        } catch (error) {
          result.errors.push(`Error scanning ${filePath}: ${error}`);
        }
      }
    } catch (error) {
      result.errors.push(`Fatal error: ${error}`);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Scan a single file
   * @param filePath - Path to TypeScript file
   * @param result - Result object to update
   * @private
   */
  private async scanFile(filePath: string, result: ScanResult): Promise<void> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parseResult = this.parser.parseFile(filePath, content);

    for (const comment of parseResult.comments) {
      result.symbolsFound++;

      // Extract @id tag from comment
      const id = this.extractIdTag(comment.docComment);
      if (!id) {
        continue;
      }

      // Match with registry
      const registryEntry = this.registry.findById(id);
      if (!registryEntry) {
        result.errors.push(`Registry entry not found for ID: ${id} in ${filePath}`);
        continue;
      }

      result.symbolsMatched++;

      // Extract symbol data
      const symbol = this.buildSymbol(comment, id, registryEntry);

      // Insert into database
      const success = this.db.insertSymbol(symbol, 0);
      if (success) {
        result.symbolsInserted++;
      } else {
        result.errors.push(`Failed to insert symbol: ${id} (${comment.symbolName})`);
      }
    }
  }

  /**
   * Extract @id tag from TSDoc comment
   * @param docComment - Parsed TSDoc comment
   * @returns ID or null if not found
   * @private
   */
  private extractIdTag(docComment: any): string | null {
    const customBlocks = docComment.customBlocks || [];
    for (const block of customBlocks) {
      if (block.blockTag.tagName === '@id') {
        const content = block.content.nodes
          .flatMap((node: any) => {
            if (node.kind === 'Paragraph' && node.nodes) {
              return node.nodes
                .filter((n: any) => n.kind === 'PlainText')
                .map((n: any) => n.text || '');
            }
            return [];
          })
          .join('')
          .trim();
        return content || null;
      }
    }
    return null;
  }

  /**
   * Build Symbol object from parsed comment and registry entry
   * @param comment - Parsed comment
   * @param id - Symbol ID
   * @param registryEntry - Registry entry
   * @returns Symbol object
   * @private
   */
  private buildSymbol(comment: any, id: string, registryEntry: any): Symbol {
    // Extract summary
    const summarySection = comment.docComment.summarySection;
    const summary = summarySection
      ? summarySection.nodes
          .flatMap((node: any) => {
            if (node.kind === 'Paragraph' && node.nodes) {
              return node.nodes
                .filter((n: any) => n.kind === 'PlainText')
                .map((n: any) => n.text || '');
            }
            return [];
          })
          .join('')
          .trim()
      : '';

    // Check if @public tag exists
    const hasPublicTag = comment.docComment.customBlocks.some(
      (block: any) => block.blockTag.tagName === '@public'
    );

    return {
      id,
      name: comment.symbolName,
      type: (registryEntry.sourceRef.type || 'unknown') as any,
      filePath: comment.filePath,
      line: 1,
      column: 0,
      isExported: true,
      isPublic: hasPublicTag,
      summary,
      tests: [],
      designDecisions: [],
    };
  }

  /**
   * Find all TypeScript files in directory
   * @param dir - Directory to scan
   * @returns Array of file paths
   * @private
   */
  private findTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];
    const excludePatterns = this.config.exclude || [];

    // Check if directory exists
    if (!fs.existsSync(dir)) {
      return files;
    }

    const walk = (currentDir: string): void => {
      // Check if directory should be excluded
      if (this.shouldExclude(currentDir, excludePatterns)) {
        return;
      }

      let entries;
      try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true });
      } catch (error) {
        // Skip directories that can't be read
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        // Skip symlinks if not following
        if (entry.isSymbolicLink() && !this.config.followSymlinks) {
          continue;
        }

        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile() && this.isTypeScriptFile(fullPath)) {
          if (!this.shouldExclude(fullPath, excludePatterns)) {
            files.push(fullPath);
          }
        }
      }
    };

    walk(dir);
    return files;
  }

  /**
   * Check if file is a TypeScript file
   * @param filePath - File path
   * @returns True if TypeScript file
   * @private
   */
  private isTypeScriptFile(filePath: string): boolean {
    return /\.(ts|tsx)$/.test(filePath);
  }

  /**
   * Check if path should be excluded
   * @param filePath - File or directory path
   * @param patterns - Exclude patterns
   * @returns True if should be excluded
   * @private
   */
  private shouldExclude(filePath: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      // Simple glob pattern matching
      const regex = new RegExp(
        pattern
          .replace(/\*\*/g, '.*')
          .replace(/\*/g, '[^/]*')
          .replace(/\?/g, '.')
      );
      if (regex.test(filePath)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Scan and verify - scan files and verify import
   * @returns Scan result and verification result
   * @contract Scan → Export → Verify for data integrity
   */
  async scanAndVerify(): Promise<{
    scanResult: ScanResult;
    verifyResult: ReturnType<DatabaseManager['verifyImport']>;
  }> {
    // Perform scan
    const scanResult = await this.scan();

    // Export to JSONL
    const exportPath = this.db.exportToJSONL();

    // Verify import
    const verifyResult = this.db.verifyImport(exportPath);

    return {
      scanResult,
      verifyResult,
    };
  }
}
