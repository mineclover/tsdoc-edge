/**
 * ConfigManager tests
 */

import { ConfigManager } from '../config/ConfigManager';
import { TsdocEdgeConfig, DEFAULT_CONFIG } from '../types/config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('ConfigManager', () => {
  let testDir: string;
  let configPath: string;

  beforeEach(() => {
    // Create a temporary directory for each test
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-test-'));
    configPath = path.join(testDir, '.tsdoc.config.json');

    // Reset singleton before each test
    ConfigManager.reset();
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }

    // Reset singleton after each test
    ConfigManager.reset();
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = ConfigManager.getInstance(testDir);
      const instance2 = ConfigManager.getInstance(testDir);

      expect(instance1).toBe(instance2);
    });

    it('should load default config if file does not exist', () => {
      const configManager = ConfigManager.getInstance(testDir);
      const config = configManager.get();

      expect(config.project.name).toBe(DEFAULT_CONFIG.project.name);
      expect(config.paths.commentsDir).toBe(DEFAULT_CONFIG.paths.commentsDir);
    });
  });

  describe('init', () => {
    it('should create a new config file', () => {
      const configManager = ConfigManager.getInstance(testDir);

      configManager.init({
        project: {
          name: 'test-project',
          version: '1.0.0',
        },
      });

      expect(fs.existsSync(configPath)).toBe(true);

      const content = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content);

      expect(config.project.name).toBe('test-project');
      expect(config.project.version).toBe('1.0.0');
    });

    it('should throw error if config already exists without force', () => {
      const configManager = ConfigManager.getInstance(testDir);

      configManager.init();

      expect(() => {
        configManager.init();
      }).toThrow();
    });

    it('should overwrite config with force option', () => {
      const configManager = ConfigManager.getInstance(testDir);

      configManager.init({
        project: {
          name: 'old-name',
          version: '1.0.0',
        },
      });

      configManager.init({
        project: {
          name: 'new-name',
          version: '2.0.0',
        },
      }, true);

      const config = configManager.get();
      expect(config.project.name).toBe('new-name');
      expect(config.project.version).toBe('2.0.0');
    });
  });

  describe('get', () => {
    it('should return current configuration', () => {
      const configManager = ConfigManager.getInstance(testDir);

      configManager.init({
        project: {
          name: 'my-project',
          version: '3.0.0',
        },
      });

      const config = configManager.get();
      expect(config.project.name).toBe('my-project');
      expect(config.project.version).toBe('3.0.0');
    });

    it('should merge with default config', () => {
      const configManager = ConfigManager.getInstance(testDir);

      configManager.init({
        project: {
          name: 'partial-config',
          version: '1.0.0',
        },
      });

      const config = configManager.get();
      expect(config.paths.commentsDir).toBe(DEFAULT_CONFIG.paths.commentsDir);
      expect(config.fold?.enabled).toBe(DEFAULT_CONFIG.fold?.enabled);
    });
  });

  describe('save', () => {
    it('should save configuration to file', () => {
      const configManager = ConfigManager.getInstance(testDir);

      const newConfig: TsdocEdgeConfig = {
        ...DEFAULT_CONFIG,
        project: {
          name: 'saved-project',
          version: '4.0.0',
        },
      };

      configManager.save(newConfig);

      expect(fs.existsSync(configPath)).toBe(true);

      const content = fs.readFileSync(configPath, 'utf-8');
      const saved = JSON.parse(content);

      expect(saved.project.name).toBe('saved-project');
      expect(saved.project.version).toBe('4.0.0');
    });
  });

  describe('resolvePath', () => {
    it('should resolve relative path from project root', () => {
      const configManager = ConfigManager.getInstance(testDir);

      const resolved = configManager.resolvePath('docs/output');
      expect(resolved).toBe(path.join(testDir, 'docs/output'));
    });

    it('should handle absolute paths', () => {
      const configManager = ConfigManager.getInstance(testDir);

      const absolutePath = '/absolute/path';
      const resolved = configManager.resolvePath(absolutePath);
      expect(resolved).toBe(path.resolve(testDir, absolutePath));
    });
  });

  describe('exists', () => {
    it('should return false if config file does not exist', () => {
      const configManager = ConfigManager.getInstance(testDir);
      expect(configManager.exists()).toBe(false);
    });

    it('should return true if config file exists', () => {
      const configManager = ConfigManager.getInstance(testDir);
      configManager.init();
      expect(configManager.exists()).toBe(true);
    });
  });

  describe('ensureDirectories', () => {
    it('should create all configured directories', () => {
      const configManager = ConfigManager.getInstance(testDir);

      configManager.init({
        paths: {
          commentsDir: 'custom-comments',
          databasePath: 'custom.db',
          jsonlDir: 'custom/data',
          outputDir: 'custom/output',
        },
      });

      configManager.ensureDirectories();

      expect(fs.existsSync(path.join(testDir, 'custom-comments'))).toBe(true);
      expect(fs.existsSync(path.join(testDir, 'custom/data'))).toBe(true);
      expect(fs.existsSync(path.join(testDir, 'custom/output'))).toBe(true);
    });
  });

  describe('validate', () => {
    it('should pass validation for valid config', () => {
      const configManager = ConfigManager.getInstance(testDir);

      configManager.init({
        project: {
          name: 'valid-project',
          version: '1.0.0',
        },
      });

      const result = configManager.validate();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for invalid connectivity score', () => {
      const configManager = ConfigManager.getInstance(testDir);

      configManager.init({
        validation: {
          minConnectivityScore: 150, // Invalid: > 100
        },
      });

      const result = configManager.validate();
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should fail validation for missing required fields', () => {
      const configManager = ConfigManager.getInstance(testDir);

      configManager.init();

      // Manually corrupt config
      const config = configManager.get();
      config.project.name = '';
      configManager.save(config);

      // Reload
      ConfigManager.reset();
      const newInstance = ConfigManager.getInstance(testDir);

      const result = newInstance.validate();
      expect(result.valid).toBe(false);
    });
  });

  describe('update', () => {
    it('should update specific configuration section', () => {
      const configManager = ConfigManager.getInstance(testDir);

      configManager.init({
        project: {
          name: 'original',
          version: '1.0.0',
        },
      });

      configManager.update('project', {
        name: 'updated',
      });

      const config = configManager.get();
      expect(config.project.name).toBe('updated');
      expect(config.project.version).toBe('1.0.0'); // unchanged
    });

    it('should update paths section', () => {
      const configManager = ConfigManager.getInstance(testDir);

      configManager.init();

      configManager.update('paths', {
        commentsDir: 'new-comments-dir',
      });

      const config = configManager.get();
      expect(config.paths.commentsDir).toBe('new-comments-dir');
      expect(config.paths.databasePath).toBe(DEFAULT_CONFIG.paths.databasePath); // unchanged
    });
  });

  describe('getConfigPath', () => {
    it('should return config file path', () => {
      const configManager = ConfigManager.getInstance(testDir);
      expect(configManager.getConfigPath()).toBe(configPath);
    });
  });

  describe('getProjectRoot', () => {
    it('should return project root directory', () => {
      const configManager = ConfigManager.getInstance(testDir);
      expect(configManager.getProjectRoot()).toBe(testDir);
    });
  });
});
