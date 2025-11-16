/**
 * Orphans Command - Find orphaned symbols
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { SymbolRegistryManager } from '../storage/SymbolRegistryManager';

/**
 * Command for finding orphaned symbols
 *
 * @public
 * @responsibility Find symbols with no dependencies or usages
 * @contract Reads registry, identifies orphans, displays results
 * @doc [[OrphansCommand]]
 * @doc [[CLI Commands#orphans]]
 *
 * @problem Need to identify unused or disconnected symbols
 * @solves Finds symbols that are neither used nor use others
 * @context Part of code quality analysis
 *
 * @functionality
 * - Orphan detection: Find symbols with no relationships
 * - Registry scanning: Check all registered symbols
 * - Detailed display: Show orphan symbol info
 * - Empty state: Success message when no orphans
 * - Quality indicator: Helps identify dead code
 *
 * @decision Use SymbolRegistryManager for orphan detection
 * @rationale Registry already tracks all relationships
 * @consequences Requires registry to be built first
 *
 * @depends SymbolRegistryManager
 * @depType internal
 * @depReason Relationship data
 */
export class OrphansCommand extends BaseCommand {
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
    return 'orphans';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Find orphaned symbols';
  }

  protected getUsage(): string {
    return 'tsdoc-edge orphans';
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

      const registryPath = path.join(process.cwd(), '.tsdoc', 'registry.jsonl');

      if (!this.manager && !fs.existsSync(registryPath)) {
        this.printError('No registry found.');
        console.log();
        return this.failure('Registry not found');
      }

      const manager = this.manager || new SymbolRegistryManager(registryPath);
      const orphans = manager.findOrphans();

      this.printHeader('Orphaned Symbols');

      if (orphans.length === 0) {
        this.printSuccess('No orphaned symbols found');
        console.log();
      } else {
        console.log(`${colors.yellow}Found ${orphans.length} orphaned symbols:${colors.reset}`);
        console.log();

        for (const id of orphans) {
          const entry = manager.findById(id);
          if (entry) {
            console.log(`${colors.bold}${id}${colors.reset} → ${entry.sourceRef.symbolName}`);
            console.log(`  Location: ${entry.sourceRef.filePath}`);
            console.log();
          }
        }
      }

      return this.success();
    });
  }
}

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
