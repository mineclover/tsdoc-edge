/**
 * Tests for RelationshipStatsCommand
 */

import { RelationshipStatsCommand } from '../../commands/RelationshipStatsCommand';

describe('RelationshipStatsCommand', () => {
  let command: RelationshipStatsCommand;

  beforeEach(() => {
    command = new RelationshipStatsCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('relationship-stats');
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
