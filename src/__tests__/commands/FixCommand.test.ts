/**
 * Tests for FixCommand
 */

import { FixCommand } from '../../commands/FixCommand';

describe('FixCommand', () => {
  let command: FixCommand;

  beforeEach(() => {
    command = new FixCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('fix');
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
