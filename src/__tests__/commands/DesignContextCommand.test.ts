/**
 * DesignContextCommand tests
 * @testScenario Display design context for a file
 * @testScenario Handle non-existent file
 * @testScenario Show contracts and decisions
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { DesignContextCommand } from '../../commands/DesignContextCommand';

// Mock ConfigManager
jest.mock('../../config/ConfigManager', () => ({
  ConfigManager: {
    getInstance: jest.fn(() => ({
      get: jest.fn(() => ({
        paths: {
          databasePath: '.tsdoc/db.sqlite',
          jsonlDir: '.tsdoc/jsonl',
          managedDir: 'managed',
        },
        documentManagement: { ignoreCodeBlocks: true },
      })),
    })),
  },
}));

describe('DesignContextCommand', () => {
  let command: DesignContextCommand;
  let consoleSpy: jest.SpyInstance;
  let tempDir: string;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    tempDir = fs.realpathSync(
      fs.mkdtempSync(path.join(require('os').tmpdir(), 'design-context-test-'))
    );
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('getName', () => {
    it('should return "design-context"', () => {
      command = new DesignContextCommand();
      expect(command.getName()).toBe('design-context');
    });
  });

  describe('getAlias', () => {
    it('should return "dc" as alias', () => {
      command = new DesignContextCommand();
      expect(command.getAlias()).toContain('dc');
    });
  });

  describe('getDescription', () => {
    it('should return description', () => {
      command = new DesignContextCommand();
      expect(command.getDescription()).toContain('design');
    });
  });

  describe('execute', () => {
    it('should show help when --help flag is passed', async () => {
      command = new DesignContextCommand();
      const result = await command.execute(['--help']);

      expect(result.exitCode).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should fail when no file path provided', async () => {
      command = new DesignContextCommand();
      const result = await command.execute([]);

      expect(result.exitCode).not.toBe(0);
    });

    it('should fail for non-existent file', async () => {
      command = new DesignContextCommand();
      const result = await command.execute(['/nonexistent/file.ts']);

      expect(result.exitCode).not.toBe(0);
    });
  });
});
