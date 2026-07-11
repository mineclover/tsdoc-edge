import { type CanonicalProjectGraph, canonicalProjectGraphFingerprint } from '../../indexer';
import {
  createCanonicalEmptyEnrichmentRevision,
  createEvidenceRevision,
  createRuleSetRevision,
  type EffectiveAnalysisInputs,
  EffectiveAnalysisService,
  type EffectiveBindingResolver,
  providerAnalysisIdentityFromGraph,
} from '../../semantic-graph';
import {
  createPolicyRevision,
  createSpecGraphRevision,
  type SpecGraphProvenance,
} from '../../spec-graph';

const service = new EffectiveAnalysisService();

describe('EffectiveAnalysisService', () => {
  it('keeps code-only identity independent from spec and policy inputs', () => {
    const input = fixtureInput();
    const stamp = service.createCodeViewStamp({
      code: input.code,
      provider: input.provider,
      relationSemanticRegistryVersion: input.relationSemanticRegistryVersion,
    });

    expect(stamp).toMatchObject({
      codeRevisionId: 'code-revision:one',
      codeGraphFingerprint: input.code.graph.fingerprint,
      effectiveCodeViewId: 'code-revision:one',
    });
    expect(stamp).not.toHaveProperty('specRevisionId');
    expect(stamp).not.toHaveProperty('policyRevisionId');
  });

  it('changes snapshot identity when evidence, rules, capabilities, or overlays change', () => {
    const input = fixtureInput();
    const base = service.createSnapshot(input);
    const evidenceChanged = service.createSnapshot({
      ...input,
      evidence: createEvidenceRevision({
        workspaceId: 'fixture',
        items: [],
        provenance: {
          source: 'collected',
          producerId: 'fixture/evidence',
          producerVersion: '1.0.0',
          sourceFingerprint: 'evidence:two',
        },
      }),
    });
    const overlayChanged = service.createSnapshot({
      ...input,
      code: {
        viewKind: 'effective-code-graph',
        baseRevisionId: 'code-revision:one',
        effectiveViewId: 'effective-code-view:one',
        deltaIds: ['graph-delta:one'],
        graph: {
          ...input.code.graph,
          fingerprint: `effective:${canonicalProjectGraphFingerprint(
            input.code.graph.nodes,
            input.code.graph.edges
          )}`,
        },
      },
    });
    const capabilitiesChanged = service.createSnapshot({
      ...input,
      provider: {
        ...input.provider,
        capabilities: { ...input.provider.capabilities, diagnosticsCollected: true },
      },
    });
    const producerChanged = service.createSnapshot({
      ...input,
      provider: {
        ...input.provider,
        producer: '@ttsc/graph',
        producerVersion: '0.17.0',
        compilerVersion: '7.0.1',
        compilerVersionReported: true,
      },
    });

    expect(
      new Set([
        base.snapshotId,
        evidenceChanged.snapshotId,
        overlayChanged.snapshotId,
        capabilitiesChanged.snapshotId,
        producerChanged.snapshotId,
      ]).size
    ).toBe(5);
  });

  it('runs binding resolution against the completed effective snapshot', () => {
    const snapshot = service.createSnapshot(fixtureInput());
    const observed: string[] = [];
    const resolver: EffectiveBindingResolver = {
      identity: { id: 'fixture-resolver', version: '1.0.0' },
      resolve(input) {
        observed.push(input.snapshotId, input.stamp.evidenceRevisionId);
        return [];
      },
    };

    const set = service.resolveBindings(snapshot, resolver);

    expect(observed).toEqual([snapshot.snapshotId, snapshot.evidence.revisionId]);
    expect(set).toMatchObject({
      snapshotId: snapshot.snapshotId,
      resolver: { id: 'fixture-resolver', version: '1.0.0' },
      resolutions: [],
      stamp: { bindingResolutionSetId: expect.stringContaining('binding-resolution-set:') },
    });
  });

  it('derives structured provider and observed-kind identity from the current graph', () => {
    const graph = codeGraph();
    const identity = providerAnalysisIdentityFromGraph({
      ...graph,
      provenance: {
        ...graph.provenance,
        artifactContractId: 'fixture/raw-artifact',
        artifactContractVersion: '2.0.0',
        artifactCapabilities: { factPlane: 'raw', diagnosticsCollected: false },
      },
    });

    expect(identity).toEqual({
      contractId: 'fixture/raw-artifact',
      contractVersion: '2.0.0',
      providerId: 'fixture',
      providerVersion: 'unreported',
      providerInstanceId: 'legacy:fixture',
      producer: '@ttsc/graph',
      compilerVersion: null,
      compilerVersionReported: false,
      capabilities: { factPlane: 'raw', diagnosticsCollected: false },
      observedNodeKinds: [],
      observedEdgeKinds: [],
    });
  });

  it('rejects conflicting workspace/namespace sources and forged input revision identities', () => {
    const input = fixtureInput();
    expect(() =>
      service.createSnapshot({
        ...input,
        code: {
          ...input.code,
          graph: {
            ...input.code.graph,
            provenance: {
              ...input.code.graph.provenance,
              graphNamespace: 'graph/provider',
            },
          },
        },
        provider: { ...input.provider, graphNamespace: 'identity/provider' },
      })
    ).toThrow('Graph namespace mismatch');

    expect(() =>
      service.createSnapshot({
        ...input,
        evidence: { ...input.evidence, revisionId: 'evidence-revision:forged' },
      })
    ).toThrow('Evidence revision identity');

    expect(() =>
      service.createSnapshot({
        ...input,
        policy: { ...input.policy, contentDigest: 'policy:forged' },
      })
    ).toThrow('Policy revision identity');

    expect(() =>
      service.createSnapshot({
        ...input,
        ruleSet: { ...input.ruleSet, revisionId: 'rule-set-revision:forged' },
      })
    ).toThrow('Rule-set revision identity');

    expect(() =>
      service.createSnapshot({
        ...input,
        code: { ...input.code, graph: { ...input.code.graph, fingerprint: 'forged' } },
      })
    ).toThrow('Code graph fingerprint mismatch');

    const invalidEdges = [{ kind: 'calls', from: 'missing:a', to: 'missing:b' }];
    expect(() =>
      service.createSnapshot({
        ...input,
        code: {
          ...input.code,
          graph: {
            ...input.code.graph,
            edges: invalidEdges,
            fingerprint: canonicalProjectGraphFingerprint([], invalidEdges),
          },
        },
      })
    ).toThrow('unknown endpoint');
  });

  it('does not allow a forged or cloned snapshot to mint a trusted binding set', () => {
    const snapshot = service.createSnapshot(fixtureInput());
    const resolver: EffectiveBindingResolver = {
      identity: { id: 'fixture-resolver', version: '1.0.0' },
      resolve: () => [],
    };

    expect(() => service.resolveBindings({ ...snapshot }, resolver)).toThrow(
      'was not created by this analysis boundary'
    );
    expect(() => service.resolveBindings(snapshot, resolver)).not.toThrow();
  });

  it('defensively clones and deeply freezes the effective analysis inputs', () => {
    const input = fixtureInput();
    const snapshot = service.createSnapshot(input);

    expect(snapshot).not.toBe(input);
    expect(Object.isFrozen(snapshot.provider.capabilities)).toBe(true);
    expect(Object.isFrozen(snapshot.policy.provenance)).toBe(true);
    expect(() => {
      (snapshot.provider.capabilities as Record<string, unknown>).forged = true;
    }).toThrow();
  });
});

