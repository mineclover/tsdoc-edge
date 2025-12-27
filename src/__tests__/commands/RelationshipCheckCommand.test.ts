/**
 * Tests for RelationshipCheckCommand
 */

import { RelationshipCheckCommand } from '../../commands/RelationshipCheckCommand';

describe('RelationshipCheckCommand', () => {
  let command: RelationshipCheckCommand;

  beforeEach(() => {
    command = new RelationshipCheckCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('relationship-check');
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
