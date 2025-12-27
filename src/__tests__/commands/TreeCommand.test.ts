/**
 * Tests for TreeCommand
 */

import { TreeCommand } from '../../commands/TreeCommand';

describe('TreeCommand', () => {
  let command: TreeCommand;

  beforeEach(() => {
    command = new TreeCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('tree');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toContain('hierarchy');
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
    });
  });
});
