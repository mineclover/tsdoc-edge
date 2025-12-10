/**
 * Analyze Enhancement Command
 * @packageDocumentation
 */

import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import { EnhancementAnalyzer } from '../analyzer/EnhancementAnalyzer';
import { DatabaseManager } from '../storage/DatabaseManager';
import * as path from 'node:path';
import type { SymbolType } from '../types/graph';
import type { SymbolRelationship } from '../types/tags';

/**
 * Command to analyze enhancement relationships
 *
 * @public
 * @responsibility Analyze @enhances tags in code
 */
export class AnalyzeEnhancementCommand extends BaseCommand {
  getName(): string {
    return 'analyze-enhancement';
  }

  getDescription(): string {
    return 'Analyze enhancement relationships (@enhances tags in TSDoc comments)';
  }

  protected getUsage(): string {
    return 'tsdoc-edge analyze-enhancement [source-directory]\n\n  Default: src';
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      this.printHeader('TSDoc Edge - Enhancement Analysis');

      const dbPath = this.getDatabasePath();
      const dbManager = new DatabaseManager(dbPath);

      // Load graph from database
      this.printInfo('Loading dependency graph...');
      const graphBuilder = new SymbolGraphBuilder();
      const { symbols: symbolRows, dependencies: depRows } = dbManager.getGraphData();

      for (const row of symbolRows) {
        graphBuilder.addSymbol({
          id: row.id,
          name: row.name,
          type: row.type as SymbolType,
          filePath: row.file_path,
          line: row.line,
          column: row.column,
          isExported: Boolean(row.is_exported),
          isPublic: Boolean(row.is_public),
          summary: row.summary ?? undefined,
          tests: [],
          designDecisions: [],
          metadata: {
            declaredType: row.declared_type ?? undefined,
            inferredType: row.inferred_type ?? undefined,
            genericParams: row.generic_params ? JSON.parse(row.generic_params) : undefined,
            parameterTypes: row.parameter_types ? JSON.parse(row.parameter_types) : undefined,
          },
        });
      }

      for (const rel of depRows) {
        graphBuilder.addRelationship({
          from: rel.symbol_id,
          to: rel.target,
          type: (rel.type || 'dependsOn') as SymbolRelationship['type'],
          filePath: rel.import_path || '',
        });
      }

      const graph = graphBuilder.getGraph();

      console.log();

      // Run analyzer
      this.printSection('Enhancement Analysis');
      const srcDir = args[0] || 'src';
      const analyzer = new EnhancementAnalyzer(graph);
      const relationships = analyzer.analyze(srcDir);

      if (relationships.length === 0) {
        this.printSuccess('No enhancement relationships found');
      } else {
        this.printInfo(`Found ${relationships.length} enhancement relationships:`);
        console.log();

        const stats = analyzer.getStatistics(relationships);

        console.log(`  Total enhancements: ${colors.cyan}${relationships.length}${colors.reset}`);
        console.log(`  Unique enhancers: ${colors.cyan}${stats.uniqueEnhancers}${colors.reset}`);
        console.log(`  Unique enhanced: ${colors.cyan}${stats.uniqueEnhanced}${colors.reset}`);
        console.log();

        // Show top files with most enhancements
        const fileEntries = Object.entries(stats.byFile)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);

        if (fileEntries.length > 0) {
          this.printSection('Top Files with @enhances Tags');
          const header1 = 'File'.padEnd(60);
          const header2 = 'Enhancements';
          console.log(`  ${header1} ${header2}`);

          const divider = '─';
          console.log(`  ${divider.repeat(60)} ${divider.repeat(13)}`);

          for (const [file, count] of fileEntries) {
            const relPath = path.relative(process.cwd(), file);
            const fileDisplay = relPath.length > 58 ? '...' + relPath.substring(relPath.length - 55) : relPath;
            console.log(`  ${fileDisplay.padEnd(60)} ${count}`);
          }
          console.log();
        }

        // Show sample enhancements
        const samples = relationships.slice(0, 10);
        if (samples.length > 0) {
          this.printSection('Sample Enhancements');
          for (const rel of samples) {
            const fromSymbol = Array.isArray(rel.from) ? rel.from[0] : rel.from;
            const toSymbol = Array.isArray(rel.to) ? rel.to[0] : rel.to;

            console.log(`  ${colors.cyan}${fromSymbol}${colors.reset} enhances ${colors.yellow}${toSymbol}${colors.reset}`);
            if (rel.filePath && rel.line) {
              const relPath = path.relative(process.cwd(), rel.filePath);
              console.log(`    at ${colors.dim}${relPath}:${rel.line}${colors.reset}`);
            }
          }
          console.log();
        }

        // Save to database
        this.printInfo('Saving enhancement relationships to database...');
        let savedCount = 0;

        for (const rel of relationships) {
          const success = dbManager.insertUnifiedRelationship({
            id: rel.id,
            type: 'enhancement',
            category: 'semantic',
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
            discoveredBy: 'documentation',
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
        this.printSuccess(`Saved ${savedCount} enhancement relationships to database`);
      }

      console.log();
      dbManager.close();

      return { exitCode: 0 };
    });
  }
}
