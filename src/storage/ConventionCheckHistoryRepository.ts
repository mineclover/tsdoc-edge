/** Validated append-only retention for revision-pinned convention check results. */

import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import type { ConventionCheckResult } from '../convention/ConventionCheckService';
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

export const CONVENTION_CHECK_HISTORY_CONTRACT_VERSION = '1.0' as const;
export const CONVENTION_CHECK_HISTORY_SCHEMA_VERSION = 1 as const;

export interface RetainedConventionCheckInputs {
  readonly evidence: EvidenceRevision;
  readonly enrichment: EnrichmentRevision;
  readonly policy: PolicyRevision;
  readonly ruleSet: RuleSetRevision;
}

/** One self-validating append-only envelope; code/spec are retained by their own repositories. */
export interface RetainedConventionCheck {
  readonly contractVersion: typeof CONVENTION_CHECK_HISTORY_CONTRACT_VERSION;
  readonly historyId: string;
  readonly workspaceId: string;
  readonly check: ConventionCheckResult;
  readonly inputs: RetainedConventionCheckInputs;
}

export interface ConventionCheckHistoryRepositoryOptions {
  readonly readOnly?: boolean;
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
  payload_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_convention_check_history_workspace
  ON convention_check_history(workspace_id, check_id);
`;

/** Store only validated immutable envelopes; no latest pointer exists. */
export class ConventionCheckHistoryRepository {
  private readonly database: Database.Database;
  private readonly readOnly: boolean;

  constructor(
    readonly databasePath: string,
    options: ConventionCheckHistoryRepositoryOptions = {}
  ) {
    this.readOnly = options.readOnly ?? false;
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
      this.database.transaction(() => this.database.exec(SCHEMA_SQL)).immediate();
    }
  }

  /** Append a check whose retained input revisions exactly match its effective stamp. */
  append(input: {
    readonly check: ConventionCheckResult;
    readonly inputs: RetainedConventionCheckInputs;
  }): RetainedConventionCheck {
    if (this.readOnly)
      throw new Error('Cannot append convention check history in a read-only repository');
    const entry = canonicalEntry(input.check, input.inputs);
    const write = this.database.transaction(() => {
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
            history_id, workspace_id, check_id, contract_version, schema_version, payload_json
          ) VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(
          entry.historyId,
          entry.workspaceId,
          entry.check.checkId,
          entry.contractVersion,
          CONVENTION_CHECK_HISTORY_SCHEMA_VERSION,
          stableJson(entry)
        );
      return entry;
    });
    return write.immediate();
  }

  /** Exact-ID lookup always replays the canonical envelope checks before returning it. */
  read(historyId: string): RetainedConventionCheck | null {
    const read = this.database.transaction(() => {
      const row = this.select(historyId);
      return row ? materialize(row) : null;
    });
    return read();
  }

  close(): void {
    this.database.close();
  }

  private select(historyId: string): HistoryRow | undefined {
    return this.database
      .prepare('SELECT * FROM convention_check_history WHERE history_id = ?')
      .get(historyId) as HistoryRow | undefined;
  }
}

function materialize(row: HistoryRow): RetainedConventionCheck {
  let parsed: RetainedConventionCheck;
  let canonical: RetainedConventionCheck;
  try {
    parsed = JSON.parse(row.payload_json) as RetainedConventionCheck;
    canonical = canonicalEntry(parsed.check, parsed.inputs);
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
  return immutableJson(canonical);
}

function canonicalEntry(
  check: ConventionCheckResult,
  inputs: RetainedConventionCheckInputs
): RetainedConventionCheck {
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
    check.pack.ruleSet.revisionId !== ruleSet.revisionId
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
  })}`;
  return immutableJson({
    contractVersion: CONVENTION_CHECK_HISTORY_CONTRACT_VERSION,
    historyId,
    workspaceId,
    check,
    inputs: { evidence, enrichment, policy, ruleSet },
  });
}

function requiredText(value: string, label: string): string {
  if (typeof value !== 'string' || !value.trim())
    throw new Error(`${label} must be a non-empty string`);
  return value;
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
