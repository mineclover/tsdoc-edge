/**
 * Tests for SymbolQueryCommand
 */

import { SymbolQueryCommand } from '../../commands/SymbolQueryCommand';

describe('SymbolQueryCommand', () => {
  let command: SymbolQueryCommand;

  beforeEach(() => {
    command = new SymbolQueryCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('symbol-query');
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
