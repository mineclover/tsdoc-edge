/**
 * Analyze composition command
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import { BaseCommand, type CommandResult } from './BaseCommand';
import { DatabaseManager, type SymbolRow, type DependencyRow } from '../storage/DatabaseManager';
import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import { CompositionAnalyzer } from '../analyzer/CompositionAnalyzer';
import type { SymbolType } from '../types/graph';
import type { SymbolRelationship } from '../types/tags';

/**
 * Command for analyzing composition relationships
 * @doc [[AnalyzeCompositionCommand]]
 * @public
 */
export class AnalyzeCompositionCommand extends BaseCommand {
  getName(): string {
    return 'analyze-composition';
  }

  getDescription(): string {
    return 'Analyze composition relationships (has-a patterns)';
  }

  protected getUsage(): string {
    return 'tsdoc-edge analyze-composition [source-directory]\n\n  Default: src';
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      this.printHeader('TSDoc Edge - Composition Analysis');

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

      // Build TypeScript program for AST analysis
      this.printInfo('Building TypeScript program...');
      const srcDir = args[0] || 'src';
      const files = this.findTypeScriptFiles(srcDir);

      const program = ts.createProgram(files, {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        skipLibCheck: true,
        skipDefaultLibCheck: true,
      });

      console.log();

      // Analyze composition relationships
      this.printSection('Composition Analysis');
      const analyzer = new CompositionAnalyzer(graph, program);
      let compositionRels: ReturnType<typeof analyzer.analyze> = [];
      try {
        compositionRels = analyzer.analyze();
      } catch (error) {
        const err = error as Error;
        this.printError(`Error during composition analysis: ${err.message}`);
        throw error;
      }

      if (compositionRels.length === 0) {
        this.printSuccess('No composition relationships found');
      } else {
        this.printInfo(`Found ${compositionRels.length} composition relationships:`);
        console.log();

        // Calculate statistics
        const stats = this.getCompositionStatistics(compositionRels, graph);

        console.log(`  Total compositions: ${this.colors.cyan}${stats.totalCompositions}${this.colors.reset}`);
        console.log(`  Unique composers: ${this.colors.cyan}${stats.uniqueComposers}${this.colors.reset}`);
        console.log(`  Unique composed types: ${this.colors.cyan}${stats.uniqueComposedTypes}${this.colors.reset}`);
        console.log(`  Array compositions: ${this.colors.cyan}${stats.arrayCompositions}${this.colors.reset}`);
        console.log(`  Optional compositions: ${this.colors.cyan}${stats.optionalCompositions}${this.colors.reset}`);
        console.log();

        // Show most composed types
        if (stats.mostComposedTypes.length > 0) {
          this.printSection('Top 10 Most Composed Types');
          const header1 = 'Type'.padEnd(50);
          const header2 = 'Usage Count'.padEnd(15);
          const header3 = 'Symbol ID';
          console.log(`  ${header1} ${header2} ${header3}`);

          const divider = '─';
          console.log(`  ${divider.repeat(50)} ${divider.repeat(15)} ${divider.repeat(36)}`);

          for (const item of stats.mostComposedTypes) {
            const symbol = graph.symbols.get(item.symbolId);
            if (symbol) {
              const nameDisplay = symbol.name.length > 48 ? symbol.name.substring(0, 45) + '...' : symbol.name;
              const idDisplay = item.symbolId.length > 34 ? item.symbolId.substring(0, 31) + '...' : item.symbolId;

              console.log(
                `  ${nameDisplay.padEnd(50)} ${item.count.toString().padEnd(15)} ${idDisplay}`
              );
            }
          }
          console.log();
        }

        // Save to database
        this.printInfo('Saving composition relationships to database...');
        let savedCount = 0;

        for (const rel of compositionRels) {
          const success = dbManager.insertUnifiedRelationship({
            id: rel.id,
            type: 'composition',
            category: 'behavioral',
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
            discoveredBy: 'ast-parsing',
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
        this.printSuccess(`Saved ${savedCount} composition relationships to database`);
      }

      console.log();

      // Statistics
      this.printSection('Statistics');
      console.log(`  Total symbols: ${this.colors.cyan}${graph.symbols.size}${this.colors.reset}`);
      console.log(`  Composition relationships: ${this.colors.cyan}${compositionRels.length}${this.colors.reset}`);
      console.log();

      dbManager.close();

      return this.success(`Analyzed ${compositionRels.length} composition relationships`);
    });
  }

  /**
   * Calculate composition statistics
   */
  private getCompositionStatistics(relationships: any[], graph: any): any {
    const composerCounts = new Map<string, number>();
    const composedCounts = new Map<string, number>();
    let arrayCompositions = 0;
    let optionalCompositions = 0;

    for (const rel of relationships) {
      // Count composers
      const from = rel.from;
      composerCounts.set(from, (composerCounts.get(from) || 0) + 1);

      // Count composed types
      const to = rel.to;
      composedCounts.set(to, (composedCounts.get(to) || 0) + 1);

      // Count array and optional
      if (rel.properties?.isArray) {
        arrayCompositions++;
      }
      if (rel.properties?.isOptional) {
        optionalCompositions++;
      }
    }

    // Most composed types
    const mostComposedTypes = Array.from(composedCounts.entries())
      .map(([symbolId, count]) => ({ symbolId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalCompositions: relationships.length,
      uniqueComposers: composerCounts.size,
      uniqueComposedTypes: composedCounts.size,
      arrayCompositions,
      optionalCompositions,
      mostComposedTypes
    };
  }

  /**
   * Recursively find TypeScript files
   */
  private findTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip excluded directories
        if (entry.name === 'node_modules' || entry.name === 'dist') {
          continue;
        }
        files.push(...this.findTypeScriptFiles(fullPath));
      } else if (entry.isFile()) {
        // Include .ts files, exclude test files
        if (fullPath.endsWith('.ts') && !fullPath.endsWith('.test.ts') && !fullPath.endsWith('.spec.ts')) {
          files.push(fullPath);
        }
      }
    }

    return files;
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
