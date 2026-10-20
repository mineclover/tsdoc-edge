/**
 * Tests for DocsCommand (subcommand router)
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { DocsCommand } from '../../commands/DocsCommand';

const ANSI = '\x1b[';

describe('DocsCommand', () => {
  let command: DocsCommand;
  let consoleSpy: jest.SpyInstance;

  const output = (): string => consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n');

  beforeEach(() => {
    command = new DocsCommand();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('metadata', () => {
    it('should return command name and alias', () => {
      expect(command.getName()).toBe('docs');
      expect(command.getAlias()).toEqual(['d']);
    });
  });

  describe('execute', () => {
    it('should show the unified help including the --human option', async () => {
      const result = await command.execute([]);

      expect(result.exitCode).toBe(0);
      expect(output()).toContain('--human');
      expect(output()).toContain('check-links');
    });

    it('should list the available subcommands for an unknown subcommand', async () => {
      const result = await command.execute(['nope', '--human']);
      const out = output();

      expect(result.exitCode).toBe(1);
      expect(result.message).toBe('Unknown subcommand: nope');
      expect(out).toContain('Unknown subcommand: nope');
      expect(out).toContain('Available subcommands:');
      expect(out).toContain('backlinks');
      expect(out).toContain('find-unused');
    });
  });

  describe('subcommand pass-through', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'docs-command-test-')));
      fs.writeFileSync(path.join(tempDir, 'alpha.md'), '# [[Alpha]]\n\nAlpha doc.\n', 'utf-8');
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should let the subcommand print its XML document by default', async () => {
      const result = await command.execute(['validate', tempDir]);
      const out = output();

      expect(result.exitCode).toBe(0);
      expect(out.startsWith('<validate-docs>')).toBe(true);
      expect(out).not.toContain(ANSI);
    });

    it('should forward --human to the subcommand', async () => {
      const result = await command.execute(['validate', tempDir, '--human']);
      const out = output();

      expect(result.exitCode).toBe(0);
      expect(out).toContain('Validating Document Symbols');
      expect(out).toContain(ANSI);
      expect(out).not.toContain('<validate-docs>');
    });
  });
});
