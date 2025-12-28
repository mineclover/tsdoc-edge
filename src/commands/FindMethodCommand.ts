/**
 * Find Method Command - Find methods/functions by qualified name
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { SymbolRegistryManager } from '../storage/SymbolRegistryManager';
import { DatabaseManager } from '../storage/DatabaseManager';

/**
 * Command for finding methods by qualified name
 *
 * @public
 * @responsibility Search for methods/functions by qualified name
 * @contract Searches registry, displays matches with details
 * @doc [[FindMethodCommand]]
 * @doc [[CLI Commands#find-method]]
 *
 * @problem Need to find specific methods/functions in codebase
 * @solves Searches by qualified name (Class#method or Class.method)
 * @context Part of code navigation system
 *
 * @functionality
 * - Exact match: Try qualified name first
 * - Partial search: Fall back to partial matching
 * - Multiple results: Display all matches
 * - Detailed info: File, line, type, depth, parent, children
 * - Metadata display: Created/updated timestamps, tags
 *
 * @decision Use SymbolRegistryManager for search
 * @rationale Registry has qualified name and search capabilities
 * @consequences Requires registry to be built first
 *
 * @depends SymbolRegistryManager
 * @depType internal
 * @depReason Symbol search and metadata
 */
export class FindMethodCommand extends BaseCommand {
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
    return 'find-method';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Find methods/functions by qualified name';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge find-method <qualified-name>

