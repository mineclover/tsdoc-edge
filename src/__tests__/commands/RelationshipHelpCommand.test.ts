/**
 * Tests for RelationshipHelpCommand
 */

import { RelationshipHelpCommand } from '../../commands/RelationshipHelpCommand';

describe('RelationshipHelpCommand', () => {
  let command: RelationshipHelpCommand;

  beforeEach(() => {
    command = new RelationshipHelpCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('relationship-help');
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
