/**
 * Tests for SuggestCommand
 */

import { SuggestCommand } from '../../commands/SuggestCommand';

describe('SuggestCommand', () => {
  let command: SuggestCommand;

  beforeEach(() => {
    command = new SuggestCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('suggest');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toContain('suggestion');
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
    });
  });
});
