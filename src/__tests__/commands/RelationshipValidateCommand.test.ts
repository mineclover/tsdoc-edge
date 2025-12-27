/**
 * Tests for RelationshipValidateCommand
 */

import { RelationshipValidateCommand } from '../../commands/RelationshipValidateCommand';

describe('RelationshipValidateCommand', () => {
  let command: RelationshipValidateCommand;

  beforeEach(() => {
    command = new RelationshipValidateCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('relationship-validate');
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
