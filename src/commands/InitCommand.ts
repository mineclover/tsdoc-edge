/**
 * Init Command - Initialize TSDoc Edge configuration
 * @packageDocumentation
 */

import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { ConfigManager } from '../config/ConfigManager';

/**
 * InitCommand - Initialize TSDoc Edge
 * @public
 * @doc [[Init Command]]
 * @doc [[CLI Commands#init]]
 */
export class InitCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'init';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Initialize TSDoc Edge configuration';
  }

  protected getUsage(): string {
    return `tsdoc-edge init [options]

  Options:
    --force          Overwrite existing configuration
    --name=NAME      Project name
    --version=VER    Project version`;
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      this.printHeader('TSDoc Edge - Initialize Project');

      const hasForce = args.includes('--force');
      const nameArg = args.find((arg) => arg.startsWith('--name='));
      const versionArg = args.find((arg) => arg.startsWith('--version='));

      const configManager = ConfigManager.getInstance();

      if (configManager.exists() && !hasForce) {
        this.printWarning('Configuration file already exists at:');
        this.printInfo(`   ${configManager.getConfigPath()}`);
        console.log();
        console.log('Use --force to overwrite the existing configuration.');
        console.log();
        return this.failure('Configuration already exists');
      }

      const projectName = nameArg ? nameArg.split('=')[1] : path.basename(process.cwd());
      const projectVersion = versionArg ? versionArg.split('=')[1] : '1.0.0';

      configManager.init(
        {
          project: {
            name: projectName,
            version: projectVersion,
          },
        },
        hasForce
      );

      this.printSuccess('Configuration file created successfully!');
      console.log();
      console.log('Configuration file:');
      this.printInfo(`   ${configManager.getConfigPath()}`);
      console.log();

      const config = configManager.get();
      console.log('Project Settings:');
      console.log(`   Name: ${colors.bold}${config.project.name}${colors.reset}`);
      console.log(`   Version: ${colors.bold}${config.project.version}${colors.reset}`);
      console.log();

      console.log('Storage Paths:');
      this.printInfo(`   Comments: ${config.paths.commentsDir}`);
      this.printInfo(`   Database: ${config.paths.databasePath}`);
      this.printInfo(`   JSONL: ${config.paths.jsonlDir}`);
      this.printInfo(`   Output: ${config.paths.outputDir}`);
      console.log();

      console.log('Creating directories...');
      configManager.ensureDirectories();
      this.printSuccess('Directories created successfully!');
      console.log();

      console.log('Next steps:');
      console.log('  1. Customize your configuration in .tsdoc.config.json');
      console.log('  2. Build database: tsdoc-edge build src');
      console.log('  3. Validate your project: tsdoc-edge validate');
      console.log();

      return this.success();
    });
  }
}

/**
 * IdNewCommand - Generate new symbol ID
 * @public
 * @doc [[ID New Command]]
 * @doc [[CLI Commands#id-new]]
 */
