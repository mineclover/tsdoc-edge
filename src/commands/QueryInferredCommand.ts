/**
 * Query Inferred Relationships Command
 * @packageDocumentation
 */

import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';

/**
 * Command to query inferred relationships
 *
 * @public
 * @responsibility Query and display inferred (auto-generated) relationships
 * @contract Filter relationships by inferred flag and display statistics
 *
 * @problem Need to distinguish between explicit and inferred relationships
 * @solves Provides dedicated command to query inferred relationships
 * @context Inferred relationships are auto-generated (e.g., bidirectional references)
 *
 * @functionality
 * - Query inferred relationships from database
 * - Group by relationship type
 * - Show discovery method breakdown
 * - Display sample relationships
 * - Filter by specific type (optional)
 *
 * @decision Use properties.inferred flag for filtering
 * @rationale Consistent with unified relationship schema
 * @consequences Requires all analyzers to set inferred flag appropriately
 */
export class QueryInferredCommand extends BaseCommand {
  /**
   * Get command name
   *
   * @returns Command name
   */
  getName(): string {
    return 'query-inferred';
  }

  /**
   * Get command description
   *
   * @returns Command description
   */
  getDescription(): string {
    return 'Query inferred (auto-generated) relationships';
  }

  protected getUsage(): string {
    return 'tsdoc-edge query-inferred [relationship-type]\n\n  Examples:\n    tsdoc-edge query-inferred              # All inferred relationships\n    tsdoc-edge query-inferred doc-reference  # Only doc-reference';
  }

  /**
   * Execute command
   *
   * @param args - Command arguments [type]
   * @returns Command result
   */
  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      this.printHeader('TSDoc Edge - Inferred Relationships');

      const dbPath = this.getDatabasePath();
      const jsonlPath = path.join(process.cwd(), '.tsdoc', 'data');
      const dbManager = new DatabaseManager(dbPath, jsonlPath);

      try {
        // Get all relationships
        const allRels = dbManager.getAllUnifiedRelationships();

        // Filter inferred relationships
        const inferredRels = allRels.filter(r => r.properties?.inferred === true);

        if (inferredRels.length === 0) {
          this.printWarning('No inferred relationships found');
          console.log();
          return this.success();
        }

        // Optional type filter
        const typeFilter = args[0];
        const filteredRels = typeFilter
          ? inferredRels.filter(r => r.type === typeFilter)
          : inferredRels;

        if (typeFilter && filteredRels.length === 0) {
          this.printWarning(`No inferred relationships found for type: ${typeFilter}`);
          console.log();
          return this.success();
        }

        // Statistics
        this.printSection('Overview');
        console.log(`  Total relationships: ${colors.cyan}${allRels.length}${colors.reset}`);
        console.log(`  Inferred relationships: ${colors.cyan}${inferredRels.length}${colors.reset}`);
        console.log(`  Percentage: ${colors.cyan}${((inferredRels.length / allRels.length) * 100).toFixed(2)}%${colors.reset}`);

        if (typeFilter) {
          console.log(`  Filtered (${typeFilter}): ${colors.cyan}${filteredRels.length}${colors.reset}`);
        }
        console.log();

        // Group by type
        const byType: Record<string, number> = {};
        for (const rel of inferredRels) {
          byType[rel.type] = (byType[rel.type] || 0) + 1;
        }

        this.printSection('By Relationship Type');
        const typeEntries = Object.entries(byType).sort((a, b) => b[1] - a[1]);

        const header1 = 'Type'.padEnd(30);
        const header2 = 'Count';
        console.log(`  ${header1} ${header2}`);

        const divider = '─';
        console.log(`  ${divider.repeat(30)} ${divider.repeat(12)}`);

        for (const [type, count] of typeEntries) {
          const highlight = type === typeFilter ? colors.green : colors.cyan;
          console.log(`  ${type.padEnd(30)} ${highlight}${count}${colors.reset}`);
        }
        console.log();

        // Group by direction
        const byDirection: Record<string, number> = {};
        for (const rel of filteredRels) {
          const direction = rel.properties?.direction || 'unknown';
          byDirection[direction] = (byDirection[direction] || 0) + 1;
        }

        if (Object.keys(byDirection).length > 0) {
          this.printSection('By Direction');
          Object.entries(byDirection)
            .sort((a, b) => b[1] - a[1])
            .forEach(([direction, count]) => {
              console.log(`  ${direction.padEnd(30)} ${colors.cyan}${count}${colors.reset}`);
            });
          console.log();
        }

        // Group by discoveredBy
        const byDiscovery: Record<string, number> = {};
        for (const rel of filteredRels) {
          byDiscovery[rel.discoveredBy] = (byDiscovery[rel.discoveredBy] || 0) + 1;
        }

        this.printSection('By Discovery Method');
        Object.entries(byDiscovery)
          .sort((a, b) => b[1] - a[1])
          .forEach(([method, count]) => {
            console.log(`  ${method.padEnd(30)} ${colors.cyan}${count}${colors.reset}`);
          });
        console.log();

        // Show samples
        const samples = filteredRels.slice(0, 10);
        if (samples.length > 0) {
          this.printSection('Sample Inferred Relationships');
          for (const rel of samples) {
            const from = Array.isArray(rel.from) ? rel.from[0] : rel.from;
            const to = Array.isArray(rel.to) ? rel.to[0] : rel.to;
            const direction = rel.properties?.direction || 'unknown';
            const reverseOf = rel.properties?.reverseOf ? ` (reverse of ${rel.properties.reverseOf.substring(0, 20)}...)` : '';

            console.log(`  ${colors.cyan}${from}${colors.reset} → ${colors.green}${to}${colors.reset}`);
            console.log(`    Type: ${rel.type}, Direction: ${direction}${reverseOf}`);
            if (rel.description) {
              console.log(`    ${colors.dim}${rel.description}${colors.reset}`);
            }
          }
          console.log();
        }

        this.printSuccess(`Found ${filteredRels.length} inferred relationship${filteredRels.length !== 1 ? 's' : ''}`);
        console.log();

        return this.success();
      } finally {
        dbManager.close();
      }
    });
  }
}
