/**
 * Tests for MoveCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { MoveCommand } from '../../commands/MoveCommand';

describe('MoveCommand', () => {
  let command: MoveCommand;

  beforeEach(() => {
    command = new MoveCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('move');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toContain('Move');
    });
  });

  describe('execute', () => {
    it('should return error when source is missing', async () => {
      const result = await command.execute([]);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('Missing');
    });

    it('should return error when destination is missing', async () => {
      const result = await command.execute(['source.md']);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('Missing');
    });

    it('should return error when source file does not exist', async () => {
      const result = await command.execute(['nonexistent.md', 'dest.md']);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('does not exist');
    });
  });

  describe('output format', () => {
    let tempDir: string;
    const originalCwd = process.cwd();

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'move-command-'));
      fs.mkdirSync(path.join(tempDir, 'managed', 'features'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'managed', 'features', 'old.md'), '# Old\n', 'utf-8');
      fs.writeFileSync(
        path.join(tempDir, 'managed', 'README.md'),
        'See [old doc](features/old.md) for details.\n',
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
      const result = await command.execute(args);
      return {
        output: log.mock.calls.map((call) => call.join(' ')).join('\n'),
        exitCode: result.exitCode,
      };
    };

    it('prints only an XML document by default and moves the file', async () => {
      const { output, exitCode } = await run(['features/old.md', 'features/new.md']);

      expect(exitCode).toBe(0);
      expect(output.startsWith('<move-file>')).toBe(true);
      expect(output.endsWith('</move-file>')).toBe(true);
      expect(output).toContain('<source>features/old.md</source>');
      expect(output).toContain('<destination>features/new.md</destination>');
      expect(output).toContain('<referenceCount>2</referenceCount>');
      expect(output).toContain('<file>README.md</file>');
      expect(output).not.toContain('\x1b[');
      expect(fs.existsSync(path.join(tempDir, 'managed', 'features', 'old.md'))).toBe(false);
      expect(fs.existsSync(path.join(tempDir, 'managed', 'features', 'new.md'))).toBe(true);
      expect(fs.readFileSync(path.join(tempDir, 'managed', 'README.md'), 'utf-8')).toContain(
        '(new.md)'
      );
    });

    it('performs the same move with --human and keeps the plain text output', async () => {
      const { output, exitCode } = await run(['features/old.md', 'features/new.md', '--human']);

      expect(exitCode).toBe(0);
      expect(output).toBe('Found 2 references');
      expect(fs.existsSync(path.join(tempDir, 'managed', 'features', 'new.md'))).toBe(true);
    });

    it('keeps the failure result when the destination already exists', async () => {
      fs.writeFileSync(path.join(tempDir, 'managed', 'features', 'new.md'), '# New\n', 'utf-8');

      const { output, exitCode } = await run(['features/old.md', 'features/new.md']);

      expect(exitCode).toBe(1);
      expect(output).toBe('');
      expect(fs.existsSync(path.join(tempDir, 'managed', 'features', 'old.md'))).toBe(true);
    });
  });
});
