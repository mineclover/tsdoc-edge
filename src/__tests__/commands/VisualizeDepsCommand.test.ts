/**
 * Tests for VisualizeDepsCommand
 */

import { VisualizeDepsCommand } from '../../commands/VisualizeDepsCommand';

describe('VisualizeDepsCommand', () => {
  let command: VisualizeDepsCommand;

  beforeEach(() => {
    command = new VisualizeDepsCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('visualize');
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
