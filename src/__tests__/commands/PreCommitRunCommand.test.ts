/**
 * Tests for PreCommitRunCommand
 */

import { PreCommitRunCommand } from '../../commands/PreCommitRunCommand';
import { PreCommitChecker } from '../../analyzer/PreCommitChecker';

jest.mock('../../analyzer/PreCommitChecker');

describe('PreCommitRunCommand', () => {
  let command: PreCommitRunCommand;

  beforeEach(() => {
    jest.clearAllMocks();
    command = new PreCommitRunCommand();

    // Default mock - no staged files
    (PreCommitChecker as jest.Mock).mockImplementation(() => ({
      check: jest.fn().mockReturnValue({
        passed: true,
        totalFiles: 0,
        passedFiles: 0,
        failedFiles: 0,
        warningFiles: 0,
        fileResults: [],
        config: {},
      }),
      checkFiles: jest.fn().mockReturnValue({
        passed: true,
        totalFiles: 0,
        passedFiles: 0,
        failedFiles: 0,
        warningFiles: 0,
        fileResults: [],
        config: {},
      }),
    }));
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('pre-commit-run');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toBe('Run pre-commit documentation checks on staged files');
    });
  });

  describe('execute', () => {
    it('should pass with no staged files', async () => {
      const result = await command.execute([]);

      expect(result.exitCode).toBe(0);
      expect(result.message).toBe('No files to check');
    });

    it('should pass when all files pass', async () => {
      (PreCommitChecker as jest.Mock).mockImplementation(() => ({
        check: jest.fn().mockReturnValue({
          passed: true,
          totalFiles: 2,
          passedFiles: 2,
          failedFiles: 0,
          warningFiles: 0,
          fileResults: [
            { filePath: 'src/a.ts', passed: true, averageCompleteness: 80, failedSymbols: [], symbolsChecked: 1 },
            { filePath: 'src/b.ts', passed: true, averageCompleteness: 90, failedSymbols: [], symbolsChecked: 1 },
          ],
          config: {},
        }),
      }));

      const result = await command.execute([]);

      expect(result.exitCode).toBe(0);
      expect(result.message).toBe('Pre-commit check passed');
    });

    it('should fail when files fail threshold', async () => {
      (PreCommitChecker as jest.Mock).mockImplementation(() => ({
        check: jest.fn().mockReturnValue({
          passed: false,
          totalFiles: 1,
          passedFiles: 0,
          failedFiles: 1,
          warningFiles: 0,
          fileResults: [
            {
              filePath: 'src/a.ts',
              passed: false,
              averageCompleteness: 30,
              failedSymbols: [{ name: 'foo', completeness: 30, line: 10 }],
              symbolsChecked: 1,
            },
          ],
          config: {},
        }),
      }));

      const result = await command.execute([]);

      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('Pre-commit failed');
    });

    it('should fail with warnings in strict mode', async () => {
      (PreCommitChecker as jest.Mock).mockImplementation(() => ({
        check: jest.fn().mockReturnValue({
          passed: true,
          totalFiles: 1,
          passedFiles: 1,
          failedFiles: 0,
          warningFiles: 1,
          fileResults: [
            { filePath: 'src/a.ts', passed: true, averageCompleteness: 60, failedSymbols: [], symbolsChecked: 1 },
          ],
          config: {},
        }),
      }));

      const result = await command.execute(['--strict']);

      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('warnings');
    });

    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);

      expect(result.exitCode).toBe(0);
    });
  });
});
