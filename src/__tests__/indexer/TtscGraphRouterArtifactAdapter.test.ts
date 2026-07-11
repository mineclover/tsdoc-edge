import { TtscGraphRouterArtifactAdapter } from '../../indexer/TtscGraphRouterArtifactAdapter';

describe('TtscGraphRouterArtifactAdapter', () => {
  const rootDir = '/workspace/project';

  it('loads and preserves the raw graph with a TypeScript 7.0 compatibility target', async () => {
    const loadRepoGraphArtifact = jest.fn().mockResolvedValue(validArtifact());
    const adapter = new TtscGraphRouterArtifactAdapter({
      configPath: '/workspace/router.json',
      repoId: 'project',
      moduleLoader: async () => ({
        resolveRepoGraphArtifactTarget: () => ({ cwd: rootDir, tsconfig: 'tsconfig.json' }),
        loadRepoGraphArtifact,
        validateGraphArtifact: () => validValidation(),
      }),
    });

    const graph = await adapter.load({ rootDir, tsconfigPath: 'tsconfig.json' });

    expect(loadRepoGraphArtifact).toHaveBeenCalledWith('/workspace/router.json', 'project', {
      refresh: true,
    });
    expect(graph.nodes[0].producerOnly).toBe('preserved');
    expect(graph.provenance.artifactCapabilities).toMatchObject({
      futureCapability: 'preserved',
    });
    expect(graph.tsconfigPath).toBe('/workspace/project/tsconfig.json');
    expect(graph.provenance).toEqual(
      expect.objectContaining({
        adapter: 'ttsc-graph-router-artifact',
        producer: '@ttsc/graph',
        workspaceId: 'project',
        graphNamespace: 'ttsc:project',
        producerVersion: '0.18.4',
        producerBinaryVersion: 'ttscgraph 0.18.4 (fixture)',
        artifactContractVersion: '1.0.0',
        artifactFactPlane: 'raw',
        routerVersion: '0.2.0',
        typescriptCompatibilityTarget: '7.0',
        diagnosticsCollected: false,
        refreshRequested: true,
      })
    );
  });

  it('rejects unsaved content because it belongs in the LSP overlay', async () => {
    const adapter = new TtscGraphRouterArtifactAdapter({
      configPath: '/workspace/router.json',
      repoId: 'project',
      moduleLoader: async () => {
        throw new Error('must not load router');
      },
    });

    await expect(
      adapter.load({
        rootDir,
        contentOverrides: new Map([['src/index.ts', 'export const answer = 43;']]),
      })
    ).rejects.toThrow('unsaved buffers');
  });

  it('rejects non-7.0 compatibility targets', () => {
    expect(
      () =>
        new TtscGraphRouterArtifactAdapter({
          configPath: '/workspace/router.json',
          repoId: 'project',
          typescriptCompatibilityTarget: '5.9',
        })
    ).toThrow('must target TypeScript 7.0');
  });

  it('requires an explicit module until the private router package is installed', () => {
    expect(
      () =>
        new TtscGraphRouterArtifactAdapter({
          configPath: '/workspace/router.json',
          repoId: 'project',
        })
    ).toThrow('moduleSpecifier is required');
  });

  it('reports router artifact validation errors', async () => {
    const adapter = new TtscGraphRouterArtifactAdapter({
      configPath: '/workspace/router.json',
      repoId: 'project',
      moduleLoader: async () => ({
        resolveRepoGraphArtifactTarget: () => ({ cwd: rootDir, tsconfig: 'tsconfig.json' }),
        loadRepoGraphArtifact: async () => validArtifact(),
        validateGraphArtifact: () => ({
          ok: false,
          contract: artifactContract(),
          errors: [{ path: '$.nodes[0].id', message: 'node id must be a string.' }],
        }),
      }),
    });

    await expect(adapter.load({ rootDir })).rejects.toThrow(
      '$.nodes[0].id: node id must be a string.'
    );
  });

  it('keeps the exact @ttsc/graph 0.18.4 pin as the TypeScript 7 stabilization policy', async () => {
    const artifact = validArtifact();
    artifact.producer.version = '0.18.5';
    const adapter = new TtscGraphRouterArtifactAdapter({
      configPath: '/workspace/router.json',
      repoId: 'project',
      moduleLoader: async () => ({
        resolveRepoGraphArtifactTarget: () => ({ cwd: rootDir, tsconfig: 'tsconfig.json' }),
        loadRepoGraphArtifact: async () => artifact,
        validateGraphArtifact: () => validValidation(),
      }),
    });

    await expect(adapter.load({ rootDir })).rejects.toThrow(
      'Expected @ttsc/graph 0.18.4, got 0.18.5'
    );
  });

  it('rejects a wrong repo target before producing a graph', async () => {
    const loadRepoGraphArtifact = jest.fn();
    const adapter = new TtscGraphRouterArtifactAdapter({
      configPath: '/workspace/router.json',
      repoId: 'wrong',
      moduleLoader: async () => ({
        resolveRepoGraphArtifactTarget: () => ({
          cwd: '/workspace/another-project',
          tsconfig: 'tsconfig.json',
        }),
        loadRepoGraphArtifact,
        validateGraphArtifact: () => validValidation(),
      }),
    });

    await expect(adapter.load({ rootDir })).rejects.toThrow('resolves to');
    expect(loadRepoGraphArtifact).not.toHaveBeenCalled();
  });

  it('rejects a raw dump envelope from another project or tsconfig', async () => {
    const artifact = validArtifact();
    artifact.dump.project = '/workspace/another-project';
    artifact.provenance.project = '/workspace/another-project';
    const adapter = new TtscGraphRouterArtifactAdapter({
      configPath: '/workspace/router.json',
      repoId: 'project',
      moduleLoader: async () => ({
        resolveRepoGraphArtifactTarget: () => ({ cwd: rootDir, tsconfig: 'tsconfig.json' }),
        loadRepoGraphArtifact: async () => artifact,
        validateGraphArtifact: () => validValidation(),
      }),
    });

    await expect(adapter.load({ rootDir, tsconfigPath: 'tsconfig.json' })).rejects.toThrow(
      'artifact envelope mismatch'
    );
  });

  it('rejects an unversioned or incompatible graph artifact envelope', async () => {
    const artifact = validArtifact();
    artifact.contract.version = '2.0.0';
    artifact.provenance.contractVersion = '2.0.0';
    const adapter = new TtscGraphRouterArtifactAdapter({
      configPath: '/workspace/router.json',
      repoId: 'project',
      moduleLoader: async () => ({
        resolveRepoGraphArtifactTarget: () => ({ cwd: rootDir, tsconfig: 'tsconfig.json' }),
        loadRepoGraphArtifact: async () => artifact,
        validateGraphArtifact: () => ({
          ...validValidation(),
          contract: { ...artifactContract(), version: '2.0.0' },
        }),
      }),
    });

    await expect(adapter.load({ rootDir })).rejects.toThrow(
      'Expected ttsc graph artifact contract 1.0.0, got 2.0.0'
    );
  });

  it('normalizes diagnostics into the separate canonical diagnostics plane', async () => {
    const artifact = validArtifact();
    (artifact.dump as typeof artifact.dump & { diagnostics?: unknown[] }).diagnostics = [
      {
        message: 'Type mismatch',
        severity: 'error',
        file: 'src/index.ts',
        line: 4,
        column: 7,
        code: 2322,
        origin: 'tsc',
        node: 'src/index.ts#value:variable',
      },
    ];
    artifact.capabilities.diagnosticsCollected = true;
    const adapter = new TtscGraphRouterArtifactAdapter({
      configPath: '/workspace/router.json',
      repoId: 'project',
      moduleLoader: async () => ({
        resolveRepoGraphArtifactTarget: () => ({ cwd: rootDir, tsconfig: 'tsconfig.json' }),
        loadRepoGraphArtifact: async () => artifact,
        validateGraphArtifact: () => validValidation(),
      }),
    });

    const loaded = await adapter.load({ rootDir });
    expect(loaded.diagnostics).toEqual([
      expect.objectContaining({
        message: 'Type mismatch',
        severity: 'error',
        startLine: 4,
        startCol: 7,
        code: 2322,
        category: 'compiler',
        relatedNodeIds: ['src/index.ts#value:variable'],
        producerFields: { origin: 'tsc' },
      }),
    ]);
    expect(loaded.provenance.diagnosticsCollected).toBe(true);
  });

  it('rejects diagnostics when field presence and capability disagree', async () => {
    const presentButUnreported = validArtifact();
    (
      presentButUnreported.dump as typeof presentButUnreported.dump & {
        diagnostics?: unknown[];
      }
    ).diagnostics = [];
    await expect(loadArtifact(presentButUnreported)).rejects.toThrow(
      'diagnostics capability does not match dump field presence'
    );

    const reportedButAbsent = validArtifact();
    reportedButAbsent.capabilities.diagnosticsCollected = true;
    await expect(loadArtifact(reportedButAbsent)).rejects.toThrow(
      'diagnostics capability does not match dump field presence'
    );
  });

  const forgedEnvelopeCases: Array<
    [string, (artifact: ReturnType<typeof validArtifact>) => void, string]
  > = [
    [
      'non-record meta',
      (artifact) => {
        (artifact as unknown as { meta: unknown }).meta = null;
      },
      'artifact.meta must be an object',
    ],
    [
      'numeric cache fingerprint',
      (artifact) => {
        (artifact.meta as unknown as { fingerprint: unknown }).fingerprint = 123;
        (artifact.provenance as unknown as { cacheFingerprint: unknown }).cacheFingerprint = 123;
      },
      'artifact.meta.fingerprint must be a non-empty string',
    ],
    [
      'non-canonical refresh timestamp',
      (artifact) => {
        artifact.meta.refreshedAt = 'not-a-timestamp';
        artifact.provenance.refreshedAt = 'not-a-timestamp';
      },
      'artifact.meta.refreshedAt must be a canonical ISO timestamp',
    ],
    [
      'non-boolean refreshed state',
      (artifact) => {
        (artifact.meta as unknown as { refreshed: unknown }).refreshed = 'yes';
        (artifact.provenance as unknown as { refreshed: unknown }).refreshed = 'yes';
      },
      'artifact.meta.refreshed must be a boolean',
    ],
    [
      'non-record provenance router',
      (artifact) => {
        (artifact.provenance as unknown as { router: unknown }).router = null;
      },
      'artifact.provenance.router must be an object',
    ],
    [
      'non-string producer binary version',
      (artifact) => {
        (artifact.producer as unknown as { binaryVersion: unknown }).binaryVersion = 16;
      },
      'artifact.producer.binaryVersion must be a non-empty string',
    ],
    [
      'non-record optional cache summary',
      (artifact) => {
        (artifact.meta as unknown as { summary: unknown }).summary = [];
      },
      'artifact.meta.summary must be an object',
    ],
    [
      'wrong cache repo id',
      (artifact) => {
        artifact.meta.repoId = 'another-project';
      },
      'cache metadata does not match its loaded dump',
    ],
    [
      'wrong cache node count',
      (artifact) => {
        artifact.meta.nodes = 2;
      },
      'cache metadata does not match its loaded dump',
    ],
    [
      'different provenance producer',
      (artifact) => {
        artifact.provenance.producer = { ...artifact.producer, version: '0.18.5' };
      },
      'provenance does not match its loaded envelope',
    ],
    [
      'different provenance fingerprint',
      (artifact) => {
        artifact.provenance.cacheFingerprint = 'another-fingerprint';
      },
      'provenance does not match its loaded envelope',
    ],
    [
      'different provenance timestamp',
      (artifact) => {
        artifact.provenance.refreshedAt = '2026-07-10T00:00:01.000Z';
      },
      'provenance does not match its loaded envelope',
    ],
    [
      'different provenance refreshed state',
      (artifact) => {
        artifact.provenance.refreshed = false;
      },
      'provenance does not match its loaded envelope',
    ],
  ];

  it.each(forgedEnvelopeCases)('rejects forged envelope: %s', async (_name, mutate, message) => {
    const artifact = validArtifact();
    mutate(artifact);
    await expect(loadArtifact(artifact)).rejects.toThrow(message);
  });

  it('rejects malformed validator output before trusting it', async () => {
    await expect(
      loadArtifact(validArtifact(), {
        ok: true,
        contract: artifactContract(),
        errors: [{}],
        drift: {},
      })
    ).rejects.toThrow('artifact validation.errors[0].path must be a non-empty string');
  });

  it('requires the runtime validator export at the dynamic module boundary', async () => {
    const adapter = new TtscGraphRouterArtifactAdapter({
      configPath: '/workspace/router.json',
      repoId: 'project',
      moduleLoader: async () =>
        ({
          resolveRepoGraphArtifactTarget: () => ({ cwd: rootDir, tsconfig: 'tsconfig.json' }),
          loadRepoGraphArtifact: async () => validArtifact(),
        }) as never,
    });

    await expect(adapter.load({ rootDir })).rejects.toThrow(
      'does not export validateGraphArtifact'
    );
  });

  function loadArtifact(artifact: unknown, validation: unknown = validValidation()) {
    const adapter = new TtscGraphRouterArtifactAdapter({
      configPath: '/workspace/router.json',
      repoId: 'project',
      moduleLoader: async () => ({
        resolveRepoGraphArtifactTarget: () => ({ cwd: rootDir, tsconfig: 'tsconfig.json' }),
        loadRepoGraphArtifact: async () => artifact,
        validateGraphArtifact: () => validation,
      }),
    });
    return adapter.load({ rootDir, tsconfigPath: 'tsconfig.json' });
  }
});

