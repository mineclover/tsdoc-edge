import type { CanonicalProjectGraph } from '../../indexer/contracts';
import {
  assertTopologyEdge,
  buildFactTopologyProjection,
  createDerivedTopologyEdge,
  createFactOccurrence,
  type FactOccurrence,
  type FactTopologyPolicies,
  type TopologyEdge,
} from '../../semantic-graph/fact-topology';

const strictPolicies: FactTopologyPolicies = {
  unknownEndpoint: 'reject',
  duplicateFact: 'reject',
};

describe('fact occurrence and topology kernel', () => {
  it('preserves repeated source observations while aggregating one deterministic topology edge', () => {
    const first = fact({
      providerLocalFactId: 'call:one',
      sourceAnchor: { file: 'src/a.ts', startLine: 4, vendorOffset: 20 },
      confidence: 0.75,
      capabilities: { 'fact-occurrence-completeness': 'complete' },
      provenance: { snapshotId: 'provider-snapshot:one', producer: '@ttsc/graph' },
    });
    const second = fact({
      providerLocalFactId: 'call:two',
      sourceAnchor: { file: 'src/a.ts', startLine: 9, vendorOffset: 80 },
      confidence: 0.9,
      capabilities: { 'fact-occurrence-completeness': 'partial' },
      provenance: { snapshotId: 'provider-snapshot:one', producer: '@ttsc/graph' },
    });

    const projection = buildFactTopologyProjection({
      graph: graph(),
      occurrences: [second, first],
      policies: strictPolicies,
    });

    expect(first.id).not.toBe(second.id);
    expect(projection.occurrences.map((entry) => entry.id)).toEqual([first.id, second.id].sort());
    expect(projection.topologyEdges).toHaveLength(1);
    expect(projection.topologyEdges[0]).toMatchObject({
      plane: 'compiler-fact',
      kind: 'calls',
      from: 'src/a.ts#caller:function',
      to: 'src/b.ts#callee:function',
      occurrenceCount: 2,
      confidence: {
        strategy: 'maximum-reported',
        value: 0.9,
        reportedOccurrenceCount: 2,
      },
    });
    expect(projection.topologyEdges[0]?.contributions).toEqual([
      expect.objectContaining({
        occurrenceId: projection.topologyEdges[0]?.occurrenceIds[0],
        providerInstanceId: 'ttsc:fixture:one',
      }),
      expect.objectContaining({
        occurrenceId: projection.topologyEdges[0]?.occurrenceIds[1],
        providerInstanceId: 'ttsc:fixture:one',
      }),
    ]);
    expect(projection.topologyEdges[0]?.contributions.map((entry) => entry.capabilities)).toEqual(
      expect.arrayContaining([
        { 'fact-occurrence-completeness': 'complete' },
        { 'fact-occurrence-completeness': 'partial' },
      ])
    );
    expect(Object.isFrozen(projection)).toBe(true);
    expect(Object.isFrozen(first.sourceAnchor)).toBe(true);
    expect(Object.isFrozen(projection.topologyEdges[0]?.contributions)).toBe(true);
  });

  it('makes occurrence, topology, and projection identity independent from input order', () => {
    const firstInput = {
      providerLocalFactId: 'call:one',
      sourceAnchor: { vendorOffset: 20, startLine: 4, file: 'src/a.ts' },
      confidence: 0.75,
      capabilities: { zeta: true, alpha: 'complete' },
      provenance: { zeta: 2, alpha: 1 },
    } as const;
    const first = fact(firstInput);
    const firstWithReorderedJson = fact({
      ...firstInput,
      sourceAnchor: { file: 'src/a.ts', startLine: 4, vendorOffset: 20 },
      capabilities: { alpha: 'complete', zeta: true },
      provenance: { alpha: 1, zeta: 2 },
    });
    const second = fact({
      providerLocalFactId: 'call:two',
      sourceAnchor: { file: 'src/a.ts', startLine: 9 },
      confidence: null,
    });

    const left = buildFactTopologyProjection({
      graph: graph(),
      occurrences: [first, second],
      policies: strictPolicies,
    });
    const right = buildFactTopologyProjection({
      graph: graph(),
      occurrences: [second, firstWithReorderedJson],
      policies: strictPolicies,
    });

    expect(first.id).toBe(firstWithReorderedJson.id);
    expect(left.projectionId).toBe(right.projectionId);
    expect(left.topologyEdges[0]?.id).toBe(right.topologyEdges[0]?.id);
    expect(left.topologyEdges[0]?.occurrenceIds).toEqual(right.topologyEdges[0]?.occurrenceIds);

    const singleOccurrence = buildFactTopologyProjection({
      graph: graph(),
      occurrences: [first],
      policies: strictPolicies,
    });
    expect(singleOccurrence.topologyEdges[0]?.id).toBe(left.topologyEdges[0]?.id);
    expect(singleOccurrence.projectionId).not.toBe(left.projectionId);
  });

  it('keeps every provider occurrence identity axis explicit', () => {
    const baseline = fact({
      providerLocalFactId: 'call:one',
      sourceAnchor: { file: 'src/a.ts', startLine: 4 },
    });
    const differentProvider = createFactOccurrence({
      ...baseline,
      provider: { ...baseline.provider, instanceId: 'ttsc:fixture:two' },
    });
    const differentLocalFact = createFactOccurrence({
      ...baseline,
      providerLocalFactId: 'call:two',
    });
    const differentAnchor = createFactOccurrence({
      ...baseline,
      sourceAnchor: { file: 'src/a.ts', startLine: 5 },
    });
    const differentKind = createFactOccurrence({ ...baseline, kind: 'constructs' });

    expect(
      new Set([
        baseline.id,
        differentProvider.id,
        differentLocalFact.id,
        differentAnchor.id,
        differentKind.id,
      ]).size
    ).toBe(5);
  });

  it('requires an explicit duplicate policy and never merges conflicting payloads', () => {
    const original = fact({
      providerLocalFactId: 'call:one',
      sourceAnchor: { file: 'src/a.ts', startLine: 4 },
      confidence: 0.75,
    });

    expect(() =>
      buildFactTopologyProjection({
        graph: graph(),
        occurrences: [original, original],
        policies: strictPolicies,
      })
    ).toThrow(`Duplicate fact occurrence id: ${original.id}`);

    const deduplicated = buildFactTopologyProjection({
      graph: graph(),
      occurrences: [original, original],
      policies: { ...strictPolicies, duplicateFact: 'deduplicate-identical' },
    });
    expect(deduplicated.occurrences).toHaveLength(1);
    expect(deduplicated.topologyEdges[0]?.occurrenceCount).toBe(1);

    const conflicting = fact({
      providerLocalFactId: 'call:one',
      sourceAnchor: { file: 'src/a.ts', startLine: 4 },
      confidence: 0.25,
    });
    expect(conflicting.id).toBe(original.id);
    expect(() =>
      buildFactTopologyProjection({
        graph: graph(),
        occurrences: [original, conflicting],
        policies: { ...strictPolicies, duplicateFact: 'deduplicate-identical' },
      })
    ).toThrow(`Conflicting duplicate fact occurrence id: ${original.id}`);
  });

  it('rejects or quarantines unknown endpoints without silently dropping the occurrence', () => {
    const unknown = fact({
      providerLocalFactId: 'call:unknown',
      sourceAnchor: { file: 'src/a.ts', startLine: 12 },
      to: 'external/pkg#missing:function',
    });

    expect(() =>
      buildFactTopologyProjection({
        graph: graph(),
        occurrences: [unknown],
        policies: strictPolicies,
      })
    ).toThrow('references unknown endpoint(s): external/pkg#missing:function');

    const quarantined = buildFactTopologyProjection({
      graph: graph(),
      occurrences: [unknown],
      policies: { ...strictPolicies, unknownEndpoint: 'quarantine' },
    });
    expect(quarantined.occurrences).toEqual([]);
    expect(quarantined.topologyEdges).toEqual([]);
    expect(quarantined.quarantined).toEqual([
      {
        occurrence: unknown,
        unknownEndpointIds: ['external/pkg#missing:function'],
      },
    ]);
  });

  it('rejects structurally invalid facts and identity tampering before aggregation', () => {
    expect(() =>
      fact({
        providerLocalFactId: 'call:invalid',
        sourceAnchor: { file: 'src/a.ts', startLine: 1 },
        from: ' ',
      })
    ).toThrow('from must be a non-empty string');
    expect(() =>
      fact({
        providerLocalFactId: 'call:invalid-confidence',
        sourceAnchor: { file: 'src/a.ts', startLine: 1 },
        confidence: 1.1,
      })
    ).toThrow('confidence must be null or a finite number between 0 and 1');

    const valid = fact({
      providerLocalFactId: 'call:valid',
      sourceAnchor: { file: 'src/a.ts', startLine: 1 },
    });
    const tampered = { ...valid, id: 'fact-occurrence:tampered' } as FactOccurrence;
    expect(() =>
      buildFactTopologyProjection({
        graph: graph(),
        occurrences: [tampered],
        policies: strictPolicies,
      })
    ).toThrow('Fact occurrence identity mismatch');
  });

  it('enforces compiler and derived topology plane invariants', () => {
    const derived = createDerivedTopologyEdge({
      graph: graph(),
      plane: 'router-derived',
      kind: 'contains',
      from: 'src/a.ts#caller:function',
      to: 'src/b.ts#callee:function',
      derivation: {
        owner: '@ttsc-ex/ttsc-graph-router',
        version: '1.0.0',
        capability: 'derived-structural',
        inputFactIds: ['fact:z', 'fact:a'],
      },
      confidence: 0.8,
      provenance: { routerRevisionId: 'router:one' },
    });

    expect(derived).toMatchObject({
      plane: 'router-derived',
      occurrenceCount: 0,
      occurrenceIds: [],
      derivation: { inputFactIds: ['fact:a', 'fact:z'] },
    });
    expect(() => assertTopologyEdge(derived)).not.toThrow();
    const producerDerived = createDerivedTopologyEdge({
      graph: graph(),
      plane: 'producer-derived',
      kind: derived.kind,
      from: derived.from,
      to: derived.to,
      derivation: {
        owner: '@ttsc/graph',
        version: '1.0.0',
        capability: 'derived-structural',
        inputFactIds: ['fact:a'],
      },
      provenance: { producerRevisionId: 'producer:one' },
    });
    expect(producerDerived.id).not.toBe(derived.id);
    const otherRouter = createDerivedTopologyEdge({
      graph: graph(),
      plane: 'router-derived',
      kind: derived.kind,
      from: derived.from,
      to: derived.to,
      derivation: {
        owner: 'fixture/other-router',
        version: '1.0.0',
        capability: 'derived-structural',
        inputFactIds: ['fact:one'],
      },
      provenance: { source: 'fixture' },
    });
    expect(otherRouter.id).not.toBe(derived.id);

    const compilerFact = fact({
      providerLocalFactId: 'call:one',
      sourceAnchor: { file: 'src/a.ts', startLine: 4 },
    });
    const compilerEdge = buildFactTopologyProjection({
      graph: graph(),
      occurrences: [compilerFact],
      policies: strictPolicies,
    }).topologyEdges[0];
    expect(compilerEdge).toBeDefined();
    const invalidCompiler = {
      ...compilerEdge,
      derivation: derived.derivation,
    } as unknown as TopologyEdge;
    expect(() => assertTopologyEdge(invalidCompiler)).toThrow(
      'compiler-fact topology must not have derivation metadata'
    );

    const invalidDerived = {
      ...derived,
      derivation: undefined,
    } as unknown as TopologyEdge;
    expect(() => assertTopologyEdge(invalidDerived)).toThrow(
      'router-derived topology requires derivation metadata'
    );

    expect(() =>
      createDerivedTopologyEdge({
        graph: graph(),
        plane: 'producer-derived',
        kind: 'contains',
        from: 'src/a.ts#caller:function',
        to: 'src/missing.ts#missing:function',
        derivation: {
          owner: '@ttsc/graph',
          version: '1.0.0',
          capability: 'derived-structural',
          inputFactIds: ['fact:a'],
        },
        provenance: { producerRevisionId: 'producer:one' },
      })
    ).toThrow('references unknown endpoint(s): src/missing.ts#missing:function');
  });
});

