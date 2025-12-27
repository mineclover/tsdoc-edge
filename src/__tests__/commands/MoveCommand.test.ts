/**
 * Tests for MoveCommand
 */

import { MoveCommand } from '../../commands/MoveCommand';

describe('MoveCommand', () => {
  let command: MoveCommand;

  beforeEach(() => {
    command = new MoveCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('move');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toContain('Move');
    });
  });

  describe('execute', () => {
    it('should return error when source is missing', async () => {
      const result = await command.execute([]);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('Missing');
    });

    it('should return error when destination is missing', async () => {
      const result = await command.execute(['source.md']);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('Missing');
    });

    it('should return error when source file does not exist', async () => {
      const result = await command.execute(['nonexistent.md', 'dest.md']);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('does not exist');
    });
  });
});
