/**
 * Tests for PlansCommand
 */

import { PlansCommand } from '../../commands/PlansCommand';

describe('PlansCommand', () => {
  let command: PlansCommand;

  beforeEach(() => {
    command = new PlansCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('plans');
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
