import { type CanonicalProjectGraph, canonicalProjectGraphFingerprint } from '../../indexer';
import {
  createCanonicalEmptyEnrichmentRevision,
  createEvidenceRevision,
  createRuleSetRevision,
  type EffectiveAnalysisInputs,
  EffectiveAnalysisService,
} from '../../semantic-graph';
import {
  bindingResolutionId,
  createPolicyRevision,
  createSpecGraphRevision,
  type ResolvedSpecBinding,
  type SpecBindingDeclaration,
  type SpecGraphProvenance,
  type SpecNode,
} from '../../spec-graph';
import {
  createAnalysisInputBindingResolverIndex,
  createSnapshotBindingResolverIndex,
  ExactBindingResolver,
  type IndexedApiSurface,
  type IndexedTestEvidence,
} from '../../spec-graph/BindingResolver';

const service = new EffectiveAnalysisService();
const workspaceId = 'fixture';
const graphNamespace = 'fixture/provider';
const serviceId = 'src/service.ts#Service:class';
const repositoryId = 'src/repository.ts#Repository:class';

describe('ExactBindingResolver', () => {
  it('resolves code node/edge, spec, evidence, and API selectors by participant role', () => {
    const snapshot = service.createSnapshot(fixtureInput());
    const resolver = resolverWithCurrentExternalIndex();

    const report = resolver.resolveWithDiagnostics(snapshot);
    const byDeclaration = new Map(
      report.resolutions.map((resolution) => [resolution.declarationId, resolution])
    );

    expect(report.diagnostics).toEqual([]);
    expect([...byDeclaration.keys()].sort()).toEqual([
      'BIND-CONSTRAINT',
      'BIND-GOVERNANCE',
      'BIND-IMPLEMENTATION',
      'BIND-VERIFICATION',
    ]);
    expect(byDeclaration.get('BIND-IMPLEMENTATION')).toMatchObject({
      status: 'resolved',
      participants: [
        { role: 'obligation', status: 'resolved', refs: [{ type: 'spec-node' }] },
        { role: 'implementer', status: 'resolved', refs: [{ type: 'code-node' }] },
      ],
    });
    expect(byDeclaration.get('BIND-VERIFICATION')).toMatchObject({
      status: 'resolved',
      evidenceRevisionId: snapshot.evidence.revisionId,
      participants: [
        { role: 'obligation', status: 'resolved' },
        { role: 'verifier', status: 'resolved', refs: [{ type: 'test-evidence' }] },
        { role: 'subject', status: 'resolved', refs: [{ type: 'code-edge' }] },
      ],
    });
    expect(byDeclaration.get('BIND-CONSTRAINT')).toMatchObject({
      participants: [
        { role: 'constraint' },
        { role: 'subject', refs: [{ type: 'spec-node', id: 'REQ-TARGET' }] },
      ],
    });
    expect(byDeclaration.get('BIND-GOVERNANCE')).toMatchObject({
      participants: [{ role: 'contract' }, { role: 'api', refs: [{ type: 'api-surface' }] }],
    });

    expect(service.resolveBindings(snapshot, resolver).resolutions).toHaveLength(4);
  });

  it('returns every exact candidate as ambiguous and never selects one arbitrarily', () => {
    const snapshot = service.createSnapshot(fixtureInput({ ambiguousImplementation: true }));
    const codeNodes = createSnapshotBindingResolverIndex(snapshot).codeNodes;
    const leftResolver = new ExactBindingResolver({ graphNamespace, index: { codeNodes } });
    const rightResolver = new ExactBindingResolver({
      graphNamespace,
      index: { codeNodes: [...codeNodes].reverse() },
    });

    const left = leftResolver.resolveWithDiagnostics(snapshot);
    const right = rightResolver.resolveWithDiagnostics(snapshot);
    const resolution = left.resolutions.find(
      (candidate) => candidate.declarationId === 'BIND-IMPLEMENTATION'
    );
    const implementer = resolution?.participants.find(
      (participant) => participant.role === 'implementer'
    );

    expect(resolution?.status).toBe('ambiguous');
    expect(implementer).toMatchObject({ status: 'ambiguous' });
    expect(implementer?.refs.map((ref) => (ref.type === 'code-node' ? ref.id : ''))).toEqual([
      'src/alternate.ts#Service:class',
      serviceId,
    ]);
    expect(
      left.diagnostics.find(
        (diagnostic) =>
          diagnostic.declarationId === 'BIND-IMPLEMENTATION' && diagnostic.role === 'implementer'
      )
    ).toEqual(
      right.diagnostics.find(
        (diagnostic) =>
          diagnostic.declarationId === 'BIND-IMPLEMENTATION' && diagnostic.role === 'implementer'
      )
    );
  });

  it('distinguishes missing from revision-stale matches with deterministic diagnostics', () => {
    const snapshot = service.createSnapshot(fixtureInput({ includeExternalEvidence: false }));
    const resolver = new ExactBindingResolver({
      graphNamespace,
      index: (current) => ({
        testEvidence: [testEvidence(current, 'evidence:old')],
      }),
    });

    const report = resolver.resolveWithDiagnostics(snapshot);
    const verification = report.resolutions.find(
      (resolution) => resolution.declarationId === 'BIND-VERIFICATION'
    );
    const governance = report.resolutions.find(
      (resolution) => resolution.declarationId === 'BIND-GOVERNANCE'
    );

    expect(verification).toMatchObject({
      status: 'stale',
      participants: expect.arrayContaining([
        expect.objectContaining({
          role: 'verifier',
          status: 'stale',
          refs: [expect.objectContaining({ evidenceRevisionId: 'evidence:old' })],
        }),
      ]),
    });
    expect(governance).toMatchObject({
      status: 'missing',
      participants: expect.arrayContaining([
        expect.objectContaining({ role: 'api', status: 'missing', refs: [] }),
      ]),
    });
    expect(
      report.diagnostics.map(({ declarationId, role, status }) => ({
        declarationId,
        role,
        status,
      }))
    ).toEqual([
      { declarationId: 'BIND-GOVERNANCE', role: 'api', status: 'missing' },
      { declarationId: 'BIND-VERIFICATION', role: 'verifier', status: 'stale' },
    ]);
  });

  it('pins resolution identity to effective/spec views and resolver version', () => {
    const baseSnapshot = service.createSnapshot(fixtureInput());
    const evidenceChanged = service.createSnapshot(
      fixtureInput({ evidenceSourceFingerprint: 'fixture-evidence-two' })
    );
    const specChanged = service.createSnapshot(fixtureInput({ specTag: 'changed' }));
    const versionOne = resolverWithCurrentExternalIndex('1.0.0');
    const versionTwo = resolverWithCurrentExternalIndex('2.0.0');
    const resolutionId = (resolver: ExactBindingResolver, snapshot = baseSnapshot) =>
      resolver
        .resolve(snapshot)
        .find((resolution) => resolution.declarationId === 'BIND-IMPLEMENTATION')?.resolutionId;

    expect(
      new Set([
        resolutionId(versionOne),
        resolutionId(versionTwo),
        resolutionId(versionOne, evidenceChanged),
        resolutionId(versionOne, specChanged),
      ]).size
    ).toBe(4);
  });

  it('materializes evidence and API candidates from an exact pinned EvidenceRevision', () => {
    const evidence = createEvidenceRevision({
      workspaceId,
      items: [
        {
          kind: 'test-evidence',
          id: 'test:service-calls-repository',
          runner: 'jest',
          testName: 'calls repository',
          status: 'passed',
          source: {
            file: 'src/service.test.ts',
            contentDigest: 'test-source',
          },
          subjectFiles: ['src/service.ts'],
          provenance: {
            source: 'test-runner',
            producerId: graphNamespace,
            producerVersion: '1.0.0',
          },
        },
        {
          kind: 'api-surface',
          id: 'api:@fixture/core:Service',
          packageName: '@fixture/core',
          packageVersion: '1.0.0',
          module: './service',
          exportName: 'Service',
          signatureDigest: 'signature:Service',
          provenance: {
            source: 'api-extractor',
            producerId: graphNamespace,
            producerVersion: '1.0.0',
          },
        },
      ],
      provenance: {
        source: 'collected',
        producerId: 'fixture/evidence-collector',
        producerVersion: '1.0.0',
        sourceFingerprint: 'fixture-evidence',
      },
    });
    const input = fixtureInput();
    const snapshot = service.createSnapshot({ ...input, evidence });
    const resolver = new ExactBindingResolver({
      graphNamespace,
      index: createAnalysisInputBindingResolverIndex(snapshot, evidence),
    });

    expect(resolver.resolve(snapshot).map((resolution) => resolution.status)).toEqual([
      'resolved',
      'resolved',
      'resolved',
      'resolved',
    ]);
  });

  it('changes resolution identity when an external endpoint changes', () => {
    const snapshot = service.createSnapshot(fixtureInput());
    const resolver = (surfaceId: string) =>
      new ExactBindingResolver({
        graphNamespace,
        index: {
          testEvidence: [testEvidence(snapshot, snapshot.evidence.revisionId)],
          apiSurfaces: [apiSurface(snapshot, surfaceId)],
        },
      });
    const governanceId = (candidate: ExactBindingResolver) =>
      candidate
        .resolve(snapshot)
        .find((resolution) => resolution.declarationId === 'BIND-GOVERNANCE')?.resolutionId;

    expect(governanceId(resolver('api:surface-a'))).not.toBe(
      governanceId(resolver('api:surface-b'))
    );
  });

  it('rejects a forged resolved participant from another workspace', () => {
    const snapshot = service.createSnapshot(fixtureInput());
    const exact = resolverWithCurrentExternalIndex();
    const resolutions = exact.resolve(snapshot).map((resolution) => {
      if (resolution.declarationId !== 'BIND-IMPLEMENTATION') return resolution;
      const participants = resolution.participants.map((participant) =>
        participant.role === 'implementer'
          ? {
              ...participant,
              refs: participant.refs.map((ref) => ({ ...ref, workspaceId: 'foreign' })),
            }
          : participant
      );
      const resolutionId = bindingResolutionId({
        declarationId: resolution.declarationId,
        declarationDigest: resolution.declarationDigest,
        specRevisionId: resolution.specRevisionId,
        effectiveViewId: resolution.effectiveViewId,
        codeRevisionId: resolution.codeRevisionId,
        evidenceRevisionId: resolution.evidenceRevisionId,
        resolver: resolution.resolver,
        status: resolution.status,
        participants,
      });
      return { ...resolution, resolutionId, participants };
    });

    expect(() =>
      service.resolveBindings(snapshot, {
        identity: exact.identity,
        resolve: () => resolutions,
      })
    ).toThrow('stale or foreign endpoint');
  });

  it('rejects forged external endpoint identities and stale resolution pins', () => {
    const snapshot = service.createSnapshot(fixtureInput());
    const exact = resolverWithCurrentExternalIndex();
    const base = exact.resolve(snapshot);
    const governance = base.find((resolution) => resolution.declarationId === 'BIND-GOVERNANCE')!;
    const forgedApi = reidentify({
      ...governance,
      participants: governance.participants.map((participant) =>
        participant.role === 'api'
          ? {
              ...participant,
              refs: participant.refs.map((ref) =>
                ref.type === 'api-surface' ? { ...ref, surfaceId: 'api:forged-surface' } : ref
              ),
            }
          : participant
      ),
    });
    expect(() =>
      service.resolveBindings(snapshot, {
        identity: exact.identity,
        resolve: () =>
          base.map((resolution) =>
            resolution.declarationId === governance.declarationId ? forgedApi : resolution
          ),
      })
    ).toThrow('does not match its authored selector');

    const verification = base.find(
      (resolution) => resolution.declarationId === 'BIND-VERIFICATION'
    )!;
    const staleEvidencePin = reidentify({
      ...verification,
      evidenceRevisionId: 'evidence-revision:stale',
    });
    expect(() =>
      service.resolveBindings(snapshot, {
        identity: exact.identity,
        resolve: () =>
          base.map((resolution) =>
            resolution.declarationId === verification.declarationId ? staleEvidencePin : resolution
          ),
      })
    ).toThrow('uses evidence revision');
  });

  it('rejects forged code-edge occurrence/plane evidence and noncanonical participant order', () => {
    const snapshot = service.createSnapshot(fixtureInput());
    const exact = resolverWithCurrentExternalIndex();
    const base = exact.resolve(snapshot);
    const verification = base.find(
      (resolution) => resolution.declarationId === 'BIND-VERIFICATION'
    )!;
    const forgedEdge = reidentify({
      ...verification,
      participants: verification.participants.map((participant) =>
        participant.role === 'subject'
          ? {
              ...participant,
              refs: participant.refs.map((ref) =>
                ref.type === 'code-edge' ? { ...ref, occurrenceId: 'fact-occurrence:forged' } : ref
              ),
            }
          : participant
      ),
    });
    expect(() =>
      service.resolveBindings(snapshot, {
        identity: exact.identity,
        resolve: () =>
          base.map((resolution) =>
            resolution.declarationId === verification.declarationId ? forgedEdge : resolution
          ),
      })
    ).toThrow('does not match its authored selector');

    const implementation = base.find(
      (resolution) => resolution.declarationId === 'BIND-IMPLEMENTATION'
    )!;
    const reversed = reidentify({
      ...implementation,
      participants: [...implementation.participants].reverse(),
    });
    expect(() =>
      service.resolveBindings(snapshot, {
        identity: exact.identity,
        resolve: () =>
          base.map((resolution) =>
            resolution.declarationId === implementation.declarationId ? reversed : resolution
          ),
      })
    ).toThrow('canonical declaration order');
  });

  it('uses the provider workspace and graph namespace when graph provenance omits them', () => {
    const input = fixtureInput();
    const snapshot = service.createSnapshot({
      ...input,
      provider: {
        ...input.provider,
        workspaceId,
        graphNamespace,
      },
    });
    const resolver = new ExactBindingResolver({
      index: (current) => ({
        testEvidence: [testEvidence(current, current.evidence.revisionId)],
        apiSurfaces: [apiSurface(current)],
      }),
    });
    const implementer = resolver
      .resolve(snapshot)
      .find((resolution) => resolution.declarationId === 'BIND-IMPLEMENTATION')
      ?.participants.find((participant) => participant.role === 'implementer');

    expect(implementer).toMatchObject({
      status: 'resolved',
      refs: [{ type: 'code-node', workspaceId, graphNamespace }],
    });
  });
});

