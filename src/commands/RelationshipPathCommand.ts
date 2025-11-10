/**
 * Relationship Path Command
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

/**
 * Command for finding paths between symbols
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
      this.printInfo(`Searching for paths (max length: ${options.maxLength})...`);
      console.log();

      // Find paths
      const paths = this.findPaths(
        dbManager,
        fromSymbol,
        toSymbol,
        options.maxLength,
        options.category
      );

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
   * Find all paths between two symbols using BFS
   */
  private findPaths(
    dbManager: DatabaseManager,
    fromSymbol: string,
    toSymbol: string,
    maxLength: number,
    category?: string
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

    while (queue.length > 0) {
      const { currentSymbol, path, visited } = queue.shift()!;

      // Check if we've reached the target
      if (currentSymbol === toSymbol && path.length > 1) {
        // Calculate path strength based on relationship confidence
        const strength = this.calculatePathStrength(path);
        allPaths.push({
          nodes: path,
          length: path.length - 1, // Number of hops
          strength,
        });
        continue;
      }

      // Don't expand if we've reached max length
      if (path.length > maxLength) continue;

      // Find all relationships from current symbol
      let sql = `
        SELECT *
        FROM unified_relationships
        WHERE (
          json_extract(from_symbols, '$[0]') = ? OR
          from_symbols LIKE '%"' || ? || '"%'
        )
      `;

      const params: any[] = [currentSymbol, currentSymbol];

      if (category) {
        sql += ' AND category = ?';
        params.push(category);
      }

      const relationships = dbManager.db.prepare(sql).all(...params) as any[];

      for (const rel of relationships) {
        const fromSymbols = JSON.parse(rel.from_symbols);
        const toSymbols = JSON.parse(rel.to_symbols);

        if (fromSymbols.includes(currentSymbol)) {
          for (const nextSymbol of toSymbols) {
            // Avoid cycles
            if (visited.has(nextSymbol) && nextSymbol !== toSymbol) continue;

            const newPath = [
              ...path.slice(0, -1),
              {
                symbolId: path[path.length - 1].symbolId,
                relationshipType: rel.type,
                category: rel.category,
              },
              {
                symbolId: nextSymbol,
                relationshipType: '',
                category: '',
              },
            ];

            const newVisited = new Set(visited);
            newVisited.add(nextSymbol);

            queue.push({
              currentSymbol: nextSymbol,
              path: newPath,
              visited: newVisited,
            });
          }
        }
      }
    }

    return allPaths;
  }

  /**
   * Calculate path strength based on relationship confidence
   */
  private calculatePathStrength(path: PathNode[]): number {
    if (path.length <= 1) return 1.0;

    // For now, use a simple heuristic based on path length
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
