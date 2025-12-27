/**
 * Tests for SymbolFixCommand
 */

import { SymbolFixCommand } from '../../commands/SymbolFixCommand';

describe('SymbolFixCommand', () => {
  let command: SymbolFixCommand;

  beforeEach(() => {
    command = new SymbolFixCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('symbol-fix');
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
