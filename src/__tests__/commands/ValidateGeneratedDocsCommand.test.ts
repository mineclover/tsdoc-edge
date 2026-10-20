/**
 * Tests for ValidateGeneratedDocsCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ValidateGeneratedDocsCommand } from '../../commands/ValidateGeneratedDocsCommand';

const ANSI = '\x1b[';

const VALID_DOC = '# Widget\n\n## Problem Solving\n\ntext\n\n## Functionality\n\n- a\n';
const INVALID_DOC = '# Bad\n\nnothing\n';

describe('ValidateGeneratedDocsCommand', () => {
  let command: ValidateGeneratedDocsCommand;
  let tempDir: string;
  let consoleSpy: jest.SpyInstance;

  const output = (): string => consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n');

  beforeEach(() => {
    command = new ValidateGeneratedDocsCommand();
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'validate-generated-test-')));
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('validate-generated-docs');
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

    it('should fail when the path is missing', async () => {
      const result = await command.execute([]);
      expect(result.exitCode).toBe(1);
      expect(output()).toContain('Path required');
    });

    it('should fail when the path does not exist', async () => {
      const result = await command.execute([path.join(tempDir, 'missing')]);
      expect(result.exitCode).toBe(1);
      expect(output()).toContain('Path not found');
    });

    it('should fail for a file that is not markdown', async () => {
      const file = path.join(tempDir, 'notes.txt');
      fs.writeFileSync(file, 'x', 'utf-8');

      const result = await command.execute([file]);

      expect(result.exitCode).toBe(1);
      expect(result.message).toBe('Invalid path');
      expect(output()).toContain('Path must be a .md file or directory');
    });
  });

  describe('XML output (default)', () => {
    it('should report valid documents as XML', async () => {
      fs.writeFileSync(path.join(tempDir, 'Widget.md'), VALID_DOC, 'utf-8');

      const result = await command.execute([tempDir]);
      const out = output();

      expect(result.exitCode).toBe(0);
      expect(out.startsWith('<validation-results>')).toBe(true);
      expect(out.trimEnd().endsWith('</validation-results>')).toBe(true);
      expect(out).toContain('<total>1</total>');
      expect(out).toContain('<valid>1</valid>');
      expect(out).toContain('<invalid>0</invalid>');
      expect(out).toContain('<isValid>true</isValid>');
      expect(out).not.toContain(ANSI);
    });

    it('should list errors and missing sections and still fail', async () => {
      fs.writeFileSync(path.join(tempDir, 'Widget.md'), VALID_DOC, 'utf-8');
      fs.writeFileSync(path.join(tempDir, 'Bad.md'), INVALID_DOC, 'utf-8');

      const result = await command.execute([tempDir]);
      const out = output();

      expect(result.exitCode).toBe(1);
      expect(result.message).toBe('1 invalid documents');
      expect(out).toContain('<invalid>1</invalid>');
      expect(out).toContain('<message>Missing required section: Problem Solving</message>');
      expect(out).toContain('<name>Functionality</name>');
      expect(out).not.toContain(ANSI);
    });

    it('should validate a single markdown file', async () => {
      const file = path.join(tempDir, 'Widget.md');
      fs.writeFileSync(file, VALID_DOC, 'utf-8');

      const result = await command.execute([file]);

      expect(result.exitCode).toBe(0);
      expect(output()).toContain('<total>1</total>');
    });

    it('should emit an empty document when no markdown files exist', async () => {
      const result = await command.execute([tempDir]);
      const out = output();

      expect(result.exitCode).toBe(0);
      expect(out).toContain('<validation-results>');
      expect(out).toContain('<total>0</total>');
      expect(out).toContain('<documents count="0">');
    });

    it('should accept --human before the path', async () => {
      fs.writeFileSync(path.join(tempDir, 'Widget.md'), VALID_DOC, 'utf-8');

      const result = await command.execute(['--human', tempDir]);

      expect(result.exitCode).toBe(0);
      expect(output()).toContain('document(s) are valid');
    });
  });

  describe('--human output', () => {
    it('should keep the colored terminal report', async () => {
      fs.writeFileSync(path.join(tempDir, 'Widget.md'), VALID_DOC, 'utf-8');
      fs.writeFileSync(path.join(tempDir, 'Bad.md'), INVALID_DOC, 'utf-8');

      const result = await command.execute([tempDir, '--human']);
      const out = output();

      expect(result.exitCode).toBe(1);
      expect(out).toContain('TSDoc Edge - Validate Generated Docs');
      expect(out).toContain('Total documents');
      expect(out).toContain('Invalid Documents');
      expect(out).toContain('Missing sections');
      expect(out).toContain('Completeness Scores');
      expect(out).toContain('1 invalid document(s) found');
      expect(out).toContain(ANSI);
      expect(out).not.toContain('<validation-results>');
    });

    it('should keep the warning when no markdown files exist', async () => {
      const result = await command.execute([tempDir, '--human']);

      expect(result.exitCode).toBe(0);
      expect(output()).toContain('No markdown files found');
    });
  });
});
