/**
 * Tests for GenerateDocsCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { GenerateDocsCommand } from '../../commands/GenerateDocsCommand';

describe('GenerateDocsCommand', () => {
  let command: GenerateDocsCommand;
  let tempDir: string;

  beforeEach(() => {
    command = new GenerateDocsCommand();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-generate-docs-'));
  });

  afterEach(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('generate-docs');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toContain('documentation');
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
    });

    it('rejects unknown flags and dry-run writes no output', async () => {
      const source = path.join(tempDir, 'source.ts');
      const output = path.join(tempDir, 'generated');
      fs.writeFileSync(
        source,
        '/** Example. @public @purpose Example @input None @output None @context Test @logic Test @effect None @scope Public */\nexport function example() {}\n'
      );
      const unknown = await command.execute([source, output, '--unknown']);
      expect(unknown.exitCode).toBe(1);

      const dryRun = await command.execute([source, output, '-n']);
      expect(dryRun.exitCode).toBe(0);
      expect(fs.existsSync(output)).toBe(false);
    });
  });
});
