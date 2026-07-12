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

      const result = await command.execute([]);

      expect(result.exitCode).toBe(0);
      expect(mockValidator.generateDetailedReport).toHaveBeenCalled();
      expect(mockValidator.formatDetailedReport).toHaveBeenCalled();
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
