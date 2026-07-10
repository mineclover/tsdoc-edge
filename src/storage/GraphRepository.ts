/**
 * Isolated persistence for canonical project graph revisions.
 *
 * This repository deliberately does not read or write the legacy `symbols`,
 * `dependencies`, or `unified_relationships` tables.
 *
 * @packageDocumentation
 */

import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import {
  type CanonicalGraphEdge,
  type CanonicalGraphNode,
  type CanonicalProjectGraph,
  PROJECT_GRAPH_CONTRACT_VERSION,
  type ProjectGraphProvenance,
} from '../indexer/contracts';

export const GRAPH_REPOSITORY_SCHEMA_VERSION = 1 as const;
export const CANONICAL_GRAPH_ARTIFACT_NAME = 'tsdoc-edge/canonical-project-graph' as const;
export const CANONICAL_GRAPH_FINGERPRINT_ALGORITHM = 'sha256/canonical-json-v1' as const;

/**
 * Provenance fields that change the semantic identity of a graph revision.
 *
 * This is intentionally a whitelist. Operational fields such as refresh time,
 * cache fingerprints, local binary/config paths, and validator drift remain in
 * stored metadata but cannot make identical graph content a new revision.
 */
const REVISION_IDENTITY_PROVENANCE_KEYS = [
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
  'compilerVersion',
  'typescriptCompatibilityTarget',
  'diagnosticsCollected',
] as const;

/** Metadata describing the artifact contract stored with every revision. */
export interface CanonicalGraphArtifactContract {
  readonly name: typeof CANONICAL_GRAPH_ARTIFACT_NAME;
  readonly contractVersion: typeof PROJECT_GRAPH_CONTRACT_VERSION;
  readonly fingerprintAlgorithm: typeof CANONICAL_GRAPH_FINGERPRINT_ALGORITHM;
  readonly identityScheme: '@ttsc/graph:path#qualifiedName:kind';
  readonly repositorySchemaVersion: typeof GRAPH_REPOSITORY_SCHEMA_VERSION;
}

/** Durable metadata for one complete canonical graph revision. */
export interface CanonicalGraphRevisionMetadata {
  readonly revisionId: string;
  readonly contentFingerprint: string;
  readonly artifactContract: CanonicalGraphArtifactContract;
  readonly rootDir: string;
  readonly tsconfigPath: string;
  readonly provenance: Readonly<ProjectGraphProvenance>;
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly storedAt: string;
}

/** One transactionally consistent active revision read. */
export interface ActiveCanonicalGraphRevision {
  readonly metadata: CanonicalGraphRevisionMetadata;
  readonly graph: CanonicalProjectGraph;
}

export interface GraphRepositoryOptions {
  readonly clock?: () => Date;
  /** Open an existing database without schema initialization or graph writes. */
  readonly readOnly?: boolean;
}

/** Optional compare-and-swap guard for concurrent graph refreshes. */
export interface GraphRepositoryReplaceOptions {
  /**
   * Expected active revision at commit time. `null` means the repository must
   * still be empty; `undefined` disables the guard.
   */
  readonly expectedActiveRevisionId?: string | null;
}

/** Raised when another process committed a graph while a refresh was running. */
export class GraphRepositoryConflictError extends Error {
  constructor(
    readonly expectedActiveRevisionId: string | null,
    readonly actualActiveRevisionId: string | null
  ) {
    super(
      `Canonical graph revision changed concurrently: expected ${expectedActiveRevisionId ?? '<empty>'}, got ${actualActiveRevisionId ?? '<empty>'}`
    );
    this.name = 'GraphRepositoryConflictError';
  }
}

interface RevisionRow {
  revision_id: string;
  content_fingerprint: string;
  contract_version: string;
  root_dir: string;
  tsconfig_path: string;
  provenance_json: string;
  artifact_contract_json: string;
  node_count: number;
  edge_count: number;
  stored_at: string;
}

