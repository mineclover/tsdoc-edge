import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import {
  createCoverageMetricResult,
  createCoverageSourceIdentity,
} from '../../metrics/CoverageMetricContract';
import {
  COVERAGE_METRIC_REPORT_REPOSITORY_SCHEMA_VERSION,
  CoverageMetricReportRepository,
  type CoverageMetricReportRevision,
} from '../../storage/CoverageMetricReportRepository';

describe('CoverageMetricReportRepository', () => {
  let tempDir: string;
  let databasePath: string;
  let repository: CoverageMetricReportRepository;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-edge-coverage-reports-'))
    );
    databasePath = path.join(tempDir, 'coverage-reports.db');
    repository = new CoverageMetricReportRepository(databasePath, {
      clock: () => new Date('2026-07-14T00:00:00.000Z'),
    });
  });

  afterEach(() => {
    repository.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('stores and reads a source-identified report without an active pointer', () => {
    const report = coverageReport('workspace');

    expect(repository.storeReport(report)).toEqual(report);
    expect(repository.readReport({ workspaceId: 'workspace', reportId: report.reportId })).toEqual(
      report
    );
    expect(repository.listReportPins('workspace')).toEqual([
      { workspaceId: 'workspace', reportId: report.reportId },
    ]);
    expect(repository.readReport({ workspaceId: 'other', reportId: report.reportId })).toBeNull();

    const database = new Database(databasePath, { readonly: true });
    const row = database
      .prepare(
        `SELECT repository_schema_version, stored_at FROM coverage_metric_reports
         WHERE workspace_id = ? AND report_id = ?`
      )
      .get('workspace', report.reportId) as {
      repository_schema_version: number;
      stored_at: string;
    };
    database.close();

    expect(row).toEqual({
      repository_schema_version: COVERAGE_METRIC_REPORT_REPOSITORY_SCHEMA_VERSION,
      stored_at: '2026-07-14T00:00:00.000Z',
    });
  });

  it('is idempotent for the same payload and rejects an identity collision', () => {
    const report = coverageReport('workspace');
    const changed = {
      ...report,
      metrics: [createCoverageMetricResult(report.source, 'execution.line', 2, 3)],
    } satisfies CoverageMetricReportRevision;

    expect(repository.storeReport(report)).toEqual(report);
    expect(repository.storeReport(report)).toEqual(report);
    expect(() => repository.storeReport(changed)).toThrow('identity collision');
  });

  it('rejects forged source and cross-report metric identities', () => {
    const report = coverageReport('workspace');
    const forgedSource = {
      ...report.source,
      sourceIdentity: 'coverage-source:forged',
    };

    expect(() => repository.storeReport({ ...report, source: forgedSource })).toThrow(
      'identity mismatch'
    );

    const otherSource = createCoverageSourceIdentity('other.json', '{}', {
      workspaceId: 'workspace',
    });
    expect(() =>
      repository.storeReport({
        ...report,
        metrics: [createCoverageMetricResult(otherSource, 'execution.line', 1, 1)],
      })
    ).toThrow('source mismatch');
  });

  it('supports pinned reads but no writes in read-only mode', () => {
    const report = coverageReport('workspace');
    repository.storeReport(report);
    repository.close();

    repository = new CoverageMetricReportRepository(databasePath, { readOnly: true });
    expect(repository.readReport({ workspaceId: 'workspace', reportId: report.reportId })).toEqual(
      report
    );
    expect(() => repository.storeReport(report)).toThrow('read-only repository');
    expect(
      () =>
        new CoverageMetricReportRepository(path.join(tempDir, 'missing', 'reports.db'), {
          readOnly: true,
        })
    ).toThrow();
  });
});

function coverageReport(workspaceId: string): CoverageMetricReportRevision {
  const source = createCoverageSourceIdentity('coverage/coverage-final.json', '{"fixture":true}', {
    workspaceId,
    capturedAt: '2026-07-14T00:00:00.000Z',
  });
  return {
    reportId: `coverage-report:${source.sourceIdentity}`,
    workspaceId,
    source,
    metrics: [
      createCoverageMetricResult(source, 'execution.line', 1, 2),
      createCoverageMetricResult(source, 'execution.function', 1, 1),
      createCoverageMetricResult(source, 'execution.branch', 0, 1),
    ],
    fileMetrics: [
      {
        filePath: '/workspace/src/fixture.ts',
        metrics: [createCoverageMetricResult(source, 'execution.line', 1, 2)],
      },
    ],
  };
}
