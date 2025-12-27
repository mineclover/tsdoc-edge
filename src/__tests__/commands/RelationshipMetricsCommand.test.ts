/**
 * Tests for RelationshipMetricsCommand
 */

import { RelationshipMetricsCommand } from '../../commands/RelationshipMetricsCommand';

describe('RelationshipMetricsCommand', () => {
  let command: RelationshipMetricsCommand;

  beforeEach(() => {
    command = new RelationshipMetricsCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('relationship-metrics');
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
