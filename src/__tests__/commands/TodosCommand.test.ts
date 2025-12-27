/**
 * Tests for TodosCommand
 */

import { TodosCommand } from '../../commands/TodosCommand';

describe('TodosCommand', () => {
  let command: TodosCommand;

  beforeEach(() => {
    command = new TodosCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('todos');
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
