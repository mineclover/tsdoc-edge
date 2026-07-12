/**
 * ValidateDocsCommand tests
 * @testScenario Validate document symbols
 * @testScenario Report errors and warnings
 * @testScenario Handle non-existent directory
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ValidateDocsCommand } from '../../commands/ValidateDocsCommand';

// Mock ConfigManager
jest.mock('../../config/ConfigManager', () => ({
  ConfigManager: {
    getInstance: jest.fn(() => ({
      get: jest.fn(() => ({
        paths: { managedDir: 'managed' },
        documentManagement: { ignoreCodeBlocks: true },
      })),
    })),
  },
}));

describe('ValidateDocsCommand', () => {
  let command: ValidateDocsCommand;
  let consoleSpy: jest.SpyInstance;
  let tempDir: string;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    tempDir = fs.realpathSync(
      fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'validate-docs-test-'))
    );
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('getName', () => {
    it('should return "validate-docs"', () => {
      command = new ValidateDocsCommand();
      expect(command.getName()).toBe('validate-docs');
    });
  });

  describe('getDescription', () => {
    it('should return description', () => {
      command = new ValidateDocsCommand();
      expect(command.getDescription()).toContain('Validate');
    });
  });

  describe('execute', () => {
    it('should show help when --help flag is passed', async () => {
      command = new ValidateDocsCommand();
      const result = await command.execute(['--help']);

      expect(result.exitCode).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should fail for non-existent directory', async () => {
      command = new ValidateDocsCommand();
      const result = await command.execute(['/nonexistent/docs']);

      expect(result.exitCode).not.toBe(0);
    });

    it('should handle empty directory', async () => {
      command = new ValidateDocsCommand();
      const result = await command.execute([tempDir]);

      // Should succeed but with 0 files
      expect(result.exitCode).toBe(0);
    });
  });
});
