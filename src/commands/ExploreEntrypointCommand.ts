/**
 * Explore Entrypoint Command - 진입점 기반 전체 의존성 탐색
 *
 * @remarks
 * SSOT 문서(entrypoint)를 시작점으로 [[Symbol]] 참조를 따라가며
 * 전체 의존성 그래프를 탐색하고, 참조되지 않는 고아 코드를 발견
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';
import { DocumentSymbolParser } from '../doc-symbol/DocumentSymbolParser';
import { MermaidSymbolExtractor } from '../doc-symbol/MermaidSymbolExtractor';

/** Result of exploring an entrypoint file and its dependencies */
interface EntrypointExploration {
  /** Path to the entrypoint file */
  entrypointPath: string;
  discoveredSymbols: Set<string>;
  discoveredFiles: Set<string>;
  discoveredDocs: Set<string>;
  relationships: Array<{
    from: string;
    to: string;
    type: 'doc-symbol' | 'code-dependency' | 'implementation';
  }>;
  orphanedFiles: string[];
  orphanedSymbols: string[];
  statistics: {
    totalSymbolsInDb: number;
    discoveredSymbols: number;
    coveragePercentage: number;
    totalFilesInDb: number;
    discoveredFiles: number;
    fileCoveragePercentage: number;
  };
}

/**
 * Explore Entrypoint Command - 진입점 기반 탐색
 *
 * @doc [[ExploreEntrypointCommand]]
 * @public
 */
export class ExploreEntrypointCommand extends BaseCommand {
  getName(): string {
    return 'explore-entrypoint';
  }

  getDescription(): string {
    return 'Explore entire dependency graph from a documentation entrypoint';
  }

