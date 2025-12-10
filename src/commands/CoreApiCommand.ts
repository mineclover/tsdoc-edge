/**
 * Core API Command - Show core API symbols
 * @packageDocumentation
 */

import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';
import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import type { Symbol, SymbolRelationship } from '../types/graph/graph';
import type { SymbolType } from '../types/graph';

/**
 * Command for showing core API symbols
 *
 * @public
 * @responsibility Display exported symbols and their immediate dependencies
 * @contract Loads database, filters exports, computes 1-depth dependencies
 * @doc [[CoreApiCommand]]
 * @doc [[CLI Commands#core-api]]
 *
 * @problem Need to identify public API surface of codebase
 * @solves Shows all exported symbols plus their direct dependencies
 * @context Part of API documentation and boundary analysis
 *
 * @functionality
 * - Export filtering: Find all exported symbols
 * - Dependency expansion: Include 1-depth dependencies
 * - Core set computation: Exported + immediate deps
 * - Detailed display: Symbol info with export status
 * - API surface analysis: Understand public interface
 *
 * @decision Use SymbolGraphBuilder for dependency analysis
 * @rationale Graph structure efficiently computes dependencies
 * @consequences Requires database to be built first
 *
 * @depends DatabaseManager, SymbolGraphBuilder
 * @depType internal
 * @depReason Symbol graph and dependency analysis
 */
export class CoreApiCommand extends BaseCommand {
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
    return 'core-api';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Show core API symbols (exported + 1-depth dependencies)';
  }

  protected getUsage(): string {
    return 'tsdoc-edge core-api';
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

      if (!this.dbManager) {
        const dbCheck = this.checkDatabaseExists();
        if (dbCheck) return dbCheck;
      }

      const dbPath = this.getDatabasePath();
      const jsonlPath = this.getJsonlPath();
      const dbManager = this.dbManager || new DatabaseManager(dbPath, jsonlPath);

      try {
        const { symbols: symbolRows, dependencies: depRows } = dbManager.getGraphData();

        const graphBuilder = new SymbolGraphBuilder();

        // Add symbols
        for (const row of symbolRows) {
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

        // Add relationships
        for (const rel of depRows) {
          const relationship: SymbolRelationship = {
            type: (rel.type as SymbolRelationship['type']) || 'dependsOn',
            from: rel.symbol_id,
            to: rel.target,
            filePath: rel.import_path || '',
          };
          graphBuilder.addRelationship(relationship);
        }

        const allSymbols = graphBuilder.getAllSymbols();

        // Find exported symbols
        const exportedSymbols = allSymbols.filter((s) => s.isExported);

        // Collect exported + 1 depth dependencies
        const coreSymbolIds = new Set<string>();

        // Add all exported symbols
        for (const symbol of exportedSymbols) {
          coreSymbolIds.add(symbol.id);
        }

        // Add direct dependencies of exported symbols (1 depth)
        for (const symbol of exportedSymbols) {
          const deps = graphBuilder.getDependencies(symbol.id);
          for (const dep of deps) {
            coreSymbolIds.add(dep);
          }
        }

        // Get core symbols
        const coreSymbols = allSymbols.filter((s) => coreSymbolIds.has(s.id));

        this.printHeader('Core API Symbols');
        console.log(`Total exported: ${colors.green}${exportedSymbols.length}${colors.reset}`);
        console.log(`Core API size: ${colors.cyan}${coreSymbols.length}${colors.reset} (exported + 1-depth deps)`);
        console.log();

        this.printSection('Exported Symbols');
        for (const symbol of exportedSymbols) {
          console.log(`${colors.green}●${colors.reset} ${colors.bold}${symbol.name}${colors.reset} (${symbol.type})`);
          console.log(`  ${symbol.filePath}:${symbol.line}`);
          if (symbol.summary) {
            console.log(`  ${colors.dim}${symbol.summary.substring(0, 80)}...${colors.reset}`);
          }
          console.log();
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
