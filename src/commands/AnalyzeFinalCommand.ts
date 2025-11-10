/**
 * Analyze final relationship types command
 * @packageDocumentation
 */

import * as path from 'node:path';
import { BaseCommand, type CommandResult } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';
import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import { FinalAnalyzers } from '../analyzer/FinalAnalyzers';

/**
 * Command for analyzing final relationship types
 * @public
 */
export class AnalyzeFinalCommand extends BaseCommand {
  getName(): string {
    return 'analyze-final';
  }

  getDescription(): string {
    return 'Analyze final relationship types (pipeline, feature-grouping)';
  }

  protected getUsage(): string {
    return 'tsdoc-edge analyze-final';
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      this.printHeader('TSDoc Edge - Final Relationship Analysis');

      const dbPath = path.join(process.cwd(), '.tsdoc', 'symbols.db');
      const dbManager = new DatabaseManager(dbPath);

      // Load graph from database
      this.printInfo('Loading dependency graph...');
      const graphBuilder = new SymbolGraphBuilder();

      const symbolsQuery = dbManager.db.prepare('SELECT * FROM symbols').all() as any[];
      const relsQuery = dbManager.db.prepare('SELECT * FROM dependencies').all() as any[];

      for (const row of symbolsQuery) {
        graphBuilder.addSymbol({
          id: row.id,
          name: row.name,
          type: row.type,
          filePath: row.file_path,
          line: row.line,
          column: row.column,
          isExported: Boolean(row.is_exported),
          isPublic: Boolean(row.is_public),
          summary: row.summary,
          tests: [],
          designDecisions: [],
          metadata: {
            declaredType: row.declared_type,
            inferredType: row.inferred_type,
            genericParams: row.generic_params ? JSON.parse(row.generic_params) : undefined,
            parameterTypes: row.parameter_types ? JSON.parse(row.parameter_types) : undefined,
          },
        });
      }

      for (const rel of relsQuery) {
        graphBuilder.addRelationship({
          from: rel.symbol_id,
          to: rel.target,
          type: rel.type || 'dependsOn',
          filePath: rel.import_path || '',
        });
      }

      const graph = graphBuilder.getGraph();

      console.log();

      // Analyze final relationship types
      this.printSection('Final Relationship Analysis');
      const analyzer = new FinalAnalyzers(graph, dbManager.db);
      const finalRels = analyzer.analyze();

      if (finalRels.length === 0) {
        this.printSuccess('No final relationships found');
      } else {
        this.printInfo(`Found ${finalRels.length} final relationships`);
        console.log();

        // Get statistics
        const stats = analyzer.getStatistics(finalRels);

        console.log(`  Pipelines: ${this.colors.cyan}${stats.pipelines}${this.colors.reset}`);
        console.log(`  Feature groupings: ${this.colors.cyan}${stats.featureGroupings}${this.colors.reset}`);
        console.log();

        // Display samples
        if (finalRels.length > 0) {
          console.log(`  ${this.colors.dim}Sample relationships:${this.colors.reset}`);
          const samples = finalRels.slice(0, 5);
          for (const rel of samples) {
            const typeColor = rel.type === 'pipeline' ? this.colors.blue : this.colors.yellow;
            console.log(`    ${typeColor}${rel.type}${this.colors.reset}: ${rel.description}`);
          }
          if (finalRels.length > 5) {
            console.log(`    ${this.colors.dim}... and ${finalRels.length - 5} more${this.colors.reset}`);
          }
          console.log();
        }

        // Save to database
        this.printInfo('Saving final relationships to database...');
        let savedCount = 0;

        const saveTransaction = dbManager.db.transaction(() => {
          for (const rel of finalRels) {
            const success = dbManager.insertUnifiedRelationship({
              ...rel,
              fromSymbols: typeof rel.from === 'string' ? [rel.from] : rel.from,
              toSymbols: typeof rel.to === 'string' ? [rel.to] : rel.to,
            });
            if (success) {
              savedCount++;
            }
          }
          return savedCount;
        });

        savedCount = saveTransaction();

        console.log();
        this.printSuccess(`Saved ${savedCount} final relationships to database`);
      }

      console.log();

      dbManager.close();

      return this.success(`Analyzed ${finalRels.length} final relationships`);
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
