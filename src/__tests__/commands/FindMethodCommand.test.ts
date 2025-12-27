/**
 * Tests for FindMethodCommand
 */

import { FindMethodCommand } from '../../commands/FindMethodCommand';

describe('FindMethodCommand', () => {
  let command: FindMethodCommand;

  beforeEach(() => {
    command = new FindMethodCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('find-method');
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
