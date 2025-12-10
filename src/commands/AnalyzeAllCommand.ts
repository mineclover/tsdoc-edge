/**
 * Analyze all relationships command
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import { BaseCommand, type CommandResult } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';
import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import { ConstraintAnalyzer } from '../analyzer/ConstraintAnalyzer';
import { AlternativesAnalyzer } from '../analyzer/AlternativesAnalyzer';
import { BehavioralAnalyzer } from '../analyzer/BehavioralAnalyzer';
import { ImplementationAnalyzer } from '../analyzer/ImplementationAnalyzer';
import { TestCoverageUnifier } from '../analyzer/TestCoverageUnifier';
import { FinalAnalyzers } from '../analyzer/FinalAnalyzers';
import type { SymbolType } from '../types/graph';
import type { SymbolRelationship } from '../types/tags';

/**
 * Command for analyzing all relationship types at once
 * @public
 */
export class AnalyzeAllCommand extends BaseCommand {
  getName(): string {
    return 'analyze-all';
  }

  getDescription(): string {
    return 'Run all relationship analyzers (constraints, alternatives, behavioral, structural, final)';
  }

  protected getUsage(): string {
    return 'tsdoc-edge analyze-all [source-directory]\n\n  Default: src\n\n  Runs all relationship analyzers in sequence:\n  - Constraints (mutual-exclusion, co-requirements)\n  - Alternatives (substitution, fallback)\n  - Behavioral (collaboration, composition, temporal-order)\n  - Structural (implementation, test-coverage)\n  - Final (pipeline, feature-grouping)';
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      this.printHeader('TSDoc Edge - Complete Relationship Analysis');

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

      let totalNewRelationships = 0;
      const relationshipsByType: Record<string, number> = {};

      console.log();

      // 1. Constraint Analysis
      this.printSection('1/5: Constraint Analysis');
      const constraintAnalyzer = new ConstraintAnalyzer(graph, process.cwd(), program);
      const constraintRels = constraintAnalyzer.analyze();
      this.printInfo(`Found ${constraintRels.length} constraint relationships`);
      totalNewRelationships += constraintRels.length;
      relationshipsByType['constraints'] = constraintRels.length;

      // 2. Alternatives Analysis
      console.log();
      this.printSection('2/5: Alternatives Analysis');
      const alternativesAnalyzer = new AlternativesAnalyzer(graph, program);
      const alternativesRels = alternativesAnalyzer.analyze();
      this.printInfo(`Found ${alternativesRels.length} alternative relationships`);
      totalNewRelationships += alternativesRels.length;
      relationshipsByType['alternatives'] = alternativesRels.length;

      // 3. Behavioral Analysis
      console.log();
      this.printSection('3/5: Behavioral Analysis');
      const behavioralAnalyzer = new BehavioralAnalyzer(graph, program);
      const behavioralRels = behavioralAnalyzer.analyze();
      this.printInfo(`Found ${behavioralRels.length} behavioral relationships`);
      totalNewRelationships += behavioralRels.length;
      relationshipsByType['behavioral'] = behavioralRels.length;

      // 4. Structural Analysis
      console.log();
      this.printSection('4/5: Structural Analysis');
      const implAnalyzer = new ImplementationAnalyzer(graph, program);
      const implRels = implAnalyzer.analyze();
      const testCovAnalyzer = new TestCoverageUnifier(graph, dbManager.db);
      const testCovRels = testCovAnalyzer.analyze();
      const structuralTotal = implRels.length + testCovRels.length;
      this.printInfo(`Found ${structuralTotal} structural relationships (${implRels.length} implementation, ${testCovRels.length} test-coverage)`);
      totalNewRelationships += structuralTotal;
      relationshipsByType['structural'] = structuralTotal;

      // 5. Final Analysis
      console.log();
      this.printSection('5/5: Final Analysis');
      const finalAnalyzer = new FinalAnalyzers(graph, dbManager.db);
      const finalRels = finalAnalyzer.analyze();
      this.printInfo(`Found ${finalRels.length} final relationships`);
      totalNewRelationships += finalRels.length;
      relationshipsByType['final'] = finalRels.length;

      // Save all relationships
      console.log();
      this.printSection('Saving to Database');

      const allRels = [
        ...constraintRels,
        ...alternativesRels,
        ...behavioralRels,
        ...implRels,
        ...testCovRels,
        ...finalRels,
      ];

      let savedCount = 0;

      if (allRels.length > 0) {
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
        this.printInfo('No new relationships to save');
      }

      // Summary
      console.log();
      this.printSection('Analysis Summary');
      console.log(`  Total new relationships: ${this.colors.cyan}${totalNewRelationships}${this.colors.reset}`);
      console.log(`  Successfully saved: ${this.colors.green}${savedCount}${this.colors.reset}`);
      console.log();
      console.log(`  ${this.colors.dim}Breakdown by analyzer:${this.colors.reset}`);
      for (const [type, count] of Object.entries(relationshipsByType)) {
        console.log(`    ${type}: ${this.colors.cyan}${count}${this.colors.reset}`);
      }
      console.log();
      this.printSuccess('Complete relationship analysis finished');
      console.log();

      dbManager.close();

      return this.success(`Analyzed ${totalNewRelationships} relationships across all types`);
    });
  }

  /**
   * Find TypeScript files (excluding tests)
   */
  private findTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];

    try {
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
    } catch (error) {
      // Directory doesn't exist or permission denied
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
