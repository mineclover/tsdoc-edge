/**
 * Phase 5 Commands - Symbol queries and graph analysis
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { SymbolRegistryManager } from '../storage/SymbolRegistryManager';
import { DatabaseManager } from '../storage/DatabaseManager';
import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import { SymbolSearchEngine } from '../graph/SymbolSearchEngine';
import type { Symbol } from '../types/graph/graph';

/**
 * SymbolRow interface for database results
 */
interface SymbolRow {
  id: string;
  name: string;
  type: string;
  file_path: string;
  line: number;
  column: number;
  is_exported: number;
  is_public: number;
  summary: string | null;
}

/**
 * RegistryEntryNode interface for hierarchy tree
 */
interface RegistryEntryNode {
  id: string;
  sourceRef: {
    type?: string;
    qualifiedName?: string;
    symbolName?: string;
    filePath?: string;
  };
  children?: RegistryEntryNode[];
}

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
        this.printError('Usage: tsdoc-edge deps <id>');
        console.log();
        return this.failure('Symbol ID required');
      }

      const registryPath = path.join(process.cwd(), '.tsdoc', 'registry.jsonl');
      if (!fs.existsSync(registryPath)) {
        this.printError('No registry found. Run "tsdoc-edge id new" first.');
        console.log();
        return this.failure('Registry not found');
      }

      const manager = this.manager || new SymbolRegistryManager(registryPath);
      const entry = manager.findById(id);

      if (!entry) {
        this.printError(`Symbol not found: ${id}`);
        console.log();
        return this.failure(`Symbol not found: ${id}`);
      }

      this.printHeader(`Dependencies of ${id} (${entry.sourceRef.symbolName})`);

      const deps = manager.getDependencies(id);

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
}

/**
 * Command for showing what uses a symbol (registry-based)
 *
 * @public
 * @responsibility Show reverse dependencies from registry
 * @contract Reads registry, finds symbol, displays all usages
 * @doc [[UsedByCommand]]
 * @doc [[CLI Commands#used-by]]
 *
 * @problem Need to understand what uses a given symbol
 * @solves Displays all reverse dependencies with details
 * @context Part of symbol graph query system
 *
 * @functionality
 * - Symbol lookup: Find symbol by ID in registry
 * - Usage retrieval: Get all symbols that use this symbol
 * - Detailed display: Show from symbol info and relationship
 * - Error handling: Validate registry and symbol existence
 * - Empty state: Clear message when not used
 *
 * @decision Use SymbolRegistryManager for usage data
 * @rationale Registry stores bidirectional relationships
 * @consequences Requires registry to be built first
 *
 * @depends SymbolRegistryManager
 * @depType internal
 * @depReason Usage relationship storage
 */
