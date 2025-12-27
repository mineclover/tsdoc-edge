/**
 * Tests for ExploreEntrypointCommand
 */

import { ExploreEntrypointCommand } from '../../commands/ExploreEntrypointCommand';

describe('ExploreEntrypointCommand', () => {
  let command: ExploreEntrypointCommand;

  beforeEach(() => {
    command = new ExploreEntrypointCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('explore-entrypoint');
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
