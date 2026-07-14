import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Worker } from 'node:worker_threads';
import Database from 'better-sqlite3';
import type { CanonicalProjectGraph, ProjectGraphInput } from '../../indexer';
import { ProjectIndexer } from '../../indexer';
import {
  CANONICAL_GRAPH_ARTIFACT_NAME,
  CANONICAL_GRAPH_FINGERPRINT_ALGORITHM,
  GraphRepository,
  GraphRepositoryConflictError,
} from '../../storage/GraphRepository';

describe('GraphRepository', () => {
  let tempDir: string;
  let databasePath: string;
  let repository: GraphRepository;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-edge-graph-repository-'))
    );
    databasePath = path.join(tempDir, 'canonical-graph.db');
    repository = new GraphRepository(databasePath, {
      clock: () => new Date('2026-07-11T00:00:00.000Z'),
    });
  });

  afterEach(() => {
    repository.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('starts empty and creates no legacy symbol or relationship tables', () => {
    expect(repository.readActiveRevision()).toBeNull();
    expect(repository.readRevision('missing-revision')).toBeNull();

    const database = new Database(databasePath, { readonly: true });
    const legacy = database
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type = 'table' AND name IN ('symbols', 'dependencies', 'unified_relationships')`
      )
      .all();
    database.close();

    expect(legacy).toEqual([]);
  });

  it('requires an existing database file in read-only mode without creating directories', () => {
    const missingDirectory = path.join(tempDir, 'missing', 'nested');
    const missingDatabase = path.join(missingDirectory, 'canonical-graph.db');

    expect(() => new GraphRepository(missingDatabase, { readOnly: true })).toThrow();
    expect(fs.existsSync(missingDatabase)).toBe(false);
    expect(fs.existsSync(missingDirectory)).toBe(false);
  });

  it('reads an existing revision without schema or main database mutations', async () => {
    const graph = await projectGraph();
    repository.replaceActiveRevision(graph);
    repository.close();

    const schemaBefore = readSchema(databasePath);
    const modifiedBefore = fs.statSync(databasePath).mtimeMs;
    const sidecars = [`${databasePath}-wal`, `${databasePath}-shm`, `${databasePath}-journal`];
    const sidecarsBefore = sidecars.map(sidecarState);

    const reader = new GraphRepository(databasePath, { readOnly: true });
    try {
      expect(reader.readActiveGraph()).toEqual(graph);
      const activeRevisionId = reader.readActiveRevision()?.metadata.revisionId;
      expect(activeRevisionId).toBeDefined();
      expect(reader.readRevision(activeRevisionId!)?.graph).toEqual(graph);
      expect(() => reader.replaceActiveRevision(graph)).toThrow('read-only repository');
    } finally {
      reader.close();
    }

    expect(readSchema(databasePath)).toEqual(schemaBefore);
    expect(fs.statSync(databasePath).mtimeMs).toBe(modifiedBefore);
    expect(sidecars.map(sidecarState)).toEqual(sidecarsBefore);
  });

  it('lists retained revision metadata with an explicit active marker', async () => {
    const firstGraph = await projectGraph();
    const first = repository.replaceActiveRevision(firstGraph);
    const secondGraph = await projectGraph({
      nodes: [{ id: 'src/c.ts#C:class', kind: 'class', name: 'C', file: 'src/c.ts' }],
      edges: [],
    });
    const second = repository.replaceActiveRevision(secondGraph);

    const summaries = repository.listRevisionSummaries();

    expect(summaries.map((summary) => summary.revisionId)).toEqual([
      second.revisionId,
      first.revisionId,
    ]);
    expect(summaries.map((summary) => summary.active)).toEqual([true, false]);
    expect(summaries[0]).toMatchObject({
      contentFingerprint: secondGraph.fingerprint,
      nodeCount: 1,
      edgeCount: 0,
      rootDir: tempDir,
    });
    expect(Object.isFrozen(summaries)).toBe(true);
    expect(Object.isFrozen(summaries[0])).toBe(true);
  });

  it('atomically stores and reads a complete active revision with its envelope', async () => {
    const graph = await projectGraph();
    const written = repository.replaceActiveRevision(graph);
    const active = repository.readActiveRevision();

    expect(active?.graph).toEqual(graph);
    expect(active?.metadata).toEqual(written);
    expect(active?.metadata).toMatchObject({
      contentFingerprint: graph.fingerprint,
      rootDir: tempDir,
      tsconfigPath: path.join(tempDir, 'tsconfig.ttsc.json'),
      provenance: {
        adapter: 'fixture-adapter',
        producer: '@ttsc/graph',
        producerVersion: '0.16.8',
      },
      nodeCount: 2,
      edgeCount: 1,
      storedAt: '2026-07-11T00:00:00.000Z',
      artifactContract: {
        name: CANONICAL_GRAPH_ARTIFACT_NAME,
        contractVersion: '1.0',
        fingerprintAlgorithm: CANONICAL_GRAPH_FINGERPRINT_ALGORITHM,
        identityScheme: '@ttsc/graph:path#qualifiedName:kind',
        repositorySchemaVersion: 2,
      },
    });
    expect(Object.isFrozen(active?.graph)).toBe(true);
    expect(Object.isFrozen(active?.metadata.provenance)).toBe(true);
  });

  it('uses deterministic content and envelope revision ids for repeated snapshots', async () => {
    const graph = await projectGraph({
      provenance: {
        adapter: 'fixture-adapter',
        producer: '@ttsc/graph',
        producerVersion: '0.16.8',
        artifactContractId: '@ttsc-ex/ttsc-graph-router/raw-graph-artifact',
        artifactContractVersion: '1.0.0',
        artifactSchema: '@ttsc/graph/ITtscGraphDump',
        artifactFactPlane: 'raw',
        routerName: '@ttsc-ex/ttsc-graph-router',
        routerVersion: '0.1.0',
        refreshedAt: '2026-07-11T00:00:00.000Z',
        refreshed: true,
        refreshRequested: true,
        routerFingerprint: 'cache-a',
        routerConfigPath: '/machine-a/router.json',
        producerBinary: '/machine-a/ttscgraph',
        producerBinaryVersion: 'ttscgraph 0.16.8 (machine-a)',
        artifactDrift: { baseline: 'a' },
      },
    });
    const first = repository.replaceActiveRevision(graph);
    const operationalRefresh = await projectGraph({
      provenance: {
        ...graph.provenance,
        refreshedAt: '2026-07-11T01:00:00.000Z',
        refreshed: false,
        refreshRequested: false,
        routerFingerprint: 'cache-b',
        routerConfigPath: '/machine-b/router.json',
        producerBinary: '/machine-b/ttscgraph',
        producerBinaryVersion: 'ttscgraph 0.16.8 (machine-b)',
        artifactDrift: { baseline: 'b' },
      },
    });
    const second = repository.replaceActiveRevision(operationalRefresh);

    expect(second.revisionId).toBe(first.revisionId);
    expect(second.contentFingerprint).toBe(first.contentFingerprint);
    expect(repository.readActiveGraph()).toEqual(operationalRefresh);
    expect(repository.readActiveRevision()?.metadata.provenance).toMatchObject({
      refreshedAt: '2026-07-11T01:00:00.000Z',
      routerFingerprint: 'cache-b',
      routerConfigPath: '/machine-b/router.json',
      producerBinary: '/machine-b/ttscgraph',
      artifactDrift: { baseline: 'b' },
    });

    const changedProvenance = await projectGraph({
      provenance: {
        ...operationalRefresh.provenance,
        producerVersion: '0.16.9',
      },
    });
    const third = repository.replaceActiveRevision(changedProvenance);
    expect(third.contentFingerprint).toBe(first.contentFingerprint);
    expect(third.revisionId).not.toBe(first.revisionId);
  });

  it('reads an early volatile revision id and migrates it on replacement', async () => {
    const graph = await projectGraph({
      provenance: {
        adapter: 'fixture-adapter',
        producer: '@ttsc/graph',
        producerVersion: '0.16.8',
        refreshedAt: '2026-07-11T00:00:00.000Z',
        routerFingerprint: 'legacy-cache-fingerprint',
      },
    });
    const stable = repository.replaceActiveRevision(graph);
    const legacyRevisionId = legacyRevisionIdForTest(graph);
    expect(legacyRevisionId).not.toBe(stable.revisionId);
    repository.close();

    const database = new Database(databasePath);
    rewriteActiveRevisionId(database, legacyRevisionId);
    insertUntrustedPlanes(database, legacyRevisionId, graph.nodes[0].id, 'volatile');
    database.close();

    repository = new GraphRepository(databasePath);
    const legacyActive = repository.readActiveRevision();
    expect(legacyActive?.metadata.revisionId).toBe(legacyRevisionId);
    expect(legacyActive?.aliases).toEqual([]);
    expect(legacyActive?.diagnostics).toEqual([]);
    const migrated = repository.replaceActiveRevision(graph, {
      expectedActiveRevisionId: legacyRevisionId,
    });
    expect(migrated.revisionId).toBe(stable.revisionId);
  });

  it('includes provider identity, compiler reporting, and config digest in revision identity', async () => {
    const graph = await projectGraph({
      provenance: {
        adapter: 'tsdoc-edge/provider-snapshot-normalizer',
        producer: '@ttsc/graph',
        producerVersion: '0.16.8',
        providerId: 'tsdoc-edge/ttsc-graph-router',
        providerVersion: '1.0.0',
        providerInstanceId: 'workspace-a/ts7',
        providerContractId: 'tsdoc-edge/semantic-graph-provider',
        providerContractVersion: '1.0',
        providerCapabilityDigest: 'capabilities:a',
        providerConfigDigest: 'config:a',
        workspaceId: 'workspace-a',
        graphNamespace: 'ts7',
        canonicalNormalizerId: 'tsdoc-edge/provider-snapshot-normalizer',
        canonicalNormalizerVersion: '1.0',
        compilerVersion: null,
        compilerVersionReported: false,
      },
    });
    const first = repository.replaceActiveRevision(graph);
    const changed = await projectGraph({
      provenance: {
        ...graph.provenance,
        providerVersion: '1.1.0',
        providerConfigDigest: 'config:b',
        compilerVersion: '7.0.2',
        compilerVersionReported: true,
      },
    });
    const second = repository.replaceActiveRevision(changed);

    expect(second.contentFingerprint).toBe(first.contentFingerprint);
    expect(second.revisionId).not.toBe(first.revisionId);
  });

  it('includes producer and router derived revisions without mutating retained inputs', async () => {
    const graph = await projectGraph({
      provenance: {
        adapter: 'tsdoc-edge/provider-snapshot-normalizer',
        producer: '@ttsc/graph',
        producerVersion: '0.16.8',
        producerDerivedRevisionId: 'producer-derived:a',
        routerDerivedRevisionId: 'router-derived:a',
      },
    });
    const first = repository.replaceActiveRevision(graph);
    const changed = await projectGraph({
      provenance: {
        ...graph.provenance,
        producerDerivedRevisionId: 'producer-derived:b',
        routerDerivedRevisionId: 'router-derived:b',
      },
    });
    const second = repository.replaceActiveRevision(changed);

    expect(second.contentFingerprint).toBe(first.contentFingerprint);
    expect(second.revisionId).not.toBe(first.revisionId);
    expect(repository.readRevision(first.revisionId)?.graph.provenance).toMatchObject({
      producerDerivedRevisionId: 'producer-derived:a',
      routerDerivedRevisionId: 'router-derived:a',
    });
    expect(repository.readRevision(second.revisionId)?.graph.provenance).toMatchObject({
      producerDerivedRevisionId: 'producer-derived:b',
      routerDerivedRevisionId: 'router-derived:b',
    });
  });

  it('reads a pre-derived-identity revision and promotes it on replacement', async () => {
    const graph = await projectGraph({
      provenance: {
        adapter: 'tsdoc-edge/provider-snapshot-normalizer',
        producer: '@ttsc/graph',
        producerVersion: '0.16.8',
        producerDerivedRevisionId: 'producer-derived:legacy',
        routerDerivedRevisionId: 'router-derived:legacy',
      },
    });
    const current = repository.replaceActiveRevision(graph);
    const legacyRevisionId = preDerivedRevisionIdForTest(graph);
    expect(legacyRevisionId).not.toBe(current.revisionId);
    repository.close();

    const database = new Database(databasePath);
    rewriteActiveRevisionId(database, legacyRevisionId);
    database.close();

    repository = new GraphRepository(databasePath);
    const legacy = repository.readActiveRevision();
    expect(legacy).toMatchObject({
      metadata: { revisionId: legacyRevisionId },
    });
    expect(legacy?.graph.provenance.producerDerivedRevisionId).toBeUndefined();
    expect(legacy?.graph.provenance.routerDerivedRevisionId).toBeUndefined();
    const promoted = repository.replaceActiveRevision(graph, {
      expectedActiveRevisionId: legacyRevisionId,
    });
    expect(promoted.revisionId).toBe(current.revisionId);
  });

  it('ignores additive planes on a schema-v2 graph-only envelope before CAS promotion', async () => {
    const graph = await projectGraph({
      provenance: {
        adapter: 'fixture-adapter',
        producer: '@ttsc/graph',
        producerVersion: '0.16.8',
        refreshedAt: '2026-07-11T00:00:00.000Z',
        routerFingerprint: 'operational-cache-only',
      },
    });
    const stable = repository.replaceActiveRevision(graph);
    const graphOnlyRevisionId = graphOnlyRevisionIdForTest(graph);
    expect(graphOnlyRevisionId).not.toBe(stable.revisionId);
    repository.close();

    const database = new Database(databasePath);
    rewriteActiveRevisionId(database, graphOnlyRevisionId);
    insertUntrustedPlanes(database, graphOnlyRevisionId, graph.nodes[0].id, 'graph-only');
    database.close();

    repository = new GraphRepository(databasePath);
    const historical = repository.readActiveRevision();
    expect(historical?.metadata.revisionId).toBe(graphOnlyRevisionId);
    expect(historical?.aliases).toEqual([]);
    expect(historical?.diagnostics).toEqual([]);

    const migrated = repository.replaceActiveRevision(graph, {
      expectedActiveRevisionId: graphOnlyRevisionId,
    });
    expect(migrated.revisionId).toBe(stable.revisionId);
  });

  it('opens a real schema-v1 database read-only and promotes it transactionally to v2', async () => {
    const graph = await projectGraph({
      provenance: {
        adapter: 'fixture-adapter',
        producer: '@ttsc/graph',
        producerVersion: '0.16.8',
        refreshedAt: '2026-07-11T00:00:00.000Z',
      },
    });
    repository.close();
    fs.rmSync(databasePath, { force: true });
    const legacyRevisionId = createSchemaV1Repository(databasePath, graph);

    const schemaBefore = readSchema(databasePath);
    const reader = new GraphRepository(databasePath, { readOnly: true });
    try {
      const active = reader.readActiveRevision();
      expect(active?.metadata.revisionId).toBe(legacyRevisionId);
      expect(active?.metadata.artifactContract.repositorySchemaVersion).toBe(1);
      expect(active?.graph).toEqual(graph);
      expect(active?.aliases).toEqual([]);
      expect(active?.diagnostics).toEqual([]);
    } finally {
      reader.close();
    }
    expect(readSchema(databasePath)).toEqual(schemaBefore);

    repository = new GraphRepository(databasePath, {
      clock: () => new Date('2026-07-11T01:00:00.000Z'),
    });
    const forgedAlias = {
      canonicalId: graph.nodes[0].id,
      legacyId: 'forged-schema-v1-alias',
      matchStrategy: 'legacy-projection',
      confidence: 1,
      filePath: 'src/forged.ts',
    } as const;
    const forgedDiagnostic = {
      id: 'forged-schema-v1-diagnostic',
      category: 'router',
      severity: 'error',
      message: 'must not cross a schema-v1 envelope',
      startLine: 1,
    } as const;
    const forgedDatabase = new Database(databasePath);
    forgedDatabase
      .prepare(
        `INSERT INTO canonical_symbol_aliases
          (revision_id, canonical_id, legacy_id, match_strategy, confidence, payload_json)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        legacyRevisionId,
        forgedAlias.canonicalId,
        forgedAlias.legacyId,
        forgedAlias.matchStrategy,
        forgedAlias.confidence,
        JSON.stringify(forgedAlias)
      );
    forgedDatabase
      .prepare(
        `INSERT INTO canonical_graph_diagnostics
          (revision_id, ordinal, diagnostic_id, severity, category, file_path, payload_json)
         VALUES (?, 0, ?, ?, ?, NULL, ?)`
      )
      .run(
        legacyRevisionId,
        forgedDiagnostic.id,
        forgedDiagnostic.severity,
        forgedDiagnostic.category,
        JSON.stringify(forgedDiagnostic)
      );
    forgedDatabase.close();

    const legacyActive = repository.readActiveRevision();
    expect(legacyActive?.metadata.revisionId).toBe(legacyRevisionId);
    expect(legacyActive?.aliases).toEqual([]);
    expect(legacyActive?.diagnostics).toEqual([]);

    const validAlias = {
      canonicalId: graph.nodes[0].id,
      legacyId: 'a-class-a',
      matchStrategy: 'legacy-projection',
      confidence: 1,
      filePath: 'src/a.ts',
    } as const;
    const validDiagnostic = {
      id: 'schema-v2-diagnostic',
      category: 'router',
      severity: 'warning',
      message: 'trusted after schema-v2 replacement',
      startLine: 1,
    } as const;

    const promoted = repository.replaceActiveRevision(graph, {
      expectedActiveRevisionId: legacyRevisionId,
      aliases: [validAlias],
      diagnostics: [validDiagnostic],
    });
    const active = repository.readActiveRevision();
    expect(promoted.revisionId).not.toBe(legacyRevisionId);
    expect(active?.metadata.artifactContract.repositorySchemaVersion).toBe(2);
    expect(active?.metadata.revisionId).toBe(promoted.revisionId);
    expect(active?.graph).toEqual(graph);
    expect(active?.aliases).toEqual([validAlias]);
    expect(active?.diagnostics).toEqual([validDiagnostic]);
    expect(canonicalTableNames(databasePath)).toEqual(
      expect.arrayContaining(['canonical_symbol_aliases', 'canonical_graph_diagnostics'])
    );
  });

  it('reconciles rename and delete in the active view while retaining history', async () => {
    const original = await projectGraph();
    const originalRevision = repository.replaceActiveRevision(original);
    const renamed = await projectGraph({
      nodes: [
        {
          id: 'src/renamed.ts#Renamed:class',
          kind: 'class',
          name: 'Renamed',
          file: 'src/renamed.ts',
        },
      ],
      edges: [],
    });

    repository.replaceActiveRevision(renamed);
    const active = repository.readActiveGraph();
    expect(active?.nodes.map((node) => node.id)).toEqual(['src/renamed.ts#Renamed:class']);
    expect(active?.edges).toEqual([]);
    expect(repository.readRevision(originalRevision.revisionId)?.graph).toEqual(original);

    const database = new Database(databasePath, { readonly: true });
    const counts = database
      .prepare(
        `SELECT
          (SELECT COUNT(*) FROM canonical_graph_revisions) AS revisions,
          (SELECT COUNT(*) FROM canonical_graph_nodes) AS nodes,
          (SELECT COUNT(*) FROM canonical_graph_edges) AS edges`
      )
      .get() as { revisions: number; nodes: number; edges: number };
    database.close();

    expect(counts).toEqual({ revisions: 2, nodes: 3, edges: 1 });
  });

  it('reactivates a deterministic historical revision idempotently', async () => {
    const original = await projectGraph();
    const first = repository.replaceActiveRevision(original);
    const changed = await projectGraph({
      nodes: [
        {
          id: 'src/changed.ts#Changed:class',
          kind: 'class',
          name: 'Changed',
          file: 'src/changed.ts',
        },
      ],
      edges: [],
    });
    const second = repository.replaceActiveRevision(changed, {
      expectedActiveRevisionId: first.revisionId,
    });

    repository.close();
    repository = new GraphRepository(databasePath, {
      clock: () => new Date('2026-07-11T02:00:00.000Z'),
    });

    const reactivated = repository.replaceActiveRevision(original, {
      expectedActiveRevisionId: second.revisionId,
    });
    const repeated = repository.replaceActiveRevision(original, {
      expectedActiveRevisionId: first.revisionId,
    });

    expect(reactivated).toEqual(first);
    expect(repeated).toEqual(first);
    expect(repository.readActiveRevision()?.metadata.revisionId).toBe(first.revisionId);
    expect(repository.readRevision(first.revisionId)?.graph).toEqual(original);
    expect(repository.readRevision(second.revisionId)?.graph).toEqual(changed);

    const database = new Database(databasePath, { readonly: true });
    const revisionCount = database
      .prepare('SELECT COUNT(*) AS count FROM canonical_graph_revisions')
      .get() as { count: number };
    database.close();
    expect(revisionCount.count).toBe(2);
  });

  it('rolls back a failed mid-revision insert and preserves the previous active graph', async () => {
    const original = await projectGraph();
    const originalMetadata = repository.replaceActiveRevision(original);
    const database = new Database(databasePath);
    database.exec(`
      CREATE TRIGGER force_graph_edge_failure
      BEFORE INSERT ON canonical_graph_edges
      WHEN NEW.kind = 'rollback-test'
      BEGIN
        SELECT RAISE(ABORT, 'forced graph revision failure');
      END;
    `);
    database.close();

    const failing = await projectGraph({
      edges: [
        {
          kind: 'rollback-test',
          from: 'src/a.ts#A:class',
          to: 'src/b.ts#B:class',
        },
      ],
    });

    expect(() => repository.replaceActiveRevision(failing)).toThrow(
      'forced graph revision failure'
    );
    const active = repository.readActiveRevision();
    expect(active?.metadata.revisionId).toBe(originalMetadata.revisionId);
    expect(active?.graph).toEqual(original);
  });

  it('rejects a forged content fingerprint before replacing the active revision', async () => {
    const original = await projectGraph();
    repository.replaceActiveRevision(original);
    const forged = { ...original, fingerprint: 'forged' } as CanonicalProjectGraph;

    expect(() => repository.replaceActiveRevision(forged)).toThrow(
      'Canonical graph fingerprint mismatch'
    );
    expect(repository.readActiveGraph()).toEqual(original);
  });

  it('rejects a stale compare-and-swap without replacing a concurrent revision', async () => {
    const first = repository.replaceActiveRevision(await projectGraph());
    const concurrent = new GraphRepository(databasePath);
    const concurrentGraph = await projectGraph({
      nodes: [
        {
          id: 'src/concurrent.ts#Concurrent:class',
          kind: 'class',
          name: 'Concurrent',
          file: 'src/concurrent.ts',
        },
      ],
      edges: [],
    });
    concurrent.replaceActiveRevision(concurrentGraph, {
      expectedActiveRevisionId: first.revisionId,
    });
    concurrent.close();

    const staleGraph = await projectGraph({
      nodes: [
        {
          id: 'src/stale.ts#Stale:class',
          kind: 'class',
          name: 'Stale',
          file: 'src/stale.ts',
        },
      ],
      edges: [],
    });
    expect(() =>
      repository.replaceActiveRevision(staleGraph, {
        expectedActiveRevisionId: first.revisionId,
      })
    ).toThrow(GraphRepositoryConflictError);
    expect(repository.readActiveGraph()).toEqual(concurrentGraph);
  });

  it('acquires the write reservation before checking CAS against a concurrent writer', async () => {
    const graph = await projectGraph();
    const first = repository.replaceActiveRevision(graph);
    const concurrentRevisionId = 'concurrent-worker-revision';
    const setup = new Database(databasePath);
    setup
      .prepare(
        `INSERT INTO canonical_graph_revisions (
          revision_id, content_fingerprint, contract_version, root_dir,
          tsconfig_path, provenance_json, artifact_contract_json,
          node_count, edge_count, stored_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`
      )
      .run(
        concurrentRevisionId,
        'concurrent-worker-fingerprint',
        '1.0',
        tempDir,
        path.join(tempDir, 'tsconfig.ttsc.json'),
        '{}',
        JSON.stringify({
          name: CANONICAL_GRAPH_ARTIFACT_NAME,
          contractVersion: '1.0',
          fingerprintAlgorithm: CANONICAL_GRAPH_FINGERPRINT_ALGORITHM,
          identityScheme: '@ttsc/graph:path#qualifiedName:kind',
          repositorySchemaVersion: 2,
        }),
        '2026-07-11T00:00:00.000Z'
      );
    setup.close();

    const worker = new Worker(
      `
        const { parentPort, workerData } = require('node:worker_threads');
        const Database = require(workerData.betterSqlite3Path);
        const database = new Database(workerData.databasePath);
        database.pragma('foreign_keys = ON');
        database.exec('BEGIN IMMEDIATE');
        database.prepare(
          'UPDATE canonical_graph_state SET active_revision_id = ? WHERE singleton = 1'
        ).run(workerData.concurrentRevisionId);
        parentPort.postMessage('ready');
        setTimeout(() => {
          database.exec('COMMIT');
          database.close();
        }, 100);
      `,
      {
        eval: true,
        workerData: {
          betterSqlite3Path: require.resolve('better-sqlite3'),
          databasePath,
          concurrentRevisionId,
        },
      }
    );
    const ready = new Promise<void>((resolve, reject) => {
      worker.once('message', (message) => {
        if (message === 'ready') resolve();
        else reject(new Error(`Unexpected worker message: ${String(message)}`));
      });
      worker.once('error', reject);
    });
    const exited = new Promise<number>((resolve, reject) => {
      worker.once('error', reject);
      worker.once('exit', resolve);
    });

    await ready;
    let conflict: unknown;
    try {
      repository.replaceActiveRevision(graph, {
        expectedActiveRevisionId: first.revisionId,
      });
    } catch (error) {
      conflict = error;
    }

    expect(conflict).toBeInstanceOf(GraphRepositoryConflictError);
    expect(conflict).toMatchObject({
      expectedActiveRevisionId: first.revisionId,
      actualActiveRevisionId: concurrentRevisionId,
    });
    expect(await exited).toBe(0);
  });

  async function projectGraph(
    overrides: Partial<ProjectGraphInput> = {}
  ): Promise<CanonicalProjectGraph> {
    const input: ProjectGraphInput = {
      rootDir: tempDir,
      tsconfigPath: path.join(tempDir, 'tsconfig.ttsc.json'),
      nodes: [
        { id: 'src/a.ts#A:class', kind: 'class', name: 'A', file: 'src/a.ts' },
        { id: 'src/b.ts#B:class', kind: 'class', name: 'B', file: 'src/b.ts' },
      ],
      edges: [
        {
          kind: 'calls',
          from: 'src/a.ts#A:class',
          to: 'src/b.ts#B:class',
          evidence: { file: 'src/a.ts', startLine: 3 },
        },
      ],
      provenance: {
        adapter: 'fixture-adapter',
        producer: '@ttsc/graph',
        producerVersion: '0.16.8',
      },
      ...overrides,
    };
    return (
      await new ProjectIndexer({ id: 'fixture', load: async () => input }).index({
        rootDir: tempDir,
        tsconfigPath: 'tsconfig.ttsc.json',
      })
    ).graph;
  }
});

