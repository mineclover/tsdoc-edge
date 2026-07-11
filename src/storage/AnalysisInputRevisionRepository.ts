/**
 * Immutable storage for revision-pinned analysis inputs.
 *
 * There is deliberately no active pointer. EffectiveAnalysisStamp is the
 * authority that selects an exact plane, workspace, and revision tuple.
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import {
  ANALYSIS_INPUT_REVISION_CONTRACT_VERSION,
  createEnrichmentRevision,
  createEvidenceRevision,
  type EnrichmentRevision,
  type EvidenceRevision,
} from '../semantic-graph/analysis-input-revisions';
import type { PolicyRevision } from '../spec-graph/contracts';
import { createPolicyRevision } from '../spec-graph/identity';

export const ANALYSIS_INPUT_REVISION_REPOSITORY_SCHEMA_VERSION = 1 as const;

export type StoredAnalysisInputPlane = 'evidence' | 'enrichment' | 'policy';

export interface AnalysisInputRevisionByPlane {
  readonly evidence: EvidenceRevision;
  readonly enrichment: EnrichmentRevision;
  readonly policy: PolicyRevision;
}

/** Exact lookup identity. No component is inferred from current process state. */
export interface AnalysisInputRevisionPin<
  Plane extends StoredAnalysisInputPlane = StoredAnalysisInputPlane,
> {
  readonly plane: Plane;
  readonly workspaceId: string;
  readonly revisionId: string;
}

export interface AnalysisInputRevisionRepositoryOptions {
  readonly clock?: () => Date;
  /** Open an existing database without initializing schemas or permitting writes. */
  readonly readOnly?: boolean;
}

interface RevisionRow {
  plane: StoredAnalysisInputPlane;
  workspace_id: string;
  revision_id: string;
  contract_version: string;
  content_fingerprint: string;
  repository_schema_version: number;
  payload_json: string;
  stored_at: string;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS analysis_input_revisions (
  plane TEXT NOT NULL CHECK (plane IN ('evidence', 'enrichment', 'policy')),
  workspace_id TEXT NOT NULL,
  revision_id TEXT NOT NULL,
  contract_version TEXT NOT NULL,
  content_fingerprint TEXT NOT NULL,
  repository_schema_version INTEGER NOT NULL
    CHECK (repository_schema_version = ${ANALYSIS_INPUT_REVISION_REPOSITORY_SCHEMA_VERSION}),
  payload_json TEXT NOT NULL,
  stored_at TEXT NOT NULL,
  PRIMARY KEY (plane, workspace_id, revision_id)
);

CREATE INDEX IF NOT EXISTS idx_analysis_input_revisions_workspace_plane
  ON analysis_input_revisions(workspace_id, plane, stored_at);
`;

/**
 * Stores immutable evidence, enrichment, and policy history in isolated planes.
 * Selection is always performed with a complete revision pin.
 *
 * @public
 */
export class AnalysisInputRevisionRepository {
  private readonly database: Database.Database;
  private readonly clock: () => Date;
  private readonly readOnly: boolean;

  constructor(
    readonly databasePath: string,
    options: AnalysisInputRevisionRepositoryOptions = {}
  ) {
    this.readOnly = options.readOnly ?? false;
    if (this.readOnly && databasePath === ':memory:') {
      throw new Error('A read-only AnalysisInputRevisionRepository requires an existing database');
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
      if (databasePath !== ':memory:') this.database.pragma('journal_mode = WAL');
      this.database.pragma('synchronous = FULL');
      this.database.transaction(() => this.database.exec(SCHEMA_SQL)).immediate();
    }
  }

  /** Persist one exact revision pin without replacing or activating any other revision. */
  storeRevision<Plane extends StoredAnalysisInputPlane>(
    pin: AnalysisInputRevisionPin<Plane>,
    revision: AnalysisInputRevisionByPlane[Plane]
  ): AnalysisInputRevisionByPlane[Plane] {
    if (this.readOnly) {
      throw new Error('Cannot store an analysis input revision in a read-only repository');
    }
    validatePin(pin);
    const validated = validatePinnedRevision(pin, revision);
    const contentFingerprint = revisionFingerprint(pin.plane, validated);

    const store = this.database.transaction(() => {
      const existing = this.selectRevision(pin);
      if (existing) {
        const persisted = this.materializeRevision(existing);
        if (stableJson(persisted) !== stableJson(validated)) {
          throw new Error(`Analysis input revision identity collision: ${formatPin(pin)}`);
        }
        return persisted as AnalysisInputRevisionByPlane[Plane];
      }

      this.database
        .prepare(
          `INSERT INTO analysis_input_revisions (
            plane, workspace_id, revision_id, contract_version, content_fingerprint,
            repository_schema_version, payload_json, stored_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          pin.plane,
          pin.workspaceId,
          pin.revisionId,
          validated.contractVersion,
          contentFingerprint,
          ANALYSIS_INPUT_REVISION_REPOSITORY_SCHEMA_VERSION,
          stableJson(validated),
          this.clock().toISOString()
        );
      return validated;
    });

    return store.immediate();
  }

  /** Read one immutable revision using all three pin components. */
  readRevision<Plane extends StoredAnalysisInputPlane>(
    pin: AnalysisInputRevisionPin<Plane>
  ): AnalysisInputRevisionByPlane[Plane] | null {
    validatePin(pin);
    const read = this.database.transaction(() => {
      const row = this.selectRevision(pin);
      return row ? (this.materializeRevision(row) as AnalysisInputRevisionByPlane[Plane]) : null;
    });
    return read();
  }

  /** Close this repository connection. */
  close(): void {
    this.database.close();
  }

  private selectRevision(pin: AnalysisInputRevisionPin): RevisionRow | undefined {
    return this.database
      .prepare(
        `SELECT * FROM analysis_input_revisions
         WHERE plane = ? AND workspace_id = ? AND revision_id = ?`
      )
      .get(pin.plane, pin.workspaceId, pin.revisionId) as RevisionRow | undefined;
  }

  private materializeRevision(
    row: RevisionRow
  ): AnalysisInputRevisionByPlane[StoredAnalysisInputPlane] {
    if (row.repository_schema_version !== ANALYSIS_INPUT_REVISION_REPOSITORY_SCHEMA_VERSION) {
      throw new Error(
        `Unsupported analysis input repository schema: ${row.repository_schema_version}`
      );
    }

    const pin: AnalysisInputRevisionPin = {
      plane: row.plane,
      workspaceId: row.workspace_id,
      revisionId: row.revision_id,
    };
    const revision = validatePinnedRevision(
      pin,
      parseJson<AnalysisInputRevisionByPlane[StoredAnalysisInputPlane]>(row.payload_json)
    );
    if (
      row.contract_version !== revision.contractVersion ||
      row.content_fingerprint !== revisionFingerprint(row.plane, revision)
    ) {
      throw new Error(`Analysis input revision envelope mismatch: ${formatPin(pin)}`);
    }
    return revision;
  }
}