interface PayloadRow {
  payload_json: string;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS canonical_graph_revisions (
  revision_id TEXT PRIMARY KEY,
  content_fingerprint TEXT NOT NULL,
  contract_version TEXT NOT NULL,
  root_dir TEXT NOT NULL,
  tsconfig_path TEXT NOT NULL,
  provenance_json TEXT NOT NULL,
  artifact_contract_json TEXT NOT NULL,
  node_count INTEGER NOT NULL CHECK (node_count >= 0),
  edge_count INTEGER NOT NULL CHECK (edge_count >= 0),
  stored_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS canonical_graph_nodes (
  revision_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
  node_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  PRIMARY KEY (revision_id, node_id),
  UNIQUE (revision_id, ordinal),
  FOREIGN KEY (revision_id)
    REFERENCES canonical_graph_revisions(revision_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS canonical_graph_edges (
  revision_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
  kind TEXT NOT NULL,
  from_node_id TEXT NOT NULL,
  to_node_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  PRIMARY KEY (revision_id, ordinal),
  UNIQUE (revision_id, kind, from_node_id, to_node_id),
  FOREIGN KEY (revision_id)
    REFERENCES canonical_graph_revisions(revision_id) ON DELETE CASCADE,
  FOREIGN KEY (revision_id, from_node_id)
    REFERENCES canonical_graph_nodes(revision_id, node_id),
  FOREIGN KEY (revision_id, to_node_id)
    REFERENCES canonical_graph_nodes(revision_id, node_id)
);

CREATE TABLE IF NOT EXISTS canonical_graph_state (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  active_revision_id TEXT NOT NULL,
  FOREIGN KEY (active_revision_id)
    REFERENCES canonical_graph_revisions(revision_id)
);

CREATE INDEX IF NOT EXISTS idx_canonical_graph_nodes_kind
  ON canonical_graph_nodes(revision_id, kind);
CREATE INDEX IF NOT EXISTS idx_canonical_graph_edges_from
  ON canonical_graph_edges(revision_id, from_node_id, kind);
CREATE INDEX IF NOT EXISTS idx_canonical_graph_edges_to
  ON canonical_graph_edges(revision_id, to_node_id, kind);
`;

/**
 * Stores one canonical graph snapshot independently from all legacy storage.
 *
 * A replacement deletes the previous snapshot and inserts the new revision in
 * one SQLite transaction. The active pointer is written last, so readers see
 * either the complete previous revision or the complete new revision.
 *
 * @public
 */
export class GraphRepository {
  private readonly database: Database.Database;
  private readonly clock: () => Date;
  private readonly readOnly: boolean;

  constructor(
    readonly databasePath: string,
    options: GraphRepositoryOptions = {}
  ) {
    this.readOnly = options.readOnly ?? false;
    if (this.readOnly && databasePath === ':memory:') {
      throw new Error('A read-only GraphRepository requires an existing database file');
    }
    if (!this.readOnly && databasePath !== ':memory:') {
      fs.mkdirSync(path.dirname(path.resolve(databasePath)), { recursive: true });
    }
    this.database = new Database(
      databasePath,
      this.readOnly ? { readonly: true, fileMustExist: true } : undefined
    );
    this.clock = options.clock ?? (() => new Date());
    if (!this.readOnly) {
      this.database.pragma('foreign_keys = ON');
      if (databasePath !== ':memory:') this.database.pragma('journal_mode = WAL');
      this.database.pragma('synchronous = FULL');
      this.database.exec(SCHEMA_SQL);
    }
  }

  /**
   * Atomically replace the complete active revision.
   *
   * No merge occurs. Nodes and edges absent from `graph` are removed together
   * with the previous revision, which reconciles deletes and renames.
   */
  replaceActiveRevision(
    graph: CanonicalProjectGraph,
    options: GraphRepositoryReplaceOptions = {}
  ): CanonicalGraphRevisionMetadata {
    if (this.readOnly) {
      throw new Error('Cannot replace a canonical graph revision in a read-only repository');
    }
    assertCanonicalGraph(graph);
    const artifactContract = artifactContractFor(graph);
    const revisionId = revisionIdFor(graph, artifactContract);
    const storedAt = this.clock().toISOString();

    const replace = this.database.transaction(() => {
      if (options.expectedActiveRevisionId !== undefined) {
        const current = this.database
          .prepare('SELECT active_revision_id FROM canonical_graph_state WHERE singleton = 1')
          .get() as { active_revision_id: string } | undefined;
        const actualActiveRevisionId = current?.active_revision_id ?? null;
        if (actualActiveRevisionId !== options.expectedActiveRevisionId) {
          throw new GraphRepositoryConflictError(
            options.expectedActiveRevisionId,
            actualActiveRevisionId
          );
        }
      }

      // Remove the pointer first so the old revision can cascade. This gap is
      // transaction-local and cannot be observed by another SQLite reader.
      this.database.prepare('DELETE FROM canonical_graph_state WHERE singleton = 1').run();
      this.database.prepare('DELETE FROM canonical_graph_revisions').run();

      this.database
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
          stableJson(graph.provenance),
          stableJson(artifactContract),
          graph.nodes.length,
          graph.edges.length,
          storedAt
        );

      const insertNode = this.database.prepare(
        `INSERT INTO canonical_graph_nodes
          (revision_id, ordinal, node_id, kind, payload_json)
         VALUES (?, ?, ?, ?, ?)`
      );
      graph.nodes.forEach((node, ordinal) => {
        insertNode.run(revisionId, ordinal, node.id, node.kind, stableJson(node));
      });

      const insertEdge = this.database.prepare(
        `INSERT INTO canonical_graph_edges
          (revision_id, ordinal, kind, from_node_id, to_node_id, payload_json)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      graph.edges.forEach((edge, ordinal) => {
        insertEdge.run(revisionId, ordinal, edge.kind, edge.from, edge.to, stableJson(edge));
      });

      // The active pointer is deliberately the final write in the revision.
      this.database
        .prepare('INSERT INTO canonical_graph_state (singleton, active_revision_id) VALUES (1, ?)')
        .run(revisionId);

      return freezeMetadata({
        revisionId,
        contentFingerprint: graph.fingerprint,
        artifactContract,
        rootDir: graph.rootDir,
        tsconfigPath: graph.tsconfigPath,
        provenance: graph.provenance,
        nodeCount: graph.nodes.length,
        edgeCount: graph.edges.length,
        storedAt,
      });
    });

    // Acquire the write reservation before reading the CAS pointer. A deferred
    // transaction can read an old WAL snapshot and then fail to upgrade with
    // SQLITE_BUSY_SNAPSHOT after another process commits.
    return replace.immediate();
  }

