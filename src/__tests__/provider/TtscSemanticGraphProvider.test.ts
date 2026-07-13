import * as path from 'node:path';
import type { ProjectGraphSource } from '../../indexer/contracts';
import type { ProviderSnapshot, SemanticGraphProvider } from '../../provider/contracts';
import { ProviderProjectIndexer } from '../../provider/ProviderProjectIndexer';
import { ProviderSnapshotNormalizer } from '../../provider/ProviderSnapshotNormalizer';
import { TtscSemanticGraphProvider } from '../../provider/TtscSemanticGraphProvider';
import { snapshotFixture } from './fixtures';

describe('TtscSemanticGraphProvider', () => {
  test('wraps the saved router lane without claiming complete occurrences or compiler provenance', async () => {
    const source: ProjectGraphSource = {
      id: 'fixture-router',
      async load(request) {
        return {
          rootDir: request.rootDir,
          tsconfigPath: path.resolve(request.rootDir, 'tsconfig.json'),
          nodes: [
            {
              id: 'src/a.ts#A:function',
              kind: 'function',
              name: 'A',
              qualifiedName: 'A',
              file: 'src/a.ts',
              rawFlag: 7,
            },
            {
              id: 'src/b.ts#B:function',
              kind: 'function',
              name: 'B',
              qualifiedName: 'B',
              file: 'src/b.ts',
            },
          ],
          edges: [
            {
              kind: 'calls',
              from: 'src/a.ts#A:function',
              to: 'src/b.ts#B:function',
              evidence: { file: 'src/a.ts', startLine: 3 },
              rawEdgeField: 'preserved',
            },
          ],
          provenance: {
            adapter: 'fixture-router',
            producer: '@ttsc/graph',
            producerVersion: '0.16.8',
            compilerVersion: null,
            typescriptCompatibilityTarget: '7.0',
          },
        };
      },
    };
    const provider = new TtscSemanticGraphProvider({
      source,
      providerVersion: '1.0.0',
      providerInstanceId: 'fixture-instance',
      graphNamespace: 'ts7',
      typescript: { tsconfigPath: 'tsconfig.json' },
    });
    const rootDir = path.resolve('tmp/ttsc-semantic-provider');

    const snapshot = await provider.snapshot({ workspaceId: 'workspace-a', rootDir });

    expect('delta' in provider).toBe(false);
    expect(snapshot.capabilities['fact-occurrences'].status).toBe('partial');
    expect(snapshot.capabilities['incremental-delta'].status).toBe('unsupported');
    expect(snapshot.provenance).toMatchObject({
      producer: '@ttsc/graph',
      producerVersion: '0.16.8',
      compilerVersion: null,
      compilerVersionReported: false,
      typescriptCompatibilityTarget: '7.0',
    });
    expect(snapshot.nodes[0].producerFields).toEqual({ rawFlag: 7 });
    expect(snapshot.facts[0].producerFields).toEqual({ rawEdgeField: 'preserved' });

    const normalized = new ProviderSnapshotNormalizer({
      rootDir,
      compatibilityTsconfigPath: 'tsconfig.json',
    }).normalize(snapshot);
    expect(normalized.providerNodeIdToCanonicalId['src/a.ts#A:function']).toContain(
      '@workspace/workspace-a/graph/ts7/src/a.ts#A:function'
    );
    expect(normalized.factOccurrences).toHaveLength(1);

    const indexed = await new ProviderProjectIndexer(
      provider,
      new ProviderSnapshotNormalizer({
        rootDir,
        compatibilityTsconfigPath: 'tsconfig.json',
      })
    ).index({ workspaceId: 'workspace-a', rootDir });
    expect(indexed.graph.nodes).toHaveLength(2);
    expect(indexed.normalizedSnapshot.factOccurrences).toHaveLength(1);
  });

  test('is deterministic across source ordering and accepts omitted optional provenance', async () => {
    const rootDir = path.resolve('tmp/ttsc-semantic-provider-order');
    const nodes = [
      {
        id: 'src/a.ts#A:function',
        kind: 'function',
        name: 'A',
        qualifiedName: 'A',
        file: 'src/a.ts',
      },
      {
        id: 'src/b.ts#B:function',
        kind: 'function',
        name: 'B',
        qualifiedName: 'B',
        file: 'src/b.ts',
      },
    ];
    const edges = [
      {
        kind: 'calls',
        from: nodes[0].id,
        to: nodes[1].id,
        evidence: { file: 'src/a.ts', startLine: 3 },
      },
      {
        kind: 'calls',
        from: nodes[0].id,
        to: nodes[1].id,
        evidence: { file: 'src/a.ts', startLine: 7 },
      },
    ];
    let reverse = false;
    const source: ProjectGraphSource = {
      id: 'reordering-router',
      async load(request) {
        reverse = !reverse;
        return {
          rootDir: request.rootDir,
          tsconfigPath: path.resolve(request.rootDir, 'tsconfig.json'),
          nodes: reverse ? [...nodes].reverse() : [...nodes],
          edges: reverse ? [...edges].reverse() : [...edges],
          provenance: {
            adapter: 'reordering-router',
            producer: '@ttsc/graph',
            compilerVersion: null,
          },
        };
      },
    };
    const provider = new TtscSemanticGraphProvider({
      source,
      providerVersion: '1.0.0',
      providerInstanceId: 'reordering-instance',
      graphNamespace: 'ts7',
      typescript: { tsconfigPath: 'tsconfig.json' },
    });
    const normalizer = new ProviderSnapshotNormalizer({
      rootDir,
      compatibilityTsconfigPath: 'tsconfig.json',
    });

    const firstSnapshot = await provider.snapshot({ workspaceId: 'workspace-a', rootDir });
    const secondSnapshot = await provider.snapshot({ workspaceId: 'workspace-a', rootDir });

    expect(firstSnapshot.snapshotId).toBe(secondSnapshot.snapshotId);
    expect(firstSnapshot.facts.map((fact) => fact.providerFactId)).toEqual(
      secondSnapshot.facts.map((fact) => fact.providerFactId)
    );
    expect(firstSnapshot.provenance.producerVersion).toBeUndefined();
    expect(firstSnapshot.provenance.typescriptCompatibilityTarget).toBeUndefined();

    const indexer = new ProviderProjectIndexer(provider, normalizer);
    const firstIndex = await indexer.index({ workspaceId: 'workspace-a', rootDir });
    const secondIndex = await indexer.index({ workspaceId: 'workspace-a', rootDir });
    expect(firstIndex.graph.fingerprint).toBe(secondIndex.graph.fingerprint);
  });

  test('keeps saved snapshot identity portable across router binary and config locations', async () => {
    const roots = [
      path.resolve('tmp/provider-portable-source'),
      path.resolve('tmp/provider-portable-pack'),
    ];
    const providers = roots.map(
      (rootDir, index) =>
        new TtscSemanticGraphProvider({
          source: {
            id: 'portable-router',
            async load(request) {
              return {
                rootDir: request.rootDir,
                tsconfigPath: path.join(request.rootDir, 'tsconfig.json'),
                nodes: [
                  {
                    id: 'src/index.ts#answer:variable',
                    kind: 'variable',
                    name: 'answer',
                    file: 'src/index.ts',
                  },
                ],
                edges: [],
                provenance: {
                  adapter: 'ttsc-graph-router-artifact',
                  producer: '@ttsc/graph',
                  producerVersion: '0.18.4',
                  compilerVersion: null,
                  producerBinary: path.join(rootDir, 'node_modules/.bin/ttscgraph'),
                  routerConfigPath: path.join(rootDir, 'router.config.json'),
                  routerFingerprint: `host-specific-cache-${index}`,
                },
              };
            },
          },
          providerVersion: '1.0.0',
          providerInstanceId: 'ttsc-graph-router:portable',
          graphNamespace: 'ttsc:portable',
          typescript: {
            tsconfigPath: path.join(rootDir, 'tsconfig.json'),
            routerConfigPath: path.join(rootDir, 'router.config.json'),
            routerRepoId: 'portable',
          },
        })
    );

    const snapshots = await Promise.all(
      providers.map((provider, index) =>
        provider.snapshot({ workspaceId: 'portable-workspace', rootDir: roots[index] })
      )
    );

    expect(snapshots[0].snapshotId).toBe(snapshots[1].snapshotId);
    expect(snapshots[0].provenance.providerConfigDigest).toBe(
      snapshots[1].provenance.providerConfigDigest
    );
    expect(snapshots[0].provenance.producerFields?.producerBinary).not.toBe(
      snapshots[1].provenance.producerFields?.producerBinary
    );
  });

  test('pins a defensive snapshot copy and rejects request scope mismatches', async () => {
    const rootDir = path.resolve('tmp/provider-project-indexer-boundary');
    const mutableSnapshot = JSON.parse(JSON.stringify(snapshotFixture())) as ProviderSnapshot;
    const provider: SemanticGraphProvider = {
      identity: () => mutableSnapshot.identity,
      capabilities: () => mutableSnapshot.capabilities,
      provenance: () => mutableSnapshot.provenance,
      snapshot: async () => mutableSnapshot,
    };
    const indexer = new ProviderProjectIndexer(
      provider,
      new ProviderSnapshotNormalizer({
        rootDir,
        compatibilityTsconfigPath: 'tsconfig.json',
      })
    );

    await expect(
      indexer.index({
        workspaceId: mutableSnapshot.workspaceId,
        rootDir: path.resolve(rootDir, 'other-root'),
      })
    ).rejects.toThrow('ProviderProjectIndexer root mismatch');
    await expect(indexer.index({ workspaceId: 'other-workspace', rootDir })).rejects.toThrow(
      'Provider snapshot workspace mismatch'
    );

    const indexed = await indexer.index({ workspaceId: mutableSnapshot.workspaceId, rootDir });
    (mutableSnapshot.nodes[0] as { name?: string }).name = 'mutated-after-index';

    expect(indexed.providerSnapshot.nodes[0].name).toBe('A');
    expect(Object.isFrozen(indexed.providerSnapshot)).toBe(true);
    expect(Object.isFrozen(indexed.providerSnapshot.nodes[0])).toBe(true);
  });
});
