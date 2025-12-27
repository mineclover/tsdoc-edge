/**
 * Tests for ParseMermaidCommand
 */

import { ParseMermaidCommand } from '../../commands/ParseMermaidCommand';

describe('ParseMermaidCommand', () => {
  let command: ParseMermaidCommand;

  beforeEach(() => {
    command = new ParseMermaidCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('parse-mermaid');
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
