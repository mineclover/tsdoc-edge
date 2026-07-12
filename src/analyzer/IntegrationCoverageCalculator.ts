/**
 * Integration Coverage Calculator
 *
 * @packageDocumentation
 * @responsibility Calculate relationship verification coverage
 *
 * @problem 어떤 관계가 테스트로 검증되었는지 알 수 없음
 * @solves 전체 관계와 검증된 관계를 비교하여 커버리지 계산
 * @context 통합 테스트 갭 분석
 *
 * @functionality
 * - 전체 관계 목록과 검증된 관계 목록 비교
 * - 미검증 관계 식별 및 이유 분석
 * - 검증 강도별 통계 제공
 */

import type {
  RelationshipCoverage,
  UnverifiedRelationship,
  VerifiedRelationship,
} from '../types/analysis/test-relationships';
import type { Symbol, SymbolGraph, SymbolRelationship } from '../types/graph';

/**
 * Integration Coverage Calculator
 *
 * @doc [[IntegrationCoverageCalculator]]
 * @public
 * @responsibility 관계 검증 커버리지 계산 및 분석
 */
export class IntegrationCoverageCalculator {
  private graph: SymbolGraph;

  constructor(graph: SymbolGraph) {
    this.graph = graph;
  }

  /**
   * Calculate relationship coverage
   *
   * @param verifiedRelationships - Relationships verified by tests
   * @returns Coverage analysis result
   * @public
   */
  calculate(verifiedRelationships: VerifiedRelationship[]): RelationshipCoverage {
    // Build verification matrix
    const verificationMatrix = this.buildVerificationMatrix(verifiedRelationships);

    // Get all relationships from graph
    const allRelationships = this.graph.relationships;

    // Find verified and unverified
    const verified = new Set<string>();
    const byStrength = {
      strong: 0,
      medium: 0,
      weak: 0,
    };

    for (const vr of verifiedRelationships) {
      const key = `${vr.source}->${vr.target}`;
      verified.add(key);
      byStrength[vr.strength]++;
    }

    // Find unverified relationships
    const unverified: UnverifiedRelationship[] = [];

    for (const rel of allRelationships) {
      const key = `${rel.from}->${rel.to}`;

      if (!verified.has(key)) {
        const sourceSymbol = this.graph.symbols.get(rel.from);
        const targetSymbol = this.graph.symbols.get(rel.to);

        if (!sourceSymbol || !targetSymbol) continue;

        const reason = this.determineUnverifiedReason(rel, sourceSymbol, targetSymbol);
        const suggestion = this.generateSuggestion(sourceSymbol, targetSymbol);

        unverified.push({
          source: rel.from,
          target: rel.to,
          sourceName: sourceSymbol.name,
          targetName: targetSymbol.name,
          reason,
          suggestion,
        });
      }
    }

    return {
      totalRelationships: allRelationships.length,
      verifiedRelationships: verified.size,
      unverifiedRelationships: unverified,
      coveragePercentage:
        allRelationships.length > 0 ? (verified.size / allRelationships.length) * 100 : 0,
      verificationMatrix,
      byStrength,
    };
  }

  /**
   * Build verification matrix for quick lookup
   */
  private buildVerificationMatrix(
    verified: VerifiedRelationship[]
  ): Map<string, Map<string, VerifiedRelationship[]>> {
    const matrix = new Map<string, Map<string, VerifiedRelationship[]>>();

    for (const vr of verified) {
      let targetMap = matrix.get(vr.source);
      if (!targetMap) {
        targetMap = new Map();
        matrix.set(vr.source, targetMap);
      }

      let relationships = targetMap.get(vr.target);
      if (!relationships) {
        relationships = [];
        targetMap.set(vr.target, relationships);
      }

      relationships.push(vr);
    }

    return matrix;
  }

  /**
   * Determine why a relationship is not verified
   */
  private determineUnverifiedReason(
    _rel: SymbolRelationship,
    sourceSymbol: Symbol,
    _targetSymbol: Symbol
  ): UnverifiedRelationship['reason'] {
    // Check if source has any tests
    const sourceHasTests = sourceSymbol.tests && sourceSymbol.tests.length > 0;

    if (!sourceHasTests) {
      return 'no-test';
    }

    // If source has tests but relationship not verified,
    // likely the tests mock the dependency
    return 'test-exists-but-no-integration';
  }

