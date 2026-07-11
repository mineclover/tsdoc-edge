/**
 * Durable storage for compiled specification graph projections.
 *
 * Managed documents remain the authored source of truth. This repository only
 * stores immutable, reproducible projections created from those documents; a
 * stored row is never an alternate authoring surface.
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import {
  createSpecGraphRevision,
  SPEC_GRAPH_CONTRACT_VERSION,
  type SpecGraphRevision,
} from '../spec-graph';

/** Current schema for the isolated specification graph repository. */
export const SPEC_GRAPH_REPOSITORY_SCHEMA_VERSION = 1 as const;

/** Construction options for a specification graph repository. */
export interface SpecGraphRepositoryOptions {
  readonly clock?: () => Date;
  /** Open an existing database without schema initialization or writes. */
  readonly readOnly?: boolean;
}

/** Optional compare-and-swap guard for an active revision replacement. */
export interface SpecGraphRepositoryReplaceOptions {
  /**
   * Expected active revision at commit time. `null` requires an empty active
   * pointer, while `undefined` disables the guard.
   */
  readonly expectedActiveRevisionId?: string | null;
}

/** Raised when another process changes the active spec revision first. */
export class SpecGraphRepositoryConflictError extends Error {
  constructor(
    readonly expectedActiveRevisionId: string | null,
    readonly actualActiveRevisionId: string | null
  ) {
    super(
      `Specification graph revision changed concurrently: expected ${expectedActiveRevisionId ?? '<empty>'}, got ${actualActiveRevisionId ?? '<empty>'}`
    );
    this.name = 'SpecGraphRepositoryConflictError';
  }
}

interface RevisionRow {
  revision_id: string;
  content_fingerprint: string;
  contract_version: string;
  workspace_id: string;
  repository_schema_version: number;
  payload_json: string;
  stored_at: string;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS spec_graph_revisions (
  revision_id TEXT PRIMARY KEY,
  content_fingerprint TEXT NOT NULL,
  contract_version TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  repository_schema_version INTEGER NOT NULL
    CHECK (repository_schema_version = ${SPEC_GRAPH_REPOSITORY_SCHEMA_VERSION}),
  payload_json TEXT NOT NULL,
  stored_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS spec_graph_state (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  active_revision_id TEXT NOT NULL,
  FOREIGN KEY (active_revision_id)
    REFERENCES spec_graph_revisions(revision_id)
);

CREATE INDEX IF NOT EXISTS idx_spec_graph_revisions_workspace
  ON spec_graph_revisions(workspace_id, stored_at);
`;

/**
 * Stores immutable compiled projections without taking ownership from managed
 * documents. Every successful replacement retains prior revisions and changes
 * only which complete revision is active.
 *
 * @public
 */
export class SpecGraphRepository {
  private readonly database: Database.Database;
  private readonly clock: () => Date;
  private readonly readOnly: boolean;

  constructor(
    readonly databasePath: string,
    options: SpecGraphRepositoryOptions = {}
  ) {
    this.readOnly = options.readOnly ?? false;
    if (this.readOnly && databasePath === ':memory:') {
      throw new Error('A read-only SpecGraphRepository requires an existing database file');
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
      this.database.transaction(() => this.database.exec(SCHEMA_SQL)).immediate();
    }
  }

  /**
   * Persist and activate a compiled revision atomically.
   *
   * A deterministic revision already present in the repository is verified and
   * reactivated without rewriting its immutable payload or creation time.
   */
  replaceActiveRevision(
    revision: SpecGraphRevision,
    options: SpecGraphRepositoryReplaceOptions = {}
  ): SpecGraphRevision {
    if (this.readOnly) {
      throw new Error('Cannot replace a spec graph revision in a read-only repository');
    }
    const validated = validateRevisionIdentity(revision);

    const replace = this.database.transaction(() => {
      if (options.expectedActiveRevisionId !== undefined) {
        const current = this.database
          .prepare('SELECT active_revision_id FROM spec_graph_state WHERE singleton = 1')
          .get() as { active_revision_id: string } | undefined;
        const actualActiveRevisionId = current?.active_revision_id ?? null;
        if (actualActiveRevisionId !== options.expectedActiveRevisionId) {
          throw new SpecGraphRepositoryConflictError(
            options.expectedActiveRevisionId,
            actualActiveRevisionId
          );
        }
      }

      const existing = this.selectRevision(validated.revisionId);
      if (existing) {
        const persisted = this.materializeRevision(existing);
        if (stableJson(persisted) !== stableJson(validated)) {
          throw new Error(
            `Specification graph revision identity collision: ${validated.revisionId}`
          );
        }
      } else {
        this.database
          .prepare(
            `INSERT INTO spec_graph_revisions (
              revision_id, content_fingerprint, contract_version, workspace_id,
              repository_schema_version, payload_json, stored_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            validated.revisionId,
            validated.contentFingerprint,
            validated.contractVersion,
            validated.workspaceId,
            SPEC_GRAPH_REPOSITORY_SCHEMA_VERSION,
            stableJson(validated),
            this.clock().toISOString()
          );
      }