  protected getUsage(): string {
    return `tsdoc-edge explore-entrypoint <doc-path> [options]

  Options:
    --detect-orphans     Find unreferenced code`;
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const entrypointPath = args[0];

      if (!entrypointPath) {
        this.printError('Entrypoint path required: explore-entrypoint <doc-path>');
        console.log();
        console.log('Examples:');
        console.log('  tsdoc-edge explore-entrypoint managed/relationships/index.md');
        console.log('  tsdoc-edge explore-entrypoint managed/architecture/system.md');
        console.log();
        console.log('Use --detect-orphans to find unreferenced code');
        return this.failure('Missing entrypoint path');
      }

      // Resolve absolute path
      const absolutePath = path.resolve(process.cwd(), entrypointPath);

      if (!fs.existsSync(absolutePath)) {
        this.printError(`File not found: ${entrypointPath}`);
        return this.failure('File not found');
      }

      if (!entrypointPath.endsWith('.md') && !entrypointPath.endsWith('.mmd')) {
        this.printError('Entrypoint must be a markdown (.md) or Mermaid diagram (.mmd) file');
        return this.failure('Invalid file type');
      }

      this.printHeader(`Explore Entrypoint: ${path.basename(entrypointPath)}`);
      console.log(`📍 ${entrypointPath}`);
      console.log();

      // Load database
      const dbCheck = this.checkDatabaseExists();
      if (dbCheck) return dbCheck;

      const dbPath = this.getDatabasePath();
      const dbManager = new DatabaseManager(dbPath);
      const detectOrphans = args.includes('--detect-orphans');

      // Explore from entrypoint
      const exploration = await this.exploreFromEntrypoint(
        absolutePath,
        entrypointPath,
        dbManager,
        detectOrphans
      );

      // Display results
      this.displayExploration(exploration, detectOrphans);

      dbManager.close();

      return this.success(`Explored ${exploration.discoveredSymbols.size} symbols from entrypoint`);
    });
  }

  private async exploreFromEntrypoint(
    absolutePath: string,
    relativePath: string,
    dbManager: DatabaseManager,
    detectOrphans: boolean
  ): Promise<EntrypointExploration> {
    const exploration: EntrypointExploration = {
      entrypointPath: relativePath,
      discoveredSymbols: new Set(),
      discoveredFiles: new Set(),
      discoveredDocs: new Set(),
      relationships: [],
      orphanedFiles: [],
      orphanedSymbols: [],
      statistics: {
        totalSymbolsInDb: 0,
        discoveredSymbols: 0,
        coveragePercentage: 0,
        totalFilesInDb: 0,
        discoveredFiles: 0,
        fileCoveragePercentage: 0,
      },
    };

    // Parse entrypoint document
    exploration.discoveredDocs.add(relativePath);
    const queue: string[] = [relativePath];
    const processedDocs = new Set<string>();

    // BFS traversal through [[Symbol]] references
    while (queue.length > 0) {
      const currentDoc = queue.shift()!;
      if (processedDocs.has(currentDoc)) continue;
      processedDocs.add(currentDoc);

      const docAbsPath = path.resolve(process.cwd(), currentDoc);
      if (!fs.existsSync(docAbsPath)) continue;

      const content = fs.readFileSync(docAbsPath, 'utf-8');

      // Extract [[Symbol]] references based on file type
      let symbolRefs: string[] = [];

      if (currentDoc.endsWith('.mmd')) {
        // Parse Mermaid diagram
        const extractor = new MermaidSymbolExtractor();
        const mermaidResult = extractor.extract(content, currentDoc);
        symbolRefs = mermaidResult.symbolReferences;

        // Also extract from frontmatter if present
        const mdSymbolRefs = this.extractSymbolReferences(content);
        symbolRefs.push(...mdSymbolRefs);
      } else {
        // Parse markdown
        symbolRefs = this.extractSymbolReferences(content);
      }

      for (const symbolRef of symbolRefs) {
        // Check if this is a doc reference (points to another markdown file)
        const possibleDocPath = this.resolveDocReference(symbolRef, currentDoc);
        if (possibleDocPath && fs.existsSync(path.resolve(process.cwd(), possibleDocPath))) {
          if (!exploration.discoveredDocs.has(possibleDocPath)) {
            exploration.discoveredDocs.add(possibleDocPath);
            queue.push(possibleDocPath);
          }
          exploration.relationships.push({
            from: currentDoc,
            to: possibleDocPath,
            type: 'doc-symbol',
          });
        }

        // Extract implementation references (file:line format)
        const implRefs = this.extractImplementationReferences(content, symbolRef);
        for (const implRef of implRefs) {
          const [filePath, lineStr] = implRef.split(':');
          if (filePath.startsWith('src/')) {
            exploration.discoveredFiles.add(filePath);

            // Find symbols in this file
            const symbols = this.findSymbolsInFile(filePath, dbManager);
            for (const symbol of symbols) {
              exploration.discoveredSymbols.add(symbol.id);
              exploration.relationships.push({
                from: symbolRef,
                to: symbol.id,
                type: 'implementation',
              });

              // Follow code dependencies
              this.followCodeDependencies(symbol.id, exploration, dbManager);
            }
          }
        }
      }
    }

    // Calculate statistics
    const allSymbols = dbManager.db.prepare('SELECT id FROM symbols').all() as Array<{ id: string }>;
    const allFiles = new Set(
      (dbManager.db.prepare('SELECT DISTINCT file_path FROM symbols').all() as Array<{ file_path: string }>)
        .map((row) => row.file_path)
    );

    exploration.statistics.totalSymbolsInDb = allSymbols.length;
    exploration.statistics.discoveredSymbols = exploration.discoveredSymbols.size;
    exploration.statistics.coveragePercentage =
      (exploration.discoveredSymbols.size / allSymbols.length) * 100;

    exploration.statistics.totalFilesInDb = allFiles.size;
    exploration.statistics.discoveredFiles = exploration.discoveredFiles.size;
    exploration.statistics.fileCoveragePercentage =
      (exploration.discoveredFiles.size / allFiles.size) * 100;

    // Detect orphans if requested
    if (detectOrphans) {
      exploration.orphanedSymbols = allSymbols
        .filter((s) => !exploration.discoveredSymbols.has(s.id))
        .map((s) => s.id);

      exploration.orphanedFiles = Array.from(allFiles).filter(
        (f) => !exploration.discoveredFiles.has(f)
      );
    }

    return exploration;
  }

  /**
   * Extract [[Symbol]] references from markdown content
   */
  private extractSymbolReferences(content: string): string[] {
    const regex = /\[\[([^\]]+)\]\]/g;
    const matches: string[] = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      matches.push(match[1]);
    }

    return matches;
  }

  /**
   * Resolve [[Symbol]] to possible documentation path
   */
  private resolveDocReference(symbolRef: string, currentDoc: string): string | null {
    // Convert "Code Dependency" → "code-dependency.md"
    const filename = symbolRef
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    const currentDir = path.dirname(currentDoc);

    // Try same directory first
    const sameDirPath = path.join(currentDir, `${filename}.md`);
    if (fs.existsSync(path.resolve(process.cwd(), sameDirPath))) {
      return sameDirPath;
    }

    // Try managed/relationships
    const relationshipsPath = path.join('managed/relationships', `${filename}.md`);
    if (fs.existsSync(path.resolve(process.cwd(), relationshipsPath))) {
      return relationshipsPath;
    }

    // Try managed/features
    const featuresPath = path.join('managed/features', `${filename}.md`);
    if (fs.existsSync(path.resolve(process.cwd(), featuresPath))) {
      return featuresPath;
    }

    // Try managed/workflows
    const workflowsPath = path.join('managed/workflows', `${filename}.md`);
    if (fs.existsSync(path.resolve(process.cwd(), workflowsPath))) {
      return workflowsPath;
    }

    // Try managed/primary-types
    const typesPath = path.join('managed/primary-types', `${filename}.md`);
    if (fs.existsSync(path.resolve(process.cwd(), typesPath))) {
      return typesPath;
    }

    return null;
  }

  /**
   * Extract implementation file references
   * Format: `src/analyzer/Foo.ts:123` or `**Implementation**: src/...`
   */
  private extractImplementationReferences(content: string, symbolRef: string): string[] {
    const refs: string[] = [];

    // Match: **Implementation**: `path/to/file.ts:line`
    const implRegex = /\*\*Impl(?:ementation)?\*\*:?\s*`([^`]+)`/g;
    let match;
    while ((match = implRegex.exec(content)) !== null) {
      refs.push(match[1]);
    }

    // Match: **File**: `path/to/file.ts`
    const fileRegex = /\*\*File\*\*:?\s*`([^`]+)`/g;
    while ((match = fileRegex.exec(content)) !== null) {
      refs.push(match[1]);
    }

    // Match: **Implementation**: [[SymbolName]] (`path/to/file.ts`)
    const symbolImplRegex = /\*\*Impl(?:ementation)?\*\*:?\s*\[\[([^\]]+)\]\]\s*\(`([^`]+)`\)/g;
    while ((match = symbolImplRegex.exec(content)) !== null) {
      refs.push(match[2]); // Extract path from parentheses
    }

    // Match: **Command**: [[CommandName]] (`tsdoc-edge command`)
    // This allows extracting command implementation from command references
    const commandRegex = /\*\*Command\*\*:?\s*\[\[([^\]]+)\]\]/g;
    while ((match = commandRegex.exec(content)) !== null) {
      // Convert command symbol to file path
      const commandSymbol = match[1];
      const commandFile = this.symbolToCommandFile(commandSymbol);
      if (commandFile) {
        refs.push(commandFile);
      }
    }

    // Match: **[[CommandName]]** - `tsdoc-edge command`
    // New format from feature docs
    const commandFormatRegex = /\*\*\[\[([^\]]+Command)\]\]\*\*/g;
    while ((match = commandFormatRegex.exec(content)) !== null) {
      const commandSymbol = match[1];
      const commandFile = this.symbolToCommandFile(commandSymbol);
      if (commandFile) {
        refs.push(commandFile);
      }
    }

    return refs;
  }

  /**
   * Convert [[CommandName]] to src/commands/CommandName.ts
   */
  private symbolToCommandFile(symbolName: string): string | null {
    // Examples:
    // [[BuildCommand]] -> src/commands/BuildCommand.ts
    // [[AnalyzeIOCommand]] -> src/commands/AnalyzeIOCommand.ts

    if (symbolName.endsWith('Command')) {
      return `src/commands/${symbolName}.ts`;
    }

    // Check for analyzer symbols
    // [[ASTSymbolExtractor]] -> src/analyzer/ASTSymbolExtractor.ts
    if (symbolName.includes('Analyzer') || symbolName.includes('Extractor')) {
      return `src/analyzer/${symbolName}.ts`;
    }

    return null;
  }

  /**
   * Find all symbols defined in a file
   */
  private findSymbolsInFile(filePath: string, dbManager: DatabaseManager): Array<{ id: string }> {
    return dbManager.db
      .prepare('SELECT id FROM symbols WHERE file_path = ?')
      .all(filePath) as Array<{ id: string }>;
  }

  /**
   * Follow code dependencies recursively (1 level)
   */
  private followCodeDependencies(
    symbolId: string,
    exploration: EntrypointExploration,
    dbManager: DatabaseManager
  ): void {
    const deps = dbManager.db
      .prepare('SELECT target FROM dependencies WHERE symbol_id = ?')
      .all(symbolId) as Array<{ target: string }>;

    for (const dep of deps) {
      if (!exploration.discoveredSymbols.has(dep.target)) {
        exploration.discoveredSymbols.add(dep.target);

        // Get file for this symbol
        const symbolRow = dbManager.db
          .prepare('SELECT file_path FROM symbols WHERE id = ?')
          .get(dep.target) as { file_path: string } | undefined;

        if (symbolRow) {
          exploration.discoveredFiles.add(symbolRow.file_path);
        }

        exploration.relationships.push({
          from: symbolId,
          to: dep.target,
          type: 'code-dependency',
        });
      }
    }
  }

  /**
   * Display exploration results
   */
  private displayExploration(exploration: EntrypointExploration, showOrphans: boolean): void {
    const { statistics } = exploration;

    this.printSection('Exploration Statistics');
    console.log(`  Documentation files traversed: ${this.colors.cyan}${exploration.discoveredDocs.size}${this.colors.reset}`);
    console.log(`  Symbols discovered: ${this.colors.cyan}${statistics.discoveredSymbols}${this.colors.reset} / ${statistics.totalSymbolsInDb}`);
    console.log(`  Symbol coverage: ${this.colors.green}${statistics.coveragePercentage.toFixed(1)}%${this.colors.reset}`);
    console.log(`  Files discovered: ${this.colors.cyan}${statistics.discoveredFiles}${this.colors.reset} / ${statistics.totalFilesInDb}`);
    console.log(`  File coverage: ${this.colors.green}${statistics.fileCoveragePercentage.toFixed(1)}%${this.colors.reset}`);
    console.log();

    if (showOrphans) {
      this.printSection('Orphaned Code Detection');

      if (exploration.orphanedFiles.length > 0) {
        console.log(`  ${this.colors.yellow}⚠ Orphaned Files (${exploration.orphanedFiles.length}):${this.colors.reset}`);
        exploration.orphanedFiles.slice(0, 10).forEach((file) => {
          console.log(`    ${this.colors.dim}${file}${this.colors.reset}`);
        });
        if (exploration.orphanedFiles.length > 10) {
          console.log(`    ${this.colors.dim}... and ${exploration.orphanedFiles.length - 10} more${this.colors.reset}`);
        }
        console.log();
      } else {
        console.log(`  ${this.colors.green}✓ No orphaned files found${this.colors.reset}`);
        console.log();
      }

      if (exploration.orphanedSymbols.length > 0) {
        console.log(`  ${this.colors.yellow}⚠ Orphaned Symbols (${exploration.orphanedSymbols.length}):${this.colors.reset}`);
        exploration.orphanedSymbols.slice(0, 10).forEach((symbol) => {
          console.log(`    ${this.colors.dim}${symbol}${this.colors.reset}`);
        });
        if (exploration.orphanedSymbols.length > 10) {
          console.log(`    ${this.colors.dim}... and ${exploration.orphanedSymbols.length - 10} more${this.colors.reset}`);
        }
        console.log();
      } else {
        console.log(`  ${this.colors.green}✓ No orphaned symbols found${this.colors.reset}`);
        console.log();
      }
    }

    this.printSection('Next Steps');
    console.log(`  • Navigate documentation: Follow [[Symbol]] links in ${exploration.entrypointPath}`);
    console.log(`  • View work context: tsdoc-edge work-context <file-path>`);
    if (!showOrphans) {
      console.log(`  • Detect orphans: tsdoc-edge explore-entrypoint ${exploration.entrypointPath} --detect-orphans`);
    }
    console.log();
  }

  private get colors() {
    return {
      reset: '\x1b[0m',
      bold: '\x1b[1m',
      dim: '\x1b[2m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m',
      red: '\x1b[31m',
    };
  }
}
