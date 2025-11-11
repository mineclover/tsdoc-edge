/**
 * Analyze temporal order command
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import { BaseCommand, type CommandResult } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';
import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import { TemporalOrderAnalyzer } from '../analyzer/TemporalOrderAnalyzer';

/**
 * Command for analyzing temporal-order relationships
 * @public
 */
export class AnalyzeTemporalOrderCommand extends BaseCommand {
  getName(): string {
    return 'analyze-temporal-order';
  }

  getDescription(): string {
    return 'Analyze temporal-order relationships (execution sequence)';
  }

  protected getUsage(): string {
    return 'tsdoc-edge analyze-temporal-order [source-directory]\n\n  Default: src';
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      this.printHeader('TSDoc Edge - Temporal Order Analysis');

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

      // Build TypeScript program
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

      // Analyze temporal-order relationships
      this.printSection('Temporal Order Analysis');
      const analyzer = new TemporalOrderAnalyzer(graph, program);
      let temporalOrderRels: any[] = [];

      try {
        temporalOrderRels = analyzer.analyze();
      } catch (error: any) {
        console.error('Error during temporal order analysis:', error.message);
        console.error('Stack:', error.stack);
        throw error;
      }

      if (temporalOrderRels.length === 0) {
        this.printSuccess('No temporal-order relationships found');
      } else {
        this.printInfo(`Found ${temporalOrderRels.length} temporal-order relationships:`);
        console.log();

        // Calculate statistics
        const stats = analyzer.getStatistics(temporalOrderRels);

        console.log(`  Total temporal orders: ${this.colors.cyan}${stats.totalOrders}${this.colors.reset}`);
        console.log();
        console.log(`  ${this.colors.dim}By pattern:${this.colors.reset}`);
        console.log(`    Sequential calls: ${this.colors.cyan}${stats.byPattern['sequential-calls']}${this.colors.reset}`);
        console.log(`    Lifecycle methods: ${this.colors.cyan}${stats.byPattern['lifecycle']}${this.colors.reset}`);
        console.log(`    Promise chains: ${this.colors.cyan}${stats.byPattern['promise-chain']}${this.colors.reset}`);
        console.log(`    Setup/teardown: ${this.colors.cyan}${stats.byPattern['setup-teardown']}${this.colors.reset}`);
        console.log();

        // Save to database
        this.printInfo('Saving temporal-order relationships to database...');
        let savedCount = 0;

        for (const rel of temporalOrderRels) {
          const success = dbManager.insertUnifiedRelationship({
            id: rel.id,
            type: 'temporal-order',
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
        this.printSuccess(`Saved ${savedCount} temporal-order relationships to database`);
      }

      console.log();

      // Statistics
      this.printSection('Statistics');
      console.log(`  Total symbols: ${this.colors.cyan}${graph.symbols.size}${this.colors.reset}`);
      console.log(`  Temporal-order relationships: ${this.colors.cyan}${temporalOrderRels.length}${this.colors.reset}`);
      console.log();

      dbManager.close();

      return this.success(`Analyzed ${temporalOrderRels.length} temporal-order relationships`);
    });
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
        if (entry.name === 'node_modules' || entry.name === 'dist') {
          continue;
        }
        files.push(...this.findTypeScriptFiles(fullPath));
      } else if (entry.isFile()) {
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
