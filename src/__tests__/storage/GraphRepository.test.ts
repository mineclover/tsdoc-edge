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
      expect(() => reader.replaceActiveRevision(graph)).toThrow('read-only repository');
    } finally {
      reader.close();
    }

    expect(readSchema(databasePath)).toEqual(schemaBefore);
    expect(fs.statSync(databasePath).mtimeMs).toBe(modifiedBefore);
    expect(sidecars.map(sidecarState)).toEqual(sidecarsBefore);
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

  it('reads an early schema-v1 volatile revision id and migrates it on replacement', async () => {
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
    database.pragma('foreign_keys = OFF');
    database.transaction(() => {
      database
        .prepare('UPDATE canonical_graph_state SET active_revision_id = ?')
        .run(legacyRevisionId);
      database.prepare('UPDATE canonical_graph_nodes SET revision_id = ?').run(legacyRevisionId);
      database.prepare('UPDATE canonical_graph_edges SET revision_id = ?').run(legacyRevisionId);
      database
        .prepare('UPDATE canonical_graph_revisions SET revision_id = ?')
        .run(legacyRevisionId);
    })();
    database.close();

    repository = new GraphRepository(databasePath);
    expect(repository.readActiveRevision()?.metadata.revisionId).toBe(legacyRevisionId);
    const migrated = repository.replaceActiveRevision(graph, {
      expectedActiveRevisionId: legacyRevisionId,
    });
    expect(migrated.revisionId).toBe(stable.revisionId);
  });

  it('reconciles rename and delete by fully replacing nodes and incident edges', async () => {
    repository.replaceActiveRevision(await projectGraph());
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

    expect(counts).toEqual({ revisions: 1, nodes: 1, edges: 0 });
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
    return (await new ProjectIndexer({ id: 'fixture', load: async () => input }).index({
      rootDir: tempDir,
      tsconfigPath: 'tsconfig.ttsc.json',
    })).graph;
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
