/**
 * Tests for ImproveCommand
 */

import { ImproveCommand } from '../../commands/ImproveCommand';

describe('ImproveCommand', () => {
  let command: ImproveCommand;

  beforeEach(() => {
    command = new ImproveCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('improve');
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