  /** Read the active metadata and graph from one SQLite snapshot. */
  readActiveRevision(): ActiveCanonicalGraphRevision | null {
    const read = this.database.transaction(() => {
      const row = this.database
        .prepare(
          `SELECT revision.*
           FROM canonical_graph_state AS state
           JOIN canonical_graph_revisions AS revision
             ON revision.revision_id = state.active_revision_id
           WHERE state.singleton = 1`
        )
        .get() as RevisionRow | undefined;
      if (!row) return null;

      const nodeRows = this.database
        .prepare(
          `SELECT payload_json FROM canonical_graph_nodes
           WHERE revision_id = ? ORDER BY ordinal`
        )
        .all(row.revision_id) as PayloadRow[];
      const edgeRows = this.database
        .prepare(
          `SELECT payload_json FROM canonical_graph_edges
           WHERE revision_id = ? ORDER BY ordinal`
        )
        .all(row.revision_id) as PayloadRow[];

      if (nodeRows.length !== row.node_count || edgeRows.length !== row.edge_count) {
        throw new Error(`Canonical graph revision ${row.revision_id} has inconsistent row counts`);
      }

      const nodes = nodeRows.map((value) => parseJson<CanonicalGraphNode>(value.payload_json));
      const edges = edgeRows.map((value) => parseJson<CanonicalGraphEdge>(value.payload_json));
      const provenance = parseJson<ProjectGraphProvenance>(row.provenance_json);
      const artifactContract = parseJson<CanonicalGraphArtifactContract>(
        row.artifact_contract_json
      );
      assertArtifactContract(artifactContract, row.contract_version);

      const graph = deepFreeze({
        contractVersion: row.contract_version as typeof PROJECT_GRAPH_CONTRACT_VERSION,
        rootDir: row.root_dir,
        tsconfigPath: row.tsconfig_path,
        nodes,
        edges,
        provenance,
        fingerprint: row.content_fingerprint,
      });
      assertCanonicalGraph(graph);

      const expectedRevisionId = revisionIdFor(graph, artifactContract);
      if (expectedRevisionId !== row.revision_id) {
        // Early schema-v1 builds included volatile refresh/cache provenance in
        // the revision hash. Accept only that exact legacy envelope so the next
        // CAS replacement can migrate it to the stable identity without
        // weakening corruption detection.
        const legacyRevisionId = legacyRevisionIdFor(graph, artifactContract);
        if (legacyRevisionId !== row.revision_id) {
          throw new Error(`Canonical graph revision envelope mismatch: ${row.revision_id}`);
        }
      }

      return deepFreeze({
        metadata: freezeMetadata({
          revisionId: row.revision_id,
          contentFingerprint: row.content_fingerprint,
          artifactContract,
          rootDir: row.root_dir,
          tsconfigPath: row.tsconfig_path,
          provenance,
          nodeCount: row.node_count,
          edgeCount: row.edge_count,
          storedAt: row.stored_at,
        }),
        graph,
      });
    });

    return read();
  }

