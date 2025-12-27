/**
 * Tests for UninstallHookCommand
 */

import { UninstallHookCommand } from '../../commands/UninstallHookCommand';

describe('UninstallHookCommand', () => {
  let command: UninstallHookCommand;

  beforeEach(() => {
    command = new UninstallHookCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('uninstall-hook');
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
