import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { CoverageBaselineCommand } from '../../commands/CoverageBaselineCommand';
import {
  createCoverageMetricResult,
  createCoverageSourceIdentity,
} from '../../metrics/CoverageMetricContract';
import {
  CoverageMetricReportRepository,
  type CoverageMetricReportRevision,
} from '../../storage/CoverageMetricReportRepository';

describe('CoverageBaselineCommand', () => {
  const originalCwd = process.cwd();
  let workspace: string;
  let reportDatabase: string;
  let baselineDatabase: string;
  let log: jest.SpyInstance;
  let report: CoverageMetricReportRevision;

  beforeEach(() => {
    workspace = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-edge-coverage-baseline-command-'))
    );
    process.chdir(workspace);
    reportDatabase = path.join(workspace, 'reports.db');
    baselineDatabase = path.join(workspace, 'baselines.db');
    const source = createCoverageSourceIdentity('coverage-final.json', '{"fixture":true}', {
      workspaceId: 'workspace',
      capturedAt: '2026-07-14T00:00:00.000Z',
    });
    report = {
      reportId: `coverage-report:${source.sourceIdentity}`,
      workspaceId: 'workspace',
      source,
      metrics: [createCoverageMetricResult(source, 'execution.line', 3, 4)],
      fileMetrics: [],
    };
    const repository = new CoverageMetricReportRepository(reportDatabase);
    repository.storeReport(report);
    repository.close();
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    log.mockRestore();
    process.chdir(originalCwd);
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it('saves a report as an immutable baseline and compares it through the CLI', async () => {
    const save = await new CoverageBaselineCommand().execute([
      'save',
      '--workspace',
      'workspace',
      '--report-db',
      reportDatabase,
      '--baseline-db',
      baselineDatabase,
      '--report-id',
      report.reportId,
      '--json',
    ]);
    const saved = JSON.parse(log.mock.calls.flat().join('\n')) as { baselineId: string };
    log.mockClear();
    const modifiedBefore = fs.statSync(baselineDatabase).mtimeMs;
    const listed = await new CoverageBaselineCommand().execute([
      'list',
      '--workspace',
      'workspace',
      '--baseline-db',
      baselineDatabase,
      '--json',
    ]);
    const listedOutput = JSON.parse(log.mock.calls.flat().join('\n')) as {
      pins: Array<{ workspaceId: string; baselineId: string }>;
    };
    expect(listed).toEqual({ exitCode: 0, message: 'Coverage baselines listed: 1' });
    expect(listedOutput.pins).toEqual([{ workspaceId: 'workspace', baselineId: saved.baselineId }]);
    expect(fs.statSync(baselineDatabase).mtimeMs).toBe(modifiedBefore);
    log.mockClear();

    const read = await new CoverageBaselineCommand().execute([
      'read',
      '--workspace',
      'workspace',
      '--baseline-db',
      baselineDatabase,
      '--baseline-id',
      saved.baselineId,
      '--json',
    ]);
    const readOutput = JSON.parse(log.mock.calls.flat().join('\n')) as {
      baseline: { baselineId: string; workspaceId: string };
    };
    expect(read).toEqual({
      exitCode: 0,
      message: `Coverage baseline read: ${saved.baselineId}`,
    });
    expect(readOutput.baseline).toMatchObject({
      baselineId: saved.baselineId,
      workspaceId: 'workspace',
    });
    log.mockClear();

    const compare = await new CoverageBaselineCommand().execute([
      'compare',
      '--workspace',
      'workspace',
      '--report-db',
      reportDatabase,
      '--baseline-db',
      baselineDatabase,
      '--report-id',
      report.reportId,
      '--baseline-id',
      saved.baselineId,
      '--json',
    ]);
    const compared = JSON.parse(log.mock.calls.flat().join('\n')) as {
      comparisons: Array<{ metricId: string; status: string; delta: number }>;
    };

    expect(save.exitCode).toBe(0);
    expect(compare.exitCode).toBe(0);
    expect(compared.comparisons).toEqual([
      {
        metricId: 'execution.line',
        status: 'unchanged',
        baselineValue: report.metrics[0].value,
        currentValue: report.metrics[0].value,
        delta: 0,
      },
    ]);
  });

  it('fails closed when a compare input is incomplete', async () => {
    const result = await new CoverageBaselineCommand().execute([
      'compare',
      '--workspace',
      'workspace',
      '--report-db',
      reportDatabase,
      '--baseline-db',
      baselineDatabase,
      '--report-id',
      report.reportId,
    ]);

    expect(result.exitCode).toBe(2);
    expect(result.message).toBe('--baseline-id is required for compare');
  });

  it('does not create a writable baseline database when the source report is missing', async () => {
    const result = await new CoverageBaselineCommand().execute([
      'save',
      '--workspace',
      'workspace',
      '--report-db',
      reportDatabase,
      '--baseline-db',
      baselineDatabase,
      '--report-id',
      'coverage-report:missing',
    ]);

    expect(result.exitCode).toBe(2);
    expect(result.message).toBe('Coverage report not found: workspace/coverage-report:missing');
    expect(fs.existsSync(baselineDatabase)).toBe(false);
  });

  it('reports missing read-only databases without opening SQLite', async () => {
    const missingBaseline = path.join(workspace, 'missing-baselines.db');
    const listed = await new CoverageBaselineCommand().execute([
      'list',
      '--workspace',
      'workspace',
      '--baseline-db',
      missingBaseline,
      '--json',
    ]);

    expect(listed).toMatchObject({
      exitCode: 2,
      message: `Coverage baseline database not found: ${missingBaseline}`,
    });
    expect(fs.existsSync(missingBaseline)).toBe(false);

    const missingReport = path.join(workspace, 'missing-reports.db');
    const saved = await new CoverageBaselineCommand().execute([
      'save',
      '--workspace',
      'workspace',
      '--report-db',
      missingReport,
      '--baseline-db',
      baselineDatabase,
      '--report-id',
      report.reportId,
      '--json',
    ]);

    expect(saved).toMatchObject({
      exitCode: 2,
      message: `Coverage report database not found: ${missingReport}`,
    });
    expect(fs.existsSync(missingReport)).toBe(false);
    expect(fs.existsSync(baselineDatabase)).toBe(false);
  });
});
