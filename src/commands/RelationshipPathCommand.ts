/**
 * Optimized Relationship Path Command
 *
 * @doc [[Relationship Path]]
 * @packageDocumentation
 */

import { GraphService, type PathSearchResult, type SymbolPath } from '../graph/GraphService';
import { DatabaseManager } from '../storage/DatabaseManager';
import { BaseCommand, type CommandResult } from './BaseCommand';

/** Everything one path search found, independent of how it is printed */
interface PathReport {
  fromSymbol: string;
  toSymbol: string;
  options: { maxLength: number; limit: number; category?: string; shortestOnly: boolean };
  search: PathSearchResult;
  /** All paths found, sorted */
  paths: SymbolPath[];
  /** The paths to show after --shortest-only and --limit */
  displayPaths: SymbolPath[];
}

/**
 * Optimized command for finding paths between symbols
 * @public
 */
export class RelationshipPathCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'relationship-path';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Find connection paths between two symbols';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge relationship-path <from-symbol> <to-symbol> [options]

Finds all paths connecting two symbols through the relationship graph.

Options:
  --max-length <n>      Maximum path length (default: 5)
  --limit <n>           Maximum number of paths to show (default: 10)
  --category <cat>      Filter by relationship category
  --shortest-only       Show only shortest paths
  --human               Output in human-readable format (default: XML)

