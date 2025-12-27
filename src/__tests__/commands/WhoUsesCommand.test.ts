/**
 * Tests for WhoUsesCommand
 */

import { WhoUsesCommand } from '../../commands/WhoUsesCommand';

describe('WhoUsesCommand', () => {
  let command: WhoUsesCommand;

  beforeEach(() => {
    command = new WhoUsesCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('who-uses');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toContain('uses');
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
    });

    it('should fail without symbol name', async () => {
      const result = await command.execute([]);
      expect(result.exitCode).toBe(1);
    });
  });
});