function readSchema(
  databasePath: string
): Array<{ type: string; name: string; sql: string | null }> {
  const database = new Database(databasePath, { readonly: true, fileMustExist: true });
  try {
    return database
      .prepare(
        `SELECT type, name, sql FROM sqlite_master
         WHERE name LIKE 'canonical_graph_%'
         ORDER BY type, name`
      )
      .all() as Array<{ type: string; name: string; sql: string | null }>;
  } finally {
    database.close();
  }
}

function legacyRevisionIdForTest(graph: CanonicalProjectGraph): string {
  return createHash('sha256')
    .update(
      stableJsonForTest({
        artifactContract: {
          name: CANONICAL_GRAPH_ARTIFACT_NAME,
          contractVersion: '1.0',
          fingerprintAlgorithm: CANONICAL_GRAPH_FINGERPRINT_ALGORITHM,
          identityScheme: '@ttsc/graph:path#qualifiedName:kind',
          repositorySchemaVersion: 2,
        },
        contentFingerprint: graph.fingerprint,
        provenance: graph.provenance,
        rootDir: graph.rootDir,
        tsconfigPath: graph.tsconfigPath,
      })
    )
    .digest('hex');
}

function graphOnlyRevisionIdForTest(graph: CanonicalProjectGraph): string {
  const identityProvenance = preDerivedIdentityProvenanceForTest(graph);

  return createHash('sha256')
    .update(
      stableJsonForTest({
        artifactContract: {
          name: CANONICAL_GRAPH_ARTIFACT_NAME,
          contractVersion: '1.0',
          fingerprintAlgorithm: CANONICAL_GRAPH_FINGERPRINT_ALGORITHM,
          identityScheme: '@ttsc/graph:path#qualifiedName:kind',
          repositorySchemaVersion: 2,
        },
        contentFingerprint: graph.fingerprint,
        provenance: identityProvenance,
        rootDir: graph.rootDir,
        tsconfigPath: graph.tsconfigPath,
      })
    )
    .digest('hex');
}

