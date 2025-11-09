/**
 * Analyze tests command
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import { BaseCommand, type CommandResult } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';
import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import { TestRelationshipAnalyzer } from '../analyzer/TestRelationshipAnalyzer';

/**
 * Command for analyzing test coverage relationships
 * @public
 */
export class AnalyzeTestsCommand extends BaseCommand {
  getName(): string {
    return 'analyze-tests';
  }

  getDescription(): string {
    return 'Analyze test coverage relationships';
  }

  protected getUsage(): string {
    return 'tsdoc-edge analyze-tests [source-directory]\n\n  Default: src';
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      this.printHeader('TSDoc Edge - Test Coverage Analysis');

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

      // Build TypeScript program for AST analysis (include test files)
      this.printInfo('Building TypeScript program...');
      const srcDir = args[0] || 'src';
      const files = this.findAllTypeScriptFiles(srcDir);

      const program = ts.createProgram(files, {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        skipLibCheck: true,
        skipDefaultLibCheck: true,
      });

      console.log();

      // Analyze test coverage
      this.printSection('Test Coverage Analysis');
      const analyzer = new TestRelationshipAnalyzer(graph, program);
      const testRels = analyzer.analyze();

      if (testRels.length === 0) {
        this.printSuccess('No test coverage relationships found');
      } else {
        this.printInfo(`Found ${testRels.length} test coverage relationships:`);
        console.log();

        // Get statistics
        const stats = analyzer.getStatistics(testRels);

        console.log(`  Total test files: ${this.colors.cyan}${testRels.length}${this.colors.reset}`);
        console.log(`  Tested symbols: ${this.colors.cyan}${stats.testedSymbols.size}${this.colors.reset}`);
        console.log(`  Untested symbols: ${this.colors.yellow}${stats.untestedSymbols.length}${this.colors.reset}`);
        console.log(`  Coverage: ${this.colors.green}${stats.coveragePercentage.toFixed(1)}%${this.colors.reset}`);
        console.log();

        // Save to database
        this.printInfo('Saving test coverage relationships to database...');
        let savedCount = 0;

        for (const rel of testRels) {
          const success = dbManager.insertUnifiedRelationship({
            id: rel.id,
            type: 'test-coverage',
            category: 'verification',
            fromSymbols: typeof rel.from === 'string' ? [rel.from] : rel.from,
            toSymbols: typeof rel.to === 'string' ? [rel.to] : rel.to,
            direction: 'unidirectional',
            strength: rel.strength,
            evidence: rel.evidence.map((e) => ({
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
        this.printSuccess(`Saved ${savedCount} test coverage relationships to database`);
      }

      console.log();

      // Statistics
      this.printSection('Statistics');
      console.log(`  Total symbols: ${this.colors.cyan}${graph.symbols.size}${this.colors.reset}`);
      console.log(`  Test coverage relationships: ${this.colors.cyan}${testRels.length}${this.colors.reset}`);
      console.log();

      dbManager.close();

      return this.success(`Analyzed ${testRels.length} test coverage relationships`);
    });
  }

  /**
   * Recursively find all TypeScript files (including test files)
   */
  private findAllTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip excluded directories
        if (entry.name === 'node_modules' || entry.name === 'dist') {
          continue;
        }
        files.push(...this.findAllTypeScriptFiles(fullPath));
      } else if (entry.isFile()) {
        // Include all .ts files (including tests)
        if (fullPath.endsWith('.ts')) {
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
