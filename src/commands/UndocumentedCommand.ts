/**
 * Undocumented Command - Find undocumented symbols
 * @packageDocumentation
 */

import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { DatabaseManager, type SymbolRow } from '../storage/DatabaseManager';
import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import { SymbolSearchEngine } from '../graph/SymbolSearchEngine';
import type { Symbol } from '../types/graph/graph';
import type { SymbolType } from '../types/graph';

/**
 * Command for finding undocumented symbols
 *
 * @public
 * @responsibility Find symbols without documentation
 * @contract Loads database, builds graph, finds undocumented symbols
 * @doc [[UndocumentedCommand]]
 * @doc [[CLI Commands#undocumented]]
 *
 * @problem Need to identify symbols lacking documentation
 * @solves Searches for symbols without summary or TSDoc
 * @context Part of documentation quality assurance
 *
 * @functionality
 * - Database loading: Read all symbols from database
 * - Graph building: Construct symbol graph for analysis
 * - Search filtering: Use SymbolSearchEngine to find undocumented
 * - Detailed display: Show symbol type and location
 * - Quality metric: Helps improve documentation coverage
 *
 * @decision Use SymbolSearchEngine for undocumented search
 * @rationale SearchEngine has built-in undocumented filter
 * @consequences Requires database to be built first
 *
 * @depends DatabaseManager, SymbolGraphBuilder, SymbolSearchEngine
 * @depType internal
 * @depReason Symbol data and search capabilities
 */
export class UndocumentedCommand extends BaseCommand {
  private dbManager?: DatabaseManager;

  constructor(dbManager?: DatabaseManager) {
    super();
    this.dbManager = dbManager;
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'undocumented';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Find undocumented symbols';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge undocumented [options]

  Options:
    --exclude-tests  Exclude symbols from test files (__tests__, .test.ts, .spec.ts)`;
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

      const excludeTests = args.includes('--exclude-tests');

      this.printHeader('Undocumented Symbols');

      if (excludeTests) {
        console.log(`${colors.dim}Excluding test files${colors.reset}`);
        console.log();
      }

      if (!this.dbManager) {
        const dbCheck = this.checkDatabaseExists();
        if (dbCheck) return dbCheck;
      }

      const dbPath = this.getDatabasePath();
      const jsonlPath = this.getJsonlPath();
      const dbManager = this.dbManager || new DatabaseManager(dbPath, jsonlPath);

      try {
        // Get all symbols from database
        const { symbols: rows } = dbManager.getGraphData();

        // Build symbol graph
        const graphBuilder = new SymbolGraphBuilder();

        for (const row of rows) {
          const symbol: Symbol = {
            id: row.id,
            name: row.name,
            type: row.type as SymbolType,
            filePath: row.file_path,
            line: row.line,
            column: row.column,
            isExported: row.is_exported === 1,
            isPublic: row.is_public === 1,
            summary: row.summary ?? undefined,
            tests: [],
            designDecisions: [],
          };
          graphBuilder.addSymbol(symbol);
        }

        // Search for undocumented symbols
        const searchEngine = new SymbolSearchEngine(graphBuilder);
        let undocumented = searchEngine.findUndocumented();

        // Filter out test files if requested
        if (excludeTests) {
          undocumented = undocumented.filter(s =>
            !s.filePath.includes('__tests__') &&
            !s.filePath.includes('.test.') &&
            !s.filePath.includes('.spec.')
          );
        }

        if (undocumented.length === 0) {
          this.printSuccess('All symbols are documented!');
          console.log();
        } else {
          console.log(`${colors.yellow}Found ${undocumented.length} undocumented symbols:${colors.reset}`);
          console.log();

          for (const symbol of undocumented) {
            console.log(`${colors.bold}${symbol.id}${colors.reset} → ${symbol.name} (${symbol.type})`);
            console.log(`  Location: ${symbol.filePath}:${symbol.line}`);
            console.log();
          }
        }

        return this.success();
      } finally {
        if (!this.dbManager) {
          dbManager.close();
        }
      }
    });
  }
}

/**
 * Command for displaying symbol hierarchy tree
 *
 * @public
 * @responsibility Display symbol hierarchy as tree structure
 * @contract Reads registry, builds hierarchy, displays tree
 * @doc [[TreeCommand]]
 * @doc [[CLI Commands#tree]]
 *
 * @problem Need to visualize symbol relationships as tree
 * @solves Displays hierarchical tree with symbols and their children
 * @context Part of symbol visualization system
 *
 * @functionality
 * - Hierarchy building: Build tree from registry data
 * - Recursive display: Print nested tree structure
 * - Color coding: Different colors for different symbol types
 * - Tree formatting: ASCII tree connectors (├── └──)
 * - Symbol count: Total symbols in registry
 *
 * @decision Use SymbolRegistryManager for hierarchy data
 * @rationale Registry already has hierarchy structure
 * @consequences Requires registry to be built first
 *
 * @depends SymbolRegistryManager
 * @depType internal
 * @depReason Hierarchy data storage
 */