      // The pointer is the final write, preserving atomic visibility and CAS.
      this.database
        .prepare(
          `INSERT INTO spec_graph_state (singleton, active_revision_id)
           VALUES (1, ?)
           ON CONFLICT(singleton) DO UPDATE
           SET active_revision_id = excluded.active_revision_id`
        )
        .run(validated.revisionId);

      return validated;
    });

    // Reserve the writer before reading the CAS pointer. This avoids upgrading
    // a stale WAL snapshot after another process commits.
    return replace.immediate();
  }

  /** Read the active compiled projection from one SQLite snapshot. */
  readActiveRevision(): SpecGraphRevision | null {
    const read = this.database.transaction(() => {
      const row = this.database
        .prepare(
          `SELECT revision.*
           FROM spec_graph_state AS state
           JOIN spec_graph_revisions AS revision
             ON revision.revision_id = state.active_revision_id
           WHERE state.singleton = 1`
        )
        .get() as RevisionRow | undefined;
      return row ? this.materializeRevision(row) : null;
    });
    return read();
  }

  /** Read any retained compiled projection by deterministic revision ID. */
  readRevision(revisionId: string): SpecGraphRevision | null {
    const read = this.database.transaction(() => {
      const row = this.selectRevision(revisionId);
      return row ? this.materializeRevision(row) : null;
    });
    return read();
  }

  /** Close the isolated SQLite connection. */
  close(): void {
    this.database.close();
  }

  private selectRevision(revisionId: string): RevisionRow | undefined {
    return this.database
      .prepare('SELECT * FROM spec_graph_revisions WHERE revision_id = ?')
      .get(revisionId) as RevisionRow | undefined;
  }

  private materializeRevision(row: RevisionRow): SpecGraphRevision {
    if (row.repository_schema_version !== SPEC_GRAPH_REPOSITORY_SCHEMA_VERSION) {
      throw new Error(
        `Unsupported specification graph repository schema: ${row.repository_schema_version}`
      );
    }

    const revision = validateRevisionIdentity(parseJson<SpecGraphRevision>(row.payload_json));
    if (
      row.revision_id !== revision.revisionId ||
      row.content_fingerprint !== revision.contentFingerprint ||
      row.contract_version !== revision.contractVersion ||
      row.workspace_id !== revision.workspaceId
    ) {
      throw new Error(`Specification graph revision envelope mismatch: ${row.revision_id}`);
    }
    return revision;
  }
}

function validateRevisionIdentity(revision: SpecGraphRevision): SpecGraphRevision {
  if (revision.contractVersion !== SPEC_GRAPH_CONTRACT_VERSION) {
    throw new Error(`Unsupported specification graph contract: ${revision.contractVersion}`);
  }

  const canonical = createSpecGraphRevision({
    workspaceId: revision.workspaceId,
    nodes: revision.nodes,
    edges: revision.edges,
    bindings: revision.bindings,
    provenance: revision.provenance,
  });
  if (
    revision.revisionId !== canonical.revisionId ||
    revision.contentFingerprint !== canonical.contentFingerprint
  ) {
    throw new Error(`Specification graph revision identity mismatch: ${revision.revisionId}`);
  }
  if (stableJson(revision) !== stableJson(canonical)) {
    throw new Error(
      `Specification graph revision payload is not canonical: ${revision.revisionId}`
    );
  }

  return deepFreeze(parseJson<SpecGraphRevision>(stableJson(canonical)));
}

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

function stableJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => compareText(left, right))
        .map(([key, entry]) => [key, canonicalize(entry)])
    );
  }
  return value;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
  }
  return value;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
