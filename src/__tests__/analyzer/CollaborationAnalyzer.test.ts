/**
 * CollaborationAnalyzer Tests
 */

import { CollaborationAnalyzer } from '../../analyzer/CollaborationAnalyzer';
import type { Symbol, SymbolGraph } from '../../types/graph';
import type { UnifiedRelationship } from '../../types/relationships';

describe('CollaborationAnalyzer', () => {
  // Helper to create mock symbol
  function createMockSymbol(id: string, name: string, filePath = 'src/test.ts'): Symbol {
    return {
      id,
      name,
      type: 'class',
      filePath,
      line: 1,
      column: 1,
      isExported: true,
      isPublic: true,
      tests: [],
      designDecisions: [],
    };
  }

  // Helper to create mock graph
  function createMockGraph(
    symbols: Symbol[],
    relationships: Array<{ from: string; to: string; type: string }> = []
  ): SymbolGraph {
    const symbolsMap = new Map<string, Symbol>();
    for (const s of symbols) {
      symbolsMap.set(s.id, s);
    }

    return {
      symbols: symbolsMap,
      relationships: relationships.map((r) => ({
        from: r.from,
        to: r.to,
        type: r.type as 'dependsOn' | 'relatedTo' | 'usedBy',
      })),
      adjacencyList: new Map(),
      reverseAdjacencyList: new Map(),
      nameIndex: new Map(),
      fileIndex: new Map(),
    } as SymbolGraph;
  }

  describe('constructor', () => {
    it('should create analyzer with graph', () => {
      const graph = createMockGraph([]);
      const analyzer = new CollaborationAnalyzer(graph);

      expect(analyzer).toBeDefined();
    });
  });

  describe('analyze', () => {
    it('should return empty array when no symbols', () => {
      const graph = createMockGraph([]);
      const analyzer = new CollaborationAnalyzer(graph);

      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should return empty array when no relationships', () => {
      const symbols = [
        createMockSymbol('class-a', 'ClassA'),
        createMockSymbol('class-b', 'ClassB'),
      ];
      const graph = createMockGraph(symbols);
      const analyzer = new CollaborationAnalyzer(graph);

      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should detect bidirectional dependencies', () => {
      const symbols = [
        createMockSymbol('class-a', 'ClassA', 'src/a.ts'),
        createMockSymbol('class-b', 'ClassB', 'src/b.ts'),
      ];
      const relationships = [
        { from: 'class-a', to: 'class-b', type: 'dependsOn' },
        { from: 'class-b', to: 'class-a', type: 'dependsOn' },
      ];
      const graph = createMockGraph(symbols, relationships);
      const analyzer = new CollaborationAnalyzer(graph);

      const result = analyzer.analyze();

      expect(result.length).toBeGreaterThanOrEqual(1);
      const collab = result.find((r) => r.type === 'collaboration');
      expect(collab).toBeDefined();
      expect(collab?.properties?.evidenceType).toBe('bidirectional-dependency');
    });

    it('should detect mutual calls', () => {
      const symbols = [
        createMockSymbol('service-a', 'ServiceA', 'src/a.ts'),
        createMockSymbol('service-b', 'ServiceB', 'src/b.ts'),
      ];
      const relationships = [
        { from: 'service-a', to: 'service-b', type: 'relatedTo' },
        { from: 'service-b', to: 'service-a', type: 'relatedTo' },
      ];
      const graph = createMockGraph(symbols, relationships);
      const analyzer = new CollaborationAnalyzer(graph);

      const result = analyzer.analyze();

      expect(result.length).toBeGreaterThanOrEqual(1);
      const collab = result.find((r) => r.type === 'collaboration');
      expect(collab).toBeDefined();
      expect(collab?.properties?.evidenceType).toBe('mutual-calls');
    });

    it('should detect mutual composition', () => {
      const symbols = [
        createMockSymbol('module-a', 'ModuleA', 'src/a.ts'),
        createMockSymbol('module-b', 'ModuleB', 'src/b.ts'),
      ];
      const relationships = [
        { from: 'module-a', to: 'module-b', type: 'usedBy' },
        { from: 'module-b', to: 'module-a', type: 'usedBy' },
      ];
      const graph = createMockGraph(symbols, relationships);
      const analyzer = new CollaborationAnalyzer(graph);

      const result = analyzer.analyze();

      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should not detect non-bidirectional dependencies', () => {
      const symbols = [
        createMockSymbol('class-a', 'ClassA'),
        createMockSymbol('class-b', 'ClassB'),
      ];
      const relationships = [{ from: 'class-a', to: 'class-b', type: 'dependsOn' }];
      const graph = createMockGraph(symbols, relationships);
      const analyzer = new CollaborationAnalyzer(graph);

      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should deduplicate collaboration pairs', () => {
      const symbols = [
        createMockSymbol('class-a', 'ClassA', 'src/a.ts'),
        createMockSymbol('class-b', 'ClassB', 'src/b.ts'),
      ];
      // Multiple bidirectional patterns for the same pair
      const relationships = [
        { from: 'class-a', to: 'class-b', type: 'dependsOn' },
        { from: 'class-b', to: 'class-a', type: 'dependsOn' },
        { from: 'class-a', to: 'class-b', type: 'relatedTo' },
        { from: 'class-b', to: 'class-a', type: 'relatedTo' },
      ];
      const graph = createMockGraph(symbols, relationships);
      const analyzer = new CollaborationAnalyzer(graph);

      const result = analyzer.analyze();

      // Should only have one collaboration for the pair despite multiple patterns
      const uniquePairs = new Set(
        result.map((r) => {
          const parts = [r.properties?.participantA, r.properties?.participantB].sort();
          return parts.join('-');
        })
      );
      expect(uniquePairs.size).toBe(result.length);
    });

    it('should handle missing symbols gracefully', () => {
      const symbols = [createMockSymbol('class-a', 'ClassA')];
      // Reference non-existent symbol
      const relationships = [
        { from: 'class-a', to: 'class-nonexistent', type: 'dependsOn' },
        { from: 'class-nonexistent', to: 'class-a', type: 'dependsOn' },
      ];
      const graph = createMockGraph(symbols, relationships);
      const analyzer = new CollaborationAnalyzer(graph);

      const result = analyzer.analyze();

      // Should not crash and should return empty (no valid collaboration found)
      expect(result).toHaveLength(0);
    });
  });

  describe('relationship structure', () => {
    it('should create valid UnifiedRelationship structure', () => {
      const symbols = [
        createMockSymbol('class-a', 'ClassA', 'src/a.ts'),
        createMockSymbol('class-b', 'ClassB', 'src/b.ts'),
      ];
      const relationships = [
        { from: 'class-a', to: 'class-b', type: 'dependsOn' },
        { from: 'class-b', to: 'class-a', type: 'dependsOn' },
      ];
      const graph = createMockGraph(symbols, relationships);
      const analyzer = new CollaborationAnalyzer(graph);

      const result = analyzer.analyze();

      expect(result.length).toBe(1);
      const rel = result[0];

      // Check required fields
      expect(rel.id).toBeDefined();
      expect(rel.type).toBe('collaboration');
      expect(rel.from).toBeDefined();
      expect(rel.to).toBeDefined();
      expect(rel.direction).toBe('bidirectional');
      expect(rel.strength).toBe('medium');
      expect(rel.category).toBe('behavioral');
      expect(rel.evidence).toBeDefined();
      expect(Array.isArray(rel.evidence)).toBe(true);
      expect(rel.discoveredBy).toBe('static-analysis');
      expect(rel.confidence).toBeGreaterThan(0);
      expect(rel.properties).toBeDefined();
      expect(rel.createdAt).toBeDefined();
      expect(rel.updatedAt).toBeDefined();
    });

    it('should include bidirectional participants', () => {
      const symbols = [
        createMockSymbol('class-a', 'ClassA', 'src/a.ts'),
        createMockSymbol('class-b', 'ClassB', 'src/b.ts'),
      ];
      const relationships = [
        { from: 'class-a', to: 'class-b', type: 'dependsOn' },
        { from: 'class-b', to: 'class-a', type: 'dependsOn' },
      ];
      const graph = createMockGraph(symbols, relationships);
      const analyzer = new CollaborationAnalyzer(graph);

      const result = analyzer.analyze();

      expect(result.length).toBe(1);
      const rel = result[0];

      // from and to should be arrays for collaboration
      expect(Array.isArray(rel.from)).toBe(true);
      expect(Array.isArray(rel.to)).toBe(true);
      expect((rel.from as string[]).length).toBe(2);
      expect((rel.to as string[]).length).toBe(2);
    });

    it('should set correct confidence based on evidence type', () => {
      const symbols = [
        createMockSymbol('class-a', 'ClassA', 'src/a.ts'),
        createMockSymbol('class-b', 'ClassB', 'src/b.ts'),
      ];
      const relationships = [
        { from: 'class-a', to: 'class-b', type: 'dependsOn' },
        { from: 'class-b', to: 'class-a', type: 'dependsOn' },
      ];
      const graph = createMockGraph(symbols, relationships);
      const analyzer = new CollaborationAnalyzer(graph);

      const result = analyzer.analyze();

      expect(result.length).toBe(1);
      // bidirectional-dependency should have 0.9 confidence
      expect(result[0].confidence).toBe(0.9);
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics for empty relationships', () => {
      const graph = createMockGraph([]);
      const analyzer = new CollaborationAnalyzer(graph);

      const stats = analyzer.getStatistics([]);

      expect(stats.totalCollaborations).toBe(0);
      expect(stats.uniqueCollaborators).toBe(0);
      expect(stats.byEvidenceType['bidirectional-dependency']).toBe(0);
      expect(stats.byEvidenceType['mutual-calls']).toBe(0);
      expect(stats.byEvidenceType['mutual-composition']).toBe(0);
      expect(stats.byEvidenceType['shared-context']).toBe(0);
    });

    it('should calculate statistics correctly', () => {
      const graph = createMockGraph([]);
      const analyzer = new CollaborationAnalyzer(graph);

      const relationships: UnifiedRelationship[] = [
        createMockCollabRelationship('class-a', 'class-b', 'bidirectional-dependency'),
        createMockCollabRelationship('service-a', 'service-b', 'mutual-calls'),
        createMockCollabRelationship('module-a', 'module-b', 'bidirectional-dependency'),
      ];

      const stats = analyzer.getStatistics(relationships);

      expect(stats.totalCollaborations).toBe(3);
      expect(stats.byEvidenceType['bidirectional-dependency']).toBe(2);
      expect(stats.byEvidenceType['mutual-calls']).toBe(1);
      expect(stats.uniqueCollaborators).toBe(6);
    });

    it('should count unique collaborators correctly', () => {
      const graph = createMockGraph([]);
      const analyzer = new CollaborationAnalyzer(graph);

      const relationships: UnifiedRelationship[] = [
        createMockCollabRelationship('class-a', 'class-b', 'bidirectional-dependency'),
        createMockCollabRelationship('class-a', 'class-c', 'mutual-calls'),
      ];

      const stats = analyzer.getStatistics(relationships);

      // class-a appears in both, so unique is 3 not 4
      expect(stats.uniqueCollaborators).toBe(3);
    });
  });

  // Helper to create mock collaboration relationship
  function createMockCollabRelationship(
    idA: string,
    idB: string,
    evidenceType: string
  ): UnifiedRelationship {
    return {
      id: `collaboration-${idA}-${idB}`.toLowerCase(),
      type: 'collaboration',
      category: 'behavioral',
      from: [idA, idB],
      to: [idA, idB],
      direction: 'bidirectional',
      strength: 'medium',
      evidence: [{ type: 'code', source: 'test.ts', confidence: 0.9 }],
      discoveredBy: 'static-analysis',
      confidence: 0.9,
      properties: {
        evidenceType,
        participantA: idA,
        participantB: idB,
        bidirectional: true,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
});
