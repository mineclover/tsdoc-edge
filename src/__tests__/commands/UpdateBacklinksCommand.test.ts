/**
 * Tests for UpdateBacklinksCommand
 */

import { UpdateBacklinksCommand } from '../../commands/UpdateBacklinksCommand';

describe('UpdateBacklinksCommand', () => {
  let command: UpdateBacklinksCommand;

  beforeEach(() => {
    command = new UpdateBacklinksCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('update-backlinks');
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
