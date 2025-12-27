/**
 * Tests for RelationshipQueryCommand
 */

import { RelationshipQueryCommand } from '../../commands/RelationshipQueryCommand';

describe('RelationshipQueryCommand', () => {
  let command: RelationshipQueryCommand;

  beforeEach(() => {
    command = new RelationshipQueryCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('relationship-query');
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
