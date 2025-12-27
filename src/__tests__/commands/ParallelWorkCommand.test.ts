/**
 * Tests for ParallelWorkCommand
 */

import { ParallelWorkCommand } from '../../commands/ParallelWorkCommand';

describe('ParallelWorkCommand', () => {
  let command: ParallelWorkCommand;

  beforeEach(() => {
    command = new ParallelWorkCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('parallel-work');
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