export class UsedByCommand extends BaseCommand {
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
    return 'used-by';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Show what uses a symbol (registry)';
  }

  protected getUsage(): string {
    return 'tsdoc-edge used-by <symbol-id>';
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
        this.printError('Usage: tsdoc-edge used-by <id>');
        console.log();
        return this.failure('Symbol ID required');
      }

      const registryPath = path.join(process.cwd(), '.tsdoc', 'registry.jsonl');
      if (!fs.existsSync(registryPath)) {
        this.printError('No registry found.');
        console.log();
        return this.failure('Registry not found');
      }

      const manager = this.manager || new SymbolRegistryManager(registryPath);
      const entry = manager.findById(id);

      if (!entry) {
        this.printError(`Symbol not found: ${id}`);
        console.log();
        return this.failure(`Symbol not found: ${id}`);
      }

      this.printHeader(`Used By ${id} (${entry.sourceRef.symbolName})`);

      const usedBy = manager.getUsedBy(id);

      if (usedBy.length === 0) {
        console.log(`${colors.yellow}Not used by any symbol${colors.reset}`);
        console.log();
      } else {
        for (const user of usedBy) {
          const from = manager.findById(user.fromId);
          const typeLabel = user.type ? ` [${user.type}]` : '';
          console.log(
            `${colors.bold}${user.fromId}${colors.reset}${typeLabel} → ${from?.sourceRef.symbolName || 'unknown'}`
          );
          console.log(`  Reason: ${user.reason}`);
          if (from) {
            console.log(`  Location: ${from.sourceRef.filePath}`);
          }
          console.log();
        }

        console.log(`Total: ${colors.green}${usedBy.length}${colors.reset} usages`);
        console.log();
      }

      return this.success();
    });
  }
}

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

      const dbPath = path.join(process.cwd(), '.tsdoc', 'symbols.db');
      if (!fs.existsSync(dbPath)) {
        this.printError('Database not found. Run "tsdoc-edge build src" first.');
        console.log();
        return this.failure('Database not found');
      }

      const jsonlPath = path.join(process.cwd(), '.tsdoc', 'data');
      const dbManager = this.dbManager || new DatabaseManager(dbPath, jsonlPath);

      try {
        // Find symbols matching the name
        const symbols = dbManager.db
          .prepare('SELECT * FROM symbols WHERE name = ? OR name LIKE ?')
          .all(symbolName, `${symbolName}.%`) as SymbolRow[];

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

        // Show all matching symbols
        if (symbols.length > 1) {
          console.log(`${colors.cyan}Found ${symbols.length} symbols matching "${symbolName}":${colors.reset}`);
          console.log();
          for (const sym of symbols) {
            console.log(`  • ${sym.name} (${sym.type}) in ${sym.file_path}`);
          }
          console.log();
        }

        // Analyze each symbol
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

            // Group by file
            const byFile = new Map<string, SymbolRow[]>();
            for (const depId of dependents) {
              const depSymbol = dbManager.getSymbol(depId);
              if (depSymbol) {
                const depRow = dbManager.db.prepare('SELECT * FROM symbols WHERE id = ?').get(depId) as SymbolRow;
                const fileSymbols = byFile.get(depSymbol.filePath) || [];
                fileSymbols.push(depRow);
                byFile.set(depSymbol.filePath, fileSymbols);
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

  protected getUsage(): string {
    return 'tsdoc-edge undocumented';
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

      this.printHeader('Undocumented Symbols');

      const dbPath = path.join(process.cwd(), '.tsdoc', 'symbols.db');

      if (!this.dbManager && !fs.existsSync(dbPath)) {
        this.printError('Database not found. Run "tsdoc-edge build src" first.');
        console.log();
        return this.failure('Database not found');
      }

      const jsonlPath = path.join(process.cwd(), '.tsdoc', 'data');
      const dbManager = this.dbManager || new DatabaseManager(dbPath, jsonlPath);

      try {
        // Get all symbols from database
        const query = 'SELECT * FROM symbols';
        const stmt = dbManager.db.prepare(query);
        const rows = stmt.all() as SymbolRow[];

        // Build symbol graph
        const graphBuilder = new SymbolGraphBuilder();

        for (const row of rows) {
          const symbol: Symbol = {
            id: row.id,
            name: row.name,
            type: row.type as Symbol['type'],
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
        const undocumented = searchEngine.findUndocumented();

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
export class TreeCommand extends BaseCommand {
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
    return 'tree';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Show symbol hierarchy tree';
  }

  protected getUsage(): string {
    return 'tsdoc-edge tree';
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
      const hierarchy = manager.buildHierarchy();

      this.printHeader('Symbol Hierarchy Tree');

      if (hierarchy.length === 0) {
        console.log(`${colors.yellow}No symbols registered${colors.reset}`);
        console.log();
        return this.success();
      }

      const printNode = (node: RegistryEntryNode, prefix: string = '', isLast: boolean = true) => {
        const connector = isLast ? '└── ' : '├── ';
        const typeColor =
          node.sourceRef.type === 'class'
            ? colors.blue
            : node.sourceRef.type === 'method'
              ? colors.green
              : node.sourceRef.type === 'function'
                ? colors.cyan
                : colors.reset;

        console.log(
          prefix +
            connector +
            colors.bold +
            node.id +
            colors.reset +
            ' ' +
            typeColor +
            node.sourceRef.qualifiedName +
            colors.reset +
            ` (${node.sourceRef.type})`
        );

        if (node.children && node.children.length > 0) {
          const childPrefix = prefix + (isLast ? '    ' : '│   ');
          node.children.forEach((child: RegistryEntryNode, index: number) => {
            const childIsLast = index === (node.children?.length ?? 0) - 1;
            printNode(child, childPrefix, childIsLast);
          });
        }
      };

      hierarchy.forEach((root, index) => {
        const isLast = index === hierarchy.length - 1;
        printNode(root, '', isLast);
      });

      console.log();
      console.log(`Total symbols: ${colors.bold}${manager.getAll().length}${colors.reset}`);
      console.log();

      return this.success();
    });
  }
}
