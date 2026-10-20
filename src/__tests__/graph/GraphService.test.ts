/**
 * GraphService tests
 * @testScenario Impact analysis over unified relationships
 * @testScenario Bounded path search
 * @testScenario Cluster detection
 * @testScenario Centrality metrics
 */

import { type GraphDataSource, GraphService, type SymbolMetrics } from '../../graph/GraphService';
import type { SymbolRow } from '../../storage/DatabaseManager';
import type { UnifiedRelationship } from '../../types/relationships/unified';

interface EdgeSpec {
  from: string | string[];
  to: string | string[];
  type?: string;
  category?: string;
  confidence?: number;
}

function relationship(spec: EdgeSpec, index: number): UnifiedRelationship {
  return {
    id: `rel-${index}`,
    type: spec.type ?? 'code-dependency',
    category: spec.category ?? 'structural',
    from: spec.from,
    to: spec.to,
    confidence: spec.confidence ?? 1,
  } as unknown as UnifiedRelationship;
}

function dataSource(edges: EdgeSpec[], symbolIds: string[] = []): GraphDataSource {
  const relationships = edges.map(relationship);
  const includes = (value: string | string[], id: string) =>
    Array.isArray(value) ? value.includes(id) : value === id;
  const ids = new Set(symbolIds);
  for (const edge of edges) {
    for (const side of [edge.from, edge.to]) {
      for (const id of Array.isArray(side) ? side : [side]) ids.add(id);
    }
  }

  return {
    getAllUnifiedRelationships: () => relationships,
    getUnifiedRelationshipsBySymbol: (symbolId: string) =>
      relationships.filter((rel) => includes(rel.from, symbolId) || includes(rel.to, symbolId)),
    getAllSymbolRows: () =>
      Array.from(ids).map((id) => ({ id, name: id.toUpperCase() }) as unknown as SymbolRow),
    getRelationshipEdges: (category?: string) =>
      edges
        .filter((edge) => !category || (edge.category ?? 'structural') === category)
        .flatMap((edge) =>
          (Array.isArray(edge.from) ? edge.from : [edge.from]).flatMap((fromSymbolId) =>
            (Array.isArray(edge.to) ? edge.to : [edge.to]).map((toSymbolId) => ({
              fromSymbolId,
              toSymbolId,
            }))
          )
        ),
  };
}

