/**
 * Tests for DepsCommand
 */

import { DepsCommand } from '../../commands/DepsCommand';

describe('DepsCommand', () => {
  let command: DepsCommand;

  beforeEach(() => {
    command = new DepsCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('deps');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toContain('dependencies');
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
    });

    it('should fail without symbol ID', async () => {
      const result = await command.execute([]);
      expect(result.exitCode).toBe(1);
    });
  });
});
