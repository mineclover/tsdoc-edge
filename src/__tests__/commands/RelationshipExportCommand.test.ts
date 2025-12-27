/**
 * Tests for RelationshipExportCommand
 */

import { RelationshipExportCommand } from '../../commands/RelationshipExportCommand';

describe('RelationshipExportCommand', () => {
  let command: RelationshipExportCommand;

  beforeEach(() => {
    command = new RelationshipExportCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('relationship-export');
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
