import { createHash } from 'node:crypto';
import { type CanonicalProjectGraph, canonicalProjectGraphFingerprint } from '../../indexer';
import {
  type BindingResolutionSet,
  createCanonicalEmptyEnrichmentRevision,
  createEvidenceRevision,
  createRuleSetRevision,
  EffectiveAnalysisService,
} from '../../semantic-graph';
import {
  bindingDeclarationDigest,
  bindingResolutionId,
  createPolicyRevision,
  createSpecGraphRevision,
  type EndpointRef,
  type PolicyRevision,
  type ResolvedBindingParticipant,
  type ResolvedSpecBinding,
  type SpecBindingDeclaration,
  type SpecBindingKind,
  type SpecGraphProvenance,
  type SpecNode,
} from '../../spec-graph';
import { CONFORMANCE_RULE_IDS, ConformanceEngine } from '../../spec-graph/ConformanceEngine';

const workspaceId = 'fixture';
const effectiveViewId = 'effective-analysis:one';
const specRevisionId = 'spec-revision:one';
const resolver = { id: 'fixture/resolver', version: '1.0.0' } as const;
const service = new EffectiveAnalysisService();

describe('ConformanceEngine', () => {
  it('uses stable default obligations when policy rules are empty', () => {
    const policy = policyRevision();
    const resolutions = resolvedObligations();
    const set = bindingSet(resolutions, policy);
    const reversed = bindingSet([...resolutions].reverse(), policy, set.resolutionSetId);
    const engine = new ConformanceEngine();

    const report = engine.evaluate(set, policy);
    const reorderedReport = engine.evaluate(reversed, policy);

    expect(report.reportId).toBe(reorderedReport.reportId);
    expect(report.summary).toEqual({
      total: 4,
      satisfied: 4,
      violated: 0,
      indeterminate: 0,
      suppressed: 0,
      disabled: 0,
    });
    expect(report.findings.map((finding) => finding.ruleId).sort()).toEqual(
      Object.values(CONFORMANCE_RULE_IDS).sort()
    );
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resultKind: 'derived-conformance-finding',
          obligationKind: 'implementation',
          outcome: 'satisfied',
          ruleVersion: 'default-1',
        }),
      ])
    );
    expect(report.findings[0]).not.toHaveProperty('from');
    expect(report.findings[0]).not.toHaveProperty('to');
  });

  it('classifies missing as violated and ambiguous/stale as indeterminate', () => {
    const policy = policyRevision();
    const resolutions = resolvedObligations().map((resolution) => {
      switch (obligationKind(resolution)) {
        case 'implementation':
          return withParticipantStatus(resolution, 'implementer', 'missing', []);
        case 'verification':
          return withParticipantStatus(resolution, 'verifier', 'ambiguous', [
            evidenceRef('test:one'),
            evidenceRef('test:two'),
          ]);
        case 'constraint':
          return withParticipantStatus(resolution, 'constraint', 'stale', [
            { ...specRef('REQ-TARGET'), specRevisionId: 'spec-revision:old' },
          ]);
        case 'governance':
          return resolution;
      }
    });

    const report = new ConformanceEngine().evaluate(bindingSet(resolutions, policy), policy);
    const byKind = new Map(report.findings.map((finding) => [finding.obligationKind, finding]));

    expect(byKind.get('implementation')).toMatchObject({
      outcome: 'violated',
      diagnosticCodes: ['binding.implementation.implementer.missing'],
    });
    expect(byKind.get('verification')).toMatchObject({
      outcome: 'indeterminate',
      diagnosticCodes: ['binding.verification.verifier.ambiguous'],
    });
    expect(byKind.get('constraint')).toMatchObject({
      outcome: 'indeterminate',
      diagnosticCodes: ['binding.constraint.constraint.stale'],
    });
    expect(report.summary).toEqual({
      total: 4,
      satisfied: 1,
      violated: 1,
      indeterminate: 2,
      suppressed: 0,
      disabled: 0,
    });
  });

  it('applies only exact, active policy suppressions and preserves disabled findings', () => {
    const policy = policyRevision({
      rules: [
        {
          id: CONFORMANCE_RULE_IDS.implementation,
          version: '2.0.0',
          enabled: false,
          severity: 'error',
        },
        {
          id: CONFORMANCE_RULE_IDS.verification,
          version: '2.0.0',
          enabled: true,
          severity: 'error',
        },
      ],
      suppressions: [
        {
          id: 'SUPPRESS-VERIFICATION',
          ruleId: CONFORMANCE_RULE_IDS.verification,
          target: {
            type: 'test-evidence',
            workspaceId,
            evidenceId: 'test:one',
          },
          reason: 'Known flaky test mapping',
          expiresAt: '2030-01-01T00:00:00.000Z',
        },
      ],
    });
    const resolutions = resolvedObligations().map((resolution) =>
      obligationKind(resolution) === 'verification'
        ? withParticipantStatus(resolution, 'verifier', 'ambiguous', [
            evidenceRef('test:one'),
            evidenceRef('test:two'),
          ])
        : resolution
    );
    const set = bindingSet(resolutions, policy);
    const engine = new ConformanceEngine();

    const withoutClock = engine.evaluate(set, policy);
    const beforeExpiry = engine.evaluate(set, policy, {
      suppressionAsOf: '2029-01-01T00:00:00.000Z',
    });
    const afterExpiry = engine.evaluate(set, policy, {
      suppressionAsOf: '2031-01-01T00:00:00.000Z',
    });
    const beforeByKind = new Map(
      beforeExpiry.findings.map((finding) => [finding.obligationKind, finding])
    );

    expect(
      withoutClock.findings.find((finding) => finding.obligationKind === 'verification')?.outcome
    ).toBe('indeterminate');
    expect(beforeByKind.get('verification')).toMatchObject({
      outcome: 'suppressed',
      suppressionId: 'SUPPRESS-VERIFICATION',
      severity: 'error',
    });
    expect(beforeByKind.get('implementation')).toMatchObject({
      outcome: 'disabled',
      ruleVersion: '2.0.0',
      severity: 'error',
    });
    expect(
      afterExpiry.findings.find((finding) => finding.obligationKind === 'verification')?.outcome
    ).toBe('indeterminate');
    expect(new Set([withoutClock.reportId, beforeExpiry.reportId, afterExpiry.reportId]).size).toBe(
      3
    );
  });

  it('rejects cross-revision policy evaluation', () => {
    const policy = policyRevision();
    const otherPolicy = policyRevision({ sourceFingerprint: 'other-policy' });
    const set = bindingSet(resolvedObligations(), policy);

    expect(() => new ConformanceEngine().evaluate(set, otherPolicy)).toThrow(
      'Policy revision mismatch'
    );

    expect(() =>
      new ConformanceEngine().evaluate(set, {
        ...policy,
        rules: [
          {
            id: CONFORMANCE_RULE_IDS.implementation,
            version: 'forged',
            enabled: false,
          },
        ],
      })
    ).toThrow('Policy revision identity');
  });

  it('accepts only service-validated transient binding sets', () => {
    const policy = policyRevision();
    const set = bindingSet(resolvedObligations(), policy);

    expect(() => new ConformanceEngine().evaluate({ ...set }, policy)).toThrow(
      'was not validated by EffectiveAnalysisService.resolveBindings'
    );
  });

  it('rejects suppression clocks without an explicit RFC3339 timezone', () => {
    const policy = policyRevision();
    const set = bindingSet(resolvedObligations(), policy);

    expect(() =>
      new ConformanceEngine().evaluate(set, policy, {
        suppressionAsOf: '2030-01-01T00:00:00',
      })
    ).toThrow('explicit timezone');
    expect(() =>
      new ConformanceEngine().evaluate(set, policy, {
        suppressionAsOf: '2023-02-29T00:00:00Z',
      })
    ).toThrow('invalid day');
    expect(() =>
      new ConformanceEngine().evaluate(set, policy, {
        suppressionAsOf: '   ',
      })
    ).toThrow('non-empty string');
  });
});

