/**
 * Tests for PromoteSymbolCommand
 */

import { PromoteSymbolCommand } from '../../commands/PromoteSymbolCommand';

describe('PromoteSymbolCommand', () => {
  let command: PromoteSymbolCommand;

  beforeEach(() => {
    command = new PromoteSymbolCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('promote-symbol');
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
