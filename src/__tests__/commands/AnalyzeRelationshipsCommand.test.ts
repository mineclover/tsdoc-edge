/**
 * Tests for AnalyzeRelationshipsCommand
 */

import { AnalyzeRelationshipsCommand } from '../../commands/AnalyzeRelationshipsCommand';

describe('AnalyzeRelationshipsCommand', () => {
  let command: AnalyzeRelationshipsCommand;

  beforeEach(() => {
    command = new AnalyzeRelationshipsCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('analyze-relationships');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toContain('relationship');
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
    });

    it('should list analyzers with --list flag', async () => {
      const result = await command.execute(['--list']);
      expect(result.exitCode).toBe(0);
    });
  });
});
