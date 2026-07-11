import { CanonicalGraphIndex, GraphAnalysisService } from '../../graph-analysis';
import type { CanonicalGraphEdge, CanonicalGraphNode, CanonicalProjectGraph } from '../../indexer';

const IDS = {
  api: 'src/api.ts#IService:interface',
  service: 'src/service.ts#Service:class',
  controller: 'src/controller.ts#Controller:class',
  duplicate: 'src/alternative.ts#Service:class',
  external: 'external/pkg.ts#External:function',
} as const;

describe('canonical graph analysis', () => {
  it('indexes raw ids, names, files, directions, and edge kinds', () => {
    const index = new CanonicalGraphIndex(fixtureGraph());

    expect(index.getNode(IDS.service)?.name).toBe('Service');
    expect(index.getNodesByName('Service').map((node) => node.id)).toEqual([
      IDS.duplicate,
      IDS.service,
    ]);
    expect(index.getNodesByFile('src/service.ts')).toHaveLength(1);
    expect(index.getOutgoingEdges(IDS.service).map((edge) => edge.to)).toEqual([
      IDS.api,
      IDS.external,
    ]);
    expect(index.getIncomingEdges(IDS.service).map((edge) => edge.from)).toEqual([IDS.controller]);
    expect(index.getEdgesByKind('implements')).toHaveLength(1);
  });

  it('resolves canonical ids exactly and reports ambiguous names', () => {
    const service = new GraphAnalysisService(fixtureGraph());

    expect(service.resolveSymbol(IDS.service)).toMatchObject({
      status: 'found',
      node: { id: IDS.service },
    });
    expect(service.resolveSymbol('IService')).toMatchObject({
      status: 'found',
      node: { id: IDS.api },
    });
    expect(service.resolveSymbol('Service')).toMatchObject({
      status: 'ambiguous',
      candidates: [{ id: IDS.duplicate }, { id: IDS.service }],
    });
    expect(service.resolveSymbol('Missing')).toEqual({ status: 'missing', query: 'Missing' });
  });

  it('uses outgoing edges for dependencies and incoming edges for dependents', () => {
    const service = new GraphAnalysisService(fixtureGraph());

    expect(service.dependencies(IDS.service).map(({ node }) => node.id)).toEqual([
      IDS.api,
      IDS.external,
    ]);
    expect(
      service.dependencies(IDS.service, { external: 'exclude' }).map(({ node }) => node.id)
    ).toEqual([IDS.api]);
    expect(service.dependents(IDS.service).map(({ node }) => node.id)).toEqual([IDS.controller]);
  });

  it('does not treat unknown or future structural kinds as dependencies by default', () => {
    const base = fixtureGraph();
    const graph: CanonicalProjectGraph = {
      ...base,
      edges: [...base.edges, { kind: 'contains', from: IDS.controller, to: IDS.api }],
    };
    const service = new GraphAnalysisService(graph);

    expect(service.dependencies(IDS.controller).map(({ edge }) => edge.kind)).toEqual([
      'instantiates',
    ]);
    expect(
      service.dependencies(IDS.controller, { edgeKinds: ['contains'] }).map(({ edge }) => edge.kind)
    ).toEqual(['contains']);
    expect(service.degreeMetrics().find(({ node }) => node.id === IDS.controller)).toMatchObject({
      dependencyCount: 1,
    });
  });

  it('traverses incoming impact cycle-safely and in deterministic depth order', () => {
    const service = new GraphAnalysisService(fixtureGraph());

    expect(service.impact(IDS.api, { maxDepth: 5 }).affected).toMatchObject([
      { depth: 1, node: { id: IDS.service }, edge: { kind: 'implements' } },
      { depth: 2, node: { id: IDS.controller }, edge: { kind: 'instantiates' } },
    ]);
    expect(service.impact(IDS.api, { maxDepth: 1 }).affected).toHaveLength(1);
    expect(() => service.impact(IDS.api, { maxDepth: -1 })).toThrow(
      'maxDepth must be a non-negative integer'
    );
  });

  it('reports deterministic structural summaries and degree metrics', () => {
    const service = new GraphAnalysisService(fixtureGraph());

    expect(service.summary()).toEqual({
      fingerprint: 'fixture-revision',
      nodeCount: 5,
      internalNodeCount: 4,
      externalNodeCount: 1,
      edgeCount: 4,
      isolatedNodeCount: 1,
      nodeKinds: { class: 3, function: 1, interface: 1 },
      edgeKinds: { accesses: 1, implements: 1, instantiates: 1, type_ref: 1 },
    });
    expect(service.degreeMetrics()[0]).toMatchObject({
      node: { id: IDS.service },
      dependencyCount: 2,
      internalDependencyCount: 1,
      externalDependencyCount: 1,
      dependentCount: 1,
      totalNeighborCount: 3,
    });
    expect(service.degreeMetrics().some(({ node }) => node.external === true)).toBe(false);
    expect(
      service
        .degreeMetrics({ includeExternalNodes: true })
        .some(({ node }) => node.external === true)
    ).toBe(true);
  });

  it('projects only known ontology mappings and preserves raw edge provenance', () => {
    const service = new GraphAnalysisService(
      fixtureGraph(),
      () => new Date('2026-07-11T00:00:00.000Z')
    );
    const relationships = service.projectUnifiedRelationships({
      categories: ['structural'],
    });

    expect(relationships).toHaveLength(3);
    expect(relationships.map((relationship) => relationship.type)).toEqual([
      'code-dependency',
      'implementation',
      'code-dependency',
    ]);
    expect(
      relationships.find((relationship) => relationship.type === 'implementation')
    ).toMatchObject({
      from: IDS.service,
      to: IDS.api,
      confidence: 1,
      discoveredBy: 'static-analysis',
      properties: {
        producer: '@ttsc/graph',
        rawEdgeKind: 'implements',
        graphContentFingerprint: 'fixture-revision',
        graphContractVersion: '1.0',
        graphTsconfigPath: '/repo/tsconfig.json',
        graphProvenance: { adapter: 'fixture', producer: '@ttsc/graph' },
      },
      createdAt: '2026-07-11T00:00:00.000Z',
    });
    expect(service.projectUnifiedRelationships({ edgeKinds: ['unknown_future_kind'] })).toEqual([]);
  });

  it('does not invent source evidence when a raw edge has none', () => {
    const graph: CanonicalProjectGraph = {
      ...fixtureGraph(),
      edges: [{ kind: 'implements', from: IDS.service, to: IDS.api }],
    };
    const relationship = new GraphAnalysisService(graph).projectUnifiedRelationships()[0];

    expect(relationship.evidence).toEqual([]);
    expect(relationship.filePath).toBeUndefined();
    expect(relationship.line).toBeUndefined();
  });

  it('counts prototype-like unknown kinds without corrupting the summary', () => {
    const base = fixtureGraph();
    const graph: CanonicalProjectGraph = {
      ...base,
      nodes: [{ ...base.nodes[0], kind: '__proto__' }, ...base.nodes.slice(1)],
      edges: [{ kind: 'constructor', from: IDS.service, to: IDS.api }],
    };

    expect(new GraphAnalysisService(graph).summary()).toMatchObject({
      nodeKinds: { __proto__: 1, class: 3, function: 1 },
      edgeKinds: { constructor: 1 },
    });
  });
});