function policyRevision(
  options: {
    readonly rules?: PolicyRevision['rules'];
    readonly suppressions?: PolicyRevision['suppressions'];
    readonly sourceFingerprint?: string;
  } = {}
): PolicyRevision {
  return createPolicyRevision({
    relationSemanticRegistryVersion: '1.0.0',
    lifecycleGateVersion: '1.0.0',
    rules: options.rules ?? [],
    suppressions: options.suppressions ?? [],
    provenance: {
      source: 'default',
      compilerId: 'fixture/policy-compiler',
      compilerVersion: '1.0.0',
      sourceFingerprint: options.sourceFingerprint ?? 'fixture-policy',
    },
  });
}

function bindingSet(
  resolutions: readonly ResolvedSpecBinding[],
  policy: PolicyRevision,
  _resolutionSetId?: string
): BindingResolutionSet {
  const spec = conformanceSpecRevision();
  const evidence = conformanceEvidenceRevision();
  const snapshot = service.createSnapshot({
    code: {
      viewKind: 'persisted-code-revision',
      revisionId: 'code-revision:one',
      graph: conformanceCodeGraph(),
    },
    spec: { revision: spec },
    policy,
    evidence,
    enrichment: createCanonicalEmptyEnrichmentRevision(workspaceId),
    ruleSet: createRuleSetRevision({ analyzerVersions: { conformance: '1.0.0' } }),
    provider: {
      contractId: 'fixture/provider',
      contractVersion: '1.0.0',
      workspaceId,
      graphNamespace: 'fixture/provider',
      capabilities: {},
      observedNodeKinds: ['class'],
      observedEdgeKinds: ['calls'],
    },
    relationSemanticRegistryVersion: policy.relationSemanticRegistryVersion,
  });
  const declarationById = new Map(
    spec.bindings.map((declaration) => [declaration.id, declaration])
  );
  const materialized = resolutions.map((resolution) => {
    const declaration = declarationById.get(resolution.declarationId);
    if (!declaration) throw new Error(`Missing fixture declaration ${resolution.declarationId}`);
    const participants = resolution.participants.map((participant) => ({
      ...participant,
      refs: participant.refs.map((ref) =>
        materializeRef(ref, participant.status, snapshot, evidence)
      ),
    }));
    const identity = {
      declarationId: declaration.id,
      declarationDigest: bindingDeclarationDigest(declaration),
      specRevisionId: spec.revisionId,
      effectiveViewId: snapshot.snapshotId,
      codeRevisionId: snapshot.stamp.code.codeRevisionId,
      ...(declaration.kind === 'verification' ? { evidenceRevisionId: evidence.revisionId } : {}),
      resolver,
      status: resolution.status,
      participants,
    } as const;
    return {
      ...resolution,
      ...identity,
      resolutionId: bindingResolutionId(identity),
    };
  });
  return service.resolveBindings(snapshot, { identity: resolver, resolve: () => materialized });
}

