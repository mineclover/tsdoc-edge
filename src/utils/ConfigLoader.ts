/**
 * Configuration loader for TSDoc Edge
 *
 * @remarks
 * Loads and validates configuration from .tsdoc.config.json file
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  CONFIG_FILE_NAME,
  DEFAULT_CONFIG,
  type LinkCheckConfig,
  type TsdocEdgeConfig,
} from '../types/config';

/**
 * Configuration loader
 *
 * @public
 */
export class ConfigLoader {
  private config: TsdocEdgeConfig;
  private configPath: string | null = null;

  /**
   * Create a new ConfigLoader
   *
   * @param baseDir - Base directory to search for config file (defaults to cwd)
   */
  constructor(baseDir: string = process.cwd()) {
    this.config = this.loadConfig(baseDir);
  }

  /**
   * Load configuration from file or use defaults
   *
   * @param baseDir - Base directory to search for config file
   * @returns Loaded configuration
   */
  private loadConfig(baseDir: string): TsdocEdgeConfig {
    const configPath = this.findConfigFile(baseDir);

    if (!configPath) {
      return DEFAULT_CONFIG;
    }

    try {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      const userConfig = JSON.parse(configContent) as Partial<TsdocEdgeConfig>;

      this.configPath = configPath;
      return this.mergeConfig(userConfig);
    } catch (error) {
      console.warn(
        `Failed to load config from ${configPath}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return DEFAULT_CONFIG;
    }
  }

  /**
   * Find config file in the directory tree
   *
   * @param startDir - Directory to start searching from
   * @returns Path to config file or null if not found
   */
  private findConfigFile(startDir: string): string | null {
    let currentDir = startDir;

    // Search up to 10 levels
    for (let i = 0; i < 10; i++) {
      const configPath = path.join(currentDir, CONFIG_FILE_NAME);

      if (fs.existsSync(configPath)) {
        return configPath;
      }

      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        // Reached root directory
        break;
      }

      currentDir = parentDir;
    }

    return null;
  }

  /**
   * Merge user configuration with defaults
   *
   * @param userConfig - User-provided configuration
   * @returns Merged configuration
   */
  private mergeConfig(userConfig: Partial<TsdocEdgeConfig>): TsdocEdgeConfig {
    return {
      project: {
        ...DEFAULT_CONFIG.project,
        ...userConfig.project,
      },
      paths: {
        ...DEFAULT_CONFIG.paths,
        ...userConfig.paths,
      },
      fold: {
        ...DEFAULT_CONFIG.fold,
        ...userConfig.fold,
      },
      validation: {
        ...DEFAULT_CONFIG.validation,
        ...userConfig.validation,
        rules: {
          ...DEFAULT_CONFIG.validation?.rules,
          ...userConfig.validation?.rules,
        },
      },
      generator: {
        ...DEFAULT_CONFIG.generator,
        ...userConfig.generator,
      },
      preCommit: {
        ...DEFAULT_CONFIG.preCommit,
        ...userConfig.preCommit,
      },
      linkCheck: {
        ...DEFAULT_CONFIG.linkCheck,
        ...userConfig.linkCheck,
      },
      documentManagement: {
        ...DEFAULT_CONFIG.documentManagement,
        ...userConfig.documentManagement,
      },
      specGovernance: {
        ...DEFAULT_CONFIG.specGovernance,
        ...userConfig.specGovernance,
        naming: userConfig.specGovernance?.naming ?? DEFAULT_CONFIG.specGovernance?.naming,
        tsdoc: userConfig.specGovernance?.tsdoc ?? DEFAULT_CONFIG.specGovernance?.tsdoc,
      },
    };
  }

  /**
   * Get the full configuration
   *
   * @returns Full configuration object
   */
  public getConfig(): TsdocEdgeConfig {
    return this.config;
  }

  /**
   * Get link check configuration
   *
   * @returns Link check configuration
   */
  public getLinkCheckConfig(): LinkCheckConfig {
    return this.config.linkCheck || DEFAULT_CONFIG.linkCheck!;
  }

  /**
   * Get the path to the loaded config file
   *
   * @returns Path to config file or null if using defaults
   */
  public getConfigPath(): string | null {
    return this.configPath;
  }

  /**
   * Check if a config file was found and loaded
   *
   * @returns True if config file was loaded
   */
  public hasConfigFile(): boolean {
    return this.configPath !== null;
  }

  /**
   * Resolve a path relative to the config file directory
   *
   * @param relativePath - Path relative to config file
   * @returns Absolute path
   */
  public resolvePath(relativePath: string): string {
    if (this.configPath) {
      return path.resolve(path.dirname(this.configPath), relativePath);
    }
    return path.resolve(relativePath);
  }

  /**
   * Check if an external module should be excluded from link checking
   *
   * @param moduleName - Name of the module
   * @returns True if module should be excluded
   */
  public isExternalModule(moduleName: string): boolean {
    const externalModules = this.getLinkCheckConfig().externalModules || [];

    for (const pattern of externalModules) {
      if (pattern.endsWith('*')) {
        // Wildcard pattern (e.g., "node:*")
        const prefix = pattern.slice(0, -1);
        if (moduleName.startsWith(prefix)) {
          return true;
        }
      } else if (moduleName === pattern) {
        return true;
      }
    }

    return false;
  }
}
