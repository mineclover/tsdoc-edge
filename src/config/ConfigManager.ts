/**
 * Configuration Manager
 *
 * @remarks
 * Manages tsdoc-edge configuration file (.tsdoc.config.json).
 * Provides singleton access to configuration across the application.
 *
 * @public
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { CONFIG_FILE_NAME, DEFAULT_CONFIG, type TsdocEdgeConfig } from '../types/config';

/**
 * Configuration manager for tsdoc-edge
 *
 * @remarks
 * Singleton class that handles loading, saving, and accessing configuration.
 *
 * @example
 * ```typescript
 * const config = ConfigManager.getInstance();
 * const commentsDir = config.get().paths.commentsDir;
 * ```
 *
 * @public
 */
export class ConfigManager {
  private static instance: ConfigManager | null = null;
  private config: TsdocEdgeConfig;
  private configPath: string;
  private projectRoot: string;

  /**
   * Private constructor (singleton pattern)
   *
   * @param projectRoot - Project root directory
   * @private
   */
  private constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.configPath = path.join(projectRoot, CONFIG_FILE_NAME);
    this.config = this.loadConfig();
  }

  /**
   * Get singleton instance
   *
   * @param projectRoot - Project root directory (optional, only used on first call)
   * @returns ConfigManager instance
   *
   * @public
   */
  public static getInstance(projectRoot?: string): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager(projectRoot);
    }
    return ConfigManager.instance;
  }

  /**
   * Reset singleton instance (for testing)
   *
   * @public
   * @returns void - No return value
   */
  public static reset(): void {
    ConfigManager.instance = null;
  }

  /**
   * Load configuration from file
   *
   * @returns Loaded configuration with defaults merged
   *
   * @remarks
   * If config file doesn't exist, returns default configuration.
   * Invalid JSON will throw an error.
   *
   * @private
   */
  private loadConfig(): TsdocEdgeConfig {
    if (!fs.existsSync(this.configPath)) {
      return { ...DEFAULT_CONFIG };
    }

    try {
      const content = fs.readFileSync(this.configPath, 'utf-8');
      const userConfig = JSON.parse(content) as Partial<TsdocEdgeConfig>;
      return this.mergeConfig(DEFAULT_CONFIG, userConfig);
      /**
       * error
       * @public
       */
    } catch (error) {
      throw new Error(`Failed to load config from ${this.configPath}: ${error}`);
    }
  }

  /**
   * Deep merge user config with default config
   *
   * @param defaultConfig - Default configuration
   * @param userConfig - User-provided configuration
   * @returns Merged configuration
   *
   * @private
   */
  private mergeConfig(
    defaultConfig: TsdocEdgeConfig,
    userConfig: Partial<TsdocEdgeConfig>
  ): TsdocEdgeConfig {
    return {
      project: { ...defaultConfig.project, ...userConfig.project },
      paths: { ...defaultConfig.paths, ...userConfig.paths },
      fold: { ...defaultConfig.fold, ...userConfig.fold },
      validation: { ...defaultConfig.validation, ...userConfig.validation },
      generator: { ...defaultConfig.generator, ...userConfig.generator },
    };
  }

  /**
   * Get current configuration
   *
   * @returns Current configuration
   *
   * @public
   */
  public get(): TsdocEdgeConfig {
    return this.config;
  }

  /**
   * Get resolved absolute path for a configured path
   *
   * @param relativePath - Relative path from config
   * @returns Absolute path
   *
   * @example
   * ```typescript
   * const config = ConfigManager.getInstance();
   * const commentsPath = config.resolvePath(config.get().paths.commentsDir);
   * // Returns: /absolute/path/to/project/.tsdoc-comments
   * ```
   *
   * @public
   */
  public resolvePath(relativePath: string): string {
    return path.resolve(this.projectRoot, relativePath);
  }

  /**
   * Save configuration to file
   *
   * @param config - Configuration to save
   *
   * @throws Error if write fails
   *
   * @public
   * @returns void - No return value
   */
  public save(config: TsdocEdgeConfig): void {
    try {
      const content = JSON.stringify(config, null, 2);
      fs.writeFileSync(this.configPath, content, 'utf-8');
      this.config = config;
      /**
       * error
       * @public
       */
    } catch (error) {
      throw new Error(`Failed to save config to ${this.configPath}: ${error}`);
    }
  }

  /**
   * Initialize new configuration file
   *
   * @param options - Partial configuration options
   * @param force - Overwrite existing config file
   *
   * @throws Error if file exists and force is false
   *
   * @public
   * @returns void - No return value
   */
  public init(options: Partial<TsdocEdgeConfig> = {}, force = false): void {
    if (fs.existsSync(this.configPath) && !force) {
      throw new Error(
        `Config file already exists at ${this.configPath}. Use --force to overwrite.`
      );
    }

    const config = this.mergeConfig(DEFAULT_CONFIG, options);
    this.save(config);
  }

  /**
   * Check if configuration file exists
   *
   * @returns True if config file exists
   *
   * @public
   */
  public exists(): boolean {
    return fs.existsSync(this.configPath);
  }

  /**
   * Get configuration file path
   *
   * @returns Absolute path to config file
   *
   * @public
   */
  public getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Get project root directory
   *
   * @returns Absolute path to project root
   *
   * @public
   */
  public getProjectRoot(): string {
    return this.projectRoot;
  }

  /**
   * Create all configured directories if they don't exist
   *
   * @public
   * @returns void - No return value
   */
  public ensureDirectories(): void {
    const paths = this.config.paths;

    const dirsToCreate = [paths.commentsDir, paths.jsonlDir, paths.outputDir].filter(
      Boolean
    ) as string[];

    /**
     * dir
     * @public
     */
    for (const dir of dirsToCreate) {
      const absolutePath = this.resolvePath(dir);
      if (!fs.existsSync(absolutePath)) {
        fs.mkdirSync(absolutePath, { recursive: true });
      }
    }

    // Create parent directory for database file
    const dbDir = path.dirname(this.resolvePath(paths.databasePath));
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }

  /**
   * Validate configuration
   *
   * @returns Validation result with errors
   *
   * @public
   */
  public validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate project
    if (!this.config.project.name) {
      errors.push('project.name is required');
    }
    if (!this.config.project.version) {
      errors.push('project.version is required');
    }

    // Validate paths
    if (!this.config.paths.commentsDir) {
      errors.push('paths.commentsDir is required');
    }
    if (!this.config.paths.databasePath) {
      errors.push('paths.databasePath is required');
    }
    if (!this.config.paths.jsonlDir) {
      errors.push('paths.jsonlDir is required');
    }

    // Validate connectivity score range
    if (this.config.validation?.minConnectivityScore !== undefined) {
      const score = this.config.validation.minConnectivityScore;
      if (score < 0 || score > 100) {
        errors.push('validation.minConnectivityScore must be between 0 and 100');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Update specific configuration section
   *
   * @param section - Configuration section to update
   * @param value - New value for the section
   *
   * @example
   * ```typescript
   * config.update('paths', { commentsDir: '.tsdoc' });
   * ```
   *
   * @public
   */
  public update<K extends keyof TsdocEdgeConfig>(
    section: K,
    value: Partial<TsdocEdgeConfig[K]>
  ): void {
    this.config[section] = { ...this.config[section], ...value } as TsdocEdgeConfig[K];
    this.save(this.config);
  }
}
