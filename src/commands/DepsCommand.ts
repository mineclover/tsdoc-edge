/**
 * Deps Command - Show dependencies of a symbol
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { SymbolRegistryManager } from '../storage/SymbolRegistryManager';
import { DatabaseManager } from '../storage/DatabaseManager';

/**
 * Command for showing symbol dependencies
 *
 * @public
 * @responsibility Show dependencies of a symbol from registry
 * @contract Reads registry, finds symbol, displays all dependencies
 * @doc [[DepsCommand]]
 * @doc [[CLI Commands#deps]]
 *
 * @problem Need to understand what a symbol depends on
 * @solves Displays all dependencies with their types and reasons
 * @context Part of symbol graph query system
 *
 * @functionality
 * - Symbol lookup: Find symbol by ID in registry
 * - Dependency retrieval: Get all dependencies of a symbol
 * - Detailed display: Show target symbol info and relationship
 * - Error handling: Validate registry and symbol existence
 * - Usage guidance: Show helpful error messages
 *
 * @decision Use SymbolRegistryManager for dependency data
 * @rationale Registry already stores dependency relationships
 * @consequences Requires registry to be built first
 *
 * @depends SymbolRegistryManager
 * @depType internal
 * @depReason Dependency data storage
 */
export class DepsCommand extends BaseCommand {
  private manager?: SymbolRegistryManager;

