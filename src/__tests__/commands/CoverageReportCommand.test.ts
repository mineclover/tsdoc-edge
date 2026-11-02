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
import type { TSDocParser } from '../../parser/TSDocParser';
import { CoverageMetricReportRepository } from '../../storage/CoverageMetricReportRepository';
import type { DatabaseManager } from '../../storage/DatabaseManager';
import type { Symbol } from '../../types/graph';

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

    it('excludes test symbols by default, accepts --include-tests, caches per-file parses, and reports direct vs module @doc coverage', async () => {
      const srcDir = path.join(workspace, 'src', 'commands');
      const testDir = path.join(workspace, 'src', '__tests__');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.mkdirSync(testDir, { recursive: true });

      const moduleDocFile = path.join(srcDir, 'SampleCommand.ts');
      fs.writeFileSync(
        moduleDocFile,
        `/**
 * Sample command module
 * @packageDocumentation
 * @doc [[SampleCommand]]
 */

/**
 * Sample command class
 * @doc [[SampleCommand]]
 * @public
 */
export class SampleCommand {}

/**
 * Internal helper options without direct \`@doc\`
 */
interface InternalOptions {
  verbose: boolean;
}
`,
        'utf-8'
      );

      const undocFile = path.join(workspace, 'src', 'plainUtil.ts');
      fs.writeFileSync(
        undocFile,
        `export function plainUtil(): string {
  return 'ok';
}
`,
        'utf-8'
      );

      const testFile = path.join(testDir, 'SampleCommand.test.ts');
      fs.writeFileSync(testFile, `describe('SampleCommand', () => { it('works', () => {}); });\n`);

      const fixtureSymbols: Symbol[] = [
        {
          id: 'cmd-1',
          name: 'SampleCommand',
          type: 'class',
          filePath: moduleDocFile,
          line: 12,
          column: 0,
          isExported: true,
          isPublic: true,
          summary: 'Sample command class',
          tests: [],
          designDecisions: [],
        },
        {
          id: 'opt-1',
          name: 'InternalOptions',
          type: 'interface',
          filePath: moduleDocFile,
          line: 17,
          column: 0,
          isExported: false,
          isPublic: true,
          summary: 'Internal helper options without direct @doc',
          tests: [],
          designDecisions: [],
        },
        {
          id: 'util-1',
          name: 'plainUtil',
          type: 'function',
          filePath: undocFile,
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
        {
          id: 'suite-1',
          name: 'SampleCommand suite',
          type: 'test-suite',
          filePath: testFile,
          line: 1,
          column: 0,
          isExported: false,
          isPublic: false,
          tests: [],
          designDecisions: [],
        },
        {
          id: 'case-1',
          name: 'works',
          type: 'test-case',
          filePath: testFile,
          line: 1,
          column: 33,
          isExported: false,
          isPublic: false,
          tests: [],
          designDecisions: [],
        },
      ];

      const stubDb = {
        getAllSymbols: () => fixtureSymbols,
      } as unknown as DatabaseManager;
      const reportCommand = new CoverageReportCommand(stubDb);
      const internalParser = (reportCommand as unknown as { parser: TSDocParser }).parser;
      const parseStringSpy = jest.spyOn(internalParser, 'parseString');

      // 1. Default run excludes test-suite/test-case and __tests__ symbols
      log.mockClear();
      const defaultResult = await reportCommand.execute(['--json']);
      expect(defaultResult.exitCode).toBe(0);

      // SampleCommand.ts has 3 JSDoc blocks and 2 symbols; caching parses each JSDoc block only once (3 calls, not 6)
      expect(parseStringSpy).toHaveBeenCalledTimes(3);
      parseStringSpy.mockRestore();

      const defaultReport = JSON.parse(log.mock.calls.flat().join('\n')) as {
        overall: { total: number; documented: number; coverage: number };
        effectiveOverall: { total: number; documented: number; coverage: number };
        moduleCoverage: { totalFiles: number; documentedFiles: number; coverage: number };
        undocumentedSymbols: Array<{ name: string; priority: string }>;
      };

      expect(defaultReport.overall).toMatchObject({
        total: 3,
        documented: 1,
      });
      expect(defaultReport.effectiveOverall).toMatchObject({
        total: 3,
        documented: 2,
      });
      expect(defaultReport.moduleCoverage).toMatchObject({
        totalFiles: 2,
        documentedFiles: 1,
        coverage: 50,
      });
      // InternalOptions is unexported (isExported: false), so priority is 'low', while exported plainUtil is 'high'
      const internalEntry = defaultReport.undocumentedSymbols.find(
        (s) => s.name === 'InternalOptions'
      );
      const publicUtilEntry = defaultReport.undocumentedSymbols.find((s) => s.name === 'plainUtil');
      expect(internalEntry?.priority).toBe('low');
      expect(publicUtilEntry?.priority).toBe('high');

      // 2. --include-tests includes test-suite and test-case symbols (and rejects duplicate --include-tests)
      log.mockClear();
      const withTestsResult = await reportCommand.execute(['--include-tests', '--json']);
      expect(withTestsResult.exitCode).toBe(0);
      const withTestsReport = JSON.parse(log.mock.calls.flat().join('\n')) as {
        overall: { total: number; documented: number };
        moduleCoverage: { totalFiles: number; documentedFiles: number };
      };
      expect(withTestsReport.overall.total).toBe(5);
      expect(withTestsReport.moduleCoverage.totalFiles).toBe(3);

      const duplicateFlag = await reportCommand.execute(['--include-tests', '--include-tests']);
      expect(duplicateFlag).toMatchObject({
        exitCode: 2,
        message: 'Duplicate coverage-report option: --include-tests',
      });

      // 3. Human-readable terminal output displays Direct, Effective, and Source File coverage
      log.mockClear();
      const humanResult = await reportCommand.execute([]);
      expect(humanResult.exitCode).toBe(0);
      const rendered = log.mock.calls.flat().join('\n');
      expect(rendered).toContain('Direct Symbol @doc Coverage');
      expect(rendered).toContain('Module-Linked Effective Coverage');
      expect(rendered).toContain('Source File @doc Coverage');
    });
  });
});
