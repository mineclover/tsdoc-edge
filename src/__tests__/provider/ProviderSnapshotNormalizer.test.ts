import * as path from 'node:path';
import type { ProjectGraphInput, ProjectGraphSource } from '../../indexer/contracts';
import { ProjectIndexer } from '../../indexer/ProjectIndexer';
import type { ProviderSnapshot } from '../../provider/contracts';
import { ProviderSnapshotNormalizer } from '../../provider/ProviderSnapshotNormalizer';
import { providerAnalysisIdentityFromGraph } from '../../semantic-graph';
import { snapshotFixture } from './fixtures';

const rootDir = path.resolve('tmp/provider-normalizer-fixture');

describe('ProviderSnapshotNormalizer', () => {
  test('allocates namespaced canonical ids and preserves repeated fact occurrences', async () => {
    const normalizer = createNormalizer();
    const normalized = normalizer.normalize(snapshotFixture());

    expect(normalized.providerNodeIdToCanonicalId.n1).toContain(
      '@workspace/workspace-a/graph/ts7/src/a.ts#A:function'
    );
    expect(normalized.projectInput.nodes[0]).toMatchObject({
      providerInstanceId: 'instance-a',
      providerNodeId: 'n1',
      graphNamespace: 'ts7',
    });
    expect(normalized.projectInput.edges).toHaveLength(1);
    expect(normalized.projectInput.edges[0]).toMatchObject({
      kind: 'calls',
      occurrenceCount: 2,
      compatibilityProjection: true,
    });
    expect(normalized.projectInput.edges[0].providerOccurrences).toHaveLength(2);
    expect(normalized.factOccurrences).toHaveLength(2);
    expect(normalized.topologyEdges).toHaveLength(1);
    expect(normalized.topologyEdges[0]).toMatchObject({
      plane: 'compiler-fact',
      occurrenceCount: 2,
      occurrenceIds: normalized.factOccurrences.map((fact) => fact.id).sort(),
    });
    expect(normalized.projectInput.diagnostics?.[0].relatedNodeIds).toEqual([
      normalized.providerNodeIdToCanonicalId.n1,
    ]);
    expect(normalized.projectInput.diagnostics?.[0].producerFields).toMatchObject({
      unknownRelatedProviderNodeIds: ['missing-node'],
    });
    expect(normalized.projectInput.provenance).toMatchObject({
      providerId: 'ttsc',
      providerVersion: '0.16.8',
      providerInstanceId: 'instance-a',
      compilerVersion: null,
      compilerVersionReported: false,
      typescriptCompatibilityTarget: '7.0',
      compatibilityTsconfigBridge: true,
    });

    const graph = await assemble(normalized.projectInput);
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges[0].providerOccurrences).toHaveLength(2);
    expect(providerAnalysisIdentityFromGraph(graph)).toMatchObject({
      providerId: 'ttsc',
      providerVersion: '0.16.8',
      providerInstanceId: 'instance-a',
      producer: '@ttsc/graph',
      compilerVersion: null,
      compilerVersionReported: false,
      workspaceId: 'workspace-a',
      graphNamespace: 'ts7',
    });
  });

  test('is order-independent and namespaces otherwise identical workspaces', () => {
    const normalizer = createNormalizer();
    const first = snapshotFixture();
    const reordered: ProviderSnapshot = {
      ...first,
      nodes: [...first.nodes].reverse(),
      facts: [...first.facts].reverse(),
    };
    expect(normalizer.normalize(reordered).snapshotDigest).toBe(
      normalizer.normalize(first).snapshotDigest
    );

    const secondWorkspace = normalizer.normalize({
      ...first,
      workspaceId: 'workspace-b',
    });
    expect(secondWorkspace.providerNodeIdToCanonicalId.n1).not.toBe(
      normalizer.normalize(first).providerNodeIdToCanonicalId.n1
    );
  });

  test('rejects contradictory compiler provenance and unknown fact endpoints', () => {
    const normalizer = createNormalizer();
    const base = snapshotFixture();
    expect(() =>
      normalizer.normalize({
        ...base,
        provenance: {
          ...base.provenance,
          compilerVersion: '7.0.0',
          compilerVersionReported: false,
        },
      })
    ).toThrow('compilerVersionReported');

    expect(() =>
      normalizer.normalize({
        ...base,
        facts: [
          {
            ...base.facts[0],
            toProviderNodeId: 'missing-node',
          },
        ],
      })
    ).toThrow('unknown endpoint');

    expect(() =>
      normalizer.normalize({
        ...base,
        facts: [{ ...base.facts[0], providerFactId: '' }],
      })
    ).toThrow('providerFactId');

    expect(() =>
      normalizer.normalize({
        ...base,
        capabilities: {
          ...base.capabilities,
          'fact-occurrences': { status: 'unsupported' },
        },
      })
    ).toThrow('fact-occurrences capability is unsupported');
  });

  test('rejects two provider ids that claim the same canonical semantic symbol', () => {
    const normalizer = createNormalizer();
    const base = snapshotFixture();

    expect(() =>
      normalizer.normalize({
        ...base,
        nodes: [
          base.nodes[0],
          {
            ...base.nodes[0],
            providerNodeId: 'n1-overload-declaration',
          },
        ],
        facts: [],
        diagnostics: [],
      })
    ).toThrow(
      'Canonical provider node identity collision: @workspace/workspace-a/graph/ts7/src/a.ts#A:function is emitted by n1 and n1-overload-declaration'
    );
  });
});

function createNormalizer(): ProviderSnapshotNormalizer {
  return new ProviderSnapshotNormalizer({
    rootDir,
    compatibilityTsconfigPath: 'tsconfig.json',
    expectedWorkspaceId: undefined,
  });
}

async function assemble(input: ProjectGraphInput) {
  const source: ProjectGraphSource = {
    id: 'test-provider-source',
    async load() {
      return input;
    },
  };
  return (
    await new ProjectIndexer(source).index({
      rootDir: input.rootDir,
      tsconfigPath: input.tsconfigPath,
    })
  ).graph;
}
