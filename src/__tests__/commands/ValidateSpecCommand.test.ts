/**
 * Tests for ValidateSpecCommand
 */

import { ValidateSpecCommand } from '../../commands/ValidateSpecCommand';

describe('ValidateSpecCommand', () => {
  let command: ValidateSpecCommand;

  beforeEach(() => {
    command = new ValidateSpecCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('validate-spec');
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
