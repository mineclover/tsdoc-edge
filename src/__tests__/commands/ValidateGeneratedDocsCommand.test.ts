/**
 * Tests for ValidateGeneratedDocsCommand
 */

import { ValidateGeneratedDocsCommand } from '../../commands/ValidateGeneratedDocsCommand';

describe('ValidateGeneratedDocsCommand', () => {
  let command: ValidateGeneratedDocsCommand;

  beforeEach(() => {
    command = new ValidateGeneratedDocsCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('validate-generated-docs');
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
