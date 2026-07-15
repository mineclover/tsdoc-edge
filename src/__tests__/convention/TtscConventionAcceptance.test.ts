import { ConventionCheckService, compileConventionPackFile } from '../../convention';
import { ProjectIndexer } from '../../indexer/ProjectIndexer';
import { TtscGraphRouterArtifactAdapter } from '../../indexer/TtscGraphRouterArtifactAdapter';
import { GraphRepository } from '../../storage/GraphRepository';

describe('TS7 convention acceptance', () => {
  it('checks a router artifact through ProjectIndexer and GraphRepository', async () => {
    const rootDir = process.cwd();
    const adapter = new TtscGraphRouterArtifactAdapter({
      configPath: '/workspace/router.json',
      repoId: 'tsdoc-edge',
      moduleLoader: async () => ({
        resolveRepoGraphArtifactTarget: () => ({ cwd: rootDir, tsconfig: 'tsconfig.ttsc.json' }),
        loadRepoGraphArtifact: async () => routerArtifact(rootDir),
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
      tsconfigPath: 'tsconfig.ttsc.json',
    });
    const repository = new GraphRepository(':memory:');
    try {
      repository.replaceActiveRevision(indexed.graph, { diagnostics: indexed.diagnostics });
      const revision = repository.readActiveRevision();
      expect(revision).not.toBeNull();

      const pack = compileConventionPackFile('managed/conventions/tsdoc-edge-core.json', {
        workspaceRoot: rootDir,
      });
      const result = new ConventionCheckService().run({
        pack,
        codeRevision: revision!,
        workspaceRoot: rootDir,
        expectedManifestId: pack.manifest.manifestId,
      });

      expect(result.conformance.summary).toMatchObject({
        total: 1,
        satisfied: 1,
        violated: 0,
        indeterminate: 0,
      });
      expect(result.conformance.findings).toEqual([
        expect.objectContaining({ outcome: 'satisfied' }),
      ]);
      expect(result.bindingDiagnostics).toEqual([]);
      expect(result.capabilityChecks).toEqual([]);
      expect(result.codeRevisionId).toBe(revision!.metadata.revisionId);
      expect(indexed.graph.provenance).toMatchObject({
        workspaceId: 'tsdoc-edge',
        graphNamespace: 'ttsc:tsdoc-edge',
      });
    } finally {
      repository.close();
    }
  });
});

function routerArtifact(rootDir: string) {
  const producer = {
    name: '@ttsc/graph',
    version: '0.18.4',
    binary: '/workspace/ttscgraph',
    binaryVersion: 'ttscgraph 0.18.4 (fixture)',
  };
  return {
    repo: { cwd: rootDir, tsconfig: 'tsconfig.ttsc.json' },
    dump: {
      project: rootDir,
      tsconfig: 'tsconfig.ttsc.json',
      nodes: [
        {
          id: 'src/indexer/ProjectIndexer.ts#ProjectIndexer:class',
          kind: 'class',
          name: 'ProjectIndexer',
          file: 'src/indexer/ProjectIndexer.ts',
          external: false,
        },
      ],
      edges: [],
    },
    producer,
    meta: {
      repoId: 'tsdoc-edge',
      cwd: rootDir,
      tsconfig: 'tsconfig.ttsc.json',
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
      contractVersion: '1.1.0',
      router: { name: '@ttsc-ex/ttsc-graph-router', version: '0.2.0' },
      producer,
      compilerVersion: null,
      project: rootDir,
      tsconfig: 'tsconfig.ttsc.json',
      cacheFingerprint: 'fixture-fingerprint',
      refreshedAt: '2026-07-10T00:00:00.000Z',
      refreshed: true,
    },
  };
}

function artifactContract() {
  return {
    id: '@ttsc-ex/ttsc-graph-router/raw-graph-artifact' as const,
    version: '1.1.0',
    schema: '@ttsc/graph/ITtscGraphDump' as const,
    factPlane: 'raw' as const,
  };
}
