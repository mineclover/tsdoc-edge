/**
 * Tests for TaskCommands
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  TaskAddCommand,
  TaskListCommand,
  TaskStatsCommand,
  TaskUpdateCommand,
} from '../../commands/TaskCommands';
import { DatabaseManager } from '../../storage/DatabaseManager';

describe('TaskCommands', () => {
  describe('TaskListCommand', () => {
    let command: TaskListCommand;

    beforeEach(() => {
      command = new TaskListCommand();
    });

    describe('metadata', () => {
      it('should return command name', () => {
        expect(command.getName()).toBe('task-list');
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
  });

  describe('help', () => {
    let log: jest.SpyInstance;

    beforeEach(() => {
      log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it.each([
      ['task-list', () => new TaskListCommand()],
      ['task-add', () => new TaskAddCommand()],
      ['task-update', () => new TaskUpdateCommand()],
      ['task-stats', () => new TaskStatsCommand()],
    ])('documents --human for %s', async (_name, create) => {
      const result = await create().execute(['--help']);

      expect(result.exitCode).toBe(0);
      expect(log.mock.calls.flat().join('\n')).toContain('--human');
    });
  });

  describe('output formats', () => {
    const originalCwd = process.cwd();
    let tempDir: string;
    let log: jest.SpyInstance;

    const output = () => log.mock.calls.flat().join('\n');
    const reset = () => log.mockClear();

    /** Create a task through the command and return its id from the XML output. */
    const addTask = async (...args: string[]): Promise<string> => {
      const result = await new TaskAddCommand().execute(args);
      expect(result.exitCode).toBe(0);
      const id = /<id>([^<]+)<\/id>/.exec(output())?.[1];
      expect(id).toBeDefined();
      reset();
      return id as string;
    };

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'task-commands-'));
      new DatabaseManager(path.join(tempDir, '.tsdoc.db')).close();
      process.chdir(tempDir);
      log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    afterEach(() => {
      jest.restoreAllMocks();
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    describe('task-add', () => {
      it('prints the created task as XML by default', async () => {
        const result = await new TaskAddCommand().execute([
          'Fix <bug>',
          '--priority=high',
          '--type=bug',
          '--tags=a,b',
          '--due=2030-01-01',
        ]);

        expect(result.exitCode).toBe(0);
        const xml = output();
        expect(xml.startsWith('<task-created>')).toBe(true);
        expect(xml.endsWith('</task-created>')).toBe(true);
        expect(xml).toContain('<title>Fix &lt;bug&gt;</title>');
        expect(xml).toContain('<status>todo</status>');
        expect(xml).toContain('<priority>high</priority>');
        expect(xml).toContain('<type>bug</type>');
        expect(xml).toContain('<dueDate>2030-01-01</dueDate>');
        expect(xml).toContain('<tags>a,b</tags>');
        expect(xml).not.toContain('<assignedTo>');
        expect(xml).not.toContain('\x1b[');
      });

      it('keeps the colored text output behind --human', async () => {
        const result = await new TaskAddCommand().execute(['Write docs', '--human']);

        expect(result.exitCode).toBe(0);
        expect(output()).toContain('Task Created');
        expect(output()).toContain('Title: Write docs');
        expect(output()).not.toContain('<task-created>');

        reset();
        const list = await new TaskListCommand().execute([]);
        expect(list.exitCode).toBe(0);
        expect(output()).toContain('<title>Write docs</title>');
      });

      it('does not use --human as the task title', async () => {
        await new TaskAddCommand().execute(['--human', 'After flag']);

        expect(output()).toContain('Title: After flag');
      });
    });

    describe('task-list', () => {
      it('prints an empty XML document when there are no tasks', async () => {
        const result = await new TaskListCommand().execute([]);

        expect(result.exitCode).toBe(0);
        expect(output()).toContain('<task-list>');
        expect(output()).toContain('<total>0</total>');
        expect(output()).toContain('<tasks count="0">');
        expect(output()).not.toContain('No tasks found');
      });

      it('lists tasks as XML and applies filters', async () => {
        await addTask('First', '--priority=high', '--description=hello');
        await addTask('Second');

        await new TaskListCommand().execute([]);
        expect(output()).toContain('<total>2</total>');
        expect(output()).toContain('<title>First</title>');
        expect(output()).toContain('<title>Second</title>');
        expect(output()).toContain('<description>hello</description>');
        expect(output()).not.toContain('\x1b[');

        reset();
        await new TaskListCommand().execute(['--priority=high']);
        expect(output()).toContain('<total>1</total>');
        expect(output()).toContain('<priority>high</priority>');
        expect(output()).not.toContain('<title>Second</title>');
      });

      it('flags overdue tasks', async () => {
        await addTask('Late', '--due=2000-01-01');

        await new TaskListCommand().execute(['--overdue']);

        expect(output()).toContain('<overdueOnly>true</overdueOnly>');
        expect(output()).toContain('<overdue>true</overdue>');
      });

      it('keeps the colored text output behind --human', async () => {
        await addTask('Visible');

        await new TaskListCommand().execute(['--human']);

        expect(output()).toContain('Task List');
        expect(output()).toContain('Visible');
        expect(output()).not.toContain('<task-list>');
      });

      it('keeps the empty-list message behind --human', async () => {
        await new TaskListCommand().execute(['--human']);

        expect(output()).toContain('No tasks found');
      });

      it('keeps --json as the machine format', async () => {
        await addTask('Json task');

        await new TaskListCommand().execute(['--json']);

        const parsed = JSON.parse(output());
        expect(parsed).toHaveLength(1);
        expect(parsed[0].title).toBe('Json task');
      });
    });

    describe('task-update', () => {
      it('prints the updated task as XML by default and persists the change', async () => {
        const id = await addTask('Original');

        const result = await new TaskUpdateCommand().execute([
          id,
          '--status=done',
          '--title=Renamed',
        ]);

        expect(result.exitCode).toBe(0);
        const xml = output();
        expect(xml.startsWith('<task-updated>')).toBe(true);
        expect(xml).toContain(`<id>${id}</id>`);
        expect(xml).toContain('<updatedFields>status,title</updatedFields>');
        expect(xml).toContain('<title>Renamed</title>');
        expect(xml).toContain('<status>done</status>');
        expect(xml).not.toContain('\x1b[');

        reset();
        await new TaskListCommand().execute(['--status=done']);
        expect(output()).toContain('<title>Renamed</title>');
      });

      it('keeps the colored text output behind --human', async () => {
        const id = await addTask('Original');

        const result = await new TaskUpdateCommand().execute(['--human', id, '--status=blocked']);

        expect(result.exitCode).toBe(0);
        expect(output()).toContain(`Task ${id} updated`);
        expect(output()).toContain('Status:');
        expect(output()).not.toContain('<task-updated>');
      });

      it('keeps the not-found failure in both modes', async () => {
        const result = await new TaskUpdateCommand().execute(['task-missing', '--status=done']);

        expect(result.exitCode).toBe(1);
        expect(output()).toContain('Task not found: task-missing');
        expect(output()).not.toContain('<task-updated>');
      });
    });

    describe('task-stats', () => {
      it('prints the statistics as XML by default', async () => {
        const id = await addTask('One', '--priority=high');
        await addTask('Two');
        await new TaskUpdateCommand().execute([id, '--status=done']);
        reset();

        const result = await new TaskStatsCommand().execute([]);

        expect(result.exitCode).toBe(0);
        const xml = output();
        expect(xml.startsWith('<task-statistics>')).toBe(true);
        expect(xml.endsWith('</task-statistics>')).toBe(true);
        expect(xml).toContain('<total>2</total>');
        expect(xml).toContain('<completionRate>50</completionRate>');
        expect(xml).toContain('<byStatus count="5">');
        expect(xml).toContain('<byPriority count="4">');
        expect(xml).toContain('<byType count="6">');
        expect(xml).toContain('<status>done</status>');
        expect(xml).not.toContain('\x1b[');
      });

      it('keeps the colored text output behind --human', async () => {
        await addTask('One');

        await new TaskStatsCommand().execute(['--human']);

        expect(output()).toContain('Task Statistics');
        expect(output()).toContain('Total Tasks:');
        expect(output()).toContain('By Status');
        expect(output()).not.toContain('<task-statistics>');
      });
    });
  });
});
