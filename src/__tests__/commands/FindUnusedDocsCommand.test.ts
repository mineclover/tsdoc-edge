/**
 * Tests for FindUnusedDocsCommand
 */

import { FindUnusedDocsCommand } from '../../commands/FindUnusedDocsCommand';

describe('FindUnusedDocsCommand', () => {
  let command: FindUnusedDocsCommand;

  beforeEach(() => {
    command = new FindUnusedDocsCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('find-unused-docs');
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
