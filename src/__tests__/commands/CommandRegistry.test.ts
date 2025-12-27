/**
 * CommandRegistry tests
 * @testScenario Register and retrieve commands
 * @testScenario Handle aliases
 * @testScenario List all commands
 */

import { CommandRegistry } from '../../commands/CommandRegistry';
import { BaseCommand, type CommandResult } from '../../commands/BaseCommand';

// Create a concrete test command
class TestCommand extends BaseCommand {
  private _name: string;
  private _aliases: string[];

  constructor(name: string, aliases: string[] = []) {
    super();
    this._name = name;
    this._aliases = aliases;
  }

  getName(): string {
    return this._name;
  }

  getAlias(): string[] {
    return this._aliases;
  }

  getDescription(): string {
    return `Test command: ${this._name}`;
  }

  protected getUsage(): string {
    return `tsdoc-edge ${this._name}`;
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.success();
  }
}

describe('CommandRegistry', () => {
  let registry: CommandRegistry;

  beforeEach(() => {
    registry = new CommandRegistry();
  });

  describe('register', () => {
    it('should register a command', () => {
      const command = new TestCommand('test');
      registry.register(command);

      expect(registry.has('test')).toBe(true);
    });

    it('should register command with aliases', () => {
      const command = new TestCommand('build', ['b', 'compile']);
      registry.register(command);

      expect(registry.has('build')).toBe(true);
      expect(registry.has('b')).toBe(true);
      expect(registry.has('compile')).toBe(true);
    });

    it('should allow multiple command registrations', () => {
      const cmd1 = new TestCommand('cmd1');
      const cmd2 = new TestCommand('cmd2');

      registry.register(cmd1);
      registry.register(cmd2);

      expect(registry.count()).toBe(2);
    });
  });

  describe('get', () => {
    it('should return registered command', () => {
      const command = new TestCommand('stats');
      registry.register(command);

      const retrieved = registry.get('stats');

      expect(retrieved).toBe(command);
    });

    it('should return command by alias', () => {
      const command = new TestCommand('validate', ['v', 'check']);
      registry.register(command);

      expect(registry.get('v')).toBe(command);
      expect(registry.get('check')).toBe(command);
    });

    it('should return undefined for unregistered command', () => {
      const result = registry.get('nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true for registered command', () => {
      const command = new TestCommand('init');
      registry.register(command);

      expect(registry.has('init')).toBe(true);
    });

    it('should return false for unregistered command', () => {
      expect(registry.has('nonexistent')).toBe(false);
    });

    it('should return true for registered alias', () => {
      const command = new TestCommand('help', ['h', '?']);
      registry.register(command);

      expect(registry.has('h')).toBe(true);
      expect(registry.has('?')).toBe(true);
    });
  });

  describe('getAll', () => {
    it('should return empty array when no commands', () => {
      const commands = registry.getAll();

      expect(commands).toEqual([]);
    });

    it('should return all registered commands', () => {
      const cmd1 = new TestCommand('cmd1');
      const cmd2 = new TestCommand('cmd2');
      registry.register(cmd1);
      registry.register(cmd2);

      const commands = registry.getAll();

      expect(commands).toContain(cmd1);
      expect(commands).toContain(cmd2);
    });

    it('should include aliased commands', () => {
      const command = new TestCommand('build', ['b']);
      registry.register(command);

      const commands = registry.getAll();

      // Same command appears for both 'build' and 'b'
      expect(commands.filter((c) => c.getName() === 'build').length).toBeGreaterThan(0);
    });
  });

  describe('getNames', () => {
    it('should return empty array when no commands', () => {
      const names = registry.getNames();

      expect(names).toEqual([]);
    });

    it('should return all command names and aliases', () => {
      const command = new TestCommand('test', ['t']);
      registry.register(command);

      const names = registry.getNames();

      expect(names).toContain('test');
      expect(names).toContain('t');
    });
  });

  describe('count', () => {
    it('should return 0 when empty', () => {
      expect(registry.count()).toBe(0);
    });

    it('should count commands and aliases', () => {
      const command = new TestCommand('run', ['r', 'execute']);
      registry.register(command);

      // 1 main name + 2 aliases = 3
      expect(registry.count()).toBe(3);
    });

    it('should count multiple commands correctly', () => {
      const cmd1 = new TestCommand('cmd1');
      const cmd2 = new TestCommand('cmd2', ['c2']);

      registry.register(cmd1);
      registry.register(cmd2);

      // cmd1 (1) + cmd2 + c2 (2) = 3
      expect(registry.count()).toBe(3);
    });
  });
});
