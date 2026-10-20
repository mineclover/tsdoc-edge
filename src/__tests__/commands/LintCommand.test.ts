/**
 * Tests for LintCommand
 */

import * as fs from 'node:fs';
import { CodeHealthChecker } from '../../analyzer/CodeHealthChecker';
import { LintCommand } from '../../commands/LintCommand';
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
    (CodeHealthChecker as unknown as jest.Mock).mockImplementation(() => ({
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

      const jsonOutput = consoleSpy.mock.calls.find((call) => call[0]?.includes('"results"'));
      expect(jsonOutput).toBeDefined();

      consoleSpy.mockRestore();
    });

    it('should support --ci flag with exit code based on results', async () => {
      const result = await command.execute(['--ci']);

      expect(result.exitCode).toBe(0);
      expect(result.message).toContain('passed');
    });

    describe('output format', () => {
      let consoleSpy: jest.SpyInstance;
      const output = () => consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n');

      beforeEach(() => {
        consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      });

      afterEach(() => {
        consoleSpy.mockRestore();
      });

      it('prints an XML document by default', async () => {
        const result = await command.execute([]);

        expect(result.exitCode).toBe(0);
        expect(output().startsWith('<lint-report>')).toBe(true);
        expect(output()).toContain('<totalChecks>4</totalChecks>');
        expect(output()).toContain('<category>Code Health</category>');
        expect(output()).toContain('<category>Documentation</category>');
        expect(output()).toContain('<status>');
        expect(output()).not.toContain('TSDoc Edge - Code Quality Check');
        expect(output()).not.toContain('[1/4]');
        expect(output()).not.toContain('\x1b[');
      });

      it('lists check warnings as nested elements', async () => {
        // 1 test symbol for 3 implementation symbols: test coverage check warns
        await command.execute([]);

        expect(output()).toContain('<status>passed-with-warnings</status>');
        expect(output()).toContain('<warnings count="1">');
        expect(output()).toContain(
          '<message>Test coverage needs improvement: 33% test-to-impl ratio</message>'
        );
      });

      it('prints the colored text report with --human', async () => {
        await command.execute(['--human']);

        expect(output()).toContain('TSDoc Edge - Code Quality Check');
        expect(output()).toContain('[1/4] Checking code health...');
        expect(output()).toContain('Summary');
        expect(output()).toContain('\x1b[');
        expect(output()).not.toContain('<lint-report>');
      });

      it('keeps --json as the machine format and skips the banner without --human', async () => {
        await command.execute(['--json']);

        expect(output()).toContain('"results"');
        expect(output()).not.toContain('<lint-report>');
        expect(output()).not.toContain('Code Quality Check');
      });

      it('shows the banner before the JSON with --json --human', async () => {
        await command.execute(['--json', '--human']);

        expect(output()).toContain('Code Quality Check');
        expect(output()).toContain('"results"');
      });
    });

    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);

      expect(result.exitCode).toBe(0);
    });
  });
});
