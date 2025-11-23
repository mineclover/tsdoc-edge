/**
 * Analyze Doc Reference Command
 * @packageDocumentation
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import { DocReferenceAnalyzer } from '../analyzer/DocReferenceAnalyzer';
import { BidirectionalDocReferenceGenerator } from '../analyzer/BidirectionalDocReferenceGenerator';
import { DatabaseManager } from '../storage/DatabaseManager';

/**
 * Command to analyze doc reference relationships
 *
 * @public
 * @responsibility Analyze @doc [[Symbol]] references in code
 */
export class AnalyzeDocReferenceCommand extends BaseCommand {
  /**
   * Get command name
   *
   * @returns Command name
   */
  getName(): string {
    return 'analyze-doc-reference';
  }

  /**
   * Get command description
   *
   * @returns Command description
   */
  getDescription(): string {
    return 'Analyze bidirectional doc reference relationships (Code ↔ Doc via @doc [[Symbol]] tags)';
  }

  protected getUsage(): string {
    return 'tsdoc-edge analyze-doc-reference [source-directory]\n\n  Default: src';
  }

  /**
   * Execute command
   *
   * @param args - Command arguments [directory]
   * @returns Command result
   */
  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      this.printHeader('TSDoc Edge - Doc Reference Analysis');

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

      console.log();

      // Run analyzer
      this.printSection('Doc Reference Analysis');
      const srcDir = args[0] || 'src';
      const analyzer = new DocReferenceAnalyzer(graph);
      const relationships = analyzer.analyze(srcDir);

      if (relationships.length === 0) {
        this.printSuccess('No doc-reference relationships found');
      } else {
        this.printInfo(`Found ${relationships.length} doc-reference relationships:`);
        console.log();

        const stats = analyzer.getStatistics(relationships);

        console.log(`  Total references: ${colors.cyan}${relationships.length}${colors.reset}`);
        console.log(`  Unique code symbols: ${colors.cyan}${stats.uniqueCodeSymbols}${colors.reset}`);
        console.log(`  Unique doc symbols: ${colors.cyan}${stats.uniqueDocSymbols}${colors.reset}`);
        console.log(`  With section reference: ${colors.cyan}${stats.withSection}${colors.reset}`);
        console.log();

        // Show top files with most references
        const fileEntries = Object.entries(stats.byFile)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);

        if (fileEntries.length > 0) {
          this.printSection('Top Files with @doc References');
          const header1 = 'File'.padEnd(60);
          const header2 = 'References';
          console.log(`  ${header1} ${header2}`);

          const divider = '─';
          console.log(`  ${divider.repeat(60)} ${divider.repeat(12)}`);

          for (const [file, count] of fileEntries) {
            const relPath = path.relative(process.cwd(), file);
            const fileDisplay = relPath.length > 58 ? '...' + relPath.substring(relPath.length - 55) : relPath;
            console.log(`  ${fileDisplay.padEnd(60)} ${count}`);
          }
          console.log();
        }

        // Show sample references
        const samples = relationships.slice(0, 10);
        if (samples.length > 0) {
          this.printSection('Sample Doc References');
          for (const rel of samples) {
            const fromSymbol = Array.isArray(rel.from) ? rel.from[0] : rel.from;
            const toSymbol = Array.isArray(rel.to) ? rel.to[0] : rel.to;
            const section = rel.properties?.section ? `#${rel.properties.section}` : '';

            console.log(`  ${colors.cyan}${fromSymbol}${colors.reset} → [[${toSymbol}${section}]]`);
            if (rel.filePath && rel.line) {
              const relPath = path.relative(process.cwd(), rel.filePath);
              console.log(`    at ${colors.dim}${relPath}:${rel.line}${colors.reset}`);
            }
          }
          console.log();
        }

        // Save to database
        this.printInfo('Saving doc-reference relationships to database...');
        let savedCount = 0;

        for (const rel of relationships) {
          const success = dbManager.insertUnifiedRelationship({
            id: rel.id,
            type: 'doc-reference',
            category: 'semantic',
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
            discoveredBy: 'documentation',
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
        this.printSuccess(`Saved ${savedCount} forward (Code → Doc) relationships to database`);

        // Generate and save reverse (Doc → Code) relationships
        this.printInfo('Generating reverse (Doc → Code) relationships...');
        const bidirectionalGenerator = new BidirectionalDocReferenceGenerator();
        const reverseRelationships = bidirectionalGenerator.generateReverseRelationships(relationships);

        if (reverseRelationships.length > 0) {
          this.printInfo(`Generated ${reverseRelationships.length} reverse relationships`);
          console.log();

          // Show sample reverse relationships
          const reverseSamples = reverseRelationships.slice(0, 5);
          if (reverseSamples.length > 0) {
            this.printSection('Sample Reverse (Doc → Code) References');
            for (const rel of reverseSamples) {
              const fromSymbol = Array.isArray(rel.from) ? rel.from[0] : rel.from;
              const toSymbol = Array.isArray(rel.to) ? rel.to[0] : rel.to;
              const section = rel.properties?.section ? `#${rel.properties.section}` : '';

              console.log(`  [[${fromSymbol}${section}]] → ${colors.cyan}${toSymbol}${colors.reset}`);
            }
            console.log();
          }

          // Save reverse relationships to database
          this.printInfo('Saving reverse relationships to database...');
          let reverseSavedCount = 0;

          for (const rel of reverseRelationships) {
            const success = dbManager.insertUnifiedRelationship({
              id: rel.id,
              type: 'doc-reference',
              category: 'semantic',
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
              discoveredBy: rel.discoveredBy,
              confidence: rel.confidence,
              filePath: rel.filePath,
              line: rel.line,
              properties: rel.properties,
              description: rel.description,
            });

            if (success) {
              reverseSavedCount++;
            }
          }

          console.log();
          this.printSuccess(`Saved ${reverseSavedCount} reverse (Doc → Code) relationships to database`);

          // Show combined statistics
          const allRelationships = [...relationships, ...reverseRelationships];
          const combinedStats = bidirectionalGenerator.getStatistics(allRelationships);

          this.printSection('Bidirectional Statistics');
          console.log(`  Total relationships: ${colors.cyan}${combinedStats.total}${colors.reset}`);
          console.log(`  Forward (Code → Doc): ${colors.cyan}${combinedStats.forward}${colors.reset}`);
          console.log(`  Reverse (Doc → Code): ${colors.cyan}${combinedStats.reverse}${colors.reset}`);
          console.log(`  Unique code symbols: ${colors.cyan}${combinedStats.uniqueCodeSymbols}${colors.reset}`);
          console.log(`  Unique doc symbols: ${colors.cyan}${combinedStats.uniqueDocSymbols}${colors.reset}`);
        }
      }

      console.log();
      dbManager.close();

      return { exitCode: 0 };
    });
  }
}
