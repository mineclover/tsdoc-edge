/**
 * Tests for SymbolRenameCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { SymbolRenameCommand } from '../../commands/SymbolRenameCommand';

describe('SymbolRenameCommand', () => {
  let command: SymbolRenameCommand;

  beforeEach(() => {
    command = new SymbolRenameCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('symbol-rename');
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
    let baseDir: string;

    const definition = '# [[Old Name]]\n\nDefinition of the symbol.\n';
    const consumer = 'Uses [[Old Name]] and again [[Old Name]].\n';

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'symbol-rename-'));
      baseDir = path.join(tempDir, 'managed');
      fs.mkdirSync(baseDir);
      fs.writeFileSync(path.join(baseDir, 'old-name.md'), definition, 'utf-8');
      fs.writeFileSync(path.join(baseDir, 'consumer.md'), consumer, 'utf-8');
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    const run = async (args: string[]): Promise<{ output: string; exitCode: number }> => {
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const result = await command.execute([...args, `--base-dir=${baseDir}`]);
      return {
        output: log.mock.calls.map((call) => call.join(' ')).join('\n'),
        exitCode: result.exitCode,
      };
    };

    const read = (name: string): string => fs.readFileSync(path.join(baseDir, name), 'utf-8');

    it('prints only an XML document by default and honors --dry-run', async () => {
      const { output, exitCode } = await run(['Old Name', 'New Name', '--dry-run']);

      expect(exitCode).toBe(0);
      expect(output.startsWith('<symbol-rename>')).toBe(true);
      expect(output.endsWith('</symbol-rename>')).toBe(true);
      expect(output).toContain('<status>dry-run</status>');
      expect(output).toContain('<oldSymbol>Old Name</oldSymbol>');
      expect(output).toContain('<newSymbol>New Name</newSymbol>');
      expect(output).toContain('<referenceCount>3</referenceCount>');
      expect(output).toContain('<fileCount>2</fileCount>');
      expect(output).not.toContain('\x1b[');
      expect(read('old-name.md')).toBe(definition);
      expect(read('consumer.md')).toBe(consumer);
    });

    it('applies the rename and reports the modified files in XML mode', async () => {
      const { output, exitCode } = await run(['Old Name', 'New Name', '--yes']);

      expect(exitCode).toBe(0);
      expect(output).toContain('<status>renamed</status>');
      expect(output).toContain('<updated>3</updated>');
      expect(output).toContain('<filesModified count="2">');
      expect(read('old-name.md')).toContain('# [[New Name]]');
      expect(read('consumer.md')).toBe('Uses [[New Name]] and again [[New Name]].\n');
    });

    it('applies the same rename with --human and prints the colored report', async () => {
      const { output, exitCode } = await run(['Old Name', 'New Name', '--yes', '--human']);

      expect(exitCode).toBe(0);
      expect(output).toContain('Rename Symbol');
      expect(output).toContain('Validation passed');
      expect(output).toContain('Symbol rename complete!');
      expect(output).toContain('\x1b[');
      expect(output).not.toContain('<symbol-rename>');
      expect(read('consumer.md')).toBe('Uses [[New Name]] and again [[New Name]].\n');
    });

    it('keeps the validation failure output and changes nothing', async () => {
      const { output, exitCode } = await run(['Unknown Symbol', 'New Name', '--yes']);

      expect(exitCode).toBe(1);
      expect(output).toContain('Validation failed:');
      expect(output).toContain('has no H1 primary definition');
      expect(read('consumer.md')).toBe(consumer);
    });
  });
});
