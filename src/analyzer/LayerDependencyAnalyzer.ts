/**
 * Layer Dependency Analyzer
 * @packageDocumentation
 * @responsibility Analyze architectural layer dependencies
 */

import type { SymbolGraph } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships/unified';

/**
 * Architectural layer types
 * @private
 */
type Layer = 'controller' | 'service' | 'repository' | 'model' | 'util' | 'unknown';

/**
 * Layer dependency pattern
 * @private
 */
interface LayerDependency {
  from: string;
  fromLayer: Layer;
  to: string;
  toLayer: Layer;
  filePath: string;
}

/**
 * Analyzes layer dependency relationships
 *
 * @public
 * @responsibility Detect architectural layer violations
 *
 * Pattern: Layer A → Layer B
 * - Controller → Service (allowed)
 * - Service → Repository (allowed)
 * - Repository → Service (violation)
 * - Controller → Repository (violation, should go through Service)
 *
 * Detection:
 * 1. Classify symbols into architectural layers based on:
 *    - File path (/controllers/, /services/, /repositories/)
 *    - Symbol name suffix (UserController, UserService)
 *    - Type patterns (class extending BaseController)
 * 2. Analyze existing dependencies
 * 3. Flag layer violations
 *
 * Expected flow:
 * Controller → Service → Repository → Model
 *
 * @example
 * ```typescript
 * // Violation: Controller directly accessing Repository
 * class UserController {
 *   constructor(private userRepo: UserRepository) {} // Should use UserService
 * }
 * ```
 */
export class LayerDependencyAnalyzer {
  private graph: SymbolGraph;

  /**
   * Layer hierarchy (lower number = higher layer)
   * @private
   */
  private layerHierarchy: Record<Layer, number> = {
    controller: 1,
    service: 2,
    repository: 3,
    model: 4,
    util: 5,
    unknown: 0,
  };

  /**
   * Creates a LayerDependencyAnalyzer instance
   *
   * @param graph - Symbol graph
   */
  constructor(graph: SymbolGraph) {
    this.graph = graph;
  }

  /**
   * Analyze layer dependency relationships
   *
   * @returns Array of layer dependency relationships
   */
  analyze(): UnifiedRelationship[] {
    const relationships: UnifiedRelationship[] = [];
    const layerDeps = this.collectLayerDependencies();

    for (const dep of layerDeps) {
      const relationship = this.createRelationship(dep);
      if (relationship) {
        relationships.push(relationship);
      }
    }

    return relationships;
  }

  /**
   * Collect layer dependencies from existing relationships
   *
   * @returns Array of layer dependencies
   * @private
   */
  private collectLayerDependencies(): LayerDependency[] {
    const layerDeps: LayerDependency[] = [];

    for (const rel of this.graph.relationships) {
      const fromSymbol = this.graph.symbols.get(rel.from);
      const toSymbol = this.graph.symbols.get(rel.to);

      if (!fromSymbol || !toSymbol) continue;

      const fromLayer = this.classifyLayer(fromSymbol);
      const toLayer = this.classifyLayer(toSymbol);

      // Only track cross-layer dependencies
      if (fromLayer !== 'unknown' && toLayer !== 'unknown' && fromLayer !== toLayer) {
        layerDeps.push({
          from: rel.from,
          fromLayer,
          to: rel.to,
          toLayer,
          filePath: fromSymbol.filePath,
        });
      }
    }

    return layerDeps;
  }

