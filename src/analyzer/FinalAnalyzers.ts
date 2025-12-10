/**
 * Final Analyzers - Pipeline and Feature Grouping
 *
 * @doc [[FinalAnalyzers]]
 * @packageDocumentation
 * @responsibility Complete remaining relationship types
 *
 * @problem Last two relationship types need implementation
 * @solves Simple implementations to reach 100% coverage
 * @context Completes the unified relationship system
 *
 * @functionality
 * - Pipeline: Sequential processing patterns
 * - Feature Grouping: Related symbols by feature
 */

import type { Database } from 'better-sqlite3';
import type { SymbolGraph } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships';

/**
 * Final Analyzers combining pipeline and feature-grouping
 *
 * @public
 */
export class FinalAnalyzers {
  private graph: SymbolGraph;
  private db: Database;

  constructor(graph: SymbolGraph, db: Database) {
    this.graph = graph;
    this.db = db;
  }

  /**
   * Analyze all remaining relationship types
   *
   * @returns Array of relationships
   * @public
   */
  analyze(): UnifiedRelationship[] {
    const relationships: UnifiedRelationship[] = [];

    // Detect pipelines
    relationships.push(...this.detectPipelines());

    // Detect feature groupings
    relationships.push(...this.detectFeatureGroupings());

    return relationships;
  }

  /**
   * Detect pipeline patterns (A → B → C sequential processing)
   *
   * @returns Array of pipeline relationships
   * @private
   */
  private detectPipelines(): UnifiedRelationship[] {
    const relationships: UnifiedRelationship[] = [];

    try {
      // Find chains of calls (3+ depth)
      const chains = this.db
        .prepare(
          `SELECT d1.symbol_id as stage1,
                  d1.target as stage2,
                  d2.target as stage3
           FROM dependencies d1
           JOIN dependencies d2 ON d1.target = d2.symbol_id
           WHERE d1.type = 'calls' AND d2.type = 'calls'
           LIMIT 50`
        )
        .all() as Array<{ stage1: string; stage2: string; stage3: string }>;

      for (const chain of chains) {
        // Create pipeline for stage1 -> stage2
        relationships.push({
          id: `pipeline-${chain.stage1}-${chain.stage2}`
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, ''),
          type: 'pipeline',
          category: 'data-flow',
          from: chain.stage1,
          to: chain.stage2,
          direction: 'unidirectional',
          strength: 'medium',
          evidence: [
            {
              type: 'code',
              source: 'call-chain',
              lineNumber: 0,
              confidence: 0.8,
            },
          ],
          discoveredBy: 'static-analysis',
          confidence: 0.8,
          properties: {
            nextStage: chain.stage3,
          },
          description: `Pipeline stage: ${chain.stage1} → ${chain.stage2}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        // Create pipeline for stage2 → stage3
        relationships.push({
          id: `pipeline-${chain.stage2}-${chain.stage3}`
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, ''),
          type: 'pipeline',
          category: 'data-flow',
          from: chain.stage2,
          to: chain.stage3,
          direction: 'unidirectional',
          strength: 'medium',
          evidence: [
            {
              type: 'code',
              source: 'call-chain',
              lineNumber: 0,
              confidence: 0.8,
            },
          ],
          discoveredBy: 'static-analysis',
          confidence: 0.8,
          properties: {
            previousStage: chain.stage1,
          },
          description: `Pipeline stage: ${chain.stage2} → ${chain.stage3}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.warn('FinalAnalyzers: Pipeline detection failed:', error);
    }

    return relationships;
  }

  /**
   * Detect feature groupings (symbols belonging to same feature)
   *
   * @returns Array of feature-grouping relationships
   * @private
   */
  private detectFeatureGroupings(): UnifiedRelationship[] {
    const relationships: UnifiedRelationship[] = [];

    try {
      // Group symbols by file directory (same directory = same feature)
      const symbolsByDir = new Map<string, string[]>();

      for (const [symbolId, symbol] of this.graph.symbols.entries()) {
        // Extract directory from file path
        const parts = symbol.filePath.split('/');
        parts.pop(); // Remove filename
        const directory = parts.join('/');

        if (!symbolsByDir.has(directory)) {
          symbolsByDir.set(directory, []);
        }

        symbolsByDir.get(directory)!.push(symbolId);
      }

      // Create feature-grouping for symbols in same directory
      for (const [directory, symbolIds] of symbolsByDir.entries()) {
        if (symbolIds.length >= 2) {
          // Create pairwise groupings
          for (let i = 0; i < symbolIds.length - 1; i++) {
            for (let j = i + 1; j < symbolIds.length && j < i + 5; j++) {
              const symbolA = symbolIds[i];
              const symbolB = symbolIds[j];

              relationships.push({
                id: `feature-grouping-${symbolA}-${symbolB}`
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/^-|-$/g, ''),
                type: 'feature-grouping',
                category: 'semantic',
                from: symbolA,
                to: symbolB,
                direction: 'undirected',
                strength: 'weak',
                evidence: [
                  {
                    type: 'code',
                    source: directory,
                    lineNumber: 0,
                    confidence: 0.6,
                  },
                ],
                discoveredBy: 'static-analysis',
                confidence: 0.6,
                properties: {
                  featureDirectory: directory,
                  groupSize: symbolIds.length,
                },
                description: `Same feature: ${symbolA} and ${symbolB} in ${directory}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }
          }
        }
      }
    } catch (error) {
      console.warn('FinalAnalyzers: Feature grouping failed:', error);
    }

    return relationships;
  }

  /**
   * Get statistics
   *
   * @param relationships - All relationships
   * @returns Statistics
   * @public
   */
  getStatistics(relationships: UnifiedRelationship[]): {
    pipelines: number;
    featureGroupings: number;
  } {
    let pipelines = 0;
    let featureGroupings = 0;

    for (const rel of relationships) {
      if (rel.type === 'pipeline') pipelines++;
      if (rel.type === 'feature-grouping') featureGroupings++;
    }

    return {
      pipelines,
      featureGroupings,
    };
  }
}
