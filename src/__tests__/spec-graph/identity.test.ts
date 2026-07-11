import {
  bindingDeclarationDigest,
  bindingResolutionId,
  createPolicyRevision,
  createSpecEdge,
  createSpecGraphRevision,
  type EndpointRef,
  type PolicyRule,
  type PolicySuppression,
  type ResolvedBindingParticipant,
  type SpecBindingDeclaration,
  type SpecGraphProvenance,
  type SpecNode,
} from '../../spec-graph';

const provenance: SpecGraphProvenance = {
  source: 'managed-document',
  extractorId: 'tsdoc-edge/spec-extractor',
  extractorVersion: '1.0.0',
  authoredSourceFingerprint: 'managed-docs-fixture',
};

describe('spec graph identity', () => {
  it('uses the semantic qualifier in durable edge identity', () => {
    const left = createSpecEdge({
      kind: 'requires',
      from: 'REQ-002',
      to: 'REQ-001',
      semanticQualifier: 'runtime',
      provenance,
    });
    const right = createSpecEdge({
      kind: 'requires',
      from: 'REQ-002',
      to: 'REQ-001',
      semanticQualifier: 'build-time',
      provenance,
    });

    expect(left.id).not.toBe(right.id);
  });

  it('builds the same revision regardless of input ordering', () => {
    const nodes = fixtureNodes();
    const edge = createSpecEdge({
      kind: 'contains',
      from: 'SPEC-001',
      to: 'REQ-001',
      provenance,
    });
    const declaration = fixtureImplementationBinding();

    const left = createSpecGraphRevision({
      workspaceId: 'fixture',
      nodes,
      edges: [edge],
      bindings: [declaration],
      provenance,
    });
    const right = createSpecGraphRevision({
      workspaceId: 'fixture',
      nodes: [...nodes].reverse(),
      edges: [edge],
      bindings: [declaration],
      provenance,
    });

    expect(left.revisionId).toBe(right.revisionId);
    expect(left.nodes.map((node) => node.id)).toEqual(['REQ-001', 'SPEC-001']);
  });

  it('rejects invalid endpoint matrices and lifecycle inheritance', () => {
    const nodes = fixtureNodes();
    expect(() =>
      createSpecGraphRevision({
        workspaceId: 'fixture',
        nodes,
        edges: [
          createSpecEdge({
            kind: 'establishes',
            from: 'REQ-001',
            to: 'SPEC-001',
            provenance,
          }),
        ],
        bindings: [],
        provenance,
      })
    ).toThrow('does not allow requirement -> spec');
  });

  it('rejects forged edge identity and cyclic supersedes lineage', () => {
    const nodes = [
      ...fixtureNodes(),
      {
        id: 'REQ-002',
        kind: 'requirement' as const,
        title: 'Second requirement',
        lifecycle: { mode: 'inherited' as const, aggregateSpecId: 'SPEC-001' },
        source: source('REQ-002'),
        tags: [],
      },
    ];
    const edge = createSpecEdge({
      kind: 'requires',
      from: 'REQ-001',
      to: 'REQ-002',
      provenance,
    });
    expect(() =>
      createSpecGraphRevision({
        workspaceId: 'fixture',
        nodes,
        edges: [{ ...edge, id: 'spec-edge:forged' }],
        bindings: [],
        provenance,
      })
    ).toThrow('Spec edge identity mismatch');

    expect(() =>
      createSpecGraphRevision({
        workspaceId: 'fixture',
        nodes,
        edges: [
          createSpecEdge({
            kind: 'supersedes',
            from: 'REQ-001',
            to: 'REQ-002',
            provenance,
          }),
          createSpecEdge({
            kind: 'supersedes',
            from: 'REQ-002',
            to: 'REQ-001',
            provenance,
          }),
        ],
        bindings: [],
        provenance,
      })
    ).toThrow('supersedes lineage contains a cycle');
  });

  it('rejects unbounded or cross-workspace authored selectors', () => {
    const base = fixtureImplementationBinding();
    if (base.kind !== 'implementation') throw new Error('fixture must be implementation');
    expect(() =>
      createSpecGraphRevision({
        workspaceId: 'fixture',
        nodes: fixtureNodes(),
        edges: [],
        bindings: [
          {
            ...base,
            target: { type: 'code-node', workspaceId: 'fixture' },
          },
        ],
        provenance,
      })
    ).toThrow('must constrain at least one code-node identity field');

    expect(() =>
      createSpecGraphRevision({
        workspaceId: 'fixture',
        nodes: fixtureNodes(),
        edges: [],
        bindings: [
          {
            ...base,
            target: { ...base.target, workspaceId: 'other-workspace' },
          },
        ],
        provenance,
      })
    ).toThrow('workspace mismatch');
  });

  it('keys resolution by declaration, spec/code revisions, and resolver version', () => {
    const declaration = fixtureImplementationBinding();
    const declarationDigest = bindingDeclarationDigest(declaration);
    const common = {
      declarationId: declaration.id,
      declarationDigest,
      specRevisionId: 'spec-revision:one',
      effectiveViewId: 'effective-analysis:one',
      codeRevisionId: 'code-revision:one',
      resolver: { id: 'canonical-binding-resolver', version: '1.0.0' },
      status: 'resolved' as const,
      participants: [],
    };

    expect(bindingResolutionId(common)).not.toBe(
      bindingResolutionId({
        ...common,
        resolver: { ...common.resolver, version: '2.0.0' },
      })
    );
    expect(bindingResolutionId(common)).not.toBe(
      bindingResolutionId({
        ...common,
        resolver: { ...common.resolver, configDigest: 'resolver-config:one' },
      })
    );
    expect(() =>
      bindingResolutionId({
        ...common,
        resolver: { ...common.resolver, configDigest: '' },
      })
    ).toThrow('configDigest must be a non-empty string');
  });

  it('creates order-independent policy revision identity', () => {
    const rules = [
      { id: 'architecture-boundary', version: '1.0.0', enabled: true },
      { id: 'active-spec-gate', version: '1.0.0', enabled: true },
    ] as const;
    const left = createPolicyRevision({
      relationSemanticRegistryVersion: '1.0.0',
      lifecycleGateVersion: '1.0.0',
      rules,
      provenance: {
        source: 'workspace-config',
        compilerId: 'tsdoc-edge/policy-compiler',
        compilerVersion: '1.0.0',
        sourceFingerprint: 'policy-source',
      },
    });
    const right = createPolicyRevision({
      relationSemanticRegistryVersion: '1.0.0',
      lifecycleGateVersion: '1.0.0',
      rules: [...rules].reverse(),
      provenance: {
        source: 'workspace-config',
        compilerId: 'tsdoc-edge/policy-compiler',
        compilerVersion: '1.0.0',
        sourceFingerprint: 'policy-source',
      },
    });

    expect(left.revisionId).toBe(right.revisionId);
    expect(left.rules.map((rule) => rule.id)).toEqual([
      'active-spec-gate',
      'architecture-boundary',
    ]);
  });

  it('deep-clones and freezes every content-addressed revision value', () => {
    const nodes = fixtureNodes();
    const mutableRule = {
      id: 'active-spec-gate',
      version: '1.0.0',
      enabled: true,
      parameters: { threshold: 1 },
    };
    const revision = createSpecGraphRevision({
      workspaceId: 'fixture',
      nodes,
      edges: [],
      bindings: [fixtureImplementationBinding()],
      provenance,
    });
    const policy = createPolicyRevision({
      relationSemanticRegistryVersion: '1.0.0',
      lifecycleGateVersion: '1.0.0',
      rules: [mutableRule],
      provenance: policyProvenance(),
    });

    (nodes[0] as { title: string }).title = 'Mutated after creation';
    mutableRule.enabled = false;
    mutableRule.parameters.threshold = 2;

    expect(revision.nodes.find((node) => node.id === 'SPEC-001')?.title).toBe('Fixture spec');
    expect(policy.rules[0]).toMatchObject({
      enabled: true,
      parameters: { threshold: 1 },
    });
    expect(Object.isFrozen(revision.nodes[0])).toBe(true);
    expect(Object.isFrozen(revision.nodes[0].lifecycle)).toBe(true);
    expect(Object.isFrozen(revision.bindings[0])).toBe(true);
    expect(Object.isFrozen(policy.rules[0])).toBe(true);
    expect(Object.isFrozen(policy.rules[0].parameters)).toBe(true);
  });

  it('rejects non-JSON and non-finite policy parameter values', () => {
    const policyWithParameter = (value: unknown) =>
      createPolicyRevision({
        relationSemanticRegistryVersion: '1.0.0',
        lifecycleGateVersion: '1.0.0',
        rules: [
          {
            id: 'active-spec-gate',
            version: '1.0.0',
            enabled: true,
            parameters: { value },
          },
        ],
        provenance: policyProvenance(),
      });
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(() => policyWithParameter(Number.NaN)).toThrow('finite JSON numbers');
    expect(() => policyWithParameter(Number.POSITIVE_INFINITY)).toThrow('finite JSON numbers');
    expect(() => policyWithParameter(new Set([1]))).toThrow('plain JSON objects');
    expect(() => policyWithParameter(1n)).toThrow('strict JSON values');
    expect(() => policyWithParameter(circular)).toThrow('circular JSON values');
  });

  it('enforces spec runtime enums, shapes, and binding-to-node kind matrices', () => {
    const invalidNode = {
      id: 'ALIEN-001',
      kind: 'alien',
      title: 'Invalid',
      lifecycle: { mode: 'warp', status: 'nonsense' },
      source: source('ALIEN-001'),
      tags: [1],
    } as unknown as SpecNode;
    expect(() =>
      createSpecGraphRevision({
        workspaceId: 'fixture',
        nodes: [invalidNode],
        edges: [],
        bindings: [],
        provenance,
      })
    ).toThrow('kind has unsupported value: alien');

    const invalidStatus = {
      ...fixtureNodes()[0],
      lifecycle: { mode: 'independent', status: 'nonsense' },
    } as unknown as SpecNode;
    expect(() =>
      createSpecGraphRevision({
        workspaceId: 'fixture',
        nodes: [invalidStatus],
        edges: [],
        bindings: [],
        provenance,
      })
    ).toThrow('status has unsupported value: nonsense');

    const decision: SpecNode = {
      id: 'ADR-001',
      kind: 'decision',
      title: 'Decision',
      lifecycle: { mode: 'inherited', aggregateSpecId: 'SPEC-001' },
      source: source('ADR-001'),
      tags: [],
    };
    const invalidBinding = {
      ...fixtureImplementationBinding(),
      id: 'BIND-DECISION',
      specNodeId: decision.id,
    };
    expect(() =>
      createSpecGraphRevision({
        workspaceId: 'fixture',
        nodes: [...fixtureNodes(), decision],
        edges: [],
        bindings: [invalidBinding],
        provenance,
      })
    ).toThrow('kind implementation does not allow spec node kind decision');
  });

  it('validates policy shapes and canonicalizes timezone-aware RFC3339 suppressions', () => {
    const suppression = (expiresAt: string): PolicySuppression => ({
      id: 'SUPPRESS-001',
      ruleId: 'binding.verification',
      target: {
        type: 'spec-node',
        workspaceId: 'fixture',
        specNodeId: 'REQ-001',
      },
      reason: 'Temporary waiver',
      expiresAt,
    });
    const create = (expiresAt: string) =>
      createPolicyRevision({
        relationSemanticRegistryVersion: '1.0.0',
        lifecycleGateVersion: '1.0.0',
        rules: [],
        suppressions: [suppression(expiresAt)],
        provenance: policyProvenance(),
      });

    const seoul = create('2030-01-01T09:00:00+09:00');
    const utc = create('2030-01-01T00:00:00.000Z');

    expect(seoul.suppressions[0].expiresAt).toBe('2030-01-01T00:00:00.000Z');
    expect(seoul.revisionId).toBe(utc.revisionId);
    expect(() => create('2030-01-01T00:00:00')).toThrow('explicit timezone');
    expect(() => create('2030-02-30T00:00:00Z')).toThrow('invalid day');
    expect(() =>
      createPolicyRevision({
        relationSemanticRegistryVersion: '1.0.0',
        lifecycleGateVersion: '1.0.0',
        rules: [
          {
            id: 'invalid-rule',
            version: '1.0.0',
            enabled: 'yes',
          } as unknown as PolicyRule,
        ],
        provenance: policyProvenance(),
      })
    ).toThrow('enabled must be a boolean');
  });

  it('canonicalizes participant and endpoint ordering in binding resolution identity', () => {
    const obligation: ResolvedBindingParticipant = {
      role: 'obligation',
      status: 'resolved',
      refs: [specRef('REQ-001')],
    };
    const leftRef = codeRef('src/a.ts#A:class');
    const rightRef = codeRef('src/b.ts#B:class');
    const implementer: ResolvedBindingParticipant = {
      role: 'implementer',
      status: 'ambiguous',
      refs: [leftRef, rightRef],
    };
    const common = {
      declarationId: 'BIND-001',
      declarationDigest: 'declaration-digest',
      specRevisionId: 'spec-revision:one',
      effectiveViewId: 'effective-analysis:one',
      codeRevisionId: 'code-revision:one',
      resolver: { id: 'canonical-binding-resolver', version: '1.0.0' },
      status: 'ambiguous' as const,
    };

    const left = bindingResolutionId({
      ...common,
      participants: [obligation, implementer],
    });
    const right = bindingResolutionId({
      ...common,
      participants: [{ ...implementer, refs: [rightRef, leftRef] }, obligation],
    });

    expect(left).toBe(right);
  });
});

