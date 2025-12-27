/**
 * Tests for TaskCommands
 */

import { TaskListCommand } from '../../commands/TaskCommands';

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
});
