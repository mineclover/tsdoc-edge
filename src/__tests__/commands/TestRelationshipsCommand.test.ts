/**
 * Tests for TestRelationshipsCommand
 */

import { TestRelationshipsCommand } from '../../commands/TestRelationshipsCommand';

describe('TestRelationshipsCommand', () => {
  let command: TestRelationshipsCommand;

  beforeEach(() => {
    command = new TestRelationshipsCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('test-relationships');
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
