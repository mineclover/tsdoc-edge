/**
 * Tests for DetectDeadCodeCommand
 */

import { DetectDeadCodeCommand } from '../../commands/DetectDeadCodeCommand';

describe('DetectDeadCodeCommand', () => {
  let command: DetectDeadCodeCommand;

  beforeEach(() => {
    command = new DetectDeadCodeCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('detect-dead-code');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toContain('dead');
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
    });
  });
});
