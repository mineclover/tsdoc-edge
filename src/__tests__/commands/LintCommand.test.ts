/**
 * Tests for LintCommand
 */

import * as fs from 'node:fs';
import { LintCommand } from '../../commands/LintCommand';
import { CodeHealthChecker } from '../../analyzer/CodeHealthChecker';
import { DatabaseManager } from '../../storage/DatabaseManager';

jest.mock('node:fs');
jest.mock('../../analyzer/CodeHealthChecker');
jest.mock('../../storage/DatabaseManager');

describe('LintCommand', () => {
  let command: LintCommand;
  const mockFsExists = fs.existsSync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    command = new LintCommand();

    // Mock fs
    mockFsExists.mockReturnValue(true);

    // Mock CodeHealthChecker
    const mockHealthReport = {
      metrics: { healthScore: 80 },
      topIssues: [],
    };
    (CodeHealthChecker as jest.Mock).mockImplementation(() => ({
      analyze: jest.fn().mockReturnValue(mockHealthReport),
    }));

    // Mock DatabaseManager
    (DatabaseManager as jest.Mock).mockImplementation(() => ({
      getAllSymbolRows: jest.fn().mockReturnValue([
        { id: '1', type: 'class', summary: 'Test class', is_public: 1, is_exported: 1 },
        { id: '2', type: 'function', summary: 'Test func', is_public: 1, is_exported: 1 },
        { id: '3', type: 'function', summary: 'Another', is_public: 1, is_exported: 1 },
        { id: '4', type: 'test-case', summary: null, is_public: 0, is_exported: 0 },
      ]),
      getAllUnifiedRelationships: jest.fn().mockReturnValue([
        { from: '1', to: '2', type: 'calls' },
        { from: '2', to: '3', type: 'calls' },
      ]),
      close: jest.fn(),
    }));
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('lint');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toBe('Run all code quality checks');
    });
  });

  describe('execute', () => {
    it('should run all quality checks', async () => {
      const result = await command.execute([]);

      expect(result.exitCode).toBe(0);
      expect(result.message).toContain('Lint complete');
    });

    it('should fail if database does not exist', async () => {
      mockFsExists.mockReturnValue(false);

      const result = await command.execute([]);

      expect(result.exitCode).toBe(1);
    });

    it('should support --json flag', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await command.execute(['--json']);

      const jsonOutput = consoleSpy.mock.calls.find((call) =>
        call[0]?.includes('"results"')
      );
      expect(jsonOutput).toBeDefined();

      consoleSpy.mockRestore();
    });

    it('should support --ci flag with exit code based on results', async () => {
      const result = await command.execute(['--ci']);

      expect(result.exitCode).toBe(0);
      expect(result.message).toContain('passed');
    });

    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);

      expect(result.exitCode).toBe(0);
    });
  });
});
