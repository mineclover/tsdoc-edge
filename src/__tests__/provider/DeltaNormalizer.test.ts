import { createHash } from 'node:crypto';
import * as path from 'node:path';
import type { ProjectGraphInput, ProjectGraphSource } from '../../indexer/contracts';
import { ProjectIndexer } from '../../indexer/ProjectIndexer';
import { applyGraphDelta } from '../../lsp/overlay/GraphDelta';
import type { ProviderDelta } from '../../provider/contracts';
import { DeltaNormalizer } from '../../provider/DeltaNormalizer';
import { ProviderSnapshotNormalizer } from '../../provider/ProviderSnapshotNormalizer';
import { snapshotFixture } from './fixtures';

const rootDir = path.resolve('tmp/provider-normalizer-fixture');

describe('DeltaNormalizer', () => {
  test('normalizes an explicit provider rename and preserves cross-file topology', async () => {
    const snapshot = snapshotFixture();
    const snapshotNormalizer = createSnapshotNormalizer();
    const baseNormalized = snapshotNormalizer.normalize(snapshot);
    const baseGraph = await assemble(baseNormalized.projectInput);
    const normalizer = new DeltaNormalizer(snapshotNormalizer);
    const delta = {
      ...deltaFixture(),
      documentPath: path.resolve(rootDir, 'src/a.ts'),
    };

    const result = await normalizer.normalize({
      baseSnapshot: snapshot,
      baseRevision: { revisionId: 'revision:base', graph: baseGraph },
      delta,
    });

    expect(result.state).toBe('dirty');
    expect(result.graphDelta?.extractor.relationshipCoverage).toBe('owned-outgoing-complete');
    expect(result.graphDelta?.identityRemap).toHaveLength(1);
    expect(result.facts?.remove).toHaveLength(2);
    expect(result.facts?.upsert).toHaveLength(2);
    expect(result.topology?.remove).toHaveLength(1);
    expect(result.topology?.upsert).toHaveLength(1);
    expect(result.graphDelta?.nodes.remove).toContain(
      baseNormalized.providerNodeIdToCanonicalId.n1
    );
    const effective = applyGraphDelta(
      { revisionId: 'revision:base', graph: baseGraph },
      result.graphDelta!
    );
    const renamed = effective.graph.nodes.find((node) => node.providerNodeId === 'n1');
    expect(renamed?.qualifiedName).toBe('A2');
    expect(effective.graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'calls',
          from: renamed?.id,
          to: baseNormalized.providerNodeIdToCanonicalId.n2,
          occurrenceCount: 2,
        }),
      ])
    );
  });

  test('returns rebase-required without constructing a GraphDelta for a stale snapshot', async () => {
    const snapshot = snapshotFixture();
    const snapshotNormalizer = createSnapshotNormalizer();
    const baseGraph = await assemble(snapshotNormalizer.normalize(snapshot).projectInput);
    const result = await new DeltaNormalizer(snapshotNormalizer).normalize({
      baseSnapshot: snapshot,
      baseRevision: { revisionId: 'revision:base', graph: baseGraph },
      delta: { ...deltaFixture(), baseSnapshotId: 'snapshot:stale' },
    });
    expect(result.state).toBe('rebase-required');
    expect(result.graphDelta).toBeUndefined();
  });

  test('requires whole-project fallback when a one-document delta changes another owner', async () => {
    const snapshot = snapshotFixture();
    const snapshotNormalizer = createSnapshotNormalizer();
    const baseGraph = await assemble(snapshotNormalizer.normalize(snapshot).projectInput);
    const delta = deltaFixture();
    const result = await new DeltaNormalizer(snapshotNormalizer).normalize({
      baseSnapshot: snapshot,
      baseRevision: { revisionId: 'revision:base', graph: baseGraph },
      delta: {
        ...delta,
        changes: [
          {
            type: 'node-upsert',
            node: {
              ...snapshot.nodes[1],
              qualifiedName: 'B2',
            },
          },
        ],
      },
    });
    expect(result.state).toBe('fallback-required');
    expect(result.reason).toContain('another document');
  });

  test('requires whole-project fallback when an upsert moves an owner from another document', async () => {
    const snapshot = snapshotFixture();
    const snapshotNormalizer = createSnapshotNormalizer();
    const baseGraph = await assemble(snapshotNormalizer.normalize(snapshot).projectInput);
    const result = await new DeltaNormalizer(snapshotNormalizer).normalize({
      baseSnapshot: snapshot,
      baseRevision: { revisionId: 'revision:base', graph: baseGraph },
      delta: {
        ...deltaFixture(),
        documentPath: 'src/b.ts',
        changes: [
          {
            type: 'node-upsert',
            node: { ...snapshot.nodes[0], file: 'src/b.ts', evidence: { file: 'src/b.ts' } },
          },
        ],
      },
    });

    expect(result.state).toBe('fallback-required');
    expect(result.reason).toContain('owner from another document');
  });

  test('requires rebase when the canonical base envelope uses another root or tsconfig', async () => {
    const snapshot = snapshotFixture();
    const snapshotNormalizer = createSnapshotNormalizer();
    const baseGraph = await assemble(snapshotNormalizer.normalize(snapshot).projectInput);
    const normalizer = new DeltaNormalizer(snapshotNormalizer);

    const rootMismatch = await normalizer.normalize({
      baseSnapshot: snapshot,
      baseRevision: {
        revisionId: 'revision:other-root',
        graph: { ...baseGraph, rootDir: path.resolve(rootDir, 'other-root') },
      },
      delta: deltaFixture(),
    });
    const tsconfigMismatch = await normalizer.normalize({
      baseSnapshot: snapshot,
      baseRevision: {
        revisionId: 'revision:other-tsconfig',
        graph: { ...baseGraph, tsconfigPath: path.resolve(rootDir, 'other.tsconfig.json') },
      },
      delta: deltaFixture(),
    });

    expect(rootMismatch.state).toBe('rebase-required');
    expect(rootMismatch.reason).toContain('base revision root mismatch');
    expect(tsconfigMismatch.state).toBe('rebase-required');
    expect(tsconfigMismatch.reason).toContain('base revision tsconfig mismatch');
  });

  test('retains other-file diagnostics while projecting only dirty-file diagnostics', async () => {
    const base = snapshotFixture();
    const snapshot = {
      ...base,
      diagnostics: [
        ...base.diagnostics,
        {
          providerDiagnosticId: 'diagnostic:b:saved',
          severity: 'error' as const,
          message: 'saved diagnostic in b',
          evidence: { file: 'src/b.ts', startLine: 4 },
        },
      ],
    };
    const snapshotNormalizer = createSnapshotNormalizer();
    const baseGraph = await assemble(snapshotNormalizer.normalize(snapshot).projectInput);
    const result = await new DeltaNormalizer(snapshotNormalizer).normalize({
      baseSnapshot: snapshot,
      baseRevision: { revisionId: 'revision:base', graph: baseGraph },
      delta: {
        ...deltaFixture(),
        diagnostics: [
          {
            providerDiagnosticId: 'diagnostic:a:dirty',
            severity: 'warning',
            message: 'dirty diagnostic in a',
            evidence: { file: 'src/a.ts', startLine: 5 },
          },
        ],
      },
    });

    expect(result.state).toBe('dirty');
    expect(result.diagnostics.map((diagnostic) => diagnostic.id).sort()).toEqual([
      'diagnostic:a:dirty',
      'diagnostic:b:saved',
    ]);
    expect(result.graphDelta?.diagnostics?.map((diagnostic) => diagnostic.id)).toEqual([
      'diagnostic:a:dirty',
    ]);
  });

  test('does not churn retained fact or topology identities for a no-op document delta', async () => {
    const snapshot = snapshotFixture();
    const snapshotNormalizer = createSnapshotNormalizer();
    const baseGraph = await assemble(snapshotNormalizer.normalize(snapshot).projectInput);
    const result = await new DeltaNormalizer(snapshotNormalizer).normalize({
      baseSnapshot: snapshot,
      baseRevision: { revisionId: 'revision:base', graph: baseGraph },
      delta: {
        ...deltaFixture(),
        deltaId: 'provider-delta:no-op',
        changes: [],
        diagnostics: snapshot.diagnostics,
      },
    });

    expect(result.state).toBe('dirty');
    expect(result.facts).toEqual({ upsert: [], remove: [] });
    expect(result.topology).toEqual({ upsert: [], remove: [] });
    expect(result.graphDelta?.nodes).toEqual({ upsert: [], remove: [] });
    expect(result.graphDelta?.edges).toEqual({ upsert: [], remove: [] });
  });
});

function createSnapshotNormalizer(): ProviderSnapshotNormalizer {
  return new ProviderSnapshotNormalizer({
    rootDir,
    compatibilityTsconfigPath: 'tsconfig.json',
  });
}

function deltaFixture(): ProviderDelta {
  const snapshot = snapshotFixture();
  return {
    contractId: snapshot.contractId,
    contractVersion: snapshot.contractVersion,
    deltaId: 'provider-delta:rename-a',
    baseSnapshotId: snapshot.snapshotId,
    workspaceId: snapshot.workspaceId,
    graphNamespace: snapshot.graphNamespace,
    identity: snapshot.identity,
    documentPath: 'src/a.ts',
    contentDigest: createHash('sha256').update('function A2() {}').digest('hex'),
    capabilities: snapshot.capabilities,
    changes: [
      {
        type: 'node-upsert',
        node: {
          ...snapshot.nodes[0],
          name: 'A2',
          qualifiedName: 'A2',
        },
      },
      {
        type: 'identity-remap',
        previousProviderNodeId: 'n1',
        nextProviderNodeId: 'n1',
        reason: 'rename',
      },
    ],
    diagnostics: [],
  };
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
