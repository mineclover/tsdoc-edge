/**
 * Immutable persistence for source-identified coverage metric reports.
 *
 * @packageDocumentation
 * @doc [[Coverage Metrics Contract]]
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import {
  type CoverageMetricFileResult,
  type CoverageMetricResult,
  type CoverageSourceIdentity,
  deriveCoverageSourceIdentity,
} from '../metrics/CoverageMetricContract';

export const COVERAGE_METRIC_REPORT_REPOSITORY_SCHEMA_VERSION = 1 as const;

/** Complete lookup identity for one persisted coverage report. */
export interface CoverageMetricReportPin {
  readonly workspaceId: string;
  readonly reportId: string;
}

/** Immutable coverage report payload stored by the repository. */
export interface CoverageMetricReportRevision {
  readonly reportId: string;
  readonly workspaceId: string;
  readonly source: CoverageSourceIdentity;
  readonly metrics: readonly CoverageMetricResult[];
  readonly fileMetrics: readonly CoverageMetricFileResult[];
}

export interface CoverageMetricReportRepositoryOptions {
  readonly clock?: () => Date;
  readonly readOnly?: boolean;
}

interface ReportRow {
  workspace_id: string;
  report_id: string;
  repository_schema_version: number;
  source_json: string;
  metrics_json: string;
  file_metrics_json?: string;
  stored_at: string;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS coverage_metric_reports (
  workspace_id TEXT NOT NULL,
  report_id TEXT NOT NULL,
  repository_schema_version INTEGER NOT NULL
    CHECK (repository_schema_version = ${COVERAGE_METRIC_REPORT_REPOSITORY_SCHEMA_VERSION}),
  source_json TEXT NOT NULL,
  metrics_json TEXT NOT NULL,
  file_metrics_json TEXT NOT NULL DEFAULT '[]',
  stored_at TEXT NOT NULL,
  PRIMARY KEY (workspace_id, report_id)
);

CREATE INDEX IF NOT EXISTS idx_coverage_metric_reports_workspace
  ON coverage_metric_reports(workspace_id, stored_at);
`;

/** Stores source-identified reports without an active pointer or replacement. */
export class CoverageMetricReportRepository {
  private readonly database: Database.Database;
  private readonly clock: () => Date;
  private readonly readOnly: boolean;

  constructor(
    readonly databasePath: string,
    options: CoverageMetricReportRepositoryOptions = {}
  ) {
    this.readOnly = options.readOnly ?? false;
    if (this.readOnly && databasePath === ':memory:') {
      throw new Error('A read-only CoverageMetricReportRepository requires an existing database');
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
      this.database
        .transaction(() => {
          this.database.exec(SCHEMA_SQL);
          ensureFileMetricsColumn(this.database);
        })
        .immediate();
    }
  }

  /** Store one report, rejecting identity collisions with different payloads. */
  storeReport(report: CoverageMetricReportRevision): CoverageMetricReportRevision {
    if (this.readOnly) {
      throw new Error('Cannot store a coverage metric report in a read-only repository');
    }
    const validated = validateReport(report);
    const existing = this.selectReport({
      workspaceId: validated.workspaceId,
      reportId: validated.reportId,
    });
    if (existing) {
      const persisted = this.materializeReport(existing);
      if (stableJson(persisted) !== stableJson(validated)) {
        throw new Error(`Coverage metric report identity collision: ${formatPin(validated)}`);
      }
      return persisted;
    }

    this.database
      .prepare(
        `INSERT INTO coverage_metric_reports (
          workspace_id, report_id, repository_schema_version, source_json, metrics_json,
          file_metrics_json, stored_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        validated.workspaceId,
        validated.reportId,
        COVERAGE_METRIC_REPORT_REPOSITORY_SCHEMA_VERSION,
        stableJson(validated.source),
        stableJson(validated.metrics),
        stableJson(validated.fileMetrics),
        this.clock().toISOString()
      );
    return validated;
  }

  /** Read one report using workspace and report identity together. */
  readReport(pin: CoverageMetricReportPin): CoverageMetricReportRevision | null {
    validatePin(pin);
    const row = this.selectReport(pin);
    return row ? this.materializeReport(row) : null;
  }

  /** List report identities for one workspace without loading metric payloads. */
  listReportPins(workspaceId: string): readonly CoverageMetricReportPin[] {
    requiredText(workspaceId, 'workspaceId');
    return (
      this.database
        .prepare(
          `SELECT workspace_id, report_id FROM coverage_metric_reports
           WHERE workspace_id = ? ORDER BY stored_at, report_id`
        )
        .all(workspaceId) as Array<{ workspace_id: string; report_id: string }>
    ).map((row) => ({ workspaceId: row.workspace_id, reportId: row.report_id }));
  }

  close(): void {
    this.database.close();
  }

  private selectReport(pin: CoverageMetricReportPin): ReportRow | undefined {
    return this.database
      .prepare(
        `SELECT * FROM coverage_metric_reports
         WHERE workspace_id = ? AND report_id = ?`
      )
      .get(pin.workspaceId, pin.reportId) as ReportRow | undefined;
  }

  private materializeReport(row: ReportRow): CoverageMetricReportRevision {
    if (row.repository_schema_version !== COVERAGE_METRIC_REPORT_REPOSITORY_SCHEMA_VERSION) {
      throw new Error(
        `Unsupported coverage metric report schema: ${row.repository_schema_version}`
      );
    }
    return validateReport({
      workspaceId: row.workspace_id,
      reportId: row.report_id,
      source: parseJson<CoverageSourceIdentity>(row.source_json),
      metrics: parseJson<CoverageMetricResult[]>(row.metrics_json),
      fileMetrics: parseJson<CoverageMetricFileResult[]>(row.file_metrics_json ?? '[]'),
    });
  }
}