function resolverWithCurrentExternalIndex(version = '1.0.0'): ExactBindingResolver {
  return new ExactBindingResolver({
    graphNamespace,
    identity: { id: 'fixture/exact-resolver', version },
    index: (snapshot) => ({
      testEvidence: [testEvidence(snapshot, snapshot.evidence.revisionId)],
      apiSurfaces: [apiSurface(snapshot)],
    }),
  });
}

function testEvidence(
  snapshot: ReturnType<EffectiveAnalysisService['createSnapshot']>,
  evidenceRevisionId: string
): IndexedTestEvidence {
  return {
    ref: {
      type: 'test-evidence',
      workspaceId,
      evidenceRevisionId,
      id: 'test:service-calls-repository',
    },
    evidenceId: 'test:service-calls-repository',
    file: 'src/service.test.ts',
    testName: 'calls repository',
    runner: 'jest',
    providerId: snapshot.provider.contractId,
  };
}

function apiSurface(
  snapshot: ReturnType<EffectiveAnalysisService['createSnapshot']>,
  surfaceId = 'api:@fixture/core:Service'
): IndexedApiSurface {
  return {
    ref: {
      type: 'api-surface',
      workspaceId,
      graphNamespace,
      effectiveCodeViewId: snapshot.stamp.code.effectiveCodeViewId,
      codeRevisionId: snapshot.stamp.code.codeRevisionId,
      surfaceId,
    },
    packageName: '@fixture/core',
    packageVersion: '1.0.0',
    module: './service',
    exportName: 'Service',
  };
}

