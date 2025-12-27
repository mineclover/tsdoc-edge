/**
 * Tests for RelationshipVisualizeCommand
 */

import { RelationshipVisualizeCommand } from '../../commands/RelationshipVisualizeCommand';

describe('RelationshipVisualizeCommand', () => {
  let command: RelationshipVisualizeCommand;

  beforeEach(() => {
    command = new RelationshipVisualizeCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('relationship-visualize');
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
