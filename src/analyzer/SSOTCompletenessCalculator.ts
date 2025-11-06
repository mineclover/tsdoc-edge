/**
 * SSOT Completeness Calculator
 *
 * @packageDocumentation
 * @responsibility Calculate SSOT completeness score
 *
 * @problem No way to measure documentation completeness
 * @solves Quantifiable completeness metrics with actionable gaps
 * @context SSOT quality measurement
 *
 * @functionality
 * - Compare expected vs discovered relationships
 * - Calculate category-wise coverage
 * - Identify missing relationships
 * - Generate recommendations
 */

import type { SymbolGraph } from '../types/graph';
import type {
  UnifiedRelationship,
  SSOTCompleteness,
  MissingRelationship,
  RelationshipCategory
} from '../types/relationships';

/**
 * SSOT Completeness Calculator
 *
 * @public
 * @responsibility Calculate and report SSOT completeness
 */
export class SSOTCompletenessCalculator {
  private graph: SymbolGraph;

  constructor(graph: SymbolGraph) {
    this.graph = graph;
  }

  /**
   * Calculate SSOT completeness score
   *
   * @param relationships - All discovered relationships
   * @returns Completeness analysis
   * @public
   */
  calculate(relationships: UnifiedRelationship[]): SSOTCompleteness {
    // Infer expected relationships
    const expected = this.inferExpectedRelationships();

    // Group discovered by category
    const discovered = this.groupByCategory(relationships);

    // Calculate coverage by category
    const structural = this.calculateCategoryCoverage('structural', expected, discovered);
    const dataFlow = this.calculateCategoryCoverage('data-flow', expected, discovered);
    const behavioral = this.calculateCategoryCoverage('behavioral', expected, discovered);
    const alternative = this.calculateCategoryCoverage('alternative', expected, discovered);
    const constraint = this.calculateCategoryCoverage('constraint', expected, discovered);
    const semantic = this.calculateCategoryCoverage('semantic', expected, discovered);
    const verification = this.calculateCategoryCoverage('verification', expected, discovered);

    // Calculate weighted overall score
    const weights = {
      structural: 0.25,
      dataFlow: 0.20,
      behavioral: 0.20,
      alternative: 0.05,
      constraint: 0.05,
      semantic: 0.10,
      verification: 0.15
    };

    const overallScore =
      structural.coverage * weights.structural +
      dataFlow.coverage * weights.dataFlow +
      behavioral.coverage * weights.behavioral +
      alternative.coverage * weights.alternative +
      constraint.coverage * weights.constraint +
      semantic.coverage * weights.semantic +
      verification.coverage * weights.verification;

    // Find missing relationships
    const missing = this.findMissingRelationships(expected, discovered);

    // Generate recommendations
    const recommendations = this.generateRecommendations(missing, {
      structural,
      dataFlow,
      behavioral,
      alternative,
      constraint,
      semantic,
      verification
    });

    return {
      structural,
      dataFlow,
      behavioral,
      alternative,
      constraint,
      semantic,
      verification,
      overallScore,
      missingRelationships: missing,
      totalMissing: missing.length,
      recommendations,
      measuredAt: new Date().toISOString(),
      totalSymbols: this.graph.symbols.size
    };
  }

  /**
   * Infer expected relationships from code structure
   */
  private inferExpectedRelationships(): Map<RelationshipCategory, number> {
    const expected = new Map<RelationshipCategory, number>();

    // Structural: Based on imports, inheritance, implementations
    const structuralCount = this.graph.relationships.length || this.estimateStructural();
    expected.set('structural', structuralCount);

    // Data Flow: Estimate based on functions with return types
    const dataFlowCount = this.estimateDataFlow();
    expected.set('data-flow', dataFlowCount);

    // Behavioral: Estimate based on classes (likely to collaborate)
    const behavioralCount = this.estimateBehavioral();
    expected.set('behavioral', behavioralCount);

    // Alternative: Estimate based on interfaces (implementations can substitute)
    const alternativeCount = this.estimateAlternative();
    expected.set('alternative', alternativeCount);

    // Constraint: Estimate based on mutually dependent modules
    const constraintCount = this.estimateConstraint();
    expected.set('constraint', constraintCount);

    // Semantic: Estimate based on same-domain symbols
    const semanticCount = this.estimateSemantic();
    expected.set('semantic', semanticCount);

    // Verification: All symbols should have tests
    const verificationCount = this.graph.symbols.size;
    expected.set('verification', verificationCount);

    return expected;
  }

  /**
   * Estimate structural relationships
   */
  private estimateStructural(): number {
    // At minimum, each symbol likely depends on 1-2 others
    return Math.floor(this.graph.symbols.size * 1.5);
  }

  /**
   * Estimate data flow relationships
   */
  private estimateDataFlow(): number {
    let count = 0;

    // Count functions/methods with non-primitive return types
    for (const symbol of this.graph.symbols.values()) {
      if (symbol.type === 'function' || symbol.type === 'method') {
        count++;
      }
    }

    return Math.floor(count * 0.3); // ~30% likely have I/O dependencies
  }

  /**
   * Estimate behavioral relationships
   */
  private estimateBehavioral(): number {
    let count = 0;

    // Count classes (likely to collaborate)
    for (const symbol of this.graph.symbols.values()) {
      if (symbol.type === 'class') {
        count++;
      }
    }

    return Math.floor(count * 0.5); // ~50% likely collaborate with others
  }

  /**
   * Estimate alternative relationships
   */
  private estimateAlternative(): number {
    let count = 0;

    // Count interfaces (implementations can substitute)
    for (const symbol of this.graph.symbols.values()) {
      if (symbol.type === 'interface') {
        count++;
      }
    }

    return Math.floor(count * 0.4); // ~40% have substitutable implementations
  }

