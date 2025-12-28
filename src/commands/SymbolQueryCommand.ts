/**
 * Symbol Query Command - Search and explore document symbols
 *
 * @packageDocumentation
 * @responsibility Query and explore [[Symbol]] definitions and references
 *
 * @problem Users need to find symbols, check their usage, and explore connections
 * @solves Provides comprehensive symbol search and exploration capabilities
 * @context Part of symbol reference system for convention management
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult } from './BaseCommand';
import { DocumentSymbolParser } from '../doc-symbol/DocumentSymbolParser';
import type { DocumentSymbol, ParsedDocSymbols } from '../types/feature';

/**
 * Symbol information with full context
 */
interface SymbolInfo {
  name: string;
  primary?: {
    filePath: string;
    line: number;
    content: string;
  };
  auxiliaries: Array<{
    filePath: string;
    line: number;
    level: number;
  }>;
  references: Array<{
    filePath: string;
    line: number;
    context: string;
  }>;
  sourceFilePath?: string;
}

/**
 * Query and explore document symbols
 *
 * @doc [[SymbolQueryCommand]]
 * @public
 * @responsibility Provide symbol search and exploration capabilities
 * @contract Parse documents, index symbols, respond to queries
 *
 * @functionality
 * - Symbol search: Find symbols by name or pattern
 * - Symbol details: Show primary, auxiliaries, references, and code connections
 * - Symbol listing: List all defined symbols with statistics
 * - Similarity search: Find similar symbol names for typo correction
 * - Backlinks: Show all documents that reference a symbol
 *
 * @decision Use in-memory indexing for fast queries
 * @rationale Documentation is small enough to fit in memory, enables instant search
 * @consequences Fast queries but requires rebuild on changes
 */
export class SymbolQueryCommand extends BaseCommand {
  private symbols: Map<string, SymbolInfo> = new Map();
  private parser: DocumentSymbolParser;

