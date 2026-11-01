/**
 * Tests for UninstallHookCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { UninstallHookCommand } from '../../commands/UninstallHookCommand';

describe('UninstallHookCommand', () => {
  let command: UninstallHookCommand;
  let tempDir: string;
  const originalCwd = process.cwd();

  beforeEach(() => {
    command = new UninstallHookCommand();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-uninstall-hook-'));
    fs.mkdirSync(path.join(tempDir, '.git/hooks'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, '.git/hooks/pre-commit'), '# tsdoc-edge pre-commit-run\n');
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('uninstall-hook');
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

    it('rejects unknown flags without deleting', async () => {
      const result = await command.execute(['--unknown']);
      expect(result.exitCode).toBe(1);
      expect(fs.existsSync(path.join(tempDir, '.git/hooks/pre-commit'))).toBe(true);
    });

    it('supports dry-run and -n without deleting the hook', async () => {
      const result = await command.execute(['-n']);
      expect(result.exitCode).toBe(0);
      expect(fs.existsSync(path.join(tempDir, '.git/hooks/pre-commit'))).toBe(true);
    });
  });
});
