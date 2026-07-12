/**
 * Tests for HealthCommand
 */

import * as fs from 'node:fs';
import { CodeHealthChecker } from '../../analyzer/CodeHealthChecker';
import { HealthCommand } from '../../commands/HealthCommand';
import type { AnalysisReport } from '../../types/analysis';

// Mock fs
jest.mock('node:fs');

// Mock CodeHealthChecker
jest.mock('../../analyzer/CodeHealthChecker');

describe('HealthCommand', () => {
  let command: HealthCommand;
  let mockChecker: jest.Mocked<CodeHealthChecker>;
  const mockFsExists = fs.existsSync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockChecker = new CodeHealthChecker() as jest.Mocked<CodeHealthChecker>;
    command = new HealthCommand(mockChecker);

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
        avgQualityScore: 85,
        healthScore: 90,
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
      expect(command.getName()).toBe('health');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toBe('Check code health and generate report');
    });

    it('should check health with default options', async () => {
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

    it('should use default path when no args provided', async () => {
      mockFsExists.mockReturnValue(true);

      await command.execute([]);

      expect(mockChecker.analyze).toHaveBeenCalledWith(
        expect.objectContaining({
          path: 'src',
        })
      );
    });

    it('should fail if path does not exist', async () => {
      mockFsExists.mockReturnValue(false);

      const result = await command.execute(['nonexistent']);

      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('Path not found');
    });

    it('should handle health check errors gracefully', async () => {
      mockFsExists.mockReturnValue(true);
      mockChecker.analyze = jest.fn().mockImplementation(() => {
        throw new Error('Health check failed');
      });

      const result = await command.execute(['src']);

      expect(result.exitCode).toBe(1);
      expect(result.error?.message).toBe('Health check failed');
    });
  });
});