function materializeRef(
  ref: EndpointRef,
  status: ResolvedBindingParticipant['status'],
  snapshot: ReturnType<EffectiveAnalysisService['createSnapshot']>,
  evidence: ReturnType<typeof conformanceEvidenceRevision>
): EndpointRef {
  switch (ref.type) {
    case 'spec-node':
      return {
        ...ref,
        specRevisionId: status === 'stale' ? ref.specRevisionId : snapshot.spec.revision.revisionId,
      };
    case 'code-node':
      return {
        ...ref,
        graphNamespace: 'fixture/provider',
        effectiveCodeViewId: snapshot.stamp.code.effectiveCodeViewId,
        codeRevisionId: snapshot.stamp.code.codeRevisionId,
        providerNodeId: ref.id,
      };
    case 'code-edge': {
      const identity = {
        graphNamespace: 'fixture/provider',
        plane: ref.plane,
        kind: ref.kind,
        from: ref.from,
        to: ref.to,
        ...(ref.occurrenceId ? { occurrenceId: ref.occurrenceId } : {}),
      };
      return {
        ...ref,
        ...identity,
        effectiveCodeViewId: snapshot.stamp.code.effectiveCodeViewId,
        codeRevisionId: snapshot.stamp.code.codeRevisionId,
        edgeId: `code-edge:${fixtureDigest(identity)}`,
      };
    }
    case 'test-evidence': {
      const item = evidence.items.find(
        (candidate) => candidate.kind === 'test-evidence' && candidate.id === ref.id
      );
      if (!item || item.kind !== 'test-evidence') throw new Error(`Missing test fixture ${ref.id}`);
      return {
        ...ref,
        evidenceRevisionId: status === 'stale' ? ref.evidenceRevisionId : evidence.revisionId,
        providerId: item.provenance.producerId,
        file: item.source.file,
        testName: item.testName,
        runner: item.runner,
      };
    }
    case 'api-surface': {
      const item = evidence.items.find(
        (candidate) => candidate.kind === 'api-surface' && candidate.id === ref.surfaceId
      );
      if (!item || item.kind !== 'api-surface') {
        throw new Error(`Missing API fixture ${ref.surfaceId}`);
      }
      return {
        ...ref,
        graphNamespace: 'fixture/provider',
        effectiveCodeViewId: snapshot.stamp.code.effectiveCodeViewId,
        codeRevisionId: snapshot.stamp.code.codeRevisionId,
        providerId: item.provenance.producerId,
        packageName: item.packageName,
        ...(item.packageVersion ? { packageVersion: item.packageVersion } : {}),
        ...(item.module ? { module: item.module } : {}),
        exportName: item.exportName,
      };
    }
  }
}

