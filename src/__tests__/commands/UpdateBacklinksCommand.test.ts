/**
 * Tests for UpdateBacklinksCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { UpdateBacklinksCommand } from '../../commands/UpdateBacklinksCommand';

const ANSI = '\x1b[';

describe('UpdateBacklinksCommand', () => {
  let command: UpdateBacklinksCommand;

  beforeEach(() => {
    command = new UpdateBacklinksCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('update-backlinks');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toContain('backlinks');
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const result = await command.execute(['--help']);
      const out = consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n');
      consoleSpy.mockRestore();

      expect(result.exitCode).toBe(0);
      expect(out).toContain('--human');
    });
  });

  describe('output formats', () => {
    const originalCwd = process.cwd();
    let tempDir: string;
    let docsDir: string;
    let consoleSpy: jest.SpyInstance;

    const output = (): string => consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n');

    beforeEach(() => {
      tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'update-backlinks-test-')));
      docsDir = path.join(tempDir, 'docs');
      fs.mkdirSync(docsDir);
      fs.writeFileSync(path.join(docsDir, 'alpha.md'), '# [[Alpha]]\n\nAlpha doc.\n', 'utf-8');
      fs.writeFileSync(
        path.join(docsDir, 'beta.md'),
        '# [[Beta]]\n\nSee [[Alpha]] for details.\n',
        'utf-8'
      );
      // No src/ directory here, so no code connections are scanned
      process.chdir(tempDir);
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should update the documents and report them as XML by default', async () => {
      const result = await command.execute(['docs']);
      const out = output();

      expect(result.exitCode).toBe(0);
      expect(fs.readFileSync(path.join(docsDir, 'alpha.md'), 'utf-8')).toContain('## Backlinks');
      expect(out.startsWith('<update-backlinks>')).toBe(true);
      expect(out.trimEnd().endsWith('</update-backlinks>')).toBe(true);
      expect(out).toContain('<docsDir>docs</docsDir>');
      expect(out).toContain('<documentsScanned>2</documentsScanned>');
      expect(out).toContain('<documentsUpdated>2</documentsUpdated>');
      expect(out).toContain('<symbol>Alpha</symbol>');
      expect(out).toContain('<backlinkCount>1</backlinkCount>');
      expect(out).not.toContain(ANSI);
    });

    it('should not print the deprecation warning in XML mode', async () => {
      const legacy = new UpdateBacklinksCommand(undefined, undefined, undefined, undefined, true);

      await legacy.execute(['docs']);

      expect(output()).not.toContain('Deprecation');
      expect(output()).toContain('<update-backlinks>');
    });

    it('should accept --human before the docs directory', async () => {
      const result = await command.execute(['--human', 'docs']);

      expect(result.exitCode).toBe(0);
      expect(output()).toContain('Total: 2 documents updated');
    });

    it('should keep the colored terminal output with --human', async () => {
      const legacy = new UpdateBacklinksCommand(undefined, undefined, undefined, undefined, true);

      const result = await legacy.execute(['docs', '--human']);
      const out = output();

      expect(result.exitCode).toBe(0);
      expect(fs.readFileSync(path.join(docsDir, 'alpha.md'), 'utf-8')).toContain('## Backlinks');
      expect(out).toContain('Deprecation Notice');
      expect(out).toContain('Updating Backlinks');
      expect(out).toContain('backlinks)');
      expect(out).toContain('Total: 2 documents updated');
      expect(out).toContain(ANSI);
      expect(out).not.toContain('<update-backlinks>');
    });

    it('should fail for a missing path in both modes', async () => {
      const xml = await command.execute(['nope']);
      const human = await command.execute(['nope', '--human']);

      expect(xml.exitCode).toBe(1);
      expect(human.exitCode).toBe(1);
      expect(output()).toContain('Path not found');
      expect(output()).not.toContain('<update-backlinks>');
    });
  });
});
