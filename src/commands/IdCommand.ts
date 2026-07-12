/**
 * IdCommand - Complete symbol ID management
 * @packageDocumentation
 */

import * as path from 'node:path';
import { DatabaseManager } from '../storage/DatabaseManager';
import { SymbolRegistryManager } from '../storage/SymbolRegistryManager';
import type { ImplementationSymbolType } from '../types/graph';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * IdCommand - Complete symbol ID management
 *
 * Subcommands:
 * - new: Generate new symbol ID
 * - list: List all registered IDs
 * - find: Find symbol by ID
 * - stats: Show registry statistics
 *
 * @doc [[IdCommand]]
 * @public
 * @problem Need unified interface for symbol ID operations across multiple use cases
 * @solves Provides single command with subcommands for all ID management tasks
 * @context CLI users need to register, query, and manage symbol IDs for documentation linking
 *
 * @functionality
 * - Subcommand routing: Dispatches to specialized handlers (new, list, find, stats)
 * - ID generation: Creates new unique symbol IDs with metadata
 * - ID lookup: Find symbols by ID or name with fuzzy matching
 * - Statistics: Show registry utilization and growth metrics
 * - Error handling: Validates inputs and provides clear usage messages
 *
 * @decision Use subcommand pattern instead of separate top-level commands
 * @rationale Reduces CLI clutter, groups related operations, easier to discover features
 * @consequences All ID operations under single namespace, requires subcommand parsing
 *
 * @depends SymbolRegistryManager, BaseCommand
 * @depType internal, internal
 * @depReason Symbol storage backend, command framework
 */
export class IdCommand extends BaseCommand {
  private manager?: SymbolRegistryManager;

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'id';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Manage symbol IDs (new, list, find, stats)';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge id <subcommand>

