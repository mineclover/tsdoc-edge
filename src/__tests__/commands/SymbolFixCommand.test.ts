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

  describe('output format', () => {
    let tempDir: string;
    let docsDir: string;
    const originalCwd = process.cwd();

    const originalFiles = {
      'one.md': '# [[Widget]]\n\nFirst definition.\n',
      'two.md': '# [[Widget]]\n\nSecond definition.\n',
    };

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'symbol-fix-'));
      docsDir = path.join(tempDir, 'docs');
      fs.mkdirSync(docsDir);
      for (const [name, content] of Object.entries(originalFiles)) {
        fs.writeFileSync(path.join(docsDir, name), content, 'utf-8');
      }
      process.chdir(tempDir);
    });

    afterEach(() => {
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    const run = async (args: string[]): Promise<{ output: string; exitCode: number }> => {
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const result = await command.execute(args);
      return {
        output: log.mock.calls.map((call) => call.join(' ')).join('\n'),
        exitCode: result.exitCode,
      };
    };

    const readDocs = (): Record<string, string> =>
      Object.fromEntries(
        Object.keys(originalFiles).map((name) => [
          name,
          fs.readFileSync(path.join(docsDir, name), 'utf-8'),
        ])
      );

    it('prints only an XML document by default and honors --dry-run', async () => {
      const { output, exitCode } = await run(['docs', '--dry-run']);

      expect(exitCode).toBe(0);
      expect(output.startsWith('<symbol-fix>')).toBe(true);
      expect(output.endsWith('</symbol-fix>')).toBe(true);
      expect(output).toContain('<totalIssues>1</totalIssues>');
      expect(output).toContain('<dryRun>true</dryRun>');
      expect(output).toContain('<type>duplicate-h1</type>');
      expect(output).toContain('<symbolName>Widget</symbolName>');
      expect(output).toContain('<filePath>docs/two.md</filePath>');
      expect(output).not.toContain('\x1b[');
      expect(readDocs()).toEqual(originalFiles);
    });

    it('does not modify manual-review issues without --dry-run either', async () => {
      const { output, exitCode } = await run(['docs']);

      expect(exitCode).toBe(0);
      expect(output).toContain('<dryRun>false</dryRun>');
      expect(output).toContain('<fixed>0</fixed>');
      expect(readDocs()).toEqual(originalFiles);
    });

    it('uses the default directory when only flags are given', async () => {
      fs.mkdirSync('managed');
      fs.writeFileSync(path.join('managed', 'a.md'), '# [[Solo]]\n', 'utf-8');

      const { output } = await run(['--dry-run']);

      expect(output).toContain('<totalIssues>0</totalIssues>');
      expect(output).toContain('<issues count="0">');
    });

    it('filters by --type', async () => {
      const { output } = await run(['docs', '--dry-run', '--type=typo']);

      expect(output).toContain('<typeFilter>typo</typeFilter>');
      expect(output).toContain('<totalIssues>0</totalIssues>');
    });

    it('prints the colored report with --human', async () => {
      const { output, exitCode } = await run(['docs', '--dry-run', '--human']);

      expect(exitCode).toBe(0);
      expect(output).toContain('Symbol Fix');
      expect(output).toContain('Analyzed 1 symbols from 2 documents');
      expect(output).toContain('Found 1 fixable issues');
      expect(output).toContain('Duplicate H1 Definitions');
      expect(output).toContain('\x1b[');
      expect(output).not.toContain('<symbol-fix>');
      expect(readDocs()).toEqual(originalFiles);
    });
  });
});
