/**
 * Analyze collaboration command
 * @packageDocumentation
 */

import { BaseCommand, type CommandResult } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';
import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import { CollaborationAnalyzer } from '../analyzer/CollaborationAnalyzer';
import type { SymbolType } from '../types/graph';
import type { SymbolRelationship } from '../types/tags';

/**
 * Command for analyzing collaboration relationships
 * @public
 */
export class AnalyzeCollaborationCommand extends BaseCommand {
  getName(): string {
    return 'analyze-collaboration';
  }

  getDescription(): string {
    return 'Analyze collaboration relationships (mutual dependencies, cooperation)';
  }

  protected getUsage(): string {
    return 'tsdoc-edge analyze-collaboration';
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      this.printHeader('TSDoc Edge - Collaboration Analysis');

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

      console.log();

      // Analyze collaboration relationships
      this.printSection('Collaboration Analysis');
      const analyzer = new CollaborationAnalyzer(graph);
      let collaborationRels: ReturnType<typeof analyzer.analyze> = [];

      try {
        collaborationRels = analyzer.analyze();
      } catch (error) {
        const err = error as Error;
        this.printError(`Error during collaboration analysis: ${err.message}`);
        throw error;
      }

      if (collaborationRels.length === 0) {
        this.printSuccess('No collaboration relationships found');
      } else {
        this.printInfo(`Found ${collaborationRels.length} collaboration relationships:`);
        console.log();

        // Calculate statistics
        const stats = analyzer.getStatistics(collaborationRels);

        console.log(`  Total collaborations: ${this.colors.cyan}${stats.totalCollaborations}${this.colors.reset}`);
        console.log(`  Unique collaborators: ${this.colors.cyan}${stats.uniqueCollaborators}${this.colors.reset}`);
        console.log();
        console.log(`  ${this.colors.dim}By evidence type:${this.colors.reset}`);
        console.log(`    Bidirectional dependencies: ${this.colors.cyan}${stats.byEvidenceType['bidirectional-dependency']}${this.colors.reset}`);
        console.log(`    Mutual calls: ${this.colors.cyan}${stats.byEvidenceType['mutual-calls']}${this.colors.reset}`);
        console.log(`    Mutual composition: ${this.colors.cyan}${stats.byEvidenceType['mutual-composition']}${this.colors.reset}`);
        console.log(`    Shared context: ${this.colors.cyan}${stats.byEvidenceType['shared-context']}${this.colors.reset}`);
        console.log();

        // Show sample collaborations
        if (collaborationRels.length > 0) {
          this.printSection('Sample Collaborations');

          const samplesToShow = Math.min(5, collaborationRels.length);
          for (let i = 0; i < samplesToShow; i++) {
            const rel = collaborationRels[i];
            const participantA = rel.properties?.participantA;
            const participantB = rel.properties?.participantB;
            const evidenceType = rel.properties?.evidenceType;

            console.log(`  ${this.colors.bold}${participantA}${this.colors.reset} ↔ ${this.colors.bold}${participantB}${this.colors.reset}`);
            console.log(`    Evidence: ${evidenceType}`);
            console.log();
          }
        }

        // Save to database
        this.printInfo('Saving collaboration relationships to database...');
        let savedCount = 0;

        for (const rel of collaborationRels) {
          const success = dbManager.insertUnifiedRelationship({
            id: rel.id,
            type: 'collaboration',
            category: 'behavioral',
            fromSymbols: Array.isArray(rel.from) ? rel.from : [rel.from],
            toSymbols: Array.isArray(rel.to) ? rel.to : [rel.to],
            direction: 'bidirectional',
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
        this.printSuccess(`Saved ${savedCount} collaboration relationships to database`);
      }

      console.log();

      // Statistics
      this.printSection('Statistics');
      console.log(`  Total symbols: ${this.colors.cyan}${graph.symbols.size}${this.colors.reset}`);
      console.log(`  Collaboration relationships: ${this.colors.cyan}${collaborationRels.length}${this.colors.reset}`);
      console.log();

      dbManager.close();

      return this.success(`Analyzed ${collaborationRels.length} collaboration relationships`);
    });
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
