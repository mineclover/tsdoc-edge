/**
 * Validate-docs command - Validate document symbols for SSOT compliance
 *
 * @packageDocumentation
 * @doc [[ValidateDocsCommand]]
 * @doc [[CLI Commands]]
 * @context Document checkpoint SSOT validation via `tsdoc-edge docs validate` and `tsdoc-edge validate docs`
 * @functionality Scans managed Markdown documents, registers `[[Symbol]]` definitions and references, and reports duplicate H1s, missing primaries, and broken references
 * @sideEffect console: Writes validation errors, warnings, and summary counts to stdout
 * @sideEffect filesystem: Reads managed Markdown files and `.tsdoc/doc-symbols.json` index on disk (read)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConfigManager } from '../config/ConfigManager';
import { DocumentSymbolParser } from '../doc-symbol/DocumentSymbolParser';
import { DocumentSymbolRegistry } from '../doc-symbol/DocumentSymbolRegistry';
import type { DocSymbolError } from '../types/feature';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * Command for validating document symbols
 *
 * @public
 * @responsibility Validate document symbols against SSOT rules
 * @contract Parse documents, validate symbols, report errors and warnings
 * @doc [[ValidateDocsCommand]]
 * @doc [[CLI Commands]]
 * @doc [[CLI Commands#validate-docs]]
 * @sideEffect console: Writes validation errors and warnings to stdout; reads managed Markdown files
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
    return (
      'tsdoc-edge validate docs [docs-directory] [--verify-sources]\n\n' +
      '  Default: docs\n' +
      '  Options:\n' +
      '    --verify-sources   Verify declared source file paths exist on disk'
    );
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns `Promise<CommandResult>`
   * @public
   */
  execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(() => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const flagError = this.validateAllowedFlags(args, ['--verify-sources']);
      if (flagError) {
        return flagError;
      }

      // Deprecation warning (only when called directly as legacy command)
      if (this.showDeprecationWarning) {
        this.printDeprecationWarning('tsdoc-edge validate docs');
      }

      const verifySources = this.hasFlag(args, '--verify-sources');
      const positionalArgs = this.getPositionalArgs(args);
      const docsDir = positionalArgs[0] || 'docs';
      const docsPath = path.resolve(process.cwd(), docsDir);

      if (!fs.existsSync(docsPath)) {
        this.printError(`Directory not found: ${docsPath}`);
        return this.failure(`Directory not found: ${docsPath}`);
      }

      this.printHeader('Validating Document Symbols');

      const markdownFiles = this.findMarkdownFiles(docsPath);
      const parser = this.parser || new DocumentSymbolParser();
      const registry = this.registry || new DocumentSymbolRegistry();
      const sourceErrors: DocSymbolError[] = [];

      for (const filePath of markdownFiles) {
        try {
          const parsed = parser.parse(filePath);
          if (parsed) {
            let shouldRegisterSourceConnection = Boolean(parsed.sourceFilePath);

            if (parsed.sourceFilePath) {
              const cleanSourcePath = parsed.sourceFilePath.split(':')[0].trim();
              const isGlobSource = cleanSourcePath.includes('*');
              const resolvedSourcePath = path.resolve(process.cwd(), cleanSourcePath);
              const sourceExists =
                isGlobSource || (cleanSourcePath.length > 0 && fs.existsSync(resolvedSourcePath));

              if (verifySources && !sourceExists) {
                sourceErrors.push({
                  type: 'broken_source_path',
                  symbolName: parsed.primary?.name ?? path.basename(filePath, '.md'),
                  filePath,
                  line: 1,
                  message: `Declared source file does not exist: ${parsed.sourceFilePath}`,
                });
                shouldRegisterSourceConnection = false;
              }
            }

            registry.registerDocument(parsed);

            // Keep source connections deterministic on a clean checkout. The
            // optional document-symbol index can still contribute @doc links,
            // but validation must not depend on a generated ignored artifact.
            if (parsed.primary && parsed.sourceFilePath && shouldRegisterSourceConnection) {
              registry.registerCodeConnection({
                codeSymbol: parsed.primary.name,
                filePath: parsed.sourceFilePath,
                line: 1,
                docSymbol: parsed.primary.name,
              });
            }
          }
        } catch (_error) {
          // Errors will be shown in validation
        }
      }

      this.preloadCanonicalDefinitions(docsPath, parser, registry);

      // Load code connections from index file if available
      const indexPath = path.resolve(process.cwd(), '.tsdoc/doc-symbols.json');
      if (fs.existsSync(indexPath)) {
        try {
          type CodeConnectionArg = Parameters<DocumentSymbolRegistry['registerCodeConnection']>[0];
          const rawIndexData: unknown = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
          const indexData = rawIndexData as {
            registryData?: {
              codeConnections?: Array<[string, CodeConnectionArg[]]>;
            };
          };
          const codeConnections = indexData.registryData?.codeConnections ?? [];
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
      if (sourceErrors.length > 0) {
        validation.errors.push(...sourceErrors);
        validation.valid = false;
      }

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
      const stats = registry.getStatistics();
      console.log(`Total definitions: ${colors.green}${stats.totalDefinitions}${colors.reset}`);
      console.log(
        `Errors: ${validation.errors.length > 0 ? colors.red : colors.green}${validation.errors.length}${colors.reset}`
      );
      console.log(
        `Warnings: ${validation.warnings.length > 0 ? colors.yellow : colors.green}${validation.warnings.length}${colors.reset}`
      );
      console.log();

      if (validation.valid) {
        this.printSuccess('All document symbols are valid');
      } else {
        this.printError('Validation failed');
        return this.failure('Validation failed');
      }

      console.log();
      return this.success();
    });
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
        if (excludeDirs.includes(entry)) {
          continue;
        }
        files.push(...this.findMarkdownFiles(fullPath, excludeDirs));
      } else if (entry.endsWith('.md') || entry.endsWith('.mdx')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Make managed canonical symbols resolvable while validating legacy docs.
   * The managed documents themselves are not added to the target validation
   * scope, so their references and warnings do not leak into this report.
   */
  private preloadCanonicalDefinitions(
    docsPath: string,
    parser: DocumentSymbolParser,
    registry: DocumentSymbolRegistry
  ): void {
    const managedPath = path.resolve(process.cwd(), 'managed');
    if (path.resolve(docsPath) === managedPath || !fs.existsSync(managedPath)) return;

    for (const filePath of this.findMarkdownFiles(managedPath)) {
      try {
        const parsed = parser.parse(filePath);
        if (parsed?.primary) registry.registerKnownPrimaryDefinition(parsed.primary);
      } catch (_error) {
        // The target validation should remain scoped to its requested tree.
      }
    }
  }
}
