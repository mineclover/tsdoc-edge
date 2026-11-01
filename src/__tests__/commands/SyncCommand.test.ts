/**
 * Tests for SyncCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { BaseCommand, type CommandResult } from '../../commands/BaseCommand';
import { SyncCommand, type SyncPipelineReport } from '../../commands/SyncCommand';
import { ConfigManager } from '../../config/ConfigManager';

class StubStageCommand extends BaseCommand {
  public readonly calls: string[][] = [];

  constructor(
    private readonly name: string,
    private readonly handler: (args: string[]) => CommandResult = () => ({
      exitCode: 0,
      message: `${this.name} ok`,
    })
  ) {
    super();
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return `${this.name} stub`;
  }

  execute(args: string[]): Promise<CommandResult> {
    this.calls.push([...args]);
    return Promise.resolve(this.handler(args));
  }
}

describe('SyncCommand', () => {
  let tempDir: string;
  let configManager: ConfigManager;
  const originalCwd = process.cwd();

  beforeEach(() => {
    ConfigManager.reset();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-sync-test-'));
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'managed', 'specs'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'router.cjs'), 'module.exports = {};', 'utf8');

    const configPath = path.join(tempDir, '.tsdoc.config.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        project: { name: 'sync-test', version: '1.0.0', srcDirs: ['src'] },
        paths: {
          commentsDir: '.tsdoc-comments',
          databasePath: '.tsdoc.db',
          jsonlDir: 'docs/data',
        },
        documentManagement: {
          enabled: true,
          managedDirs: ['managed'],
        },
        specGovernance: {
          authoredSpecDirs: ['managed/specs'],
        },
        canonicalGraph: {
          routerModule: './router.cjs',
        },
      }),
      'utf8'
    );

    process.chdir(tempDir);
    configManager = ConfigManager.getInstance(tempDir, configPath);
  });

  afterEach(() => {
    ConfigManager.reset();
    jest.restoreAllMocks();
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('orchestrates build (with auto canonicalGraph), docs index/validate, spec extract, and backlinks', async () => {
    const buildStub = new StubStageCommand('build');
    const indexStub = new StubStageCommand('index-docs');
    const validateStub = new StubStageCommand('validate-docs');
    const specStub = new StubStageCommand('spec-extract');
    const backlinksStub = new StubStageCommand('update-backlinks');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    const command = new SyncCommand({
      configManager,
      buildCommandFactory: () => buildStub,
      indexDocsCommandFactory: () => indexStub,
      validateDocsCommandFactory: () => validateStub,
      specExtractCommandFactory: () => specStub,
      updateBacklinksCommandFactory: () => backlinksStub,
    });

    const result = await command.execute(['--force', '--json']);

    expect(result.exitCode).toBe(0);
    expect(buildStub.calls).toEqual([['src', '--force', '--canonical-graph']]);
    expect(indexStub.calls).toEqual([['managed']]);
    expect(validateStub.calls).toEqual([['managed']]);
    expect(specStub.calls).toEqual([[]]);
    expect(backlinksStub.calls).toEqual([['managed']]);

    const jsonOutput = logSpy.mock.calls.flat().join('\n');
    const parsed: unknown = JSON.parse(jsonOutput);
    const report = parsed as SyncPipelineReport;
    expect(report.status).toBe('passed');
    expect(report.mode).toBe('write');
    expect(report.canonicalGraphEnabled).toBe(true);
    expect(report.stages.map((s) => `${s.stage}:${s.status}`)).toEqual([
      'build:passed',
      'docs:passed',
      'backlinks:passed',
      'specs:passed',
    ]);
  });

  it('skips build and spec writes in --check mode and forwards --check to backlinks', async () => {
    const buildStub = new StubStageCommand('build');
    const indexStub = new StubStageCommand('index-docs');
    const validateStub = new StubStageCommand('validate-docs');
    const specStub = new StubStageCommand('spec-extract');
    const backlinksStub = new StubStageCommand('update-backlinks', () => ({
      exitCode: 1,
      message: 'Backlinks out of sync in 2 document(s)',
    }));
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    const command = new SyncCommand({
      configManager,
      buildCommandFactory: () => buildStub,
      indexDocsCommandFactory: () => indexStub,
      validateDocsCommandFactory: () => validateStub,
      specExtractCommandFactory: () => specStub,
      updateBacklinksCommandFactory: () => backlinksStub,
    });

    const result = await command.execute(['--check', '--json']);

    expect(result.exitCode).toBe(1);
    expect(buildStub.calls).toEqual([]);
    expect(indexStub.calls).toEqual([]);
    expect(validateStub.calls).toEqual([['managed']]);
    expect(specStub.calls).toEqual([]);
    expect(backlinksStub.calls).toEqual([['managed', '--check']]);

    const parsed: unknown = JSON.parse(logSpy.mock.calls.flat().join('\n'));
    const report = parsed as SyncPipelineReport;
    expect(report.status).toBe('failed');
    expect(report.mode).toBe('check');
  });

  it('rejects unknown flags fail-closed without executing stages', async () => {
    const buildStub = new StubStageCommand('build');
    jest.spyOn(console, 'log').mockImplementation(() => undefined);

    const command = new SyncCommand({
      configManager,
      buildCommandFactory: () => buildStub,
    });

    const result = await command.execute(['--unknown-flag']);

    expect(result.exitCode).toBe(1);
    expect(result.message).toContain('Unknown option');
    expect(buildStub.calls).toEqual([]);
  });

  it('skips a missing config-only local router without failing sync', async () => {
    const configPath = path.join(tempDir, '.tsdoc.config.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        project: { name: 'sync-test', version: '1.0.0', srcDirs: ['src'] },
        paths: { commentsDir: '.tsdoc-comments', databasePath: '.tsdoc.db', jsonlDir: 'docs/data' },
        documentManagement: { enabled: true, managedDirs: ['managed'] },
        specGovernance: { authoredSpecDirs: ['managed/specs'] },
        canonicalGraph: { routerModule: './missing-router.cjs' },
      }),
      'utf8'
    );
    ConfigManager.reset();
    configManager = ConfigManager.getInstance(tempDir, configPath);
    const buildStub = new StubStageCommand('build');
    const command = new SyncCommand({
      configManager,
      buildCommandFactory: () => buildStub,
      indexDocsCommandFactory: () => new StubStageCommand('index-docs'),
      validateDocsCommandFactory: () => new StubStageCommand('validate-docs'),
      specExtractCommandFactory: () => new StubStageCommand('spec-extract'),
      updateBacklinksCommandFactory: () => new StubStageCommand('update-backlinks'),
    });

    const result = await command.execute(['--force', '--skip-specs', '--skip-backlinks']);

    expect(result.exitCode).toBe(0);
    expect(buildStub.calls).toEqual([['src', '--force']]);
  });
});