  constructor(manager?: SymbolRegistryManager) {
    super();
    this.manager = manager;
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'deps';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Show dependencies of a symbol';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return 'tsdoc-edge deps <symbol-id>';
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

      const id = args[0];
      if (!id) {
        console.log(`${colors.yellow}Usage:${colors.reset} tsdoc-edge deps <symbol-name>`);
        console.log();
        console.log('Examples:');
        console.log(`  ${colors.dim}tsdoc-edge deps DatabaseManager${colors.reset}`);
        console.log(`  ${colors.dim}tsdoc-edge deps BuildCommand${colors.reset}`);
        console.log(`  ${colors.dim}tsdoc-edge deps class-basecommand${colors.reset}  ${colors.dim}(exact ID)${colors.reset}`);
        console.log();
        console.log(`Tip: Use ${colors.cyan}tsdoc-edge stats${colors.reset} to see available symbols`);
        console.log();
        return this.failure('Symbol name required');
      }

      const registryPath = path.join(process.cwd(), '.tsdoc', 'registry.jsonl');
      if (!fs.existsSync(registryPath)) {
        this.printError('No registry found. Run "tsdoc-edge id new" first.');
        console.log();
        return this.failure('Registry not found');
      }

      const manager = this.manager || new SymbolRegistryManager(registryPath);
      let entry = manager.findById(id);

      // Try name pattern match if not found by ID
      if (!entry) {
        const matches = manager.findByNamePattern(id);
        if (matches.length === 1) {
          entry = matches[0];
        } else if (matches.length > 1) {
          // Auto-select if first match is exact class/interface match
          const first = matches[0];
          const isExactMatch = first.sourceRef.symbolName.toLowerCase() === id.toLowerCase();
          const isPrimaryType = ['class', 'interface', 'function', 'type'].includes(first.sourceRef.type || '');

          if (isExactMatch && isPrimaryType) {
            entry = first;
            console.log(`${colors.dim}Selected: ${first.sourceRef.symbolName} (${first.sourceRef.type})${colors.reset}`);
            console.log();
          } else {
            console.log(`${colors.yellow}Multiple matches found:${colors.reset}`);
            for (const m of matches.slice(0, 10)) {
              console.log(`  ${colors.cyan}${m.id}${colors.reset} (${m.sourceRef.symbolName}) [${m.sourceRef.type || 'unknown'}]`);
            }
            if (matches.length > 10) {
              console.log(`  ... and ${matches.length - 10} more`);
            }
            console.log();
            console.log('Please use a more specific ID or name.');
            return this.failure(`Multiple matches found: ${id}`);
          }
        }
      }

      if (!entry) {
        // Fall back to database search
        return this.findDepsFromDatabase(id);
      }

      this.printHeader(`Dependencies of ${entry.id} (${entry.sourceRef.symbolName})`);

      const deps = manager.getDependencies(entry.id);

      if (deps.length === 0) {
        console.log(`${colors.yellow}No dependencies${colors.reset}`);
        console.log();
      } else {
        for (const dep of deps) {
          const target = manager.findById(dep.targetId);
          const typeLabel = dep.type ? ` [${dep.type}]` : '';
          console.log(
            `${colors.bold}${dep.targetId}${colors.reset}${typeLabel} → ${target?.sourceRef.symbolName || 'unknown'}`
          );
          console.log(`  Reason: ${dep.reason}`);
          if (target) {
            console.log(`  Location: ${target.sourceRef.filePath}`);
          }
          console.log();
        }

        console.log(`Total: ${colors.green}${deps.length}${colors.reset} dependencies`);
        console.log();
      }

      return this.success();
    });
  }

  private async findDepsFromDatabase(idOrName: string): Promise<CommandResult> {
    const dbCheck = this.checkDatabaseExists();
    if (dbCheck) {
      this.printError(`Symbol not found: ${idOrName}`);
      console.log();
      return this.failure(`Symbol not found: ${idOrName}`);
    }

    const dbPath = this.getDatabasePath();
    const jsonlPath = this.getJsonlPath();
    const dbManager = new DatabaseManager(dbPath, jsonlPath);

    try {
      // Try exact ID match first
      let symbol = dbManager.getSymbol(idOrName);

      // Try name search if not found
      if (!symbol) {
        const matches = dbManager.findSymbolsByNamePattern(idOrName);
        if (matches.length === 1) {
          symbol = dbManager.getSymbol(matches[0].id);
        } else if (matches.length > 1) {
          // Auto-select if any match is exact class/interface/function/type match
          const primaryMatch = matches.find(m =>
            m.name.toLowerCase() === idOrName.toLowerCase() &&
            ['class', 'interface', 'function', 'type'].includes(m.type)
          );

          if (primaryMatch) {
            symbol = dbManager.getSymbol(primaryMatch.id);
            console.log(`${colors.dim}Selected: ${primaryMatch.name} (${primaryMatch.type})${colors.reset}`);
            console.log();
          } else {
            console.log(`${colors.yellow}Multiple matches found:${colors.reset}`);
            for (const m of matches.slice(0, 10)) {
              console.log(`  ${colors.cyan}${m.id}${colors.reset} (${m.name}) [${m.type}]`);
            }
            if (matches.length > 10) {
              console.log(`  ... and ${matches.length - 10} more`);
            }
            console.log();
            console.log('Please use a more specific ID or name.');
            return this.failure(`Multiple matches found: ${idOrName}`);
          }
        }
      }

      if (!symbol) {
        this.printError(`Symbol not found: ${idOrName}`);
        console.log();
        return this.failure(`Symbol not found: ${idOrName}`);
      }

      this.printHeader(`Dependencies of ${symbol.name} (${symbol.type})`);
      console.log(`${colors.dim}File: ${symbol.filePath}:${symbol.line}${colors.reset}`);
      console.log();

      // Get relationships from database using Drizzle ORM
      const relationships = dbManager.queryRelationships({ symbolId: symbol.id, limit: 100 });

      // Filter for outgoing relationships (where this symbol is the source)
      const outgoing = relationships.filter(rel => {
        const fromSymbols = Array.isArray(rel.from) ? rel.from : [rel.from];
        return fromSymbols.includes(symbol!.id);
      });

      if (outgoing.length === 0) {
        console.log(`${colors.yellow}No dependencies found${colors.reset}`);
        console.log();
      } else {
        console.log(`${colors.bold}Dependencies:${colors.reset}`);
        console.log();

        for (const rel of outgoing) {
          const typeLabel = ` [${rel.type}]`;
          const targetIds = Array.isArray(rel.to) ? rel.to : [rel.to];

          for (const targetId of targetIds) {
            const target = dbManager.getSymbol(targetId);
            console.log(
              `  ${colors.bold}→${colors.reset} ${colors.cyan}${target?.name || targetId}${colors.reset}${typeLabel}`
            );
            if (target) {
              console.log(`    ${colors.dim}${target.filePath}:${target.line}${colors.reset}`);
            }
          }
        }
        console.log();
        console.log(`Total: ${colors.green}${outgoing.length}${colors.reset} relationships`);
        console.log();
      }

      return this.success();
    } finally {
      dbManager.close();
    }
  }
}
