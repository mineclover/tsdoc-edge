/**
 * IdCommand tests
 * @testScenario Show help for id command
 * @testScenario Handle subcommands
 * @testScenario Handle missing subcommand
 */

import { IdCommand } from '../../commands/IdCommand';

// Mock SymbolRegistryManager
jest.mock('../../storage/SymbolRegistryManager', () => ({
  SymbolRegistryManager: jest.fn().mockImplementation(() => ({
    findById: jest.fn(),
    search: jest.fn(() => []),
    getAll: jest.fn(() => []),
    getStats: jest.fn(() => ({ totalEntries: 0, byType: {} })),
  })),
}));

// Mock ConfigManager
jest.mock('../../config/ConfigManager', () => ({
  ConfigManager: {
    getInstance: jest.fn(() => ({
      get: jest.fn(() => ({
        paths: { registryPath: '.tsdoc/registry.json' },
      })),
    })),
  },
}));

describe('IdCommand', () => {
  let command: IdCommand;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    command = new IdCommand();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('getName', () => {
    it('should return "id"', () => {
      expect(command.getName()).toBe('id');
    });
  });

  describe('getDescription', () => {
    it('should return description mentioning subcommands', () => {
      expect(command.getDescription()).toContain('new');
      expect(command.getDescription()).toContain('list');
    });
  });

  describe('execute', () => {
    it('should show help when --help flag is passed', async () => {
      const result = await command.execute(['--help']);

      expect(result.exitCode).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();
      const logOutput = consoleSpy.mock.calls.flat().join('\n');
      expect(logOutput).toContain('new');
      expect(logOutput).toContain('list');
      expect(logOutput).toContain('find');
      expect(logOutput).toContain('stats');
    });

    it('should show usage when no subcommand provided', async () => {
      const _result = await command.execute([]);

      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
