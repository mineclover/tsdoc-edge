/**
 * Tests for SyncCoverageCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { SyncCoverageCommand } from '../../commands/SyncCoverageCommand';
import type { DatabaseManager } from '../../storage/DatabaseManager';

const hasAnsi = (text: string): boolean => text.includes('\x1b[');

describe('SyncCoverageCommand', () => {
  let command: SyncCoverageCommand;

  beforeEach(() => {
    command = new SyncCoverageCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('sync-coverage');
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

    it('should document --human in the usage text', () => {
      expect((command as unknown as { getUsage(): string }).getUsage()).toContain('--human');
    });
  });

  describe('output modes', () => {
    let tempDir: string;
    let coverageFile: string;
    let log: jest.SpyInstance;

    const run = async (args: string[]): Promise<{ exitCode: number; output: string }> => {
      log.mockClear();
      // An injected database manager keeps the test independent of any project database
      const result = await new SyncCoverageCommand({} as DatabaseManager).execute(args);
      return { exitCode: result.exitCode, output: log.mock.calls.flat().join('\n') };
    };

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-sync-coverage-'));
      coverageFile = path.join(tempDir, 'coverage-final.json');
      fs.writeFileSync(coverageFile, JSON.stringify({ 'src/a.ts': {}, 'src/b.ts': {} }), 'utf-8');
      log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    afterEach(() => {
      log.mockRestore();
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('prints only an XML document by default', async () => {
      const { exitCode, output } = await run([coverageFile]);

      expect(exitCode).toBe(0);
      expect(output.startsWith('<sync-coverage>')).toBe(true);
      expect(output.endsWith('</sync-coverage>')).toBe(true);
      expect(output).toContain('<fileCount>2</fileCount>');
      expect(output).toContain('<format>Istanbul/NYC</format>');
      expect(output).toContain(`<file>${coverageFile}</file>`);
      expect(hasAnsi(output)).toBe(false);
      expect(output).not.toContain('Sync Test Coverage');
    });

    it('accepts --human before the coverage file', async () => {
      const { exitCode, output } = await run(['--human', coverageFile]);

      expect(exitCode).toBe(0);
      expect(output).toContain('Coverage File Read');
    });

    it('keeps the colored report behind --human', async () => {
      const { exitCode, output } = await run([coverageFile, '--human']);

      expect(exitCode).toBe(0);
      expect(output).toContain('Sync Test Coverage');
      expect(output).toContain('Coverage File Read');
      expect(hasAnsi(output)).toBe(true);
      expect(output).not.toContain('<sync-coverage>');
    });

    it('fails for a missing coverage file in both modes', async () => {
      const missing = path.join(tempDir, 'missing.json');

      for (const args of [[missing], [missing, '--human']]) {
        const { exitCode, output } = await run(args);
        expect(exitCode).toBe(1);
        expect(output).not.toContain('<sync-coverage>');
      }
    });
  });
});
