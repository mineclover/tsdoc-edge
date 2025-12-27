/**
 * Tests for RelationshipClustersCommand
 */

import { RelationshipClustersCommand } from '../../commands/RelationshipClustersCommand';

describe('RelationshipClustersCommand', () => {
  let command: RelationshipClustersCommand;

  beforeEach(() => {
    command = new RelationshipClustersCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('relationship-clusters');
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
