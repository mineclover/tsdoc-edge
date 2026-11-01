/**
 * Tests for MoveCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { MoveCommand } from '../../commands/MoveCommand';

describe('MoveCommand', () => {
  let command: MoveCommand;
  let tempDir: string;
  const originalCwd = process.cwd();

  beforeEach(() => {
    command = new MoveCommand();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-move-'));
    fs.mkdirSync(path.join(tempDir, 'managed'), { recursive: true });
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
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

    it('rejects unknown flags and ignores dry-run flags as positional arguments', async () => {
      const unknown = await command.execute(['source.md', 'dest.md', '--unknown']);
      expect(unknown.exitCode).toBe(1);

      fs.writeFileSync(path.join(tempDir, 'managed/source.md'), '# source\n');
      const dryRun = await command.execute(['source.md', 'dest.md', '-n']);
      expect(dryRun.exitCode).toBe(0);
      expect(fs.existsSync(path.join(tempDir, 'managed/source.md'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'managed/dest.md'))).toBe(false);
    });
  });
});
