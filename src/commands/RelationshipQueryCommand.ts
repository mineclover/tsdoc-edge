/**
 * Relationship Query Command
 * @packageDocumentation
 */

import { BaseCommand, type CommandResult } from './BaseCommand';
import { CanonicalAliasContext } from '../indexer';
import { DatabaseManager, type UnifiedRelationshipRow } from '../storage/DatabaseManager';

/**
 * Command for querying symbol relationships
 * @doc [[RelationshipQueryCommand]]
 * @public
 */
export class RelationshipQueryCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'relationship-query';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Query relationships for a specific symbol';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge relationship-query <symbol-id> [options]

Options:
  --type <type>         Filter by relationship type
  --category <category> Filter by category
  --direction <dir>     Filter by direction: from, to, both (default: both)
  --limit <n>           Limit results (default: 50)

Examples:
  tsdoc-edge relationship-query build-command
  tsdoc-edge relationship-query build-command --category behavioral
  tsdoc-edge relationship-query build-command --type collaboration
  tsdoc-edge relationship-query build-command --direction from`;
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

      // Filter out flags to get positional arguments
      const positionalArgs = args.filter(arg => !arg.startsWith('--'));
      if (positionalArgs.length === 0) {
        this.printError('Symbol ID required');
        console.log();
        return this.displayHelp();
      }

      let symbolId = positionalArgs[0];

      // Parse options
      const options = {
        type: this.getOption(args, '--type'),
        category: this.getOption(args, '--category'),
        direction: this.getOption(args, '--direction') || 'both',
        limit: Number.parseInt(this.getOption(args, '--limit') || '50', 10),
      };

      const dbPath = this.getDatabasePath();
      const dbManager = new DatabaseManager(dbPath);
      const canonicalContext = CanonicalAliasContext.tryOpen(process.cwd());

      // Resolve symbol name to ID if needed
      const resolved = this.resolveSymbol(dbManager, symbolId);
      if (resolved) {
        symbolId = resolved.id;
      }
      const canonicalId = canonicalContext?.resolveCanonicalId(symbolId) ?? null;
      const canonicalStructural = canonicalId
        ? {
            canonicalId,
            dependencies: canonicalContext!
              .analysis.dependencies(canonicalId, { external: 'exclude' })
              .map((neighbor) => neighbor.node.id),
            dependents: canonicalContext!
              .analysis.dependents(canonicalId, { external: 'exclude' })
              .map((neighbor) => neighbor.node.id),
          }
        : null;

      // Use Drizzle ORM to query relationships
      let rels = dbManager.getUnifiedRelationshipsBySymbol(symbolId);

      // Apply filters
      if (options.type) {
        rels = rels.filter(r => r.type === options.type);
      }
      if (options.category) {
        rels = rels.filter(r => r.category === options.category);
      }

      // Apply limit
      rels = rels.slice(0, options.limit);

      // Convert to row format for compatibility
      const relationships = rels.map(r => ({
        id: r.id,
        type: r.type,
        category: r.category,
        from_symbols: JSON.stringify(Array.isArray(r.from) ? r.from : [r.from]),
        to_symbols: JSON.stringify(Array.isArray(r.to) ? r.to : [r.to]),
        direction: r.direction,
        strength: r.strength,
        evidence: JSON.stringify(r.evidence),
        discovered_by: r.discoveredBy,
        confidence: r.confidence,
        file_path: r.filePath ?? null,
        line: r.line ?? null,
        properties: r.properties ? JSON.stringify(r.properties) : null,
        created_at: r.createdAt,
        updated_at: r.updatedAt,
        description: r.description ?? null,
      })) as UnifiedRelationshipRow[];

      if (relationships.length === 0) {
        if (this.hasFlag(args, '--human')) {
          this.printHeader(`Relationships for: ${symbolId}`);
          this.printInfo('No relationships found');
          console.log();
        } else {
          this.printOutput('relationship-query', {
            query: {
              symbolId,
              type: options.type || 'all',
              category: options.category || 'all',
              direction: options.direction,
              limit: options.limit,
            },
            results: {
              totalFound: 0,
            },
            message: {
              text: 'No relationships found',
            },
          }, args);
        }
        dbManager.close();
        canonicalContext?.close();
        return this.success('Query complete');
      }

      // Filter by direction
      const filteredRels = relationships.filter((rel) => {
        const fromSymbols = JSON.parse(rel.from_symbols);
        const toSymbols = JSON.parse(rel.to_symbols);

        const isFrom = fromSymbols.includes(symbolId);
        const isTo = toSymbols.includes(symbolId);

        if (options.direction === 'from') return isFrom;
        if (options.direction === 'to') return isTo;
        return isFrom || isTo; // both
      });

      if (filteredRels.length === 0) {
        if (this.hasFlag(args, '--human')) {
          this.printHeader(`Relationships for: ${symbolId}`);
          this.printInfo(`No relationships found in direction: ${options.direction}`);
          console.log();
        } else {
          this.printOutput('relationship-query', {
            query: {
              symbolId,
              type: options.type || 'all',
              category: options.category || 'all',
              direction: options.direction,
              limit: options.limit,
            },
            results: {
              totalFound: 0,
              afterFiltering: 0,
            },
            message: {
              text: `No relationships found in direction: ${options.direction}`,
            },
          }, args);
        }
        dbManager.close();
        canonicalContext?.close();
        return this.success('Query complete');
      }

      // Group by category
      const byCategory = new Map<string, UnifiedRelationshipRow[]>();
      for (const rel of filteredRels) {
        if (!byCategory.has(rel.category)) {
          byCategory.set(rel.category, []);
        }
        byCategory.get(rel.category)!.push(rel);
      }

      // Build statistics by type
      const byType = new Map<string, number>();
      for (const rel of filteredRels) {
        byType.set(rel.type, (byType.get(rel.type) || 0) + 1);
      }

      if (this.hasFlag(args, '--human')) {
        // Original color output
        this.printHeader(`Relationships for: ${symbolId}`);

        // Display results
        console.log();
        this.printSection('Query Results');
        this.printInfo(`Found ${filteredRels.length} relationships`);
        console.log();

        for (const [category, rels] of byCategory.entries()) {
          console.log(`  ${this.colors.bold}${category}${this.colors.reset} (${rels.length})`);
          console.log();

          for (const rel of rels) {
            const fromSymbols = JSON.parse(rel.from_symbols);
            const toSymbols = JSON.parse(rel.to_symbols);

            const directionSymbol = rel.direction === 'unidirectional' ? '→'
              : rel.direction === 'bidirectional' ? '↔'
              : '—';

            const fromDisplay = fromSymbols.join(', ');
            const toDisplay = toSymbols.join(', ');

            console.log(`    ${this.colors.cyan}${rel.type}${this.colors.reset}`);
            console.log(`    ${fromDisplay} ${directionSymbol} ${toDisplay}`);
            console.log(`    ${this.colors.dim}${rel.description || 'No description'}${this.colors.reset}`);
            console.log(`    ${this.colors.dim}Strength: ${rel.strength}, Confidence: ${rel.confidence}${this.colors.reset}`);
            console.log();
          }
        }

        // Statistics
        console.log();
        this.printSection('Statistics');

        console.log(`  ${this.colors.dim}Relationships by type:${this.colors.reset}`);
        for (const [type, count] of Array.from(byType.entries()).sort((a, b) => b[1] - a[1])) {
          console.log(`    ${type}: ${this.colors.cyan}${count}${this.colors.reset}`);
        }

        if (canonicalStructural) {
          console.log();
          this.printSection('Canonical Structural Graph');
          console.log(`  ${canonicalStructural.canonicalId}`);
          console.log(`  Dependencies: ${canonicalStructural.dependencies.length}`);
          console.log(`  Dependents: ${canonicalStructural.dependents.length}`);
        }

        console.log();
      } else {
        // XML output
        const categoriesData: Record<string, Array<Record<string, unknown>>> = {};

        for (const [category, rels] of byCategory.entries()) {
          categoriesData[category] = rels.map(rel => {
            const fromSymbols = JSON.parse(rel.from_symbols);
            const toSymbols = JSON.parse(rel.to_symbols);

            return {
              id: rel.id,
              type: rel.type,
              from: fromSymbols.join(', '),
              to: toSymbols.join(', '),
              direction: rel.direction,
              strength: rel.strength,
              confidence: rel.confidence,
              description: rel.description || 'No description',
              discoveredBy: rel.discovered_by,
              filePath: rel.file_path || '',
              line: rel.line || '',
            };
          });
        }

        this.printOutput('relationship-query', {
          query: {
            symbolId,
            type: options.type || 'all',
            category: options.category || 'all',
            direction: options.direction,
            limit: options.limit,
          },
          results: {
            totalFound: filteredRels.length,
          },
          categories: categoriesData,
          statistics: {
            byType: Array.from(byType.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => ({ type, count })),
          },
          ...(canonicalStructural ? { canonicalStructural } : {}),
        }, args);
      }

      dbManager.close();
      canonicalContext?.close();

      return this.success(`Found ${filteredRels.length} relationships for ${symbolId}`);
    });
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
