/**
 * Who Uses Command - Show who uses a symbol
 * @packageDocumentation
 */

import { WhoUsesSchema } from '../output/schemas';
import type { GroupedSectionData } from '../output/types';
import { XmlBuilder } from '../output/XmlBuilder';
import { DatabaseManager } from '../storage/DatabaseManager';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

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
    return 'Show what depends on a symbol (B ← A)';
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

      const useHuman = args.includes('--human');
      const filteredArgs = args.filter((a) => !a.startsWith('--'));
      const symbolName = filteredArgs[0];
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
          const primaryMatch = symbols.find(
            (s) =>
              s.name.toLowerCase() === symbolName.toLowerCase() &&
              ['class', 'interface', 'function', 'type'].includes(s.type)
          );

          if (primaryMatch) {
            if (useHuman) {
              console.log(`Selected: ${primaryMatch.name} (${primaryMatch.type})`);
              console.log();
            }
            symbols = [primaryMatch];
          } else {
            // Show all matches and let user choose
            console.log(
              `${colors.cyan}Found ${symbols.length} symbols matching "${symbolName}":${colors.reset}`
            );
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
          // Query unified_relationships for incoming relationships
          const relationships = dbManager.queryRelationships({ symbolId: symbol.id, limit: 200 });

          // Filter for incoming relationships (where this symbol is the target)
          const incoming = relationships.filter((rel) => {
            const toSymbols = Array.isArray(rel.to) ? rel.to : [rel.to];
            return toSymbols.includes(symbol.id);
          });

          // Group by relationship type
          const byType = new Map<string, string[]>();
          for (const rel of incoming) {
            const fromSymbols = Array.isArray(rel.from) ? rel.from : [rel.from];
            for (const fromId of fromSymbols) {
              const list = byType.get(rel.type) || [];
              if (!list.includes(fromId)) {
                list.push(fromId);
              }
              byType.set(rel.type, list);
            }
          }

          // Also check legacy dependencies table
          const legacyDependents = dbManager.getDependents(symbol.id);
          if (legacyDependents.length > 0) {
            const existing = byType.get('code-dependency') || [];
            for (const dep of legacyDependents) {
              if (!existing.includes(dep)) {
                existing.push(dep);
              }
            }
            byType.set('code-dependency', existing);
          }

          const totalCount = Array.from(byType.values()).reduce((sum, arr) => sum + arr.length, 0);

          if (useHuman) {
            // Human-readable format
            this.printHeader(`Who Uses: ${symbol.name}`);
            console.log(`Name: ${symbol.name}`);
            console.log(`Type: ${symbol.type}`);
            console.log(`File: ${symbol.file_path}:${symbol.line}`);
            console.log(`Exported: ${symbol.is_exported ? 'Yes' : 'No'}`);
            if (symbol.summary) {
              console.log(
                `Summary: ${symbol.summary.substring(0, 80)}${symbol.summary.length > 80 ? '...' : ''}`
              );
            }
            console.log();

            if (byType.size === 0) {
              console.log('Not used by any symbol');
              if (!symbol.is_exported) {
                console.log('Note: This symbol is not exported.');
              }
            } else {
              console.log(`Referenced in ${totalCount} relationship(s):`);
              console.log();

              for (const [type, ids] of byType.entries()) {
                console.log(`${type} (${ids.length}):`);
                const depSymbols = dbManager.getSymbolsByIds(ids.slice(0, 10));
                for (const dep of depSymbols) {
                  console.log(`  <- ${dep.name} (${dep.type}) ${dep.file_path}:${dep.line}`);
                }
                if (ids.length > 10) {
                  console.log(`  ... and ${ids.length - 10} more`);
                }
                console.log();
              }
            }
          } else {
            // XML format (default)
            // Build grouped dependents data
            const dependentsData: GroupedSectionData = {};
            for (const [type, ids] of byType.entries()) {
              const depSymbols = dbManager.getSymbolsByIds(ids);
              const items: Array<Record<string, unknown>> = [];

              for (const dep of depSymbols) {
                items.push({
                  name: dep.name,
                  type: dep.type,
                  file: dep.file_path,
                  line: dep.line,
                });
              }

              // For non-symbol refs (like file paths in re-export)
              for (const id of ids) {
                if (!depSymbols.find((d) => d.id === id)) {
                  items.push({ name: id, type: 'unknown', file: '', line: 0 });
                }
              }

              dependentsData[type] = items;
            }

            new XmlBuilder(WhoUsesSchema)
              .section('source', {
                name: symbol.name,
                type: symbol.type,
                file: symbol.file_path,
                line: symbol.line,
                exported: symbol.is_exported,
              })
              .section('dependents', dependentsData)
              .print();
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
