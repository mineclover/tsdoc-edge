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
  getName(): string {
    return 'relationship-query';
  }

  getDescription(): string {
    return 'Query relationships for a specific symbol';
  }

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

      const symbolId = args[0];

      // Parse options
      const options = {
        type: this.getOption(args, '--type'),
        category: this.getOption(args, '--category'),
        direction: this.getOption(args, '--direction') || 'both',
        limit: Number.parseInt(this.getOption(args, '--limit') || '50', 10),
      };

      this.printHeader(`Relationships for: ${symbolId}`);

      const dbPath = this.getDatabasePath();
      const dbManager = new DatabaseManager(dbPath);

      // Query relationships
      let sql = `
        SELECT *
        FROM unified_relationships
        WHERE (
          json_extract(from_symbols, '$[0]') = ? OR
          json_extract(to_symbols, '$[0]') = ? OR
          from_symbols LIKE '%"' || ? || '"%' OR
          to_symbols LIKE '%"' || ? || '"%'
        )
      `;

      const params: any[] = [symbolId, symbolId, symbolId, symbolId];

      // Apply filters
      if (options.type) {
        sql += ' AND type = ?';
        params.push(options.type);
      }

      if (options.category) {
        sql += ' AND category = ?';
        params.push(options.category);
      }

      sql += ' LIMIT ?';
      params.push(options.limit);

      const relationships = dbManager.db.prepare(sql).all(...params) as UnifiedRelationshipRow[];

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
