/**
 * Relationship Inference Engine
 * @packageDocumentation
 * @responsibility Infer new relationships from existing ones using rules
 *
 * @purpose Increase relationship density without manual declaration
 * @input Existing relationships from database
 * @output Inferred relationships based on inference rules
 * @logic Apply transitive, closure, and co-membership rules
 * @scope Semantic relationship enrichment
 */

import type { UnifiedRelationship } from '../types/relationships/unified';

/**
 * Inference rule
 * @private
 */
interface InferenceRule {
  name: string;
  description: string;
  apply: (relationships: UnifiedRelationship[]) => UnifiedRelationship[];
}

/**
 * Inference statistics
 * @public
 */
export interface InferenceStats {
  totalInferred: number;
  byRule: Record<string, number>;
  confidence: number;
}

/**
 * Relationship Inference Engine
 *
 * @public
 * @responsibility Apply inference rules to generate new relationships
 *
 * Inference Rules:
 * 1. Naming Transitivity: A~B, B~C in same domain => A~C
 * 2. Feature Closure: Complete graph within feature
 * 3. Test Coverage Inheritance: Suite contains Case, Case covers Impl => Suite covers Impl
 * 4. Dependency Transitivity: A→B→C => A depends on C (indirect)
 *
 * @example
 * ```typescript
 * const engine = new RelationshipInferenceEngine();
 * const existing = db.getAllRelationships();
 * const inferred = engine.infer(existing);
 * console.log(`Inferred ${inferred.length} new relationships`);
 * ```
 */
export class RelationshipInferenceEngine {
  private rules: InferenceRule[];

  constructor() {
    this.rules = [
      this.createNamingTransitivityRule(),
      this.createFeatureClosureRule(),
      this.createTestCoverageInheritanceRule(),
    ];
  }

  /**
   * Infer new relationships from existing ones
   *
   * @param existing - Existing relationships
   * @returns Inferred relationships
   * @public
   */
  infer(existing: UnifiedRelationship[]): UnifiedRelationship[] {
    const inferred: UnifiedRelationship[] = [];
    const existingSet = this.buildRelationshipSet(existing);

    for (const rule of this.rules) {
      const newRelationships = rule.apply(existing);

      // Only add if not already exists
      for (const rel of newRelationships) {
        const key = this.relationshipKey(rel);
        if (!existingSet.has(key)) {
          inferred.push(rel);
          existingSet.add(key);
        }
      }
    }

    return inferred;
  }

  /**
   * Get inference statistics
   *
   * @param existing - Existing relationships
   * @returns Statistics
   * @public
   */
  getStatistics(existing: UnifiedRelationship[]): InferenceStats {
    const byRule: Record<string, number> = {};
    let totalInferred = 0;

    for (const rule of this.rules) {
      const inferred = rule.apply(existing);
      byRule[rule.name] = inferred.length;
      totalInferred += inferred.length;
    }

    // Calculate average confidence
    const inferred = this.infer(existing);
    const avgConfidence = inferred.length > 0
      ? inferred.reduce((sum, r) => sum + r.confidence, 0) / inferred.length
      : 0;

    return {
      totalInferred,
      byRule,
      confidence: avgConfidence,
    };
  }

  /**
   * Rule 1: Naming Transitivity
   * If A~B and B~C in same domain, then A~C
   *
   * @private
   */
  private createNamingTransitivityRule(): InferenceRule {
    return {
      name: 'naming-transitivity',
      description: 'Infer transitive naming-pattern relationships within domain',
      apply: (relationships) => {
        const inferred: UnifiedRelationship[] = [];
        const namingRels = relationships.filter(r => r.type === 'naming-pattern-relation');

        // Group by domain
        const domainMap = new Map<string, UnifiedRelationship[]>();
        for (const rel of namingRels) {
          const domain = rel.properties?.domain;
          if (domain) {
            if (!domainMap.has(domain)) {
              domainMap.set(domain, []);
            }
            domainMap.get(domain)!.push(rel);
          }
        }

        // For each domain, create transitive closure
        for (const [domain, rels] of domainMap.entries()) {
          const symbols = new Set<string>();
          for (const rel of rels) {
            const from = typeof rel.from === 'string' ? rel.from : rel.from[0];
            const to = typeof rel.to === 'string' ? rel.to : rel.to[0];
            symbols.add(from);
            symbols.add(to);
          }

          // Create relationships for all pairs not already connected
          const symbolArray = Array.from(symbols);
          for (let i = 0; i < symbolArray.length; i++) {
            for (let j = i + 1; j < symbolArray.length; j++) {
              const from = symbolArray[i];
              const to = symbolArray[j];

              // Check if already exists
              const exists = rels.some(r => {
                const rFrom = typeof r.from === 'string' ? r.from : r.from[0];
                const rTo = typeof r.to === 'string' ? r.to : r.to[0];
                return (rFrom === from && rTo === to) || (rFrom === to && rTo === from);
              });

              if (!exists) {
                const timestamp = new Date().toISOString();
                inferred.push({
                  id: `naming-pattern-${from}-${to}`.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                  type: 'naming-pattern-relation',
                  from,
                  to,
                  direction: 'undirected',
                  strength: 'medium',
                  category: 'semantic',
                  evidence: [{
                    type: 'code',
                    source: 'inference-engine',
                    confidence: 0.6,
                    context: `Transitive: ${domain} domain closure`
                  }],
                  discoveredBy: 'static-analysis',
                  confidence: 0.6,
                  properties: {
                    domain,
                    detectionMethod: 'inference-transitivity',
                  },
                  createdAt: timestamp,
                  updatedAt: timestamp,
                  description: `${from} ~ ${to} (${domain} domain, inferred)`
                });
              }
            }
          }
        }

        return inferred;
      }
    };
  }

