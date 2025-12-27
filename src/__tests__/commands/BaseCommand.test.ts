/**
 * BaseCommand tests
 * @testScenario Test command result creation
 * @testScenario Test argument validation
 * @testScenario Test help flag detection
 * @testScenario Test database path resolution
 * @testScenario Test error handling
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, CommandResult, colors } from '../../commands/BaseCommand';

// Concrete implementation for testing
class TestCommand extends BaseCommand {
  getName(): string {
    return 'test-command';
  }

  getDescription(): string {
    return 'A test command for unit testing';
  }

  getAlias(): string[] {
    return ['tc', 'test'];
  }

  async execute(args: string[]): Promise<CommandResult> {
    if (this.hasHelpFlag(args)) {
      return this.displayHelp();
    }

    const validation = this.validateArgs(args, 1, 'test-command <arg>');
    if (validation) return validation;

    return this.success(`Executed with: ${args[0]}`);
  }

  // Expose protected methods for testing
  public testPrintHeader(title: string): void {
    this.printHeader(title);
  }

  public testPrintSection(title: string): void {
    this.printSection(title);
  }

  public testPrintSuccess(message: string): void {
    this.printSuccess(message);
  }

  public testPrintError(message: string): void {
    this.printError(message);
  }

  public testPrintWarning(message: string): void {
    this.printWarning(message);
  }

  public testPrintInfo(message: string): void {
    this.printInfo(message);
  }

  public testSuccess(message?: string): CommandResult {
    return this.success(message);
  }

  public testFailure(error: Error | string, exitCode?: number): CommandResult {
    return this.failure(error, exitCode);
  }

  public testValidateArgs(
    args: string[],
    minArgs: number,
    usage: string
  ): CommandResult | null {
    return this.validateArgs(args, minArgs, usage);
  }

  public testHasHelpFlag(args: string[]): boolean {
    return this.hasHelpFlag(args);
  }

  public testGetUsage(): string {
    return this.getUsage();
  }

  public testDisplayHelp(): CommandResult {
    return this.displayHelp();
  }

  public async testExecuteWithErrorHandling(
    fn: () => Promise<CommandResult>
  ): Promise<CommandResult> {
    return this.executeWithErrorHandling(fn);
  }

  public testGetDatabasePath(): string {
    return this.getDatabasePath();
  }

  public testGetJsonlPath(): string {
    return this.getJsonlPath();
  }

  public testCheckDatabaseExists(): CommandResult | null {
    return this.checkDatabaseExists();
  }
}

describe('BaseCommand', () => {
  let command: TestCommand;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    command = new TestCommand();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('getName', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('test-command');
    });
  });

  describe('getDescription', () => {
    it('should return command description', () => {
      expect(command.getDescription()).toBe('A test command for unit testing');
    });
  });

  describe('getAlias', () => {
    it('should return command aliases', () => {
      expect(command.getAlias()).toEqual(['tc', 'test']);
    });

    it('should return empty array for base implementation', () => {
      class NoAliasCommand extends BaseCommand {
        getName(): string {
          return 'no-alias';
        }
        getDescription(): string {
          return 'No aliases';
        }
        async execute(): Promise<CommandResult> {
          return this.success();
        }
      }
      const noAliasCmd = new NoAliasCommand();
      expect(noAliasCmd.getAlias()).toEqual([]);
    });
  });

  describe('success', () => {
    it('should create success result without message', () => {
      const result = command.testSuccess();
      expect(result).toEqual({
        exitCode: 0,
        message: undefined,
      });
    });

    it('should create success result with message', () => {
      const result = command.testSuccess('Operation completed');
      expect(result).toEqual({
        exitCode: 0,
        message: 'Operation completed',
      });
    });
  });

  describe('failure', () => {
    it('should create failure result from string', () => {
      const result = command.testFailure('Something went wrong');
      expect(result.exitCode).toBe(1);
      expect(result.message).toBe('Something went wrong');
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Something went wrong');
    });

    it('should create failure result from Error', () => {
      const error = new Error('Test error');
      const result = command.testFailure(error);
      expect(result.exitCode).toBe(1);
      expect(result.message).toBe('Test error');
      expect(result.error).toBe(error);
    });

    it('should use custom exit code', () => {
      const result = command.testFailure('Not found', 2);
      expect(result.exitCode).toBe(2);
    });
  });

  describe('validateArgs', () => {
    it('should return null when args are valid', () => {
      const result = command.testValidateArgs(['arg1', 'arg2'], 2, 'test <a> <b>');
      expect(result).toBeNull();
    });

    it('should return failure when args are insufficient', () => {
      const result = command.testValidateArgs(['arg1'], 2, 'test <a> <b>');
      expect(result).not.toBeNull();
      expect(result?.exitCode).toBe(1);
    });

    it('should return null when args exceed minimum', () => {
      const result = command.testValidateArgs(['a', 'b', 'c'], 2, 'test <a> <b>');
      expect(result).toBeNull();
    });
  });

  describe('hasHelpFlag', () => {
    it('should detect --help flag', () => {
      expect(command.testHasHelpFlag(['--help'])).toBe(true);
      expect(command.testHasHelpFlag(['arg', '--help'])).toBe(true);
    });

    it('should detect -h flag', () => {
      expect(command.testHasHelpFlag(['-h'])).toBe(true);
      expect(command.testHasHelpFlag(['arg', '-h'])).toBe(true);
    });

    it('should return false when no help flag', () => {
      expect(command.testHasHelpFlag([])).toBe(false);
      expect(command.testHasHelpFlag(['arg1', 'arg2'])).toBe(false);
    });
  });

  describe('getUsage', () => {
    it('should return default usage string', () => {
      expect(command.testGetUsage()).toBe('tsdoc-edge test-command [options]');
    });
  });

  describe('displayHelp', () => {
    it('should return success result', () => {
      const result = command.testDisplayHelp();
      expect(result.exitCode).toBe(0);
    });

    it('should print help information', () => {
      command.testDisplayHelp();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('executeWithErrorHandling', () => {
    it('should return result on success', async () => {
      const result = await command.testExecuteWithErrorHandling(async () => {
        return { exitCode: 0, message: 'Success' };
      });
      expect(result.exitCode).toBe(0);
      expect(result.message).toBe('Success');
    });

    it('should handle Error exceptions', async () => {
      const result = await command.testExecuteWithErrorHandling(async () => {
        throw new Error('Test error');
      });
      expect(result.exitCode).toBe(1);
      expect(result.message).toBe('Test error');
      expect(result.error).toBeInstanceOf(Error);
    });

    it('should handle non-Error exceptions', async () => {
      const result = await command.testExecuteWithErrorHandling(async () => {
        throw 'string error';
      });
      expect(result.exitCode).toBe(1);
      expect(result.message).toBe('Unknown error occurred');
    });
  });

  describe('print methods', () => {
    it('should print header with colors', () => {
      command.testPrintHeader('Test Header');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('='));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Test Header'));
    });

    it('should print section with colors', () => {
      command.testPrintSection('Test Section');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Test Section'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('-'));
    });

    it('should print success message', () => {
      command.testPrintSuccess('Success message');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Success message'));
    });

    it('should print error message', () => {
      command.testPrintError('Error message');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✗'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error message'));
    });

    it('should print warning message', () => {
      command.testPrintWarning('Warning message');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('⚠'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Warning message'));
    });

    it('should print info message', () => {
      command.testPrintInfo('Info message');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('ℹ'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Info message'));
    });
  });

  describe('execute', () => {
    it('should display help when --help flag is present', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
    });

    it('should fail when no arguments provided', async () => {
      const result = await command.execute([]);
      expect(result.exitCode).toBe(1);
    });

    it('should succeed with valid arguments', async () => {
      const result = await command.execute(['test-arg']);
      expect(result.exitCode).toBe(0);
      expect(result.message).toBe('Executed with: test-arg');
    });
  });

  describe('getDatabasePath', () => {
    const originalCwd = process.cwd();
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.realpathSync(fs.mkdtempSync(path.join(require('os').tmpdir(), 'tsdoc-test-')));
      process.chdir(tempDir);
    });

    afterEach(() => {
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should return default path when no config exists', () => {
      const dbPath = command.testGetDatabasePath();
      expect(dbPath).toBe(path.join(tempDir, '.tsdoc', 'symbols.db'));
    });

    it('should return configured path when config exists', () => {
      const config = {
        paths: {
          databasePath: 'custom/path/db.sqlite',
        },
      };
      fs.writeFileSync(
        path.join(tempDir, '.tsdoc.config.json'),
        JSON.stringify(config)
      );

      const dbPath = command.testGetDatabasePath();
      expect(dbPath).toBe(path.join(tempDir, 'custom/path/db.sqlite'));
    });

    it('should return default path when config is invalid JSON', () => {
      fs.writeFileSync(
        path.join(tempDir, '.tsdoc.config.json'),
        'invalid json'
      );

      const dbPath = command.testGetDatabasePath();
      expect(dbPath).toBe(path.join(tempDir, '.tsdoc', 'symbols.db'));
    });
  });

  describe('getJsonlPath', () => {
    const originalCwd = process.cwd();
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.realpathSync(fs.mkdtempSync(path.join(require('os').tmpdir(), 'tsdoc-test-')));
      process.chdir(tempDir);
    });

    afterEach(() => {
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should return default path when no config exists', () => {
      const jsonlPath = command.testGetJsonlPath();
      expect(jsonlPath).toBe(path.join(tempDir, '.tsdoc', 'data'));
    });

    it('should return configured path when config exists', () => {
      const config = {
        paths: {
          jsonlDir: 'custom/jsonl',
        },
      };
      fs.writeFileSync(
        path.join(tempDir, '.tsdoc.config.json'),
        JSON.stringify(config)
      );

      const jsonlPath = command.testGetJsonlPath();
      expect(jsonlPath).toBe(path.join(tempDir, 'custom/jsonl'));
    });
  });

  describe('checkDatabaseExists', () => {
    const originalCwd = process.cwd();
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.realpathSync(fs.mkdtempSync(path.join(require('os').tmpdir(), 'tsdoc-test-')));
      process.chdir(tempDir);
    });

    afterEach(() => {
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should return failure when database does not exist', () => {
      const result = command.testCheckDatabaseExists();
      expect(result).not.toBeNull();
      expect(result?.exitCode).toBe(1);
      expect(result?.message).toBe('Database not found');
    });

    it('should return null when database exists', () => {
      const dbDir = path.join(tempDir, '.tsdoc');
      fs.mkdirSync(dbDir, { recursive: true });
      fs.writeFileSync(path.join(dbDir, 'symbols.db'), '');

      const result = command.testCheckDatabaseExists();
      expect(result).toBeNull();
    });
  });

  describe('colors', () => {
    it('should export color constants', () => {
      expect(colors.reset).toBe('\x1b[0m');
      expect(colors.bold).toBe('\x1b[1m');
      expect(colors.dim).toBe('\x1b[2m');
      expect(colors.green).toBe('\x1b[32m');
      expect(colors.yellow).toBe('\x1b[33m');
      expect(colors.blue).toBe('\x1b[34m');
      expect(colors.cyan).toBe('\x1b[36m');
      expect(colors.red).toBe('\x1b[31m');
    });
  });
});
