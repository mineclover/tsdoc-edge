/**
 * Tests for GenerateDocsCommand
 */

import { GenerateDocsCommand } from '../../commands/GenerateDocsCommand';

describe('GenerateDocsCommand', () => {
  let command: GenerateDocsCommand;

  beforeEach(() => {
    command = new GenerateDocsCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('generate-docs');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toContain('documentation');
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
    });
  });
});