  /** Read only the active graph, or `null` before the first replacement. */
  readActiveGraph(): CanonicalProjectGraph | null {
    return this.readActiveRevision()?.graph ?? null;
  }

  /** Close the isolated SQLite connection. */
  close(): void {
    this.database.close();
  }
}

function artifactContractFor(graph: CanonicalProjectGraph): CanonicalGraphArtifactContract {
  return deepFreeze({
    name: CANONICAL_GRAPH_ARTIFACT_NAME,
    contractVersion: graph.contractVersion,
    fingerprintAlgorithm: CANONICAL_GRAPH_FINGERPRINT_ALGORITHM,
    identityScheme: '@ttsc/graph:path#qualifiedName:kind' as const,
    repositorySchemaVersion: GRAPH_REPOSITORY_SCHEMA_VERSION,
  });
}

function revisionIdFor(
  graph: CanonicalProjectGraph,
  artifactContract: CanonicalGraphArtifactContract
): string {
  return createHash('sha256')
    .update(
      stableJson({
        artifactContract,
        contentFingerprint: graph.fingerprint,
        provenance: revisionIdentityProvenance(graph.provenance),
        rootDir: graph.rootDir,
        tsconfigPath: graph.tsconfigPath,
      })
    )
    .digest('hex');
}

function legacyRevisionIdFor(
  graph: CanonicalProjectGraph,
  artifactContract: CanonicalGraphArtifactContract
): string {
  return createHash('sha256')
    .update(
      stableJson({
        artifactContract,
        contentFingerprint: graph.fingerprint,
        provenance: graph.provenance,
        rootDir: graph.rootDir,
        tsconfigPath: graph.tsconfigPath,
      })
    )
    .digest('hex');
}

function revisionIdentityProvenance(
  provenance: Readonly<ProjectGraphProvenance>
): Record<string, unknown> {
  const identity: Record<string, unknown> = {};
  for (const key of REVISION_IDENTITY_PROVENANCE_KEYS) {
    if (Object.getOwnPropertyDescriptor(provenance, key) !== undefined) {
      identity[key] = provenance[key];
    }
  }
  return identity;
}

