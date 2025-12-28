/**
 * StatsCommand tests
 * @testScenario Show documentation statistics
 * @testScenario Calculate coverage correctly
 * @testScenario Handle missing database
 */

import { StatsCommand } from '../../commands/StatsCommand';

describe('StatsCommand', () => {
  let command: StatsCommand;
  let consoleSpy: jest.SpyInstance;

  // Mock DatabaseManager with Drizzle ORM methods
  const createMockDb = (stats: any = {}, docCount = 0) => {
    const totalSymbols = stats.totalSymbols || 10;
    const testTotal = stats.testTotal || 0;

    // Create mock symbol rows
    const symbolRows: any[] = [];
    for (let i = 0; i < totalSymbols; i++) {
      const isTest = i < testTotal;
      const isDocumented = i < docCount;
      symbolRows.push({
        id: `symbol-${i}`,
        name: `symbol${i}`,
        type: isTest ? 'test-case' : 'function',
        file_path: `src/file${i}.ts`,
        line: i + 1,
        column: 0,
        is_exported: 1,
        is_public: 1,
        summary: isDocumented ? `Documentation for symbol ${i}` : null,
        declared_type: null,
        inferred_type: null,
        generic_params: null,
        parameter_types: null,
      });
    }

    return {
      getStatistics: jest.fn(() => ({
        totalSymbols: totalSymbols,
        totalEnhancedDocs: stats.totalEnhancedDocs || 5,
        dbSize: stats.dbSize || 1024,
      })),
      getAllSymbolRows: jest.fn(() => symbolRows),
      close: jest.fn(),
    };
  };

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('getName', () => {
    it('should return "stats"', () => {
      command = new StatsCommand();
      expect(command.getName()).toBe('stats');
    });
  });

  describe('getDescription', () => {
    it('should return description', () => {
      command = new StatsCommand();
      expect(command.getDescription()).toContain('statistics');
    });
  });

  describe('execute', () => {
    it('should show help when --help flag is passed', async () => {
      command = new StatsCommand();
      const result = await command.execute(['--help']);

      expect(result.exitCode).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should display statistics with injected database', async () => {
      const mockDb = createMockDb({ totalSymbols: 100, totalEnhancedDocs: 50, dbSize: 2048 }, 80);
      command = new StatsCommand(mockDb as any);

      const result = await command.execute([]);

      expect(result.exitCode).toBe(0);
      expect(mockDb.getStatistics).toHaveBeenCalled();
    });

    it('should calculate coverage percentage', async () => {
      const mockDb = createMockDb({ totalSymbols: 100 }, 75);
      command = new StatsCommand(mockDb as any);

      const result = await command.execute([]);

      expect(result.exitCode).toBe(0);
      // Should display 75% coverage
      const logOutput = consoleSpy.mock.calls.flat().join('\n');
      expect(logOutput).toContain('75');
    });

    it('should handle zero symbols', async () => {
      const mockDb = createMockDb({ totalSymbols: 0 }, 0);
      command = new StatsCommand(mockDb as any);

      const result = await command.execute([]);

      expect(result.exitCode).toBe(0);
    });

    it('should display database size', async () => {
      const mockDb = createMockDb({ totalSymbols: 10, dbSize: 4096 }, 5);
      command = new StatsCommand(mockDb as any);

      const result = await command.execute([]);

      expect(result.exitCode).toBe(0);
      const logOutput = consoleSpy.mock.calls.flat().join('\n');
      expect(logOutput).toContain('KB');
    });

    it('should not close injected database', async () => {
      const mockDb = createMockDb();
      command = new StatsCommand(mockDb as any);

      await command.execute([]);

      expect(mockDb.close).not.toHaveBeenCalled();
    });
  });
});
