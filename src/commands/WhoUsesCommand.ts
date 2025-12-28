/**
 * Who Uses Command - Show who uses a symbol
 * @packageDocumentation
 */

import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { DatabaseManager, type SymbolRow } from '../storage/DatabaseManager';

/**
 * Command for showing who uses a symbol (database-driven)
 *
 * @public
 * @responsibility Show reverse dependencies from database (by name)
 * @contract Searches database by name, builds graph, displays dependents
 * @doc [[WhoUsesCommand]]
 * @doc [[CLI Commands#who-uses]]
 *
 * @problem Need to find all usages of a symbol by its name
 * @solves Searches database by symbol name and shows all dependents
 * @context Part of database-driven symbol analysis
 *
 * @functionality
 * - Name-based search: Find symbols by name (exact or prefix)
 * - Multiple matches: Handle and display all matching symbols
 * - Dependent analysis: Find all symbols that depend on each match
 * - File grouping: Group dependents by file for clarity
 * - Export status: Show if symbol is exported
 *
 * @decision Use DatabaseManager for name-based search
 * @rationale Database allows efficient name queries
 * @consequences Requires database to be built first
 *
 * @depends DatabaseManager
 * @depType internal
 * @depReason Symbol data and relationships
 */
export class WhoUsesCommand extends BaseCommand {
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
    return 'who-uses';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Show who uses a symbol (database)';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return 'tsdoc-edge who-uses <symbol-name>';
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

      const symbolName = args[0];
      if (!symbolName) {
        this.printError('Usage: tsdoc-edge who-uses <symbol-name>');
        console.log();
        console.log('Examples:');
        this.printInfo('  tsdoc-edge who-uses DocumentationAnalyzer');
        this.printInfo('  tsdoc-edge who-uses TSDocParser');
        this.printInfo('  tsdoc-edge who-uses DatabaseManager');
        console.log();
        return this.failure('Symbol name required');
      }

      if (!this.dbManager) {
        const dbCheck = this.checkDatabaseExists();
        if (dbCheck) return dbCheck;
      }

      const dbPath = this.getDatabasePath();
      const jsonlPath = this.getJsonlPath();
      const dbManager = this.dbManager || new DatabaseManager(dbPath, jsonlPath);

      try {
        // Find symbols matching the name
        let symbols = dbManager.findSymbolsByNamePattern(symbolName);

        if (symbols.length === 0) {
          this.printError(`Symbol not found: ${symbolName}`);
          console.log();
          console.log('Tip: Try searching for the symbol first:');
          this.printInfo(
            `  sqlite3 .tsdoc/symbols.db "SELECT name, file_path FROM symbols WHERE name LIKE '%${symbolName}%'"`
          );
          console.log();
          return this.failure(`Symbol not found: ${symbolName}`);
        }

        // Auto-select if exact name match with primary type (class, interface, function, type)
        if (symbols.length > 1) {
          const primaryMatch = symbols.find(s =>
            s.name.toLowerCase() === symbolName.toLowerCase() &&
            ['class', 'interface', 'function', 'type'].includes(s.type)
          );

          if (primaryMatch) {
            console.log(`${colors.dim}Selected: ${primaryMatch.name} (${primaryMatch.type})${colors.reset}`);
            console.log();
            symbols = [primaryMatch];
          } else {
            // Show all matches and let user choose
            console.log(`${colors.cyan}Found ${symbols.length} symbols matching "${symbolName}":${colors.reset}`);
            console.log();
            for (const sym of symbols.slice(0, 15)) {
              console.log(`  • ${sym.name} (${sym.type}) in ${sym.file_path}`);
            }
            if (symbols.length > 15) {
              console.log(`  ... and ${symbols.length - 15} more`);
            }
            console.log();
            console.log('Use a more specific name or the full symbol ID.');
            return this.success();
          }
        }

        // Analyze selected symbol(s)
        for (const symbol of symbols) {
          this.printHeader(`Who Uses: ${symbol.name}`);

          console.log(`${colors.cyan}Symbol Info:${colors.reset}`);
          console.log(`  Name: ${symbol.name}`);
          console.log(`  Type: ${symbol.type}`);
          console.log(`  File: ${symbol.file_path}:${symbol.line}`);
          console.log(`  Exported: ${symbol.is_exported ? '✅ Yes' : '❌ No'}`);
          if (symbol.summary) {
            console.log(
              `  Summary: ${symbol.summary.substring(0, 80)}${symbol.summary.length > 80 ? '...' : ''}`
            );
          }
          console.log();

          const dependents = dbManager.getDependents(symbol.id);

          if (dependents.length === 0) {
            console.log(`${colors.yellow}⚠️  Not used by any symbol${colors.reset}`);
            console.log();

            if (!symbol.is_exported) {
              console.log(
                `${colors.dim}Note: This symbol is not exported, so it can only be used within its own file.${colors.reset}`
              );
              console.log();
            }
          } else {
            console.log(`${colors.green}✅ Used by ${dependents.length} symbol(s):${colors.reset}`);
            console.log();

            // Group by file - use Drizzle ORM method
            const allSymbolRows = dbManager.getAllSymbolRows();
            const symbolRowMap = new Map(allSymbolRows.map(s => [s.id, s]));

            const byFile = new Map<string, SymbolRow[]>();
            for (const depId of dependents) {
              const depRow = symbolRowMap.get(depId);
              if (depRow) {
                const fileSymbols = byFile.get(depRow.file_path) || [];
                fileSymbols.push(depRow);
                byFile.set(depRow.file_path, fileSymbols);
              }
            }

            // Print grouped by file
            for (const [filePath, fileSymbols] of byFile.entries()) {
              console.log(`${colors.bold}📄 ${filePath}${colors.reset}`);
              for (const depSymbol of fileSymbols) {
                console.log(`   ← ${depSymbol.name} (${depSymbol.type})`);
                if (depSymbol.summary) {
                  console.log(
                    `      ${colors.dim}${depSymbol.summary.substring(0, 60)}${depSymbol.summary.length > 60 ? '...' : ''}${colors.reset}`
                  );
                }
              }
              console.log();
            }

            console.log(`${colors.cyan}Total: ${dependents.length} usage(s) across ${byFile.size} file(s)${colors.reset}`);
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
