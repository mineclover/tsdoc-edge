/**
 * Tests for GenerateDocsCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { GenerateDocsCommand } from '../../commands/GenerateDocsCommand';

const ANSI = '\x1b[';

const DOCUMENTED_SOURCE = `/**
 * Widget class
 * @public
 * @responsibility Build widgets
 * @problem Widgets are needed
 * @solves Provides widgets
 * @context Widget factory
 * @functionality Build widgets, Paint widgets
 * @decision Use a factory
 * @rationale Simple
 * @consequences More classes
 */
export class Widget {}
`;

describe('GenerateDocsCommand', () => {
  let command: GenerateDocsCommand;
  let tempDir: string;
  let outputDir: string;
  let consoleSpy: jest.SpyInstance;

  const output = (): string => consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n');

  beforeEach(() => {
    command = new GenerateDocsCommand();
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'generate-docs-test-')));
    outputDir = path.join(tempDir, 'out');
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('generate-docs');
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
      const result = await command.execute([path.join(tempDir, 'missing'), outputDir]);
      expect(result.exitCode).toBe(1);
      expect(output()).toContain('Source path not found');
    });
  });

  describe('XML output (default)', () => {
    it('should write markdown files and report them as XML', async () => {
      fs.writeFileSync(path.join(tempDir, 'widget.ts'), DOCUMENTED_SOURCE, 'utf-8');

      const result = await command.execute([tempDir, outputDir]);
      const out = output();

      expect(result.exitCode).toBe(0);
      expect(fs.existsSync(path.join(outputDir, 'Widget.md'))).toBe(true);
      expect(out.startsWith('<generate-docs>')).toBe(true);
      expect(out.trimEnd().endsWith('</generate-docs>')).toBe(true);
      expect(out).toContain('<totalGenerated>1</totalGenerated>');
      expect(out).toContain('<symbol>Widget</symbol>');
      expect(out).toContain('Widget.md</path>');
      expect(out).not.toContain(ANSI);
    });

    it('should emit an empty document when nothing is found', async () => {
      fs.writeFileSync(path.join(tempDir, 'notes.md'), '# notes\n', 'utf-8');

      const result = await command.execute([tempDir, outputDir]);
      const out = output();

      expect(result.exitCode).toBe(0);
      expect(out).toContain('<generate-docs>');
      expect(out).toContain('<totalGenerated>0</totalGenerated>');
      expect(out).toContain('<files count="0">');
      expect(fs.existsSync(outputDir)).toBe(false);
    });

    it('should accept --human before the positional arguments', async () => {
      fs.writeFileSync(path.join(tempDir, 'widget.ts'), DOCUMENTED_SOURCE, 'utf-8');

      const result = await command.execute(['--human', tempDir, outputDir]);

      expect(result.exitCode).toBe(0);
      expect(fs.existsSync(path.join(outputDir, 'Widget.md'))).toBe(true);
      expect(output()).toContain('Generated 1 markdown file(s)');
    });
  });

  describe('--human output', () => {
    it('should keep the colored progress output', async () => {
      fs.writeFileSync(path.join(tempDir, 'widget.ts'), DOCUMENTED_SOURCE, 'utf-8');

      const result = await command.execute([tempDir, outputDir, '--human']);
      const out = output();

      expect(result.exitCode).toBe(0);
      expect(fs.existsSync(path.join(outputDir, 'Widget.md'))).toBe(true);
      expect(out).toContain('TSDoc Edge - Generate Docs');
      expect(out).toContain('Generating Markdown Files');
      expect(out).toContain('Generated 1 markdown file(s)');
      expect(out).toContain(ANSI);
      expect(out).not.toContain('<generate-docs>');
    });

    it('should keep the warning when nothing is found', async () => {
      fs.writeFileSync(path.join(tempDir, 'notes.md'), '# notes\n', 'utf-8');

      const result = await command.execute([tempDir, outputDir, '--human']);

      expect(result.exitCode).toBe(0);
      expect(output()).toContain('No enhanced documentation found');
    });
  });
});
