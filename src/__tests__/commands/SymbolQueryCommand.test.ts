/**
 * Tests for SymbolQueryCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { SymbolQueryCommand } from '../../commands/SymbolQueryCommand';

describe('SymbolQueryCommand', () => {
  let command: SymbolQueryCommand;

  beforeEach(() => {
    command = new SymbolQueryCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('symbol-query');
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
    const originalCwd = process.cwd();

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'symbol-query-'));
      fs.mkdirSync(path.join(tempDir, 'docs'));
      fs.writeFileSync(
        path.join(tempDir, 'docs', 'alpha.md'),
        '# [[Alpha]]\n\nAlpha uses [[Beta]] and links to [[Gamma Delta]].\n',
        'utf-8'
      );
      fs.writeFileSync(
        path.join(tempDir, 'docs', 'beta.md'),
        '# [[Beta]]\n\n## [[Alpha]]\n\nBeta is used by [[Alpha]] & <others>.\n',
        'utf-8'
      );
      process.chdir(tempDir);
    });

    afterEach(() => {
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    const run = async (args: string[]): Promise<{ output: string; exitCode: number }> => {
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const result = await command.execute([...args, '--dir=docs']);
      return {
        output: log.mock.calls.map((call) => call.join(' ')).join('\n'),
        exitCode: result.exitCode,
      };
    };

    it('list prints only an XML document by default', async () => {
      const { output, exitCode } = await run(['list', '--all']);

      expect(exitCode).toBe(0);
      expect(output.startsWith('<symbol-list>')).toBe(true);
      expect(output.endsWith('</symbol-list>')).toBe(true);
      expect(output).toContain('<totalCount>3</totalCount>');
      expect(output).toContain('<name>Gamma Delta</name>');
      expect(output).toContain('<filePath>docs/alpha.md</filePath>');
      expect(output).not.toContain('\x1b[');
      expect(output).not.toContain('Building symbol index');
    });

    it('list honors --pattern and hides symbols without a primary definition by default', async () => {
      const { output } = await run(['list', '--pattern=^Al']);

      expect(output).toContain('<totalCount>1</totalCount>');
      expect(output).toContain('<pattern>^Al</pattern>');
      expect(output).not.toContain('<name>Beta</name>');
    });

    it('list prints the colored report with --human', async () => {
      const { output, exitCode } = await run(['list', '--human']);

      expect(exitCode).toBe(0);
      expect(output).toContain('Symbol Query');
      expect(output).toContain('Indexed 3 symbols from 2 documents');
      expect(output).toContain('[[Alpha]]');
      expect(output).toContain('Total: 2 symbols');
      expect(output).toContain('\x1b[');
      expect(output).not.toContain('<symbol-list>');
    });

    it('search prints matches as XML', async () => {
      const { output } = await run(['search', 'bet']);

      expect(output.startsWith('<symbol-search>')).toBe(true);
      expect(output).toContain('<matchCount>1</matchCount>');
      expect(output).toContain('<name>Beta</name>');
    });

    it('info prints details, auxiliaries and references as XML', async () => {
      const { output } = await run(['info', 'Alpha']);

      expect(output.startsWith('<symbol-info>')).toBe(true);
      expect(output).toContain('<primaryFile>docs/alpha.md</primaryFile>');
      expect(output).toContain('<auxiliaries count="1">');
      expect(output).toContain('<references count="1">');
      expect(output).toContain('Beta is used by [[Alpha]] &amp; &lt;others&gt;.');
      expect(output).not.toContain('\x1b[');
    });

    it('info keeps the failure output when the symbol is unknown', async () => {
      const { output, exitCode } = await run(['info', 'Alpa']);

      expect(exitCode).toBe(1);
      expect(output).toContain('Symbol [[Alpa]] not found');
      expect(output).toContain('[[Alpha]]');
    });

    it('backlinks prints documents as XML', async () => {
      const { output } = await run(['backlinks', 'Alpha']);

      expect(output.startsWith('<symbol-backlinks>')).toBe(true);
      expect(output).toContain('<documentCount>1</documentCount>');
      expect(output).toContain('<path>docs/beta.md</path>');
    });

    it('similar prints candidates as XML', async () => {
      const { output } = await run(['similar', 'Alph']);

      expect(output.startsWith('<similar-symbols>')).toBe(true);
      expect(output).toContain('<target>Alph</target>');
      expect(output).toContain('<name>Alpha</name>');
    });

    it('stats prints the statistics as XML', async () => {
      const { output } = await run(['stats']);

      expect(output.startsWith('<symbol-statistics>')).toBe(true);
      expect(output).toContain('<totalSymbols>3</totalSymbols>');
      expect(output).toContain('<withoutPrimary>1</withoutPrimary>');
      expect(output).toContain('<avgReferencesPerSymbol>1.0</avgReferencesPerSymbol>');
    });

    it('stats still prints the colored report with --human', async () => {
      const { output } = await run(['stats', '--human']);

      expect(output).toContain('Symbol Statistics');
      expect(output).toContain('Avg references per symbol: ');
    });

    it('keeps the usage text for an unknown subcommand', async () => {
      const { output, exitCode } = await run(['frobnicate']);

      expect(exitCode).toBe(0);
      expect(output).toContain('Usage: symbol-query <subcommand> [options]');
      expect(output).not.toContain('\x1b[');
    });
  });
});
