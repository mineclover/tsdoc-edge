import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import {
  type CoverageMetricBaselineRevision,
  createCoverageMetricBaseline,
} from '../../metrics/CoverageMetricBaseline';
import {
  createCoverageMetricResult,
  createCoverageSourceIdentity,
} from '../../metrics/CoverageMetricContract';
import {
  COVERAGE_METRIC_BASELINE_REPOSITORY_SCHEMA_VERSION,
  CoverageMetricBaselineRepository,
} from '../../storage/CoverageMetricBaselineRepository';

describe('CoverageMetricBaselineRepository', () => {
  let tempDir: string;
  let databasePath: string;
  let repository: CoverageMetricBaselineRepository;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-edge-coverage-baselines-'))
    );
    databasePath = path.join(tempDir, 'coverage-baselines.db');
    repository = new CoverageMetricBaselineRepository(databasePath, {
      clock: () => new Date('2026-07-14T00:00:00.000Z'),
    });
  });

  afterEach(() => {
    repository.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('stores immutable baselines and lists scoped pins', () => {
    const baseline = coverageBaseline('workspace');

    expect(repository.storeBaseline(baseline)).toEqual(baseline);
    expect(
      repository.readBaseline({ workspaceId: 'workspace', baselineId: baseline.baselineId })
    ).toEqual(baseline);
    expect(repository.listBaselinePins('workspace')).toEqual([
      { workspaceId: 'workspace', baselineId: baseline.baselineId },
    ]);
    expect(
      repository.readBaseline({ workspaceId: 'other', baselineId: baseline.baselineId })
    ).toBeNull();

    const database = new Database(databasePath, { readonly: true });
    const row = database
      .prepare(
        `SELECT repository_schema_version, stored_at FROM coverage_metric_baselines
         WHERE workspace_id = ? AND baseline_id = ?`
      )
      .get('workspace', baseline.baselineId) as {
      repository_schema_version: number;
      stored_at: string;
    };
    database.close();

    expect(row).toEqual({
      repository_schema_version: COVERAGE_METRIC_BASELINE_REPOSITORY_SCHEMA_VERSION,
      stored_at: '2026-07-14T00:00:00.000Z',
    });
  });

  it('is idempotent for the same payload and rejects a forged identity', () => {
    const baseline = coverageBaseline('workspace');
    const changed = {
      ...baseline,
      metrics: [createCoverageMetricResult(baseline.metrics[0].source, 'execution.line', 2, 3)],
    } satisfies CoverageMetricBaselineRevision;

    expect(repository.storeBaseline(baseline)).toEqual(baseline);
    expect(repository.storeBaseline(baseline)).toEqual(baseline);
    expect(() => repository.storeBaseline(changed)).toThrow('identity mismatch');
  });

  it('supports pinned reads but no writes in read-only mode', () => {
    const baseline = coverageBaseline('workspace');
    repository.storeBaseline(baseline);
    repository.close();

    repository = new CoverageMetricBaselineRepository(databasePath, { readOnly: true });
    expect(
      repository.readBaseline({ workspaceId: 'workspace', baselineId: baseline.baselineId })
    ).toEqual(baseline);
    expect(() => repository.storeBaseline(baseline)).toThrow('read-only repository');
    expect(
      () =>
        new CoverageMetricBaselineRepository(path.join(tempDir, 'missing', 'baselines.db'), {
          readOnly: true,
        })
    ).toThrow();
  });
});

function coverageBaseline(workspaceId: string): CoverageMetricBaselineRevision {
  const source = createCoverageSourceIdentity('coverage/coverage-final.json', '{"fixture":true}', {
    workspaceId,
    capturedAt: '2026-07-14T00:00:00.000Z',
  });
  return createCoverageMetricBaseline({
    workspaceId,
    reportId: 'coverage-report:fixture',
    metrics: [
      createCoverageMetricResult(source, 'execution.line', 1, 2),
      createCoverageMetricResult(source, 'execution.function', 1, 1),
    ],
    capturedAt: '2026-07-14T00:00:00.000Z',
  });
}
