/** Validated append-only retention for revision-pinned convention check results. */

import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import type { ConventionCheckResult } from '../convention/ConventionCheckService';
import { type ConventionGateDecision, evaluateConventionGate } from '../convention/ConventionGate';
import { restoreCompiledConventionPack } from '../convention/ConventionPackCompiler';
import type { CompiledConventionPack } from '../convention/contracts';
import {
  createEnrichmentRevision,
  createEvidenceRevision,
  type EnrichmentRevision,
  type EvidenceRevision,
} from '../semantic-graph/analysis-input-revisions';
import type { RuleSetRevision } from '../semantic-graph/contracts';
import { createRuleSetRevision } from '../semantic-graph/EffectiveAnalysisService';
import type { PolicyRevision } from '../spec-graph/contracts';
import { createPolicyRevision } from '../spec-graph/identity';
import type { NamingConventionConfig, TsdocConventionConfig } from '../types/config';

export const CONVENTION_CHECK_HISTORY_CONTRACT_VERSION = '2.0' as const;
export const CONVENTION_CHECK_HISTORY_SCHEMA_VERSION = 1 as const;
export const CONVENTION_CHECK_HISTORY_RETENTION_CONTRACT_VERSION = '1.0' as const;
export const CONVENTION_CHECK_HISTORY_RETENTION_SCHEMA_VERSION = 1 as const;

export interface RetainedConventionCheckInputs {
  readonly evidence: EvidenceRevision;
  readonly enrichment: EnrichmentRevision;
  readonly policy: PolicyRevision;
  readonly ruleSet: RuleSetRevision;
}

export type RetainedConventionGate = ConventionGateDecision;

/** One self-validating append-only envelope; code/spec are retained by their own repositories. */
export interface RetainedConventionCheck {
  readonly contractVersion: typeof CONVENTION_CHECK_HISTORY_CONTRACT_VERSION;
  readonly historyId: string;
  readonly workspaceId: string;
  readonly check: ConventionCheckResult;
  readonly pack: CompiledConventionPack;
  readonly inputs: RetainedConventionCheckInputs;
  readonly evaluationConfig: {
    readonly naming: NamingConventionConfig;
    readonly tsdoc: TsdocConventionConfig;
    readonly suppressionAsOf?: string;
  };
  readonly gate: RetainedConventionGate;
}

export interface ConventionCheckHistoryRepositoryOptions {
  readonly readOnly?: boolean;
  readonly clock?: () => Date;
}

/** Exact proof that a historical payload was garbage-collected. */
export interface ConventionHistoryTombstone {
  readonly contractVersion: typeof CONVENTION_CHECK_HISTORY_RETENTION_CONTRACT_VERSION;
  readonly historyId: string;
  readonly workspaceId: string;
  readonly checkId: string;
  readonly payloadDigest: string;
  readonly reason: string;
  readonly tombstonedAt: string;
}

/** Operator pin that protects one exact historical record from retention GC. */
export interface ConventionHistoryPin {
  readonly historyId: string;
  readonly workspaceId: string;
  readonly reason: string;
  readonly pinnedAt: string;
}

/** Lightweight current-history projection used by retention operations. */
export interface ConventionHistorySummary {
  readonly historyId: string;
  readonly workspaceId: string;
  readonly checkId: string;
  readonly storedAt: string | null;
  readonly pinned: boolean;
}

export interface ConventionHistoryRetentionResult {
  readonly before: string;
  readonly candidates: readonly ConventionHistorySummary[];
  readonly tombstoned: readonly ConventionHistoryTombstone[];
  readonly skippedPinned: readonly ConventionHistorySummary[];
}