function preDerivedRevisionIdForTest(graph: CanonicalProjectGraph): string {
  return createHash('sha256')
    .update(
      stableJsonForTest({
        aliases: [],
        artifactContract: {
          name: CANONICAL_GRAPH_ARTIFACT_NAME,
          contractVersion: '1.0',
          fingerprintAlgorithm: CANONICAL_GRAPH_FINGERPRINT_ALGORITHM,
          identityScheme: '@ttsc/graph:path#qualifiedName:kind',
          repositorySchemaVersion: 2,
        },
        contentFingerprint: graph.fingerprint,
        diagnostics: [],
        provenance: preDerivedIdentityProvenanceForTest(graph),
        rootDir: graph.rootDir,
        tsconfigPath: graph.tsconfigPath,
      })
    )
    .digest('hex');
}

function preDerivedIdentityProvenanceForTest(
  graph: CanonicalProjectGraph
): Record<string, unknown> {
  const identityProvenance: Record<string, unknown> = {};
  for (const key of [
    'adapter',
    'producer',
    'producerVersion',
    'artifactContractId',
    'artifactContractVersion',
    'artifactSchema',
    'artifactFactPlane',
    'artifactCapabilities',
    'routerName',
    'routerVersion',
    'providerId',
    'providerVersion',
    'providerInstanceId',
    'providerContractId',
    'providerContractVersion',
    'providerCapabilityDigest',
    'providerConfigDigest',
    'workspaceId',
    'graphNamespace',
    'canonicalNormalizerId',
    'canonicalNormalizerVersion',
    'compilerVersion',
    'compilerVersionReported',
    'typescriptCompatibilityTarget',
    'diagnosticsCollected',
  ] as const) {
    if (Object.getOwnPropertyDescriptor(graph.provenance, key) !== undefined) {
      identityProvenance[key] = graph.provenance[key];
    }
  }
  return identityProvenance;
}