function conformanceSpecRevision() {
  const provenance: SpecGraphProvenance = {
    source: 'managed-document',
    extractorId: 'fixture/spec-compiler',
    extractorVersion: '1.0.0',
    authoredSourceFingerprint: 'fixture-spec',
  };
  return createSpecGraphRevision({
    workspaceId,
    nodes: conformanceSpecNodes(),
    edges: [],
    bindings: conformanceBindings(),
    provenance,
  });
}

function conformanceSpecNodes(): SpecNode[] {
  const source = (id: string) => ({
    documentId: 'conformance-fixture',
    file: 'managed/conformance-fixture.md',
    symbol: id,
    contentDigest: `source:${id}`,
  });
  return [
    {
      id: 'SPEC-ROOT',
      kind: 'spec',
      title: 'Conformance fixture',
      lifecycle: { mode: 'independent', status: 'active' },
      source: source('SPEC-ROOT'),
      tags: [],
    },
    ...[
      ['REQ-IMPLEMENT', 'requirement'],
      ['REQ-VERIFY', 'requirement'],
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

function conformanceBindings(): SpecBindingDeclaration[] {
  const source = (id: string) => ({
    documentId: 'conformance-fixture',
    file: 'managed/conformance-fixture.md',
    symbol: id,
    contentDigest: `source:${id}`,
  });
  const provenance = {
    source: 'managed-document' as const,
    extractorId: 'fixture/spec-compiler',
    extractorVersion: '1.0.0',
  };
  return [
    {
      id: 'BIND-IMPLEMENTATION',
      kind: 'implementation',
      specNodeId: 'REQ-IMPLEMENT',
      target: {
        type: 'code-node',
        workspaceId,
        graphNamespace: 'fixture/provider',
        canonicalNodeId: 'src/service.ts#Service:class',
      },
      source: source('BIND-IMPLEMENTATION'),
      provenance,
    },
    {
      id: 'BIND-VERIFICATION',
      kind: 'verification',
      specNodeId: 'REQ-VERIFY',
      verifier: { type: 'test-evidence', workspaceId, file: 'src/service.test.ts' },
      subject: {
        type: 'code-edge',
        workspaceId,
        graphNamespace: 'fixture/provider',
        plane: 'compiler-fact',
        kind: 'calls',
        from: {
          type: 'code-node',
          workspaceId,
          canonicalNodeId: 'src/service.ts#Service:class',
        },
        to: {
          type: 'code-node',
          workspaceId,
          canonicalNodeId: 'src/repository.ts#Repository:class',
        },
      },
      source: source('BIND-VERIFICATION'),
      provenance,
    },
    {
      id: 'BIND-CONSTRAINT',
      kind: 'constraint',
      specNodeId: 'REQ-CONSTRAINT',
      target: { type: 'spec-node', workspaceId, specNodeId: 'REQ-TARGET' },
      source: source('BIND-CONSTRAINT'),
      provenance,
    },
    {
      id: 'BIND-GOVERNANCE',
      kind: 'governance',
      specNodeId: 'API-GOVERNANCE',
      target: {
        type: 'api-surface',
        workspaceId,
        packageName: '@fixture/core',
        exportName: 'Service',
      },
      source: source('BIND-GOVERNANCE'),
      provenance,
    },
  ];
}

function conformanceEvidenceRevision() {
  const test = (id: string, testName: string) => ({
    kind: 'test-evidence' as const,
    id,
    runner: 'jest',
    testName,
    status: 'passed' as const,
    source: { file: 'src/service.test.ts', contentDigest: `source:${id}` },
    subjectFiles: ['src/service.ts'],
    provenance: {
      source: 'test-runner' as const,
      producerId: 'fixture/provider',
      producerVersion: '1.0.0',
    },
  });
  return createEvidenceRevision({
    workspaceId,
    items: [
      test('test:one', 'test one'),
      test('test:two', 'test two'),
      {
        kind: 'api-surface',
        id: 'api:@fixture/core:Service',
        packageName: '@fixture/core',
        exportName: 'Service',
        signatureDigest: 'signature:Service',
        provenance: {
          source: 'api-extractor',
          producerId: 'fixture/provider',
          producerVersion: '1.0.0',
        },
      },
    ],
    provenance: {
      source: 'collected',
      producerId: 'fixture/evidence',
      producerVersion: '1.0.0',
      sourceFingerprint: 'fixture-evidence',
    },
  });
}

function conformanceCodeGraph(): CanonicalProjectGraph {
  const serviceId = 'src/service.ts#Service:class';
  const repositoryId = 'src/repository.ts#Repository:class';
  const nodes = [
    { id: serviceId, sourceId: serviceId, kind: 'class', file: 'src/service.ts' },
    { id: repositoryId, sourceId: repositoryId, kind: 'class', file: 'src/repository.ts' },
  ].sort((left, right) => left.id.localeCompare(right.id));
  const edges = [{ kind: 'calls', from: serviceId, to: repositoryId }];
  return {
    contractVersion: '1.0',
    rootDir: '/repo',
    tsconfigPath: '/repo/tsconfig.json',
    fingerprint: canonicalProjectGraphFingerprint(nodes, edges),
    provenance: {
      adapter: 'fixture',
      producer: 'fixture/provider',
      workspaceId,
      graphNamespace: 'fixture/provider',
    },
    nodes,
    edges,
  };
}

function fixtureDigest(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function resolvedObligations(): ResolvedSpecBinding[] {
  return [
    resolution('implementation', [
      participant('obligation', 'resolved', [specRef('REQ-IMPLEMENT')]),
      participant('implementer', 'resolved', [codeNodeRef('src/service.ts#Service:class')]),
    ]),
    resolution('verification', [
      participant('obligation', 'resolved', [specRef('REQ-VERIFY')]),
      participant('verifier', 'resolved', [evidenceRef('test:one')]),
      participant('subject', 'resolved', [codeEdgeRef()]),
    ]),
    resolution('constraint', [
      participant('constraint', 'resolved', [specRef('REQ-CONSTRAINT')]),
      participant('subject', 'resolved', [specRef('REQ-TARGET')]),
    ]),
    resolution('governance', [
      participant('contract', 'resolved', [specRef('API-GOVERNANCE')]),
      participant('api', 'resolved', [apiRef()]),
    ]),
  ];
}

function resolution(
  kind: SpecBindingKind,
  participants: readonly ResolvedBindingParticipant[]
): ResolvedSpecBinding {
  return {
    resolutionId: `binding-resolution:${kind}`,
    declarationId: `BIND-${kind.toUpperCase()}`,
    declarationDigest: `digest:${kind}`,
    specRevisionId,
    effectiveViewId,
    codeRevisionId: 'code-revision:one',
    ...(kind === 'verification' ? { evidenceRevisionId: 'evidence:one' } : {}),
    resolver,
    status: participants.every((candidate) => candidate.status === 'resolved')
      ? 'resolved'
      : 'missing',
    participants,
    confidence: 1,
    evidence: [],
  };
}

function withParticipantStatus(
  resolutionValue: ResolvedSpecBinding,
  role: ResolvedBindingParticipant['role'],
  status: ResolvedBindingParticipant['status'],
  refs: readonly EndpointRef[]
): ResolvedSpecBinding {
  return {
    ...resolutionValue,
    status,
    participants: resolutionValue.participants.map((candidate) =>
      candidate.role === role ? participant(role, status, refs) : candidate
    ),
  };
}

function participant(
  role: ResolvedBindingParticipant['role'],
  status: ResolvedBindingParticipant['status'],
  refs: readonly EndpointRef[]
): ResolvedBindingParticipant {
  return { role, status, refs };
}

function obligationKind(resolutionValue: ResolvedSpecBinding): SpecBindingKind {
  if (resolutionValue.participants.some((candidate) => candidate.role === 'implementer')) {
    return 'implementation';
  }
  if (resolutionValue.participants.some((candidate) => candidate.role === 'verifier')) {
    return 'verification';
  }
  if (resolutionValue.participants.some((candidate) => candidate.role === 'constraint')) {
    return 'constraint';
  }
  return 'governance';
}

function specRef(id: string): Extract<EndpointRef, { type: 'spec-node' }> {
  return { type: 'spec-node', workspaceId, specRevisionId, id };
}

function codeNodeRef(id: string): Extract<EndpointRef, { type: 'code-node' }> {
  return {
    type: 'code-node',
    workspaceId,
    graphNamespace: 'fixture/provider',
    effectiveCodeViewId: 'effective-code-view:one',
    codeRevisionId: 'code-revision:one',
    id,
    providerNodeId: id,
  };
}

function codeEdgeRef(): Extract<EndpointRef, { type: 'code-edge' }> {
  return {
    type: 'code-edge',
    workspaceId,
    graphNamespace: 'fixture/provider',
    effectiveCodeViewId: 'effective-code-view:one',
    codeRevisionId: 'code-revision:one',
    edgeId: 'edge:calls',
    plane: 'compiler-fact',
    kind: 'calls',
    from: 'src/service.ts#Service:class',
    to: 'src/repository.ts#Repository:class',
  };
}

function evidenceRef(id: string): Extract<EndpointRef, { type: 'test-evidence' }> {
  return { type: 'test-evidence', workspaceId, evidenceRevisionId: 'evidence:one', id };
}

function apiRef(): Extract<EndpointRef, { type: 'api-surface' }> {
  return {
    type: 'api-surface',
    workspaceId,
    graphNamespace: 'fixture/provider',
    effectiveCodeViewId: 'effective-code-view:one',
    codeRevisionId: 'code-revision:one',
    surfaceId: 'api:@fixture/core:Service',
  };
}
