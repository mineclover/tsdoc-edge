/**
 * WithoutContractCommand - Find symbols without contract specification
 * @packageDocumentation
 */

import { BaseCommand, colors, type CommandResult } from './BaseCommand';
import { DatabaseManager, type SymbolRow } from '../storage/DatabaseManager';
import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import { SymbolSearchEngine } from '../graph/SymbolSearchEngine';
import type { Symbol } from '../types/graph/graph';
import type { SymbolType } from '../types/graph';

/**
 * WithoutContractCommand - Find symbols without contract specification
 *
 * Finds symbols lacking contract documentation (pre/post-conditions, invariants).
 * Essential for understanding API guarantees and constraints.
 *
 * @public
 */
export class WithoutContractCommand extends BaseCommand {
  private dbManager?: DatabaseManager;
  private graphBuilder?: SymbolGraphBuilder;

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'without-contract';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Find symbols without contract specification';
  }

  protected getUsage(): string {
    return 'tsdoc-edge without-contract';
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

      console.log(`${colors.bold}Symbols Without Contract${colors.reset}`);
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
        const withoutContract = searchEngine.findWithoutContract();

        if (withoutContract.length === 0) {
          console.log(`${colors.green}✅ All symbols have contract specifications!${colors.reset}`);
          console.log();
        } else {
          console.log(
            `${colors.yellow}Found ${withoutContract.length} symbols without contract:${colors.reset}`
          );
          console.log();

          for (const symbol of withoutContract) {
            console.log(`${colors.bold}${symbol.id}${colors.reset} → ${symbol.name} (${symbol.type})`);
            console.log(`  Location: ${symbol.filePath}:${symbol.line}`);
            console.log();
          }
        }

        return {
          exitCode: 0,
          message: `Found ${withoutContract.length} symbols without contract`,
        };
      } finally {
        if (!this.dbManager) {
          dbManager.close();
        }
      }
    });
  }
}