interface HistoryRow {
  history_id: string;
  workspace_id: string;
  check_id: string;
  payload_json: string;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS convention_check_history (
  history_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  check_id TEXT NOT NULL,
  contract_version TEXT NOT NULL,
  schema_version INTEGER NOT NULL CHECK (schema_version = ${CONVENTION_CHECK_HISTORY_SCHEMA_VERSION}),
  payload_json TEXT NOT NULL,
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_convention_check_history_workspace
  ON convention_check_history(workspace_id, check_id);

CREATE TABLE IF NOT EXISTS convention_check_history_pins (
  history_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  pinned_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS convention_check_history_tombstones (
  history_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  check_id TEXT NOT NULL,
  retention_schema_version INTEGER NOT NULL
    CHECK (retention_schema_version = ${CONVENTION_CHECK_HISTORY_RETENTION_SCHEMA_VERSION}),
  payload_digest TEXT NOT NULL,
  reason TEXT NOT NULL,
  tombstoned_at TEXT NOT NULL
);
`;

/** Store only validated immutable envelopes; no latest pointer exists. */
export class ConventionCheckHistoryRepository {
  private readonly database: Database.Database;
  private readonly readOnly: boolean;
  private readonly clock: () => Date;
  private readonly retentionSchemaAvailable: boolean;

  constructor(
    readonly databasePath: string,
    options: ConventionCheckHistoryRepositoryOptions = {}
  ) {
    this.readOnly = options.readOnly ?? false;
    this.clock = options.clock ?? (() => new Date());
    if (this.readOnly && databasePath === ':memory:') {
      throw new Error(
        'A read-only convention check history repository requires an existing database'
      );
    }
    if (!this.readOnly && databasePath !== ':memory:') {
      fs.mkdirSync(path.dirname(path.resolve(databasePath)), { recursive: true });
    }
    this.database = new Database(
      databasePath,
      this.readOnly ? { readonly: true, fileMustExist: true } : undefined
    );
    if (!this.readOnly) {
      if (databasePath !== ':memory:') this.database.pragma('journal_mode = WAL');
      this.database.pragma('synchronous = FULL');
      this.database
        .transaction(() => {
          this.database.exec(SCHEMA_SQL);
          ensureCreatedAtColumn(this.database);
        })
        .immediate();
    }
    this.retentionSchemaAvailable =
      !this.readOnly ||
      (hasColumn(this.database, 'convention_check_history', 'created_at') &&
        hasTable(this.database, 'convention_check_history_pins') &&
        hasTable(this.database, 'convention_check_history_tombstones'));
  }

  /** Append a check whose retained input revisions exactly match its effective stamp. */
  append(input: {
    readonly check: ConventionCheckResult;
    readonly inputs: RetainedConventionCheckInputs;
    readonly pack: CompiledConventionPack;
    readonly evaluationConfig: RetainedConventionCheck['evaluationConfig'];
    readonly gate: RetainedConventionGate;
  }): RetainedConventionCheck {
    if (this.readOnly)
      throw new Error('Cannot append convention check history in a read-only repository');
    const entry = canonicalEntry(input);
    const write = this.database.transaction(() => {
      if (this.selectTombstone(entry.historyId)) {
        throw new Error(`Cannot append a tombstoned convention history: ${entry.historyId}`);
      }
      const existing = this.select(entry.historyId);
      if (existing) {
        const retained = materialize(existing);
        if (stableJson(retained) !== stableJson(entry)) {
          throw new Error(`Convention check history identity collision: ${entry.historyId}`);
        }
        return retained;
      }
      this.database
        .prepare(
          `INSERT INTO convention_check_history (
            history_id, workspace_id, check_id, contract_version, schema_version, payload_json,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          entry.historyId,
          entry.workspaceId,
          entry.check.checkId,
          entry.contractVersion,
          CONVENTION_CHECK_HISTORY_SCHEMA_VERSION,
          stableJson(entry),
          this.clock().toISOString()
        );
      return entry;
    });
    return write.immediate();
  }

  /** Exact-ID lookup always replays the canonical envelope checks before returning it. */
  read(historyId: string): RetainedConventionCheck | null {
    const tombstone = this.selectTombstone(historyId);
    if (tombstone) {
      throw new Error(`Convention history is tombstoned: ${historyId} (${tombstone.reason})`);
    }
    const read = this.database.transaction(() => {
      const row = this.select(historyId);
      return row ? materialize(row) : null;
    });
    return read();
  }

  /** List non-tombstoned history rows eligible for an operator retention decision. */
  listSummaries(
    options: { readonly workspaceId?: string; readonly before?: string } = {}
  ): readonly ConventionHistorySummary[] {
    if (options.workspaceId !== undefined) requiredText(options.workspaceId, 'workspaceId');
    if (options.before !== undefined) timestamp(options.before, 'before');
    if (!this.retentionSchemaAvailable) return [];
    const clauses = ['h.created_at IS NOT NULL', 't.history_id IS NULL'];
    const values: string[] = [];
    if (options.workspaceId !== undefined) {
      clauses.push('h.workspace_id = ?');
      values.push(options.workspaceId);
    }
    if (options.before !== undefined) {
      clauses.push('h.created_at < ?');
      values.push(options.before);
    }
    const rows = this.database
      .prepare(
        `SELECT h.history_id, h.workspace_id, h.check_id, h.created_at,
                p.history_id AS pinned_history_id
           FROM convention_check_history h
           LEFT JOIN convention_check_history_pins p ON p.history_id = h.history_id
           LEFT JOIN convention_check_history_tombstones t ON t.history_id = h.history_id
          WHERE ${clauses.join(' AND ')}
          ORDER BY h.created_at, h.history_id`
      )
      .all(...values) as Array<{
      history_id: string;
      workspace_id: string;
      check_id: string;
      created_at: string | null;
      pinned_history_id: string | null;
    }>;
    return Object.freeze(
      rows.map((row) =>
        Object.freeze({
          historyId: row.history_id,
          workspaceId: row.workspace_id,
          checkId: row.check_id,
          storedAt: row.created_at,
          pinned: row.pinned_history_id !== null,
        })
      )
    );
  }

  /** Protect one exact history ID from retention GC. */
  pin(historyId: string, reason = 'operator pin'): ConventionHistoryPin {
    requiredText(historyId, 'historyId');
    requiredText(reason, 'pin reason');
    if (this.readOnly) throw new Error('Cannot pin history in a read-only repository');
    const row = this.select(historyId);
    if (!row) {
      if (this.selectTombstone(historyId)) {
        throw new Error(`Cannot pin a tombstoned convention history: ${historyId}`);
      }
      throw new Error(`Convention history not found: ${historyId}`);
    }
    const existing = this.selectPin(historyId);
    if (existing) {
      if (existing.reason !== reason) {
        throw new Error(`Convention history pin identity collision: ${historyId}`);
      }
      return existing;
    }
    const pin = Object.freeze({
      historyId,
      workspaceId: row.workspace_id,
      reason,
      pinnedAt: this.clock().toISOString(),
    });
    this.database
      .prepare(
        `INSERT INTO convention_check_history_pins
          (history_id, workspace_id, reason, pinned_at) VALUES (?, ?, ?, ?)`
      )
      .run(pin.historyId, pin.workspaceId, pin.reason, pin.pinnedAt);
    return pin;
  }

  /** Remove an operator pin; historical payloads remain untouched. */
  unpin(historyId: string): boolean {
    requiredText(historyId, 'historyId');
    if (this.readOnly) throw new Error('Cannot unpin history in a read-only repository');
    return (
      this.database
        .prepare('DELETE FROM convention_check_history_pins WHERE history_id = ?')
        .run(historyId).changes > 0
    );
  }

  /** Tombstone and physically remove one unpinned historical payload. */
  tombstone(historyId: string, reason = 'retention GC'): ConventionHistoryTombstone {
    requiredText(historyId, 'historyId');
    requiredText(reason, 'tombstone reason');
    if (this.readOnly) throw new Error('Cannot tombstone history in a read-only repository');
    const write = this.database.transaction(() => {
      const existingTombstone = this.selectTombstone(historyId);
      if (existingTombstone) {
        if (existingTombstone.reason !== reason) {
          throw new Error(`Convention history tombstone identity collision: ${historyId}`);
        }
        return existingTombstone;
      }
      if (this.selectPin(historyId)) {
        throw new Error(`Pinned convention history cannot be tombstoned: ${historyId}`);
      }
      const row = this.select(historyId);
      if (!row) throw new Error(`Convention history not found: ${historyId}`);
      const tombstone = Object.freeze({
        contractVersion: CONVENTION_CHECK_HISTORY_RETENTION_CONTRACT_VERSION,
        historyId,
        workspaceId: row.workspace_id,
        checkId: row.check_id,
        payloadDigest: `sha256:${createHash('sha256').update(row.payload_json).digest('hex')}`,
        reason,
        tombstonedAt: this.clock().toISOString(),
      });
      this.database
        .prepare(
          `INSERT INTO convention_check_history_tombstones
            (history_id, workspace_id, check_id, retention_schema_version,
             payload_digest, reason, tombstoned_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          tombstone.historyId,
          tombstone.workspaceId,
          tombstone.checkId,
          CONVENTION_CHECK_HISTORY_RETENTION_SCHEMA_VERSION,
          tombstone.payloadDigest,
          tombstone.reason,
          tombstone.tombstonedAt
        );
      this.database
        .prepare('DELETE FROM convention_check_history WHERE history_id = ?')
        .run(historyId);
      return tombstone;
    });
    return write.immediate();
  }

  /** Tombstone every unpinned row older than the explicit cutoff. */
  collectGarbage(options: {
    readonly before: string;
    readonly workspaceId?: string;
    readonly reason?: string;
  }): ConventionHistoryRetentionResult {
    const before = timestamp(options.before, 'before');
    const candidates = this.listSummaries({
      ...(options.workspaceId ? { workspaceId: options.workspaceId } : {}),
      before,
    });
    const skippedPinned = candidates.filter((candidate) => candidate.pinned);
    const tombstoned: ConventionHistoryTombstone[] = [];
    for (const candidate of candidates) {
      if (candidate.pinned) continue;
      tombstoned.push(this.tombstone(candidate.historyId, options.reason ?? 'retention GC'));
    }
    return Object.freeze({
      before,
      candidates,
      tombstoned: Object.freeze(tombstoned),
      skippedPinned,
    });
  }

  /** Read the tombstone without reviving or falling back to another history record. */
  readTombstone(historyId: string): ConventionHistoryTombstone | null {
    requiredText(historyId, 'historyId');
    return this.selectTombstone(historyId) ?? null;
  }

  close(): void {
    this.database.close();
  }

  private select(historyId: string): HistoryRow | undefined {
    return this.database
      .prepare('SELECT * FROM convention_check_history WHERE history_id = ?')
      .get(historyId) as HistoryRow | undefined;
  }

  private selectPin(historyId: string): ConventionHistoryPin | undefined {
    if (!this.retentionSchemaAvailable) return undefined;
    const row = this.database
      .prepare(
        `SELECT history_id, workspace_id, reason, pinned_at
           FROM convention_check_history_pins WHERE history_id = ?`
      )
      .get(historyId) as
      | { history_id: string; workspace_id: string; reason: string; pinned_at: string }
      | undefined;
    return row
      ? Object.freeze({
          historyId: row.history_id,
          workspaceId: row.workspace_id,
          reason: row.reason,
          pinnedAt: row.pinned_at,
        })
      : undefined;
  }

  private selectTombstone(historyId: string): ConventionHistoryTombstone | undefined {
    if (!this.retentionSchemaAvailable) return undefined;
    const row = this.database
      .prepare(
        `SELECT history_id, workspace_id, check_id, retention_schema_version,
                payload_digest, reason, tombstoned_at
           FROM convention_check_history_tombstones WHERE history_id = ?`
      )
      .get(historyId) as
      | {
          history_id: string;
          workspace_id: string;
          check_id: string;
          retention_schema_version: number;
          payload_digest: string;
          reason: string;
          tombstoned_at: string;
        }
      | undefined;
    if (!row) return undefined;
    if (row.retention_schema_version !== CONVENTION_CHECK_HISTORY_RETENTION_SCHEMA_VERSION) {
      throw new Error(`Unsupported convention history retention schema: ${row.history_id}`);
    }
    return Object.freeze({
      contractVersion: CONVENTION_CHECK_HISTORY_RETENTION_CONTRACT_VERSION,
      historyId: row.history_id,
      workspaceId: row.workspace_id,
      checkId: row.check_id,
      payloadDigest: row.payload_digest,
      reason: row.reason,
      tombstonedAt: row.tombstoned_at,
    });
  }
}

function ensureCreatedAtColumn(database: Database.Database): void {
  if (!hasColumn(database, 'convention_check_history', 'created_at')) {
    database.exec('ALTER TABLE convention_check_history ADD COLUMN created_at TEXT');
  }
}

function hasTable(database: Database.Database, tableName: string): boolean {
  return (
    database
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(tableName) !== undefined
  );
}

function hasColumn(database: Database.Database, tableName: string, columnName: string): boolean {
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{
    name: string;
  }>;
  return columns.some((column) => column.name === columnName);
}

function materialize(row: HistoryRow): RetainedConventionCheck {
  let parsed: RetainedConventionCheck;
  let canonical: RetainedConventionCheck;
  try {
    parsed = JSON.parse(row.payload_json) as RetainedConventionCheck;
    canonical = canonicalEntry(parsed);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Convention check history envelope mismatch: ${row.history_id} (${detail})`);
  }
  if (
    row.history_id !== canonical.historyId ||
    row.workspace_id !== canonical.workspaceId ||
    row.check_id !== canonical.check.checkId
  ) {
    throw new Error(`Convention check history envelope mismatch: ${row.history_id}`);
  }
  if (stableJson(parsed) !== stableJson(canonical)) {
    throw new Error(`Convention check history payload is not canonical: ${row.history_id}`);
  }
  return Object.freeze({
    ...immutableJson(canonical),
    pack: restoreCompiledConventionPack(canonical.pack),
  });
}

function canonicalEntry(input: {
  readonly check: ConventionCheckResult;
  readonly inputs: RetainedConventionCheckInputs;
  readonly pack: CompiledConventionPack;
  readonly evaluationConfig: RetainedConventionCheck['evaluationConfig'];
  readonly gate: RetainedConventionGate;
}): RetainedConventionCheck {
  const { check, inputs } = input;
  const workspaceId = requiredText(check.pack.scope.workspaceId, 'convention check workspaceId');
  const evidence = createEvidenceRevision({
    workspaceId: inputs.evidence.workspaceId,
    items: inputs.evidence.items,
    provenance: inputs.evidence.provenance,
  });
  const enrichment = createEnrichmentRevision({
    workspaceId: inputs.enrichment.workspaceId,
    items: inputs.enrichment.items,
    provenance: inputs.enrichment.provenance,
  });
  const policy = createPolicyRevision({
    relationSemanticRegistryVersion: inputs.policy.relationSemanticRegistryVersion,
    lifecycleGateVersion: inputs.policy.lifecycleGateVersion,
    rules: inputs.policy.rules,
    suppressions: inputs.policy.suppressions,
    provenance: inputs.policy.provenance,
  });
  const ruleSet = createRuleSetRevision({ analyzerVersions: inputs.ruleSet.analyzerVersions });
  const pack = restoreCompiledConventionPack(input.pack);
  const gate = evaluateConventionGate(check, input.gate.failureThreshold);
  if (
    stableJson(evidence) !== stableJson(inputs.evidence) ||
    stableJson(enrichment) !== stableJson(inputs.enrichment) ||
    stableJson(policy) !== stableJson(inputs.policy) ||
    stableJson(ruleSet) !== stableJson(inputs.ruleSet)
  ) {
    throw new Error('Convention check history inputs must be canonical revisions');
  }
  if (
    evidence.workspaceId !== workspaceId ||
    enrichment.workspaceId !== workspaceId ||
    check.inputStamp.evidenceRevisionId !== evidence.revisionId ||
    check.inputStamp.evidenceDigest !== evidence.contentFingerprint ||
    check.inputStamp.enrichmentRevisionId !== enrichment.revisionId ||
    check.inputStamp.enrichmentDigest !== enrichment.contentFingerprint ||
    check.inputStamp.policyRevisionId !== policy.revisionId ||
    check.inputStamp.policyDigest !== policy.contentDigest ||
    check.inputStamp.ruleSetRevisionId !== ruleSet.revisionId ||
    check.inputStamp.ruleSetDigest !== ruleSet.contentFingerprint ||
    check.pack.policy.revisionId !== policy.revisionId ||
    check.pack.ruleSet.revisionId !== ruleSet.revisionId ||
    stableJson(check.pack) !== stableJson(pack.manifest) ||
    stableJson(check.retainedPack) !== stableJson(pack) ||
    stableJson(check.retainedEvaluationConfig) !== stableJson(input.evaluationConfig) ||
    stableJson(gate) !== stableJson(input.gate)
  ) {
    throw new Error('Convention check history inputs do not match the effective analysis stamp');
  }
  const historyId = `convention-history:${digest({
    checkId: check.checkId,
    codeRevisionId: check.codeRevisionId,
    specRevisionId: check.inputStamp.specRevisionId,
    inputs: {
      evidenceRevisionId: evidence.revisionId,
      enrichmentRevisionId: enrichment.revisionId,
      policyRevisionId: policy.revisionId,
      ruleSetRevisionId: ruleSet.revisionId,
    },
    packManifestId: pack.manifest.manifestId,
    evaluationConfig: input.evaluationConfig,
    gate,
  })}`;
  return immutableJson({
    contractVersion: CONVENTION_CHECK_HISTORY_CONTRACT_VERSION,
    historyId,
    workspaceId,
    check,
    pack,
    inputs: { evidence, enrichment, policy, ruleSet },
    evaluationConfig: input.evaluationConfig,
    gate,
  });
}

function requiredText(value: string, label: string): string {
  if (typeof value !== 'string' || !value.trim())
    throw new Error(`${label} must be a non-empty string`);
  return value;
}

function timestamp(value: string, label: string): string {
  requiredText(value, label);
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()))
    throw new Error(`${label} must be a valid RFC3339 timestamp`);
  return parsed.toISOString();
}

function digest(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex');
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
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)])
    );
  }
  return value;
}

function immutableJson<T>(value: T): T {
  return deepFreeze(JSON.parse(stableJson(value)) as T);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const entry of Object.values(value as Record<string, unknown>)) deepFreeze(entry);
  }
  return value;
}
