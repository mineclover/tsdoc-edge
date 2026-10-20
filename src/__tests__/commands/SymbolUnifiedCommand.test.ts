/**
 * Tests for SymbolUnifiedCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { SymbolUnifiedCommand } from '../../commands/SymbolUnifiedCommand';

describe('SymbolUnifiedCommand', () => {
  let command: SymbolUnifiedCommand;

  beforeEach(() => {
    command = new SymbolUnifiedCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('symbol');
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
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'symbol-unified-'));
      fs.mkdirSync(path.join(tempDir, 'docs'));
      fs.writeFileSync(path.join(tempDir, 'docs', 'alpha.md'), '# [[Alpha]]\n', 'utf-8');
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

    it('routes to the subcommand and prints XML by default', async () => {
      const { output, exitCode } = await run(['query', 'stats', '--dir=docs']);

      expect(exitCode).toBe(0);
      expect(output.startsWith('<symbol-statistics>')).toBe(true);
      expect(output).toContain('<totalSymbols>1</totalSymbols>');
      expect(output).not.toContain('\x1b[');
    });

    it('passes --human through to the subcommand', async () => {
      const { output } = await run(['query', 'stats', '--dir=docs', '--human']);

      expect(output).toContain('Symbol Statistics');
      expect(output).toContain('\x1b[');
    });

    it('accepts --human before the subcommand name', async () => {
      const { output, exitCode } = await run(['--human', 'query', 'stats', '--dir=docs']);

      expect(exitCode).toBe(0);
      expect(output).toContain('Symbol Statistics');
    });

    it('lists the available subcommands for an unknown subcommand', async () => {
      const { output, exitCode } = await run(['bogus']);

      expect(exitCode).toBe(1);
      expect(output).toContain('Unknown subcommand: bogus');
      expect(output).toContain('Available subcommands:');
      expect(output).toContain('who-uses');
    });

    it('documents --human in the unified help', async () => {
      const { output } = await run(['--help']);

      expect(output).toContain('--human');
    });
  });
});
