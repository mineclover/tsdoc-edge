/**
 * Validate-docs command - Validate document symbols for SSOT compliance
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConfigManager } from '../config/ConfigManager';
import { DocumentSymbolParser } from '../doc-symbol/DocumentSymbolParser';
import { DocumentSymbolRegistry } from '../doc-symbol/DocumentSymbolRegistry';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * Command for validating document symbols
 *
 * @public
 * @responsibility Validate document symbols against SSOT rules
 * @contract Parse documents, validate symbols, report errors and warnings
 * @doc [[Validate Docs Command]]
 * @doc [[CLI Commands#validate-docs]]
 *
 * @problem Document symbols can have conflicts, orphans, or missing definitions
 * @solves Validates all document symbols and reports SSOT violations
 * @context Part of document symbol system for SSOT enforcement
 *
 * @functionality
 * - Document scanning: Find all markdown files recursively
 * - Symbol parsing: Extract [[Symbol]] definitions and references
 * - Validation: Check for conflicts, orphans, missing definitions
 * - Error reporting: Display errors with file locations
 * - Warning reporting: Display warnings for potential issues
 *
 * @decision Use DocumentSymbolRegistry validation
 * @rationale Centralized validation logic with comprehensive rule checking
 * @consequences Consistent validation across all document operations
 *
 * @depends DocumentSymbolParser, DocumentSymbolRegistry
 * @depType internal
 * @depReason Core document symbol infrastructure
 */
export class ValidateDocsCommand extends BaseCommand {
  constructor(
    private parser?: DocumentSymbolParser,
    private registry?: DocumentSymbolRegistry,
    private showDeprecationWarning = false
  ) {
    super();
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'validate-docs';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Validate document symbols for SSOT compliance';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return 'tsdoc-edge validate-docs [docs-directory] [options]\n\n  Default: docs\n\n  Options:\n    --human          Output in human-readable format (default: XML)';
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const isHuman = this.hasFlag(args, '--human');

      // Deprecation warning (only when called directly as legacy command)
      if (this.showDeprecationWarning && isHuman) {
        this.printDeprecationWarning('tsdoc-edge validate docs');
      }

      const docsDir = args.find((arg) => !arg.startsWith('-')) || 'docs';
      const docsPath = path.resolve(process.cwd(), docsDir);

      if (!fs.existsSync(docsPath)) {
        this.printError(`Directory not found: ${docsPath}`);
        return this.failure(`Directory not found: ${docsPath}`);
      }

      if (isHuman) this.printHeader('Validating Document Symbols');

      const markdownFiles = this.findMarkdownFiles(docsPath);
      const parser = this.parser || new DocumentSymbolParser();
      const registry = this.registry || new DocumentSymbolRegistry();

      for (const filePath of markdownFiles) {
        try {
          const parsed = parser.parse(filePath);
          if (parsed) {
            registry.registerDocument(parsed);
          }
        } catch (_error) {
          // Errors will be shown in validation
        }
      }

      // Load code connections from index file if available
      const indexPath = path.resolve(process.cwd(), '.tsdoc/doc-symbols.json');
      if (fs.existsSync(indexPath)) {
        try {
          const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
          const codeConnections = indexData.registryData?.codeConnections || [];
          for (const [_symbolName, connections] of codeConnections) {
            for (const conn of connections) {
              registry.registerCodeConnection(conn);
            }
          }
        } catch (_e) {
          // Ignore errors loading index
        }
      }

      // Validate
      const validation = registry.validate();

      const stats = registry.getStatistics();

      if (isHuman) {
        this.printHumanReport(validation, stats);
        if (validation.valid) {
          this.printSuccess('All document symbols are valid');
        } else {
          this.printError('Validation failed');
          return this.failure('Validation failed');
        }

        console.log();
        return this.success();
      }

      this.printOutput(
        'validate-docs',
        {
          summary: {
            docsDir,
            isValid: validation.valid,
            totalDefinitions: stats.totalDefinitions,
            errorCount: validation.errors.length,
            warningCount: validation.warnings.length,
          },
          errors: validation.errors.map((error) => ({
            type: error.type,
            symbol: error.symbolName,
            file: error.filePath,
            line: error.line,
            message: error.message,
            ...(error.conflictWith
              ? { conflictsWith: `${error.conflictWith.filePath}:${error.conflictWith.line}` }
              : {}),
          })),
          warnings: validation.warnings.map((warning) => ({
            type: warning.type,
            symbol: warning.symbolName,
            file: warning.filePath,
            message: warning.message,
            ...(warning.count !== undefined ? { count: warning.count } : {}),
          })),
        },
        args
      );

      return validation.valid ? this.success() : this.failure('Validation failed');
    });
  }

  /**
   * Print the colored terminal report (--human)
   */
  private printHumanReport(
    validation: ReturnType<DocumentSymbolRegistry['validate']>,
    stats: ReturnType<DocumentSymbolRegistry['getStatistics']>
  ): void {
    // Print errors
    if (validation.errors.length > 0) {
      this.printSection('Errors');
      for (const error of validation.errors) {
        console.log(`${colors.red}❌ ${error.type}${colors.reset}`);
        console.log(`   Symbol: [[${error.symbolName}]]`);
        console.log(`   File: ${error.filePath}:${error.line}`);
        console.log(`   ${error.message}`);
        if (error.conflictWith) {
          console.log(
            `   Conflicts with: ${error.conflictWith.filePath}:${error.conflictWith.line}`
          );
        }
        console.log();
      }
    }

    // Print warnings
    if (validation.warnings.length > 0) {
      this.printSection('Warnings');
      for (const warning of validation.warnings) {
        console.log(`${colors.yellow}⚠️  ${warning.type}${colors.reset}`);
        console.log(`   Symbol: [[${warning.symbolName}]]`);
        console.log(`   File: ${warning.filePath}`);
        console.log(`   ${warning.message}`);
        if (warning.count !== undefined) {
          console.log(`   Count: ${warning.count}`);
        }
        console.log();
      }
    }

    // Summary
    this.printSection('Summary');
    console.log(`Total definitions: ${colors.green}${stats.totalDefinitions}${colors.reset}`);
    console.log(
      `Errors: ${validation.errors.length > 0 ? colors.red : colors.green}${validation.errors.length}${colors.reset}`
    );
    console.log(
      `Warnings: ${validation.warnings.length > 0 ? colors.yellow : colors.green}${validation.warnings.length}${colors.reset}`
    );
    console.log();
  }

  /**
   * Find all markdown files recursively, respecting validation.excludeDirs
   */
  private findMarkdownFiles(dir: string, excludeDirs?: string[]): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir);

    // Get exclude dirs from config if not provided
    if (!excludeDirs) {
      const config = ConfigManager.getInstance().get();
      excludeDirs = config.validation?.excludeDirs || [];
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip excluded directories
        if (excludeDirs?.includes(entry)) {
          continue;
        }
        files.push(...this.findMarkdownFiles(fullPath, excludeDirs || []));
      } else if (entry.endsWith('.md') || entry.endsWith('.mdx')) {
        files.push(fullPath);
      }
    }

    return files;
  }
}
