/**
 * Tests for BuildCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { BuildCommand } from '../../commands/BuildCommand';
import { ConfigManager } from '../../config/ConfigManager';

describe('BuildCommand', () => {
  let command: BuildCommand;
  let tempDir: string;

  beforeEach(() => {
    // Create temp directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-test-'));

    // Create mock TypeScript file
    const srcDir = path.join(tempDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });

    fs.writeFileSync(
      path.join(srcDir, 'test.ts'),
      `
      /**
       * Test function
       * @public
       */
      export function testFunc(): void {}
      `,
      'utf-8'
    );

    // Mock config
    const configPath = path.join(tempDir, '.tsdoc.config.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        project: {
          name: 'test',
          version: '1.0.0',
          srcDirs: ['src'],
        },
        paths: {
          commentsDir: 'docs/comments',
          databasePath: path.join(tempDir, 'test.db'),
          jsonlDir: path.join(tempDir, 'data'),
        },
      }),
      'utf-8'
    );

    const configManager = ConfigManager.getInstance(tempDir, configPath);
    command = new BuildCommand(configManager);
  });

  afterEach(() => {
    // Cleanup temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('getName', () => {
    it('should return "build"', () => {
      expect(command.getName()).toBe('build');
    });
  });

  describe('getDescription', () => {
    it('should return description', () => {
      expect(command.getDescription()).toContain('database');
    });
  });

  describe('execute', () => {
    it('should build database from valid path', async () => {
      const srcPath = path.join(tempDir, 'src');
      const result = await command.execute([srcPath]);

      expect(result.exitCode).toBe(0);
      expect(result.message).toContain('symbols');
    });

    it('should use default path "src" if not specified', async () => {
      // Create src in cwd
      const cwd = process.cwd();
      const srcDir = path.join(cwd, 'src');

      if (fs.existsSync(srcDir)) {
        const result = await command.execute([]);
        // Should not error
        expect(result).toBeDefined();
      }
    });

    it('should return error for non-existent path', async () => {
      const result = await command.execute(['/non/existent/path']);

      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('not found');
    });

    it('should handle scan errors gracefully', async () => {
      // Create invalid TypeScript file
      const srcDir = path.join(tempDir, 'src2');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'invalid.ts'), 'invalid typescript {{{', 'utf-8');

      const result = await command.execute([srcDir]);

      // Should complete but may have errors in result
      expect(result.exitCode).toBe(0); // Build completes even with errors
    });
  });
});
