/**
 * Coverage Report command - Reports @doc tag coverage for SSOT validation
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';
import { TSDocParser } from '../parser/TSDocParser';
import type { Symbol } from '../types/graph/graph';

/**
 * Coverage statistics for a symbol category
 */
interface CategoryCoverage {
  total: number;
  documented: number;
  coverage: number;
}

/**
 * Complete coverage report
 */
interface CoverageReport {
  overall: CategoryCoverage;
  byCategory: {
    commands: CategoryCoverage;
    analyzers: CategoryCoverage;
    types: CategoryCoverage;
    utilities: CategoryCoverage;
  };
  undocumentedSymbols: Array<{
    name: string;
    type: string;
    filePath: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

/**
 * Command for reporting @doc tag coverage
 *
 * @public
 * @responsibility Report real SSOT coverage based on @doc tags
 * @contract Calculate and display coverage metrics for documentation
 *
 * @problem Current explore-entrypoint metric is misleading (9.2% but actually much higher)
 * @solves Measures actual @doc tag coverage in code (code → docs direction)
 * @context Phase 1 of SSOT improvement plan - fix coverage metric
 *
 * @functionality
 * - Symbol analysis: Read all symbols from database
 * - @doc tag detection: Parse source files to check for @doc tags
 * - Categorization: Group by symbol type (commands, analyzers, types, utilities)
 * - Priority ranking: Highlight high-priority undocumented symbols
 * - Report generation: Display coverage statistics and recommendations
 *
 * @decision Measure @doc tag presence, not .md traversal
 * @rationale @doc tags show code→docs links (SSOT direction), .md traversal only shows docs→docs
 * @consequences Reveals true documentation status, not navigation completeness
 *
 * @depends DatabaseManager, TSDocParser
 * @depType internal
 * @depReason Need symbol data and TSDoc parsing
 *
 * @doc [[Coverage Report Command]]
 */
export class CoverageReportCommand extends BaseCommand {
  private db: DatabaseManager;
  private parser: TSDocParser;

  constructor(db?: DatabaseManager) {
    super();
    this.db = db || new DatabaseManager();
    this.parser = new TSDocParser();
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'coverage-report';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Report @doc tag coverage for SSOT validation';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge coverage-report [options]

  Options:
    --json               Output as JSON
    --filter=public      Show only public symbols
    --hierarchical       Group by file hierarchy`;
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

      const jsonOutput = args.includes('--json');
      const filterPublic = args.includes('--filter=public');
      const hierarchical = args.includes('--hierarchical');

      if (!jsonOutput) {
        this.printHeader('SSOT Coverage Report');
      }

      // 1. Get all symbols from DB
      const allSymbols = await this.getAllSymbols();

      if (allSymbols.length === 0) {
        this.printError('No symbols found in database');
        this.printInfo('Run: tsdoc-edge build src');
        return this.failure('No symbols in database');
      }

      // 2. Filter if requested
      const symbols = filterPublic
        ? allSymbols.filter((s) => this.isPublicAPI(s))
        : allSymbols;

      // 3. Check coverage
      const report = hierarchical
        ? await this.generateHierarchicalReport(symbols)
        : await this.generateReport(symbols);

      // 4. Output
      if (jsonOutput) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        this.displayReport(report, hierarchical);
      }

      // Close database connection
      this.db.close();

      return this.success();
    });
  }

  /**
   * Get all symbols from database
   */
  private async getAllSymbols(): Promise<Symbol[]> {
    try {
      return await this.db.getAllSymbols();
    } catch (error) {
      // If database doesn't exist or method not available, return empty
      return [];
    }
  }

  /**
   * Check if symbol is public API (high priority)
   */
  private isPublicAPI(symbol: Symbol): boolean {
    const { filePath, type } = symbol;

    // Commands are always public
    if (filePath.includes('/commands/') && type === 'class') {
      return true;
    }

    // Analyzers are public
    if (filePath.includes('/analyzer/') && type === 'class') {
      return true;
    }

    // Core types are public
    if (filePath.includes('/types/') && type === 'interface') {
      return true;
    }

    // Exported classes/interfaces are likely public
    if ((type === 'class' || type === 'interface') && !filePath.includes('/__tests__/')) {
      return true;
    }

    return false;
  }

  /**
   * Categorize symbol by file path
   */
  private categorizeSymbol(symbol: Symbol): keyof CoverageReport['byCategory'] {
    if (symbol.filePath.includes('/commands/')) return 'commands';
    if (symbol.filePath.includes('/analyzer/')) return 'analyzers';
    if (symbol.filePath.includes('/types/')) return 'types';
    return 'utilities';
  }

  /**
   * Get priority for undocumented symbol
   */
  private getPriority(symbol: Symbol): 'high' | 'medium' | 'low' {
    if (this.isPublicAPI(symbol)) return 'high';
    if (symbol.type === 'function' || symbol.type === 'class') return 'medium';
    return 'low';
  }

  /**
   * Check if symbol has @doc tag
   */
  private async hasDocTag(symbol: Symbol): Promise<boolean> {
    try {
      const fullPath = path.resolve(symbol.filePath);

      if (!fs.existsSync(fullPath)) {
        return false;
      }

      const source = fs.readFileSync(fullPath, 'utf-8');

      // Parse TSDoc comments
      const parsed = this.parser.parseFile(fullPath, source);

      // Check if any comment for this symbol has @doc tag
      for (const comment of parsed.comments) {
        if (comment.symbolName === symbol.name) {
          // Check for @doc tag in the comment
          const docComment = comment.docComment;
          const customBlocks = docComment.customBlocks;

          for (const block of customBlocks) {
            if (block.blockTag.tagName === '@doc') {
              return true;
            }
          }
        }
      }

      return false;
    } catch (error) {
      // If parsing fails, assume no doc tag
      return false;
    }
  }

  /**
   * Generate coverage report
   */
  private async generateReport(symbols: Symbol[]): Promise<CoverageReport> {
    const byCategory = {
      commands: { total: 0, documented: 0, coverage: 0 },
      analyzers: { total: 0, documented: 0, coverage: 0 },
      types: { total: 0, documented: 0, coverage: 0 },
      utilities: { total: 0, documented: 0, coverage: 0 },
    };

    const undocumentedSymbols: CoverageReport['undocumentedSymbols'] = [];

    let totalDocumented = 0;

    for (const symbol of symbols) {
      const hasDoc = await this.hasDocTag(symbol);
      const category = this.categorizeSymbol(symbol);

      byCategory[category].total++;

      if (hasDoc) {
        byCategory[category].documented++;
        totalDocumented++;
      } else {
        undocumentedSymbols.push({
          name: symbol.name,
          type: symbol.type,
          filePath: symbol.filePath,
          priority: this.getPriority(symbol),
        });
      }
    }

    // Calculate percentages
    for (const cat of Object.keys(byCategory) as Array<keyof typeof byCategory>) {
      const { total, documented } = byCategory[cat];
      byCategory[cat].coverage = total > 0 ? (documented / total) * 100 : 0;
    }

    // Sort undocumented by priority
    undocumentedSymbols.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return {
      overall: {
        total: symbols.length,
        documented: totalDocumented,
        coverage: symbols.length > 0 ? (totalDocumented / symbols.length) * 100 : 0,
      },
      byCategory,
      undocumentedSymbols,
    };
  }

  /**
   * Generate hierarchical coverage report (file-level connections)
   */
  private async generateHierarchicalReport(symbols: Symbol[]): Promise<CoverageReport> {
    // Load code connections from doc-symbols.json
    const connectedFiles = await this.getFilesWithCodeConnections();

    const byCategory = {
      commands: { total: 0, documented: 0, coverage: 0 },
      analyzers: { total: 0, documented: 0, coverage: 0 },
      types: { total: 0, documented: 0, coverage: 0 },
      utilities: { total: 0, documented: 0, coverage: 0 },
    };

    const undocumentedSymbols: CoverageReport['undocumentedSymbols'] = [];
    let totalDocumented = 0;

    for (const symbol of symbols) {
      const category = this.categorizeSymbol(symbol);
      byCategory[category].total++;

      // Check if symbol's file is in connected files
      const isConnected = connectedFiles.some((f) => symbol.filePath.includes(f));

      if (isConnected) {
        byCategory[category].documented++;
        totalDocumented++;
      } else {
        undocumentedSymbols.push({
          name: symbol.name,
          type: symbol.type,
          filePath: symbol.filePath,
          priority: this.getPriority(symbol),
        });
      }
    }

    // Calculate percentages
    for (const cat of Object.keys(byCategory) as Array<keyof typeof byCategory>) {
      const { total, documented } = byCategory[cat];
      byCategory[cat].coverage = total > 0 ? (documented / total) * 100 : 0;
    }

    // Sort undocumented by priority
    undocumentedSymbols.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return {
      overall: {
        total: symbols.length,
        documented: totalDocumented,
        coverage: symbols.length > 0 ? (totalDocumented / symbols.length) * 100 : 0,
      },
      byCategory,
      undocumentedSymbols,
    };
  }

  /**
   * Get files with code connections from doc-symbols.json
   */
  private async getFilesWithCodeConnections(): Promise<string[]> {
    try {
      const docSymbolsPath = path.join('.tsdoc', 'doc-symbols.json');
      if (!fs.existsSync(docSymbolsPath)) {
        return [];
      }

      const content = fs.readFileSync(docSymbolsPath, 'utf-8');
      const data = JSON.parse(content);

      const files: string[] = [];

      // Extract file paths from codeConnections
      const connections = data.registryData?.codeConnections || {};
      for (const [_symbol, connArray] of Object.entries(connections)) {
        const conns = (connArray as unknown as Array<unknown>)[1] || [];
        const connList = Array.isArray(conns) ? conns : [];
        for (const conn of connList) {
          const typedConn = conn as { filePath?: string };
          if (typedConn.filePath) {
            // Convert absolute path to relative
            const relativePath = typedConn.filePath.replace(/.*\/tsdoc-edge\//, '');
            if (!files.includes(relativePath)) {
              files.push(relativePath);
            }
          }
        }
      }

      return files;
    } catch (error) {
      return [];
    }
  }

  /**
   * Display coverage report
   */
  private displayReport(report: CoverageReport, hierarchical = false): void {
    const { overall, byCategory, undocumentedSymbols } = report;

    // Overall coverage
    this.printSection(hierarchical ? 'Overall Coverage (Hierarchical)' : 'Overall Coverage');
    console.log(`  Total symbols: ${overall.total}`);
    console.log(`  Documented (${hierarchical ? 'file-level' : '@doc tag'}): ${overall.documented}`);

    const coverageColor = overall.coverage >= 50 ? colors.green : overall.coverage >= 30 ? colors.yellow : colors.red;
    console.log(`  Coverage: ${coverageColor}${overall.coverage.toFixed(1)}%${colors.reset}`);
    console.log();

    // By category
    this.printSection('Coverage by Category');
    for (const [category, stats] of Object.entries(byCategory)) {
      const catColor = stats.coverage >= 80 ? colors.green : stats.coverage >= 50 ? colors.yellow : colors.red;
      console.log(
        `  ${category.padEnd(15)}: ${stats.documented.toString().padStart(3)} / ${stats.total.toString().padStart(3)} (${catColor}${stats.coverage.toFixed(1)}%${colors.reset})`
      );
    }
    console.log();

    // Recommendations
    this.printSection('Recommendations');

    const highPriority = undocumentedSymbols.filter((s) => s.priority === 'high');

    if (highPriority.length === 0) {
      this.printSuccess('All high-priority symbols documented!');
    } else {
      this.printWarning(`${highPriority.length} high-priority symbols need @doc tags`);
      console.log();
      console.log('  Top 20 high-priority undocumented symbols:');
      highPriority.slice(0, 20).forEach((s) => {
        console.log(`    ${colors.dim}- ${s.name} (${s.type}) in ${s.filePath}${colors.reset}`);
      });
    }
    console.log();

    // Next steps
    this.printSection('Next Steps');
    if (hierarchical) {
      console.log('  Hierarchical mode: File-level connections cascade to all symbols');
      console.log();
      if (overall.coverage < 50) {
        console.log('  1. Add more code connections in documentation');
        console.log('  2. Target: 50%+ overall coverage (file-level)');
        console.log('  3. Consider adding @doc tags for explicit coverage');
      } else {
        this.printSuccess('Hierarchical coverage target met!');
        console.log('  - Maintain file-level connections');
        console.log('  - Consider explicit @doc tags for critical symbols');
      }
    } else {
      if (overall.coverage < 50) {
        console.log('  1. Add @doc tags to high-priority symbols (commands, analyzers, types)');
        console.log('  2. Target: 50%+ overall coverage');
        console.log('  3. Goal: 100% public API coverage');
        console.log();
        console.log('  Example:');
        console.log('    /**');
        console.log('     * Call graph analyzer');
        console.log('     *');
        console.log('     * @doc [[CallGraphAnalyzer]]');
        console.log('     * @doc [[Call Relationships]]');
        console.log('     * @public');
        console.log('     */');
      } else {
        this.printSuccess('Coverage target met! Continue improving.');
        console.log('  - Maintain 50%+ coverage');
        console.log('  - Document remaining public APIs');
        console.log('  - Consider CI/CD enforcement');
      }
    }
    console.log();
  }
}
