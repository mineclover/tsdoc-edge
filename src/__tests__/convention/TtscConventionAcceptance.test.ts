import { ConventionCheckService, compileConventionPackSource } from '../../convention';
import { ProjectIndexer } from '../../indexer/ProjectIndexer';
import { TtscGraphRouterArtifactAdapter } from '../../indexer/TtscGraphRouterArtifactAdapter';
import { GraphRepository } from '../../storage/GraphRepository';

describe('TS7 convention acceptance', () => {
  it('checks a router artifact through ProjectIndexer and GraphRepository', async () => {
    const rootDir = '/workspace/project';
    const adapter = new TtscGraphRouterArtifactAdapter({
      configPath: '/workspace/router.json',
      repoId: 'project',
      moduleLoader: async () => ({
        resolveRepoGraphArtifactTarget: () => ({ cwd: rootDir, tsconfig: 'tsconfig.json' }),
        loadRepoGraphArtifact: async () => routerArtifact(),
        validateGraphArtifact: () => ({
          ok: true,
          contract: artifactContract(),
          errors: [],
          drift: { nodeFields: [], edgeFields: [], nodeKinds: [], edgeKinds: [] },
        }),
      }),
    });
    const indexed = await new ProjectIndexer(adapter).index({
      rootDir,
      tsconfigPath: 'tsconfig.json',
    });
    const repository = new GraphRepository(':memory:');
    try {
      repository.replaceActiveRevision(indexed.graph, { diagnostics: indexed.diagnostics });
      const revision = repository.readActiveRevision();
      expect(revision).not.toBeNull();

      const pack = compileConventionPackSource(
        {
          contractId: 'tsdoc-edge/convention-pack-source',
          contractVersion: '1.0',
          packId: '@fixture/conventions/ts7',
          packVersion: '1.0.0',
          scope: { kind: 'workspace', workspaceId: 'project' },
          graphNamespace: 'ttsc:project',
          capabilities: {
            factPlane: { minimumStatus: 'complete', version: 'raw' },
          },
          spec: {
            nodes: [
              {
                id: 'SPEC-TS7',
                kind: 'spec',
                title: 'TS7 conventions',
                lifecycle: { mode: 'independent', status: 'active' },
                tags: ['convention-pack'],
              },
              {
                id: 'REQ-ANSWER',
                kind: 'requirement',
                title: 'The answer declaration exists',
                lifecycle: { mode: 'inherited', aggregateSpecId: 'SPEC-TS7' },
                tags: ['implementation'],
              },
            ],
            bindings: [
              {
                id: 'BIND-ANSWER',
                kind: 'implementation',
                specNodeId: 'REQ-ANSWER',
                target: {
                  type: 'code-node',
                  workspaceId: 'project',
                  graphNamespace: 'ttsc:project',
                  canonicalNodeId: 'src/index.ts#answer:variable',
                },
              },
            ],
          },
          policy: {
            lifecycleGateVersion: '1.0.0',
            rules: [
              {
                id: 'binding.implementation',
                version: '1.0.0',
                enabled: true,
                severity: 'error',
              },
            ],
          },
        },
        {
          file: 'managed/conventions/ts7.json',
          contentDigest: `sha256:${'1'.repeat(64)}`,
        }
      );
      const result = new ConventionCheckService().run({
        pack,
        codeRevision: revision!,
        workspaceRoot: rootDir,
        expectedManifestId: pack.manifest.manifestId,
      });

      expect(result.conformance.summary.satisfied).toBe(1);
      expect(result.bindingDiagnostics).toEqual([]);
      expect(result.capabilityChecks).toEqual([
        expect.objectContaining({
          id: 'factPlane',
          observedStatus: 'complete',
          observedVersion: 'raw',
        }),
      ]);
      expect(result.codeRevisionId).toBe(revision!.metadata.revisionId);
      expect(indexed.graph.provenance).toMatchObject({
        workspaceId: 'project',
        graphNamespace: 'ttsc:project',
      });
    } finally {
      repository.close();
    }
  });
});

function routerArtifact() {
  const producer = {
    name: '@ttsc/graph',
    version: '0.16.8',
    binary: '/workspace/ttscgraph',
    binaryVersion: 'ttscgraph 0.16.8 (fixture)',
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
      factPlane: 'raw',
      snapshot: 'saved-files',
      structuralSynthesis: false,
      unsavedBuffers: false,
      diagnosticsCollected: false,
      compilerVersionReported: false,
      evidenceCoordinates: 'one-based',
      unknownFields: 'preserved',
    },
    provenance: {
      contractVersion: '1.0.0',
      router: { name: '@ttsc-ex/ttsc-graph-router', version: '0.2.0' },
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