function fixtureInput(
  options: {
    readonly ambiguousImplementation?: boolean;
    readonly evidenceSourceFingerprint?: string;
    readonly includeExternalEvidence?: boolean;
    readonly specTag?: string;
  } = {}
): EffectiveAnalysisInputs {
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
        workspaceId,
        nodes: fixtureSpecNodes(options.specTag),
        edges: [],
        bindings: fixtureBindings(options.ambiguousImplementation ?? false),
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
    evidence: fixtureEvidence(
      options.evidenceSourceFingerprint,
      options.includeExternalEvidence ?? true
    ),
    enrichment: createCanonicalEmptyEnrichmentRevision(workspaceId),
    ruleSet: createRuleSetRevision({ analyzerVersions: { conformance: '1.0.0' } }),
    provider: {
      contractId: graphNamespace,
      contractVersion: '1.0.0',
      capabilities: {},
      observedNodeKinds: ['class'],
      observedEdgeKinds: ['calls'],
    },
    relationSemanticRegistryVersion: '1.0.0',
  };
}

function fixtureEvidence(sourceFingerprint = 'fixture-evidence', includeItems = true) {
  return createEvidenceRevision({
    workspaceId,
    items: includeItems
      ? [
          {
            kind: 'test-evidence',
            id: 'test:service-calls-repository',
            runner: 'jest',
            testName: 'calls repository',
            status: 'passed',
            source: { file: 'src/service.test.ts', contentDigest: 'test-source' },
            subjectFiles: ['src/service.ts'],
            provenance: {
              source: 'test-runner',
              producerId: graphNamespace,
              producerVersion: '1.0.0',
            },
          },
          {
            kind: 'api-surface',
            id: 'api:@fixture/core:Service',
            packageName: '@fixture/core',
            packageVersion: '1.0.0',
            module: './service',
            exportName: 'Service',
            signatureDigest: 'signature:Service',
            provenance: {
              source: 'api-extractor',
              producerId: graphNamespace,
              producerVersion: '1.0.0',
            },
          },
        ]
      : [],
    provenance: {
      source: 'collected',
      producerId: 'fixture/evidence-collector',
      producerVersion: '1.0.0',
      sourceFingerprint,
    },
  });
}

