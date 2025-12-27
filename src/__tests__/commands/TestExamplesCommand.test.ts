/**
 * Tests for TestExamplesCommand
 */

import { TestExamplesCommand } from '../../commands/TestExamplesCommand';

describe('TestExamplesCommand', () => {
  let command: TestExamplesCommand;

  beforeEach(() => {
    command = new TestExamplesCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('test-examples');
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
