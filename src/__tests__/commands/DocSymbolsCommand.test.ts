/**
 * Tests for DocSymbolsCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { DocSymbolsCommand } from '../../commands/DocSymbolsCommand';

const ANSI = '\x1b[';

describe('DocSymbolsCommand', () => {
  let command: DocSymbolsCommand;

  beforeEach(() => {
    command = new DocSymbolsCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('doc-symbols');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toBeDefined();
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
    let consoleSpy: jest.SpyInstance;

    const output = (): string => consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n');

    const writeDoc = (relativePath: string, content: string): void => {
      const target = path.join(tempDir, 'managed', relativePath);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content, 'utf-8');
    };

    beforeEach(() => {
      tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'doc-symbols-test-')));
      writeDoc('concepts/beta.md', '# [[Beta Concept]]\n\nBeta is a concept.\n');
      writeDoc(
        'features/alpha.md',
        '# [[Alpha Feature]]\n\nAlpha does <things> & "stuff".\n\nSee [[Beta Concept]].\n'
      );
      writeDoc('architecture/gamma.md', '# [[Gamma Arch]]\n\nGamma architecture.\n');
      process.chdir(tempDir);
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should list the symbols as XML by default, in category priority order', async () => {
      const result = await command.execute([]);
      const out = output();

      expect(result.exitCode).toBe(0);
      expect(out.startsWith('<document-symbols>')).toBe(true);
      expect(out.trimEnd().endsWith('</document-symbols>')).toBe(true);
      expect(out).toContain('<totalSymbols>3</totalSymbols>');
      expect(out).toContain('<totalCategories>3</totalCategories>');
      expect(out).toContain('<symbols count="3">');
      expect(out).toContain('<name>Alpha Feature</name>');
      expect(out).toContain(
        '<summary>Alpha does &lt;things&gt; &amp; &quot;stuff&quot;.</summary>'
      );
      expect(out.indexOf('<name>Gamma Arch</name>')).toBeLessThan(
        out.indexOf('<name>Alpha Feature</name>')
      );
      expect(out.indexOf('<name>Alpha Feature</name>')).toBeLessThan(
        out.indexOf('<name>Beta Concept</name>')
      );
      expect(out).not.toContain(ANSI);
    });

    it('should echo the applied filters', async () => {
      await command.execute(['--category', 'concepts', '--search', 'BETA']);
      const out = output();

      expect(out).toContain('<totalSymbols>1</totalSymbols>');
      expect(out).toContain('<categoryFilter>concepts</categoryFilter>');
      expect(out).toContain('<searchQuery>beta</searchQuery>');
      expect(out).toContain('<name>Beta Concept</name>');
      expect(out).not.toContain('Alpha Feature');
    });

    it('should still emit a document when nothing matches', async () => {
      const result = await command.execute(['--search', 'zzzz']);
      const out = output();

      expect(result.exitCode).toBe(0);
      expect(out).toContain('<totalSymbols>0</totalSymbols>');
      expect(out).toContain('<symbols count="0">');
      expect(out).not.toContain(ANSI);
    });

    it('should keep the colored terminal output with --human', async () => {
      const result = await command.execute(['--human']);
      const out = output();

      expect(result.exitCode).toBe(0);
      expect(out).toContain('Document Symbols');
      expect(out).toContain('[[Alpha Feature]]');
      expect(out).toContain('Total:');
      expect(out).toContain('3 document symbols across 3 categories');
      expect(out).toContain(ANSI);
      expect(out).not.toContain('<document-symbols>');
    });

    it('should keep --llm output taking precedence over the default format', async () => {
      await command.execute(['--llm']);
      const out = output();

      expect(out).toContain('# Project Glossary: TSDoc Edge');
      expect(out).not.toContain('<document-symbols>');
    });
  });
});
