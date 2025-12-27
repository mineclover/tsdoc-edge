/**
 * Tests for RelationshipImpactCommand
 */

import { RelationshipImpactCommand } from '../../commands/RelationshipImpactCommand';

describe('RelationshipImpactCommand', () => {
  let command: RelationshipImpactCommand;

  beforeEach(() => {
    command = new RelationshipImpactCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('relationship-impact');
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
