/**
 * Update-backlinks command - Update backlinks in document files
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BacklinkGenerator } from '../doc-symbol/BacklinkGenerator';
import { DocumentSymbolParser } from '../doc-symbol/DocumentSymbolParser';
import { DocumentSymbolRegistry } from '../doc-symbol/DocumentSymbolRegistry';
import { TSDocSymbolParser } from '../doc-symbol/TSDocSymbolParser';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * Command for updating backlinks in documents
 *
 * @public
 * @responsibility Update backlinks in all managed documents
 * @contract Parse documents, generate backlinks, update files
 * @doc [[Update Backlinks Command]]
 * @doc [[CLI Commands#update-backlinks]]
 *
 * @problem Document backlinks become outdated as references change
 * @solves Automatically regenerates backlinks in all documents
 * @context Part of document symbol system for bidirectional linking
 *
 * @functionality
 * - Document scanning: Find all markdown files
 * - Symbol registry: Build complete symbol reference map
 * - Code connections: Parse @doc tags from TypeScript files
 * - Backlink generation: Create backlink sections for each symbol
 * - File updates: Write updated backlinks to documents
 *
 * @decision Parse both documents and code files
 * @rationale Complete backlink picture requires both doc and code references
 * @consequences Slower but more accurate backlink generation
 *
 * @depends DocumentSymbolParser, DocumentSymbolRegistry, TSDocSymbolParser, BacklinkGenerator
 * @depType internal
 * @depReason Complete document symbol infrastructure stack
 */
export class UpdateBacklinksCommand extends BaseCommand {
  constructor(
    private docParser?: DocumentSymbolParser,
    private tsdocParser?: TSDocSymbolParser,
    private registry?: DocumentSymbolRegistry,
    private generator?: BacklinkGenerator,
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
    return 'update-backlinks';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Update backlinks in document files';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return 'tsdoc-edge update-backlinks [docs-directory] [options]\n\n  Default: docs\n\n  Options:\n    --human          Output in human-readable format (default: XML)';
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
        this.printDeprecationWarning('tsdoc-edge docs backlinks');
      }

      const target = args.find((arg) => !arg.startsWith('-'));
      const docsDir = target || 'docs';
      const docsPath = path.resolve(process.cwd(), docsDir);

      if (!fs.existsSync(docsPath)) {
        this.printError(`Path not found: ${docsPath}`);
        return this.failure(`Path not found: ${docsPath}`);
      }

      if (isHuman) this.printHeader('Updating Backlinks');

      const markdownFiles = this.findMarkdownFiles(docsPath);
      const docParser = this.docParser || new DocumentSymbolParser();
      const registry = this.registry || new DocumentSymbolRegistry();

      // Parse all documents
      const parseErrors: Array<{ file: string; message: string }> = [];
      for (const filePath of markdownFiles) {
        try {
          const parsed = docParser.parse(filePath);
          if (parsed) {
            registry.registerDocument(parsed);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          parseErrors.push({ file: filePath, message });
          if (isHuman) this.printError(`Error parsing ${filePath}: ${message}`);
        }
      }

      // Parse code connections
      const srcDir = path.resolve(process.cwd(), 'src');
      const codeFiles = this.findCodeFiles(srcDir);
      const tsdocParser = this.tsdocParser || new TSDocSymbolParser();

      for (const filePath of codeFiles) {
        const connections = tsdocParser.parseCodeFile(filePath);
        for (const conn of connections) {
          registry.registerCodeConnection(conn);
        }
      }

      // Update backlinks
      const generator = this.generator || new BacklinkGenerator(registry);
      const updated = generator.updateAllBacklinks();

      // Resolve each updated file back to its primary symbol and backlink count
      const updatedDocs = updated.map((filePath) => {
        const symbolName = Array.from(registry.getAllSymbolNames()).find(
          (name) => registry.getDefinition(name)?.filePath === filePath
        );
        const backlinks = symbolName
          ? registry.getReferences(symbolName).length +
            registry.getCodeConnections(symbolName).length
          : undefined;
        return { filePath, symbolName, backlinks };
      });

      if (isHuman) {
        this.printSection('Updated');
        for (const { filePath, symbolName, backlinks } of updatedDocs) {
          if (symbolName) {
            console.log(
              `${colors.green}✅${colors.reset} ${filePath} (${colors.cyan}${backlinks}${colors.reset} backlinks)`
            );
          }
        }

        console.log();
        this.printSuccess(`Total: ${updated.length} documents updated`);
        console.log();
      } else {
        this.printOutput(
          'update-backlinks',
          {
            summary: {
              docsDir,
              documentsScanned: markdownFiles.length,
              documentsUpdated: updated.length,
            },
            updatedFiles: updatedDocs.map(({ filePath, symbolName, backlinks }) => ({
              path: filePath,
              symbol: symbolName ?? '',
              backlinkCount: backlinks ?? null,
            })),
            parseErrors,
          },
          args
        );
      }

      return this.success();
    });
  }

  /**
   * Find all markdown files recursively
   */
  private findMarkdownFiles(dir: string): string[] {
    const files: string[] = [];
    const stat = fs.statSync(dir);

    if (stat.isFile()) {
      return [dir];
    }

    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const entryStat = fs.statSync(fullPath);

      if (entryStat.isDirectory()) {
        files.push(...this.findMarkdownFiles(fullPath));
      } else if (entry.endsWith('.md') || entry.endsWith('.mdx')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Find all code files recursively
   */
  private findCodeFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];

    const files: string[] = [];
    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && entry !== 'node_modules' && entry !== 'dist') {
        files.push(...this.findCodeFiles(fullPath));
      } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }

    return files;
  }
}
