/**
 * Relationship Statistics Command
 * @packageDocumentation
 */

import { BaseCommand, type CommandResult } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';

/**
 * Command for showing relationship statistics and implementation progress
 * @doc [[RelationshipStatsCommand]]
 * @public
 */
export class RelationshipStatsCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'relationship-stats';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Show relationship statistics and implementation progress';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return 'tsdoc-edge relationship-stats [options]\n\n  Options:\n    --detailed    Show detailed breakdown by type';
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

      const detailed = args.includes('--detailed');

      this.printHeader('TSDoc Edge - Relationship Statistics');

      const dbCheck = this.checkDatabaseExists();
      if (dbCheck) return dbCheck;

      const dbManager = new DatabaseManager(this.getDatabasePath());

      // Get total symbols using Drizzle
      const totalSymbolsCount = dbManager.countSymbols();

      // Get relationships by category using Drizzle
      const byCategory = dbManager.countRelationshipsByCategory();

      // Get relationships by type using Drizzle
      const byTypeRaw = dbManager.countRelationshipsByType();

      // Build byType with category info from all relationships
      const allRels = dbManager.getAllUnifiedRelationships();
      const typeToCategory = new Map<string, string>();
      for (const rel of allRels) {
        if (!typeToCategory.has(rel.type)) {
          typeToCategory.set(rel.type, rel.category);
        }
      }
      const byType = byTypeRaw.map(row => ({
        type: row.type,
        category: typeToCategory.get(row.type) || 'unknown',
        count: row.count,
      }));

      console.log();

      // Overall statistics
      this.printSection('Overall Statistics');
      console.log(`  Total symbols: ${this.colors.cyan}${totalSymbolsCount}${this.colors.reset}`);

      const totalRelationships = byType.reduce((sum, row) => sum + row.count, 0);
      console.log(`  Total relationships: ${this.colors.cyan}${totalRelationships}${this.colors.reset}`);

      // Get inferred vs explicit breakdown (allRels already fetched above)
      const inferredCount = allRels.filter(r => r.properties?.inferred === true).length;
      const explicitCount = totalRelationships - inferredCount;

      console.log(`  Explicit relationships: ${this.colors.green}${explicitCount}${this.colors.reset}`);
      console.log(`  Inferred relationships: ${this.colors.yellow}${inferredCount}${this.colors.reset} (${((inferredCount / totalRelationships) * 100).toFixed(1)}%)`);
      console.log();

      // Category breakdown
      this.printSection('Relationships by Category');

      const categoryOrder = [
        'structural',
        'data-flow',
        'behavioral',
        'alternative',
        'constraint',
        'semantic',
        'verification',
      ];

      const categoryMap = new Map(byCategory.map(c => [c.category, c.count]));

      for (const category of categoryOrder) {
        const count = categoryMap.get(category) || 0;
        const icon = count > 0 ? this.colors.green + '✓' : this.colors.dim + '○';
        const countDisplay = count > 0 ? this.colors.cyan + count : this.colors.dim + '0';

        console.log(`  ${icon}${this.colors.reset} ${category.padEnd(15)} ${countDisplay}${this.colors.reset}`);
      }
      console.log();

      // Implementation progress
      this.printSection('Implementation Progress');

      // Define all relationship types by category (28 types across 10 categories)
      const allTypes = {
        structural: ['code-dependency', 'inheritance', 'implementation'],
        'data-flow': ['io-dependency', 'event-flow'],
        behavioral: ['calls', 'callback', 'collaboration', 'composition', 'temporal-order'],
        alternative: ['substitution', 'fallback'],
        constraint: ['co-requirement', 'circular-dependency'],
        semantic: ['naming-pattern-relation', 'explicit-semantic-relation', 'feature-grouping', 'doc-reference', 'enhancement'],
        verification: ['test-coverage', 'integration-verification'],
        testing: ['contains', 'covers-scenario', 'test-as-example'],
        'type-system': ['type-dependency', 'generic-constraint'],
        architectural: ['layer-dependency', 'module-boundary'],
      };

      const implementedTypes = new Set(byType.map(r => r.type));

      let totalTypes = 0;
      let implementedCount = 0;

      for (const [category, types] of Object.entries(allTypes)) {
        totalTypes += types.length;
        const implemented = types.filter(t => implementedTypes.has(t)).length;
        implementedCount += implemented;

        const percentage = types.length > 0 ? Math.round((implemented / types.length) * 100) : 0;
        const progressBar = this.createProgressBar(percentage, 20);

        console.log(`  ${category.padEnd(15)} ${progressBar} ${percentage}% (${implemented}/${types.length})`);
      }

      const overallPercentage = Math.round((implementedCount / totalTypes) * 100);
      console.log();
      console.log(`  ${this.colors.bold}Overall Progress:${this.colors.reset} ${this.colors.cyan}${overallPercentage}%${this.colors.reset} (${implementedCount}/${totalTypes} types)`);
      console.log();

      // Detailed breakdown
      if (detailed) {
        this.printSection('Detailed Breakdown by Type');

        for (const [category, types] of Object.entries(allTypes)) {
          console.log();
          console.log(`  ${this.colors.bold}${category}:${this.colors.reset}`);

          for (const type of types) {
            const row = byType.find(r => r.type === type);
            const count = row ? row.count : 0;
            const status = count > 0 ? this.colors.green + '✓' : this.colors.red + '✗';
            const countDisplay = count > 0 ? this.colors.cyan + count : this.colors.dim + '-';

            console.log(`    ${status}${this.colors.reset} ${type.padEnd(30)} ${countDisplay}${this.colors.reset}`);
          }
        }
        console.log();
      }

      // Missing types
      const missingTypes: string[] = [];
      for (const [category, types] of Object.entries(allTypes)) {
        for (const type of types) {
          if (!implementedTypes.has(type)) {
            missingTypes.push(`${category}:${type}`);
          }
        }
      }

      if (missingTypes.length > 0) {
        this.printSection('Missing Relationship Types');
        console.log(`  ${this.colors.yellow}${missingTypes.length} types not yet implemented:${this.colors.reset}`);
        console.log();

        missingTypes.forEach(missing => {
          console.log(`    ${this.colors.dim}• ${missing}${this.colors.reset}`);
        });
        console.log();
      }

      // Recommendations
      this.printSection('Next Steps');
      console.log(`  ${this.colors.blue}ℹ${this.colors.reset} Run ${this.colors.cyan}tsdoc-edge relationship-stats --detailed${this.colors.reset} for full breakdown`);
      console.log(`  ${this.colors.blue}ℹ${this.colors.reset} See ${this.colors.cyan}managed/workflows/relationship-system-roadmap.md${this.colors.reset} for implementation plan`);
      console.log();

      dbManager.close();

      return this.success(`${implementedCount}/${totalTypes} relationship types implemented (${overallPercentage}%)`);
    });
  }

  private createProgressBar(percentage: number, width: number): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;

    const filledBar = this.colors.green + '█'.repeat(filled);
    const emptyBar = this.colors.dim + '░'.repeat(empty);

    return filledBar + emptyBar + this.colors.reset;
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