describe('GraphService', () => {
  describe('analyzeImpact', () => {
    const edges: EdgeSpec[] = [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'c', category: 'semantic', type: 'related-to' },
      { from: 'a', to: 'd', confidence: 0.3 },
      { from: 'e', to: 'a' },
    ];

    it('follows relationships downstream breadth-first with depth and path', () => {
      const result = new GraphService(dataSource(edges)).analyzeImpact('a', {
        depth: 3,
        direction: 'downstream',
      });

      expect(result.map((node) => [node.symbolId, node.depth])).toEqual([
        ['b', 1],
        ['d', 1],
        ['c', 2],
      ]);
      expect(result.find((node) => node.symbolId === 'c')).toMatchObject({
        path: ['a', 'b', 'c'],
        relationshipType: 'related-to',
        category: 'semantic',
      });
    });

    it('follows relationships upstream', () => {
      const result = new GraphService(dataSource(edges)).analyzeImpact('c', {
        depth: 3,
        direction: 'upstream',
      });

      expect(result.map((node) => node.symbolId)).toEqual(['b', 'a', 'e']);
    });

    it('treats any other direction as both', () => {
      const result = new GraphService(dataSource(edges)).analyzeImpact('a', {
        depth: 1,
        direction: 'both',
      });

      expect(result.map((node) => node.symbolId).sort()).toEqual(['b', 'd', 'e']);
    });

    it('stops at the requested depth', () => {
      const result = new GraphService(dataSource(edges)).analyzeImpact('a', {
        depth: 1,
        direction: 'downstream',
      });

      expect(result.map((node) => node.symbolId)).toEqual(['b', 'd']);
    });

    it('filters by category and minimum confidence', () => {
      const service = new GraphService(dataSource(edges));

      expect(
        service
          .analyzeImpact('b', { depth: 2, direction: 'downstream', category: 'semantic' })
          .map((node) => node.symbolId)
      ).toEqual(['c']);
      expect(
        service
          .analyzeImpact('a', { depth: 1, direction: 'downstream', minConfidence: 0.5 })
          .map((node) => node.symbolId)
      ).toEqual(['b']);
    });

    it('never reports the start symbol, even through a cycle', () => {
      const cyclic = dataSource([
        { from: 'a', to: 'b' },
        { from: 'b', to: 'a' },
      ]);

      const result = new GraphService(cyclic).analyzeImpact('a', {
        depth: 5,
        direction: 'downstream',
      });

      expect(result.map((node) => node.symbolId)).toEqual(['b']);
    });
  });

  describe('assessRisk', () => {
    const service = new GraphService(dataSource([]));

    it.each([
      [0, 0, 'Low'],
      [1, 1, 'Low'],
      [5, 1, 'Medium'],
      [1, 2, 'Medium'],
      [19, 3, 'Medium'],
      [20, 1, 'High'],
      [1, 4, 'High'],
    ])('rates %i affected symbols at depth %i as %s', (count, depth, expected) => {
      expect(service.assessRisk(count, depth)).toBe(expected);
    });
  });

  describe('findPaths', () => {
    const diamond: EdgeSpec[] = [
      { from: 'a', to: 'b' },
      { from: 'a', to: 'c', category: 'semantic' },
      { from: 'b', to: 'd' },
      { from: 'c', to: 'd', category: 'semantic' },
      { from: 'd', to: 'a' },
    ];

    it('finds every unique path with relationship types on the edges', () => {
      const result = new GraphService(dataSource(diamond)).findPaths('a', 'd', { maxLength: 5 });

      const routes = result.paths.map((path) => path.nodes.map((node) => node.symbolId).join('>'));
      expect(routes.sort()).toEqual(['a>b>d', 'a>c>d']);
      expect(result.paths[0]).toMatchObject({ length: 2, strength: 1 / 3 });
      expect(result.nodeCount).toBe(4);
      expect(result.iterationLimitReached).toBe(false);
      expect(result.pathLimitReached).toBe(false);
    });

    it('does not revisit symbols on a path', () => {
      const result = new GraphService(dataSource(diamond)).findPaths('a', 'd', { maxLength: 8 });

      for (const path of result.paths) {
        const ids = path.nodes.map((node) => node.symbolId);
        expect(new Set(ids.slice(0, -1)).size).toBe(ids.length - 1);
      }
    });

    it('respects the maximum path length', () => {
      const chain = dataSource([
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
        { from: 'c', to: 'd' },
      ]);

      expect(new GraphService(chain).findPaths('a', 'd', { maxLength: 2 }).paths).toHaveLength(0);
      expect(new GraphService(chain).findPaths('a', 'd', { maxLength: 3 }).paths).toHaveLength(1);
    });

    it('filters edges by category', () => {
      const result = new GraphService(dataSource(diamond)).findPaths('a', 'd', {
        maxLength: 5,
        category: 'semantic',
      });

      expect(result.paths.map((path) => path.nodes.map((node) => node.symbolId))).toEqual([
        ['a', 'c', 'd'],
      ]);
    });

    it('returns nothing when the source has no outgoing relationships', () => {
      const result = new GraphService(dataSource(diamond)).findPaths('zzz', 'd', { maxLength: 5 });

      expect(result.paths).toEqual([]);
    });

    it('stops collecting at the path limit and says so', () => {
      // 8 parallel two-hop routes between a and z, repeated through 3 stages => 512 routes.
      const edges: EdgeSpec[] = [];
      let previous = 'a';
      for (let stage = 0; stage < 3; stage++) {
        const next = stage === 2 ? 'z' : `join${stage}`;
        for (let lane = 0; lane < 8; lane++) {
          edges.push({ from: previous, to: `s${stage}l${lane}` });
          edges.push({ from: `s${stage}l${lane}`, to: next });
        }
        previous = next;
      }

      const result = new GraphService(dataSource(edges)).findPaths('a', 'z', { maxLength: 8 });

      expect(result.pathLimitReached).toBe(true);
      expect(result.paths.length).toBeLessThanOrEqual(GraphService.MAX_PATHS);
    });
  });

  describe('findClusters', () => {
    const edges: EdgeSpec[] = [
      { from: 'a1', to: 'a2' },
      { from: 'a2', to: 'a3' },
      { from: 'a3', to: 'a1' },
      { from: 'b1', to: 'b2', category: 'semantic' },
      { from: 'b2', to: 'b3', category: 'semantic' },
      { from: 'b3', to: 'b1', category: 'semantic' },
      { from: 'a1', to: 'b1' },
    ];

    it('separates two dense groups joined by one bridge', () => {
      const { clusters, symbolCount, edgeCount } = new GraphService(dataSource(edges)).findClusters(
        { minSize: 3 }
      );

      expect(symbolCount).toBe(6);
      expect(edgeCount).toBe(7);
      expect(clusters).toHaveLength(2);
      const groups = clusters.map((cluster) => [...cluster.symbols].sort().join(',')).sort();
      expect(groups).toEqual(['a1,a2,a3', 'b1,b2,b3']);
      for (const cluster of clusters) {
        expect(cluster.internalEdges).toBe(3);
        expect(cluster.externalEdges).toBe(1);
        expect(cluster.cohesion).toBeCloseTo(0.75);
      }
    });

    it('reports the dominant relationship category of each cluster', () => {
      const { clusters } = new GraphService(dataSource(edges)).findClusters({ minSize: 3 });

      const bCluster = clusters.find((cluster) => cluster.symbols.includes('b2'));
      const aCluster = clusters.find((cluster) => cluster.symbols.includes('a2'));
      expect(bCluster?.dominantCategory).toBe('semantic');
      expect(aCluster?.dominantCategory).toBe('structural');
    });

    it('drops clusters smaller than the minimum size', () => {
      const { clusters } = new GraphService(dataSource(edges)).findClusters({ minSize: 4 });

      expect(clusters).toEqual([]);
    });

    it('only considers relationships in the requested category', () => {
      const { clusters, symbolCount } = new GraphService(dataSource(edges)).findClusters({
        minSize: 3,
        category: 'semantic',
      });

      expect(symbolCount).toBe(3);
      expect(clusters).toHaveLength(1);
    });
  });

  describe('calculateMetrics', () => {
    const edges: EdgeSpec[] = [
      { from: 'hub', to: 'x' },
      { from: 'hub', to: 'y' },
      { from: 'x', to: 'sink' },
      { from: 'y', to: 'sink' },
    ];

    function metricsById(metrics: SymbolMetrics[]) {
      return new Map(metrics.map((metric) => [metric.symbolId, metric]));
    }

    it('computes in/out degree per symbol, including isolated symbols', () => {
      const metrics = metricsById(
        new GraphService(dataSource(edges, ['lonely'])).calculateMetrics()
      );

      expect(metrics.get('hub')).toMatchObject({ inDegree: 0, outDegree: 2, degree: 2 });
      expect(metrics.get('sink')).toMatchObject({ inDegree: 2, outDegree: 0, degree: 2 });
      expect(metrics.get('x')).toMatchObject({ inDegree: 1, outDegree: 1, degree: 2 });
      expect(metrics.get('lonely')).toMatchObject({ degree: 0, symbolName: 'LONELY' });
    });

    it('scores PageRank and betweenness so the middle of the graph outranks isolates', () => {
      const metrics = metricsById(
        new GraphService(dataSource(edges, ['lonely'])).calculateMetrics()
      );

      expect(metrics.get('sink')!.pageRank).toBeGreaterThan(metrics.get('hub')!.pageRank);
      expect(metrics.get('x')!.betweenness).toBeGreaterThan(0);
      expect(metrics.get('lonely')!.betweenness).toBe(0);
      for (const metric of metrics.values()) {
        expect(metric.importance).toBeGreaterThanOrEqual(0);
        expect(metric.importance).toBeLessThanOrEqual(1);
      }
      expect(metrics.get('x')!.importance).toBeGreaterThan(metrics.get('lonely')!.importance);
    });

    it('honours the category filter', () => {
      const mixed = dataSource([
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c', category: 'semantic' },
      ]);

      const metrics = metricsById(
        new GraphService(mixed).calculateMetrics({ category: 'semantic' })
      );

      expect(metrics.get('a')?.degree).toBe(0);
      expect(metrics.get('b')).toMatchObject({ inDegree: 0, outDegree: 1 });
    });

    it('returns an empty list for an empty graph', () => {
      expect(new GraphService(dataSource([])).calculateMetrics()).toEqual([]);
    });
  });

  describe('interpretMetrics', () => {
    const service = new GraphService(dataSource([]));
    const base: SymbolMetrics = {
      symbolId: 's',
      symbolName: 's',
      degree: 0,
      inDegree: 0,
      outDegree: 0,
      betweenness: 0,
      pageRank: 0,
      importance: 0,
    };

    it.each([
      [{ degree: 60, betweenness: 0.02 }, 'Critical hub - architectural bottleneck'],
      [{ degree: 25, inDegree: 25, outDegree: 0 }, 'Core dependency - many symbols depend on this'],
      [{ degree: 25, inDegree: 0, outDegree: 25 }, 'Orchestrator - coordinates many components'],
      [{ degree: 2, betweenness: 0.05 }, 'Bridge - connects different parts of the system'],
      [{ degree: 25, inDegree: 12, outDegree: 13 }, 'Hub - highly connected symbol'],
      [{ degree: 3, inDegree: 3, outDegree: 1 }, 'Widely used - stable interface recommended'],
      [{ degree: 3, inDegree: 1, outDegree: 3 }, 'Integration point - depends on many symbols'],
      [{ degree: 2, inDegree: 1, outDegree: 1 }, 'Standard component'],
    ])('classifies %j', (overrides, expected) => {
      expect(service.interpretMetrics({ ...base, ...overrides })).toBe(expected);
    });
  });
});
