/**
 * Tests for RelationshipCommand
 */

import { RelationshipCommand } from '../../commands/RelationshipCommand';

describe('RelationshipCommand', () => {
  let command: RelationshipCommand;

  beforeEach(() => {
    command = new RelationshipCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('relationship');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toContain('relationship');
    });
  });

  describe('execute', () => {
    it('should display help with no args', async () => {
      const result = await command.execute([]);
      expect(result.exitCode).toBe(0);
    });

    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
    });

    it('should fail with unknown subcommand', async () => {
      const result = await command.execute(['unknown-subcommand']);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('Unknown subcommand');
    });

    it('should route to stats subcommand', async () => {
      const result = await command.execute(['stats', '--help']);
      expect(result.exitCode).toBe(0);
    });

    it('should route to help subcommand', async () => {
      const result = await command.execute(['help']);
      expect(result.exitCode).toBe(0);
    });
  });
});
