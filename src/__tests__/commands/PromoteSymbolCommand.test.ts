/**
 * Tests for PromoteSymbolCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { PromoteSymbolCommand } from '../../commands/PromoteSymbolCommand';

describe('PromoteSymbolCommand', () => {
  let command: PromoteSymbolCommand;

  beforeEach(() => {
    command = new PromoteSymbolCommand();
  });

  it('rejects unknown flags before reading files', async () => {
    const result = await command.execute(['source.md', 'Symbol', '--unknown']);
    expect(result.exitCode).toBe(1);
    expect(result.message).toContain('Unknown option');
  });

  it('previews promotion with -n without writing either file', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-promote-'));
    try {
      const source = path.join(tempDir, 'source.md');
      const targetDir = path.join(tempDir, 'target');
      fs.writeFileSync(source, '# Overview\n\n## [[Symbol]]\n\nDetails\n');
      const result = await command.execute([source, 'Symbol', targetDir, '-n']);
      expect(result.exitCode).toBe(0);
      expect(fs.existsSync(path.join(targetDir, 'symbol.md'))).toBe(false);
      expect(fs.readFileSync(source, 'utf8')).toContain('## [[Symbol]]');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('promote-symbol');
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
