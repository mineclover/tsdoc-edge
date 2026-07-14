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
import type { CanonicalDiagnostic } from '../indexer/diagnostics-contract';
import type { SymbolAliasRecord } from '../indexer/symbol-alias';

export const GRAPH_REPOSITORY_SCHEMA_VERSION = 2 as const;
const LEGACY_GRAPH_REPOSITORY_SCHEMA_VERSION = 1 as const;
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
  'producerDerivedRevisionId',
  'routerDerivedRevisionId',
  'typescriptCompatibilityTarget',
  'diagnosticsCollected',
] as const;

/** Metadata describing the artifact contract stored with every revision. */
export interface CanonicalGraphArtifactContract {
  readonly name: typeof CANONICAL_GRAPH_ARTIFACT_NAME;
  readonly contractVersion: typeof PROJECT_GRAPH_CONTRACT_VERSION;
  readonly fingerprintAlgorithm: typeof CANONICAL_GRAPH_FINGERPRINT_ALGORITHM;
  readonly identityScheme: '@ttsc/graph:path#qualifiedName:kind';
  readonly repositorySchemaVersion:
    | typeof LEGACY_GRAPH_REPOSITORY_SCHEMA_VERSION
    | typeof GRAPH_REPOSITORY_SCHEMA_VERSION;
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

/** Read-only operator projection for one retained canonical graph revision. */
export interface CanonicalGraphRevisionSummary extends CanonicalGraphRevisionMetadata {
  readonly active: boolean;
}

/** One transactionally consistent active revision read. */
export interface ActiveCanonicalGraphRevision {
  readonly metadata: CanonicalGraphRevisionMetadata;
  readonly graph: CanonicalProjectGraph;
  readonly aliases: readonly SymbolAliasRecord[];
  readonly diagnostics: readonly CanonicalDiagnostic[];
}

const materializedGraphRevisions = new WeakSet<object>();

/** Require the exact process-local object materialized by GraphRepository. */
export function assertGraphRepositoryRevision(revision: ActiveCanonicalGraphRevision): void {
  if (!materializedGraphRevisions.has(revision)) {
    throw new Error('Canonical graph revision was not materialized by GraphRepository');
  }
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
  readonly aliases?: readonly SymbolAliasRecord[];
  readonly diagnostics?: readonly CanonicalDiagnostic[];
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

CREATE TABLE IF NOT EXISTS canonical_symbol_aliases (
  revision_id TEXT NOT NULL,
  canonical_id TEXT NOT NULL,
  legacy_id TEXT NOT NULL,
  match_strategy TEXT NOT NULL,
  confidence REAL NOT NULL,
  payload_json TEXT NOT NULL,
  PRIMARY KEY (revision_id, canonical_id),
  UNIQUE (revision_id, legacy_id),
  FOREIGN KEY (revision_id)
    REFERENCES canonical_graph_revisions(revision_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_canonical_symbol_aliases_legacy
  ON canonical_symbol_aliases(revision_id, legacy_id);

CREATE TABLE IF NOT EXISTS canonical_graph_diagnostics (
  revision_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
  diagnostic_id TEXT NOT NULL,
  severity TEXT NOT NULL,
  category TEXT NOT NULL,
  file_path TEXT,
  payload_json TEXT NOT NULL,
  PRIMARY KEY (revision_id, diagnostic_id),
  UNIQUE (revision_id, ordinal),
  FOREIGN KEY (revision_id)
    REFERENCES canonical_graph_revisions(revision_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_canonical_graph_diagnostics_file
  ON canonical_graph_diagnostics(revision_id, file_path);
`;

/**
 * Stores one canonical graph snapshot independently from all legacy storage.
 *
 * Revisions remain available after activation changes. A new revision and the
 * active pointer are committed in one SQLite transaction, with the pointer
 * written last so readers see either the complete previous active revision or
 * the complete new one.
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
      // Schema-v1 repositories have a valid active graph but no alias or
      // diagnostics tables. Add the v2 storage plane atomically while leaving
      // the active v1 envelope untouched; the next guarded replacement
      // promotes that envelope to v2 without weakening CAS semantics.
      this.database.transaction(() => this.database.exec(SCHEMA_SQL)).immediate();
    }
  }

  /**
   * Atomically replace the complete active revision.
   *
   * No merge occurs within a revision. Nodes and edges absent from `graph` are
   * absent from the new revision, while earlier revisions remain readable.
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
    const storedAt = this.clock().toISOString();
    const aliases = options.aliases ?? [];
    const diagnostics = options.diagnostics ?? [];
    assertRevisionPlanes(graph, aliases, diagnostics);
    const revisionId = revisionIdFor(graph, artifactContract, aliases, diagnostics);

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

      const existing = this.database
        .prepare('SELECT * FROM canonical_graph_revisions WHERE revision_id = ?')
        .get(revisionId) as RevisionRow | undefined;

      let persistedAt = storedAt;
      if (existing) {
        // Reusing a deterministic revision must not duplicate payload rows or
        // move its creation time. Materializing it also verifies the complete
        // stored envelope before it is made active again. Operational
        // provenance is intentionally mutable because it is excluded from the
        // semantic revision identity.
        if (!this.materializeRevision(existing)) {
          throw new Error(`Canonical graph revision ${revisionId} disappeared during activation`);
        }
        persistedAt = existing.stored_at;
        this.database
          .prepare(
            `UPDATE canonical_graph_revisions
             SET provenance_json = ?
             WHERE revision_id = ?`
          )
          .run(stableJson(graph.provenance), revisionId);
      } else {
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

        const insertAlias = this.database.prepare(
          `INSERT INTO canonical_symbol_aliases
            (revision_id, canonical_id, legacy_id, match_strategy, confidence, payload_json)
           VALUES (?, ?, ?, ?, ?, ?)`
        );
        for (const alias of aliases) {
          insertAlias.run(
            revisionId,
            alias.canonicalId,
            alias.legacyId,
            alias.matchStrategy,
            alias.confidence,
            stableJson(alias)
          );
        }

        const insertDiagnostic = this.database.prepare(
          `INSERT INTO canonical_graph_diagnostics
            (revision_id, ordinal, diagnostic_id, severity, category, file_path, payload_json)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        );
        diagnostics.forEach((diagnostic, ordinal) => {
          insertDiagnostic.run(
            revisionId,
            ordinal,
            diagnostic.id,
            diagnostic.severity,
            diagnostic.category,
            diagnostic.file ?? null,
            stableJson(diagnostic)
          );
        });
      }

      // The active pointer is deliberately the final write in the revision.
      this.database
        .prepare(
          `INSERT INTO canonical_graph_state (singleton, active_revision_id)
           VALUES (1, ?)
           ON CONFLICT(singleton) DO UPDATE
           SET active_revision_id = excluded.active_revision_id`
        )
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
        storedAt: persistedAt,
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
      return row ? this.materializeRevision(row) : null;
    });

    return read();
  }