function fixtureInput(): EffectiveAnalysisInputs {
  const provenance: SpecGraphProvenance = {
    source: 'managed-document',
    extractorId: 'fixture',
    extractorVersion: '1.0.0',
    authoredSourceFingerprint: 'managed-docs',
  };
  return {
    code: {
      viewKind: 'persisted-code-revision',
      revisionId: 'code-revision:one',
      graph: codeGraph(),
    },
    spec: {
      revision: createSpecGraphRevision({
        workspaceId: 'fixture',
        nodes: [],
        edges: [],
        bindings: [],
        provenance,
      }),
    },
    policy: createPolicyRevision({
      relationSemanticRegistryVersion: '1.0.0',
      lifecycleGateVersion: '1.0.0',
      rules: [],
      suppressions: [],
      provenance: {
        source: 'default',
        compilerId: 'fixture',
        compilerVersion: '1.0.0',
        sourceFingerprint: 'fixture-policy',
      },
    }),
    evidence: createEvidenceRevision({
      workspaceId: 'fixture',
      items: [],
      provenance: {
        source: 'collected',
        producerId: 'fixture/evidence',
        producerVersion: '1.0.0',
        sourceFingerprint: 'evidence:one',
      },
    }),
    enrichment: createCanonicalEmptyEnrichmentRevision('fixture'),
    ruleSet: createRuleSetRevision({ analyzerVersions: { conformance: '1.0.0' } }),
    provider: {
      contractId: '@ttsc-ex/ttsc-graph-router/raw-graph-artifact',
      contractVersion: '1.0.0',
      capabilities: { factPlane: 'raw', diagnosticsCollected: false },
      observedNodeKinds: ['class'],
      observedEdgeKinds: [],
    },
    relationSemanticRegistryVersion: '1.0.0',
  };
}

function codeGraph(): CanonicalProjectGraph {
  const nodes: CanonicalProjectGraph['nodes'] = [];
  const edges: CanonicalProjectGraph['edges'] = [];
  return {
    contractVersion: '1.0',
    rootDir: '/repo',
    tsconfigPath: '/repo/tsconfig.json',
    nodes,
    edges,
    provenance: { adapter: 'fixture', producer: '@ttsc/graph' },
    fingerprint: canonicalProjectGraphFingerprint(nodes, edges),
  };
}
