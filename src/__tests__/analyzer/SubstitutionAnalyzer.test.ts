/**
 * SubstitutionAnalyzer Tests
 */

import { SubstitutionAnalyzer } from '../../analyzer/SubstitutionAnalyzer';
import type { SymbolGraph, Symbol, SymbolRelationship } from '../../types/graph';
import type { UnifiedRelationship } from '../../types/relationships';

describe('SubstitutionAnalyzer', () => {
  // Helper to create mock graph with symbols and relationships
  function createMockGraph(
    symbols: Array<{ id: string; name: string; type?: string; filePath?: string; line?: number }>,
    relationships: SymbolRelationship[] = []
  ): SymbolGraph {
    const symbolsMap = new Map<string, Symbol>();
    for (const s of symbols) {
      symbolsMap.set(s.id, {
        id: s.id,
        name: s.name,
        type: (s.type as Symbol['type']) || 'class',
        filePath: s.filePath || `src/${s.name}.ts`,
        line: s.line || 1,
        column: 1,
        isExported: true,
        isPublic: true,
        tests: [],
        designDecisions: [],
      });
    }

    return {
      symbols: symbolsMap,
      relationships,
      adjacencyList: new Map(),
      reverseAdjacencyList: new Map(),
      nameIndex: new Map(),
      fileIndex: new Map(),
    } as SymbolGraph;
  }

  // Helper to create implements relationship
  function createImplementsRelationship(
    from: string,
    to: string
  ): SymbolRelationship {
    return {
      type: 'implements',
      from,
      to,
      filePath: `src/${from}.ts`,
    };
  }

  // Helper to create extends relationship
  function createExtendsRelationship(
    from: string,
    to: string
  ): SymbolRelationship {
    return {
      type: 'extends',
      from,
      to,
      filePath: `src/${from}.ts`,
    };
  }

  describe('constructor', () => {
    it('should create analyzer with graph', () => {
      const graph = createMockGraph([]);
      const analyzer = new SubstitutionAnalyzer(graph);
      expect(analyzer).toBeDefined();
    });
  });

  describe('analyze', () => {
    it('should return empty array when no relationships exist', () => {
      const graph = createMockGraph([]);
      const analyzer = new SubstitutionAnalyzer(graph);

      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should return empty array when only one implementation exists', () => {
      const graph = createMockGraph(
        [
          { id: 'interface-iservice', name: 'IService', type: 'interface' },
          { id: 'class-serviceimpl', name: 'ServiceImpl' },
        ],
        [createImplementsRelationship('class-serviceimpl', 'interface-iservice')]
      );

      const analyzer = new SubstitutionAnalyzer(graph);
      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should detect substitution between two classes implementing same interface', () => {
      const graph = createMockGraph(
        [
          { id: 'interface-iservice', name: 'IService', type: 'interface' },
          { id: 'class-servicea', name: 'ServiceA', filePath: 'src/ServiceA.ts', line: 5 },
          { id: 'class-serviceb', name: 'ServiceB', filePath: 'src/ServiceB.ts', line: 10 },
        ],
        [
          createImplementsRelationship('class-servicea', 'interface-iservice'),
          createImplementsRelationship('class-serviceb', 'interface-iservice'),
        ]
      );

      const analyzer = new SubstitutionAnalyzer(graph);
      const result = analyzer.analyze();

      expect(result).toHaveLength(1);
      const rel = result[0];
      expect(rel.type).toBe('substitution');
      expect(rel.direction).toBe('undirected');
      expect(rel.strength).toBe('medium');
      expect(rel.category).toBe('alternative');
      expect(rel.confidence).toBe(0.9); // Interface-based
      expect(rel.from).toContain('class-servicea');
      expect(rel.from).toContain('class-serviceb');
      expect(rel.to).toBe('interface-iservice');
      expect(rel.properties?.relationshipType).toBe('interface');
    });

    it('should detect substitution between three classes implementing same interface', () => {
      const graph = createMockGraph(
        [
          { id: 'interface-ihandler', name: 'IHandler', type: 'interface' },
          { id: 'class-handlera', name: 'HandlerA' },
          { id: 'class-handlerb', name: 'HandlerB' },
          { id: 'class-handlerc', name: 'HandlerC' },
        ],
        [
          createImplementsRelationship('class-handlera', 'interface-ihandler'),
          createImplementsRelationship('class-handlerb', 'interface-ihandler'),
          createImplementsRelationship('class-handlerc', 'interface-ihandler'),
        ]
      );

      const analyzer = new SubstitutionAnalyzer(graph);
      const result = analyzer.analyze();

      // 3 implementations = C(3,2) = 3 pairwise relationships
      expect(result).toHaveLength(3);

      // All should reference IHandler
      for (const rel of result) {
        expect(rel.to).toBe('interface-ihandler');
        expect(rel.properties?.totalImplementations).toBe(3);
      }
    });

    it('should detect substitution for inheritance (extends)', () => {
      const graph = createMockGraph(
        [
          { id: 'class-baseservice', name: 'BaseService' },
          { id: 'class-deriveda', name: 'DerivedA' },
          { id: 'class-derivedb', name: 'DerivedB' },
        ],
        [
          createExtendsRelationship('class-deriveda', 'class-baseservice'),
          createExtendsRelationship('class-derivedb', 'class-baseservice'),
        ]
      );

      const analyzer = new SubstitutionAnalyzer(graph);
      const result = analyzer.analyze();

      expect(result).toHaveLength(1);
      const rel = result[0];
      expect(rel.properties?.relationshipType).toBe('inheritance');
      expect(rel.confidence).toBe(0.8); // Inheritance-based
    });

    it('should handle multiple interfaces independently', () => {
      const graph = createMockGraph(
        [
          { id: 'interface-ia', name: 'IA', type: 'interface' },
          { id: 'interface-ib', name: 'IB', type: 'interface' },
          { id: 'class-implai', name: 'ImplA1' },
          { id: 'class-implaii', name: 'ImplA2' },
          { id: 'class-implbi', name: 'ImplB1' },
          { id: 'class-implbii', name: 'ImplB2' },
        ],
        [
          createImplementsRelationship('class-implai', 'interface-ia'),
          createImplementsRelationship('class-implaii', 'interface-ia'),
          createImplementsRelationship('class-implbi', 'interface-ib'),
          createImplementsRelationship('class-implbii', 'interface-ib'),
        ]
      );

      const analyzer = new SubstitutionAnalyzer(graph);
      const result = analyzer.analyze();

      // 2 substitutions (one for each interface)
      expect(result).toHaveLength(2);

      const iaRels = result.filter((r) => r.to === 'interface-ia');
      const ibRels = result.filter((r) => r.to === 'interface-ib');

      expect(iaRels).toHaveLength(1);
      expect(ibRels).toHaveLength(1);
    });

    it('should skip relationships when symbol not found in graph', () => {
      const graph = createMockGraph(
        [{ id: 'interface-iservice', name: 'IService', type: 'interface' }],
        [createImplementsRelationship('class-missing', 'interface-iservice')]
      );

      const analyzer = new SubstitutionAnalyzer(graph);
      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should include correct evidence in relationships', () => {
      const graph = createMockGraph(
        [
          { id: 'interface-iservice', name: 'IService', type: 'interface' },
          { id: 'class-servicea', name: 'ServiceA', filePath: 'src/ServiceA.ts', line: 5 },
          { id: 'class-serviceb', name: 'ServiceB', filePath: 'src/ServiceB.ts', line: 10 },
        ],
        [
          createImplementsRelationship('class-servicea', 'interface-iservice'),
          createImplementsRelationship('class-serviceb', 'interface-iservice'),
        ]
      );

      const analyzer = new SubstitutionAnalyzer(graph);
      const result = analyzer.analyze();

      expect(result).toHaveLength(1);
      const rel = result[0];

      expect(rel.evidence).toHaveLength(2);
      expect(rel.evidence[0].type).toBe('code');
      expect(rel.evidence[0].confidence).toBe(1.0);
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics for empty relationships', () => {
      const graph = createMockGraph([]);
      const analyzer = new SubstitutionAnalyzer(graph);

      const stats = analyzer.getStatistics([]);

      expect(stats.totalSubstitutions).toBe(0);
      expect(stats.interfaceBased).toBe(0);
      expect(stats.inheritanceBased).toBe(0);
      expect(stats.baseTypes.size).toBe(0);
      expect(stats.averageImplementations).toBe(0);
    });

    it('should calculate statistics correctly', () => {
      const graph = createMockGraph([]);
      const analyzer = new SubstitutionAnalyzer(graph);

      const relationships: UnifiedRelationship[] = [
        createMockSubstitution('ClassA', 'ClassB', 'IService', 'interface'),
        createMockSubstitution('ClassC', 'ClassD', 'IService', 'interface'),
        createMockSubstitution('DerivedA', 'DerivedB', 'BaseClass', 'inheritance'),
      ];

      const stats = analyzer.getStatistics(relationships);

      expect(stats.totalSubstitutions).toBe(3);
      expect(stats.interfaceBased).toBe(2);
      expect(stats.inheritanceBased).toBe(1);
      expect(stats.baseTypes.size).toBe(2);
      expect(stats.baseTypes.has('IService')).toBe(true);
      expect(stats.baseTypes.has('BaseClass')).toBe(true);
    });

    it('should calculate average implementations correctly', () => {
      const graph = createMockGraph([]);
      const analyzer = new SubstitutionAnalyzer(graph);

      const relationships: UnifiedRelationship[] = [
        createMockSubstitution('A1', 'A2', 'InterfaceA', 'interface'),
        createMockSubstitution('A1', 'A3', 'InterfaceA', 'interface'),
        createMockSubstitution('A2', 'A3', 'InterfaceA', 'interface'),
        createMockSubstitution('B1', 'B2', 'InterfaceB', 'interface'),
      ];

      const stats = analyzer.getStatistics(relationships);

      // InterfaceA: 3 relationships, InterfaceB: 1 relationship
      // Total: 4, BaseTypes: 2
      expect(stats.averageImplementations).toBe(2); // 4/2
    });
  });

  // Helper to create mock substitution relationship
  function createMockSubstitution(
    impl1: string,
    impl2: string,
    baseType: string,
    relationshipType: 'interface' | 'inheritance'
  ): UnifiedRelationship {
    return {
      id: `substitution-${impl1}-${impl2}`,
      type: 'substitution',
      from: [`class-${impl1.toLowerCase()}`, `class-${impl2.toLowerCase()}`],
      to: `${relationshipType === 'interface' ? 'interface' : 'class'}-${baseType.toLowerCase()}`,
      direction: 'undirected',
      strength: 'medium',
      category: 'alternative',
      evidence: [
        { type: 'code', source: `src/${impl1}.ts`, confidence: 1.0 },
        { type: 'code', source: `src/${impl2}.ts`, confidence: 1.0 },
      ],
      discoveredBy: 'static-analysis',
      confidence: relationshipType === 'interface' ? 0.9 : 0.8,
      properties: {
        baseType,
        relationshipType,
        impl1,
        impl2,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
});
