/**
 * Tests for OrphansCommand
 */

import { OrphansCommand } from '../../commands/OrphansCommand';

describe('OrphansCommand', () => {
  let command: OrphansCommand;

  beforeEach(() => {
    command = new OrphansCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('orphans');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toContain('orphan');
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
    });
  });
});
