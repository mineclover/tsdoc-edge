/**
 * DependencyChainAnalyzer Tests
 */

import { DependencyChainAnalyzer } from '../../analyzer/DependencyChainAnalyzer';
import type { SymbolGraph } from '../../types/graph';

describe('DependencyChainAnalyzer', () => {
  // Helper to create a mock symbol with all required properties
  function createMockSymbol(id: string, name: string, filePath = 'test.ts', line = 1): any {
    return {
      id,
      name,
      type: 'class',
      filePath,
      line,
      column: 1,
      isExported: true,
      isPublic: true,
      documentation: '',
      signature: '',
    };
  }

  // Helper to create a mock graph
  function createMockGraph(options: {
    symbols?: Array<{ id: string; name: string; filePath?: string; line?: number }>;
    edges?: Array<{ from: string; to: string }>;
  } = {}): SymbolGraph {
    const symbols = new Map<string, any>();
    const adjacencyList = new Map<string, string[]>();

    for (const sym of options.symbols || []) {
      symbols.set(sym.id, createMockSymbol(sym.id, sym.name, sym.filePath, sym.line));
      adjacencyList.set(sym.id, []);
    }

    for (const edge of options.edges || []) {
      const deps = adjacencyList.get(edge.from) || [];
      deps.push(edge.to);
      adjacencyList.set(edge.from, deps);
    }

    return {
      symbols,
      adjacencyList,
      reverseAdjacencyList: new Map(),
    } as SymbolGraph;
  }

  describe('constructor', () => {
    it('should create instance with graph', () => {
      const graph = createMockGraph();
      const analyzer = new DependencyChainAnalyzer(graph);
      expect(analyzer).toBeInstanceOf(DependencyChainAnalyzer);
    });
  });

  describe('buildChains', () => {
    it('should build linear chain', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' },
          { id: 'c', name: 'C' },
        ],
        edges: [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'c' },
        ],
      });

      const analyzer = new DependencyChainAnalyzer(graph);
      const chains = analyzer.buildChains('a');

      expect(chains.length).toBeGreaterThan(0);
      expect(chains[0].startSymbolId).toBe('a');
      expect(chains[0].path).toContain('a');
      expect(chains[0].path).toContain('b');
      expect(chains[0].path).toContain('c');
    });

    it('should detect circular dependency', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' },
        ],
        edges: [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'a' },
        ],
      });

      const analyzer = new DependencyChainAnalyzer(graph);
      const chains = analyzer.buildChains('a');

      const circularChain = chains.find(c => c.hasCircular);
      expect(circularChain).toBeDefined();
      expect(circularChain?.circularPath).toBeDefined();
    });

    it('should respect maxDepth', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' },
          { id: 'c', name: 'C' },
          { id: 'd', name: 'D' },
          { id: 'e', name: 'E' },
        ],
        edges: [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'c' },
          { from: 'c', to: 'd' },
          { from: 'd', to: 'e' },
        ],
      });

      const analyzer = new DependencyChainAnalyzer(graph);
      const chains = analyzer.buildChains('a', 2);

      // With maxDepth 2, should not reach 'e'
      const allSymbols = chains.flatMap(c => c.path);
      expect(allSymbols).not.toContain('e');
    });

    it('should handle symbol with no dependencies', () => {
      const graph = createMockGraph({
        symbols: [{ id: 'alone', name: 'Alone' }],
        edges: [],
      });

      const analyzer = new DependencyChainAnalyzer(graph);
      const chains = analyzer.buildChains('alone');

      expect(chains).toHaveLength(0);
    });

    it('should handle non-existent symbol', () => {
      const graph = createMockGraph();
      const analyzer = new DependencyChainAnalyzer(graph);
      const chains = analyzer.buildChains('non-existent');

      expect(chains).toHaveLength(0);
    });

    it('should handle multiple branches (fan-out)', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'root', name: 'Root' },
          { id: 'branch1', name: 'Branch1' },
          { id: 'branch2', name: 'Branch2' },
        ],
        edges: [
          { from: 'root', to: 'branch1' },
          { from: 'root', to: 'branch2' },
        ],
      });

      const analyzer = new DependencyChainAnalyzer(graph);
      const chains = analyzer.buildChains('root');

      expect(chains.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('detectCircularDependencies', () => {
    it('should detect simple circular dependency', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' },
        ],
        edges: [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'a' },
        ],
      });

      const analyzer = new DependencyChainAnalyzer(graph);
      const circulars = analyzer.detectCircularDependencies();

      expect(circulars.length).toBeGreaterThan(0);
      expect(circulars[0].symbols).toContain('a');
      expect(circulars[0].symbols).toContain('b');
    });

    it('should detect longer circular chain', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' },
          { id: 'c', name: 'C' },
        ],
        edges: [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'c' },
          { from: 'c', to: 'a' },
        ],
      });

      const analyzer = new DependencyChainAnalyzer(graph);
      const circulars = analyzer.detectCircularDependencies();

      expect(circulars.length).toBeGreaterThan(0);
      expect(circulars[0].length).toBeGreaterThanOrEqual(3);
    });

    it('should return empty array when no circular dependencies', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' },
          { id: 'c', name: 'C' },
        ],
        edges: [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'c' },
        ],
      });

      const analyzer = new DependencyChainAnalyzer(graph);
      const circulars = analyzer.detectCircularDependencies();

      expect(circulars).toHaveLength(0);
    });

    it('should handle empty graph', () => {
      const graph = createMockGraph();
      const analyzer = new DependencyChainAnalyzer(graph);
      const circulars = analyzer.detectCircularDependencies();

      expect(circulars).toHaveLength(0);
    });

    it('should handle disconnected components', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'a1', name: 'A1' },
          { id: 'b1', name: 'B1' },
          { id: 'a2', name: 'A2' },
          { id: 'b2', name: 'B2' },
        ],
        edges: [
          { from: 'a1', to: 'b1' },
          { from: 'b1', to: 'a1' },
          // a2, b2 are disconnected
        ],
      });

      const analyzer = new DependencyChainAnalyzer(graph);
      const circulars = analyzer.detectCircularDependencies();

      expect(circulars.length).toBe(1);
    });
  });

  describe('analyzeHotspots', () => {
    it('should identify hotspot with many dependencies', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'hot', name: 'Hotspot' },
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' },
          { id: 'c', name: 'C' },
        ],
        edges: [
          { from: 'a', to: 'hot' },
          { from: 'b', to: 'hot' },
          { from: 'c', to: 'hot' },
          { from: 'hot', to: 'a' },
        ],
      });

      const analyzer = new DependencyChainAnalyzer(graph);
      const hotspots = analyzer.analyzeHotspots();

      const hotSymbol = hotspots.find(h => h.symbolId === 'hot');
      expect(hotSymbol).toBeDefined();
      expect(hotSymbol!.incomingCount).toBe(3);
      expect(hotSymbol!.outgoingCount).toBe(1);
    });

    it('should sort by score descending', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'low', name: 'Low' },
          { id: 'high', name: 'High' },
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' },
        ],
        edges: [
          { from: 'a', to: 'high' },
          { from: 'b', to: 'high' },
        ],
      });

      const analyzer = new DependencyChainAnalyzer(graph);
      const hotspots = analyzer.analyzeHotspots();

      expect(hotspots[0].symbolId).toBe('high');
    });

    it('should respect topN parameter', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' },
          { id: 'c', name: 'C' },
          { id: 'd', name: 'D' },
          { id: 'e', name: 'E' },
        ],
      });

      const analyzer = new DependencyChainAnalyzer(graph);
      const hotspots = analyzer.analyzeHotspots(3);

      expect(hotspots.length).toBeLessThanOrEqual(3);
    });

    it('should assign correct ranks', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'critical', name: 'Critical' },
          { id: 'high', name: 'High' },
          { id: 'medium', name: 'Medium' },
          { id: 'low', name: 'Low' },
        ],
      });

      // Create edges to make 'critical' have high score
      for (let i = 0; i < 15; i++) {
        const id = `dep${i}`;
        graph.symbols.set(id, createMockSymbol(id, `Dep${i}`));
        graph.adjacencyList.set(id, ['critical']);
      }

      const analyzer = new DependencyChainAnalyzer(graph);
      const hotspots = analyzer.analyzeHotspots();

      const criticalSymbol = hotspots.find(h => h.symbolId === 'critical');
      expect(criticalSymbol?.rank).toBe('critical');
    });
  });

  describe('calculateComplexity', () => {
    it('should calculate complexity for short chain', () => {
      const graph = createMockGraph();
      const analyzer = new DependencyChainAnalyzer(graph);

      const chain = {
        id: 'test-chain',
        chainType: 'linear' as const,
        startSymbolId: 'a',
        endSymbolId: 'b',
        path: ['a', 'b'],
        length: 2,
        hasCircular: false,
      };

      const complexity = analyzer.calculateComplexity(chain);
      expect(complexity).toBeGreaterThanOrEqual(0);
      expect(complexity).toBeLessThanOrEqual(10);
    });

    it('should give higher complexity for longer chains', () => {
      const graph = createMockGraph();
      const analyzer = new DependencyChainAnalyzer(graph);

      const shortChain = {
        id: 'short',
        chainType: 'linear' as const,
        startSymbolId: 'a',
        endSymbolId: 'b',
        path: ['a', 'b'],
        length: 2,
        hasCircular: false,
      };

      const longChain = {
        id: 'long',
        chainType: 'linear' as const,
        startSymbolId: 'a',
        endSymbolId: 'f',
        path: ['a', 'b', 'c', 'd', 'e', 'f'],
        length: 6,
        hasCircular: false,
      };

      expect(analyzer.calculateComplexity(longChain)).toBeGreaterThan(
        analyzer.calculateComplexity(shortChain)
      );
    });

    it('should give highest complexity for circular chains', () => {
      const graph = createMockGraph();
      const analyzer = new DependencyChainAnalyzer(graph);

      const linearChain = {
        id: 'linear',
        chainType: 'linear' as const,
        startSymbolId: 'a',
        endSymbolId: 'b',
        path: ['a', 'b'],
        length: 2,
        hasCircular: false,
      };

      const circularChain = {
        id: 'circular',
        chainType: 'linear' as const,
        startSymbolId: 'a',
        endSymbolId: 'a',
        path: ['a', 'b', 'a'],
        length: 3,
        hasCircular: true,
        circularPath: ['a', 'b'],
      };

      expect(analyzer.calculateComplexity(circularChain)).toBeGreaterThan(
        analyzer.calculateComplexity(linearChain)
      );
    });

    it('should cap complexity at 10', () => {
      const graph = createMockGraph();
      const analyzer = new DependencyChainAnalyzer(graph);

      const extremeChain = {
        id: 'extreme',
        chainType: 'linear' as const,
        startSymbolId: 'a',
        endSymbolId: 'z',
        path: Array.from({ length: 50 }, (_, i) => `node${i}`),
        length: 50,
        hasCircular: true,
        circularPath: ['a', 'b', 'c'],
      };

      expect(analyzer.calculateComplexity(extremeChain)).toBe(10);
    });
  });

  describe('analyzeCircularDependencies', () => {
    it('should return unified relationships for circular dependencies', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'a', name: 'A', filePath: 'a.ts', line: 10 },
          { id: 'b', name: 'B', filePath: 'b.ts', line: 20 },
        ],
        edges: [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'a' },
        ],
      });

      const analyzer = new DependencyChainAnalyzer(graph);
      const relationships = analyzer.analyzeCircularDependencies();

      expect(relationships.length).toBeGreaterThan(0);
      expect(relationships[0].type).toBe('circular-dependency');
      expect(relationships[0].category).toBe('quality');
      expect(relationships[0].direction).toBe('bidirectional');
      expect(relationships[0].properties.cyclePath).toBeDefined();
    });

    it('should deduplicate equivalent cycles', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' },
        ],
        edges: [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'a' },
        ],
      });

      const analyzer = new DependencyChainAnalyzer(graph);
      const relationships = analyzer.analyzeCircularDependencies();

      // A→B→A and B→A→B should be deduplicated
      expect(relationships.length).toBe(1);
    });

    it('should assign risk levels based on cycle length', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' },
          { id: 'c', name: 'C' },
          { id: 'd', name: 'D' },
        ],
        edges: [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'c' },
          { from: 'c', to: 'd' },
          { from: 'd', to: 'a' },
        ],
      });

      const analyzer = new DependencyChainAnalyzer(graph);
      const relationships = analyzer.analyzeCircularDependencies();

      if (relationships.length > 0) {
        // Long cycle (4+ symbols) should be high risk
        expect(relationships[0].properties.riskLevel).toBe('high');
      }
    });
  });

  describe('getCircularStatistics', () => {
    it('should compute statistics for circular dependencies', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' },
        ],
        edges: [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'a' },
        ],
      });

      const analyzer = new DependencyChainAnalyzer(graph);
      const relationships = analyzer.analyzeCircularDependencies();
      const stats = analyzer.getCircularStatistics(relationships);

      expect(stats.totalCycles).toBe(relationships.length);
      expect(stats.affectedSymbols.size).toBeGreaterThan(0);
    });

    it('should count by length', () => {
      const mockRelationships = [
        {
          type: 'circular-dependency',
          properties: { cycleLength: 2, involvedSymbols: ['a', 'b'], riskLevel: 'low' },
        },
        {
          type: 'circular-dependency',
          properties: { cycleLength: 3, involvedSymbols: ['c', 'd', 'e'], riskLevel: 'medium' },
        },
      ] as any;

      const graph = createMockGraph();
      const analyzer = new DependencyChainAnalyzer(graph);
      const stats = analyzer.getCircularStatistics(mockRelationships);

      expect(stats.byLength[2]).toBe(1);
      expect(stats.byLength[3]).toBe(1);
    });

    it('should count risk levels', () => {
      const mockRelationships = [
        { type: 'circular-dependency', properties: { riskLevel: 'high', involvedSymbols: [] } },
        { type: 'circular-dependency', properties: { riskLevel: 'medium', involvedSymbols: [] } },
        { type: 'circular-dependency', properties: { riskLevel: 'low', involvedSymbols: [] } },
      ] as any;

      const graph = createMockGraph();
      const analyzer = new DependencyChainAnalyzer(graph);
      const stats = analyzer.getCircularStatistics(mockRelationships);

      expect(stats.highRisk).toBe(1);
      expect(stats.mediumRisk).toBe(1);
      expect(stats.lowRisk).toBe(1);
    });
  });

  describe('chain type determination', () => {
    it('should identify linear chain', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' },
          { id: 'c', name: 'C' },
        ],
        edges: [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'c' },
        ],
      });

      const analyzer = new DependencyChainAnalyzer(graph);
      const chains = analyzer.buildChains('a');

      const linearChain = chains.find(c => c.chainType === 'linear');
      expect(linearChain).toBeDefined();
    });

    it('should identify fan-out pattern', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'root', name: 'Root' },
          { id: 'leaf1', name: 'Leaf1' },
          { id: 'leaf2', name: 'Leaf2' },
          { id: 'leaf3', name: 'Leaf3' },
        ],
        edges: [
          { from: 'root', to: 'leaf1' },
          { from: 'root', to: 'leaf2' },
          { from: 'root', to: 'leaf3' },
        ],
      });

      const analyzer = new DependencyChainAnalyzer(graph);
      const chains = analyzer.buildChains('root');

      // Multiple leaf chains from same root
      expect(chains.length).toBeGreaterThanOrEqual(3);
    });
  });
});
