/**
 * Tests for InstallHookCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { InstallHookCommand } from '../../commands/InstallHookCommand';

describe('InstallHookCommand', () => {
  let command: InstallHookCommand;
  let tempDir: string;
  const originalCwd = process.cwd();

  beforeEach(() => {
    command = new InstallHookCommand();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-install-hook-'));
    fs.mkdirSync(path.join(tempDir, '.git'), { recursive: true });
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('install-hook');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
    });

    it('rejects unknown flags without writing', async () => {
      const result = await command.execute(['--unknown']);
      expect(result.exitCode).toBe(1);
      expect(fs.existsSync(path.join(tempDir, '.git/hooks/pre-commit'))).toBe(false);
    });

    it('supports dry-run and -n without creating the hook', async () => {
      const result = await command.execute(['-n', '-f']);
      expect(result.exitCode).toBe(0);
      expect(fs.existsSync(path.join(tempDir, '.git/hooks/pre-commit'))).toBe(false);
    });
  });
});