function fact(
  overrides: Partial<Parameters<typeof createFactOccurrence>[0]> &
    Pick<Parameters<typeof createFactOccurrence>[0], 'providerLocalFactId' | 'sourceAnchor'>
): FactOccurrence {
  return createFactOccurrence({
    kind: 'calls',
    from: 'src/a.ts#caller:function',
    to: 'src/b.ts#callee:function',
    provider: {
      instanceId: 'ttsc:fixture:one',
      contractId: '@ttsc-ex/ttsc-graph-router/raw-graph-artifact',
      contractVersion: '1.0.0',
    },
    confidence: null,
    capabilities: { 'fact-occurrence-completeness': 'complete' },
    provenance: { snapshotId: 'provider-snapshot:one' },
    ...overrides,
  });
}

function graph(): CanonicalProjectGraph {
  return {
    contractVersion: '1.0',
    rootDir: '/repo',
    tsconfigPath: '/repo/tsconfig.json',
    nodes: [
      {
        id: 'src/a.ts#caller:function',
        sourceId: 'fixture',
        kind: 'function',
        name: 'caller',
        file: 'src/a.ts',
      },
      {
        id: 'src/b.ts#callee:function',
        sourceId: 'fixture',
        kind: 'function',
        name: 'callee',
        file: 'src/b.ts',
      },
    ],
    edges: [],
    provenance: { adapter: 'fixture', producer: '@ttsc/graph' },
    fingerprint: 'canonical-graph:fixture',
  };
}