  Subcommands:
    new <file> <symbol>  Generate new ID for a symbol
    list                 List all registered IDs
    find <id>            Find source location by ID
    stats                Show registry statistics`;
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
      const manager = this.manager || new SymbolRegistryManager(registryPath);

      const subcommand = args[0] || 'help';

      switch (subcommand) {
        case 'new':
          return await this.handleNew(manager, args);
        case 'list':
          return await this.handleList(manager, args);
        case 'find':
          return await this.handleFind(manager, args);
        case 'stats':
          return await this.handleStats(manager, args);
        default:
          return this.showHelp();
      }
    });
  }

  private async handleNew(manager: SymbolRegistryManager, args: string[]): Promise<CommandResult> {
    // Filter out subcommand and flags
    const positionalArgs = args.slice(1).filter((arg) => !arg.startsWith('--'));
    const filePath = positionalArgs[0];
    const symbolName = positionalArgs[1];

    if (!filePath || !symbolName) {
      console.log(`${colors.red}Usage: tsdoc-edge id new <file> <symbol> [options]${colors.reset}`);
      console.log();
      console.log('Options:');
      console.log('  --type=<type>           Symbol type (class, function, method, property)');
      console.log('  --parent=<id>           Parent symbol ID (for methods)');
      console.log('  --member-type=<type>    Member type (instance, static, inner)');
      console.log();
      return { exitCode: 1, message: 'Missing required arguments' };
    }

    // Parse options
    let type: string | undefined;
    let parent: string | undefined;
    let memberType: 'instance' | 'static' | 'inner' | undefined;

    for (const arg of args.slice(1)) {
      if (arg.startsWith('--type=')) {
        type = arg.split('=')[1];
      } else if (arg.startsWith('--parent=')) {
        parent = arg.split('=')[1];
      } else if (arg.startsWith('--member-type=')) {
        memberType = arg.split('=')[1] as 'instance' | 'static' | 'inner';
      }
    }

    // Validate parent if provided
    if (parent) {
      const parentEntry = manager.findById(parent);
      if (!parentEntry) {
        console.log(`${colors.red}❌ Parent symbol not found: ${parent}${colors.reset}`);
        return { exitCode: 1, message: `Parent symbol not found: ${parent}` };
      }
    }

    const id = manager.register({
      filePath,
      symbolName,
      type: type as ImplementationSymbolType | undefined,
      memberOf: parent,
      memberType,
    });
    manager.save();

    const entry = manager.findById(id);

    if (this.hasFlag(args, '--human')) {
      // Original color output
      console.log(`${colors.green}✅ ID generated:${colors.reset}`);
      console.log();
      console.log(`  ID: ${colors.bold}${id}${colors.reset}`);
      console.log(
        `  Qualified Name: ${colors.bold}${entry?.sourceRef.qualifiedName}${colors.reset}`
      );
      console.log(`  File: ${filePath}`);
      console.log();
      console.log('Add this to your TSDoc comment:');
      console.log(`${colors.cyan}  @id ${id}${colors.reset}`);
      console.log();
    } else {
      // XML output
      this.printOutput(
        'id-new',
        {
          result: {
            id,
            qualifiedName: entry?.sourceRef.qualifiedName || '',
            filePath,
            symbolName,
            type: type || 'unknown',
          },
          usage: {
            tsdocTag: `@id ${id}`,
          },
        },
        args
      );
    }

    return { exitCode: 0, message: `ID generated: ${id}` };
  }

  private async handleList(manager: SymbolRegistryManager, args: string[]): Promise<CommandResult> {
    const entries = manager.getAll();

    // If registry is empty, show symbols from database
    if (entries.length === 0) {
      return this.handleListFromDatabase(args);
    }

    if (this.hasFlag(args, '--human')) {
      // Original color output
      console.log(`${colors.bold}Symbol Registry${colors.reset}`);
      console.log(`Total entries: ${colors.green}${entries.length}${colors.reset}`);
      console.log();

      for (const entry of entries) {
        console.log(
          `${colors.bold}${entry.id}${colors.reset} → ${entry.sourceRef.filePath}:${entry.sourceRef.symbolName}`
        );
        if (entry.tags && entry.tags.length > 0) {
          console.log(`  Tags: ${entry.tags.join(', ')}`);
        }
        console.log();
      }
    } else {
      // XML output
      this.printOutput(
        'id-list',
        {
          source: {
            type: 'registry',
            totalEntries: entries.length,
          },
          entries: entries.map((entry) => ({
            id: entry.id,
            filePath: entry.sourceRef.filePath,
            symbolName: entry.sourceRef.symbolName,
            qualifiedName: entry.sourceRef.qualifiedName,
            tags: entry.tags?.join(', ') || '',
          })),
        },
        args
      );
    }

    return { exitCode: 0, message: `Listed ${entries.length} entries` };
  }

  private async handleListFromDatabase(args: string[]): Promise<CommandResult> {
    const dbCheck = this.checkDatabaseExists();
    if (dbCheck) {
      console.log(`${colors.yellow}No registry entries and no database found.${colors.reset}`);
      console.log(`Run ${colors.cyan}tsdoc-edge build src${colors.reset} first.`);
      console.log();
      return dbCheck;
    }

    const dbPath = this.getDatabasePath();
    const jsonlPath = this.getJsonlPath();
    const dbManager = new DatabaseManager(dbPath, jsonlPath);

    try {
      // Get symbols from database using Drizzle ORM
      const symbols = dbManager.querySymbols({ limit: 50, orderBy: 'name', orderDir: 'asc' });
      const total = dbManager.countSymbols({});

      if (this.hasFlag(args, '--human')) {
        // Original color output
        console.log(`${colors.bold}Symbols from Database${colors.reset}`);
        console.log(
          `Showing: ${colors.green}${symbols.length}${colors.reset} of ${colors.cyan}${total}${colors.reset}`
        );
        console.log();
        console.log(
          `${colors.dim}Note: Short ID registry is empty. Showing database symbols instead.${colors.reset}`
        );
        console.log(
          `${colors.dim}Use ${colors.cyan}tsdoc-edge id new <file> <symbol>${colors.reset}${colors.dim} to register short IDs.${colors.reset}`
        );
        console.log();

        for (const symbol of symbols) {
          console.log(`${colors.bold}${symbol.id}${colors.reset}`);
          console.log(`  Name: ${symbol.name} (${symbol.type})`);
          console.log(`  File: ${symbol.file_path}:${symbol.line}`);
          console.log();
        }

        if (total > symbols.length) {
          console.log(`${colors.dim}... and ${total - symbols.length} more symbols${colors.reset}`);
          console.log();
        }
      } else {
        // XML output
        this.printOutput(
          'id-list',
          {
            source: {
              type: 'database',
              showing: symbols.length,
              total,
            },
            note: {
              text: 'Short ID registry is empty. Showing database symbols instead.',
            },
            symbols: symbols.map((symbol) => ({
              id: symbol.id,
              name: symbol.name,
              type: symbol.type,
              filePath: symbol.file_path,
              line: symbol.line,
            })),
          },
          args
        );
      }

      return { exitCode: 0, message: `Listed ${symbols.length} symbols from database` };
    } finally {
      dbManager.close();
    }
  }

  private async handleFind(manager: SymbolRegistryManager, args: string[]): Promise<CommandResult> {
    // Filter out subcommand and flags
    const positionalArgs = args.slice(1).filter((arg) => !arg.startsWith('--'));
    const id = positionalArgs[0];

    if (!id) {
      console.log(`${colors.red}Usage: tsdoc-edge id find <id-or-name>${colors.reset}`);
      return { exitCode: 1, message: 'Missing ID argument' };
    }

    // Try registry first
    const entry = manager.findById(id);
    if (entry) {
      if (this.hasFlag(args, '--human')) {
        // Original color output
        console.log(`${colors.bold}Symbol: ${id}${colors.reset}`);
        console.log();
        console.log(`ID: ${colors.bold}${entry.id}${colors.reset}`);
        console.log(`File: ${entry.sourceRef.filePath}`);
        console.log(`Symbol: ${entry.sourceRef.symbolName}`);
        if (entry.sourceRef.type) {
          console.log(`Type: ${entry.sourceRef.type}`);
        }
        console.log(`Created: ${entry.createdAt}`);
        console.log(`Updated: ${entry.updatedAt}`);
        console.log();
      } else {
        // XML output
        this.printOutput(
          'id-find',
          {
            source: {
              type: 'registry',
            },
            symbol: {
              id: entry.id,
              filePath: entry.sourceRef.filePath,
              symbolName: entry.sourceRef.symbolName,
              qualifiedName: entry.sourceRef.qualifiedName,
              type: entry.sourceRef.type || 'unknown',
              createdAt: entry.createdAt,
              updatedAt: entry.updatedAt,
            },
          },
          args
        );
      }
      return { exitCode: 0, message: `Found ID: ${id}` };
    }

    // Fall back to database search
    return this.handleFindFromDatabase(id, args);
  }

  private async handleFindFromDatabase(idOrName: string, args: string[]): Promise<CommandResult> {
    const dbCheck = this.checkDatabaseExists();
    if (dbCheck) {
      console.log(`${colors.red}❌ ID not found: ${idOrName}${colors.reset}`);
      return { exitCode: 1, message: `ID not found: ${idOrName}` };
    }

    const dbPath = this.getDatabasePath();
    const jsonlPath = this.getJsonlPath();
    const dbManager = new DatabaseManager(dbPath, jsonlPath);

    try {
      // Try exact ID match first
      const symbol = dbManager.getSymbol(idOrName);
      if (symbol) {
        if (this.hasFlag(args, '--human')) {
          // Original color output
          console.log(`${colors.bold}Symbol Found (from database)${colors.reset}`);
          console.log();
          console.log(`ID: ${colors.bold}${symbol.id}${colors.reset}`);
          console.log(`Name: ${symbol.name}`);
          console.log(`Type: ${symbol.type}`);
          console.log(`File: ${symbol.filePath}:${symbol.line}`);
          console.log(`Exported: ${symbol.isExported ? 'Yes' : 'No'}`);
          if (symbol.summary) {
            console.log(
              `Summary: ${symbol.summary.substring(0, 80)}${symbol.summary.length > 80 ? '...' : ''}`
            );
          }
          console.log();
        } else {
          // XML output
          this.printOutput(
            'id-find',
            {
              source: {
                type: 'database',
              },
              symbol: {
                id: symbol.id,
                name: symbol.name,
                type: symbol.type,
                filePath: symbol.filePath,
                line: symbol.line,
                exported: symbol.isExported ? 'yes' : 'no',
                summary: symbol.summary || '',
              },
            },
            args
          );
        }
        return { exitCode: 0, message: `Found symbol: ${idOrName}` };
      }

      // Try name search
      const matches = dbManager.findSymbolsByNamePattern(idOrName);
      if (matches.length > 0) {
        if (this.hasFlag(args, '--human')) {
          // Original color output
          console.log(`${colors.bold}Symbols matching "${idOrName}"${colors.reset}`);
          console.log(`Found: ${colors.green}${matches.length}${colors.reset} match(es)`);
          console.log();

          for (const match of matches.slice(0, 10)) {
            console.log(`${colors.bold}${match.id}${colors.reset}`);
            console.log(`  Name: ${match.name} (${match.type})`);
            console.log(`  File: ${match.file_path}:${match.line}`);
            console.log();
          }

          if (matches.length > 10) {
            console.log(`${colors.dim}... and ${matches.length - 10} more matches${colors.reset}`);
            console.log();
          }
        } else {
          // XML output
          this.printOutput(
            'id-find',
            {
              source: {
                type: 'database-search',
                query: idOrName,
                totalMatches: matches.length,
              },
              matches: matches.slice(0, 10).map((match) => ({
                id: match.id,
                name: match.name,
                type: match.type,
                filePath: match.file_path,
                line: match.line,
              })),
            },
            args
          );
        }
        return { exitCode: 0, message: `Found ${matches.length} matches` };
      }

      console.log(`${colors.red}❌ No symbol found matching: ${idOrName}${colors.reset}`);
      console.log();
      console.log('Tips:');
      console.log(`  ${colors.dim}• Use symbol name (e.g., DatabaseManager)${colors.reset}`);
      console.log(
        `  ${colors.dim}• Use full ID (e.g., databasemanager-class-databasemanager)${colors.reset}`
      );
      console.log(
        `  ${colors.dim}• Run ${colors.cyan}tsdoc-edge id list${colors.reset}${colors.dim} to see available symbols${colors.reset}`
      );
      console.log();
      return { exitCode: 1, message: `Symbol not found: ${idOrName}` };
    } finally {
      dbManager.close();
    }
  }

  private async handleStats(
    manager: SymbolRegistryManager,
    args: string[]
  ): Promise<CommandResult> {
    const stats = manager.getStats();

    if (this.hasFlag(args, '--human')) {
      // Original color output
      console.log(`${colors.bold}Registry Statistics${colors.reset}`);
      console.log();
      console.log(`Total Entries: ${colors.green}${stats.totalEntries}${colors.reset}`);
      console.log(`Files: ${colors.cyan}${stats.fileCount}${colors.reset}`);
      console.log(`Tags: ${colors.cyan}${stats.tagCount}${colors.reset}`);
      console.log();
      console.log(`${colors.bold}ID Generator Stats:${colors.reset}`);
      console.log(`  Mode: ${stats.idStats.mode}`);
      console.log(`  Length: ${stats.idStats.length} chars`);
      console.log(`  Used: ${stats.idStats.used}`);
      console.log(`  Capacity: ${stats.idStats.capacity}`);
      console.log(`  Utilization: ${stats.idStats.utilization.toFixed(2)}%`);
      console.log();
    } else {
      // XML output
      this.printOutput(
        'id-stats',
        {
          registry: {
            totalEntries: stats.totalEntries,
            fileCount: stats.fileCount,
            tagCount: stats.tagCount,
          },
          idGenerator: {
            mode: stats.idStats.mode,
            length: stats.idStats.length,
            used: stats.idStats.used,
            capacity: stats.idStats.capacity,
            utilizationPercent: stats.idStats.utilization.toFixed(2),
          },
        },
        args
      );
    }

    return { exitCode: 0, message: 'Statistics displayed' };
  }

  private showHelp(): CommandResult {
    console.log(`${colors.bold}ID Management Commands${colors.reset}`);
    console.log();
    console.log('Usage:');
    console.log('  tsdoc-edge id <subcommand>');
    console.log();
    console.log('Subcommands:');
    console.log('  new <file> <symbol>  Generate new ID for a symbol');
    console.log('  list                 List all registered IDs');
    console.log('  find <id>            Find source location by ID');
    console.log('  stats                Show registry statistics');
    console.log();

    return { exitCode: 0, message: 'Help displayed' };
  }
}
