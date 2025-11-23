/**
 * Context Command - Relationship-based context discovery
 * @packageDocumentation
 * @responsibility Display comprehensive relationship context for any symbol
 *
 * @problem Developers need quick access to all related information for a symbol
 * @solves Uses relationship graph to show documentation, tests, dependencies, semantic neighbors
 * @context SSOT principle: Single query provides all necessary context through relationships
 *
 * @doc [[ContextCommand]]
 */

import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { ConfigManager } from '../config/ConfigManager';
import { DatabaseManager } from '../storage/DatabaseManager';
import { RelationshipQueryEngine } from '../query/RelationshipQueryEngine';

/**
 * Context Command
 *
 * Shows all relationships and context for a symbol using the relationship graph.
 *
 * @public
 * @example
 * ```bash
 * # Get context for a class
 * tsdoc-edge context class-databasemanager
 *
 * # Get context with depth
 * tsdoc-edge context class-databasemanager --depth 2
 *
 * # Get context filtered by type
 * tsdoc-edge context class-databasemanager --type doc-reference,test-coverage
 * ```
 */
export class ContextCommand extends BaseCommand {
  protected configManager = ConfigManager.getInstance();

  getName(): string {
    return 'context';
  }

  getDescription(): string {
    return 'Show comprehensive relationship context for a symbol';
  }

  /**
   * Execute context command
   *
   * @param args - Command arguments
   * @returns Command result
   */
  async execute(args: string[]): Promise<CommandResult> {
    if (args.length < 1) {
      console.log(`${colors.yellow}Usage:${colors.reset} tsdoc-edge context <symbol-id> [options]`);
      console.log();
      console.log('Options:');
      console.log('  --depth <n>          Traverse N hops (default: 1)');
      console.log('  --type <types>       Filter by relationship types (comma-separated)');
      console.log('  --category <cats>    Filter by categories (comma-separated)');
      console.log('  --min-confidence <n> Minimum confidence (0-1)');
      console.log();
      console.log('Examples:');
      console.log('  tsdoc-edge context class-databasemanager');
      console.log('  tsdoc-edge context class-databasemanager --depth 2');
      console.log('  tsdoc-edge context class-databasemanager --type doc-reference,test-coverage');
      return { exitCode: 1, message: 'Symbol ID required' };
    }

    const symbolId = args[0];

    // Parse options
    const options = this.parseOptions(args.slice(1));

    console.log();
    this.printSection(`Context: ${symbolId}`);
    console.log();

    try {
      const config = this.configManager.get();
      const dbPath = config.paths.databasePath;
      const dbManager = new DatabaseManager(dbPath, config.paths.jsonlDir);

      // Check if symbol exists
      const symbol = dbManager.getSymbol(symbolId);
      if (!symbol) {
        this.printError(`Symbol not found: ${symbolId}`);
        dbManager.close();
        return { exitCode: 1, message: 'Symbol not found' };
      }

      // Display symbol info
      console.log(`  ${colors.bold}Symbol:${colors.reset}     ${symbol.name}`);
      console.log(`  ${colors.bold}Type:${colors.reset}       ${symbol.type}`);
      console.log(`  ${colors.bold}Location:${colors.reset}   ${symbol.filePath}:${symbol.line}`);
      console.log(`  ${colors.bold}Exported:${colors.reset}   ${symbol.isExported ? 'Yes' : 'No'}`);
      console.log(`  ${colors.bold}Public:${colors.reset}     ${symbol.isPublic ? 'Yes' : 'No'}`);
      console.log();

      // Query relationships
      const engine = new RelationshipQueryEngine(dbManager);
      const context = engine.getContext(symbolId, {
        maxDepth: options.depth,
        types: options.types,
        categories: options.categories,
        minConfidence: options.minConfidence,
      });

      // Display statistics
      const stats = engine.getStatistics(symbolId);
      console.log(`  ${colors.bold}Relationships:${colors.reset} ${stats.total} direct`);
      console.log();

      // Documentation
      if (context.documentation.length > 0) {
        this.printSection('📄 Documentation');
        context.documentation.forEach(doc => {
          const docName = doc.replace('doc:', '');
          console.log(`  ${colors.cyan}[[${docName}]]${colors.reset}`);
        });
        console.log();
      }

      // Tests
      if (context.tests.length > 0) {
        this.printSection('✅ Test Coverage');
        const testFiles = new Set<string>();
        const tests = context.tests.slice(0, 10); // Show first 10

        for (const testId of tests) {
          const testSymbol = dbManager.getSymbol(testId);
          if (testSymbol) {
            const fileName = testSymbol.filePath.split('/').pop() || testSymbol.filePath;
            testFiles.add(fileName);
            console.log(`  ${colors.green}${testSymbol.name}${colors.reset} (${fileName})`);
          }
        }

        if (context.tests.length > 10) {
          console.log(`  ${colors.dim}... and ${context.tests.length - 10} more tests${colors.reset}`);
        }

        console.log();
        console.log(`  ${colors.dim}Test files: ${testFiles.size}${colors.reset}`);
        console.log();
      }

      // Dependencies
      if (context.dependencies.length > 0) {
        this.printSection('📦 Dependencies');
        const deps = context.dependencies.slice(0, 15); // Show first 15

        for (const depId of deps) {
          const depSymbol = dbManager.getSymbol(depId);
          if (depSymbol) {
            console.log(`  ${colors.blue}${depSymbol.name}${colors.reset} (${depSymbol.type})`);
          } else {
            // External dependency
            console.log(`  ${colors.dim}${depId}${colors.reset}`);
          }
        }

        if (context.dependencies.length > 15) {
          console.log(`  ${colors.dim}... and ${context.dependencies.length - 15} more${colors.reset}`);
        }
        console.log();
      }

      // Semantic neighbors
      if (context.semanticNeighbors.length > 0) {
        this.printSection('🔗 Semantic Neighbors');
        const neighbors = context.semanticNeighbors.slice(0, 10);

        for (const neighborId of neighbors) {
          const neighborSymbol = dbManager.getSymbol(neighborId);
          if (neighborSymbol) {
            console.log(`  ${colors.cyan}${neighborSymbol.name}${colors.reset} (${neighborSymbol.type})`);
          }
        }

        if (context.semanticNeighbors.length > 10) {
          console.log(`  ${colors.dim}... and ${context.semanticNeighbors.length - 10} more${colors.reset}`);
        }
        console.log();
      }

      // Relationship breakdown
      this.printSection('📊 Relationship Breakdown');
      console.log();
      console.log(`  ${'Type'.padEnd(30)} ${'Count'.padStart(6)}`);
      console.log(`  ${'-'.repeat(38)}`);

      const sortedTypes = Object.entries(stats.byType).sort((a, b) => b[1] - a[1]);
      for (const [type, count] of sortedTypes) {
        console.log(`  ${type.padEnd(30)} ${count.toString().padStart(6)}`);
      }

      console.log();
      console.log(`  ${'Category'.padEnd(30)} ${'Count'.padStart(6)}`);
      console.log(`  ${'-'.repeat(38)}`);

      const sortedCategories = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]);
      for (const [category, count] of sortedCategories) {
        console.log(`  ${category.padEnd(30)} ${count.toString().padStart(6)}`);
      }