function reidentify(resolution: ResolvedSpecBinding): ResolvedSpecBinding {
  return {
    ...resolution,
    resolutionId: bindingResolutionId({
      declarationId: resolution.declarationId,
      declarationDigest: resolution.declarationDigest,
      specRevisionId: resolution.specRevisionId,
      effectiveViewId: resolution.effectiveViewId,
      codeRevisionId: resolution.codeRevisionId,
      evidenceRevisionId: resolution.evidenceRevisionId,
      resolver: resolution.resolver,
      status: resolution.status,
      participants: resolution.participants,
    }),
  };
}

function fixtureBindings(ambiguousImplementation: boolean): SpecBindingDeclaration[] {
  return [
    {
      id: 'BIND-IMPLEMENTATION',
      kind: 'implementation',
      specNodeId: 'REQ-IMPLEMENTATION',
      target: {
        type: 'code-node',
        workspaceId,
        graphNamespace,
        ...(ambiguousImplementation ? {} : { canonicalNodeId: serviceId }),
        qualifiedName: 'Service',
        kind: 'class',
      },
      source: source('BIND-IMPLEMENTATION'),
      provenance: bindingProvenance(),
    },
    {
      id: 'BIND-VERIFICATION',
      kind: 'verification',
      specNodeId: 'REQ-VERIFICATION',
      verifier: {
        type: 'test-evidence',
        workspaceId,
        evidenceId: 'test:service-calls-repository',
        file: 'src/service.test.ts',
        testName: 'calls repository',
        runner: 'jest',
      },
      subject: {
        type: 'code-edge',
        workspaceId,
        graphNamespace,
        plane: 'compiler-fact',
        kind: 'calls',
        from: { type: 'code-node', workspaceId, canonicalNodeId: serviceId },
        to: { type: 'code-node', workspaceId, canonicalNodeId: repositoryId },
      },
      source: source('BIND-VERIFICATION'),
      provenance: bindingProvenance(),
    },
    {
      id: 'BIND-CONSTRAINT',
      kind: 'constraint',
      specNodeId: 'REQ-CONSTRAINT',
      target: { type: 'spec-node', workspaceId, specNodeId: 'REQ-TARGET' },
      source: source('BIND-CONSTRAINT'),
      provenance: bindingProvenance(),
    },
    {
      id: 'BIND-GOVERNANCE',
      kind: 'governance',
      specNodeId: 'API-GOVERNANCE',
      target: {
        type: 'api-surface',
        workspaceId,
        packageName: '@fixture/core',
        packageVersion: '1.0.0',
        module: './service',
        exportName: 'Service',
      },
      source: source('BIND-GOVERNANCE'),
      provenance: bindingProvenance(),
    },
  ];
}

