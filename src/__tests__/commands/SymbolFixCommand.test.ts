/**
 * Tests for SymbolFixCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { SymbolFixCommand } from '../../commands/SymbolFixCommand';

describe('SymbolFixCommand', () => {
  let command: SymbolFixCommand;

  beforeEach(() => {
    command = new SymbolFixCommand();
  });

  it('rejects unknown flags before scanning or writing', async () => {
    const result = await command.execute(['--unknown']);
    expect(result.exitCode).toBe(1);
    expect(result.message).toContain('Unknown option');
  });

  it('supports -n without changing documents', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-symbol-fix-'));
    try {
      const managed = path.join(tempDir, 'managed');
      fs.mkdirSync(managed);
      const first = path.join(managed, 'first.md');
      const second = path.join(managed, 'second.md');
      const content = '# [[Duplicate]]\n';
      fs.writeFileSync(first, content);
      fs.writeFileSync(second, content);
      const result = await command.execute([managed, '-n']);
      expect(result.exitCode).toBe(0);
      expect(fs.readFileSync(first, 'utf8')).toBe(content);
      expect(fs.readFileSync(second, 'utf8')).toBe(content);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('symbol-fix');
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
