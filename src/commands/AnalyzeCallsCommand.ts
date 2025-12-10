/**
 * Analyze calls command
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import { BaseCommand, type CommandResult } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';
import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import { CallGraphAnalyzer } from '../analyzer/CallGraphAnalyzer';
import type { SymbolType } from '../types/graph';
import type { SymbolRelationship } from '../types/tags';

/**
 * Command for analyzing function calls
 * @public
 */
export class AnalyzeCallsCommand extends BaseCommand {
  getName(): string {
    return 'analyze-calls';
  }

  getDescription(): string {
    return 'Analyze function call relationships (call graph)';
  }

  protected getUsage(): string {
    return 'tsdoc-edge analyze-calls [source-directory]\n\n  Default: src';
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      this.printHeader('TSDoc Edge - Call Graph Analysis');

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

      // Analyze call graph
      this.printSection('Call Graph Analysis');
      const analyzer = new CallGraphAnalyzer(graph, program);
      let callRels: ReturnType<typeof analyzer.analyze> = [];
      try {
        callRels = analyzer.analyze();
      } catch (error) {
        const err = error as Error;
        this.printError(`Error during call graph analysis: ${err.message}`);
        throw error;
      }

      if (callRels.length === 0) {
        this.printSuccess('No call relationships found (functions may not have implementations)');
      } else {
        this.printInfo(`Found ${callRels.length} call relationships:`);
        console.log();

        // Get statistics
        const stats = analyzer.getCallStatistics(callRels);

        console.log(`  Total calls: ${this.colors.cyan}${stats.totalCalls}${this.colors.reset}`);
        console.log(`  Unique callers: ${this.colors.cyan}${stats.uniqueCallers}${this.colors.reset}`);
        console.log(`  Unique callees: ${this.colors.cyan}${stats.uniqueCallees}${this.colors.reset}`);
        console.log(`  Avg calls per function: ${this.colors.cyan}${stats.avgCallsPerFunction.toFixed(2)}${this.colors.reset}`);
        console.log();

        // Show most called functions
        if (stats.mostCalledFunctions.length > 0) {
          this.printSection('Top 10 Most Called Functions');
          const header1 = 'Function'.padEnd(50);
          const header2 = 'Call Count'.padEnd(15);
          const header3 = 'Symbol ID';
          console.log(`  ${header1} ${header2} ${header3}`);

          const divider = '─';
          console.log(`  ${divider.repeat(50)} ${divider.repeat(15)} ${divider.repeat(36)}`);

          for (const item of stats.mostCalledFunctions) {
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
        this.printInfo('Saving call relationships to database...');
        let savedCount = 0;

        for (const rel of callRels) {
          const success = dbManager.insertUnifiedRelationship({
            id: rel.id,
            type: 'calls',
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
        this.printSuccess(`Saved ${savedCount} call relationships to database`);
      }

      console.log();

      // Statistics
      this.printSection('Statistics');
      console.log(`  Total symbols: ${this.colors.cyan}${graph.symbols.size}${this.colors.reset}`);
      console.log(`  Call relationships: ${this.colors.cyan}${callRels.length}${this.colors.reset}`);
      console.log();

      dbManager.close();

      return this.success(`Analyzed ${callRels.length} call relationships`);
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
