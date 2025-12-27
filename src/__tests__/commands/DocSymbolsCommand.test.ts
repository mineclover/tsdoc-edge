/**
 * Tests for DocSymbolsCommand
 */

import { DocSymbolsCommand } from '../../commands/DocSymbolsCommand';

describe('DocSymbolsCommand', () => {
  let command: DocSymbolsCommand;

  beforeEach(() => {
    command = new DocSymbolsCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('doc-symbols');
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