function assertCanonicalGraph(graph: CanonicalProjectGraph): void {
  if (graph.contractVersion !== PROJECT_GRAPH_CONTRACT_VERSION) {
    throw new Error(`Unsupported canonical graph contract: ${graph.contractVersion}`);
  }
  if (!graph.rootDir || !graph.tsconfigPath) {
    throw new Error('Canonical graph rootDir and tsconfigPath are required');
  }

  const ids = new Set<string>();
  let previousId: string | undefined;
  for (const node of graph.nodes) {
    if (!node.id || !node.kind || node.sourceId !== node.id) {
      throw new Error(`Invalid canonical graph node: ${node.id || '<missing>'}`);
    }
    if (previousId !== undefined && compareText(previousId, node.id) >= 0) {
      throw new Error(`Canonical graph nodes are not strictly sorted: ${node.id}`);
    }
    if (ids.has(node.id)) throw new Error(`Duplicate canonical graph node: ${node.id}`);
    ids.add(node.id);
    previousId = node.id;
  }

  const edgeKeys = new Set<string>();
  let previousEdge: CanonicalGraphEdge | undefined;
  for (const edge of graph.edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) {
      throw new Error(`Canonical graph edge has an unknown endpoint: ${edge.from} -> ${edge.to}`);
    }
    if (previousEdge && compareEdges(previousEdge, edge) >= 0) {
      throw new Error(`Canonical graph edges are not strictly sorted: ${edge.kind}`);
    }
    const key = `${edge.kind}\u0000${edge.from}\u0000${edge.to}`;
    if (edgeKeys.has(key)) throw new Error(`Duplicate canonical graph edge: ${edge.kind}`);
    edgeKeys.add(key);
    previousEdge = edge;
  }

  const actualFingerprint = createHash('sha256')
    .update(stableJson({ nodes: graph.nodes, edges: graph.edges }))
    .digest('hex');
  if (actualFingerprint !== graph.fingerprint) {
    throw new Error(
      `Canonical graph fingerprint mismatch: expected ${graph.fingerprint}, got ${actualFingerprint}`
    );
  }
}

function assertArtifactContract(
  value: CanonicalGraphArtifactContract,
  contractVersion: string
): void {
  if (
    value.name !== CANONICAL_GRAPH_ARTIFACT_NAME ||
    value.contractVersion !== contractVersion ||
    value.fingerprintAlgorithm !== CANONICAL_GRAPH_FINGERPRINT_ALGORITHM ||
    value.identityScheme !== '@ttsc/graph:path#qualifiedName:kind' ||
    value.repositorySchemaVersion !== GRAPH_REPOSITORY_SCHEMA_VERSION
  ) {
    throw new Error('Unsupported canonical graph artifact contract');
  }
}

function freezeMetadata(value: CanonicalGraphRevisionMetadata): CanonicalGraphRevisionMetadata {
  return deepFreeze({
    ...value,
    artifactContract: { ...value.artifactContract },
    provenance: { ...value.provenance },
  });
}

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

function stableJson(value: unknown): string {
  return JSON.stringify(canonicalJsonValue(value, 'value'));
}

function canonicalJsonValue(value: unknown, field: string): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`${field} contains a non-finite number`);
    return value;
  }
  if (typeof value !== 'object') throw new Error(`${field} contains a non-JSON value`);
  if (Array.isArray(value)) {
    return value.map((child, index) => canonicalJsonValue(child, `${field}[${index}]`));
  }

  const object = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(object)
      .sort(([left], [right]) => compareText(left, right))
      .map(([key, child]) => [key, canonicalJsonValue(child, `${field}.${key}`)])
  );
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function compareEdges(left: CanonicalGraphEdge, right: CanonicalGraphEdge): number {
  return (
    compareText(left.kind, right.kind) ||
    compareText(left.from, right.from) ||
    compareText(left.to, right.to)
  );
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