function rewriteActiveRevisionId(database: Database.Database, revisionId: string): void {
  database.pragma('foreign_keys = OFF');
  database.transaction(() => {
    database.prepare('UPDATE canonical_graph_state SET active_revision_id = ?').run(revisionId);
    database.prepare('UPDATE canonical_graph_nodes SET revision_id = ?').run(revisionId);
    database.prepare('UPDATE canonical_graph_edges SET revision_id = ?').run(revisionId);
    database.prepare('UPDATE canonical_symbol_aliases SET revision_id = ?').run(revisionId);
    database.prepare('UPDATE canonical_graph_diagnostics SET revision_id = ?').run(revisionId);
    database.prepare('UPDATE canonical_graph_revisions SET revision_id = ?').run(revisionId);
  })();
}

function insertUntrustedPlanes(
  database: Database.Database,
  revisionId: string,
  canonicalId: string,
  suffix: string
): void {
  const alias = {
    canonicalId,
    legacyId: `untrusted-${suffix}-alias`,
    matchStrategy: 'legacy-projection',
    confidence: 1,
    filePath: `src/${suffix}.ts`,
  };
  database
    .prepare(
      `INSERT INTO canonical_symbol_aliases
        (revision_id, canonical_id, legacy_id, match_strategy, confidence, payload_json)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      revisionId,
      alias.canonicalId,
      alias.legacyId,
      alias.matchStrategy,
      alias.confidence,
      JSON.stringify(alias)
    );

  const diagnostic = {
    id: `untrusted-${suffix}-diagnostic`,
    category: 'router',
    severity: 'error',
    message: 'historical envelope must not authenticate this plane',
    startLine: 1,
  };
  database
    .prepare(
      `INSERT INTO canonical_graph_diagnostics
        (revision_id, ordinal, diagnostic_id, severity, category, file_path, payload_json)
       VALUES (?, 0, ?, ?, ?, NULL, ?)`
    )
    .run(
      revisionId,
      diagnostic.id,
      diagnostic.severity,
      diagnostic.category,
      JSON.stringify(diagnostic)
    );
}

function createSchemaV1Repository(databasePath: string, graph: CanonicalProjectGraph): string {
  const artifactContract = {
    name: CANONICAL_GRAPH_ARTIFACT_NAME,
    contractVersion: '1.0',
    fingerprintAlgorithm: CANONICAL_GRAPH_FINGERPRINT_ALGORITHM,
    identityScheme: '@ttsc/graph:path#qualifiedName:kind',
    repositorySchemaVersion: 1,
  } as const;
  const revisionId = createHash('sha256')
    .update(
      stableJsonForTest({
        artifactContract,
        contentFingerprint: graph.fingerprint,
        provenance: graph.provenance,
        rootDir: graph.rootDir,
        tsconfigPath: graph.tsconfigPath,
      })
    )
    .digest('hex');
  const database = new Database(databasePath);
  database.pragma('foreign_keys = ON');
  database.exec(`
    CREATE TABLE canonical_graph_revisions (
      revision_id TEXT PRIMARY KEY,
      content_fingerprint TEXT NOT NULL,
      contract_version TEXT NOT NULL,
      root_dir TEXT NOT NULL,
      tsconfig_path TEXT NOT NULL,
      provenance_json TEXT NOT NULL,
      artifact_contract_json TEXT NOT NULL,
      node_count INTEGER NOT NULL,
      edge_count INTEGER NOT NULL,
      stored_at TEXT NOT NULL
    );
    CREATE TABLE canonical_graph_nodes (
      revision_id TEXT NOT NULL,
      ordinal INTEGER NOT NULL,
      node_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      PRIMARY KEY (revision_id, node_id),
      UNIQUE (revision_id, ordinal),
      FOREIGN KEY (revision_id) REFERENCES canonical_graph_revisions(revision_id) ON DELETE CASCADE
    );
    CREATE TABLE canonical_graph_edges (
      revision_id TEXT NOT NULL,
      ordinal INTEGER NOT NULL,
      kind TEXT NOT NULL,
      from_node_id TEXT NOT NULL,
      to_node_id TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      PRIMARY KEY (revision_id, ordinal),
      UNIQUE (revision_id, kind, from_node_id, to_node_id),
      FOREIGN KEY (revision_id) REFERENCES canonical_graph_revisions(revision_id) ON DELETE CASCADE,
      FOREIGN KEY (revision_id, from_node_id) REFERENCES canonical_graph_nodes(revision_id, node_id),
      FOREIGN KEY (revision_id, to_node_id) REFERENCES canonical_graph_nodes(revision_id, node_id)
    );
    CREATE TABLE canonical_graph_state (
      singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
      active_revision_id TEXT NOT NULL,
      FOREIGN KEY (active_revision_id) REFERENCES canonical_graph_revisions(revision_id)
    );
  `);
  database.transaction(() => {
    database
      .prepare(
        `INSERT INTO canonical_graph_revisions (
          revision_id, content_fingerprint, contract_version, root_dir,
          tsconfig_path, provenance_json, artifact_contract_json,
          node_count, edge_count, stored_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        revisionId,
        graph.fingerprint,
        graph.contractVersion,
        graph.rootDir,
        graph.tsconfigPath,
        JSON.stringify(graph.provenance),
        JSON.stringify(artifactContract),
        graph.nodes.length,
        graph.edges.length,
        '2026-07-11T00:00:00.000Z'
      );
    const insertNode = database.prepare(
      `INSERT INTO canonical_graph_nodes
        (revision_id, ordinal, node_id, kind, payload_json)
       VALUES (?, ?, ?, ?, ?)`
    );
    graph.nodes.forEach((node, ordinal) =>
      insertNode.run(revisionId, ordinal, node.id, node.kind, JSON.stringify(node))
    );
    const insertEdge = database.prepare(
      `INSERT INTO canonical_graph_edges
        (revision_id, ordinal, kind, from_node_id, to_node_id, payload_json)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    graph.edges.forEach((edge, ordinal) =>
      insertEdge.run(revisionId, ordinal, edge.kind, edge.from, edge.to, JSON.stringify(edge))
    );
    database
      .prepare('INSERT INTO canonical_graph_state (singleton, active_revision_id) VALUES (1, ?)')
      .run(revisionId);
  })();
  database.close();
  return revisionId;
}

function canonicalTableNames(databasePath: string): string[] {
  const database = new Database(databasePath, { readonly: true, fileMustExist: true });
  try {
    return (
      database
        .prepare(
          `SELECT name FROM sqlite_master
           WHERE type = 'table' AND name LIKE 'canonical_%'
           ORDER BY name`
        )
        .all() as Array<{ name: string }>
    ).map((row) => row.name);
  } finally {
    database.close();
  }
}

function stableJsonForTest(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJsonForTest).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJsonForTest(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function sidecarState(filePath: string):
  | { exists: false }
  | {
      exists: true;
      size: number;
    } {
  if (!fs.existsSync(filePath)) return { exists: false };
  const stat = fs.statSync(filePath);
  return { exists: true, size: stat.size };
}
