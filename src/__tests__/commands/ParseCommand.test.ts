/**
 * Tests for ParseCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ParseCommand } from '../../commands/ParseCommand';

const ANSI = '\x1b[';

const DOCUMENTED_SOURCE = `/**
 * Widget class
 * @public
 * @problem Widgets are needed
 * @solves Provides widgets <&> "quotes"
 * @functionality Build widgets
 */
export class Widget {}
`;

describe('ParseCommand', () => {
  let command: ParseCommand;
  let tempDir: string;
  let consoleSpy: jest.SpyInstance;

  const output = (): string => consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n');

  beforeEach(() => {
    command = new ParseCommand();
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'parse-command-test-')));
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('parse');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
      expect(output()).toContain('--human');
    });

    it('should fail when the source path is missing', async () => {
      const result = await command.execute([]);
      expect(result.exitCode).toBe(1);
      expect(output()).toContain('Source path required');
    });

    it('should fail when the source path does not exist', async () => {
      const result = await command.execute([path.join(tempDir, 'missing.ts')]);
      expect(result.exitCode).toBe(1);
      expect(output()).toContain('Source path not found');
    });
  });

  describe('XML output (default)', () => {
    it('should print only an XML document for a file', async () => {
      const file = path.join(tempDir, 'widget.ts');
      fs.writeFileSync(file, DOCUMENTED_SOURCE, 'utf-8');

      const result = await command.execute([file]);
      const out = output();

      expect(result.exitCode).toBe(0);
      expect(out.startsWith('<parse-results>')).toBe(true);
      expect(out.trimEnd().endsWith('</parse-results>')).toBe(true);
      expect(out).toContain('<name>Widget</name>');
      expect(out).toContain('<totalSymbols>1</totalSymbols>');
      expect(out).toContain('<missing>');
      expect(out).not.toContain(ANSI);
    });

    it('should list symbols from a directory ordered by completeness', async () => {
      fs.writeFileSync(path.join(tempDir, 'widget.ts'), DOCUMENTED_SOURCE, 'utf-8');
      fs.writeFileSync(path.join(tempDir, 'plain.ts'), 'export class Plain {}\n', 'utf-8');

      await command.execute([tempDir]);
      const out = output();

      expect(out).toContain('<name>Plain</name>');
      expect(out.indexOf('<name>Widget</name>')).toBeLessThan(out.indexOf('<name>Plain</name>'));
    });

    it('should still emit a document when nothing is found', async () => {
      fs.writeFileSync(path.join(tempDir, 'notes.md'), '# notes\n', 'utf-8');

      const result = await command.execute([tempDir]);
      const out = output();

      expect(result.exitCode).toBe(0);
      expect(out).toContain('<parse-results>');
      expect(out).toContain('<totalSymbols>0</totalSymbols>');
      expect(out).toContain('<symbols count="0">');
      expect(out).not.toContain(ANSI);
    });

    it('should accept --human before the source path', async () => {
      const file = path.join(tempDir, 'widget.ts');
      fs.writeFileSync(file, DOCUMENTED_SOURCE, 'utf-8');

      const result = await command.execute(['--human', file]);

      expect(result.exitCode).toBe(0);
      expect(output()).toContain('Symbols by Completeness');
    });
  });

  describe('--human output', () => {
    it('should keep the colored terminal report', async () => {
      const file = path.join(tempDir, 'widget.ts');
      fs.writeFileSync(file, DOCUMENTED_SOURCE, 'utf-8');

      const result = await command.execute([file, '--human']);
      const out = output();

      expect(result.exitCode).toBe(0);
      expect(out).toContain('TSDoc Edge - Parse Enhanced Docs');
      expect(out).toContain('Symbols by Completeness');
      expect(out).toContain('Widget');
      expect(out).toContain('Average Completeness');
      expect(out).toContain(ANSI);
      expect(out).not.toContain('<parse-results>');
    });

    it('should keep the warning when nothing is found', async () => {
      fs.writeFileSync(path.join(tempDir, 'notes.md'), '# notes\n', 'utf-8');

      const result = await command.execute([tempDir, '--human']);

      expect(result.exitCode).toBe(0);
      expect(output()).toContain('No enhanced documentation found');
    });
  });
});
