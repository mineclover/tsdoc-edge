/**
 * Immutable SQLite persistence for coverage metric baseline snapshots.
 *
 * @packageDocumentation
 * @doc [[Coverage Metrics Contract]]
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import {
  type CoverageMetricBaselineRevision,
  validateCoverageMetricBaseline,
} from '../metrics/CoverageMetricBaseline';

export const COVERAGE_METRIC_BASELINE_REPOSITORY_SCHEMA_VERSION = 1 as const;

/** Complete lookup identity for one persisted baseline. */
export interface CoverageMetricBaselinePin {
  readonly workspaceId: string;
  readonly baselineId: string;
}

export interface CoverageMetricBaselineRepositoryOptions {
  readonly clock?: () => Date;
  readonly readOnly?: boolean;
}

interface BaselineRow {
  workspace_id: string;
  baseline_id: string;
  repository_schema_version: number;
  payload_json: string;
  stored_at: string;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS coverage_metric_baselines (
  workspace_id TEXT NOT NULL,
  baseline_id TEXT NOT NULL,
  repository_schema_version INTEGER NOT NULL
    CHECK (repository_schema_version = ${COVERAGE_METRIC_BASELINE_REPOSITORY_SCHEMA_VERSION}),
  payload_json TEXT NOT NULL,
  stored_at TEXT NOT NULL,
  PRIMARY KEY (workspace_id, baseline_id)
);

CREATE INDEX IF NOT EXISTS idx_coverage_metric_baselines_workspace
  ON coverage_metric_baselines(workspace_id, stored_at);
`;

/** Stores immutable baselines without a mutable current pointer. */
export class CoverageMetricBaselineRepository {
  private readonly database: Database.Database;
  private readonly clock: () => Date;
  private readonly readOnly: boolean;

  constructor(
    readonly databasePath: string,
    options: CoverageMetricBaselineRepositoryOptions = {}
  ) {
    this.readOnly = options.readOnly ?? false;
    if (this.readOnly && databasePath === ':memory:') {
      throw new Error('A read-only CoverageMetricBaselineRepository requires an existing database');
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

  /** Store a baseline, rejecting an identity collision with a different payload. */
  storeBaseline(baseline: CoverageMetricBaselineRevision): CoverageMetricBaselineRevision {
    if (this.readOnly) {
      throw new Error('Cannot store a coverage metric baseline in a read-only repository');
    }
    const validated = validateCoverageMetricBaseline(baseline);
    const pin = { workspaceId: validated.workspaceId, baselineId: validated.baselineId };
    const existing = this.selectBaseline(pin);
    if (existing) {
      const persisted = this.materializeBaseline(existing);
      if (stableJson(persisted) !== stableJson(validated)) {
        throw new Error(`Coverage metric baseline identity collision: ${formatPin(pin)}`);
      }
      return persisted;
    }
    this.database
      .prepare(
        `INSERT INTO coverage_metric_baselines (
          workspace_id, baseline_id, repository_schema_version, payload_json, stored_at
        ) VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        validated.workspaceId,
        validated.baselineId,
        COVERAGE_METRIC_BASELINE_REPOSITORY_SCHEMA_VERSION,
        stableJson(validated),
        this.clock().toISOString()
      );
    return validated;
  }

  /** Read one baseline using workspace and baseline identity together. */
  readBaseline(pin: CoverageMetricBaselinePin): CoverageMetricBaselineRevision | null {
    validatePin(pin);
    const row = this.selectBaseline(pin);
    return row ? this.materializeBaseline(row) : null;
  }

  /** List baseline identities without loading their metric payloads. */
  listBaselinePins(workspaceId: string): readonly CoverageMetricBaselinePin[] {
    requiredText(workspaceId, 'workspaceId');
    return (
      this.database
        .prepare(
          `SELECT workspace_id, baseline_id FROM coverage_metric_baselines
           WHERE workspace_id = ? ORDER BY stored_at, baseline_id`
        )
        .all(workspaceId) as Array<{ workspace_id: string; baseline_id: string }>
    ).map((row) => ({ workspaceId: row.workspace_id, baselineId: row.baseline_id }));
  }

  close(): void {
    this.database.close();
  }

  private selectBaseline(pin: CoverageMetricBaselinePin): BaselineRow | undefined {
    return this.database
      .prepare(
        `SELECT * FROM coverage_metric_baselines
         WHERE workspace_id = ? AND baseline_id = ?`
      )
      .get(pin.workspaceId, pin.baselineId) as BaselineRow | undefined;
  }

  private materializeBaseline(row: BaselineRow): CoverageMetricBaselineRevision {
    if (row.repository_schema_version !== COVERAGE_METRIC_BASELINE_REPOSITORY_SCHEMA_VERSION) {
      throw new Error(
        `Unsupported coverage metric baseline schema: ${row.repository_schema_version}`
      );
    }
    const baseline = parseJson<CoverageMetricBaselineRevision>(row.payload_json);
    if (baseline.workspaceId !== row.workspace_id || baseline.baselineId !== row.baseline_id) {
      throw new Error(
        `Coverage metric baseline envelope mismatch: ${row.workspace_id}/${row.baseline_id}`
      );
    }
    return validateCoverageMetricBaseline(baseline);
  }
}

function validatePin(pin: CoverageMetricBaselinePin): void {
  requiredText(pin.workspaceId, 'workspaceId');
  requiredText(pin.baselineId, 'baselineId');
}

function formatPin(pin: CoverageMetricBaselinePin): string {
  return `${pin.workspaceId}/${pin.baselineId}`;
}

function requiredText(value: string, field: string): void {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Coverage metric baseline ${field} must be non-empty`);
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
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)])
    );
  }
  return value;
}
