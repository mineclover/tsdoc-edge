/**
 * Tests for SystemStatusCommand
 */

import { SystemStatusCommand } from '../../commands/SystemStatusCommand';

describe('SystemStatusCommand', () => {
  let command: SystemStatusCommand;

  beforeEach(() => {
    command = new SystemStatusCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('system-status');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toContain('status');
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
    });
  });
});
