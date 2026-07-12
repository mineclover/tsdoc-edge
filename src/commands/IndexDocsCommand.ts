/**
 * Index-docs command - Index document symbols
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { DocumentSymbolParser } from '../doc-symbol/DocumentSymbolParser';
import { DocumentSymbolRegistry } from '../doc-symbol/DocumentSymbolRegistry';
import { TSDocSymbolParser } from '../doc-symbol/TSDocSymbolParser';
import type { CodeConnection } from '../types/feature';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * Command for indexing document symbols
 *
 * @doc [[IndexDocsCommand]]
 * @public
 * @responsibility Index document symbols from markdown files
 * @contract Parse markdown files, extract [[Symbol]] definitions and references
 *
 * @problem Need to track all document symbols and their relationships
 * @solves Scans markdown and code files, builds symbol registry with definitions and references
 * @context Part of document symbol system for SSOT enforcement
 *
 * @functionality
 * - Full scan mode: Index all markdown files in directory
 * - Incremental mode: Update index for single file (--file=path)
 * - Symbol extraction: Parse [[Symbol]] from markdown and @doc tags from code
 * - Registry management: Maintain central symbol registry with statistics
 * - Code connections: Link code symbols to document symbols via @doc tags
 *
 * @decision Support both full scan and incremental update
 * @rationale Full scan for initial setup, incremental for fast updates during development
 * @consequences Flexible workflow - full rebuild when needed, fast updates otherwise
 *
 * @depends DocumentSymbolParser, DocumentSymbolRegistry, TSDocSymbolParser
 * @depType internal
 * @depReason Core document symbol infrastructure
 */