  /** Read any retained revision by its deterministic identifier. */
  readRevision(revisionId: string): ActiveCanonicalGraphRevision | null {
    const read = this.database.transaction(() => {
      const row = this.database
        .prepare('SELECT * FROM canonical_graph_revisions WHERE revision_id = ?')
        .get(revisionId) as RevisionRow | undefined;
      return row ? this.materializeRevision(row) : null;
    });

    return read();
  }

  /** List retained revision metadata without changing the active pointer. */
  listRevisionSummaries(): readonly CanonicalGraphRevisionSummary[] {
    const read = this.database.transaction(() => {
      const rows = this.database
        .prepare(
          `SELECT revision.*, state.active_revision_id AS current_active_revision_id
           FROM canonical_graph_revisions AS revision
           LEFT JOIN canonical_graph_state AS state ON state.singleton = 1
           ORDER BY CASE
                      WHEN revision.revision_id = state.active_revision_id THEN 0
                      ELSE 1
                    END,
                    revision.stored_at, revision.revision_id`
        )
        .all() as Array<RevisionRow & { current_active_revision_id?: string }>;
      return rows.map((row) => {
        const revision = this.materializeRevision(row);
        return deepFreeze({
          ...revision.metadata,
          active: row.revision_id === row.current_active_revision_id,
        });
      });
    });
    return deepFreeze(read());
  }

  /** Read only the active graph, or `null` before the first replacement. */
  readActiveGraph(): CanonicalProjectGraph | null {
    return this.readActiveRevision()?.graph ?? null;
  }

  /** Close the isolated SQLite connection. */
  close(): void {
    this.database.close();
  }

