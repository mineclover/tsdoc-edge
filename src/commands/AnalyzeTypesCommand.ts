/**
 * Analyze types command
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import { BaseCommand, type CommandResult } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';
import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import { TypeDependencyAnalyzer } from '../analyzer/TypeDependencyAnalyzer';

/**
 * Command for analyzing type dependencies
 * @public
 */
export class AnalyzeTypesCommand extends BaseCommand {
  getName(): string {
    return 'analyze-types';
  }

  getDescription(): string {
    return 'Analyze type dependency relationships';
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      this.printHeader('TSDoc Edge - Type Dependency Analysis');

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

      // Analyze type dependencies
      this.printSection('Type Dependency Analysis');
      const analyzer = new TypeDependencyAnalyzer(graph, program);
      const typeRels = analyzer.analyze();

      if (typeRels.length === 0) {
        this.printSuccess('No type dependencies found');
      } else {
        this.printInfo(`Found ${typeRels.length} type dependency relationships:`);
        console.log();

        // Count by context
        const byContext = new Map<string, number>();
        for (const rel of typeRels) {
          const context = rel.properties?.context || 'unknown';
          byContext.set(context, (byContext.get(context) || 0) + 1);
        }

        console.log(`  By context:`);
        for (const [context, count] of byContext.entries()) {
          console.log(`    ${context}: ${this.colors.cyan}${count}${this.colors.reset}`);
        }
        console.log();

        // Save to database
        this.printInfo('Saving type dependency relationships to database...');
        let savedCount = 0;

        for (const rel of typeRels) {
          const success = dbManager.insertUnifiedRelationship({
            id: rel.id,
            type: rel.type as any,
            category: 'structural',
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
            discoveredBy: 'type-inference',
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
        this.printSuccess(`Saved ${savedCount} type dependency relationships to database`);
      }

      console.log();

      // Statistics
      this.printSection('Statistics');
      console.log(`  Total symbols: ${this.colors.cyan}${graph.symbols.size}${this.colors.reset}`);
      console.log(`  Type dependency relationships: ${this.colors.cyan}${typeRels.length}${this.colors.reset}`);
      console.log();

      dbManager.close();

      return this.success(`Analyzed ${typeRels.length} type dependency relationships`);
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
