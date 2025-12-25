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
import { TestRelationshipExtractor } from '../analyzer/TestRelationshipExtractor';
import type { SymbolType } from '../types/graph';
import type { SymbolRelationship } from '../types/tags';

/**
 * Command for analyzing test coverage relationships
 * @doc [[AnalyzeTestsCommand]]
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

      // Extract integration-verification relationships
      this.printSection('Integration Verification Analysis');
      this.printInfo('Analyzing integration test relationships...');

      const extractor = new TestRelationshipExtractor(graph);
      const allVerifiedRelationships: any[] = [];

      // Find all test files
      const testFiles = files.filter(f => /\.(test|spec)\.tsx?$/.test(f));

      for (const testFile of testFiles) {
        try {
          const usage = extractor.extractFromFile(testFile);
          const verifiedRels = extractor.inferRelationships(usage);

          for (const vr of verifiedRels) {
            allVerifiedRelationships.push({
              testFile,
              ...vr,
            });
          }
        } catch (error) {
          // Skip files that fail to parse
          continue;
        }
      }

      console.log();
      this.printInfo(`Found ${allVerifiedRelationships.length} integration-verification relationships`);

      // Save integration-verification relationships
      if (allVerifiedRelationships.length > 0) {
        this.printInfo('Saving integration-verification relationships to database...');
        let integrationSavedCount = 0;

        for (const vr of allVerifiedRelationships) {
          const relationshipId = `integration-${vr.source}-${vr.target}-${path.basename(vr.testFile)}`
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

          const success = dbManager.insertUnifiedRelationship({
            id: relationshipId,
            type: 'integration-verification',
            category: 'verification',
            fromSymbols: [vr.source],
            toSymbols: [vr.target],
            direction: 'bidirectional',
            strength: vr.strength,
            evidence: vr.evidence.map((e: any) => ({
              type: 'test',
              source: vr.verifiedBy,
              lineNumber: e.lineNumber,
              confidence: 1.0,
            })),
            discoveredBy: 'test-analysis',
            confidence: vr.strength === 'strong' ? 0.9 : vr.strength === 'medium' ? 0.7 : 0.5,
            filePath: vr.verifiedBy,
            properties: {
              verifiedBy: vr.verifiedBy,
              pattern: vr.evidence[0]?.pattern || 'unknown',
              testFile: vr.testFile,
            },
            description: `Integration between ${vr.source} and ${vr.target} verified by ${path.basename(vr.verifiedBy)}`,
          });

          if (success) {
            integrationSavedCount++;
          }
        }

        console.log();
        this.printSuccess(`Saved ${integrationSavedCount} integration-verification relationships to database`);
      }

      console.log();

      // Statistics
      this.printSection('Statistics');
      console.log(`  Total symbols: ${this.colors.cyan}${graph.symbols.size}${this.colors.reset}`);
      console.log(`  Test coverage relationships: ${this.colors.cyan}${testRels.length}${this.colors.reset}`);
      console.log(`  Integration-verification relationships: ${this.colors.cyan}${allVerifiedRelationships.length}${this.colors.reset}`);
      console.log();

      dbManager.close();

      return this.success(`Analyzed ${testRels.length} test coverage + ${allVerifiedRelationships.length} integration-verification relationships`);
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
