/**
 * Analyze substitution command
 * @packageDocumentation
 */

import { BaseCommand, type CommandResult } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';
import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import { SubstitutionAnalyzer } from '../analyzer/SubstitutionAnalyzer';
import type { SymbolType } from '../types/graph';
import type { SymbolRelationship } from '../types/tags';

/**
 * Command for analyzing substitution relationships
 * @doc [[AnalyzeSubstitutionCommand]]
 * @public
 */
export class AnalyzeSubstitutionCommand extends BaseCommand {
  getName(): string {
    return 'analyze-substitution';
  }

  getDescription(): string {
    return 'Analyze substitution relationships (interchangeable implementations)';
  }

  protected getUsage(): string {
    return 'tsdoc-edge analyze-substitution';
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      this.printHeader('TSDoc Edge - Substitution Analysis');

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

      // Analyze substitution relationships
      this.printSection('Substitution Analysis');
      const analyzer = new SubstitutionAnalyzer(graph);
      let substitutionRels: ReturnType<typeof analyzer.analyze> = [];
      try {
        substitutionRels = analyzer.analyze();
      } catch (error) {
        const err = error as Error;
        this.printError(`Error during substitution analysis: ${err.message}`);
        throw error;
      }

      if (substitutionRels.length === 0) {
        this.printSuccess('No substitution relationships found');
      } else {
        this.printInfo(`Found ${substitutionRels.length} substitution relationships:`);
        console.log();

        // Calculate statistics
        const stats = analyzer.getStatistics(substitutionRels);

        console.log(`  Total substitutions: ${this.colors.cyan}${stats.totalSubstitutions}${this.colors.reset}`);
        console.log(`  Interface-based: ${this.colors.cyan}${stats.interfaceBased}${this.colors.reset}`);
        console.log(`  Inheritance-based: ${this.colors.cyan}${stats.inheritanceBased}${this.colors.reset}`);
        console.log(`  Base types: ${this.colors.cyan}${stats.baseTypes.size}${this.colors.reset}`);
        console.log(`  Avg implementations: ${this.colors.cyan}${stats.averageImplementations.toFixed(1)}${this.colors.reset}`);
        console.log();

        // Show sample substitution groups
        if (stats.baseTypes.size > 0) {
          this.printSection('Sample Substitution Groups');

          const groupsByBase = new Map<string, any[]>();
          for (const rel of substitutionRels) {
            const baseType = rel.properties?.baseType;
            if (baseType) {
              if (!groupsByBase.has(baseType)) {
                groupsByBase.set(baseType, []);
              }
              groupsByBase.get(baseType)!.push(rel);
            }
          }

          let count = 0;
          for (const [baseType, rels] of groupsByBase.entries()) {
            if (count >= 5) break; // Show top 5

            const implNames = new Set<string>();
            for (const rel of rels) {
              if (rel.properties?.impl1) implNames.add(rel.properties.impl1);
              if (rel.properties?.impl2) implNames.add(rel.properties.impl2);
            }

            console.log(`  ${this.colors.bold}${baseType}${this.colors.reset} (${implNames.size} implementations):`);
            for (const name of implNames) {
              console.log(`    - ${name}`);
            }
            console.log();
            count++;
          }
        }

        // Save to database
        this.printInfo('Saving substitution relationships to database...');
        let savedCount = 0;

        for (const rel of substitutionRels) {
          const success = dbManager.insertUnifiedRelationship({
            id: rel.id,
            type: 'substitution',
            category: 'alternative',
            fromSymbols: Array.isArray(rel.from) ? rel.from : [rel.from],
            toSymbols: typeof rel.to === 'string' ? [rel.to] : rel.to,
            direction: 'undirected',
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
        this.printSuccess(`Saved ${savedCount} substitution relationships to database`);
      }

      console.log();

      // Statistics
      this.printSection('Statistics');
      console.log(`  Total symbols: ${this.colors.cyan}${graph.symbols.size}${this.colors.reset}`);
      console.log(`  Substitution relationships: ${this.colors.cyan}${substitutionRels.length}${this.colors.reset}`);
      console.log();

      dbManager.close();

      return this.success(`Analyzed ${substitutionRels.length} substitution relationships`);
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
