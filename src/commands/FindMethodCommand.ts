/**
 * Find Method Command - Find methods/functions by qualified name
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { DatabaseManager, type SymbolRow } from '../storage/DatabaseManager';
import { SymbolRegistryManager } from '../storage/SymbolRegistryManager';
import type { SymbolRegistryEntry } from '../types/registry';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * Per-invocation search state shared by the display helpers
 */
interface SearchContext {
  query: string;
  isHuman: boolean;
  args: string[];
}

/**
 * Drop `undefined` fields: the XML writer renders them as empty elements, which would be
 * indistinguishable from an intentionally empty value.
 */
function definedFields(fields: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
}

/**
 * Map a database symbol row to an XML search match
 */
function toSearchMatch(row: SymbolRow): Record<string, unknown> {
  return {
    id: row.id,
    name: row.name,
    filePath: row.file_path,
    line: row.line,
    type: row.type,
  };
}

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
    return `tsdoc-edge find-method <qualified-name> [options]

  Options:
    --human          Output in human-readable format (default: XML)

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

      const isHuman = this.hasFlag(args, '--human');
      // `--human` is a boolean flag, so it must not be mistaken for the query
      const query = args.filter((arg) => arg !== '--human')[0];

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
      const manager =
        this.manager ||
        (fs.existsSync(registryPath) ? new SymbolRegistryManager(registryPath) : null);

      if (isHuman) {
        this.printHeader(`Search: ${query}`);
      }

      const ctx: SearchContext = { query, isHuman, args };

      // Try registry first if available
      if (manager) {
        const entry = manager.findByQualifiedName(query);
        if (entry) {
          return this.displayRegistryEntry(entry, manager, ctx);
        }

        const results = manager.search(query);
        if (results.length > 0) {
          return this.displayRegistryResults(results, manager, ctx);
        }
      }

      // Fall back to database search
      return this.findFromDatabase(ctx);
    });
  }

  private displayRegistryEntry(
    entry: SymbolRegistryEntry,
    manager: SymbolRegistryManager,
    ctx: SearchContext
  ): CommandResult {
    const displayName = entry.sourceRef.qualifiedName || entry.sourceRef.symbolName || entry.id;

    if (!ctx.isHuman) {
      const parent = entry.sourceRef.memberOf
        ? manager.findById(entry.sourceRef.memberOf)
        : undefined;

      this.printSearchXml(ctx, 'registry', 'symbols', [
        definedFields({
          id: entry.id,
          name: displayName,
          filePath: entry.sourceRef.filePath,
          line: entry.sourceRef.line,
          type: entry.sourceRef.type,
          depth: entry.sourceRef.depth,
          parent: entry.sourceRef.memberOf,
          parentName: parent
            ? parent.sourceRef.qualifiedName || parent.sourceRef.symbolName || parent.id
            : undefined,
          memberType: entry.sourceRef.memberType,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          tags: entry.tags,
          children: manager.getChildren(entry.id).map((child) => ({
            id: child.id,
            name: child.sourceRef.qualifiedName || child.sourceRef.symbolName || child.id,
          })),
        }),
      ]);
      return this.success();
    }

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
    manager: SymbolRegistryManager,
    ctx: SearchContext
  ): CommandResult {
    if (results.length === 1) {
      return this.displayRegistryEntry(results[0], manager, ctx);
    }

    if (!ctx.isHuman) {
      this.printSearchXml(
        ctx,
        'registry',
        'symbols',
        results.map((result) =>
          definedFields({
            id: result.id,
            name: result.sourceRef.qualifiedName || result.sourceRef.symbolName || result.id,
            filePath: result.sourceRef.filePath,
            line: result.sourceRef.line,
            type: result.sourceRef.type,
          })
        )
      );
      return this.success();
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

  private async findFromDatabase(ctx: SearchContext): Promise<CommandResult> {
    const { query } = ctx;
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
      // First try dedicated method search
      let methodMatches = dbManager.findMethodsByNamePart(query);

      // Fall back to general pattern search if no methods found
      if (methodMatches.length === 0) {
        const allMatches = dbManager.findSymbolsByNamePattern(query);

        // Filter to only methods and functions
        methodMatches = allMatches.filter((s) => ['method', 'function'].includes(s.type));

        // If still no methods, show all matching symbols
        if (methodMatches.length === 0 && allMatches.length > 0) {
          if (!ctx.isHuman) {
            this.printSearchXml(ctx, 'database', 'symbols', allMatches.map(toSearchMatch));
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
        if (!ctx.isHuman) {
          this.printSearchXml(ctx, 'database', 'methods', []);
          return this.success();
        }

        console.log(`${colors.yellow}No methods found${colors.reset}`);
        console.log();
        return this.success();
      }

      if (methodMatches.length === 1) {
        const match = methodMatches[0];
        const symbol = dbManager.getSymbol(match.id);
        if (!ctx.isHuman) {
          this.printSearchXml(
            ctx,
            'database',
            'methods',
            symbol
              ? [
                  definedFields({
                    id: symbol.id,
                    name: symbol.name,
                    filePath: symbol.filePath,
                    line: symbol.line,
                    type: symbol.type,
                    exported: symbol.isExported,
                    summary: symbol.summary,
                  }),
                ]
              : []
          );
          return this.success();
        }
        if (symbol) {
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

      if (!ctx.isHuman) {
        this.printSearchXml(ctx, 'database', 'methods', methodMatches.map(toSearchMatch));
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

  /**
   * Print the default XML document. One root tag for every outcome so consumers
   * need not branch on the shape: `summary` says where the matches came from and
   * `matches` is empty when nothing was found.
   *
   * @param source - Where the matches came from
   * @param scope - Whether the matches are restricted to methods/functions
   * @private
   */
  private printSearchXml(
    ctx: SearchContext,
    source: 'registry' | 'database',
    scope: 'methods' | 'symbols',
    matches: Array<Record<string, unknown>>
  ): void {
    this.printOutput(
      'method-search',
      {
        summary: {
          query: ctx.query,
          source,
          scope,
          totalMatches: matches.length,
        },
        matches,
      },
      ctx.args
    );
  }
}
