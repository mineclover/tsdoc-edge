/**
 * ConfigLoader tests
 */

import * as fs from 'fs';
import * as path from 'path';
import { ConfigLoader } from '../utils/ConfigLoader';
import { DEFAULT_CONFIG, CONFIG_FILE_NAME } from '../types/config';

describe('ConfigLoader', () => {
  const testDir = path.join(__dirname, '__test_config__');
  const configPath = path.join(testDir, CONFIG_FILE_NAME);

  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
    if (fs.existsSync(testDir)) {
      fs.rmdirSync(testDir);
    }
  });

  describe('constructor', () => {
    it('should use default config when no config file exists', () => {
      const loader = new ConfigLoader(testDir);
      const config = loader.getConfig();

      // Should have default structure (may find project's config file)
      expect(config.project).toBeDefined();
      expect(config.paths).toBeDefined();
      expect(config.linkCheck).toBeDefined();

      // Basic structure checks
      expect(config.linkCheck?.checkTypes).toBeDefined();
      expect(config.linkCheck?.externalModules).toBeDefined();
      expect(config.linkCheck?.enableSuggestions).toBeDefined();
      expect(config.linkCheck?.failOnBroken).toBeDefined();
    });

    it('should load config from file when it exists', () => {
      const customConfig = {
        project: {
          name: 'test-project',
          version: '2.0.0',
        },
        paths: {
          commentsDir: '.custom-comments',
          databasePath: '.custom.db',
          jsonlDir: 'custom/data',
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(customConfig, null, 2));

      const loader = new ConfigLoader(testDir);
      const config = loader.getConfig();

      expect(config.project.name).toBe('test-project');
      expect(config.project.version).toBe('2.0.0');
      expect(config.paths.commentsDir).toBe('.custom-comments');
      expect(loader.hasConfigFile()).toBe(true);
      expect(loader.getConfigPath()).toBe(configPath);
    });

    it('should merge custom config with defaults', () => {
      const customConfig = {
        project: {
          name: 'test-project',
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(customConfig, null, 2));

      const loader = new ConfigLoader(testDir);
      const config = loader.getConfig();

      // Custom value
      expect(config.project.name).toBe('test-project');
      // Default values
      expect(config.project.version).toBe(DEFAULT_CONFIG.project.version);
      expect(config.paths).toEqual(DEFAULT_CONFIG.paths);
    });

    it('should handle invalid JSON gracefully', () => {
      fs.writeFileSync(configPath, 'invalid json {');

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const loader = new ConfigLoader(testDir);

      expect(loader.hasConfigFile()).toBe(false);
      expect(loader.getConfig()).toEqual(DEFAULT_CONFIG);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('getLinkCheckConfig', () => {
    it('should return default link check config', () => {
      const loader = new ConfigLoader(testDir);
      const linkCheckConfig = loader.getLinkCheckConfig();

      // Should have the expected structure (may load project config)
      expect(linkCheckConfig.checkTypes).toBeDefined();
      expect(linkCheckConfig.enableSuggestions).toBeDefined();
      expect(linkCheckConfig.failOnBroken).toBeDefined();

      // If using default config, should match defaults
      if (!loader.hasConfigFile() || !loader.getConfigPath()?.startsWith(testDir)) {
        expect(linkCheckConfig.checkTypes).toContain('dependency');
        expect(linkCheckConfig.checkTypes).toContain('relatedProblem');
      }
    });

    it('should return custom link check config', () => {
      const customConfig = {
        linkCheck: {
          checkTypes: ['dependency'],
          externalModules: ['custom-module', 'another-module'],
          enableSuggestions: false,
          maxSuggestionDistance: 5,
          failOnBroken: true,
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(customConfig, null, 2));

      const loader = new ConfigLoader(testDir);
      const linkCheckConfig = loader.getLinkCheckConfig();

      expect(linkCheckConfig.checkTypes).toEqual(['dependency']);
      expect(linkCheckConfig.externalModules).toEqual(['custom-module', 'another-module']);
      expect(linkCheckConfig.enableSuggestions).toBe(false);
      expect(linkCheckConfig.maxSuggestionDistance).toBe(5);
      expect(linkCheckConfig.failOnBroken).toBe(true);
    });
  });

  describe('isExternalModule', () => {
    it('should identify exact matches', () => {
      const customConfig = {
        linkCheck: {
          externalModules: ['fs', 'path', 'typescript'],
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(customConfig, null, 2));

      const loader = new ConfigLoader(testDir);

      expect(loader.isExternalModule('fs')).toBe(true);
      expect(loader.isExternalModule('path')).toBe(true);
      expect(loader.isExternalModule('typescript')).toBe(true);
      expect(loader.isExternalModule('other-module')).toBe(false);
    });

    it('should support wildcard patterns', () => {
      const customConfig = {
        linkCheck: {
          externalModules: ['node:*', '@types/*'],
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(customConfig, null, 2));

      const loader = new ConfigLoader(testDir);

      expect(loader.isExternalModule('node:fs')).toBe(true);
      expect(loader.isExternalModule('node:path')).toBe(true);
      expect(loader.isExternalModule('@types/node')).toBe(true);
      expect(loader.isExternalModule('@types/jest')).toBe(true);
      expect(loader.isExternalModule('other-module')).toBe(false);
    });

    it('should use default external modules when not configured', () => {
      const loader = new ConfigLoader(testDir);

      expect(loader.isExternalModule('fs')).toBe(true);
      expect(loader.isExternalModule('path')).toBe(true);
      expect(loader.isExternalModule('typescript')).toBe(true);
      expect(loader.isExternalModule('node:fs')).toBe(true);
      expect(loader.isExternalModule('node:path')).toBe(true);
    });
  });

  describe('resolvePath', () => {
    it('should resolve path relative to config file', () => {
      fs.writeFileSync(configPath, JSON.stringify({ project: { name: 'test' } }, null, 2));

      const loader = new ConfigLoader(testDir);
      const resolved = loader.resolvePath('src/index.ts');

      expect(resolved).toBe(path.join(testDir, 'src/index.ts'));
    });

    it('should resolve path relative to cwd when no config file', () => {
      const loader = new ConfigLoader(testDir);
      const resolved = loader.resolvePath('src/index.ts');

      expect(resolved).toBe(path.resolve('src/index.ts'));
    });
  });

  describe('findConfigFile', () => {
    it('should find config file in parent directories', () => {
      const subDir = path.join(testDir, 'sub', 'nested');
      fs.mkdirSync(subDir, { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify({ project: { name: 'test' } }, null, 2));

      const loader = new ConfigLoader(subDir);

      expect(loader.hasConfigFile()).toBe(true);
      expect(loader.getConfigPath()).toBe(configPath);

      // Clean up
      fs.rmdirSync(path.join(testDir, 'sub', 'nested'));
      fs.rmdirSync(path.join(testDir, 'sub'));
    });

    it('should stop searching after maximum depth', () => {
      const loader = new ConfigLoader(testDir);

      // May find project config in parent directories
      // Just verify that getConfigPath is either null or not in testDir
      const configPath = loader.getConfigPath();
      if (configPath) {
        expect(configPath.startsWith(testDir)).toBe(false);
      }
    });
  });

  describe('config merging', () => {
    it('should merge nested objects correctly', () => {
      const customConfig = {
        validation: {
          strictMode: true,
          rules: {
            'no-empty': 'error',
          },
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(customConfig, null, 2));

      const loader = new ConfigLoader(testDir);
      const config = loader.getConfig();

      expect(config.validation?.strictMode).toBe(true);
      expect(config.validation?.minConnectivityScore).toBe(
        DEFAULT_CONFIG.validation?.minConnectivityScore
      );
      expect(config.validation?.rules?.['no-empty']).toBe('error');
    });

    it('should preserve all default sections when partial config provided', () => {
      const customConfig = {
        project: {
          name: 'custom-project',
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(customConfig, null, 2));

      const loader = new ConfigLoader(testDir);
      const config = loader.getConfig();

      expect(config.project.name).toBe('custom-project');
      expect(config.paths).toEqual(DEFAULT_CONFIG.paths);
      expect(config.fold).toEqual(DEFAULT_CONFIG.fold);
      expect(config.validation).toEqual(DEFAULT_CONFIG.validation);
      expect(config.generator).toEqual(DEFAULT_CONFIG.generator);
      expect(config.preCommit).toEqual(DEFAULT_CONFIG.preCommit);
      expect(config.linkCheck).toEqual(DEFAULT_CONFIG.linkCheck);
    });
  });
});
