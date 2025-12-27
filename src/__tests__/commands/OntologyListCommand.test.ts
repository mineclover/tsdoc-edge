/**
 * Tests for OntologyListCommand
 */

import { OntologyListCommand } from '../../commands/OntologyListCommand';

describe('OntologyListCommand', () => {
  let command: OntologyListCommand;

  beforeEach(() => {
    command = new OntologyListCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('ontology-list');
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
