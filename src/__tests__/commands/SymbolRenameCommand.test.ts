/**
 * Tests for SymbolRenameCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { SymbolRenameCommand } from '../../commands/SymbolRenameCommand';

describe('SymbolRenameCommand', () => {
  let command: SymbolRenameCommand;

  beforeEach(() => {
    command = new SymbolRenameCommand();
  });

  it('rejects unknown flags before scanning or writing', async () => {
    const result = await command.execute(['Old', 'New', '--unknown']);
    expect(result.exitCode).toBe(1);
    expect(result.message).toContain('Unknown option');
  });

  it('supports -n without changing references', async () => {
    const originalCwd = process.cwd();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-symbol-rename-'));
    try {
      const managed = path.join(tempDir, 'managed');
      fs.mkdirSync(managed);
      const file = path.join(managed, 'old.md');
      const content = '# [[Old]]\n\nReference to [[Old]].\n';
      fs.writeFileSync(file, content);
      process.chdir(tempDir);
      const result = await command.execute(['Old', 'New', '-n']);
      expect(result.exitCode).toBe(0);
      expect(fs.readFileSync(file, 'utf8')).toBe(content);
    } finally {
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('symbol-rename');
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
  });
});
