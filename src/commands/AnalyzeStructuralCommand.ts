/**
 * Analyze structural and verification relationships command
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import { BaseCommand, type CommandResult } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';
import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import { ImplementationAnalyzer } from '../analyzer/ImplementationAnalyzer';
import { TestCoverageUnifier } from '../analyzer/TestCoverageUnifier';
import type { SymbolType } from '../types/graph';
import type { SymbolRelationship } from '../types/tags';

/**
 * Command for analyzing structural and verification relationships
 * @public
 */
export class AnalyzeStructuralCommand extends BaseCommand {
  getName(): string {
    return 'analyze-structural';
  }

  getDescription(): string {
    return 'Analyze structural relationships (implementation) and test coverage';
  }

  protected getUsage(): string {
    return 'tsdoc-edge analyze-structural [source-directory]\n\n  Default: src';
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      this.printHeader('TSDoc Edge - Structural & Test Coverage Analysis');

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

      let totalRelationships = 0;

      // Part 1: Implementation Analysis
      console.log();
      this.printSection('Implementation Analysis');
      this.printInfo('Building TypeScript program...');

      const srcDir = args[0] || 'src';
      const files = this.findTypeScriptFiles(srcDir);

      const program = ts.createProgram(files, {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        skipLibCheck: true,
        skipDefaultLibCheck: true,
      });

      const implAnalyzer = new ImplementationAnalyzer(graph, program);
      const implRels = implAnalyzer.analyze();

      if (implRels.length === 0) {
        this.printInfo('No implementation relationships found');
      } else {
        this.printInfo(`Found ${implRels.length} implementation relationships`);
        console.log();

        const implStats = implAnalyzer.getStatistics(implRels);
        console.log(`  Total implementations: ${this.colors.cyan}${implStats.totalImplementations}${this.colors.reset}`);
        console.log(`  Unique interfaces: ${this.colors.cyan}${Object.keys(implStats.byInterface).length}${this.colors.reset}`);
        console.log(`  Avg implementations per interface: ${this.colors.cyan}${implStats.averageImplementationsPerInterface.toFixed(1)}${this.colors.reset}`);
        console.log();

        // Display sample
        if (implRels.length > 0) {
          console.log(`  ${this.colors.dim}Sample implementations:${this.colors.reset}`);
          const samples = implRels.slice(0, 3);
          for (const rel of samples) {
            console.log(`    ${this.colors.blue}implements${this.colors.reset}: ${rel.description}`);
          }
          if (implRels.length > 3) {
            console.log(`    ${this.colors.dim}... and ${implRels.length - 3} more${this.colors.reset}`);
          }
          console.log();
        }
      }

      // Part 2: Test Coverage Analysis
      console.log();
      this.printSection('Test Coverage Analysis');

      const testCovAnalyzer = new TestCoverageUnifier(graph, dbManager.db);
      const testCovRels = testCovAnalyzer.analyze();

      if (testCovRels.length === 0) {
        this.printInfo('No test coverage relationships found');
      } else {
        this.printInfo(`Found ${testCovRels.length} test coverage relationships`);
        console.log();

        const testStats = testCovAnalyzer.getStatistics(testCovRels);
        console.log(`  Covered symbols: ${this.colors.cyan}${testStats.totalCoveredSymbols}${this.colors.reset}`);
        console.log(`  Test files: ${this.colors.cyan}${testStats.totalTests}${this.colors.reset}`);
        console.log(`  Avg tests per symbol: ${this.colors.cyan}${testStats.averageTestsPerSymbol.toFixed(1)}${this.colors.reset}`);
        console.log();

        // Display sample
        if (testCovRels.length > 0) {
          console.log(`  ${this.colors.dim}Sample test coverage:${this.colors.reset}`);
          const samples = testCovRels.slice(0, 3);
          for (const rel of samples) {
            console.log(`    ${this.colors.green}test-coverage${this.colors.reset}: ${rel.description}`);
          }
          if (testCovRels.length > 3) {
            console.log(`    ${this.colors.dim}... and ${testCovRels.length - 3} more${this.colors.reset}`);
          }
          console.log();
        }
      }

      // Save all relationships
      console.log();
      this.printSection('Saving to Database');

      const allRels = [...implRels, ...testCovRels];
      totalRelationships = allRels.length;

      if (allRels.length > 0) {
        let savedCount = 0;

        const saveTransaction = dbManager.db.transaction(() => {
          for (const rel of allRels) {
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
        this.printSuccess(`Saved ${savedCount} relationships to database`);
      } else {
        this.printInfo('No relationships to save');
      }

      console.log();

      dbManager.close();

      return this.success(
        `Analyzed ${totalRelationships} relationships (${implRels.length} implementations, ${testCovRels.length} test coverage)`
      );
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
