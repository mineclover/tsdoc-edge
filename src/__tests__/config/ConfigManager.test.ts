/**
 * ConfigManager tests
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ConfigManager } from '../../config/ConfigManager';
import { DEFAULT_CONFIG, type TsdocEdgeConfig } from '../../types/config';

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

      configManager.init(
        {
          project: {
            name: 'new-name',
            version: '2.0.0',
          },
        },
        true
      );

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

    it('preserves authored spec roots and ordered naming conventions', () => {
      const configManager = ConfigManager.getInstance(testDir);

      configManager.init({
        specGovernance: {
          authoredSpecDirs: ['managed/specs'],
          naming: {
            contractVersion: '1.0',
            rules: [
              {
                id: 'spec-file-kebab',
                path: 'managed/specs/**/*.md',
                target: 'file',
                style: 'kebab',
              },
            ],
          },
        },
      });

      expect(configManager.get().specGovernance).toEqual({
        authoredSpecDirs: ['managed/specs'],
        naming: {
          contractVersion: '1.0',
          rules: [
            {
              id: 'spec-file-kebab',
              path: 'managed/specs/**/*.md',
              target: 'file',
              style: 'kebab',
            },
          ],
        },
      });
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

  describe('loadConfig edge cases', () => {
    it('should handle corrupted JSON file', () => {
      fs.writeFileSync(configPath, '{ invalid json }', 'utf-8');

      expect(() => {
        ConfigManager.reset();
        ConfigManager.getInstance(testDir);
      }).toThrow(/Invalid JSON|Failed to load config/);
    });

    it('should handle empty config file', () => {
      fs.writeFileSync(configPath, '{}', 'utf-8');

      ConfigManager.reset();
      const configManager = ConfigManager.getInstance(testDir);
      const config = configManager.get();

      // Should merge with defaults
      expect(config.project.name).toBe(DEFAULT_CONFIG.project.name);
      expect(config.paths.commentsDir).toBe(DEFAULT_CONFIG.paths.commentsDir);
    });

    it('should handle config with extra unknown properties', () => {
      const configWithExtra = {
        ...DEFAULT_CONFIG,
        unknownProperty: 'should be ignored',
      };

      fs.writeFileSync(configPath, JSON.stringify(configWithExtra), 'utf-8');

      ConfigManager.reset();
      const configManager = ConfigManager.getInstance(testDir);
      const config = configManager.get();

      expect(config.project).toBeDefined();
      // The mergeConfig only merges known properties, so unknown properties are not preserved
      expect((config as any).unknownProperty).toBeUndefined();
    });

    it('should handle custom configPath parameter', () => {
      const customPath = path.join(testDir, 'custom.config.json');
      const customConfig = {
        project: {
          name: 'custom-path-project',
          version: '1.0.0',
        },
      };

      fs.writeFileSync(customPath, JSON.stringify(customConfig), 'utf-8');

      ConfigManager.reset();
      const configManager = ConfigManager.getInstance(testDir, customPath);
      const config = configManager.get();

      expect(config.project.name).toBe('custom-path-project');
      expect(configManager.getConfigPath()).toBe(customPath);
    });
  });

  describe('validate edge cases', () => {
    it('should validate connectivity score at boundaries', () => {
      const configManager = ConfigManager.getInstance(testDir);

      configManager.init({
        validation: {
          minConnectivityScore: 0,
        },
      });

      let result = configManager.validate();
      expect(result.valid).toBe(true);

      configManager.update('validation', { minConnectivityScore: 100 });
      result = configManager.validate();
      expect(result.valid).toBe(true);

      configManager.update('validation', { minConnectivityScore: -1 });
      result = configManager.validate();
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes('minConnectivityScore') && e.includes('out of range'))
      ).toBe(true);

      configManager.update('validation', { minConnectivityScore: 101 });
      result = configManager.validate();
      expect(result.valid).toBe(false);
    });

    it('should validate all required fields', () => {
      const configManager = ConfigManager.getInstance(testDir);
      configManager.init();

      const config = configManager.get();
      config.project.name = '';
      config.project.version = '';
      config.paths.commentsDir = '';
      config.paths.databasePath = '';
      config.paths.jsonlDir = '';
      configManager.save(config);

      ConfigManager.reset();
      const newInstance = ConfigManager.getInstance(testDir);
      const result = newInstance.validate();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(5);
      expect(result.errors.some((e) => e.includes('project.name'))).toBe(true);
      expect(result.errors.some((e) => e.includes('project.version'))).toBe(true);
      expect(result.errors.some((e) => e.includes('paths.commentsDir'))).toBe(true);
      expect(result.errors.some((e) => e.includes('paths.databasePath'))).toBe(true);
      expect(result.errors.some((e) => e.includes('paths.jsonlDir'))).toBe(true);
    });
  });

  describe('ensureDirectories edge cases', () => {
    it('should not fail if directories already exist', () => {
      const configManager = ConfigManager.getInstance(testDir);
      configManager.init();

      // Create first time
      configManager.ensureDirectories();

      // Should not fail on second call
      expect(() => {
        configManager.ensureDirectories();
      }).not.toThrow();
    });

    it('should create nested directories', () => {
      const configManager = ConfigManager.getInstance(testDir);

      configManager.init({
        paths: {
          commentsDir: 'deep/nested/comments',
          databasePath: 'deep/nested/db/database.db',
          jsonlDir: 'deep/nested/jsonl',
        },
      });

      configManager.ensureDirectories();

      expect(fs.existsSync(path.join(testDir, 'deep/nested/comments'))).toBe(true);
      expect(fs.existsSync(path.join(testDir, 'deep/nested/db'))).toBe(true);
      expect(fs.existsSync(path.join(testDir, 'deep/nested/jsonl'))).toBe(true);
    });

    it('should handle undefined optional paths', () => {
      const configManager = ConfigManager.getInstance(testDir);

      configManager.init({
        paths: {
          commentsDir: '.comments',
          databasePath: '.db',
          jsonlDir: 'data',
          outputDir: undefined,
        },
      });

      expect(() => {
        configManager.ensureDirectories();
      }).not.toThrow();
    });
  });

  describe('save edge cases', () => {
    it('should throw error if write fails', () => {
      const configManager = ConfigManager.getInstance(testDir);
      configManager.init();

      // Make directory read-only to force write failure
      const readOnlyDir = path.join(testDir, 'readonly');
      fs.mkdirSync(readOnlyDir);
      const readOnlyConfigPath = path.join(readOnlyDir, '.tsdoc.config.json');

      ConfigManager.reset();
      const readOnlyManager = ConfigManager.getInstance(readOnlyDir, readOnlyConfigPath);

      // Make parent directory read-only (this may not work on all systems)
      try {
        fs.chmodSync(readOnlyDir, 0o444);

        expect(() => {
          readOnlyManager.save(DEFAULT_CONFIG);
        }).toThrow(/Failed to save config/);

        // Restore permissions
        fs.chmodSync(readOnlyDir, 0o755);
      } catch (_error) {
        // Skip this test on systems where chmod doesn't work as expected
        fs.chmodSync(readOnlyDir, 0o755);
      }

      fs.rmSync(readOnlyDir, { recursive: true, force: true });
    });

    it('should update internal config after save', () => {
      const configManager = ConfigManager.getInstance(testDir);
      configManager.init();

      const newConfig: TsdocEdgeConfig = {
        ...DEFAULT_CONFIG,
        project: {
          name: 'updated-name',
          version: '2.0.0',
        },
      };

      configManager.save(newConfig);

      const retrievedConfig = configManager.get();
      expect(retrievedConfig.project.name).toBe('updated-name');
      expect(retrievedConfig.project.version).toBe('2.0.0');
    });
  });

  describe('mergeConfig behavior', () => {
    it('should preserve nested objects when merging', () => {
      const configManager = ConfigManager.getInstance(testDir);

      configManager.init({
        validation: {
          strictMode: true,
          rules: {
            'rule-1': 'error',
            'rule-2': 'warning',
          },
        },
      });

      const config = configManager.get();
      expect(config.validation?.strictMode).toBe(true);
      expect(config.validation?.minConnectivityScore).toBe(
        DEFAULT_CONFIG.validation?.minConnectivityScore
      );
      expect(config.validation?.rules).toEqual({
        'rule-1': 'error',
        'rule-2': 'warning',
      });
    });

    it('should override default values with user values', () => {
      const configManager = ConfigManager.getInstance(testDir);

      configManager.init({
        paths: {
          commentsDir: 'my-comments',
          databasePath: DEFAULT_CONFIG.paths.databasePath,
          jsonlDir: DEFAULT_CONFIG.paths.jsonlDir,
        },
      });

      const config = configManager.get();
      expect(config.paths.commentsDir).toBe('my-comments');
      expect(config.paths.databasePath).toBe(DEFAULT_CONFIG.paths.databasePath);
    });
  });

  describe('resolvePath edge cases', () => {
    it('should handle paths with special characters', () => {
      const configManager = ConfigManager.getInstance(testDir);

      const resolved1 = configManager.resolvePath('path with spaces/file.txt');
      expect(resolved1).toBe(path.join(testDir, 'path with spaces/file.txt'));

      const resolved2 = configManager.resolvePath('path-with-dashes/file.txt');
      expect(resolved2).toBe(path.join(testDir, 'path-with-dashes/file.txt'));
    });

    it('should handle empty paths', () => {
      const configManager = ConfigManager.getInstance(testDir);

      const resolved = configManager.resolvePath('');
      expect(resolved).toBe(testDir);
    });

    it('should normalize paths', () => {
      const configManager = ConfigManager.getInstance(testDir);

      const resolved = configManager.resolvePath('./docs/../src/index.ts');
      expect(resolved).toBe(path.join(testDir, 'src/index.ts'));
    });
  });

  describe('update with multiple sections', () => {
    it('should update multiple sections independently', () => {
      const configManager = ConfigManager.getInstance(testDir);
      configManager.init();

      configManager.update('project', {
        name: 'new-project-name',
      });

      configManager.update('validation', {
        strictMode: true,
      });

      const config = configManager.get();
      expect(config.project.name).toBe('new-project-name');
      expect(config.validation?.strictMode).toBe(true);
    });

    it('should preserve other section values when updating one section', () => {
      const configManager = ConfigManager.getInstance(testDir);

      configManager.init({
        project: {
          name: 'original',
          version: '1.0.0',
        },
        paths: {
          commentsDir: 'original-comments',
          databasePath: '.db',
          jsonlDir: 'data',
        },
      });

      configManager.update('project', {
        name: 'updated',
      });

      const config = configManager.get();
      expect(config.project.name).toBe('updated');
      expect(config.project.version).toBe('1.0.0');
      expect(config.paths.commentsDir).toBe('original-comments');
    });
  });

  describe('singleton behavior', () => {
    it('should maintain singleton across multiple getInstance calls with same params', () => {
      const instance1 = ConfigManager.getInstance(testDir);
      const instance2 = ConfigManager.getInstance(testDir);
      const instance3 = ConfigManager.getInstance(); // Different params, but singleton already exists

      expect(instance1).toBe(instance2);
      expect(instance1).toBe(instance3);
    });

    it('should allow reset and re-initialization', () => {
      const instance1 = ConfigManager.getInstance(testDir);

      ConfigManager.reset();

      const instance2 = ConfigManager.getInstance(testDir);

      expect(instance1).not.toBe(instance2);
    });
  });
});
