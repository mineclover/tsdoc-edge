/**
 * Update-backlinks command - Update backlinks in document files
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { DocumentSymbolParser } from '../doc-symbol/DocumentSymbolParser';
import { DocumentSymbolRegistry } from '../doc-symbol/DocumentSymbolRegistry';
import { TSDocSymbolParser } from '../doc-symbol/TSDocSymbolParser';
import { BacklinkGenerator } from '../doc-symbol/BacklinkGenerator';

/**
 * Command for updating backlinks in documents
 *
 * @public
 * @responsibility Update backlinks in all managed documents
 * @contract Parse documents, generate backlinks, update files
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
    private generator?: BacklinkGenerator
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
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      const target = args[0];
      const docsDir = target || 'docs';
      const docsPath = path.resolve(process.cwd(), docsDir);

      if (!fs.existsSync(docsPath)) {
        this.printError(`Path not found: ${docsPath}`);
        return this.failure(`Path not found: ${docsPath}`);
      }

      this.printHeader('Updating Backlinks');

      const markdownFiles = this.findMarkdownFiles(docsPath);
      const docParser = this.docParser || new DocumentSymbolParser();
      const registry = this.registry || new DocumentSymbolRegistry();

      // Parse all documents
      for (const filePath of markdownFiles) {
        try {
          const parsed = docParser.parse(filePath);
          if (parsed) {
            registry.registerDocument(parsed);
          }
        } catch (error) {
          this.printError(
            `Error parsing ${filePath}: ${error instanceof Error ? error.message : String(error)}`
          );
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

      this.printSection('Updated');
      for (const filePath of updated) {
        const symbolName = Array.from(registry.getAllSymbolNames()).find(
          (name) => registry.getDefinition(name)?.filePath === filePath
        );

        if (symbolName) {
          const refs = registry.getReferences(symbolName);
          const conns = registry.getCodeConnections(symbolName);
          const total = refs.length + conns.length;

          console.log(
            `${colors.green}✅${colors.reset} ${filePath} (${colors.cyan}${total}${colors.reset} backlinks)`
          );
        }
      }

      console.log();
      this.printSuccess(`Total: ${updated.length} documents updated`);
      console.log();

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
