/**
 * Tests for PromoteSymbolCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { PromoteSymbolCommand } from '../../commands/PromoteSymbolCommand';

const SOURCE_DOC = `---
category: demo
status: implemented
---

# [[Overview]]

## [[Code Dependency]]

Depends on other code.

## [[Other Section]]

Unrelated.
`;

describe('PromoteSymbolCommand', () => {
  let command: PromoteSymbolCommand;

  beforeEach(() => {
    command = new PromoteSymbolCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('promote-symbol');
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
    let sourceFile: string;
    let targetDir: string;
    const originalCwd = process.cwd();

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'promote-symbol-'));
      process.chdir(tempDir);
      sourceFile = path.join(tempDir, 'overview.md');
      targetDir = path.join(tempDir, 'canonical');
      fs.writeFileSync(sourceFile, SOURCE_DOC, 'utf-8');
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

    it('prints only an XML document by default and performs the promotion', async () => {
      const { output, exitCode } = await run([sourceFile, 'Code Dependency', targetDir]);

      expect(exitCode).toBe(0);
      expect(output.startsWith('<promote-symbol>')).toBe(true);
      expect(output.endsWith('</promote-symbol>')).toBe(true);
      expect(output).toContain('<status>promoted</status>');
      expect(output).toContain('<symbolName>Code Dependency</symbolName>');
      expect(output).toContain(`<path>${path.join(targetDir, 'code-dependency.md')}</path>`);
      expect(output).toContain('<action>created</action>');
      expect(output).not.toContain('\x1b[');

      const canonical = fs.readFileSync(path.join(targetDir, 'code-dependency.md'), 'utf-8');
      expect(canonical).toContain('# [[Code Dependency]]');
      expect(canonical).toContain('Depends on other code.');
      const updatedSource = fs.readFileSync(sourceFile, 'utf-8');
      expect(updatedSource).not.toContain('## [[Code Dependency]]');
      expect(updatedSource).toContain('See [[Code Dependency]] for canonical definition');
    });

    it('performs the same promotion with --human and prints the colored report', async () => {
      const { output, exitCode } = await run([sourceFile, 'Code Dependency', targetDir, '--human']);

      expect(exitCode).toBe(0);
      expect(output).toContain('Promote Symbol: Code Dependency');
      expect(output).toContain('Promotion Summary');
      expect(output).toContain('\x1b[');
      expect(output).not.toContain('<promote-symbol>');
      expect(fs.existsSync(path.join(targetDir, 'code-dependency.md'))).toBe(true);
    });

    it('does not mistake --human for the target directory', async () => {
      const { exitCode } = await run([sourceFile, 'Code Dependency', '--human']);

      expect(exitCode).toBe(0);
      expect(fs.existsSync(path.join(tempDir, 'managed/relationships/code-dependency.md'))).toBe(
        true
      );
    });

    it('keeps the failure output and leaves files untouched when the H2 is missing', async () => {
      const { output, exitCode } = await run([sourceFile, 'Missing Symbol', targetDir]);

      expect(exitCode).toBe(1);
      expect(output).toContain('H2 section not found: ## [[Missing Symbol]]');
      expect(output).toContain('[[Code Dependency]]');
      expect(fs.readFileSync(sourceFile, 'utf-8')).toBe(SOURCE_DOC);
      expect(fs.existsSync(targetDir)).toBe(false);
    });
  });
});
