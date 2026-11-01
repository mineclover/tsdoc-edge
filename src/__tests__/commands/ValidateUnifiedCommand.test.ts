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
    it('should return command name and backward-compatible aliases', () => {
      expect(command.getName()).toBe('validate');
      expect(command.getAlias()).toEqual(['val', 'v']);
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

    it('should route tsdoc subcommand with help flag', async () => {
      const result = await command.execute(['tsdoc', '--help']);
      expect(result.exitCode).toBe(0);
    });
  });
});