  /**
   * Estimate constraint relationships
   */
  private estimateConstraint(): number {
    // Constraints are rare, estimate 5% of symbols
    return Math.floor(this.graph.symbols.size * 0.05);
  }

  /**
   * Estimate semantic relationships
   */
  private estimateSemantic(): number {
    // Group symbols by file path (likely same domain)
    const byFile = new Map<string, number>();

    for (const symbol of this.graph.symbols.values()) {
      const count = byFile.get(symbol.filePath) || 0;
      byFile.set(symbol.filePath, count + 1);
    }

    // Each file with 2+ symbols likely has semantic relationships
    let count = 0;
    for (const fileCount of byFile.values()) {
      if (fileCount >= 2) {
        count += fileCount - 1; // n symbols = n-1 relationships
      }
    }

    return count;
  }

  /**
   * Group relationships by category
   */
  private groupByCategory(relationships: UnifiedRelationship[]): Map<RelationshipCategory, UnifiedRelationship[]> {
    const grouped = new Map<RelationshipCategory, UnifiedRelationship[]>();

    for (const rel of relationships) {
      if (!grouped.has(rel.category)) {
        grouped.set(rel.category, []);
      }
      grouped.get(rel.category)!.push(rel);
    }

    return grouped;
  }

  /**
   * Calculate coverage for a category
   */
  private calculateCategoryCoverage(
    category: RelationshipCategory,
    expected: Map<RelationshipCategory, number>,
    discovered: Map<RelationshipCategory, UnifiedRelationship[]>
  ): { total: number; discovered: number; coverage: number } {
    const total = expected.get(category) || 0;
    const found = discovered.get(category)?.length || 0;
    const coverage = total > 0 ? (found / total) * 100 : 0;

    return { total, discovered: found, coverage };
  }

  /**
   * Find missing relationships
   */
  private findMissingRelationships(
    expected: Map<RelationshipCategory, number>,
    discovered: Map<RelationshipCategory, UnifiedRelationship[]>
  ): MissingRelationship[] {
    const missing: MissingRelationship[] = [];

    // For each category with gaps, identify specific missing relationships
    for (const [category, expectedCount] of expected.entries()) {
      const foundCount = discovered.get(category)?.length || 0;
      const gap = expectedCount - foundCount;

      if (gap > 0) {
        // Generate placeholder missing relationships
        // In practice, these would be inferred from code structure
        const suggestions = this.generateMissingSuggestions(category, gap);
        missing.push(...suggestions);
      }
    }

    // Sort by priority
    missing.sort((a, b) => b.priority - a.priority);

    return missing.slice(0, 50); // Top 50 most important
  }

  /**
   * Generate missing relationship suggestions
   */
  private generateMissingSuggestions(category: RelationshipCategory, count: number): MissingRelationship[] {
    const suggestions: MissingRelationship[] = [];

    // Priority mapping
    const priorities: Record<RelationshipCategory, number> = {
      'structural': 5,
      'verification': 5,
      'data-flow': 4,
      'behavioral': 4,
      'semantic': 3,
      'alternative': 2,
      'constraint': 2
    };

    const priority = priorities[category] || 3;

    // Generate generic suggestions (in practice, these would be specific)
    for (let i = 0; i < Math.min(count, 10); i++) {
      suggestions.push({
        type: this.getCategoryExampleType(category),
        from: 'UnknownSymbol',
        to: 'UnknownTarget',
        reason: `Expected ${category} relationship not found`,
        suggestion: this.getCategorySuggestion(category),
        priority
      });
    }

    return suggestions;
  }

  /**
   * Get example type for category
   */
  private getCategoryExampleType(category: RelationshipCategory): any {
    const examples: Record<RelationshipCategory, string> = {
      'structural': 'code-dependency',
      'data-flow': 'io-dependency',
      'behavioral': 'collaboration',
      'alternative': 'substitution',
      'constraint': 'co-requirement',
      'semantic': 'conceptual-relation',
      'verification': 'test-coverage'
    };

    return examples[category];
  }

  /**
   * Get suggestion for category
   */
  private getCategorySuggestion(category: RelationshipCategory): string {
    const suggestions: Record<RelationshipCategory, string> = {
      'structural': 'Add import statements or inheritance relationships',
      'data-flow': 'Document data flow with type annotations',
      'behavioral': 'Add @collaboration tags to document cooperation',
      'alternative': 'Document alternative implementations with @alternative tag',
      'constraint': 'Add @requires or @conflicts tags',
      'semantic': 'Add @relatedTo tags for related concepts',
      'verification': 'Create test files for untested symbols'
    };

    return suggestions[category];
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    missing: MissingRelationship[],
    coverage: Record<string, { total: number; discovered: number; coverage: number }>
  ): string[] {
    const recommendations: string[] = [];

    // Recommend based on lowest coverage categories
    const sortedCategories = Object.entries(coverage)
      .sort((a, b) => a[1].coverage - b[1].coverage)
      .slice(0, 3);

    for (const [category, stats] of sortedCategories) {
      if (stats.coverage < 80) {
        const gap = stats.total - stats.discovered;
        recommendations.push(
          `Improve ${category} coverage: Add ${gap} more ${category} relationships (current: ${stats.coverage.toFixed(1)}%)`
        );
      }
    }

    // Add specific recommendations based on missing relationships
    const byType = new Map<string, number>();
    for (const m of missing.slice(0, 20)) {
      const count = byType.get(m.type) || 0;
      byType.set(m.type, count + 1);
    }

    for (const [type, count] of byType.entries()) {
      recommendations.push(`Document ${count} ${type} relationships`);
    }

    return recommendations.slice(0, 10); // Top 10 recommendations
  }
}
