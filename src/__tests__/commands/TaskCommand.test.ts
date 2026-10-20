/**
 * Tests for TaskCommand (router)
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { TaskCommand } from '../../commands/TaskCommand';
import { DatabaseManager } from '../../storage/DatabaseManager';

describe('TaskCommand', () => {
  const originalCwd = process.cwd();
  let command: TaskCommand;
  let log: jest.SpyInstance;

  const output = () => log.mock.calls.flat().join('\n');

  beforeEach(() => {
    command = new TaskCommand();
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.chdir(originalCwd);
  });

  it('returns command name', () => {
    expect(command.getName()).toBe('task');
  });

  it('documents --human in the help text', async () => {
    const result = await command.execute(['--help']);

    expect(result.exitCode).toBe(0);
    expect(output()).toContain('--human');
  });

  it('lists the available subcommands for an unknown subcommand', async () => {
    const result = await command.execute(['bogus']);

    expect(result.exitCode).toBe(1);
    expect(output()).toContain('Unknown subcommand: bogus');
    expect(output()).toContain('Available subcommands:');
    expect(output()).toContain('update');
  });

  describe('routing', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'task-router-'));
      new DatabaseManager(path.join(tempDir, '.tsdoc.db')).close();
      process.chdir(tempDir);
    });

    afterEach(() => {
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('routes add and list to their XML documents by default', async () => {
      await command.execute(['add', 'Routed task']);
      expect(output().startsWith('<task-created>')).toBe(true);

      log.mockClear();
      await command.execute(['list']);
      expect(output().startsWith('<task-list>')).toBe(true);
      expect(output()).toContain('<title>Routed task</title>');
    });

    it('passes --human through to the subcommand', async () => {
      await command.execute(['stats', '--human']);

      expect(output()).toContain('Task Statistics');
      expect(output()).not.toContain('<task-statistics>');
    });
  });
});