export class IndexDocsCommand extends BaseCommand {
  constructor(
    private docParser?: DocumentSymbolParser,
    private tsdocParser?: TSDocSymbolParser,
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
    return 'index-docs';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Index document symbols from markdown files';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge index-docs [docs-directory] [options]

  Default directory: docs

  Options:
    --file=PATH   Index a single file incrementally`;
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

      // Deprecation warning (only when called directly as legacy command)
      if (this.showDeprecationWarning) {
        this.printDeprecationWarning('tsdoc-edge docs index');
      }

      // Parse options
      let targetFile: string | undefined;
      let docsDir = 'docs';

      for (const arg of args) {
        if (arg.startsWith('--file=')) {
          targetFile = arg.split('=')[1];
        } else if (!arg.startsWith('--')) {
          docsDir = arg;
        }
      }

      // Define output paths once
      const outputDir = path.join(process.cwd(), '.tsdoc');
      const outputPath = path.join(outputDir, 'doc-symbols.json');

      // Check if incremental update (single file)
      if (targetFile) {
        return await this.incrementalUpdate(targetFile, outputDir, outputPath);
      }

      // Full scan mode
      return await this.fullScan(docsDir, outputDir, outputPath);
    });
  }

  /**
   * Incremental update for single file
   */
  private async incrementalUpdate(
    targetFile: string,
    outputDir: string,
    outputPath: string
  ): Promise<CommandResult> {
    const targetPath = path.resolve(process.cwd(), targetFile);

    if (!fs.existsSync(targetPath)) {
      this.printError(`File not found: ${targetPath}`);
      return this.failure(`File not found: ${targetPath}`);
    }

    this.printHeader(`Updating Index for ${path.basename(targetPath)}`);

    // Load existing index
    const registry = this.registry || new DocumentSymbolRegistry();
    if (fs.existsSync(outputPath)) {
      try {
        const indexData = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
        if (indexData.registryData) {
          registry.import(indexData.registryData);
          this.printInfo('Loaded existing index');
        }
      } catch (_error) {
        this.printWarning('Could not load existing index, creating new one');
      }
    }

    // Unregister old data from this file
    registry.unregisterFile(targetPath);
    this.printInfo(`Removed old symbols from ${path.basename(targetPath)}`);

    // Parse and register new data
    const parser = this.docParser || new DocumentSymbolParser();
    try {
      const parsed = parser.parse(targetPath);

      if (!parsed) {
        this.printWarning(`Skipped ${path.basename(targetPath)} (not a managed document)`);
        return this.success();
      }

      registry.registerDocument(parsed);
      this.printSuccess(`Updated symbols from ${path.basename(targetPath)}`);

      if (parsed.primary) {
        console.log(`  Primary: ${colors.green}[[${parsed.primary.name}]]${colors.reset}`);
      }
      if (parsed.auxiliaries.length > 0) {
        console.log(`  Auxiliaries: ${colors.cyan}${parsed.auxiliaries.length}${colors.reset}`);
      }
      if (parsed.references.length > 0) {
        console.log(`  References: ${colors.cyan}${parsed.references.length}${colors.reset}`);
      }
    } catch (error) {
      this.printError(
        `Error parsing ${targetPath}: ${error instanceof Error ? error.message : String(error)}`
      );
      return this.failure(error instanceof Error ? error : new Error(String(error)));
    }

    // Save updated index
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const stats = registry.getStatistics();
    fs.writeFileSync(
      outputPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          statistics: stats,
          symbols: Array.from(registry.getAllSymbolNames()),
          registryData: registry.export(),
        },
        null,
        2
      ),
      'utf-8'
    );

    console.log();
    this.printSuccess(`Index updated: ${outputPath}`);
    return this.success();
  }

  /**
   * Full scan mode
   */
  private async fullScan(
    docsDir: string,
    outputDir: string,
    outputPath: string
  ): Promise<CommandResult> {
    const docsPath = path.resolve(process.cwd(), docsDir);

    if (!fs.existsSync(docsPath)) {
      this.printError(`Directory not found: ${docsPath}`);
      return this.failure(`Directory not found: ${docsPath}`);
    }

    this.printHeader('Indexing Document Symbols');

    // Find all markdown files
    const markdownFiles = this.findMarkdownFiles(docsPath);
    console.log(`Found ${colors.green}${markdownFiles.length}${colors.reset} markdown files`);
    console.log();

    // Parse documents
    const parser = this.docParser || new DocumentSymbolParser();
    const registry = this.registry || new DocumentSymbolRegistry();

    let totalPrimary = 0;
    let totalAux = 0;
    let totalRefs = 0;
    let totalSourceConns = 0;

    for (const filePath of markdownFiles) {
      try {
        const parsed = parser.parse(filePath);

        if (!parsed) {
          // Skip non-managed documents
          continue;
        }

        registry.registerDocument(parsed);

        if (parsed.primary) totalPrimary++;
        totalAux += parsed.auxiliaries.length;
        totalRefs += parsed.references.length;

        // Create code connection from **Source**: pattern
        if (parsed.sourceFilePath && parsed.primary) {
          const conn: CodeConnection = {
            codeSymbol: parsed.primary.name,
            filePath: parsed.sourceFilePath,
            line: 1, // Approximate line (file level)
            docSymbol: parsed.primary.name,
          };
          registry.registerCodeConnection(conn);
          totalSourceConns++;
        }
      } catch (error) {
        this.printError(
          `Error parsing ${filePath}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // Find code files for @doc tags
    const srcDir = path.resolve(process.cwd(), 'src');
    const codeFiles = this.findCodeFiles(srcDir);
    const tsdocParser = this.tsdocParser || new TSDocSymbolParser();
    let totalCodeConns = 0;

    for (const filePath of codeFiles) {
      const connections = tsdocParser.parseCodeFile(filePath);
      for (const conn of connections) {
        registry.registerCodeConnection(conn);
        totalCodeConns++;
      }
    }

    // Print summary
    this.printSection('Summary');
    console.log(`Documents scanned: ${colors.green}${markdownFiles.length}${colors.reset}`);
    console.log(`Primary definitions: ${colors.green}${totalPrimary}${colors.reset}`);
    console.log(`Auxiliary definitions: ${colors.cyan}${totalAux}${colors.reset}`);
    console.log(`References: ${colors.cyan}${totalRefs}${colors.reset}`);
    console.log(
      `Code connections: ${colors.cyan}${totalCodeConns + totalSourceConns}${colors.reset} (${totalCodeConns} from @doc, ${totalSourceConns} from Source:)`
    );
    console.log();

    // Save to file
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const stats = registry.getStatistics();

    fs.writeFileSync(
      outputPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          statistics: stats,
          symbols: Array.from(registry.getAllSymbolNames()),
          registryData: registry.export(),
        },
        null,
        2
      ),
      'utf-8'
    );

    this.printSuccess(`Index created: ${outputPath}`);
    console.log();

    return this.success();
  }

  /**
   * Find all markdown files recursively
   */
  private findMarkdownFiles(dir: string): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
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