  Examples:
    tsdoc-edge find-method DataProcessor#loadCSV
    tsdoc-edge find-method UserService.validateEmail
    tsdoc-edge find-method processData`;
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

      const query = args[0];

      if (!query) {
        this.printError('Usage: tsdoc-edge find-method <qualified-name>');
        console.log();
        console.log('Examples:');
        this.printInfo('  tsdoc-edge find-method DataProcessor#loadCSV');
        this.printInfo('  tsdoc-edge find-method UserService.validateEmail');
        this.printInfo('  tsdoc-edge find-method processData');
        console.log();
        return this.failure('Query required');
      }

      const registryPath = path.join(process.cwd(), '.tsdoc', 'registry.jsonl');
      const manager = this.manager || (fs.existsSync(registryPath) ? new SymbolRegistryManager(registryPath) : null);

      this.printHeader(`Search: ${query}`);

      // Try registry first if available
      if (manager) {
        const entry = manager.findByQualifiedName(query);
        if (entry) {
          return this.displayRegistryEntry(entry, manager);
        }

        const results = manager.search(query);
        if (results.length > 0) {
          return this.displayRegistryResults(results, manager);
        }
      }

      // Fall back to database search
      return this.findFromDatabase(query);
    });
  }

  private displayRegistryEntry(entry: any, manager: SymbolRegistryManager): CommandResult {
    const displayName = entry.sourceRef.qualifiedName || entry.sourceRef.symbolName || entry.id;
    console.log(`${colors.bold}${entry.id}${colors.reset} → ${displayName}`);
    console.log();
    console.log(`File:       ${entry.sourceRef.filePath}`);
    console.log(`Line:       ${entry.sourceRef.line || 'unknown'}`);
    console.log(`Type:       ${entry.sourceRef.type}`);
    console.log(`Depth:      ${entry.sourceRef.depth}`);

    if (entry.sourceRef.memberOf) {
      const parent = manager.findById(entry.sourceRef.memberOf);
      const parentName = parent?.sourceRef.qualifiedName || parent?.sourceRef.symbolName || parent?.id;
      console.log(`Parent:     ${entry.sourceRef.memberOf} (${parentName || 'unknown'})`);
    }

    if (entry.sourceRef.memberType) {
      console.log(`Member Type: ${entry.sourceRef.memberType}`);
    }

    console.log(`Created:    ${entry.createdAt}`);
    console.log(`Updated:    ${entry.updatedAt}`);

    if (entry.tags && entry.tags.length > 0) {
      console.log(`Tags:       ${entry.tags.join(', ')}`);
    }

    console.log();

    const children = manager.getChildren(entry.id);
    if (children.length > 0) {
      console.log(`${colors.cyan}Children (${children.length}):${colors.reset}`);
      for (const child of children) {
        const childName = child.sourceRef.qualifiedName || child.sourceRef.symbolName || child.id;
        console.log(`  ${child.id} → ${childName}`);
      }
      console.log();
    }

    return this.success();
  }

  private displayRegistryResults(results: any[], manager: SymbolRegistryManager): CommandResult {
    if (results.length === 1) {
      return this.displayRegistryEntry(results[0], manager);
    }

    console.log(`Found ${colors.bold}${results.length}${colors.reset} matching symbols:`);
    console.log();

    for (const result of results) {
      const displayName = result.sourceRef.qualifiedName || result.sourceRef.symbolName || result.id;
      console.log(`${colors.bold}${result.id}${colors.reset} → ${displayName}`);
      console.log(`  File: ${result.sourceRef.filePath}:${result.sourceRef.line || '?'}`);
      console.log(`  Type: ${result.sourceRef.type}`);
      console.log();
    }
    return this.success();
  }

  private async findFromDatabase(query: string): Promise<CommandResult> {
    const dbCheck = this.checkDatabaseExists();
    if (dbCheck) {
      console.log(`${colors.yellow}No symbols found${colors.reset}`);
      console.log();
      return this.success();
    }

    const dbPath = this.getDatabasePath();
    const jsonlPath = this.getJsonlPath();
    const dbManager = new DatabaseManager(dbPath, jsonlPath);

    try {
      // Search for methods/functions matching the query
      const matches = dbManager.findSymbolsByNamePattern(query);

      // Filter to only methods and functions
      const methodMatches = matches.filter(s =>
        ['method', 'function'].includes(s.type) ||
        s.name.includes('.')
      );

      if (methodMatches.length === 0) {
        // Try broader search
        const allMatches = matches.slice(0, 20);
        if (allMatches.length === 0) {
          console.log(`${colors.yellow}No symbols found${colors.reset}`);
          console.log();
          return this.success();
        }

        console.log(`Found ${colors.bold}${allMatches.length}${colors.reset} matching symbols:`);
        console.log();

        for (const match of allMatches) {
          console.log(`${colors.bold}${match.id}${colors.reset} → ${match.name}`);
          console.log(`  File: ${match.file_path}:${match.line}`);
          console.log(`  Type: ${match.type}`);
          console.log();
        }
        return this.success();
      }

      if (methodMatches.length === 1) {
        const match = methodMatches[0];
        const symbol = dbManager.getSymbol(match.id);
        if (symbol) {
          console.log(`${colors.bold}${symbol.id}${colors.reset} → ${symbol.name}`);
          console.log();
          console.log(`File:       ${symbol.filePath}`);
          console.log(`Line:       ${symbol.line}`);
          console.log(`Type:       ${symbol.type}`);
          console.log(`Exported:   ${symbol.isExported ? 'Yes' : 'No'}`);
          if (symbol.summary) {
            console.log(`Summary:    ${symbol.summary.substring(0, 80)}${symbol.summary.length > 80 ? '...' : ''}`);
          }
          console.log();
        }
        return this.success();
      }

      console.log(`Found ${colors.bold}${methodMatches.length}${colors.reset} matching methods/functions:`);
      console.log();

      for (const match of methodMatches.slice(0, 20)) {
        console.log(`${colors.bold}${match.id}${colors.reset} → ${match.name}`);
        console.log(`  File: ${match.file_path}:${match.line}`);
        console.log(`  Type: ${match.type}`);
        console.log();
      }

      if (methodMatches.length > 20) {
        console.log(`${colors.dim}... and ${methodMatches.length - 20} more${colors.reset}`);
        console.log();
      }

      return this.success();
    } finally {
      dbManager.close();
    }
  }
}
