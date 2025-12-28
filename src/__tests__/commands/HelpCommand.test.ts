/**
 * HelpCommand tests
 * @testScenario Display help message
 * @testScenario List commands from registry
 */

import { HelpCommand } from '../../commands/HelpCommand';
import { CommandRegistry } from '../../commands/CommandRegistry';
import { BaseCommand, type CommandResult } from '../../commands/BaseCommand';

// Test command for registry
class TestCmd extends BaseCommand {
  getName(): string { return 'test-cmd'; }
  getDescription(): string { return 'A test command'; }
  protected getUsage(): string { return 'test-cmd'; }
  async execute(): Promise<CommandResult> { return { exitCode: 0 }; }
}

describe('HelpCommand', () => {
  let command: HelpCommand;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('getName', () => {
    it('should return "help"', () => {
      command = new HelpCommand();
      expect(command.getName()).toBe('help');
    });
  });

  describe('getDescription', () => {
    it('should return description', () => {
      command = new HelpCommand();
      expect(command.getDescription()).toContain('help');
    });
  });

  describe('execute', () => {
    it('should display help without registry', async () => {
      command = new HelpCommand();

      const result = await command.execute([]);

      expect(result.exitCode).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should display help with registry', async () => {
      const registry = new CommandRegistry();
      registry.register(new TestCmd());
      command = new HelpCommand(registry);

      const result = await command.execute(['--all']);

      expect(result.exitCode).toBe(0);
      const logOutput = consoleSpy.mock.calls.flat().join('\n');
      expect(logOutput).toContain('test-cmd');
    });

    it('should show wc as important command', async () => {
      command = new HelpCommand();

      await command.execute([]);

      const logOutput = consoleSpy.mock.calls.flat().join('\n');
      expect(logOutput).toContain('wc <file>');
    });

    it('should show common workflow', async () => {
      command = new HelpCommand();

      await command.execute([]);

      const logOutput = consoleSpy.mock.calls.flat().join('\n');
      expect(logOutput).toContain('init');
      expect(logOutput).toContain('build');
    });
  });
});
