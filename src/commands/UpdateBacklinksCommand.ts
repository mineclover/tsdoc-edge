/**
 * Update-backlinks command - Update backlinks in document files
 *
 * @packageDocumentation
 * @doc [[UpdateBacklinksCommand]]
 * @doc [[CLI Commands]]
 * @context Bidirectional Markdown backlink synchronization via `tsdoc-edge docs backlinks` and `tsdoc-edge sync`
 * @functionality Parses `[[Symbol]]` references across Markdown and `@doc` tags in TypeScript code and regenerates backlink sections (or checks/previews via `--check`/`--dry-run`)
 * @sideEffect console: Writes backlink update summaries and drift diagnostics to stdout
 * @sideEffect filesystem: Reads Markdown and TypeScript files and writes updated backlink blocks to managed Markdown files in write mode
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConfigManager } from '../config/ConfigManager';
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
 * @doc [[UpdateBacklinksCommand]]
 * @doc [[CLI Commands]]
 * @doc [[CLI Commands#update-backlinks]]
 * @sideEffect filesystem: Reads Markdown and TypeScript files and updates backlink sections in managed docs; logs to stdout
 *
 * @problem Document backlinks become outdated as references change
 * @solves Automatically regenerates backlinks in all documents
 * @context Part of document symbol system for bidirectional linking
 *
 * @functionality
 * - Document scanning: Find all markdown files
 * - Symbol registry: Build complete symbol reference map
 * - Code connections: Parse `@doc` tags from TypeScript files
 * - Backlink generation: Create backlink sections for each symbol
 * - File updates: Write updated backlinks to documents
 *
 * @decision Parse both documents and code files
 * @rationale Complete backlink picture requires both doc and code references
 * @consequences Slower but more accurate backlink generation
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
    return `tsdoc-edge update-backlinks [docs-directory] [options]

  Default: managed (if exists), otherwise docs

  Options:
    --dry-run, -n   Preview documents that would be updated without modifying files
    --check         Exit with non-zero status if any document backlinks are out of sync`;
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

      const flagErr = this.validateAllowedFlags(args, ['--dry-run', '-n', '--check']);
      if (flagErr) {
        return flagErr;
      }

      const dryRun = this.hasFlag(args, '--dry-run') || this.hasFlag(args, '-n');
      const checkOnly = this.hasFlag(args, '--check');

      // Deprecation warning (only when called directly as legacy command)
      if (this.showDeprecationWarning) {
        this.printDeprecationWarning('tsdoc-edge docs backlinks');
      }

      const docsDir = this.resolveDocsDir(args);
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

            // Keep source connections deterministic on a clean checkout.
            // Matches IndexDocsCommand and ValidateDocsCommand so that
            // ### Implemented By sections are generated for documents with source annotations.
            if (parsed.primary && parsed.sourceFilePath) {
              registry.registerCodeConnection({
                codeSymbol: parsed.primary.name,
                filePath: parsed.sourceFilePath,
                line: 1,
                docSymbol: parsed.primary.name,
              });
            }
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
      const updated =
        dryRun || checkOnly
          ? generator.updateAllBacklinks({ dryRun: true })
          : generator.updateAllBacklinks();

      if (checkOnly) {
        if (updated.length > 0) {
          this.printSection('Out of Sync');
          for (const filePath of updated) {
            console.log(`${colors.red}❌${colors.reset} ${filePath}`);
          }
          console.log();
          this.printError(`Backlinks out of sync in ${updated.length} document(s)`);
          return this.failure(`Backlinks out of sync in ${updated.length} document(s)`, 1);
        }

        this.printSuccess('All backlinks are up to date');
        console.log();
        return this.success('All backlinks are up to date');
      }

      if (dryRun) {
        this.printSection('Would Update (Dry Run)');
        for (const filePath of updated) {
          this.printUpdatedDocument(registry, filePath);
        }
        console.log();
        this.printSuccess(`Total: ${updated.length} documents would be updated (dry run)`);
        console.log();
        return this.success();
      }

      this.printSection('Updated');
      for (const filePath of updated) {
        this.printUpdatedDocument(registry, filePath);
      }

      console.log();
      this.printSuccess(`Total: ${updated.length} documents updated`);
      console.log();

      return this.success();
    });
  }

  private printUpdatedDocument(registry: DocumentSymbolRegistry, filePath: string): void {
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

  /**
   * Resolve documentation directory.
   * Priority:
   * 1. Explicit target passed in CLI argument (first non-flag argument)
   * 2. Configured managedDirs if an existing directory is found on disk
   * 3. 'managed' if process.cwd()/managed exists
   * 4. Fallback to 'docs'
   */
  private resolveDocsDir(args: string[]): string {
    const target = args.find((arg) => !arg.startsWith('-'));
    if (target) {
      return target;
    }

    try {
      const config = ConfigManager.getInstance().get();
      const managedDirs = config.documentManagement?.managedDirs;
      if (Array.isArray(managedDirs)) {
        for (const dir of managedDirs) {
          const resolved = path.resolve(process.cwd(), dir);
          if (fs.existsSync(resolved)) {
            return dir;
          }
        }
      }
    } catch {
      // Ignore config loading errors and fall back to filesystem checks
    }

    const defaultManaged = path.resolve(process.cwd(), 'managed');
    if (fs.existsSync(defaultManaged)) {
      return 'managed';
    }

    return 'docs';
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
