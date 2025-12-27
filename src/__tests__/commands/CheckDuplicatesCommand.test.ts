/**
 * Tests for CheckDuplicatesCommand
 */

import { CheckDuplicatesCommand } from '../../commands/CheckDuplicatesCommand';

describe('CheckDuplicatesCommand', () => {
  let command: CheckDuplicatesCommand;

  beforeEach(() => {
    command = new CheckDuplicatesCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('check-duplicates');
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
