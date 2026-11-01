/**
 * Tests for FixCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { CodeHealthChecker } from '../../analyzer/CodeHealthChecker';
import { FixCommand } from '../../commands/FixCommand';

describe('FixCommand', () => {
  let command: FixCommand;
  let tempDir: string;
  const originalCwd = process.cwd();

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fix-command-test-'));
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    process.chdir(tempDir);
    command = new FixCommand();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('fix');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
    });

    it('defaults targetPath to src when invoked as fix --dry-run or fix -n without directory arg', async () => {
      const analyzeMock = jest.fn().mockReturnValue({ docScores: [] });
      const mockChecker = { analyze: analyzeMock } as unknown as CodeHealthChecker;
      command = new FixCommand(mockChecker);
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      const dryRunRes = await command.execute(['--dry-run']);
      expect(dryRunRes.exitCode).toBe(0);
      expect(analyzeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          path: 'src',
          minQualityScore: 70,
        })
      );
      expect(logSpy.mock.calls.flat().join('\n')).toContain('Dry run: true');

      analyzeMock.mockClear();
      logSpy.mockClear();

      const shortFlagRes = await command.execute(['-n']);
      expect(shortFlagRes.exitCode).toBe(0);
      expect(analyzeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          path: 'src',
          minQualityScore: 70,
        })
      );
      expect(logSpy.mock.calls.flat().join('\n')).toContain('Dry run: true');
    });

    it('supports both --min-score 80 and --min-score=85 without treating score as targetPath', async () => {
      const analyzeMock = jest.fn().mockReturnValue({ docScores: [] });
      const mockChecker = { analyze: analyzeMock } as unknown as CodeHealthChecker;
      command = new FixCommand(mockChecker);
      jest.spyOn(console, 'log').mockImplementation(() => undefined);

      const spaceRes = await command.execute(['--min-score', '80']);
      expect(spaceRes.exitCode).toBe(0);
      expect(analyzeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          path: 'src',
          minQualityScore: 80,
        })
      );

      analyzeMock.mockClear();

      const customDir = path.join(tempDir, 'packages');
      fs.mkdirSync(customDir, { recursive: true });
      const equalsRes = await command.execute(['--min-score=85', 'packages', '-n']);
      expect(equalsRes.exitCode).toBe(0);
      expect(analyzeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          path: 'packages',
          minQualityScore: 85,
        })
      );
    });

    it('rejects unknown flags and invalid --min-score fail-closed with exitCode 1', async () => {
      const analyzeMock = jest.fn().mockReturnValue({ docScores: [] });
      const mockChecker = { analyze: analyzeMock } as unknown as CodeHealthChecker;
      command = new FixCommand(mockChecker);
      jest.spyOn(console, 'error').mockImplementation(() => undefined);

      const unknownRes = await command.execute(['--bogus']);
      expect(unknownRes.exitCode).toBe(1);
      expect(analyzeMock).not.toHaveBeenCalled();

      const badScoreRes = await command.execute(['--min-score', 'not-a-number']);
      expect(badScoreRes.exitCode).toBe(1);
      expect(analyzeMock).not.toHaveBeenCalled();
    });
  });
});