      console.log();

      // Multi-hop traversal
      if (options.depth && options.depth > 1) {
        this.printSection(`🌐 ${options.depth}-Hop Neighborhood`);
        const traversal = engine.traverse(symbolId, {
          maxDepth: options.depth,
          types: options.types,
          categories: options.categories,
          minConfidence: options.minConfidence,
        });

        // Group by depth
        const byDepth = new Map<number, string[]>();
        for (const [sym, depth] of traversal) {
          if (sym === symbolId) continue;
          if (!byDepth.has(depth)) byDepth.set(depth, []);
          byDepth.get(depth)!.push(sym);
        }

        for (let d = 1; d <= options.depth; d++) {
          const symbols = byDepth.get(d) || [];
          console.log(`  ${colors.bold}${d} hop${d > 1 ? 's' : ''}:${colors.reset} ${symbols.length} symbols`);
        }

        console.log();
        console.log(`  ${colors.dim}Total reachable: ${traversal.size - 1} symbols${colors.reset}`);
        console.log();
      }

      dbManager.close();

      return { exitCode: 0, message: 'Context displayed' };
    } catch (error) {
      this.printError(`Failed to get context: ${error instanceof Error ? error.message : String(error)}`);
      return { exitCode: 1, message: 'Failed to get context' };
    }
  }

  /**
   * Parse command-line options
   * @private
   */
  private parseOptions(args: string[]): {
    depth?: number;
    types?: any[];
    categories?: any[];
    minConfidence?: number;
  } {
    const options: any = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === '--depth' && i + 1 < args.length) {
        options.depth = parseInt(args[i + 1], 10);
        i++;
      } else if (arg === '--type' && i + 1 < args.length) {
        options.types = args[i + 1].split(',');
        i++;
      } else if (arg === '--category' && i + 1 < args.length) {
        options.categories = args[i + 1].split(',');
        i++;
      } else if (arg === '--min-confidence' && i + 1 < args.length) {
        options.minConfidence = parseFloat(args[i + 1]);
        i++;
      }
    }

    return options;
  }
}
