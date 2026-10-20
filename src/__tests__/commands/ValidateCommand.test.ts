/**
 * Tests for ValidateCommand
 */

import * as fs from 'node:fs';
import { ValidateCommand } from '../../commands/ValidateCommand';
import { SymbolGraphBuilder } from '../../graph/SymbolGraphBuilder';
import type { DatabaseManager } from '../../storage/DatabaseManager';
import { ConnectivityValidator } from '../../validator/ConnectivityValidator';

// Mock modules
jest.mock('node:fs');
jest.mock('../../storage/DatabaseManager');
jest.mock('../../graph/SymbolGraphBuilder');
jest.mock('../../validator/ConnectivityValidator');

describe('ValidateCommand', () => {
  let command: ValidateCommand;
  let mockDbManager: jest.Mocked<DatabaseManager>;
  let mockGraphBuilder: jest.Mocked<SymbolGraphBuilder>;
  let mockValidator: jest.Mocked<ConnectivityValidator>;
  const mockFsExists = fs.existsSync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock instances
    mockDbManager = {
      db: {
        prepare: jest.fn().mockReturnValue({
          all: jest.fn().mockReturnValue([]),
        }),
      },
      close: jest.fn(),
      getGraphData: jest.fn().mockReturnValue({ symbols: [], dependencies: [] }),
    } as any;

    mockGraphBuilder = new SymbolGraphBuilder() as jest.Mocked<SymbolGraphBuilder>;
    mockGraphBuilder.addSymbol = jest.fn();
    mockGraphBuilder.addRelationship = jest.fn();

    mockValidator = new ConnectivityValidator(
      mockGraphBuilder
    ) as jest.Mocked<ConnectivityValidator>;
    mockValidator.generateDetailedReport = jest.fn().mockReturnValue({
      score: 100,
      issues: [],
      orphanedSymbols: [],
    });
    mockValidator.formatDetailedReport = jest.fn().mockReturnValue('Validation Report');

    command = new ValidateCommand(mockDbManager, mockGraphBuilder, mockValidator);
  });

  describe('execute', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('validate');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toBe('Generate detailed validation report');
    });

    it('should fail if database does not exist', async () => {
      // Test with no injected dbManager - so it checks for database existence
      const commandWithoutDb = new ValidateCommand(undefined, mockGraphBuilder, mockValidator);
      mockFsExists.mockReturnValue(false);

      const result = await commandWithoutDb.execute([]);

      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('Database not found');
    });

    it('should generate validation report', async () => {
      mockFsExists.mockReturnValue(true);

      const result = await command.execute(['--human']);

      expect(result.exitCode).toBe(0);
      expect(mockValidator.generateDetailedReport).toHaveBeenCalled();
      expect(mockValidator.formatDetailedReport).toHaveBeenCalled();
    });

    describe('output format', () => {
      let consoleSpy: jest.SpyInstance;
      const output = () => consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n');

      const issue = {
        symbolId: 'svc-method-run',
        symbolName: 'Service.run',
        symbolType: 'method',
        filePath: 'src/svc.ts',
        line: 12,
        issueType: 'missing-documentation',
        severity: 'error',
        message: "Symbol 'Service.run' <needs> docs & more",
        missingItems: ['summary', '@param input'],
      };

      beforeEach(() => {
        consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        mockFsExists.mockReturnValue(true);
        mockValidator.generateDetailedReport = jest.fn().mockReturnValue({
          timestamp: '2026-01-02T03:04:05.000Z',
          totalSymbols: 4,
          totalIssues: 1,
          issuesBySeverity: { error: 1, warning: 0, info: 0 },
          issuesByFile: new Map(),
          issuesByType: new Map([['missing-documentation', [issue]]]),
          allIssues: [issue],
          completionPercentage: 41.666,
          summary: {
            documented: 3,
            undocumented: 1,
            tested: 2,
            untested: 2,
            withResponsibility: 1,
            withoutResponsibility: 3,
            withContract: 0,
            withoutContract: 4,
          },
        });
      });

      afterEach(() => {
        consoleSpy.mockRestore();
      });

      it('prints an XML document by default', async () => {
        const result = await command.execute([]);

        expect(result.exitCode).toBe(0);
        expect(output().startsWith('<validation-report>')).toBe(true);
        expect(output()).toContain('<totalIssues>1</totalIssues>');
        expect(output()).toContain('<completionPercentage>41.67</completionPercentage>');
        expect(output()).toContain('<errors>1</errors>');
        expect(output()).toContain('<documented>3</documented>');
        expect(output()).toContain('<issueType>missing-documentation</issueType>');
        expect(output()).toContain('<count>1</count>');
        expect(output()).toContain('<symbolId>svc-method-run</symbolId>');
        expect(output()).toContain('<missingItems>summary,@param input</missingItems>');
        expect(output()).toContain('&lt;needs&gt; docs &amp; more');
        expect(output()).not.toContain('suggestedFix');
        expect(output()).not.toContain('\x1b[');
        expect(mockValidator.formatDetailedReport).not.toHaveBeenCalled();
      });

      it('prints the formatted text report with --human', async () => {
        await command.execute(['--human']);

        expect(output()).toContain('Detailed Validation Report');
        expect(output()).toContain('Validation Report');
        expect(output()).not.toContain('<validation-report>');
      });
    });

    it('should handle validation errors gracefully', async () => {
      mockFsExists.mockReturnValue(true);
      mockValidator.generateDetailedReport = jest.fn().mockImplementation(() => {
        throw new Error('Validation failed');
      });

      const result = await command.execute([]);

      expect(result.exitCode).toBe(1);
      expect(result.error?.message).toBe('Validation failed');
    });
  });
});
