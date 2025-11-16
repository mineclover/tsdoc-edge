/**
 * Module Boundary Analyzer
 * @packageDocumentation
 * @responsibility Analyze cross-module dependencies
 */

import * as path from 'node:path';
import type { SymbolGraph } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships/unified';

/**
 * Module boundary crossing
 * @private
 */
interface ModuleCrossing {
  from: string;
  fromModule: string;
  to: string;
  toModule: string;
  filePath: string;
}

/**
 * Analyzes module boundary relationships
 *
 * @public
 * @responsibility Detect cross-module dependencies
 *
 * Pattern: Module A → Module B
 * - Cross-package dependencies
 * - Inter-module communication
 * - Module coupling detection
 *
 * Detection:
 * 1. Extract module from file path (top-level directory)
 * 2. Analyze existing dependencies
 * 3. Flag cross-module dependencies
 *
 * @example
 * ```typescript
 * // src/auth/UserService.ts depends on src/billing/PaymentService.ts
 * // Creates module-boundary: auth → billing
 * ```
 */
export class ModuleBoundaryAnalyzer {
  private graph: SymbolGraph;

  constructor(graph: SymbolGraph) {
    this.graph = graph;
  }

  /**
   * Analyze module boundary relationships
   *
   * @param rootDir - Root directory for module detection (default: src)
   * @returns Array of module boundary relationships
   */
  analyze(rootDir: string = 'src'): UnifiedRelationship[] {
    const relationships: UnifiedRelationship[] = [];
    const crossings = this.collectModuleCrossings(rootDir);

    for (const crossing of crossings) {
      const relationship = this.createRelationship(crossing);
      if (relationship) {
        relationships.push(relationship);
      }
    }

    return relationships;
  }

  /**
   * Collect module boundary crossings
   *
   * @param rootDir - Root directory
   * @returns Array of module crossings
   * @private
   */
  private collectModuleCrossings(rootDir: string): ModuleCrossing[] {
    const crossings: ModuleCrossing[] = [];

    for (const rel of this.graph.relationships) {
      const fromSymbol = this.graph.symbols.get(rel.from);
      const toSymbol = this.graph.symbols.get(rel.to);

      if (!fromSymbol || !toSymbol) continue;

      const fromModule = this.extractModule(fromSymbol.filePath, rootDir);
      const toModule = this.extractModule(toSymbol.filePath, rootDir);

      // Only track cross-module dependencies
      if (fromModule && toModule && fromModule !== toModule) {
        crossings.push({
          from: rel.from,
          fromModule,
          to: rel.to,
          toModule,
          filePath: fromSymbol.filePath,
        });
      }
    }

    return crossings;
  }

  /**
   * Extract module name from file path
   *
   * @param filePath - File path
   * @param rootDir - Root directory
   * @returns Module name or null
   * @private
   */
  private extractModule(filePath: string, rootDir: string): string | null {
    const normalized = path.normalize(filePath);
    const parts = normalized.split(path.sep);

    // Find root directory index
    const rootIndex = parts.indexOf(rootDir);
    if (rootIndex === -1 || rootIndex + 1 >= parts.length) {
      return null;
    }

    // Module is the first directory under root
    return parts[rootIndex + 1];
  }

  /**
   * Create unified relationship from module crossing
   *
   * @param crossing - Module crossing
   * @returns Unified relationship
   * @private
   */
  private createRelationship(crossing: ModuleCrossing): UnifiedRelationship {
    const timestamp = new Date().toISOString();

    return {
      id: `module-boundary-${crossing.fromModule}-${crossing.toModule}-${crossing.from}-${crossing.to}`,
      type: 'module-boundary',
      from: crossing.from,
      to: crossing.to,
      direction: 'unidirectional',
      strength: 'medium',
      category: 'architectural',
      evidence: [
        {
          type: 'code',
          source: crossing.filePath,
          lineNumber: 0,
          snippet: `${crossing.fromModule} → ${crossing.toModule}`,
          confidence: 0.9,
          context: 'Cross-module dependency detected'
        }
      ],
      discoveredBy: 'static-analysis',
      confidence: 0.9,
      filePath: crossing.filePath,
      properties: {
        fromModule: crossing.fromModule,
        toModule: crossing.toModule,
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      description: `Module ${crossing.fromModule} depends on ${crossing.toModule}`
    };
  }

  /**
   * Get statistics for module boundary relationships
   *
   * @param relationships - Module boundary relationships
   * @returns Statistics object
   */
  getStatistics(relationships: UnifiedRelationship[]): {
    total: number;
    uniqueModules: number;
    byModulePair: Record<string, number>;
    mostCoupledModules: Array<{ module: string; crossings: number }>;
  } {
    const modules = new Set<string>();
    const byModulePair: Record<string, number> = {};
    const moduleCrossings: Record<string, number> = {};

    for (const rel of relationships) {
      const fromModule = rel.properties?.fromModule;
      const toModule = rel.properties?.toModule;

      if (fromModule && toModule) {
        modules.add(fromModule);
        modules.add(toModule);

        const pairKey = `${fromModule} → ${toModule}`;
        byModulePair[pairKey] = (byModulePair[pairKey] || 0) + 1;

        moduleCrossings[fromModule] = (moduleCrossings[fromModule] || 0) + 1;
        moduleCrossings[toModule] = (moduleCrossings[toModule] || 0) + 1;
      }
    }

    const mostCoupledModules = Object.entries(moduleCrossings)
      .map(([module, crossings]) => ({ module, crossings }))
      .sort((a, b) => b.crossings - a.crossings)
      .slice(0, 10);

    return {
      total: relationships.length,
      uniqueModules: modules.size,
      byModulePair,
      mostCoupledModules,
    };
  }
}
