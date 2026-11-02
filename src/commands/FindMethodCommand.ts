/**
 * Find Method Command - Find methods/functions by qualified name
 *
 * @packageDocumentation
 * @doc [[FindMethodCommand]]
 * @doc [[CLI Commands]]
 * @context Qualified method and function lookup via `tsdoc-edge symbol find-method`
 * @functionality Searches `SymbolRegistryManager` and `.tsdoc.db` by exact or partial `Class#method` / `Class.method` patterns
 * @sideEffect console: Writes matching method locations and metadata in XML or human format to stdout
 * @sideEffect database: Reads `DatabaseManager` and symbol registry files on disk (read)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { GroupedSectionData, SectionData } from '../output/types';
import { DatabaseManager } from '../storage/DatabaseManager';
import { SymbolRegistryManager } from '../storage/SymbolRegistryManager';
import type { SymbolRegistryEntry } from '../types/registry';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * Command for finding methods by qualified name
 *
 * @public
 * @responsibility Search for methods/functions by qualified name
 * @contract Searches registry, displays matches with details
 * @doc [[FindMethodCommand]]
 * @doc [[CLI Commands]]
 * @doc [[CLI Commands#find-method]]
 * @sideEffect console: Writes matched method details to stdout; reads `.tsdoc.db` and symbol registry
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
    return `tsdoc-edge symbol find-method <qualified-name>

  Examples:
    tsdoc-edge symbol find-method DataProcessor#loadCSV
    tsdoc-edge symbol find-method UserService.validateEmail
    tsdoc-edge symbol find-method processData`;
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(() => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const invalid = this.validateAllowedFlags(args, ['--json', '--xml']);
      if (invalid) return invalid;
      const query = args.find((arg) => !arg.startsWith('-'));

      if (!query) {
        this.printError('Usage: tsdoc-edge symbol find-method <qualified-name>');
        console.log();
        console.log('Examples:');
        this.printInfo('  tsdoc-edge symbol find-method DataProcessor#loadCSV');
        this.printInfo('  tsdoc-edge symbol find-method UserService.validateEmail');
        this.printInfo('  tsdoc-edge symbol find-method processData');
        console.log();
        return this.failure('Query required');
      }

      const registryPath = path.join(process.cwd(), '.tsdoc', 'registry.jsonl');
      const manager =
        this.manager ||
        (fs.existsSync(registryPath) ? new SymbolRegistryManager(registryPath) : null);

      this.printHeader(`Search: ${query}`);

      // Try registry first if available
      if (manager) {
        const entry = manager.findByQualifiedName(query);
        if (entry) {
          if (this.hasFlag(args, '--json')) {
            console.log(JSON.stringify(entry, null, 2));
            return this.success();
          }
          if (this.hasFlag(args, '--xml')) {
            this.printStructured(
              'find-method',
              {
                symbol: {
                  id: entry.id,
                  name: entry.sourceRef.qualifiedName || entry.sourceRef.symbolName,
                  file: entry.sourceRef.filePath,
                  line: entry.sourceRef.line || 0,
                  type: entry.sourceRef.type || 'unknown',
                },
              },
              args
            );
            return this.success();
          }
          return this.displayRegistryEntry(entry, manager);
        }

        const results = manager.search(query);
        if (results.length > 0) {
          if (this.hasFlag(args, '--json')) {
            console.log(JSON.stringify(results, null, 2));
            return this.success();
          }
          if (this.hasFlag(args, '--xml')) {
            this.printStructured(
              'find-method',
              {
                matches: results.map((item) => ({
                  id: item.id,
                  name: item.sourceRef.qualifiedName || item.sourceRef.symbolName,
                  file: item.sourceRef.filePath,
                  line: item.sourceRef.line || 0,
                  type: item.sourceRef.type || 'unknown',
                })),
              },
              args
            );
            return this.success();
          }
          return this.displayRegistryResults(results, manager);
        }
      }

      // Fall back to database search
      return this.findFromDatabase(query, args);
    });
  }

  private displayRegistryEntry(
    entry: SymbolRegistryEntry,
    manager: SymbolRegistryManager
  ): CommandResult {
    const displayName = entry.sourceRef.qualifiedName || entry.sourceRef.symbolName || entry.id;
    console.log(`${colors.bold}${entry.id}${colors.reset} → ${displayName}`);
    console.log();
    console.log(`File:       ${entry.sourceRef.filePath}`);
    console.log(`Line:       ${entry.sourceRef.line || 'unknown'}`);
    console.log(`Type:       ${entry.sourceRef.type}`);
    console.log(`Depth:      ${entry.sourceRef.depth}`);

    if (entry.sourceRef.memberOf) {
      const parent = manager.findById(entry.sourceRef.memberOf);
      const parentName =
        parent?.sourceRef.qualifiedName || parent?.sourceRef.symbolName || parent?.id;
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

  private displayRegistryResults(
    results: SymbolRegistryEntry[],
    manager: SymbolRegistryManager
  ): CommandResult {
    if (results.length === 1) {
      return this.displayRegistryEntry(results[0], manager);
    }

    console.log(`Found ${colors.bold}${results.length}${colors.reset} matching symbols:`);
    console.log();

    for (const result of results) {
      const displayName =
        result.sourceRef.qualifiedName || result.sourceRef.symbolName || result.id;
      console.log(`${colors.bold}${result.id}${colors.reset} → ${displayName}`);
      console.log(`  File: ${result.sourceRef.filePath}:${result.sourceRef.line || '?'}`);
      console.log(`  Type: ${result.sourceRef.type}`);
      console.log();
    }
    return this.success();
  }

  private printStructured(
    rootTag: string,
    sections: Record<string, SectionData | GroupedSectionData>,
    args: string[]
  ): void {
    if (this.hasFlag(args, '--json')) {
      console.log(JSON.stringify(sections, null, 2));
      return;
    }
    this.printOutput(rootTag, sections, args);
  }

  private findFromDatabase(query: string, args: string[] = []): CommandResult {
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
      if (this.hasFlag(args, '--xml')) {
        const matches = dbManager.findMethodsByNamePart(query);
        this.printOutput(
          'find-method',
          {
            matches: matches.map((match) => ({
              id: match.id,
              name: match.name,
              file: match.file_path,
              line: match.line,
              type: match.type,
            })),
          },
          args
        );
        return this.success();
      }
      // First try dedicated method search
      let methodMatches = dbManager.findMethodsByNamePart(query);

      // Fall back to general pattern search if no methods found
      if (methodMatches.length === 0) {
        const allMatches = dbManager.findSymbolsByNamePattern(query);

        // Filter to only methods and functions
        methodMatches = allMatches.filter((s) => ['method', 'function'].includes(s.type));

        // If still no methods, show all matching symbols
        if (methodMatches.length === 0 && allMatches.length > 0) {
          if (this.hasFlag(args, '--json')) {
            console.log(JSON.stringify(allMatches, null, 2));
            return this.success();
          }
          console.log(`Found ${colors.bold}${allMatches.length}${colors.reset} matching symbols:`);
          console.log();

          for (const match of allMatches.slice(0, 20)) {
            console.log(`${colors.bold}${match.id}${colors.reset} → ${match.name}`);
            console.log(`  File: ${match.file_path}:${match.line}`);
            console.log(`  Type: ${match.type}`);
            console.log();
          }
          return this.success();
        }
      }

      if (methodMatches.length === 0) {
        if (this.hasFlag(args, '--json')) {
          console.log(JSON.stringify([], null, 2));
          return this.success();
        }
        console.log(`${colors.yellow}No methods found${colors.reset}`);
        console.log();
        return this.success();
      }

      if (methodMatches.length === 1) {
        const match = methodMatches[0];
        const symbol = dbManager.getSymbol(match.id);
        if (symbol) {
          if (this.hasFlag(args, '--json')) {
            console.log(JSON.stringify(symbol, null, 2));
            return this.success();
          }
          console.log(`${colors.bold}${symbol.id}${colors.reset} → ${symbol.name}`);
          console.log();
          console.log(`File:       ${symbol.filePath}`);
          console.log(`Line:       ${symbol.line}`);
          console.log(`Type:       ${symbol.type}`);
          console.log(`Exported:   ${symbol.isExported ? 'Yes' : 'No'}`);
          if (symbol.summary) {
            console.log(
              `Summary:    ${symbol.summary.substring(0, 80)}${symbol.summary.length > 80 ? '...' : ''}`
            );
          }
          console.log();
        }
        return this.success();
      }

      if (this.hasFlag(args, '--json')) {
        console.log(JSON.stringify(methodMatches, null, 2));
        return this.success();
      }
      console.log(
        `Found ${colors.bold}${methodMatches.length}${colors.reset} matching methods/functions:`
      );
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