  private materializeRevision(row: RevisionRow): ActiveCanonicalGraphRevision {
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
    const artifactContract = parseJson<CanonicalGraphArtifactContract>(row.artifact_contract_json);
    assertArtifactContract(artifactContract, row.contract_version);

    // A read-only client may open a pristine schema-v1 database. It cannot
    // initialize v2 tables, so expose the graph with empty additive planes.
    // Writable clients create those tables in the constructor, but their rows
    // remain untrusted until a CAS replacement writes a schema-v2 artifact
    // envelope that includes both planes in revision identity.
    const trustsAdditivePlanes =
      artifactContract.repositorySchemaVersion === GRAPH_REPOSITORY_SCHEMA_VERSION;
    const aliasRows =
      trustsAdditivePlanes && this.tableExists('canonical_symbol_aliases')
        ? (this.database
            .prepare(
              `SELECT payload_json FROM canonical_symbol_aliases
               WHERE revision_id = ? ORDER BY canonical_id`
            )
            .all(row.revision_id) as PayloadRow[])
        : [];
    const diagnosticRows =
      trustsAdditivePlanes && this.tableExists('canonical_graph_diagnostics')
        ? (this.database
            .prepare(
              `SELECT payload_json FROM canonical_graph_diagnostics
               WHERE revision_id = ? ORDER BY ordinal`
            )
            .all(row.revision_id) as PayloadRow[])
        : [];

    if (nodeRows.length !== row.node_count || edgeRows.length !== row.edge_count) {
      throw new Error(`Canonical graph revision ${row.revision_id} has inconsistent row counts`);
    }

    const nodes = nodeRows.map((value) => parseJson<CanonicalGraphNode>(value.payload_json));
    const edges = edgeRows.map((value) => parseJson<CanonicalGraphEdge>(value.payload_json));
    const persistedAliases = aliasRows.map((value) =>
      parseJson<SymbolAliasRecord>(value.payload_json)
    );
    const persistedDiagnostics = diagnosticRows.map((value) =>
      parseJson<CanonicalDiagnostic>(value.payload_json)
    );
    let provenance = parseJson<ProjectGraphProvenance>(row.provenance_json);

    let graph = deepFreeze({
      contractVersion: row.contract_version as typeof PROJECT_GRAPH_CONTRACT_VERSION,
      rootDir: row.root_dir,
      tsconfigPath: row.tsconfig_path,
      nodes,
      edges,
      provenance,
      fingerprint: row.content_fingerprint,
    });
    assertCanonicalGraph(graph);

    let aliases: readonly SymbolAliasRecord[] = persistedAliases;
    let diagnostics: readonly CanonicalDiagnostic[] = persistedDiagnostics;
    const expectedRevisionId = revisionIdFor(
      graph,
      artifactContract,
      persistedAliases,
      persistedDiagnostics
    );
    let trustsDerivedRevisionIds = true;
    if (expectedRevisionId !== row.revision_id) {
      const preDerivedRevisionId = preDerivedRevisionIdFor(
        graph,
        artifactContract,
        persistedAliases,
        persistedDiagnostics
      );
      if (preDerivedRevisionId === row.revision_id) {
        // Revisions created before derived provider/router IDs joined semantic
        // identity remain readable, but those unauthenticated fields must not
        // influence effective-analysis identity under the legacy revision ID.
        trustsDerivedRevisionIds = false;
      } else {
        // Existing schema-v1/v2 repositories predate additive-plane identity,
        // and the earliest builds also included volatile provenance. Accept only
        // those two exact historical graph envelopes. They never authenticated
        // additive-plane content, so discard any rows attached to them and let
        // the next CAS replacement write a trusted v2 envelope.
        const graphOnlyRevisionId = graphOnlyRevisionIdFor(graph, artifactContract);
        const preDerivedGraphOnlyRevisionId = preDerivedGraphOnlyRevisionIdFor(
          graph,
          artifactContract
        );
        const volatileRevisionId = volatileRevisionIdFor(graph, artifactContract);
        if (
          graphOnlyRevisionId !== row.revision_id &&
          preDerivedGraphOnlyRevisionId !== row.revision_id &&
          volatileRevisionId !== row.revision_id
        ) {
          throw new Error(`Canonical graph revision envelope mismatch: ${row.revision_id}`);
        }
        if (preDerivedGraphOnlyRevisionId === row.revision_id) {
          trustsDerivedRevisionIds = false;
        }
        aliases = [];
        diagnostics = [];
      }
    }
    if (!trustsDerivedRevisionIds) {
      provenance = withoutDerivedRevisionIds(provenance);
      graph = deepFreeze({ ...graph, provenance });
    }

    const revision = deepFreeze({
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
      aliases,
      diagnostics,
    });
    materializedGraphRevisions.add(revision);
    return revision;
  }