function validArtifact() {
  const producer = {
    name: '@ttsc/graph',
    version: '0.18.4',
    binary: '/workspace/ttscgraph',
    binaryVersion: 'ttscgraph 0.18.4 (fixture)',
  };
  return {
    repo: { cwd: '/workspace/project', tsconfig: 'tsconfig.json' },
    dump: {
      project: '/workspace/project',
      tsconfig: 'tsconfig.json',
      nodes: [
        {
          id: 'src/index.ts#answer:variable',
          kind: 'variable',
          name: 'answer',
          file: 'src/index.ts',
          external: false,
          producerOnly: 'preserved',
        },
      ],
      edges: [],
    },
    producer,
    meta: {
      repoId: 'project',
      cwd: '/workspace/project',
      tsconfig: 'tsconfig.json',
      fingerprint: 'fixture-fingerprint',
      refreshedAt: '2026-07-10T00:00:00.000Z',
      stale: false,
      refreshed: true,
      nodes: 1,
      edges: 0,
    },
    contract: artifactContract(),
    capabilities: {
      factPlane: 'raw' as const,
      snapshot: 'saved-files' as const,
      structuralSynthesis: false as const,
      unsavedBuffers: false as const,
      diagnosticsCollected: false,
      compilerVersionReported: false as const,
      evidenceCoordinates: 'one-based' as const,
      unknownFields: 'preserved' as const,
      futureCapability: 'preserved',
    },
    provenance: {
      contractVersion: '1.0.0',
      router: {
        name: '@ttsc-ex/ttsc-graph-router' as const,
        version: '0.2.0',
      },
      producer,
      compilerVersion: null,
      project: '/workspace/project',
      tsconfig: 'tsconfig.json',
      cacheFingerprint: 'fixture-fingerprint',
      refreshedAt: '2026-07-10T00:00:00.000Z',
      refreshed: true,
    },
  };
}

function artifactContract() {
  return {
    id: '@ttsc-ex/ttsc-graph-router/raw-graph-artifact' as const,
    version: '1.0.0',
    schema: '@ttsc/graph/ITtscGraphDump' as const,
    factPlane: 'raw' as const,
  };
}

function validValidation() {
  return {
    ok: true,
    contract: artifactContract(),
    errors: [],
    drift: { nodeFields: [], edgeFields: [], nodeKinds: [], edgeKinds: [] },
  };
}