function fixtureSpecNodes(specTag?: string): SpecNode[] {
  return [
    {
      id: 'SPEC-ROOT',
      kind: 'spec',
      title: 'Fixture',
      lifecycle: { mode: 'independent', status: 'active' },
      source: source('SPEC-ROOT'),
      tags: specTag ? [specTag] : [],
    },
    ...[
      ['REQ-IMPLEMENTATION', 'requirement'],
      ['REQ-VERIFICATION', 'requirement'],
      ['REQ-CONSTRAINT', 'invariant'],
      ['REQ-TARGET', 'requirement'],
      ['API-GOVERNANCE', 'api-contract'],
    ].map(([id, kind]) => ({
      id,
      kind: kind as 'requirement' | 'invariant' | 'api-contract',
      title: id,
      lifecycle: { mode: 'inherited' as const, aggregateSpecId: 'SPEC-ROOT' },
      source: source(id),
      tags: [],
    })),
  ];
}

function codeGraph(): CanonicalProjectGraph {
  const nodes = [
    {
      id: serviceId,
      sourceId: serviceId,
      kind: 'class',
      name: 'Service',
      qualifiedName: 'Service',
      file: 'src/service.ts',
    },
    {
      id: repositoryId,
      sourceId: repositoryId,
      kind: 'class',
      name: 'Repository',
      qualifiedName: 'Repository',
      file: 'src/repository.ts',
    },
    {
      id: 'src/alternate.ts#Service:class',
      sourceId: 'src/alternate.ts#Service:class',
      kind: 'class',
      name: 'Service',
      qualifiedName: 'Service',
      file: 'src/alternate.ts',
    },
  ];
  const orderedNodes = [...nodes].sort((left, right) => left.id.localeCompare(right.id));
  const edges = [{ kind: 'calls', from: serviceId, to: repositoryId }];
  return {
    contractVersion: '1.0',
    rootDir: '/repo',
    tsconfigPath: '/repo/tsconfig.json',
    nodes: orderedNodes,
    edges,
    provenance: { adapter: 'fixture', producer: '@ttsc/graph' },
    fingerprint: canonicalProjectGraphFingerprint(orderedNodes, edges),
  };
}

function bindingProvenance() {
  return {
    source: 'managed-document' as const,
    extractorId: 'fixture',
    extractorVersion: '1.0.0',
  };
}

function source(symbol: string) {
  return {
    documentId: 'fixture-spec',
    file: 'managed/fixture.md',
    symbol,
    contentDigest: `digest:${symbol}`,
  };
}
