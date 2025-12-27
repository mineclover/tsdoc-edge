/**
 * Tests for SymbolUnifiedCommand
 */

import { SymbolUnifiedCommand } from '../../commands/SymbolUnifiedCommand';

describe('SymbolUnifiedCommand', () => {
  let command: SymbolUnifiedCommand;

  beforeEach(() => {
    command = new SymbolUnifiedCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('symbol');
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
