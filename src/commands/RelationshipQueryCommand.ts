/**
 * Relationship Query Command
 * @packageDocumentation
 */

import { BaseCommand, type CommandResult } from './BaseCommand';
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

      if (args.length === 0) {
        this.printError('Symbol ID required');
        console.log();
        return this.displayHelp();
      }

      let symbolId = args[0];

      // Parse options
      const options = {
        type: this.getOption(args, '--type'),
        category: this.getOption(args, '--category'),
        direction: this.getOption(args, '--direction') || 'both',
        limit: Number.parseInt(this.getOption(args, '--limit') || '50', 10),
      };

      const dbPath = this.getDatabasePath();
      const dbManager = new DatabaseManager(dbPath);

      // Resolve symbol name to ID if needed
      const resolved = this.resolveSymbol(dbManager, symbolId);
      if (resolved) {
        symbolId = resolved.id;
      }

      this.printHeader(`Relationships for: ${symbolId}`);

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
        this.printInfo('No relationships found');
        console.log();
        dbManager.close();
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
        this.printInfo(`No relationships found in direction: ${options.direction}`);
        console.log();
        dbManager.close();
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

      const byType = new Map<string, number>();
      for (const rel of filteredRels) {
        byType.set(rel.type, (byType.get(rel.type) || 0) + 1);
      }

      console.log(`  ${this.colors.dim}Relationships by type:${this.colors.reset}`);
      for (const [type, count] of Array.from(byType.entries()).sort((a, b) => b[1] - a[1])) {
        console.log(`    ${type}: ${this.colors.cyan}${count}${this.colors.reset}`);
      }

      console.log();

      dbManager.close();

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
