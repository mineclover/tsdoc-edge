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
 * @doc [[LayerDependencyAnalyzer]]
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

  // Pre-compiled regex patterns for layer classification (reused across calls)
  private static readonly LAYER_PATH_PATTERNS: Array<[RegExp, Layer]> = [
    [/[/\\]controller/i, 'controller'],
    [/[/\\]service/i, 'service'],
    [/[/\\](?:repository|repo)/i, 'repository'],
    [/[/\\](?:model|entity)/i, 'model'],
    [/[/\\](?:util|helper)/i, 'util'],
  ];

  private static readonly LAYER_NAME_PATTERNS: Array<[RegExp, Layer]> = [
    [/controller$/i, 'controller'],
    [/service$/i, 'service'],
    [/(?:repository|repo)$/i, 'repository'],
    [/(?:model|entity)$/i, 'model'],
    [/(?:util|helper)$/i, 'util'],
  ];

  /**
   * Classify symbol into architectural layer
   * Uses pre-compiled regex for efficient matching
   *
   * @param symbol - Symbol to classify
   * @returns Layer classification
   * @private
   */
  private classifyLayer(symbol: any): Layer {
    const filePath = symbol.filePath;
    const name = symbol.name;

    // Check file path with pre-compiled regex
    for (const [pattern, layer] of LayerDependencyAnalyzer.LAYER_PATH_PATTERNS) {
      if (pattern.test(filePath)) {
        return layer;
      }
    }

    // Check symbol name suffix with pre-compiled regex
    for (const [pattern, layer] of LayerDependencyAnalyzer.LAYER_NAME_PATTERNS) {
      if (pattern.test(name)) {
        return layer;
      }
    }

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

  /**
   * Analyze module boundary relationships
   * Detects cross-package/cross-module dependencies
   *
   * @returns Array of module-boundary relationships
   * @public
   */
  analyzeModuleBoundaries(): UnifiedRelationship[] {
    const relationships: UnifiedRelationship[] = [];
    const moduleDeps = this.collectModuleDependencies();

    for (const dep of moduleDeps) {
      const relationship = this.createModuleBoundaryRelationship(dep);
      if (relationship) {
        relationships.push(relationship);
      }
    }

    return relationships;
  }

  /**
   * Collect module dependencies from existing relationships
   *
   * @returns Array of module dependencies
   * @private
   */
  private collectModuleDependencies(): Array<{
    from: string;
    fromModule: string;
    to: string;
    toModule: string;
    filePath: string;
  }> {
    const moduleDeps: Array<{
      from: string;
      fromModule: string;
      to: string;
      toModule: string;
      filePath: string;
    }> = [];

    for (const rel of this.graph.relationships) {
      const fromSymbol = this.graph.symbols.get(rel.from);
      const toSymbol = this.graph.symbols.get(rel.to);

      if (!fromSymbol || !toSymbol) continue;

      const fromModule = this.extractModule(fromSymbol.filePath);
      const toModule = this.extractModule(toSymbol.filePath);

      // Only track cross-module dependencies
      if (fromModule && toModule && fromModule !== toModule) {
        moduleDeps.push({
          from: rel.from,
          fromModule,
          to: rel.to,
          toModule,
          filePath: fromSymbol.filePath,
        });
      }
    }

    return moduleDeps;
  }

  /**
   * Extract module name from file path
   *
   * @param filePath - File path
   * @returns Module name or null
   * @private
   */
  private extractModule(filePath: string): string | null {
    const normalized = filePath.replace(/\\/g, '/');

    // Common module patterns:
    // src/modules/auth/...
    // src/features/user/...
    // packages/core/...
    // apps/web/...

    // Pattern 1: src/modules/<module>/...
    const modulesMatch = normalized.match(/src\/modules\/([^/]+)/);
    if (modulesMatch) return modulesMatch[1];

    // Pattern 2: src/features/<feature>/...
    const featuresMatch = normalized.match(/src\/features\/([^/]+)/);
    if (featuresMatch) return featuresMatch[1];

    // Pattern 3: packages/<package>/...
    const packagesMatch = normalized.match(/packages\/([^/]+)/);
    if (packagesMatch) return packagesMatch[1];

    // Pattern 4: apps/<app>/...
    const appsMatch = normalized.match(/apps\/([^/]+)/);
    if (appsMatch) return appsMatch[1];

    // Pattern 5: src/<folder>/ where folder is a top-level module
    const srcMatch = normalized.match(/src\/([^/]+)/);
    if (srcMatch) {
      const folder = srcMatch[1];
      // Skip common non-module folders
      const nonModuleFolders = ['types', 'utils', 'helpers', 'constants', 'config', '__tests__'];
      if (!nonModuleFolders.includes(folder)) {
        return folder;
      }
    }

    return null;
  }

  /**
   * Create module boundary relationship
   *
   * @param dep - Module dependency
   * @returns Unified relationship
   * @private
   */
  private createModuleBoundaryRelationship(dep: {
    from: string;
    fromModule: string;
    to: string;
    toModule: string;
    filePath: string;
  }): UnifiedRelationship {
    const timestamp = new Date().toISOString();

    // Determine if this is a problematic boundary crossing
    const isProblematic = this.isProblematicBoundaryCross(dep.fromModule, dep.toModule);

    return {
      id: `module-boundary-${dep.from}-${dep.to}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 100),
      type: 'module-boundary',
      category: 'architectural',
      from: dep.from,
      to: dep.to,
      direction: 'unidirectional',
      strength: isProblematic ? 'strong' : 'medium',
      evidence: [
        {
          type: 'code',
          source: dep.filePath,
          lineNumber: 0,
          snippet: `${dep.fromModule} → ${dep.toModule}`,
          confidence: 0.9,
          context: isProblematic ? 'Cross-module dependency (review recommended)' : 'Cross-module dependency',
        },
      ],
      discoveredBy: 'static-analysis',
      confidence: 0.9,
      filePath: dep.filePath,
      properties: {
        fromModule: dep.fromModule,
        toModule: dep.toModule,
        isProblematic,
        boundaryType: this.classifyBoundaryType(dep.fromModule, dep.toModule),
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      description: `${dep.fromModule} → ${dep.toModule}` +
        (isProblematic ? ' (review recommended)' : ''),
    };
  }

  /**
   * Check if a boundary crossing is potentially problematic
   *
   * @param fromModule - Source module
   * @param toModule - Target module
   * @returns True if problematic
   * @private
   */
  private isProblematicBoundaryCross(fromModule: string, toModule: string): boolean {
    // Define allowed dependencies (module A can depend on module B)
    const allowedDeps: Record<string, string[]> = {
      // Common patterns - features can use core, but not other features
      'commands': ['analyzer', 'graph', 'storage', 'types', 'parser', 'validator'],
      'analyzer': ['graph', 'storage', 'types', 'parser'],
      'graph': ['storage', 'types'],
      'storage': ['types'],
      'validator': ['graph', 'types', 'storage'],
      'parser': ['types'],
    };

    // If we have specific rules for the source module
    if (allowedDeps[fromModule]) {
      return !allowedDeps[fromModule].includes(toModule);
    }

    // By default, any cross-module dependency is flagged for review
    return false;
  }

  /**
   * Classify the type of boundary crossing
   *
   * @param fromModule - Source module
   * @param toModule - Target module
   * @returns Boundary type
   * @private
   */
  private classifyBoundaryType(fromModule: string, toModule: string): string {
    // Core modules that are expected to be depended upon
    const coreModules = ['types', 'utils', 'helpers', 'constants', 'config', 'graph', 'storage'];

    if (coreModules.includes(toModule)) {
      return 'to-core';
    }

    if (coreModules.includes(fromModule)) {
      return 'from-core';
    }

    // Feature-to-feature dependencies
    return 'feature-to-feature';
  }

  /**
   * Get module boundary statistics
   *
   * @param relationships - Module boundary relationships
   * @returns Statistics
   * @public
   */
  getModuleBoundaryStatistics(relationships: UnifiedRelationship[]): {
    totalBoundaries: number;
    problematicCount: number;
    byModulePair: Record<string, number>;
    byBoundaryType: Record<string, number>;
    uniqueModules: Set<string>;
  } {
    const byModulePair: Record<string, number> = {};
    const byBoundaryType: Record<string, number> = {};
    const uniqueModules = new Set<string>();
    let problematicCount = 0;

    for (const rel of relationships) {
      const fromModule = rel.properties?.fromModule || 'unknown';
      const toModule = rel.properties?.toModule || 'unknown';
      const pairKey = `${fromModule} → ${toModule}`;
      const boundaryType = rel.properties?.boundaryType || 'unknown';

      byModulePair[pairKey] = (byModulePair[pairKey] || 0) + 1;
      byBoundaryType[boundaryType] = (byBoundaryType[boundaryType] || 0) + 1;

      uniqueModules.add(fromModule);
      uniqueModules.add(toModule);

      if (rel.properties?.isProblematic) {
        problematicCount++;
      }
    }

    return {
      totalBoundaries: relationships.length,
      problematicCount,
      byModulePair,
      byBoundaryType,
      uniqueModules,
    };
  }
}
