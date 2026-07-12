/**
 * Update-symbol-refs command - Update symbol references in documents
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { DocumentSymbolParser } from '../doc-symbol/DocumentSymbolParser';
import { SymbolReferenceGenerator } from '../doc-symbol/SymbolReferenceGenerator';
import { SymbolRegistryManager } from '../storage/SymbolRegistryManager';
import type { ParsedDocSymbols } from '../types/feature/doc-symbol';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * Command for updating symbol references in documents
 *
 * @public
 * @responsibility Update code symbol footnote references in documents
 * @contract Parse documents, resolve symbol references, update footnotes
 * @doc [[Update Symbol References Command]]
 * @doc [[CLI Commands#update-symbol-refs]]
 *
 * @problem Symbol footnotes [^SymbolName] need to be updated when code changes
 * @solves Automatically updates footnote references with current code locations
 * @context Part of document symbol system for code-to-doc linking
 *
 * @functionality
 * - Document scanning: Find all markdown files with symbol footnotes
 * - Symbol resolution: Look up symbols in code registry
 * - Footnote generation: Create footnote definitions with file:line
 * - Batch updates: Update multiple documents efficiently
 * - Unresolved tracking: Report symbols that can't be found
 *
 * @decision Require symbol registry existence
 * @rationale Symbol references depend on indexed code symbols
 * @consequences Users must run "id new" before updating references
 *
 * @depends DocumentSymbolParser, SymbolRegistryManager, SymbolReferenceGenerator
 * @depType internal
 * @depReason Symbol reference infrastructure
 */
export class UpdateSymbolRefsCommand extends BaseCommand {
  constructor(
    private parser?: DocumentSymbolParser,
    private registryManager?: SymbolRegistryManager,
    private generator?: SymbolReferenceGenerator
  ) {
    super();
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'update-symbol-refs';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Update code symbol references in documents';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return 'tsdoc-edge update-symbol-refs [docs-directory]\n\n  Default: managed';
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

      const target = args[0];
      const docsDir = target || 'managed';
      const docsPath = path.resolve(process.cwd(), docsDir);

      if (!fs.existsSync(docsPath)) {
        this.printError(`Path not found: ${docsPath}`);
        return this.failure(`Path not found: ${docsPath}`);
      }

      this.printHeader('Updating Symbol References');

      // Check if symbol registry exists
      const registryPath = path.join(process.cwd(), '.tsdoc', 'registry.jsonl');
      if (!fs.existsSync(registryPath)) {
        this.printWarning('No symbol registry found. Run "tsdoc-edge id new" first.');
        console.log();
        return this.failure('Symbol registry not found');
      }

      const markdownFiles = this.findMarkdownFiles(docsPath);
      const parser = this.parser || new DocumentSymbolParser();
      const registryManager = this.registryManager || new SymbolRegistryManager(registryPath);
      const generator = this.generator || new SymbolReferenceGenerator(registryManager);

      // Parse all documents
      const parsedDocs: ParsedDocSymbols[] = [];
      for (const filePath of markdownFiles) {
        try {
          const parsed = parser.parse(filePath);
          if (parsed && parsed.symbolFootnoteRefs.length > 0) {
            parsedDocs.push(parsed);
          }
        } catch (error) {
          this.printError(
            `Error parsing ${filePath}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      if (parsedDocs.length === 0) {
        this.printWarning('No symbol footnote references found');
        console.log();
        return this.success();
      }

      // Update documents
      const result = generator.batchUpdate(parsedDocs);

      // Print results
      if (result.updated > 0) {
        this.printSection('Updated');
        for (const parsed of parsedDocs) {
          const uniqueRefs = new Set(parsed.symbolFootnoteRefs.map((r) => r.identifier)).size;
          console.log(
            `${colors.green}✅${colors.reset} ${parsed.filePath} (${colors.cyan}${uniqueRefs}${colors.reset} refs)`
          );
        }
        console.log();
      }

      if (result.errors.length > 0) {
        this.printSection('Errors');
        for (const error of result.errors) {
          console.log(`${colors.red}❌ ${error.file}${colors.reset}`);
          console.log(`   ${error.error}`);
        }
        console.log();
      }

      // Check for unresolved references
      let totalUnresolved = 0;
      for (const parsed of parsedDocs) {
        const unresolved = generator.getUnresolved(parsed);
        if (unresolved.length > 0) {
          if (totalUnresolved === 0) {
            this.printSection('Unresolved References');
          }
          console.log(`${colors.yellow}⚠️  ${parsed.filePath}${colors.reset}`);
          for (const u of unresolved) {
            console.log(`   Line ${u.line}: [^${u.identifier}]`);
          }
          totalUnresolved += unresolved.length;
        }
      }

      if (totalUnresolved > 0) {
        console.log();
      }

      // Summary
      this.printSuccess(`Total: ${result.updated} documents updated`);
      if (result.skipped > 0) {
        console.log(`${colors.yellow}Skipped: ${result.skipped}${colors.reset}`);
      }
      if (totalUnresolved > 0) {
        console.log(`${colors.yellow}Unresolved: ${totalUnresolved} references${colors.reset}`);
      }
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
}
