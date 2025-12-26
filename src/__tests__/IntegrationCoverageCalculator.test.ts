/**
 * IntegrationCoverageCalculator Tests
 */

import { IntegrationCoverageCalculator } from '../analyzer/IntegrationCoverageCalculator';
import type { SymbolGraph, Symbol, SymbolRelationship } from '../types/graph';
import type { VerifiedRelationship } from '../types/analysis/test-relationships';
import type { TestMapping } from '../types/tags';

describe('IntegrationCoverageCalculator', () => {
  // Helper to create mock graph
  function createMockGraph(
    symbols: Array<{ id: string; name: string; tests?: TestMapping[] }>,
    relationships: Array<{ from: string; to: string }>
  ): SymbolGraph {
    const symbolsMap = new Map<string, Symbol>();
    for (const s of symbols) {
      symbolsMap.set(s.id, {
        id: s.id,
        name: s.name,
        type: 'class',
        filePath: `src/${s.name}.ts`,
        line: 1,
        column: 1,
        isExported: true,
        isPublic: true,
        tests: s.tests || [],
        designDecisions: [],
      });
    }

    const rels: SymbolRelationship[] = relationships.map((r) => ({
      from: r.from,
      to: r.to,
      type: 'dependsOn',
      filePath: '',
    }));

    return {
      symbols: symbolsMap,
      relationships: rels,
      adjacencyList: new Map(),
      reverseAdjacencyList: new Map(),
    } as SymbolGraph;
  }

  // Helper to create verified relationship
  function createVerified(
    source: string,
    target: string,
    strength: 'strong' | 'medium' | 'weak' = 'medium',
    verifiedBy: string = 'test.test.ts'
  ): VerifiedRelationship {
    return {
      source,
      target,
      strength,
      verifiedBy,
      evidence: [
        {
          lineNumber: 10,
          codeSnippet: `// Test ${source} -> ${target}`,
          pattern: 'method-call',
        },
      ],
    };
  }

  // Helper to create test mapping
  function createTestMapping(symbolName: string, testFilePath: string): TestMapping {
    return {
      symbolName,
      testFilePath,
      testName: `test ${symbolName}`,
      scenarios: ['basic test'],
    };
  }

  describe('calculate', () => {
    it('should calculate coverage for fully verified graph', () => {
      const graph = createMockGraph(
        [
          { id: 'A', name: 'A' },
          { id: 'B', name: 'B' },
        ],
        [{ from: 'A', to: 'B' }]
      );

      const calculator = new IntegrationCoverageCalculator(graph);
      const verified = [createVerified('A', 'B')];
      const coverage = calculator.calculate(verified);

      expect(coverage.totalRelationships).toBe(1);
      expect(coverage.verifiedRelationships).toBe(1);
      expect(coverage.coveragePercentage).toBe(100);
      expect(coverage.unverifiedRelationships).toHaveLength(0);
    });

    it('should identify unverified relationships', () => {
      const graph = createMockGraph(
        [
          { id: 'A', name: 'A' },
          { id: 'B', name: 'B' },
          { id: 'C', name: 'C' },
        ],
        [
          { from: 'A', to: 'B' },
          { from: 'A', to: 'C' },
        ]
      );

      const calculator = new IntegrationCoverageCalculator(graph);
      const verified = [createVerified('A', 'B')];
      const coverage = calculator.calculate(verified);

      expect(coverage.totalRelationships).toBe(2);
      expect(coverage.verifiedRelationships).toBe(1);
      expect(coverage.coveragePercentage).toBe(50);
      expect(coverage.unverifiedRelationships).toHaveLength(1);
      expect(coverage.unverifiedRelationships[0].source).toBe('A');
      expect(coverage.unverifiedRelationships[0].target).toBe('C');
    });

    it('should count by verification strength', () => {
      const graph = createMockGraph(
        [
          { id: 'A', name: 'A' },
          { id: 'B', name: 'B' },
          { id: 'C', name: 'C' },
        ],
        [
          { from: 'A', to: 'B' },
          { from: 'A', to: 'C' },
        ]
      );

      const calculator = new IntegrationCoverageCalculator(graph);
      const verified = [
        createVerified('A', 'B', 'strong'),
        createVerified('A', 'C', 'weak'),
      ];
      const coverage = calculator.calculate(verified);

      expect(coverage.byStrength.strong).toBe(1);
      expect(coverage.byStrength.weak).toBe(1);
      expect(coverage.byStrength.medium).toBe(0);
    });

    it('should handle empty graph', () => {
      const graph = createMockGraph([], []);

      const calculator = new IntegrationCoverageCalculator(graph);
      const coverage = calculator.calculate([]);

      expect(coverage.totalRelationships).toBe(0);
      expect(coverage.verifiedRelationships).toBe(0);
      expect(coverage.coveragePercentage).toBe(0);
    });

    it('should determine unverified reason based on tests', () => {
      const graph = createMockGraph(
        [
          { id: 'A', name: 'A', tests: [createTestMapping('A', 'A.test.ts')] },
          { id: 'B', name: 'B' },
          { id: 'C', name: 'C' },
        ],
        [
          { from: 'A', to: 'B' },
          { from: 'C', to: 'B' },
        ]
      );

      const calculator = new IntegrationCoverageCalculator(graph);
      const coverage = calculator.calculate([]);

      // A has tests but no integration
      const aUnverified = coverage.unverifiedRelationships.find(
        (r) => r.source === 'A'
      );
      expect(aUnverified?.reason).toBe('test-exists-but-no-integration');

      // C has no tests
      const cUnverified = coverage.unverifiedRelationships.find(
        (r) => r.source === 'C'
      );
      expect(cUnverified?.reason).toBe('no-test');
    });

    it('should generate suggestions for unverified relationships', () => {
      const graph = createMockGraph(
        [
          { id: 'A', name: 'A' },
          { id: 'B', name: 'B' },
        ],
        [{ from: 'A', to: 'B' }]
      );

      const calculator = new IntegrationCoverageCalculator(graph);
      const coverage = calculator.calculate([]);

      expect(coverage.unverifiedRelationships[0].suggestion).toContain(
        'integration test'
      );
    });
  });

  describe('getTopUnverified', () => {
    it('should return top N unverified relationships', () => {
      const graph = createMockGraph(
        [
          { id: 'A', name: 'A' },
          { id: 'B', name: 'B' },
          { id: 'C', name: 'C' },
          { id: 'D', name: 'D' },
        ],
        [
          { from: 'A', to: 'B' },
          { from: 'A', to: 'C' },
          { from: 'A', to: 'D' },
        ]
      );

      const calculator = new IntegrationCoverageCalculator(graph);
      const coverage = calculator.calculate([]);
      const top = calculator.getTopUnverified(coverage, 2);

      expect(top).toHaveLength(2);
    });

    it('should prioritize test-exists-but-no-integration over no-test', () => {
      const graph = createMockGraph(
        [
          { id: 'A', name: 'A', tests: [createTestMapping('A', 'A.test.ts')] },
          { id: 'B', name: 'B' },
          { id: 'C', name: 'C' },
        ],
        [
          { from: 'A', to: 'C' },
          { from: 'B', to: 'C' },
        ]
      );

      const calculator = new IntegrationCoverageCalculator(graph);
      const coverage = calculator.calculate([]);
      const top = calculator.getTopUnverified(coverage, 10);

      expect(top[0].reason).toBe('test-exists-but-no-integration');
    });
  });

  describe('isRelationshipVerified', () => {
    it('should return verified relationships if exists', () => {
      const graph = createMockGraph(
        [
          { id: 'A', name: 'A' },
          { id: 'B', name: 'B' },
        ],
        [{ from: 'A', to: 'B' }]
      );

      const calculator = new IntegrationCoverageCalculator(graph);
      const verified = [createVerified('A', 'B', 'strong')];
      const coverage = calculator.calculate(verified);

      const result = calculator.isRelationshipVerified('A', 'B', coverage);

      expect(result).not.toBeNull();
      expect(result?.[0].strength).toBe('strong');
    });

    it('should return null if not verified', () => {
      const graph = createMockGraph(
        [
          { id: 'A', name: 'A' },
          { id: 'B', name: 'B' },
        ],
        [{ from: 'A', to: 'B' }]
      );

      const calculator = new IntegrationCoverageCalculator(graph);
      const coverage = calculator.calculate([]);

      const result = calculator.isRelationshipVerified('A', 'B', coverage);

      expect(result).toBeNull();
    });
  });

  describe('getRelationshipsByTest', () => {
    it('should filter relationships by test file', () => {
      const verified = [
        createVerified('A', 'B', 'strong', 'integration/A.test.ts'),
        createVerified('A', 'C', 'medium', 'integration/A.test.ts'),
        createVerified('X', 'Y', 'weak', 'integration/X.test.ts'),
      ];

      const graph = createMockGraph([], []);
      const calculator = new IntegrationCoverageCalculator(graph);

      const result = calculator.getRelationshipsByTest(
        'integration/A.test.ts',
        verified
      );

      expect(result).toHaveLength(2);
      expect(result.every((r) => r.verifiedBy === 'integration/A.test.ts')).toBe(
        true
      );
    });
  });

  describe('getSymbolVerificationStatus', () => {
    it('should return verification status for a symbol', () => {
      const graph = createMockGraph(
        [
          { id: 'A', name: 'A' },
          { id: 'B', name: 'B' },
          { id: 'C', name: 'C' },
        ],
        [
          { from: 'A', to: 'B' },
          { from: 'A', to: 'C' },
        ]
      );

      const calculator = new IntegrationCoverageCalculator(graph);
      const verified = [createVerified('A', 'B', 'strong')];
      const coverage = calculator.calculate(verified);

      const status = calculator.getSymbolVerificationStatus('A', coverage);

      expect(status.totalRelationships).toBe(2);
      expect(status.verifiedCount).toBe(1);
      expect(status.unverifiedCount).toBe(1);
      expect(status.verifiedRelationships[0].target).toBe('B');
      expect(status.verifiedRelationships[0].strength).toBe('strong');
      expect(status.unverifiedRelationships[0].target).toBe('C');
    });

    it('should take strongest verification when multiple exist', () => {
      const graph = createMockGraph(
        [
          { id: 'A', name: 'A' },
          { id: 'B', name: 'B' },
        ],
        [{ from: 'A', to: 'B' }]
      );

      const calculator = new IntegrationCoverageCalculator(graph);
      const verified = [
        createVerified('A', 'B', 'weak'),
        createVerified('A', 'B', 'strong'),
        createVerified('A', 'B', 'medium'),
      ];
      const coverage = calculator.calculate(verified);

      const status = calculator.getSymbolVerificationStatus('A', coverage);

      expect(status.verifiedRelationships[0].strength).toBe('strong');
    });
  });
});
