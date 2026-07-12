/**
 * InitCommand tests
 * @testScenario Initialize new project configuration
 * @testScenario Handle existing configuration
 * @testScenario Force overwrite configuration
 * @testScenario Custom project name and version
 */

import { InitCommand } from '../../commands/InitCommand';

// Create shared mock state
let configExists = false;
let configPath = '';
let savedConfig: any = null;
const mockInit = jest.fn((config: any, _force: boolean) => {
  savedConfig = config;
  configExists = true;
});
const mockEnsureDirectories = jest.fn();
const mockExists = jest.fn(() => configExists);
const mockGetConfigPath = jest.fn(() => configPath);
const mockGet = jest.fn(() => ({
  project: savedConfig?.project || { name: 'test-project', version: '1.0.0' },
  paths: {
    commentsDir: '.tsdoc/comments',
    databasePath: '.tsdoc/db.sqlite',
    jsonlDir: '.tsdoc/jsonl',
    outputDir: '.tsdoc/output',
  },
}));

// Mock ConfigManager
jest.mock('../../config/ConfigManager', () => ({
  ConfigManager: {
    getInstance: jest.fn(() => ({
      exists: mockExists,
      getConfigPath: mockGetConfigPath,
      init: mockInit,
      get: mockGet,
      ensureDirectories: mockEnsureDirectories,
    })),
  },
}));

describe('InitCommand', () => {
  let command: InitCommand;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    command = new InitCommand();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    // Reset state
    configExists = false;
    configPath = '';
    savedConfig = null;
    mockInit.mockClear();
    mockEnsureDirectories.mockClear();
    mockExists.mockClear();
    mockGetConfigPath.mockClear();
    mockGet.mockClear();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('getName', () => {
    it('should return "init"', () => {
      expect(command.getName()).toBe('init');
    });
  });

  describe('getDescription', () => {
    it('should return description', () => {
      expect(command.getDescription()).toContain('Initialize');
    });
  });

  describe('execute', () => {
    it('should show help when --help flag is passed', async () => {
      const result = await command.execute(['--help']);

      expect(result.exitCode).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should initialize new configuration', async () => {
      configExists = false;

      const result = await command.execute([]);

      expect(result.exitCode).toBe(0);
      expect(mockInit).toHaveBeenCalled();
      expect(mockEnsureDirectories).toHaveBeenCalled();
    });

    it('should fail when configuration exists without --force', async () => {
      configExists = true;
      configPath = '/project/.tsdoc.config.json';

      const result = await command.execute([]);

      expect(result.exitCode).not.toBe(0);
      expect(result.message).toContain('already exists');
    });

    it('should overwrite configuration with --force', async () => {
      configExists = true;

      const result = await command.execute(['--force']);

      expect(result.exitCode).toBe(0);
      expect(mockInit).toHaveBeenCalledWith(expect.any(Object), true);
    });

    it('should use custom project name', async () => {
      configExists = false;

      const result = await command.execute(['--name=my-custom-project']);

      expect(result.exitCode).toBe(0);
      expect(savedConfig.project.name).toBe('my-custom-project');
    });

    it('should use custom version', async () => {
      configExists = false;

      const result = await command.execute(['--version=2.0.0']);

      expect(result.exitCode).toBe(0);
      expect(savedConfig.project.version).toBe('2.0.0');
    });

    it('should use both custom name and version', async () => {
      configExists = false;

      const result = await command.execute(['--name=custom-app', '--version=3.0.0']);

      expect(result.exitCode).toBe(0);
      expect(savedConfig.project.name).toBe('custom-app');
      expect(savedConfig.project.version).toBe('3.0.0');
    });

    it('should use directory name as default project name', async () => {
      configExists = false;

      const result = await command.execute([]);

      expect(result.exitCode).toBe(0);
      expect(savedConfig.project.name).toBeDefined();
    });

    it('should use 1.0.0 as default version', async () => {
      configExists = false;

      const result = await command.execute([]);

      expect(result.exitCode).toBe(0);
      expect(savedConfig.project.version).toBe('1.0.0');
    });
  });
});
