/**
 * Analyze events command
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import { BaseCommand, type CommandResult } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';
import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import { EventFlowAnalyzer } from '../analyzer/EventFlowAnalyzer';
import type { SymbolType } from '../types/graph';
import type { SymbolRelationship } from '../types/tags';

/**
 * Command for analyzing event flow relationships
 * @public
 */
export class AnalyzeEventsCommand extends BaseCommand {
  getName(): string {
    return 'analyze-events';
  }

  getDescription(): string {
    return 'Analyze event-flow relationships (EventEmitter, addEventListener, Pub/Sub)';
  }

  protected getUsage(): string {
    return 'tsdoc-edge analyze-events [source-directory]\n\n  Default: src';
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      this.printHeader('TSDoc Edge - Event Flow Analysis');

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

      // Analyze event flows
      this.printSection('Event Flow Analysis');
      const analyzer = new EventFlowAnalyzer(graph, program);
      const eventRels = analyzer.analyze();

      if (eventRels.length === 0) {
        this.printSuccess('No event-flow relationships found');
      } else {
        this.printInfo(`Found ${eventRels.length} event-flow relationships`);
        console.log();

        // Get statistics
        const stats = analyzer.getStatistics(eventRels);

        console.log(`  Total event flows: ${this.colors.cyan}${stats.totalEvents}${this.colors.reset}`);
        console.log(`  Unique event names: ${this.colors.cyan}${stats.uniqueEventNames.size}${this.colors.reset}`);
        console.log(`  Event producers: ${this.colors.cyan}${stats.producerCount}${this.colors.reset}`);
        console.log(`  Event consumers: ${this.colors.cyan}${stats.consumerCount}${this.colors.reset}`);
        console.log();

        if (Object.keys(stats.byPattern).length > 0) {
          console.log(`  ${this.colors.dim}Patterns:${this.colors.reset}`);
          for (const [pattern, count] of Object.entries(stats.byPattern)) {
            console.log(`    ${pattern}: ${this.colors.cyan}${count}${this.colors.reset}`);
          }
          console.log();
        }

        // Save to database
        this.printInfo('Saving event-flow relationships to database...');
        let savedCount = 0;

        const saveTransaction = dbManager.db.transaction(() => {
          for (const rel of eventRels) {
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
        this.printSuccess(`Saved ${savedCount} event-flow relationships to database`);
      }

      console.log();

      dbManager.close();

      return this.success(`Analyzed ${eventRels.length} event-flow relationships`);
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