function validateReport(report: CoverageMetricReportRevision): CoverageMetricReportRevision {
  requiredText(report.workspaceId, 'workspaceId');
  requiredText(report.reportId, 'reportId');
  requiredText(report.source.sourceIdentity, 'source.sourceIdentity');
  if (report.reportId !== reportIdFor(report.source)) {
    throw new Error(`Coverage metric report identity mismatch: ${report.reportId}`);
  }
  if (report.source.sourceIdentity !== deriveCoverageSourceIdentity(report.source)) {
    throw new Error(`Coverage source identity mismatch: ${report.reportId}`);
  }
  if (report.metrics.length === 0) {
    throw new Error(`Coverage metric report has no metrics: ${report.reportId}`);
  }
  for (const metric of report.metrics) {
    if (metric.source.sourceIdentity !== report.source.sourceIdentity) {
      throw new Error(`Coverage metric source mismatch: ${report.reportId}`);
    }
  }
  for (const fileMetric of report.fileMetrics) {
    requiredText(fileMetric.filePath, 'fileMetrics.filePath');
    if (fileMetric.metrics.length === 0) {
      throw new Error(`Coverage file metric has no metrics: ${report.reportId}`);
    }
    for (const metric of fileMetric.metrics) {
      if (metric.source.sourceIdentity !== report.source.sourceIdentity) {
        throw new Error(`Coverage file metric source mismatch: ${report.reportId}`);
      }
    }
    for (const fn of fileMetric.functions ?? []) {
      requiredText(fn.name, 'fileMetrics.functions.name');
      if (!Number.isInteger(fn.startLine) || fn.startLine < 0) {
        throw new Error(`Coverage function start line is invalid: ${report.reportId}`);
      }
    }
  }
  return report;
}

function ensureFileMetricsColumn(database: Database.Database): void {
  const columns = database.prepare('PRAGMA table_info(coverage_metric_reports)').all() as Array<{
    name: string;
  }>;
  if (!columns.some((column) => column.name === 'file_metrics_json')) {
    database.exec(
      "ALTER TABLE coverage_metric_reports ADD COLUMN file_metrics_json TEXT NOT NULL DEFAULT '[]'"
    );
  }
}

function reportIdFor(source: CoverageSourceIdentity): string {
  return `coverage-report:${source.sourceIdentity}`;
}

function validatePin(pin: CoverageMetricReportPin): void {
  requiredText(pin.workspaceId, 'workspaceId');
  requiredText(pin.reportId, 'reportId');
}

function formatPin(pin: CoverageMetricReportPin): string {
  return `${pin.workspaceId}/${pin.reportId}`;
}

function requiredText(value: string, field: string): void {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Coverage metric report ${field} must be non-empty`);
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
