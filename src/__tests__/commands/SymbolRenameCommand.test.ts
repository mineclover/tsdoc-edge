/**
 * Tests for SymbolRenameCommand
 */

import { SymbolRenameCommand } from '../../commands/SymbolRenameCommand';

describe('SymbolRenameCommand', () => {
  let command: SymbolRenameCommand;

  beforeEach(() => {
    command = new SymbolRenameCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('symbol-rename');
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
