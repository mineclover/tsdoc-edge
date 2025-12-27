/**
 * Tests for TypeChainCommand
 */

import { TypeChainCommand } from '../../commands/TypeChainCommand';

describe('TypeChainCommand', () => {
  let command: TypeChainCommand;

  beforeEach(() => {
    command = new TypeChainCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('type-chain');
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
