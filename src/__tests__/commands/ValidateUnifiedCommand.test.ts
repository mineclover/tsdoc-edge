/**
 * Tests for ValidateUnifiedCommand
 */

import { ValidateUnifiedCommand } from '../../commands/ValidateUnifiedCommand';

describe('ValidateUnifiedCommand', () => {
  let command: ValidateUnifiedCommand;

  beforeEach(() => {
    command = new ValidateUnifiedCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('val');
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