  constructor() {
    super();
    this.parser = new DocumentSymbolParser();
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'symbol-query';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Query and explore document symbols';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge symbol-query <subcommand> [options]

  Subcommands:
    list              List all symbols
    search <query>    Search symbols by name
    info <symbol>     Show detailed symbol information
    backlinks <symbol> Show documents that reference the symbol
    similar <symbol>  Find symbols with similar names
    stats             Show symbol statistics`;
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag before processing
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const docsDir = this.findDocsDir(args);
      const subcommand = args.find((arg) => !arg.startsWith('--')) || 'help';

      this.printHeader('Symbol Query');

      // Build symbol index
      this.printInfo('Building symbol index...');
      await this.buildIndex(docsDir);
      console.log();

      // Execute subcommand
      switch (subcommand) {
        case 'list':
          return this.listSymbols(args);
        case 'search':
          return this.searchSymbols(args);
        case 'info':
          return this.showSymbolInfo(args);
        case 'backlinks':
          return this.showBacklinks(args);
        case 'similar':
          return this.findSimilar(args);
        case 'stats':
          return this.showStats();
        case 'help':
        default:
          return this.showHelp();
      }
    });
  }

  /**
   * Build symbol index from documentation
   */
  private async buildIndex(docsDir: string): Promise<void> {
    const files = this.findMarkdownFiles(docsDir);

    for (const filePath of files) {
      try {
        const parsed = this.parser.parse(filePath);
        if (parsed) {
          this.indexDocument(parsed);
        }
      } catch (error) {
        // Skip files with errors
      }
    }

    this.printSuccess(`Indexed ${this.symbols.size} symbols from ${files.length} documents`);
  }

  /**
   * Index a parsed document
   */
  private indexDocument(parsed: ParsedDocSymbols): void {
    // Index primary definition
    if (parsed.primary) {
      const info = this.getOrCreateSymbolInfo(parsed.primary.name);

      // Read context around the definition
      const content = this.readLineContext(parsed.filePath, parsed.primary.line, 5);

      info.primary = {
        filePath: parsed.filePath,
        line: parsed.primary.line,
        content,
      };

      if (parsed.sourceFilePath) {
        info.sourceFilePath = parsed.sourceFilePath;
      }
    }

    // Index auxiliaries
    for (const aux of parsed.auxiliaries) {
      const info = this.getOrCreateSymbolInfo(aux.name);
      info.auxiliaries.push({
        filePath: parsed.filePath,
        line: aux.line,
        level: aux.level,
      });
    }

    // Index references
    for (const ref of parsed.references) {
      const info = this.getOrCreateSymbolInfo(ref.name);
      const context = this.readLine(parsed.filePath, ref.line).trim();
      info.references.push({
        filePath: parsed.filePath,
        line: ref.line,
        context,
      });
    }
  }

  /**
   * Get or create symbol info
   */
  private getOrCreateSymbolInfo(name: string): SymbolInfo {
    if (!this.symbols.has(name)) {
      this.symbols.set(name, {
        name,
        auxiliaries: [],
        references: [],
      });
    }
    return this.symbols.get(name)!;
  }

  /**
   * List all symbols
   */
  private listSymbols(args: string[]): CommandResult {
    const showAll = args.includes('--all');
    const pattern = args.find((arg) => arg.startsWith('--pattern='))?.split('=')[1];

    this.printSection('Symbol List');

    let symbols = Array.from(this.symbols.entries());

    // Filter by pattern
    if (pattern) {
      const regex = new RegExp(pattern, 'i');
      symbols = symbols.filter(([name]) => regex.test(name));
    }

    // Filter out symbols without primary (unless --all)
    if (!showAll) {
      symbols = symbols.filter(([, info]) => info.primary);
    }

    // Sort by name
    symbols.sort(([a], [b]) => a.localeCompare(b));

    if (symbols.length === 0) {
      this.printWarning('No symbols found');
      return this.success();
    }

    for (const [name, info] of symbols) {
      const status = info.primary ? '✅' : '❌';
      const refCount = info.references.length;
      const auxCount = info.auxiliaries.length;

      console.log(`  ${status} [[${name}]]`);

      if (info.primary) {
        console.log(`     ${this.colors.dim}${this.relativePath(info.primary.filePath)}:${info.primary.line}${this.colors.reset}`);
      } else {
        console.log(`     ${this.colors.red}No primary definition${this.colors.reset}`);
      }

      console.log(`     ${this.colors.dim}${refCount} refs, ${auxCount} aux${this.colors.reset}`);
      console.log();
    }

    console.log(`${this.colors.dim}Total: ${symbols.length} symbols${this.colors.reset}`);
    console.log();

    return this.success();
  }

  /**
   * Search symbols by name
   */
  private searchSymbols(args: string[]): CommandResult {
    const query = args.find((arg) => !arg.startsWith('--') && arg !== 'search');

    if (!query) {
      this.printError('Usage: symbol-query search <pattern>');
      return this.failure('Missing search query');
    }

    this.printSection(`Search: "${query}"`);

    const regex = new RegExp(query, 'i');
    const matches = Array.from(this.symbols.entries()).filter(([name]) => regex.test(name));

    if (matches.length === 0) {
      this.printWarning('No matches found');
      return this.success();
    }

    for (const [name, info] of matches) {
      const status = info.primary ? '✅' : '❌';
      console.log(`  ${status} [[${name}]]`);

      if (info.primary) {
        console.log(`     ${this.relativePath(info.primary.filePath)}:${info.primary.line}`);
      }

      console.log();
    }

    console.log(`${this.colors.dim}Found ${matches.length} matches${this.colors.reset}`);
    console.log();

    return this.success();
  }

  /**
   * Show detailed symbol information
   */
  private showSymbolInfo(args: string[]): CommandResult {
    const symbolName = args.find((arg) => !arg.startsWith('--') && arg !== 'info');

    if (!symbolName) {
      this.printError('Usage: symbol-query info <symbol-name>');
      return this.failure('Missing symbol name');
    }

    const info = this.symbols.get(symbolName);

    if (!info) {
      this.printError(`Symbol [[${symbolName}]] not found`);

      // Suggest similar symbols
      const similar = this.findSimilarSymbols(symbolName, 3);
      if (similar.length > 0) {
        console.log();
        this.printInfo('Did you mean:');
        for (const sim of similar) {
          console.log(`  - [[${sim}]]`);
        }
      }

      return this.failure('Symbol not found');
    }

    this.printSection(`Symbol: [[${info.name}]]`);

    // Primary definition
    if (info.primary) {
      console.log(`${this.colors.green}✅ Primary Definition (H1):${this.colors.reset}`);
      console.log(`   File: ${this.relativePath(info.primary.filePath)}:${info.primary.line}`);
      if (info.sourceFilePath) {
        console.log(`   Source: ${this.colors.cyan}${info.sourceFilePath}${this.colors.reset}`);
      }
      console.log();
      console.log(`   ${this.colors.dim}${info.primary.content}${this.colors.reset}`);
      console.log();
    } else {
      console.log(`${this.colors.red}❌ No primary definition${this.colors.reset}`);
      console.log();
    }

    // Auxiliaries
    if (info.auxiliaries.length > 0) {
      console.log(`${this.colors.yellow}Auxiliary Definitions (H${info.auxiliaries[0].level}):${this.colors.reset} ${info.auxiliaries.length}`);
      for (const aux of info.auxiliaries) {
        console.log(`   - ${this.relativePath(aux.filePath)}:${aux.line}`);
      }
      console.log();
    }

    // References
    if (info.references.length > 0) {
      const showAll = args.includes('--all');
      const maxRefs = showAll ? info.references.length : 10;

      console.log(`${this.colors.cyan}References:${this.colors.reset} ${info.references.length}`);

      // Group by file
      const byFile = new Map<string, typeof info.references>();
      for (const ref of info.references) {
        if (!byFile.has(ref.filePath)) {
          byFile.set(ref.filePath, []);
        }
        byFile.get(ref.filePath)!.push(ref);
      }

      let count = 0;
      for (const [filePath, refs] of byFile.entries()) {
        if (count >= maxRefs) break;
        console.log(`   ${this.colors.dim}${this.relativePath(filePath)}${this.colors.reset}`);
        for (const ref of refs) {
          if (count >= maxRefs) break;
          console.log(`      L${ref.line}: ${ref.context.substring(0, 80)}...`);
          count++;
        }
      }

      if (info.references.length > maxRefs) {
        console.log(`   ${this.colors.dim}... and ${info.references.length - maxRefs} more (use --all to show all)${this.colors.reset}`);
      }
      console.log();
    } else {
      console.log(`${this.colors.yellow}⚠️  No references found${this.colors.reset}`);
      console.log();
    }

    return this.success();
  }

  /**
   * Show backlinks (documents that reference this symbol)
   */
  private showBacklinks(args: string[]): CommandResult {
    const symbolName = args.find((arg) => !arg.startsWith('--') && arg !== 'backlinks');

    if (!symbolName) {
      this.printError('Usage: symbol-query backlinks <symbol-name>');
      return this.failure('Missing symbol name');
    }

    const info = this.symbols.get(symbolName);

    if (!info) {
      this.printError(`Symbol [[${symbolName}]] not found`);
      return this.failure('Symbol not found');
    }

    this.printSection(`Backlinks: [[${symbolName}]]`);

    // Collect all files that reference this symbol
    const files = new Set<string>();

    for (const ref of info.references) {
      files.add(ref.filePath);
    }

    for (const aux of info.auxiliaries) {
      files.add(aux.filePath);
    }

    if (files.size === 0) {
      this.printWarning('No backlinks found');
      return this.success();
    }

    console.log(`Found ${files.size} documents:\n`);

    for (const filePath of Array.from(files).sort()) {
      const refs = info.references.filter((r) => r.filePath === filePath);
      const auxs = info.auxiliaries.filter((a) => a.filePath === filePath);

      console.log(`  📄 ${this.relativePath(filePath)}`);

      if (auxs.length > 0) {
        console.log(`     ${this.colors.yellow}${auxs.length} auxiliary def(s)${this.colors.reset}`);
      }

      if (refs.length > 0) {
        console.log(`     ${this.colors.cyan}${refs.length} reference(s)${this.colors.reset}`);
      }

      console.log();
    }

    return this.success();
  }

  /**
   * Find similar symbols
   */
  private findSimilar(args: string[]): CommandResult {
    const symbolName = args.find((arg) => !arg.startsWith('--') && arg !== 'similar');

    if (!symbolName) {
      this.printError('Usage: symbol-query similar <symbol-name>');
      return this.failure('Missing symbol name');
    }

    this.printSection(`Similar to: "${symbolName}"`);

    const similar = this.findSimilarSymbols(symbolName, 10);

    if (similar.length === 0) {
      this.printWarning('No similar symbols found');
      return this.success();
    }

    for (const name of similar) {
      const info = this.symbols.get(name)!;
      const status = info.primary ? '✅' : '❌';

      console.log(`  ${status} [[${name}]]`);

      if (info.primary) {
        console.log(`     ${this.colors.dim}${this.relativePath(info.primary.filePath)}:${info.primary.line}${this.colors.reset}`);
      }

      console.log();
    }

    return this.success();
  }

  /**
   * Show statistics
   */
  private showStats(): CommandResult {
    this.printSection('Symbol Statistics');

    const withPrimary = Array.from(this.symbols.values()).filter((info) => info.primary).length;
    const withoutPrimary = this.symbols.size - withPrimary;

    let totalRefs = 0;
    let totalAux = 0;

    for (const info of this.symbols.values()) {
      totalRefs += info.references.length;
      totalAux += info.auxiliaries.length;
    }

    console.log(`  Total symbols: ${this.colors.cyan}${this.symbols.size}${this.colors.reset}`);
    console.log(`  With primary: ${this.colors.green}${withPrimary}${this.colors.reset}`);
    console.log(`  Without primary: ${this.colors.red}${withoutPrimary}${this.colors.reset}`);
    console.log(`  Total references: ${this.colors.cyan}${totalRefs}${this.colors.reset}`);
    console.log(`  Total auxiliaries: ${this.colors.yellow}${totalAux}${this.colors.reset}`);
    console.log(`  Avg references per symbol: ${this.colors.cyan}${(totalRefs / this.symbols.size).toFixed(1)}${this.colors.reset}`);
    console.log();

    return this.success();
  }

  /**
   * Show help
   */
  private showHelp(): CommandResult {
    console.log('Usage: symbol-query <subcommand> [options]\n');
    console.log('Subcommands:');
    console.log('  list              List all symbols');
    console.log('    --all             Include symbols without primary');
    console.log('    --pattern=REGEX   Filter by pattern');
    console.log();
    console.log('  search <query>    Search symbols by name');
    console.log();
    console.log('  info <symbol>     Show detailed symbol information');
    console.log('    --all             Show all references');
    console.log();
    console.log('  backlinks <symbol> Show documents that reference the symbol');
    console.log();
    console.log('  similar <symbol>  Find symbols with similar names');
    console.log();
    console.log('  stats             Show symbol statistics');
    console.log();
    console.log('Examples:');
    console.log('  symbol-query list --pattern="Command"');
    console.log('  symbol-query search "Build"');
    console.log('  symbol-query info "BuildCommand"');
    console.log('  symbol-query backlinks "BuildCommand"');
    console.log('  symbol-query similar "BuildComand"');
    console.log();

    return this.success();
  }

  /**
   * Find similar symbol names
   */
  private findSimilarSymbols(target: string, maxResults: number): string[] {
    const normalized = this.normalizeSymbolName(target);
    const results: Array<{ name: string; score: number }> = [];

    for (const name of this.symbols.keys()) {
      const symNormalized = this.normalizeSymbolName(name);

      // Skip exact match
      if (name === target) continue;

      // Calculate similarity score
      let score = 0;

      // Substring match
      if (symNormalized.includes(normalized) || normalized.includes(symNormalized)) {
        score += 50;
      }

      // Levenshtein distance
      const distance = this.levenshteinDistance(normalized, symNormalized);
      score += Math.max(0, 20 - distance * 2);

      // Word overlap
      const targetWords = new Set(normalized.split(/[-\s]/));
      const symWords = new Set(symNormalized.split(/[-\s]/));
      const overlap = Array.from(targetWords).filter((w) => symWords.has(w)).length;
      score += overlap * 10;

      if (score > 10) {
        results.push({ name, score });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map((r) => r.name);
  }

  /**
   * Normalize symbol name for comparison
   */
  private normalizeSymbolName(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Find docs directory from args
   * Uses --dir=<path> flag, defaults to 'managed'
   */
  private findDocsDir(args: string[]): string {
    const dirArg = args.find((arg) => arg.startsWith('--dir='));
    if (dirArg) {
      return dirArg.split('=')[1];
    }
    return 'managed';
  }

  /**
   * Find markdown files recursively
   */
  private findMarkdownFiles(dir: string): string[] {
    const files: string[] = [];

    if (!fs.existsSync(dir)) {
      return files;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        files.push(...this.findMarkdownFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Read a single line from file
   */
  private readLine(filePath: string, lineNum: number): string {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      return lines[lineNum - 1] || '';
    } catch {
      return '';
    }
  }

  /**
   * Read context around a line
   */
  private readLineContext(filePath: string, lineNum: number, contextLines: number): string {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const start = Math.max(0, lineNum - contextLines);
      const end = Math.min(lines.length, lineNum + contextLines);
      return lines.slice(start, end).join('\n');
    } catch {
      return '';
    }
  }

  /**
   * Get relative path
   */
  private relativePath(filePath: string): string {
    return path.relative(process.cwd(), filePath);
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