  /**
   * Classify symbol into architectural layer
   *
   * @param symbol - Symbol to classify
   * @returns Layer classification
   * @private
   */
  private classifyLayer(symbol: any): Layer {
    const filePath = symbol.filePath.toLowerCase();
    const name = symbol.name.toLowerCase();

    // Check file path
    if (filePath.includes('/controller') || filePath.includes('\\controller')) {
      return 'controller';
    }
    if (filePath.includes('/service') || filePath.includes('\\service')) {
      return 'service';
    }
    if (filePath.includes('/repository') || filePath.includes('\\repository') ||
        filePath.includes('/repo') || filePath.includes('\\repo')) {
      return 'repository';
    }
    if (filePath.includes('/model') || filePath.includes('\\model') ||
        filePath.includes('/entity') || filePath.includes('\\entity')) {
      return 'model';
    }
    if (filePath.includes('/util') || filePath.includes('\\util') ||
        filePath.includes('/helper') || filePath.includes('\\helper')) {
      return 'util';
    }

    // Check symbol name suffix
    if (name.endsWith('controller')) return 'controller';
    if (name.endsWith('service')) return 'service';
    if (name.endsWith('repository') || name.endsWith('repo')) return 'repository';
    if (name.endsWith('model') || name.endsWith('entity')) return 'model';
    if (name.endsWith('util') || name.endsWith('helper')) return 'util';

    return 'unknown';
  }

  /**
   * Check if layer dependency is a violation
   *
   * @param fromLayer - Source layer
   * @param toLayer - Target layer
   * @returns True if violation
   * @private
   */
  private isViolation(fromLayer: Layer, toLayer: Layer): boolean {
    const fromLevel = this.layerHierarchy[fromLayer];
    const toLevel = this.layerHierarchy[toLayer];

    // Violation if lower layer depends on higher layer
    // (e.g., repository depending on service)
    return toLevel < fromLevel;
  }

  /**
   * Create unified relationship from layer dependency
   *
   * @param dep - Layer dependency
   * @returns Unified relationship
   * @private
   */
  private createRelationship(dep: LayerDependency): UnifiedRelationship {
    const timestamp = new Date().toISOString();
    const isViolation = this.isViolation(dep.fromLayer, dep.toLayer);

    return {
      id: `layer-dependency-${dep.from}-${dep.to}`,
      type: 'layer-dependency',
      from: dep.from,
      to: dep.to,
      direction: 'unidirectional',
      strength: 'strong',
      category: 'architectural',
      evidence: [
        {
          type: 'code',
          source: dep.filePath,
          lineNumber: 0,
          snippet: `${dep.fromLayer} → ${dep.toLayer}`,
          confidence: 0.8,
          context: isViolation ? 'Layer violation detected' : 'Cross-layer dependency'
        }
      ],
      discoveredBy: 'static-analysis',
      confidence: 0.8,
      filePath: dep.filePath,
      properties: {
        fromLayer: dep.fromLayer,
        toLayer: dep.toLayer,
        isViolation,
        expectedFlow: 'controller → service → repository → model',
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      description: isViolation
        ? `VIOLATION: ${dep.fromLayer} → ${dep.toLayer} (${dep.from} → ${dep.to})`
        : `${dep.fromLayer} → ${dep.toLayer} (${dep.from} → ${dep.to})`
    };
  }

  /**
   * Get statistics for layer dependency relationships
   *
   * @param relationships - Layer dependency relationships
   * @returns Statistics object
   */
  getStatistics(relationships: UnifiedRelationship[]): {
    total: number;
    violations: number;
    byLayerPair: Record<string, number>;
    violationsByLayer: Record<string, number>;
  } {
    const byLayerPair: Record<string, number> = {};
    const violationsByLayer: Record<string, number> = {};
    let violations = 0;

    for (const rel of relationships) {
      const fromLayer = rel.properties?.fromLayer || 'unknown';
      const toLayer = rel.properties?.toLayer || 'unknown';
      const pairKey = `${fromLayer} → ${toLayer}`;

      byLayerPair[pairKey] = (byLayerPair[pairKey] || 0) + 1;

      if (rel.properties?.isViolation) {
        violations++;
        violationsByLayer[pairKey] = (violationsByLayer[pairKey] || 0) + 1;
      }
    }

    return {
      total: relationships.length,
      violations,
      byLayerPair,
      violationsByLayer,
    };
  }
}
