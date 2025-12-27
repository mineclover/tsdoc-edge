/**
 * Tests for UndocumentedCommand
 */

import { UndocumentedCommand } from '../../commands/UndocumentedCommand';

describe('UndocumentedCommand', () => {
  let command: UndocumentedCommand;

  beforeEach(() => {
    command = new UndocumentedCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('undocumented');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toContain('undocumented');
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
    });
  });
});
