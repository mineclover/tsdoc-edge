/**
 * Tests for CheckLinksCommand
 */

import { CheckLinksCommand } from '../../commands/CheckLinksCommand';

describe('CheckLinksCommand', () => {
  let command: CheckLinksCommand;

  beforeEach(() => {
    command = new CheckLinksCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('check-links');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toContain('broken links');
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
    });
  });
});
