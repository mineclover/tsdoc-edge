/**
 * Tests for CoverageReportCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { CoverageReportCommand } from '../../commands/CoverageReportCommand';
import {
  createCoverageMetricResult,
  createCoverageSourceIdentity,
} from '../../metrics/CoverageMetricContract';
import { CoverageMetricReportRepository } from '../../storage/CoverageMetricReportRepository';

describe('CoverageReportCommand', () => {
  const originalCwd = process.cwd();
  let command: CoverageReportCommand;
  let workspace: string;
  let reportDatabase: string;
  let reportId: string;
  let log: jest.SpyInstance;

  beforeEach(() => {
    workspace = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-edge-coverage-report-command-'))
    );
    process.chdir(workspace);
    reportDatabase = path.join(workspace, 'coverage-metrics.db');
    const source = createCoverageSourceIdentity('coverage.json', '{"fixture":true}', {
      workspaceId: 'workspace',
      capturedAt: '2026-07-14T00:00:00.000Z',
    });
    reportId = `coverage-report:${source.sourceIdentity}`;
    const reports = new CoverageMetricReportRepository(reportDatabase);
    reports.storeReport({
      reportId,
      workspaceId: 'workspace',
      source,
      metrics: [createCoverageMetricResult(source, 'execution.line', 3, 4)],
      fileMetrics: [],
    });
    reports.close();
    command = new CoverageReportCommand();
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    log.mockRestore();
    process.chdir(originalCwd);
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('coverage-report');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
    });

    it('lists and reads persisted reports through the read-only operator path', async () => {
      const modifiedBefore = fs.statSync(reportDatabase).mtimeMs;
      expect(fs.existsSync(path.join(workspace, '.tsdoc.db'))).toBe(false);
      const listed = await command.execute([
        'list',
        '--workspace',
        'workspace',
        '--report-db',
        reportDatabase,
        '--json',
      ]);
      const listedOutput = JSON.parse(log.mock.calls.flat().join('\n')) as {
        pins: Array<{ workspaceId: string; reportId: string }>;
      };
      expect(listed).toEqual({ exitCode: 0, message: 'Coverage reports listed: 1' });
      expect(listedOutput.pins).toEqual([{ workspaceId: 'workspace', reportId }]);
      expect(fs.statSync(reportDatabase).mtimeMs).toBe(modifiedBefore);
      expect(fs.existsSync(path.join(workspace, '.tsdoc.db'))).toBe(false);

      log.mockClear();
      const read = await command.execute([
        'read',
        '--workspace',
        'workspace',
        '--report-db',
        reportDatabase,
        '--report-id',
        reportId,
        '--json',
      ]);
      const readOutput = JSON.parse(log.mock.calls.flat().join('\n')) as {
        report: { reportId: string; workspaceId: string; metrics: unknown[] };
      };
      expect(read).toEqual({ exitCode: 0, message: `Coverage report read: ${reportId}` });
      expect(readOutput.report).toMatchObject({
        reportId,
        workspaceId: 'workspace',
      });
      expect(readOutput.report.metrics).toHaveLength(1);
      expect(fs.statSync(reportDatabase).mtimeMs).toBe(modifiedBefore);
    });

    it('rejects unknown options and extra positional arguments before opening storage', async () => {
      const unknown = await command.execute(['list', '--unknown', '--json']);
      expect(unknown).toMatchObject({
        exitCode: 2,
        message: 'Unknown coverage-report option: --unknown',
      });

      const extra = await command.execute(['list', 'unexpected', '--json']);
      expect(extra).toMatchObject({
        exitCode: 2,
        message: 'Unexpected coverage-report argument: unexpected',
      });
      expect(fs.existsSync(path.join(workspace, '.tsdoc.db'))).toBe(false);
    });

    it('reports a missing persisted report database without opening SQLite', async () => {
      const missingDatabase = path.join(workspace, 'missing-coverage-metrics.db');

      const result = await command.execute(['list', '--report-db', missingDatabase, '--json']);

      expect(result).toMatchObject({
        exitCode: 2,
        message: `Coverage report database not found: ${missingDatabase}`,
      });
      expect(fs.existsSync(missingDatabase)).toBe(false);
    });
  });
});