function fixtureGraph(): CanonicalProjectGraph {
  const nodes: CanonicalGraphNode[] = [
    node(IDS.api, 'interface', 'IService', 'src/api.ts'),
    node(IDS.duplicate, 'class', 'Service', 'src/alternative.ts'),
    node(IDS.controller, 'class', 'Controller', 'src/controller.ts'),
    node(IDS.external, 'function', 'External', 'external/pkg.ts', true),
    node(IDS.service, 'class', 'Service', 'src/service.ts'),
  ];
  const edges: CanonicalGraphEdge[] = [
    edge('accesses', IDS.api, IDS.controller, 'src/api.ts', 1),
    edge('implements', IDS.service, IDS.api, 'src/service.ts', 3),
    edge('instantiates', IDS.controller, IDS.service, 'src/controller.ts', 8),
    edge('type_ref', IDS.service, IDS.external, 'src/service.ts', 4),
  ];
  return {
    contractVersion: '1.0',
    rootDir: '/repo',
    tsconfigPath: '/repo/tsconfig.json',
    nodes,
    edges,
    provenance: { adapter: 'fixture', producer: '@ttsc/graph', producerVersion: '0.16.8' },
    fingerprint: 'fixture-revision',
  };
}

function node(
  id: string,
  kind: string,
  name: string,
  file: string,
  external = false
): CanonicalGraphNode {
  return { id, sourceId: id, kind, name, qualifiedName: name, file, external };
}

function edge(
  kind: string,
  from: string,
  to: string,
  file: string,
  startLine: number
): CanonicalGraphEdge {
  return { kind, from, to, evidence: { file, startLine } };
}
