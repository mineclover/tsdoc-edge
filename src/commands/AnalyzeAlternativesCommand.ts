/**
 * Analyze alternatives command
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import { BaseCommand, type CommandResult } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';
import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import { AlternativesAnalyzer } from '../analyzer/AlternativesAnalyzer';
import type { SymbolType } from '../types/graph';
import type { SymbolRelationship } from '../types/tags';

/**
 * Command for analyzing alternative relationships
 * @doc [[AnalyzeAlternativesCommand]]
 * @public
 */
export class AnalyzeAlternativesCommand extends BaseCommand {
  getName(): string {
    return 'analyze-alternatives';
  }

  getDescription(): string {
    return 'Analyze alternative relationships (substitution, fallback patterns)';
  }

  protected getUsage(): string {
    return 'tsdoc-edge analyze-alternatives [source-directory]\n\n  Default: src';
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      this.printHeader('TSDoc Edge - Alternatives Analysis');

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

      // Analyze alternatives
      this.printSection('Alternatives Analysis');
      const analyzer = new AlternativesAnalyzer(graph, program);
      const alternativeRels = analyzer.analyze();

      if (alternativeRels.length === 0) {
        this.printSuccess('No alternative relationships found');
      } else {
        this.printInfo(`Found ${alternativeRels.length} alternative relationships`);
        console.log();

        // Get statistics
        const stats = analyzer.getStatistics(alternativeRels);

        console.log(`  Total alternatives: ${this.colors.cyan}${stats.totalAlternatives}${this.colors.reset}`);
        console.log(`  Substitutions: ${this.colors.cyan}${stats.substitutions}${this.colors.reset}`);
        console.log(`  Fallbacks: ${this.colors.cyan}${stats.fallbacks}${this.colors.reset}`);
        console.log();

        if (Object.keys(stats.byPattern).length > 0) {
          console.log(`  ${this.colors.dim}Fallback patterns:${this.colors.reset}`);
          for (const [pattern, count] of Object.entries(stats.byPattern)) {
            console.log(`    ${pattern}: ${this.colors.cyan}${count}${this.colors.reset}`);
          }
          console.log();
        }

        // Display sample relationships
        if (alternativeRels.length > 0) {
          console.log(`  ${this.colors.dim}Sample relationships:${this.colors.reset}`);
          const samples = alternativeRels.slice(0, 5);
          for (const rel of samples) {
            const typeColor = rel.type === 'substitution' ? this.colors.blue : this.colors.yellow;
            console.log(`    ${typeColor}${rel.type}${this.colors.reset}: ${rel.description}`);
          }
          if (alternativeRels.length > 5) {
            console.log(`    ${this.colors.dim}... and ${alternativeRels.length - 5} more${this.colors.reset}`);
          }
          console.log();
        }

        // Save to database
        this.printInfo('Saving alternative relationships to database...');
        let savedCount = 0;

        const saveTransaction = dbManager.db.transaction(() => {
          for (const rel of alternativeRels) {
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
        this.printSuccess(`Saved ${savedCount} alternative relationships to database`);
      }

      console.log();

      dbManager.close();

      return this.success(`Analyzed ${alternativeRels.length} alternative relationships`);
    });
  }

  /**
   * Find TypeScript files (excluding tests)
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
        // Include .ts files but not test files
        if (fullPath.endsWith('.ts') && !/\.(test|spec)\.ts$/.test(fullPath)) {
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
