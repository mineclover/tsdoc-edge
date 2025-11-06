/**
 * Tests for AnalyzeCommand
 */

import * as fs from 'node:fs';
import { AnalyzeCommand } from '../../commands/AnalyzeCommand';
import { CodeHealthChecker } from '../../analyzer/CodeHealthChecker';
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
});
