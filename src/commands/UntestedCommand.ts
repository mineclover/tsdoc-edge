/**
 * UntestedCommand - Find symbols without test coverage
 * @packageDocumentation
 */

import { BaseCommand, colors, type CommandResult } from './BaseCommand';
import { DatabaseManager, type SymbolRow } from '../storage/DatabaseManager';
import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import { SymbolSearchEngine } from '../graph/SymbolSearchEngine';
import type { Symbol } from '../types/graph/graph';
import type { SymbolType } from '../types/graph';

/**
 * UntestedCommand - Find symbols without test coverage
 *
 * Searches the database for symbols that don't have associated tests.
 * Helps identify gaps in test coverage and improve code quality.
 *
 * @doc [[UntestedCommand]]
 * @public
 */
export class UntestedCommand extends BaseCommand {
  private dbManager?: DatabaseManager;
  private graphBuilder?: SymbolGraphBuilder;

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'untested';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Find symbols without test coverage';
  }

  protected getUsage(): string {
    return 'tsdoc-edge untested';
  }

  /**
   * execute method
   * @param _args - _args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(_args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(_args)) {
        return this.displayHelp();
      }

      console.log(`${colors.bold}Untested Symbols${colors.reset}`);
      console.log();

      if (!this.dbManager) {
        const dbCheck = this.checkDatabaseExists();
        if (dbCheck) return dbCheck;
      }

      const dbPath = this.getDatabasePath();
      const jsonlPath = this.getJsonlPath();
      const dbManager = this.dbManager || new DatabaseManager(dbPath, jsonlPath);

      try {
        const rows = dbManager.getAllSymbolRows();

        const graphBuilder = this.graphBuilder || new SymbolGraphBuilder();

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

        const searchEngine = new SymbolSearchEngine(graphBuilder);
        const untested = searchEngine.findUntested();

        if (untested.length === 0) {
          console.log(`${colors.green}✅ All symbols have tests!${colors.reset}`);
          console.log();
        } else {
          console.log(`${colors.yellow}Found ${untested.length} untested symbols:${colors.reset}`);
          console.log();

          for (const symbol of untested) {
            console.log(`${colors.bold}${symbol.id}${colors.reset} → ${symbol.name} (${symbol.type})`);
            console.log(`  Location: ${symbol.filePath}:${symbol.line}`);
            console.log();
          }
        }

        return {
          exitCode: 0,
          message: `Found ${untested.length} untested symbols`,
        };
      } finally {
        if (!this.dbManager) {
          dbManager.close();
        }
      }
    });
  }
}
