/**
 * Relationship Statistics Command
 * @packageDocumentation
 */

import { DatabaseManager } from '../storage/DatabaseManager';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

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
    return 'tsdoc-edge relationship-stats [options]\n\n  Options:\n    --detailed    Show detailed breakdown by type\n    --human       Output in human-readable format (default: XML)';
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
      const detailed = args.includes('--detailed');

      if (isHuman) {
        this.printHeader('TSDoc Edge - Relationship Statistics');
      }

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
      const byType = byTypeRaw.map((row) => ({
        type: row.type,
        category: typeToCategory.get(row.type) || 'unknown',
        count: row.count,
      }));

      const totalRelationships = byType.reduce((sum, row) => sum + row.count, 0);

      // Get inferred vs explicit breakdown (allRels already fetched above)
      const inferredCount = allRels.filter((r) => r.properties?.inferred === true).length;
      const explicitCount = totalRelationships - inferredCount;

      const categoryOrder = [
        'structural',
        'data-flow',
        'behavioral',
        'alternative',
        'constraint',
        'semantic',
        'verification',
      ];

      const categoryMap = new Map(byCategory.map((c) => [c.category, c.count]));

      // Define all relationship types by category (28 types across 10 categories)
      const allTypes = {
        structural: ['code-dependency', 'inheritance', 'implementation'],
        'data-flow': ['io-dependency', 'event-flow'],
        behavioral: ['calls', 'callback', 'collaboration', 'composition', 'temporal-order'],
        alternative: ['substitution', 'fallback'],
        constraint: ['co-requirement', 'circular-dependency'],
        semantic: [
          'naming-pattern-relation',
          'explicit-semantic-relation',
          'feature-grouping',
          'doc-reference',
          'enhancement',
        ],
        verification: ['test-coverage', 'integration-verification'],
        testing: ['contains', 'covers-scenario', 'test-as-example'],
        'type-system': ['type-dependency', 'generic-constraint'],
        architectural: ['layer-dependency', 'module-boundary'],
      };

      const implementedTypes = new Set(byType.map((r) => r.type));

      // Implementation progress per category
      let totalTypes = 0;
      let implementedCount = 0;
      const progress: Array<{ category: string; implemented: number; total: number }> = [];

      for (const [category, types] of Object.entries(allTypes)) {
        totalTypes += types.length;
        const implemented = types.filter((t) => implementedTypes.has(t)).length;
        implementedCount += implemented;
        progress.push({ category, implemented, total: types.length });
      }

      const overallPercentage = Math.round((implementedCount / totalTypes) * 100);

      // Missing types
      const missingTypes = Object.entries(allTypes).flatMap(([category, types]) =>
        types.filter((type) => !implementedTypes.has(type)).map((type) => ({ category, type }))
      );

      if (isHuman) {
        console.log();

        // Overall statistics
        this.printSection('Overall Statistics');
        console.log(`  Total symbols: ${colors.cyan}${totalSymbolsCount}${colors.reset}`);
        console.log(`  Total relationships: ${colors.cyan}${totalRelationships}${colors.reset}`);
        console.log(`  Explicit relationships: ${colors.green}${explicitCount}${colors.reset}`);
        console.log(
          `  Inferred relationships: ${colors.yellow}${inferredCount}${colors.reset} (${((inferredCount / totalRelationships) * 100).toFixed(1)}%)`
        );
        console.log();

        // Category breakdown
        this.printSection('Relationships by Category');

        for (const category of categoryOrder) {
          const count = categoryMap.get(category) || 0;
          const icon = count > 0 ? `${colors.green}✓` : `${colors.dim}○`;
          const countDisplay = count > 0 ? colors.cyan + count : `${colors.dim}0`;

          console.log(
            `  ${icon}${colors.reset} ${category.padEnd(15)} ${countDisplay}${colors.reset}`
          );
        }
        console.log();

        // Implementation progress
        this.printSection('Implementation Progress');

        for (const { category, implemented, total } of progress) {
          const percentage = total > 0 ? Math.round((implemented / total) * 100) : 0;
          const progressBar = this.createProgressBar(percentage, 20);

          console.log(
            `  ${category.padEnd(15)} ${progressBar} ${percentage}% (${implemented}/${total})`
          );
        }

        console.log();
        console.log(
          `  ${colors.bold}Overall Progress:${colors.reset} ${colors.cyan}${overallPercentage}%${colors.reset} (${implementedCount}/${totalTypes} types)`
        );
        console.log();

        // Detailed breakdown
        if (detailed) {
          this.printSection('Detailed Breakdown by Type');

          for (const [category, types] of Object.entries(allTypes)) {
            console.log();
            console.log(`  ${colors.bold}${category}:${colors.reset}`);

            for (const type of types) {
              const row = byType.find((r) => r.type === type);
              const count = row ? row.count : 0;
              const status = count > 0 ? `${colors.green}✓` : `${colors.red}✗`;
              const countDisplay = count > 0 ? colors.cyan + count : `${colors.dim}-`;

              console.log(
                `    ${status}${colors.reset} ${type.padEnd(30)} ${countDisplay}${colors.reset}`
              );
            }
          }
          console.log();
        }

        if (missingTypes.length > 0) {
          this.printSection('Missing Relationship Types');
          console.log(
            `  ${colors.yellow}${missingTypes.length} types not yet implemented:${colors.reset}`
          );
          console.log();

          missingTypes.forEach(({ category, type }) => {
            console.log(`    ${colors.dim}• ${category}:${type}${colors.reset}`);
          });
          console.log();
        }

        // Recommendations
        this.printSection('Next Steps');
        console.log(
          `  ${colors.blue}ℹ${colors.reset} Run ${colors.cyan}tsdoc-edge relationship-stats --detailed${colors.reset} for full breakdown`
        );
        console.log(
          `  ${colors.blue}ℹ${colors.reset} See ${colors.cyan}managed/workflows/relationship-system-roadmap.md${colors.reset} for implementation plan`
        );
        console.log();
      } else {
        // Categories shown by the text report first (fixed order, zero-filled), then any other
        // category present in the database.
        const extraCategories = byCategory
          .map((c) => c.category)
          .filter((category) => !categoryOrder.includes(category))
          .sort();
        const categories = [...categoryOrder, ...extraCategories].map((category) => ({
          name: category,
          count: categoryMap.get(category) || 0,
        }));

        this.printOutput(
          'relationship-stats',
          {
            summary: {
              totalSymbols: totalSymbolsCount,
              totalRelationships,
              explicitRelationships: explicitCount,
              inferredRelationships: inferredCount,
              inferredPercent:
                totalRelationships > 0
                  ? Number(((inferredCount / totalRelationships) * 100).toFixed(1))
                  : 0,
              implementedTypes: implementedCount,
              totalTypes,
              overallProgressPercent: overallPercentage,
              detailed,
            },
            categories,
            implementationProgress: progress.map(({ category, implemented, total }) => ({
              category,
              implementedTypes: implemented,
              totalTypes: total,
              percent: total > 0 ? Math.round((implemented / total) * 100) : 0,
            })),
            ...(detailed
              ? {
                  typeBreakdown: Object.entries(allTypes).flatMap(([category, types]) =>
                    types.map((type) => {
                      const count = byType.find((r) => r.type === type)?.count ?? 0;
                      return { category, type, count, implemented: count > 0 };
                    })
                  ),
                }
              : {}),
            missingTypes,
          },
          args
        );
      }

      dbManager.close();

      return this.success(
        `${implementedCount}/${totalTypes} relationship types implemented (${overallPercentage}%)`
      );
    });
  }

  private createProgressBar(percentage: number, width: number): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;

    const filledBar = colors.green + '█'.repeat(filled);
    const emptyBar = colors.dim + '░'.repeat(empty);

    return filledBar + emptyBar + colors.reset;
  }
}
