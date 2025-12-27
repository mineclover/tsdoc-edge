/**
 * Tests for CoreApiCommand
 */

import { CoreApiCommand } from '../../commands/CoreApiCommand';

describe('CoreApiCommand', () => {
  let command: CoreApiCommand;

  beforeEach(() => {
    command = new CoreApiCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('core-api');
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
