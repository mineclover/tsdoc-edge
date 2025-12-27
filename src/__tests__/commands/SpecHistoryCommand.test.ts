/**
 * Tests for SpecHistoryCommand
 */

import { SpecHistoryCommand } from '../../commands/SpecHistoryCommand';

describe('SpecHistoryCommand', () => {
  let command: SpecHistoryCommand;

  beforeEach(() => {
    command = new SpecHistoryCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('spec-history');
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
