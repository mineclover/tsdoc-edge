/**
 * Unified Analyze Relationships Command
 * Replaces 22 individual analyze commands with single --type parameter
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import { BaseCommand, type CommandResult } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';
import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import { AnalyzerRegistry, getAnalyzerRegistry } from '../analyzer/AnalyzerRegistry';
import type { AnalyzerType, AnalyzerContext } from '../analyzer/types';
import type { SymbolType } from '../types/graph';
import type { SymbolRelationship } from '../types/tags';

/**
 * Unified command for all relationship analysis
 * @public
 */
export class AnalyzeRelationshipsCommand extends BaseCommand {
  private registry: AnalyzerRegistry;

  constructor() {
    super();
    this.registry = getAnalyzerRegistry();
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'analyze-relationships';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Unified relationship analyzer (--type=calls|types|chains|...)';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    const types = this.registry.getTypes().join('|');
    return `tsdoc-edge analyze-relationships [options]

Options:
  --type=<type>     Analyzer type (${types})
  --type=all        Run all analyzers
  --list            List available analyzer types
  --src=<dir>       Source directory (default: src)

Examples:
  tsdoc-edge analyze-relationships --type=calls
  tsdoc-edge analyze-relationships --type=types --src=lib
  tsdoc-edge analyze-relationships --type=all
  tsdoc-edge analyze-relationships --list`;
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      // Parse arguments
      const listFlag = args.includes('--list');
      const typeArg = args.find(a => a.startsWith('--type='));
      const srcArg = args.find(a => a.startsWith('--src='));
      const srcDir = srcArg ? srcArg.split('=')[1] : 'src';

      // --list: show available types
      if (listFlag) {
        return this.listAnalyzers();
      }

      // Require --type
      if (!typeArg) {
        this.printError('Missing --type parameter');
        console.log();
        console.log('Available types:');
        for (const type of this.registry.getTypes()) {
          const metadata = this.registry.getMetadata(type);
          console.log(`  ${this.colors.cyan}${type.padEnd(20)}${this.colors.reset} ${metadata?.description || ''}`);
        }
        console.log();
        console.log('Use --type=all to run all analyzers');
        return this.failure('Missing --type parameter');
      }

      const analyzerType = typeArg.split('=')[1];

      this.printHeader('TSDoc Edge - Relationship Analysis');

      // Load context
      const context = await this.buildContext(srcDir);

      let totalRelationships = 0;

      if (analyzerType === 'all') {
        // Run all analyzers
        this.printSection('Running All Analyzers');
        const byCategory = this.registry.getMetadataByCategory();

        for (const [category, metadataList] of byCategory) {
          console.log();
          console.log(`${this.colors.bold}Category: ${category}${this.colors.reset}`);

          for (const metadata of metadataList) {
            try {
              const hasRequired = metadata.requires.every(req => context[req as keyof AnalyzerContext]);
              if (!hasRequired) {
                console.log(`  ${this.colors.dim}${metadata.name}: skipped (missing requirements)${this.colors.reset}`);
                continue;
              }

              const rels = this.registry.analyze(metadata.type as AnalyzerType, context);
              console.log(`  ${this.colors.green}${metadata.name}${this.colors.reset}: ${rels.length} relationships`);

              // Save to database
              this.saveRelationships(context.dbManager!, rels, metadata.type, metadata.category);
              totalRelationships += rels.length;
            } catch (error) {
              console.log(`  ${this.colors.red}${metadata.name}: error${this.colors.reset}`);
            }
          }
        }
      } else {
        // Run specific analyzer
        const validTypes = this.registry.getTypes();
        if (!validTypes.includes(analyzerType as AnalyzerType)) {
          this.printError(`Unknown analyzer type: ${analyzerType}`);
          console.log();
          console.log('Valid types:', validTypes.join(', '));
          return this.failure(`Unknown analyzer type: ${analyzerType}`);
        }

        const metadata = this.registry.getMetadata(analyzerType as AnalyzerType)!;
        this.printSection(`${metadata.name} Analysis`);

        const rels = this.registry.analyze(analyzerType as AnalyzerType, context);
        this.printInfo(`Found ${rels.length} relationships`);

        if (rels.length > 0) {
          // Show sample
          console.log();
          console.log(`${this.colors.dim}Sample relationships:${this.colors.reset}`);
          for (const rel of rels.slice(0, 5)) {
            console.log(`  ${this.colors.blue}${rel.type}${this.colors.reset}: ${rel.description}`);
          }
          if (rels.length > 5) {
            console.log(`  ${this.colors.dim}... and ${rels.length - 5} more${this.colors.reset}`);
          }

          // Save to database
          console.log();
          this.printInfo('Saving to database...');
          const saved = this.saveRelationships(context.dbManager!, rels, metadata.type, metadata.category);
          this.printSuccess(`Saved ${saved} relationships`);
        }

        totalRelationships = rels.length;
      }

      console.log();
      this.printSection('Summary');
      console.log(`  Total relationships: ${this.colors.cyan}${totalRelationships}${this.colors.reset}`);
      console.log();

      context.dbManager!.close();

      return this.success(`Analyzed ${totalRelationships} relationships`);
    });
  }

  private listAnalyzers(): CommandResult {
    this.printHeader('Available Analyzer Types');
    console.log();

    const byCategory = this.registry.getMetadataByCategory();

    for (const [category, metadataList] of byCategory) {
      console.log(`${this.colors.bold}${category}${this.colors.reset}`);
      for (const metadata of metadataList) {
        console.log(`  ${this.colors.cyan}${metadata.type.padEnd(20)}${this.colors.reset} ${metadata.description}`);
        console.log(`    ${this.colors.dim}requires: ${metadata.requires.join(', ')}${this.colors.reset}`);
      }
      console.log();
    }

    return this.success(`Listed ${this.registry.getTypes().length} analyzer types`);
  }

  private async buildContext(srcDir: string): Promise<AnalyzerContext> {
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
    const files = this.findTypeScriptFiles(srcDir);
    const program = ts.createProgram(files, {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      skipLibCheck: true,
      skipDefaultLibCheck: true,
    });

    return {
      graph,
      program,
      dbManager,
      db: dbManager.db,
      projectRoot: process.cwd(),
    };
  }

  private saveRelationships(
    dbManager: DatabaseManager,
    rels: unknown[],
    type: string,
    category: string
  ): number {
    let savedCount = 0;

    for (const rel of rels) {
      const relData = rel as Record<string, unknown>;
      const evidence = relData.evidence as Array<Record<string, unknown>> | undefined;
      const success = dbManager.insertUnifiedRelationship({
        id: relData.id as string,
        type: (relData.type as string) || type,
        category: (relData.category as string) || category,
        fromSymbols: typeof relData.from === 'string' ? [relData.from] : (relData.from as string[]),
        toSymbols: typeof relData.to === 'string' ? [relData.to] : (relData.to as string[]),
        direction: (relData.direction as string) || 'unidirectional',
        strength: (relData.strength as string) || 'medium',
        evidence: evidence?.map((e: Record<string, unknown>) => ({
          type: e.type as string,
          source: (e.source as string) || '',
          lineNumber: e.lineNumber as number | undefined,
          confidence: (e.confidence as number) || 0.8,
        })) || [],
        discoveredBy: 'static-analysis',
        confidence: (relData.confidence as number) || 0.8,
        filePath: relData.filePath as string | undefined,
        line: relData.line as number | undefined,
        properties: relData.properties as Record<string, unknown> | undefined,
        description: relData.description as string | undefined,
      });

      if (success) {
        savedCount++;
      }
    }

    return savedCount;
  }

  private findTypeScriptFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) {
      return [];
    }

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
