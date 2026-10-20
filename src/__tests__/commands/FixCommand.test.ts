/**
 * Tests for FixCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { FixCommand } from '../../commands/FixCommand';

const UNDOCUMENTED_SOURCE = `export function helper(x: number, y: number): number {
  return x + y;
}
`;

describe('FixCommand', () => {
  let command: FixCommand;

  beforeEach(() => {
    command = new FixCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('fix');
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

    it('should fail if path does not exist', async () => {
      jest.spyOn(console, 'log').mockImplementation(() => undefined);

      const result = await command.execute(['/nonexistent/path/for/fix']);

      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('Path not found');
    });
  });

  describe('output format', () => {
    let tempDir: string;
    let sourceFile: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fix-command-'));
      sourceFile = path.join(tempDir, 'helper.ts');
      fs.writeFileSync(sourceFile, UNDOCUMENTED_SOURCE, 'utf-8');
    });

    afterEach(() => {
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

    // The fixing path itself (DocumentationFixer is loaded through a native dynamic import) cannot
    // run inside jest's VM; it is covered by running the built CLI against a fixture project.
    it('prints only an XML document by default', async () => {
      const { output, exitCode } = await run([tempDir, '--min-score=0', '--dry-run']);

      expect(exitCode).toBe(0);
      expect(output.startsWith('<doc-fix>')).toBe(true);
      expect(output.endsWith('</doc-fix>')).toBe(true);
      expect(output).toContain(`<targetPath>${tempDir}</targetPath>`);
      expect(output).toContain('<dryRun>true</dryRun>');
      expect(output).toContain('<symbolsAnalyzed>1</symbolsAnalyzed>');
      expect(output).toContain('<symbolsNeedingFix>0</symbolsNeedingFix>');
      expect(output).toContain('<files count="0">');
      expect(output).not.toContain('\x1b[');
      expect(fs.readFileSync(sourceFile, 'utf-8')).toBe(UNDOCUMENTED_SOURCE);
    });

    it('prints the colored report with --human', async () => {
      const { output, exitCode } = await run(['--human', tempDir, '--min-score=0']);

      expect(exitCode).toBe(0);
      expect(output).toContain('TSDoc Edge - Fix Documentation');
      expect(output).toContain('All documentation meets quality standards!');
      expect(output).toContain('\x1b[');
      expect(output).not.toContain('<doc-fix>');
    });
  });
});