Examples:
  # Find how BuildCommand connects to DatabaseManager
  tsdoc-edge relationship-path class-buildcommand class-databasemanager

  # Find short paths only
  tsdoc-edge relationship-path class-buildcommand class-databasemanager --max-length 3

  # Find shortest paths only
  tsdoc-edge relationship-path class-buildcommand class-databasemanager --shortest-only

  # Filter by category
  tsdoc-edge relationship-path class-buildcommand class-databasemanager --category structural`;
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      if (args.length < 2) {
        this.printError('Two symbol IDs required: <from-symbol> <to-symbol>');
        console.log();
        return this.displayHelp();
      }

      const fromSymbol = args[0];
      const toSymbol = args[1];

      const options = {
        maxLength: Number.parseInt(this.getOption(args, '--max-length') || '5', 10),
        limit: Number.parseInt(this.getOption(args, '--limit') || '10', 10),
        category: this.getOption(args, '--category'),
        shortestOnly: args.includes('--shortest-only'),
      };

      const isHuman = this.hasFlag(args, '--human');
      if (isHuman) {
        this.printHeader(`Paths: ${fromSymbol} → ${toSymbol}`);
      }

      const dbPath = this.getDatabasePath();
      const dbManager = new DatabaseManager(dbPath);

      // Resolve both symbols by ID or name
      const fromResolved = this.resolveSymbol(dbManager, fromSymbol, { quiet: !isHuman });
      const toResolved = this.resolveSymbol(dbManager, toSymbol, { quiet: !isHuman });

      if (!fromResolved) {
        this.printError(`Source symbol not found: ${fromSymbol}`);
        dbManager.close();
        return { success: false, message: 'Source symbol not found', exitCode: 1 };
      }

      if (!toResolved) {
        this.printError(`Target symbol not found: ${toSymbol}`);
        dbManager.close();
        return { success: false, message: 'Target symbol not found', exitCode: 1 };
      }

      const resolvedFromSymbol = fromResolved.id;
      const resolvedToSymbol = toResolved.id;

      const search = new GraphService(dbManager).findPaths(resolvedFromSymbol, resolvedToSymbol, {
        maxLength: options.maxLength,
        category: options.category,
      });
      dbManager.close();

      // Sort paths by length and strength
      const paths = search.paths;
      paths.sort((a, b) => {
        if (a.length !== b.length) return a.length - b.length;
        return b.strength - a.strength;
      });

      // Filter if shortest only
      let displayPaths = paths;
      if (options.shortestOnly && paths.length > 0) {
        const shortestLength = paths[0].length;
        displayPaths = paths.filter((p) => p.length === shortestLength);
      }

      // Limit number of paths
      displayPaths = displayPaths.slice(0, options.limit);

      const report: PathReport = {
        fromSymbol: resolvedFromSymbol,
        toSymbol: resolvedToSymbol,
        options,
        search,
        paths,
        displayPaths,
      };
      if (isHuman) {
        this.printHuman(report);
      } else {
        this.printXml(report);
      }

      if (paths.length === 0) {
        return this.success('Search complete');
      }
      return this.success(
        `Found ${paths.length} path(s) between ${fromResolved.symbol.name} and ${toResolved.symbol.name}`
      );
    });
  }

  /** Print the colored terminal report. */
  private printHuman(report: PathReport): void {
    const { options, search, paths, displayPaths } = report;
    const { buildTimeMs: buildTime, searchTimeMs: searchTime } = search;

    console.log();
    this.printInfo(`Building relationship graph...`);
    this.printInfo(`Graph built in ${buildTime}ms (${search.nodeCount} nodes)`);

    console.log();
    this.printInfo(`Searching for paths (max length: ${options.maxLength})...`);

    if (search.iterationLimitReached) {
      console.warn(
        `  Warning: Search terminated after ${GraphService.MAX_PATH_ITERATIONS} iterations`
      );
    }
    if (search.pathLimitReached) {
      console.warn(`  Warning: Path limit reached (${GraphService.MAX_PATHS} paths found)`);
    }

    this.printInfo(`Search completed in ${searchTime}ms`);
    console.log();

    if (paths.length === 0) {
      this.printInfo('No paths found between these symbols');
      console.log();
      return;
    }

    // Display results
    this.printSection('Connection Paths');
    this.printInfo(`Found ${paths.length} path(s), showing ${displayPaths.length}`);
    console.log();

    for (let i = 0; i < displayPaths.length; i++) {
      const pathData = displayPaths[i];
      const strengthBar = '█'.repeat(Math.round(pathData.strength * 10));

      console.log(
        `  ${this.colors.bold}Path ${i + 1}${this.colors.reset} (length: ${pathData.length}, strength: ${strengthBar})`
      );
      console.log();

      for (let j = 0; j < pathData.nodes.length; j++) {
        const node = pathData.nodes[j];

        if (j === 0) {
          console.log(`    ${this.colors.cyan}${node.symbolId}${this.colors.reset}`);
        } else {
          const prevNode = pathData.nodes[j - 1];
          console.log(
            `      ${this.colors.dim}↓ ${prevNode.relationshipType} (${prevNode.category})${this.colors.reset}`
          );
          console.log(`    ${this.colors.cyan}${node.symbolId}${this.colors.reset}`);
        }
      }
      console.log();
    }

    // Statistics
    console.log();
    this.printSection('Path Statistics');

    const avgLength = paths.reduce((sum, p) => sum + p.length, 0) / paths.length;
    const shortestLength = paths[0].length;
    const longestLength = paths[paths.length - 1].length;

    console.log(`  Total paths found: ${this.colors.cyan}${paths.length}${this.colors.reset}`);
    console.log(`  Shortest path: ${this.colors.cyan}${shortestLength}${this.colors.reset} hops`);
    console.log(`  Longest path: ${this.colors.cyan}${longestLength}${this.colors.reset} hops`);
    console.log(
      `  Average length: ${this.colors.cyan}${avgLength.toFixed(1)}${this.colors.reset} hops`
    );
    console.log(`  Build time: ${this.colors.cyan}${buildTime}ms${this.colors.reset}`);
    console.log(`  Search time: ${this.colors.cyan}${searchTime}ms${this.colors.reset}`);
    console.log();

    const categoryCount = this.countCategories(paths);
    if (categoryCount.size > 0) {
      console.log(`  ${this.colors.dim}Categories used:${this.colors.reset}`);
      for (const [category, count] of Array.from(categoryCount.entries()).sort(
        (a, b) => b[1] - a[1]
      )) {
        console.log(`    ${category}: ${this.colors.cyan}${count}${this.colors.reset} connections`);
      }
      console.log();
    }
  }

  /** Print the machine-readable XML report. */
  private printXml(report: PathReport): void {
    const { options, search, paths, displayPaths } = report;

    const lengths = paths.map((p) => p.length);
    this.printOutput(
      'relationship-path',
      {
        query: {
          from: report.fromSymbol,
          to: report.toSymbol,
          maxLength: options.maxLength,
          limit: options.limit,
          shortestOnly: options.shortestOnly,
          ...(options.category ? { category: options.category } : {}),
        },
        summary: {
          totalPaths: paths.length,
          shownPaths: displayPaths.length,
          shortestLength: paths.length > 0 ? Math.min(...lengths) : 0,
          longestLength: paths.length > 0 ? Math.max(...lengths) : 0,
          averageLength:
            paths.length > 0 ? (lengths.reduce((a, b) => a + b, 0) / paths.length).toFixed(1) : 0,
          graphNodes: search.nodeCount,
          buildTimeMs: search.buildTimeMs,
          searchTimeMs: search.searchTimeMs,
          iterationLimitReached: search.iterationLimitReached,
          pathLimitReached: search.pathLimitReached,
        },
        paths: displayPaths.map((pathData) => ({
          length: pathData.length,
          strength: pathData.strength.toFixed(4),
          nodes: pathData.nodes.map((node) => ({
            symbolId: node.symbolId,
            // The relationship leaves this node towards the next one; the last node has none.
            ...(node.relationshipType ? { relationshipType: node.relationshipType } : {}),
            ...(node.category ? { category: node.category } : {}),
          })),
        })),
        categories: Array.from(this.countCategories(paths).entries())
          .sort((a, b) => b[1] - a[1])
          .map(([category, connections]) => ({ category, connections })),
      },
      []
    );
  }

  /** Count how often each relationship category appears across the given paths. */
  private countCategories(paths: readonly SymbolPath[]): Map<string, number> {
    const categoryCount = new Map<string, number>();
    for (const pathData of paths) {
      for (const node of pathData.nodes) {
        if (node.category) {
          categoryCount.set(node.category, (categoryCount.get(node.category) || 0) + 1);
        }
      }
    }
    return categoryCount;
  }

  private get colors() {
    return {
      reset: '\x1b[0m',
      bold: '\x1b[1m',
      dim: '\x1b[2m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m',
      red: '\x1b[31m',
    };
  }
}
