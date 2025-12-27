/**
 * Tests for UpdateSymbolRefsCommand
 */

import { UpdateSymbolRefsCommand } from '../../commands/UpdateSymbolRefsCommand';

describe('UpdateSymbolRefsCommand', () => {
  let command: UpdateSymbolRefsCommand;

  beforeEach(() => {
    command = new UpdateSymbolRefsCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('update-symbol-refs');
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
