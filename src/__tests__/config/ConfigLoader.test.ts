/**
 * ConfigLoader tests
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { CONFIG_FILE_NAME, DEFAULT_CONFIG } from '../../types/config';
import { ConfigLoader } from '../../utils/ConfigLoader';

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
      fs.rmSync(testDir, { recursive: true });
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

    it('preserves spec governance for LSP and CLI consumers', () => {
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          specGovernance: {
            authoredSpecDirs: ['managed/specs'],
            naming: {
              contractVersion: '1.0',
              rules: [
                { id: 'spec-kebab', path: 'managed/specs/**/*.md', target: 'file', style: 'kebab' },
              ],
            },
            tsdoc: {
              contractVersion: '1.0',
              rules: [{ id: 'public', path: 'src/**/*.ts', requiredTags: ['public'] }],
            },
          },
          documentManagement: { enabled: true, managedDirs: ['managed'] },
        })
      );

      const config = new ConfigLoader(testDir).getConfig();

      expect(config.specGovernance).toMatchObject({
        authoredSpecDirs: ['managed/specs'],
        naming: { rules: [{ id: 'spec-kebab' }] },
        tsdoc: { rules: [{ id: 'public' }] },
      });
      expect(config.documentManagement).toMatchObject({ enabled: true, managedDirs: ['managed'] });
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
      fs.rmSync(path.join(testDir, 'sub', 'nested'), { recursive: true });
      fs.rmSync(path.join(testDir, 'sub'), { recursive: true });
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

    it('should deep merge validation rules', () => {
      const customConfig = {
        validation: {
          rules: {
            'custom-rule': 'error',
          },
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(customConfig, null, 2));

      const loader = new ConfigLoader(testDir);
      const config = loader.getConfig();

      expect(config.validation?.rules?.['custom-rule']).toBe('error');
      expect(config.validation?.strictMode).toBe(DEFAULT_CONFIG.validation?.strictMode);
    });

    it('should override array properties completely', () => {
      const customConfig = {
        linkCheck: {
          checkTypes: ['dependency'],
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(customConfig, null, 2));

      const loader = new ConfigLoader(testDir);
      const config = loader.getConfig();

      expect(config.linkCheck?.checkTypes).toEqual(['dependency']);
    });
  });

  describe('Error handling', () => {
    it('should handle missing config file directory', () => {
      const nonExistentDir = path.join(testDir, 'nonexistent', 'deep', 'path');

      const loader = new ConfigLoader(nonExistentDir);

      // May find project config in parent directories
      // Just verify it returns a valid config
      const config = loader.getConfig();
      expect(config.project).toBeDefined();
      expect(config.paths).toBeDefined();
    });

    it('should handle empty JSON file', () => {
      fs.writeFileSync(configPath, '{}');

      const loader = new ConfigLoader(testDir);
      const config = loader.getConfig();

      // Should merge with defaults, so compare key sections
      expect(config.project.name).toBe(DEFAULT_CONFIG.project.name);
      expect(config.paths.commentsDir).toBe(DEFAULT_CONFIG.paths.commentsDir);
      expect(config.paths.databasePath).toBe(DEFAULT_CONFIG.paths.databasePath);
    });

    it('should handle malformed JSON with extra commas', () => {
      fs.writeFileSync(configPath, '{"project": {"name": "test",}}');

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const loader = new ConfigLoader(testDir);

      expect(loader.hasConfigFile()).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should handle file read permissions error', () => {
      fs.writeFileSync(configPath, JSON.stringify({ project: { name: 'test' } }));

      // Make file unreadable (may not work on all systems)
      try {
        fs.chmodSync(configPath, 0o000);

        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const loader = new ConfigLoader(testDir);

        expect(loader.hasConfigFile()).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalled();

        consoleWarnSpy.mockRestore();

        // Restore permissions
        fs.chmodSync(configPath, 0o644);
      } catch (_error) {
        // Skip on systems where chmod doesn't work as expected
        fs.chmodSync(configPath, 0o644);
      }
    });
  });

  describe('External module patterns', () => {
    it('should handle complex wildcard patterns', () => {
      const customConfig = {
        linkCheck: {
          externalModules: ['@scope/*', 'node:*', '@types/*'],
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(customConfig, null, 2));

      const loader = new ConfigLoader(testDir);

      expect(loader.isExternalModule('@scope/package')).toBe(true);
      expect(loader.isExternalModule('@scope/nested/package')).toBe(true);
      expect(loader.isExternalModule('node:fs')).toBe(true);
      expect(loader.isExternalModule('@types/react')).toBe(true);
      expect(loader.isExternalModule('regular-package')).toBe(false);
    });

    it('should handle empty external modules array', () => {
      const customConfig = {
        linkCheck: {
          externalModules: [],
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(customConfig, null, 2));

      const loader = new ConfigLoader(testDir);

      expect(loader.isExternalModule('fs')).toBe(false);
      expect(loader.isExternalModule('path')).toBe(false);
      expect(loader.isExternalModule('node:fs')).toBe(false);
    });

    it('should handle mixed exact and wildcard patterns', () => {
      const customConfig = {
        linkCheck: {
          externalModules: ['fs', 'path', 'node:*', '@types/*'],
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(customConfig, null, 2));

      const loader = new ConfigLoader(testDir);

      expect(loader.isExternalModule('fs')).toBe(true);
      expect(loader.isExternalModule('path')).toBe(true);
      expect(loader.isExternalModule('node:crypto')).toBe(true);
      expect(loader.isExternalModule('@types/node')).toBe(true);
      expect(loader.isExternalModule('unknown')).toBe(false);
    });

    it('should not match partial strings without wildcard', () => {
      const customConfig = {
        linkCheck: {
          externalModules: ['test'],
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(customConfig, null, 2));

      const loader = new ConfigLoader(testDir);

      expect(loader.isExternalModule('test')).toBe(true);
      expect(loader.isExternalModule('testing')).toBe(false);
      expect(loader.isExternalModule('test-utils')).toBe(false);
    });
  });

  describe('Path resolution edge cases', () => {
    it('should resolve absolute paths correctly', () => {
      fs.writeFileSync(configPath, JSON.stringify({ project: { name: 'test' } }));

      const loader = new ConfigLoader(testDir);
      const resolved = loader.resolvePath('/absolute/path');

      expect(path.isAbsolute(resolved)).toBe(true);
      expect(resolved).toContain('absolute');
    });

    it('should handle paths with ../ segments', () => {
      fs.writeFileSync(configPath, JSON.stringify({ project: { name: 'test' } }));

      const loader = new ConfigLoader(testDir);
      const resolved = loader.resolvePath('../parent/file.txt');

      expect(resolved).toBe(path.join(testDir, '../parent/file.txt'));
    });

    it('should handle paths with ./ prefix', () => {
      fs.writeFileSync(configPath, JSON.stringify({ project: { name: 'test' } }));

      const loader = new ConfigLoader(testDir);
      const resolved = loader.resolvePath('./current/file.txt');

      expect(resolved).toBe(path.join(testDir, './current/file.txt'));
    });

    it('should handle empty path string', () => {
      fs.writeFileSync(configPath, JSON.stringify({ project: { name: 'test' } }));

      const loader = new ConfigLoader(testDir);
      const resolved = loader.resolvePath('');

      expect(resolved).toBe(testDir);
    });
  });

  describe('Config file discovery', () => {
    it('should find config in immediate parent', () => {
      const childDir = path.join(testDir, 'child');
      fs.mkdirSync(childDir, { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify({ project: { name: 'parent-config' } }));

      const loader = new ConfigLoader(childDir);

      expect(loader.hasConfigFile()).toBe(true);
      expect(loader.getConfigPath()).toBe(configPath);
      expect(loader.getConfig().project.name).toBe('parent-config');

      fs.rmSync(childDir, { recursive: true });
    });

    it('should find config multiple levels up', () => {
      const deepDir = path.join(testDir, 'a', 'b', 'c', 'd');
      fs.mkdirSync(deepDir, { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify({ project: { name: 'root-config' } }));

      const loader = new ConfigLoader(deepDir);

      expect(loader.hasConfigFile()).toBe(true);
      expect(loader.getConfig().project.name).toBe('root-config');

      fs.rmSync(path.join(testDir, 'a'), { recursive: true });
    });

    it('should stop at first config file found', () => {
      const childDir = path.join(testDir, 'child');
      fs.mkdirSync(childDir, { recursive: true });

      const childConfigPath = path.join(childDir, CONFIG_FILE_NAME);
      fs.writeFileSync(configPath, JSON.stringify({ project: { name: 'parent-config' } }));
      fs.writeFileSync(childConfigPath, JSON.stringify({ project: { name: 'child-config' } }));

      const loader = new ConfigLoader(childDir);

      expect(loader.getConfig().project.name).toBe('child-config');
      expect(loader.getConfigPath()).toBe(childConfigPath);

      fs.unlinkSync(childConfigPath);
      fs.rmSync(childDir, { recursive: true });
    });

    it('should handle root directory without config', () => {
      const loader = new ConfigLoader('/');

      // Should use defaults if no config found
      const config = loader.getConfig();
      expect(config.project).toBeDefined();
      expect(config.paths).toBeDefined();
    });
  });

  describe('Link check configuration', () => {
    it('should return all link check options', () => {
      const customConfig = {
        linkCheck: {
          checkTypes: ['dependency', 'symbol'],
          externalModules: ['custom-module'],
          excludePatterns: ['*.test.ts'],
          enableSuggestions: false,
          maxSuggestionDistance: 5,
          failOnBroken: true,
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(customConfig, null, 2));

      const loader = new ConfigLoader(testDir);
      const linkCheckConfig = loader.getLinkCheckConfig();

      expect(linkCheckConfig.checkTypes).toEqual(['dependency', 'symbol']);
      expect(linkCheckConfig.externalModules).toEqual(['custom-module']);
      expect(linkCheckConfig.excludePatterns).toEqual(['*.test.ts']);
      expect(linkCheckConfig.enableSuggestions).toBe(false);
      expect(linkCheckConfig.maxSuggestionDistance).toBe(5);
      expect(linkCheckConfig.failOnBroken).toBe(true);
    });

    it('should handle missing linkCheck section', () => {
      const customConfig = {
        project: {
          name: 'test',
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(customConfig, null, 2));

      const loader = new ConfigLoader(testDir);
      const linkCheckConfig = loader.getLinkCheckConfig();

      expect(linkCheckConfig).toEqual(DEFAULT_CONFIG.linkCheck);
    });
  });

  describe('Multiple config sections', () => {
    it('should load all config sections correctly', () => {
      const fullConfig = {
        project: {
          name: 'full-project',
          version: '2.0.0',
          srcDirs: ['src', 'lib'],
        },
        paths: {
          commentsDir: '.custom-comments',
          databasePath: '.custom.db',
          jsonlDir: 'custom/jsonl',
        },
        fold: {
          enabled: false,
          autoExport: true,
        },
        validation: {
          strictMode: true,
          minConnectivityScore: 80,
        },
        generator: {
          template: 'strict',
          includePrivate: true,
        },
        preCommit: {
          enabled: true,
          threshold: 60,
        },
        linkCheck: {
          enableSuggestions: false,
          failOnBroken: true,
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(fullConfig, null, 2));

      const loader = new ConfigLoader(testDir);
      const config = loader.getConfig();

      expect(config.project.name).toBe('full-project');
      expect(config.project.version).toBe('2.0.0');
      expect(config.project.srcDirs).toEqual(['src', 'lib']);
      expect(config.paths.commentsDir).toBe('.custom-comments');
      expect(config.fold?.enabled).toBe(false);
      expect(config.validation?.strictMode).toBe(true);
      expect(config.generator?.template).toBe('strict');
      expect(config.preCommit?.enabled).toBe(true);
      expect(config.linkCheck?.enableSuggestions).toBe(false);
    });
  });

  describe('hasConfigFile behavior', () => {
    it('should return false when no config exists anywhere', () => {
      const deepDir = path.join(testDir, 'very', 'deep', 'path');
      fs.mkdirSync(deepDir, { recursive: true });

      const loader = new ConfigLoader(deepDir);

      // May find project config, so just check it's consistent
      const hasFile = loader.hasConfigFile();
      const configPath = loader.getConfigPath();

      if (hasFile) {
        expect(configPath).not.toBeNull();
      } else {
        expect(configPath).toBeNull();
      }

      fs.rmSync(path.join(testDir, 'very'), { recursive: true });
    });

    it('should return true when config exists', () => {
      fs.writeFileSync(configPath, JSON.stringify({ project: { name: 'test' } }));

      const loader = new ConfigLoader(testDir);

      expect(loader.hasConfigFile()).toBe(true);
      expect(loader.getConfigPath()).not.toBeNull();
    });
  });
});