  private tableExists(tableName: string): boolean {
    return Boolean(
      this.database
        .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
        .get(tableName)
    );
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
  artifactContract: CanonicalGraphArtifactContract,
  aliases: readonly SymbolAliasRecord[],
  diagnostics: readonly CanonicalDiagnostic[]
): string {
  return createHash('sha256')
    .update(
      stableJson({
        aliases: [...aliases].sort(compareAliases),
        artifactContract,
        contentFingerprint: graph.fingerprint,
        diagnostics,
        provenance: revisionIdentityProvenance(graph.provenance),
        rootDir: graph.rootDir,
        tsconfigPath: graph.tsconfigPath,
      })
    )
    .digest('hex');
}

function graphOnlyRevisionIdFor(
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

function preDerivedRevisionIdFor(
  graph: CanonicalProjectGraph,
  artifactContract: CanonicalGraphArtifactContract,
  aliases: readonly SymbolAliasRecord[],
  diagnostics: readonly CanonicalDiagnostic[]
): string {
  return createHash('sha256')
    .update(
      stableJson({
        aliases: [...aliases].sort(compareAliases),
        artifactContract,
        contentFingerprint: graph.fingerprint,
        diagnostics,
        provenance: preDerivedRevisionIdentityProvenance(graph.provenance),
        rootDir: graph.rootDir,
        tsconfigPath: graph.tsconfigPath,
      })
    )
    .digest('hex');
}

function preDerivedGraphOnlyRevisionIdFor(
  graph: CanonicalProjectGraph,
  artifactContract: CanonicalGraphArtifactContract
): string {
  return createHash('sha256')
    .update(
      stableJson({
        artifactContract,
        contentFingerprint: graph.fingerprint,
        provenance: preDerivedRevisionIdentityProvenance(graph.provenance),
        rootDir: graph.rootDir,
        tsconfigPath: graph.tsconfigPath,
      })
    )
    .digest('hex');
}

function volatileRevisionIdFor(
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

function preDerivedRevisionIdentityProvenance(
  provenance: Readonly<ProjectGraphProvenance>
): Record<string, unknown> {
  const identity = revisionIdentityProvenance(provenance);
  delete identity.producerDerivedRevisionId;
  delete identity.routerDerivedRevisionId;
  return identity;
}

function withoutDerivedRevisionIds(
  provenance: Readonly<ProjectGraphProvenance>
): ProjectGraphProvenance {
  const sanitized = { ...provenance };
  delete sanitized.producerDerivedRevisionId;
  delete sanitized.routerDerivedRevisionId;
  return sanitized;
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
    (value.repositorySchemaVersion !== LEGACY_GRAPH_REPOSITORY_SCHEMA_VERSION &&
      value.repositorySchemaVersion !== GRAPH_REPOSITORY_SCHEMA_VERSION)
  ) {
    throw new Error('Unsupported canonical graph artifact contract');
  }
}

function assertRevisionPlanes(
  graph: CanonicalProjectGraph,
  aliases: readonly SymbolAliasRecord[],
  diagnostics: readonly CanonicalDiagnostic[]
): void {
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const canonicalIds = new Set<string>();
  const legacyIds = new Set<string>();
  for (const alias of aliases) {
    if (!nodeIds.has(alias.canonicalId)) {
      throw new Error(`Canonical alias references an unknown node: ${alias.canonicalId}`);
    }
    if (canonicalIds.has(alias.canonicalId)) {
      throw new Error(`Duplicate canonical alias: ${alias.canonicalId}`);
    }
    if (legacyIds.has(alias.legacyId)) {
      throw new Error(`Duplicate legacy alias: ${alias.legacyId}`);
    }
    canonicalIds.add(alias.canonicalId);
    legacyIds.add(alias.legacyId);
  }

  const diagnosticIds = new Set<string>();
  for (const diagnostic of diagnostics) {
    if (diagnosticIds.has(diagnostic.id)) {
      throw new Error(`Duplicate canonical diagnostic: ${diagnostic.id}`);
    }
    diagnosticIds.add(diagnostic.id);
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

function compareAliases(left: SymbolAliasRecord, right: SymbolAliasRecord): number {
  return (
    compareText(left.canonicalId, right.canonicalId) || compareText(left.legacyId, right.legacyId)
  );
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
