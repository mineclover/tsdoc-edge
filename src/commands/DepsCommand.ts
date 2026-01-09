/**
 * Deps Command - Show dependencies of a symbol
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { SymbolRegistryManager } from '../storage/SymbolRegistryManager';
import { DatabaseManager } from '../storage/DatabaseManager';
import { XmlBuilder } from '../output/XmlBuilder';
import { DepsSchema } from '../output/schemas';

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
    return 'Show what a symbol depends on (A → B)';
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

      // Parse options
      const typeFilter = args.find(a => a.startsWith('--type='))?.split('=')[1];
      const showAll = args.includes('--all');
      const useHuman = args.includes('--human');
      const filteredArgs = args.filter(a => !a.startsWith('--'));

      const id = filteredArgs[0];
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
            if (useHuman) {
              console.log(`Selected: ${first.sourceRef.symbolName} (${first.sourceRef.type})`);
              console.log();
            }
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
        return this.findDepsFromDatabase(id, typeFilter, showAll, useHuman);
      }

      // Use database for all lookups
      return this.findDepsFromDatabase(entry.id, typeFilter, showAll, useHuman);
    });
  }

  private async findDepsFromDatabase(idOrName: string, typeFilter?: string, showAll?: boolean, useHuman?: boolean): Promise<CommandResult> {
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
            if (useHuman) {
              console.log(`Selected: ${primaryMatch.name} (${primaryMatch.type})`);
              console.log();
            }
          } else {
            console.log('Multiple matches found:');
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

      // Get relationships from database using Drizzle ORM
      const queryOptions: { symbolId: string; limit: number; type?: string } = { symbolId: symbol.id, limit: 200 };
      if (typeFilter) {
        queryOptions.type = typeFilter;
      }
      const relationships = dbManager.queryRelationships(queryOptions);

      // Filter for outgoing relationships (where this symbol is the source)
      let outgoing = relationships.filter(rel => {
        const fromSymbols = Array.isArray(rel.from) ? rel.from : [rel.from];
        return fromSymbols.includes(symbol!.id);
      });

      // By default, only show code-dependency (unless --all or --type specified)
      if (!showAll && !typeFilter) {
        outgoing = outgoing.filter(rel => rel.type === 'code-dependency');
      }

      // Collect dependency info
      const deps: Array<{ name: string; type: string; file: string; line: number; relType: string }> = [];
      for (const rel of outgoing) {
        const targetIds = Array.isArray(rel.to) ? rel.to : [rel.to];
        for (const targetId of targetIds) {
          const target = dbManager.getSymbol(targetId);
          if (target) {
            deps.push({
              name: target.name,
              type: target.type,
              file: target.filePath,
              line: target.line,
              relType: rel.type,
            });
          }
        }
      }

      if (useHuman) {
        // Human-readable format
        this.printHeader(`Dependencies of ${symbol.name} (${symbol.type})`);
        console.log(`File: ${symbol.filePath}:${symbol.line}`);
        console.log();

        if (deps.length === 0) {
          console.log('No dependencies found');
          if (!showAll && !typeFilter) {
            console.log('Tip: Use --all to see all relationship types');
          }
        } else {
          const byType = new Map<string, typeof deps>();
          for (const dep of deps) {
            const list = byType.get(dep.relType) || [];
            list.push(dep);
            byType.set(dep.relType, list);
          }

          for (const [relType, typeDeps] of byType.entries()) {
            console.log(`${relType} (${typeDeps.length}):`);
            for (const dep of typeDeps) {
              console.log(`  → ${dep.name} (${dep.type})`);
              console.log(`    ${dep.file}:${dep.line}`);
            }
            console.log();
          }
          console.log(`Total: ${deps.length} dependencies`);
        }
      } else {
        // XML format (default)
        new XmlBuilder(DepsSchema)
          .section('source', {
            name: symbol.name,
            type: symbol.type,
            file: symbol.filePath,
            line: symbol.line,
          })
          .section('targets', deps.map(dep => ({
            name: dep.name,
            type: dep.type,
            relation: dep.relType,
            file: dep.file,
            line: dep.line,
          })))
          .print();
      }

      return this.success();
    } finally {
      dbManager.close();
    }
  }
}
