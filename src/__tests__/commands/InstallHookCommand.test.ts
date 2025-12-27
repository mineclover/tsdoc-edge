/**
 * Tests for InstallHookCommand
 */

import { InstallHookCommand } from '../../commands/InstallHookCommand';

describe('InstallHookCommand', () => {
  let command: InstallHookCommand;

  beforeEach(() => {
    command = new InstallHookCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('install-hook');
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