function fixtureNodes(): SpecNode[] {
  return [
    {
      id: 'SPEC-001',
      kind: 'spec',
      title: 'Fixture spec',
      lifecycle: { mode: 'independent', status: 'active', version: '1.0.0' },
      source: source('SPEC-001'),
      tags: [],
    },
    {
      id: 'REQ-001',
      kind: 'requirement',
      title: 'Fixture requirement',
      lifecycle: { mode: 'inherited', aggregateSpecId: 'SPEC-001' },
      source: source('REQ-001'),
      tags: [],
    },
  ];
}

function fixtureImplementationBinding(): SpecBindingDeclaration {
  return {
    id: 'BIND-001',
    kind: 'implementation',
    specNodeId: 'REQ-001',
    target: {
      type: 'code-node',
      workspaceId: 'fixture',
      providerId: '@ttsc/graph',
      file: 'src/service.ts',
      qualifiedName: 'Service',
      kind: 'class',
    },
    source: source('BIND-001'),
    provenance,
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

function policyProvenance() {
  return {
    source: 'workspace-config' as const,
    compilerId: 'tsdoc-edge/policy-compiler',
    compilerVersion: '1.0.0',
    sourceFingerprint: 'policy-source',
  };
}

function specRef(id: string): Extract<EndpointRef, { type: 'spec-node' }> {
  return {
    type: 'spec-node',
    workspaceId: 'fixture',
    specRevisionId: 'spec-revision:one',
    id,
  };
}

function codeRef(id: string): Extract<EndpointRef, { type: 'code-node' }> {
  return {
    type: 'code-node',
    workspaceId: 'fixture',
    graphNamespace: 'fixture/provider',
    effectiveCodeViewId: 'effective-code-view:one',
    codeRevisionId: 'code-revision:one',
    id,
  };
}