  /**
   * Rule 2: Feature Closure
   * All symbols in same feature are related
   *
   * @private
   */
  private createFeatureClosureRule(): InferenceRule {
    return {
      name: 'feature-closure',
      description: 'Complete graph within feature boundaries',
      apply: (relationships) => {
        const inferred: UnifiedRelationship[] = [];
        const featureRels = relationships.filter(r => r.type === 'feature-grouping');

        // Group by feature
        const featureMap = new Map<string, Set<string>>();
        for (const rel of featureRels) {
          const feature = rel.properties?.feature;
          if (feature) {
            if (!featureMap.has(feature)) {
              featureMap.set(feature, new Set());
            }
            const from = typeof rel.from === 'string' ? rel.from : rel.from[0];
            const to = typeof rel.to === 'string' ? rel.to : rel.to[0];
            featureMap.get(feature)!.add(from);
            featureMap.get(feature)!.add(to);
          }
        }

        // Create complete graph for each feature
        for (const [feature, symbols] of featureMap.entries()) {
          const symbolArray = Array.from(symbols);
          for (let i = 0; i < symbolArray.length; i++) {
            for (let j = i + 1; j < symbolArray.length; j++) {
              const from = symbolArray[i];
              const to = symbolArray[j];

              // Check if already exists
              const exists = featureRels.some(r => {
                const rFrom = typeof r.from === 'string' ? r.from : r.from[0];
                const rTo = typeof r.to === 'string' ? r.to : r.to[0];
                return (rFrom === from && rTo === to) || (rFrom === to && rTo === from);
              });

              if (!exists) {
                const timestamp = new Date().toISOString();
                inferred.push({
                  id: `feature-grouping-${from}-${to}`.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                  type: 'feature-grouping',
                  from,
                  to,
                  direction: 'undirected',
                  strength: 'medium',
                  category: 'semantic',
                  evidence: [{
                    type: 'code',
                    source: 'inference-engine',
                    confidence: 0.7,
                    context: `Feature closure: ${feature}`
                  }],
                  discoveredBy: 'static-analysis',
                  confidence: 0.7,
                  properties: {
                    feature,
                    detectionMethod: 'inference-closure',
                  },
                  createdAt: timestamp,
                  updatedAt: timestamp,
                  description: `${from} ~ ${to} (${feature} feature, inferred)`
                });
              }
            }
          }
        }

        return inferred;
      }
    };
  }

  /**
   * Rule 3: Test Coverage Inheritance
   * If suite contains case, and case covers impl, then suite covers impl
   *
   * @private
   */
  private createTestCoverageInheritanceRule(): InferenceRule {
    return {
      name: 'test-coverage-inheritance',
      description: 'Inherit test coverage from test cases to test suites',
      apply: (relationships) => {
        const inferred: UnifiedRelationship[] = [];

        // Get contains and test-coverage relationships
        const contains = relationships.filter(r => r.type === 'contains');
        const coverage = relationships.filter(r => r.type === 'test-coverage');

        // For each contains relationship
        for (const containsRel of contains) {
          const suite = typeof containsRel.from === 'string' ? containsRel.from : containsRel.from[0];
          const testCase = typeof containsRel.to === 'string' ? containsRel.to : containsRel.to[0];

          // Find what the test case covers
          for (const coverageRel of coverage) {
            const coveredTest = typeof coverageRel.from === 'string' ? coverageRel.from : coverageRel.from[0];

            if (coveredTest === testCase) {
              const impl = typeof coverageRel.to === 'string' ? coverageRel.to : coverageRel.to[0];

              // Check if suite→impl coverage already exists
              const exists = coverage.some(r => {
                const rFrom = typeof r.from === 'string' ? r.from : r.from[0];
                const rTo = typeof r.to === 'string' ? r.to : r.to[0];
                return rFrom === suite && rTo === impl;
              });

              if (!exists) {
                const timestamp = new Date().toISOString();
                inferred.push({
                  id: `test-coverage-${suite}-${impl}`.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                  type: 'test-coverage',
                  from: suite,
                  to: impl,
                  direction: 'unidirectional',
                  strength: 'medium',
                  category: 'verification',
                  evidence: [{
                    type: 'test',
                    source: 'inference-engine',
                    confidence: 0.8,
                    context: `Inherited from test case: ${testCase}`
                  }],
                  discoveredBy: 'test-analysis',
                  confidence: 0.8,
                  properties: {
                    detectionMethod: 'inference-inheritance',
                    inheritedFrom: testCase,
                  },
                  createdAt: timestamp,
                  updatedAt: timestamp,
                  description: `${suite} → ${impl} (inherited from ${testCase})`
                });
              }
            }
          }
        }

        return inferred;
      }
    };
  }

  /**
   * Build set of existing relationship keys for deduplication
   *
   * @private
   */
  private buildRelationshipSet(relationships: UnifiedRelationship[]): Set<string> {
    const set = new Set<string>();
    for (const rel of relationships) {
      set.add(this.relationshipKey(rel));
    }
    return set;
  }

  /**
   * Generate unique key for relationship
   *
   * @private
   */
  private relationshipKey(rel: UnifiedRelationship): string {
    const from = typeof rel.from === 'string' ? rel.from : rel.from[0];
    const to = typeof rel.to === 'string' ? rel.to : rel.to[0];

    // For undirected relationships, normalize order
    if (rel.direction === 'undirected') {
      const [a, b] = from < to ? [from, to] : [to, from];
      return `${rel.type}:${a}:${b}`;
    }

    return `${rel.type}:${from}:${to}`;
  }
}
