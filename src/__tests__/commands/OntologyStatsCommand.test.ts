/**
 * Tests for OntologyStatsCommand
 */

import { OntologyStatsCommand } from '../../commands/OntologyStatsCommand';

describe('OntologyStatsCommand', () => {
  let command: OntologyStatsCommand;

  beforeEach(() => {
    command = new OntologyStatsCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('ontology-stats');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toContain('statistics');
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
    });
  });
});
