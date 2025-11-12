/**
 * Optimized Relationship Path Command
 * @packageDocumentation
 */

import * as path from 'node:path';
import { BaseCommand, type CommandResult } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';

interface PathNode {
  symbolId: string;
  relationshipType: string;
  category: string;
}

interface SymbolPath {
  nodes: PathNode[];
  length: number;
  strength: number;
}

interface GraphEdge {
  to: string;
  type: string;
  category: string;
}

/**
 * Optimized command for finding paths between symbols
 * @public
 */
export class RelationshipPathCommand extends BaseCommand {
  getName(): string {
    return 'relationship-path';
  }

  getDescription(): string {
    return 'Find connection paths between two symbols';
  }

  protected getUsage(): string {
    return `tsdoc-edge relationship-path <from-symbol> <to-symbol> [options]

Finds all paths connecting two symbols through the relationship graph.

Options:
  --max-length <n>      Maximum path length (default: 5)
  --limit <n>           Maximum number of paths to show (default: 10)
  --category <cat>      Filter by relationship category
  --shortest-only       Show only shortest paths

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

      this.printHeader(`Paths: ${fromSymbol} → ${toSymbol}`);

      const dbPath = path.join(process.cwd(), '.tsdoc', 'symbols.db');
      const dbManager = new DatabaseManager(dbPath);

      // Verify both symbols exist
      const fromExists = dbManager.db
        .prepare('SELECT id FROM symbols WHERE id = ?')
        .get(fromSymbol);
      const toExists = dbManager.db
        .prepare('SELECT id FROM symbols WHERE id = ?')
        .get(toSymbol);

      if (!fromExists) {
        this.printError(`Source symbol not found: ${fromSymbol}`);
        dbManager.close();
        return { success: false, message: 'Source symbol not found', exitCode: 1 };
      }

      if (!toExists) {
        this.printError(`Target symbol not found: ${toSymbol}`);
        dbManager.close();
        return { success: false, message: 'Target symbol not found', exitCode: 1 };
      }

      console.log();
      this.printInfo(`Building relationship graph...`);

      // Build adjacency list once
      const startBuild = Date.now();
      const adjacency = this.buildAdjacencyList(dbManager, options.category);
      const buildTime = Date.now() - startBuild;
      this.printInfo(`Graph built in ${buildTime}ms (${adjacency.size} nodes)`);

      console.log();
      this.printInfo(`Searching for paths (max length: ${options.maxLength})...`);
      const startSearch = Date.now();

      // Find paths using optimized BFS
      const paths = this.findPathsOptimized(
        adjacency,
        fromSymbol,
        toSymbol,
        options.maxLength
      );

      const searchTime = Date.now() - startSearch;
      this.printInfo(`Search completed in ${searchTime}ms`);
      console.log();

      if (paths.length === 0) {
        this.printInfo('No paths found between these symbols');
        console.log();
        dbManager.close();
        return this.success('Search complete');
      }

      // Sort paths by length and strength
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

      // Display results
      this.printSection('Connection Paths');
      this.printInfo(`Found ${paths.length} path(s), showing ${displayPaths.length}`);
      console.log();

      for (let i = 0; i < displayPaths.length; i++) {
        const pathData = displayPaths[i];
        const strengthBar = '█'.repeat(Math.round(pathData.strength * 10));

        console.log(`  ${this.colors.bold}Path ${i + 1}${this.colors.reset} (length: ${pathData.length}, strength: ${strengthBar})`);
        console.log();

        for (let j = 0; j < pathData.nodes.length; j++) {
          const node = pathData.nodes[j];

          if (j === 0) {
            console.log(`    ${this.colors.cyan}${node.symbolId}${this.colors.reset}`);
          } else {
            const prevNode = pathData.nodes[j - 1];
            console.log(`      ${this.colors.dim}↓ ${prevNode.relationshipType} (${prevNode.category})${this.colors.reset}`);
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
      console.log(`  Average length: ${this.colors.cyan}${avgLength.toFixed(1)}${this.colors.reset} hops`);
      console.log(`  Build time: ${this.colors.cyan}${buildTime}ms${this.colors.reset}`);
      console.log(`  Search time: ${this.colors.cyan}${searchTime}ms${this.colors.reset}`);
      console.log();

      // Analyze path categories
      const categoryCount = new Map<string, number>();
      for (const pathData of paths) {
        for (const node of pathData.nodes) {
          if (node.category) {
            categoryCount.set(node.category, (categoryCount.get(node.category) || 0) + 1);
          }
        }
      }

      if (categoryCount.size > 0) {
        console.log(`  ${this.colors.dim}Categories used:${this.colors.reset}`);
        for (const [category, count] of Array.from(categoryCount.entries()).sort((a, b) => b[1] - a[1])) {
          console.log(`    ${category}: ${this.colors.cyan}${count}${this.colors.reset} connections`);
        }
        console.log();
      }

      dbManager.close();

      return this.success(`Found ${paths.length} path(s) between ${fromSymbol} and ${toSymbol}`);
    });
  }

  /**
   * Build adjacency list from database (one-time operation)
   */
  private buildAdjacencyList(
    dbManager: DatabaseManager,
    category?: string
  ): Map<string, GraphEdge[]> {
    const adjacency = new Map<string, GraphEdge[]>();

    // Query all relationships at once
    let sql = 'SELECT from_symbols, to_symbols, type, category FROM unified_relationships';
    const params: any[] = [];

    if (category) {
      sql += ' WHERE category = ?';
      params.push(category);
    }

    const relationships = dbManager.db.prepare(sql).all(...params) as any[];

    for (const rel of relationships) {
      try {
        const fromSymbols = JSON.parse(rel.from_symbols || '[]');
        const toSymbols = JSON.parse(rel.to_symbols || '[]');

        for (const from of fromSymbols) {
          if (!from) continue;

          if (!adjacency.has(from)) {
            adjacency.set(from, []);
          }

          for (const to of toSymbols) {
            if (!to) continue;

            adjacency.get(from)!.push({
              to,
              type: rel.type,
              category: rel.category,
            });
          }
        }
      } catch (error) {
        // Skip malformed relationships
        continue;
      }
    }

    return adjacency;
  }

  /**
   * Find paths using optimized BFS with adjacency list
   */
  private findPathsOptimized(
    adjacency: Map<string, GraphEdge[]>,
    fromSymbol: string,
    toSymbol: string,
    maxLength: number
  ): SymbolPath[] {
    const allPaths: SymbolPath[] = [];
    const queue: Array<{
      currentSymbol: string;
      path: PathNode[];
      visited: Set<string>;
    }> = [
      {
        currentSymbol: fromSymbol,
        path: [{ symbolId: fromSymbol, relationshipType: '', category: '' }],
        visited: new Set([fromSymbol]),
      },
    ];

    // Early termination if no edges from start
    if (!adjacency.has(fromSymbol)) {
      return [];
    }

    let iterations = 0;
    const maxIterations = 100000; // Safety limit

    while (queue.length > 0 && iterations < maxIterations) {
      iterations++;

      const { currentSymbol, path, visited } = queue.shift()!;

      // Check if we've reached the target
      if (currentSymbol === toSymbol && path.length > 1) {
        const strength = this.calculatePathStrength(path);
        allPaths.push({
          nodes: path,
          length: path.length - 1,
          strength,
        });

        // Continue searching for alternative paths
        continue;
      }

      // Don't expand if we've reached max length
      if (path.length > maxLength) continue;

      // Get neighbors from adjacency list (O(1) lookup)
      const neighbors = adjacency.get(currentSymbol);
      if (!neighbors) continue;

      for (const edge of neighbors) {
        // Avoid cycles (except allow reaching target)
        if (visited.has(edge.to) && edge.to !== toSymbol) continue;

        const newPath = [
          ...path.slice(0, -1),
          {
            symbolId: path[path.length - 1].symbolId,
            relationshipType: edge.type,
            category: edge.category,
          },
          {
            symbolId: edge.to,
            relationshipType: '',
            category: '',
          },
        ];

        const newVisited = new Set(visited);
        newVisited.add(edge.to);

        queue.push({
          currentSymbol: edge.to,
          path: newPath,
          visited: newVisited,
        });
      }
    }

    if (iterations >= maxIterations) {
      console.warn(`Warning: Search terminated after ${maxIterations} iterations`);
    }

    return allPaths;
  }

  /**
   * Calculate path strength based on relationship confidence
   */
  private calculatePathStrength(path: PathNode[]): number {
    if (path.length <= 1) return 1.0;
    // Shorter paths = stronger connection
    return 1.0 / path.length;
  }

  private getOption(args: string[], flag: string): string | undefined {
    const index = args.indexOf(flag);
    if (index !== -1 && index + 1 < args.length) {
      return args[index + 1];
    }
    return undefined;
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
