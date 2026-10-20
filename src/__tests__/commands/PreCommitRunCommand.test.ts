/**
 * Tests for PreCommitRunCommand
 */

import { PreCommitChecker } from '../../analyzer/PreCommitChecker';
import { PreCommitRunCommand } from '../../commands/PreCommitRunCommand';

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
            {
              filePath: 'src/a.ts',
              passed: true,
              averageCompleteness: 80,
              failedSymbols: [],
              symbolsChecked: 1,
            },
            {
              filePath: 'src/b.ts',
              passed: true,
              averageCompleteness: 90,
              failedSymbols: [],
              symbolsChecked: 1,
            },
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
            {
              filePath: 'src/a.ts',
              passed: true,
              averageCompleteness: 60,
              failedSymbols: [],
              symbolsChecked: 1,
            },
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
  describe('output modes', () => {
    let log: jest.SpyInstance;

    const hasAnsi = (text: string): boolean => text.includes('\x1b[');

    const fileResult = (
      filePath: string,
      passed: boolean,
      averageCompleteness: number,
      failedSymbols: Array<{ name: string; completeness: number; line: number }> = []
    ) => ({
      filePath,
      passed,
      averageCompleteness,
      failedSymbols,
      warningSymbols: [],
      symbolsChecked: 1,
      missingDocs: false,
    });

    const mockReport = (fileResults: ReturnType<typeof fileResult>[]) => {
      const passedFiles = fileResults.filter((f) => f.passed).length;
      (PreCommitChecker as jest.Mock).mockImplementation(() => ({
        check: jest.fn().mockReturnValue({
          passed: passedFiles === fileResults.length,
          totalFiles: fileResults.length,
          passedFiles,
          failedFiles: fileResults.length - passedFiles,
          warningFiles: 0,
          fileResults,
          config: {},
        }),
      }));
    };

    const run = async (
      args: string[]
    ): Promise<{ exitCode: number; message?: string; output: string }> => {
      log.mockClear();
      const result = await command.execute(args);
      return {
        exitCode: result.exitCode,
        message: result.message,
        output: log.mock.calls.flat().join('\n'),
      };
    };

    beforeEach(() => {
      log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    afterEach(() => {
      log.mockRestore();
    });

    it('prints only an XML document by default', async () => {
      mockReport([
        fileResult('src/a.ts', true, 90),
        fileResult('src/b.ts', false, 30, [{ name: 'foo<T>', completeness: 30, line: 10 }]),
      ]);

      const { exitCode, message, output } = await run([]);

      expect(exitCode).toBe(1);
      expect(message).toContain('Pre-commit failed');
      expect(output.startsWith('<pre-commit-results>')).toBe(true);
      expect(output.endsWith('</pre-commit-results>')).toBe(true);
      expect(output).toContain('<totalFiles>2</totalFiles>');
      expect(output).toContain('<averageScore>60</averageScore>');
      expect(output).toContain('<status>failed</status>');
      expect(output).toContain('<exitCode>1</exitCode>');
      expect(output).toContain('<path>src/b.ts</path>');
      expect(output).toContain('<name>foo&lt;T&gt;</name>');
      expect(hasAnsi(output)).toBe(false);
      expect(output).not.toContain('Pre-commit Check');
    });

    it('keeps the colored report behind --human', async () => {
      mockReport([
        fileResult('src/a.ts', false, 30, [{ name: 'foo', completeness: 30, line: 10 }]),
      ]);

      const { exitCode, output } = await run(['--human']);

      expect(exitCode).toBe(1);
      expect(output).toContain('TSDoc Edge - Pre-commit Check');
      expect(output).toContain('Pre-commit check failed');
      expect(hasAnsi(output)).toBe(true);
      expect(output).not.toContain('<pre-commit-results>');
    });

    it('returns identical exit codes and messages in both modes', async () => {
      const scenarios: Array<{
        name: string;
        files: ReturnType<typeof fileResult>[];
        args: string[];
        exitCode: number;
        message: string;
      }> = [
        {
          name: 'all files pass',
          files: [fileResult('src/a.ts', true, 90)],
          args: [],
          exitCode: 0,
          message: 'Pre-commit check passed',
        },
        {
          name: 'warning without strict',
          files: [fileResult('src/a.ts', true, 60)],
          args: [],
          exitCode: 0,
          message: 'Pre-commit check passed',
        },
        {
          name: 'warning with strict',
          files: [fileResult('src/a.ts', true, 60)],
          args: ['--strict'],
          exitCode: 1,
          message: 'Pre-commit passed with warnings (strict mode)',
        },
        {
          name: 'failure',
          files: [fileResult('src/a.ts', false, 20), fileResult('src/b.ts', true, 95)],
          args: [],
          exitCode: 1,
          message: 'Pre-commit failed: 1 file(s) below threshold',
        },
      ];

      for (const scenario of scenarios) {
        mockReport(scenario.files);
        const xml = await run(scenario.args);
        const human = await run([...scenario.args, '--human']);

        expect([scenario.name, xml.exitCode, xml.message]).toEqual([
          scenario.name,
          scenario.exitCode,
          scenario.message,
        ]);
        expect([scenario.name, human.exitCode, human.message]).toEqual([
          scenario.name,
          scenario.exitCode,
          scenario.message,
        ]);
      }
    });

    it('emits an empty document when there are no files to check', async () => {
      const { exitCode, message, output } = await run([]);

      expect(exitCode).toBe(0);
      expect(message).toBe('No files to check');
      expect(output).toContain('<totalFiles>0</totalFiles>');
      expect(output).toContain('<files count="0">');
      expect(output).toContain('<status>passed</status>');
    });

    it('emits an empty document when git reports no staged files', async () => {
      (PreCommitChecker as jest.Mock).mockImplementation(() => ({
        check: jest.fn().mockImplementation(() => {
          throw new Error('No staged files');
        }),
      }));

      const xml = await run([]);
      expect(xml.exitCode).toBe(0);
      expect(xml.message).toBe('No staged files');
      expect(xml.output).toContain('<pre-commit-results>');
      expect(xml.output).toContain('<message>No staged files</message>');

      const human = await run(['--human']);
      expect(human.exitCode).toBe(0);
      expect(human.output).toContain('No staged TypeScript files to check');
    });

    it('documents --human in the usage text', () => {
      expect((command as unknown as { getUsage(): string }).getUsage()).toContain('--human');
    });
  });
});
