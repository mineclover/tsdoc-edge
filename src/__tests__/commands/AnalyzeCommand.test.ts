/**
 * Tests for AnalyzeCommand
 */

import * as fs from 'node:fs';
import { CodeHealthChecker } from '../../analyzer/CodeHealthChecker';
import { AnalyzeCommand } from '../../commands/AnalyzeCommand';
import type { AnalysisReport } from '../../types/analysis';

// Mock fs
jest.mock('node:fs');

// Mock CodeHealthChecker
jest.mock('../../analyzer/CodeHealthChecker');

describe('AnalyzeCommand', () => {
  let command: AnalyzeCommand;
  let mockChecker: jest.Mocked<CodeHealthChecker>;
  const mockFsExists = fs.existsSync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockChecker = new CodeHealthChecker() as jest.Mocked<CodeHealthChecker>;
    command = new AnalyzeCommand(mockChecker);

    // Setup default mock return
    const mockReport: AnalysisReport = {
      timestamp: new Date().toISOString(),
      projectPath: '/test/path',
      metrics: {
        totalFiles: 10,
        totalSymbols: 50,
        publicSymbols: 30,
        documentedSymbols: 40,
        fullyDocumentedSymbols: 25,
        filesWithTests: 8,
        filesWithoutTests: 2,
        avgQualityScore: 75,
        healthScore: 80,
      },
      docScores: [],
      testCoverage: [],
      topIssues: [],
      filesNeedingAttention: [],
      suggestions: [],
    };

    mockChecker.analyze = jest.fn().mockReturnValue(mockReport);
  });

  describe('execute', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('analyze');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toBe('Analyze code health for a directory');
    });

    it('should analyze with default options', async () => {
      mockFsExists.mockReturnValue(true);

      const result = await command.execute(['src']);

      expect(result.exitCode).toBe(0);
      expect(mockChecker.analyze).toHaveBeenCalledWith({
        path: 'src',
        includeChildren: true,
        includePrivate: false,
        minQualityScore: 70,
        generateSuggestions: false,
      });
    });

    it('should use custom options', async () => {
      mockFsExists.mockReturnValue(true);

      await command.execute(['lib', '--no-children', '--include-private', '--min-score=80']);

      expect(mockChecker.analyze).toHaveBeenCalledWith({
        path: 'lib',
        includeChildren: false,
        includePrivate: true,
        minQualityScore: 80,
        generateSuggestions: false,
      });
    });

    it('should fail if path does not exist', async () => {
      mockFsExists.mockReturnValue(false);

      const result = await command.execute(['nonexistent']);

      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('Path not found');
    });

    it('should use default path when no args provided', async () => {
      mockFsExists.mockReturnValue(true);

      await command.execute([]);

      expect(mockChecker.analyze).toHaveBeenCalledWith(
        expect.objectContaining({
          path: 'src',
        })
      );
    });

    it('should handle analysis errors gracefully', async () => {
      mockFsExists.mockReturnValue(true);
      mockChecker.analyze = jest.fn().mockImplementation(() => {
        throw new Error('Analysis failed');
      });

      const result = await command.execute(['src']);

      expect(result.exitCode).toBe(1);
      expect(result.error?.message).toBe('Analysis failed');
    });
  });

  describe('output format', () => {
    const capture = async (args: string[]): Promise<{ output: string; exitCode: number }> => {
      mockFsExists.mockReturnValue(true);
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const result = await command.execute(args);
      return {
        output: log.mock.calls.map((call) => call.join(' ')).join('\n'),
        exitCode: result.exitCode,
      };
    };

    it('prints only an XML document by default', async () => {
      const { output, exitCode } = await capture(['src']);

      expect(exitCode).toBe(0);
      expect(output.startsWith('<code-analysis>')).toBe(true);
      expect(output.endsWith('</code-analysis>')).toBe(true);
      expect(output).toContain('<targetPath>src</targetPath>');
      expect(output).toContain('<totalFiles>10</totalFiles>');
      expect(output).toContain('<documentedPercent>80</documentedPercent>');
      expect(output).toContain('<healthScore>80</healthScore>');
      expect(output).not.toContain('\x1b[');
    });

    it('lists top issues and files needing attention in the XML document', async () => {
      const report = mockChecker.analyze({} as never);
      mockChecker.analyze = jest.fn().mockReturnValue({
        ...report,
        topIssues: [
          {
            symbolName: 'Foo',
            qualityScore: 42,
            filePath: 'src/foo.ts',
            line: 7,
            missing: ['summary', 'params'],
          },
        ],
        filesNeedingAttention: ['src/foo.ts'],
      });

      const { output } = await capture(['src']);

      expect(output).toContain('<topIssues count="1">');
      expect(output).toContain('<symbolName>Foo</symbolName>');
      expect(output).toContain('<missing>summary, params</missing>');
      expect(output).toContain('<filesNeedingAttention count="1">');
      expect(output).toContain('<path>src/foo.ts</path>');
    });

    it('treats --human before the path as a flag and analyzes the default directory', async () => {
      const { output } = await capture(['--human']);

      expect(mockChecker.analyze).toHaveBeenCalledWith(expect.objectContaining({ path: 'src' }));
      expect(output).toContain('Overall Metrics');
    });

    it('prints the colored report with --human', async () => {
      const { output } = await capture(['src', '--human']);

      expect(output).toContain('TSDoc Edge - Code Analysis');
      expect(output).toContain('Overall Metrics');
      expect(output).toContain('\x1b[');
      expect(output).not.toContain('<code-analysis>');
    });
  });
});
