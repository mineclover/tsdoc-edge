/**
 * Analyze Layer Dependency Command
 * @packageDocumentation
 */

import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import { LayerDependencyAnalyzer } from '../analyzer/LayerDependencyAnalyzer';
import { DatabaseManager } from '../storage/DatabaseManager';

/**
 * Command to analyze layer dependency relationships
 *
 * @public
 * @responsibility Analyze architectural layer dependencies
 */
export class AnalyzeLayerDependencyCommand extends BaseCommand {
  getName(): string {
    return 'analyze-layer-dependency';
  }

  getDescription(): string {
    return 'Analyze architectural layer dependencies (controller → service → repository)';
  }

  protected getUsage(): string {
    return 'tsdoc-edge analyze-layer-dependency\n\n  Analyzes cross-layer dependencies and detects violations';
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      this.printHeader('TSDoc Edge - Layer Dependency Analysis');

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

      // Run analyzer
      this.printSection('Layer Dependency Analysis');
      const analyzer = new LayerDependencyAnalyzer(graph);
      const relationships = analyzer.analyze();

      if (relationships.length === 0) {
        this.printSuccess('No cross-layer dependencies found');
      } else {
        const stats = analyzer.getStatistics(relationships);

        this.printInfo(`Found ${relationships.length} cross-layer dependencies:`);
        console.log();

        console.log(`  Total dependencies: ${colors.cyan}${relationships.length}${colors.reset}`);
        console.log(`  Violations: ${stats.violations > 0 ? colors.red : colors.green}${stats.violations}${colors.reset}`);
        console.log();

        // Show by layer pair
        if (Object.keys(stats.byLayerPair).length > 0) {
          this.printSection('Dependencies by Layer Pair');
          const pairs = Object.entries(stats.byLayerPair)
            .sort((a, b) => b[1] - a[1]);

          const header1 = 'Layer Flow'.padEnd(40);
          const header2 = 'Count'.padEnd(10);
          const header3 = 'Violations';
          console.log(`  ${header1} ${header2} ${header3}`);

          const divider = '─';
          console.log(`  ${divider.repeat(40)} ${divider.repeat(10)} ${divider.repeat(11)}`);

          for (const [pair, count] of pairs) {
            const violations = stats.violationsByLayer[pair] || 0;
            const violationColor = violations > 0 ? colors.red : colors.dim;
            console.log(`  ${pair.padEnd(40)} ${count.toString().padEnd(10)} ${violationColor}${violations}${colors.reset}`);
          }
          console.log();
        }

        // Show violations
        const violations = relationships.filter(r => r.properties?.isViolation);
        if (violations.length > 0) {
          this.printSection(`${colors.red}Layer Violations (${violations.length})${colors.reset}`);
          const samples = violations.slice(0, 10);

          for (const rel of samples) {
            const fromSymbol = Array.isArray(rel.from) ? rel.from[0] : rel.from;
            const toSymbol = Array.isArray(rel.to) ? rel.to[0] : rel.to;
            const fromLayer = rel.properties?.fromLayer || 'unknown';
            const toLayer = rel.properties?.toLayer || 'unknown';

            console.log(`  ${colors.red}✗${colors.reset} ${fromSymbol} (${fromLayer})`);
            console.log(`    → ${toSymbol} (${toLayer})`);
            if (rel.filePath) {
              const relPath = path.relative(process.cwd(), rel.filePath);
              console.log(`    at ${colors.dim}${relPath}${colors.reset}`);
            }
          }

          if (violations.length > samples.length) {
            console.log(`  ${colors.dim}... and ${violations.length - samples.length} more violations${colors.reset}`);
          }
          console.log();
        }

        // Save to database
        this.printInfo('Saving layer-dependency relationships to database...');
        let savedCount = 0;

        for (const rel of relationships) {
          const success = dbManager.insertUnifiedRelationship({
            id: rel.id,
            type: 'layer-dependency',
            category: 'architectural',
            fromSymbols: typeof rel.from === 'string' ? [rel.from] : rel.from,
            toSymbols: typeof rel.to === 'string' ? [rel.to] : rel.to,
            direction: 'unidirectional',
            strength: rel.strength,
            evidence: rel.evidence.map((e: any) => ({
              type: e.type,
              source: e.source || '',
              lineNumber: e.lineNumber,
              confidence: e.confidence,
            })),
            discoveredBy: 'static-analysis',
            confidence: rel.confidence,
            filePath: rel.filePath,
            line: rel.line,
            properties: rel.properties,
            description: rel.description,
          });

          if (success) {
            savedCount++;
          }
        }

        console.log();
        this.printSuccess(`Saved ${savedCount} layer-dependency relationships to database`);
      }

      console.log();
      dbManager.close();

      return { exitCode: 0 };
    });
  }
}