function validatePinnedRevision<Plane extends StoredAnalysisInputPlane>(
  pin: AnalysisInputRevisionPin<Plane>,
  revision: AnalysisInputRevisionByPlane[Plane]
): AnalysisInputRevisionByPlane[Plane] {
  if (revision.revisionId !== pin.revisionId) {
    throw new Error(`Analysis input revision identity mismatch: ${formatPin(pin)}`);
  }
  let canonical: AnalysisInputRevisionByPlane[StoredAnalysisInputPlane];
  if (pin.plane === 'evidence') {
    const evidence = revision as EvidenceRevision;
    if (
      evidence.contractVersion !== ANALYSIS_INPUT_REVISION_CONTRACT_VERSION ||
      evidence.plane !== 'evidence'
    ) {
      throw new Error('Unsupported evidence revision contract');
    }
    if (evidence.workspaceId !== pin.workspaceId) {
      throw new Error(`Evidence revision workspace does not match pin: ${formatPin(pin)}`);
    }
    canonical = createEvidenceRevision({
      workspaceId: evidence.workspaceId,
      items: evidence.items,
      provenance: evidence.provenance,
    });
  } else if (pin.plane === 'enrichment') {
    const enrichment = revision as EnrichmentRevision;
    if (
      enrichment.contractVersion !== ANALYSIS_INPUT_REVISION_CONTRACT_VERSION ||
      enrichment.plane !== 'enrichment'
    ) {
      throw new Error('Unsupported enrichment revision contract');
    }
    if (enrichment.workspaceId !== pin.workspaceId) {
      throw new Error(`Enrichment revision workspace does not match pin: ${formatPin(pin)}`);
    }
    canonical = createEnrichmentRevision({
      workspaceId: enrichment.workspaceId,
      items: enrichment.items,
      provenance: enrichment.provenance,
    });
  } else {
    const policy = revision as PolicyRevision;
    if (policy.contractVersion !== '1.0') {
      throw new Error(`Unsupported policy revision contract: ${policy.contractVersion}`);
    }
    canonical = createPolicyRevision({
      relationSemanticRegistryVersion: policy.relationSemanticRegistryVersion,
      lifecycleGateVersion: policy.lifecycleGateVersion,
      rules: policy.rules,
      suppressions: policy.suppressions,
      provenance: policy.provenance,
    });
  }

  if (canonical.revisionId !== pin.revisionId) {
    throw new Error(`Analysis input revision identity mismatch: ${formatPin(pin)}`);
  }
  if (stableJson(canonical) !== stableJson(revision)) {
    throw new Error(`Analysis input revision payload is not canonical: ${formatPin(pin)}`);
  }
  return immutableJson(canonical) as AnalysisInputRevisionByPlane[Plane];
}

function revisionFingerprint(
  plane: StoredAnalysisInputPlane,
  revision: AnalysisInputRevisionByPlane[StoredAnalysisInputPlane]
): string {
  return plane === 'policy'
    ? (revision as PolicyRevision).contentDigest
    : (revision as EvidenceRevision | EnrichmentRevision).contentFingerprint;
}

function validatePin(pin: AnalysisInputRevisionPin): void {
  requiredText(pin.workspaceId, 'analysis input revision pin workspaceId');
  requiredText(pin.revisionId, 'analysis input revision pin revisionId');
  if (!['evidence', 'enrichment', 'policy'].includes(pin.plane)) {
    throw new Error(`Unsupported analysis input plane: ${pin.plane}`);
  }
}

function formatPin(pin: AnalysisInputRevisionPin): string {
  return `${pin.plane}/${pin.workspaceId}/${pin.revisionId}`;
}

function requiredText(value: string, label: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
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

function immutableJson<T>(value: T): T {
  return deepFreeze(parseJson<T>(stableJson(value)));
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const entry of Object.values(value as Record<string, unknown>)) deepFreeze(entry);
  }
  return value;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
