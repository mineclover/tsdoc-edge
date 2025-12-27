/**
 * Tests for SpecBumpCommand
 */

import { SpecBumpCommand } from '../../commands/SpecBumpCommand';

describe('SpecBumpCommand', () => {
  let command: SpecBumpCommand;

  beforeEach(() => {
    command = new SpecBumpCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('spec-bump');
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
