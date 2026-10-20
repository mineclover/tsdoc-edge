/**
 * Tests for SystemStatusCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { SystemStatusCommand } from '../../commands/SystemStatusCommand';
import { DatabaseManager } from '../../storage/DatabaseManager';

const hasAnsi = (text: string): boolean => text.includes('\x1b[');

describe('SystemStatusCommand', () => {
  let command: SystemStatusCommand;

  beforeEach(() => {
    command = new SystemStatusCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('system-status');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toContain('status');
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
    });

    it('should document --human in the usage text', () => {
      expect((command as unknown as { getUsage(): string }).getUsage()).toContain('--human');
    });
  });

  describe('output modes', () => {
    const originalCwd = process.cwd();
    let tempDir: string;
    let log: jest.SpyInstance;

    const run = async (args: string[]): Promise<{ exitCode: number; output: string }> => {
      log.mockClear();
      const result = await command.execute(args);
      return { exitCode: result.exitCode, output: log.mock.calls.flat().join('\n') };
    };

    beforeEach(() => {
      tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-system-status-')));
      new DatabaseManager(path.join(tempDir, '.tsdoc.db')).close();
      process.chdir(tempDir);
      log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    afterEach(() => {
      log.mockRestore();
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('prints only an XML document by default', async () => {
      const { exitCode, output } = await run([]);

      expect(exitCode).toBe(0);
      expect(output.startsWith('<system-status>')).toBe(true);
      expect(output.endsWith('</system-status>')).toBe(true);
      expect(output).toContain('<symbolCount>0</symbolCount>');
      expect(output).toContain('<healthGrade>');
      expect(output).toContain('<symbols>');
      expect(hasAnsi(output)).toBe(false);
      expect(output).not.toContain('System Status');
    });

    it('prints a compact XML summary with --compact', async () => {
      const { exitCode, output } = await run(['--compact']);

      expect(exitCode).toBe(0);
      expect(output).toContain('<system-status>');
      expect(output).toContain('<summary>');
      expect(output).not.toContain('<healthFactors');
      expect(hasAnsi(output)).toBe(false);
    });

    it('keeps the colored report behind --human', async () => {
      const { exitCode, output } = await run(['--human']);

      expect(exitCode).toBe(0);
      expect(output).toContain('TSDoc Edge - System Status');
      expect(output).toContain('Quick Commands');
      expect(hasAnsi(output)).toBe(true);
      expect(output).not.toContain('<system-status>');
    });

    it('keeps the one-line summary behind --human --compact', async () => {
      const { exitCode, output } = await run(['--human', '--compact']);

      expect(exitCode).toBe(0);
      expect(output).toContain('Health:');
      expect(output.split('\n')).toHaveLength(1);
      expect(output).not.toContain('<system-status>');
    });

    it('still prefers --json over the other modes', async () => {
      const { exitCode, output } = await run(['--json', '--human']);

      expect(exitCode).toBe(0);
      expect(JSON.parse(output)).toHaveProperty('symbols.total', 0);
    });

    it('fails without printing a document when the database is missing', async () => {
      fs.rmSync(path.join(tempDir, '.tsdoc.db'));

      const { exitCode, output } = await run([]);

      expect(exitCode).toBe(1);
      expect(output).not.toContain('<system-status>');
    });
  });
});