  /**
   * Generate suggestion for adding integration test
   */
  private generateSuggestion(sourceSymbol: Symbol, targetSymbol: Symbol): string {
    const sourceFile = sourceSymbol.filePath;

    // Handle cases where filePath might be undefined
    if (!sourceFile) {
      return `Add integration test for ${sourceSymbol.name} with ${targetSymbol.name}`;
    }

    const testFileName = sourceFile
      .replace('/src/', '/__tests__/integration/')
      .replace('.ts', '.test.ts');

    return `Create integration test: ${testFileName}\nTest case: "should verify ${sourceSymbol.name} works with ${targetSymbol.name}"`;
  }

  /**
   * Get top N unverified relationships by priority
   *
   * @param coverage - Coverage result
   * @param limit - Number of results
   * @returns Top unverified relationships
   * @public
   */
  getTopUnverified(coverage: RelationshipCoverage, limit: number = 10): UnverifiedRelationship[] {
    // Sort by priority (can be enhanced with more heuristics)
    return coverage.unverifiedRelationships
      .sort((a, b) => {
        // Prioritize relationships where tests exist but no integration
        if (a.reason === 'test-exists-but-no-integration' && b.reason === 'no-test') {
          return -1;
        }
        if (a.reason === 'no-test' && b.reason === 'test-exists-but-no-integration') {
          return 1;
        }
        return 0;
      })
      .slice(0, limit);
  }

  /**
   * Check if specific relationship is verified
   *
   * @param source - Source symbol ID
   * @param target - Target symbol ID
   * @param coverage - Coverage result
   * @returns Verified relationships or null
   * @public
   */
  isRelationshipVerified(
    source: string,
    target: string,
    coverage: RelationshipCoverage
  ): VerifiedRelationship[] | null {
    const targetMap = coverage.verificationMatrix.get(source);
    if (!targetMap) return null;

    const relationships = targetMap.get(target);
    return relationships || null;
  }

  /**
   * Get relationships verified by a specific test file
   *
   * @param testFilePath - Test file path
   * @param verifiedRelationships - All verified relationships
   * @returns Relationships verified by this test
   * @public
   */
  getRelationshipsByTest(
    testFilePath: string,
    verifiedRelationships: VerifiedRelationship[]
  ): VerifiedRelationship[] {
    return verifiedRelationships.filter((vr) => vr.verifiedBy === testFilePath);
  }

  /**
   * Get verification status for a specific symbol
   *
   * @param symbolId - Symbol ID
   * @param coverage - Coverage result
   * @returns Verification statistics for this symbol
   * @public
   */
  getSymbolVerificationStatus(
    symbolId: string,
    coverage: RelationshipCoverage
  ): {
    totalRelationships: number;
    verifiedCount: number;
    unverifiedCount: number;
    verifiedRelationships: { target: string; strength: string }[];
    unverifiedRelationships: { target: string; reason: string }[];
  } {
    // Outgoing relationships
    const targetMap = coverage.verificationMatrix.get(symbolId);
    const verified: { target: string; strength: string }[] = [];

    if (targetMap) {
      for (const [target, rels] of targetMap.entries()) {
        // Take the strongest verification
        const strongest = rels.reduce((prev, curr) =>
          this.compareStrength(curr.strength, prev.strength) > 0 ? curr : prev
        );
        verified.push({ target, strength: strongest.strength });
      }
    }

    const unverified = coverage.unverifiedRelationships
      .filter((ur) => ur.source === symbolId)
      .map((ur) => ({ target: ur.target, reason: ur.reason }));

    return {
      totalRelationships: verified.length + unverified.length,
      verifiedCount: verified.length,
      unverifiedCount: unverified.length,
      verifiedRelationships: verified,
      unverifiedRelationships: unverified,
    };
  }

  /**
   * Compare verification strengths
   */
  private compareStrength(a: string, b: string): number {
    const weights = { strong: 3, medium: 2, weak: 1 };
    return (weights[a as keyof typeof weights] || 0) - (weights[b as keyof typeof weights] || 0);
  }
}
