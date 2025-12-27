/**
 * Tests for RebuildIndexCommand
 */

import { RebuildIndexCommand } from '../../commands/RebuildIndexCommand';

describe('RebuildIndexCommand', () => {
  let command: RebuildIndexCommand;

  beforeEach(() => {
    command = new RebuildIndexCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('rebuild-index');
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
