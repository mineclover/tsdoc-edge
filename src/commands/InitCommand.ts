/**
 * Init Command - Initialize TSDoc Edge configuration
 *
 * @packageDocumentation
 * @doc [[InitCommand]]
 * @doc [[CLI Commands]]
 * @context Workspace bootstrap command (`tsdoc-edge init`) creating `.tsdoc.config.json`, `tsdoc.json`, and managed directories
 * @functionality Generates default project configuration and Microsoft `tsdoc.json` custom tag definitions with `--force` and `--dry-run` support
 * @sideEffect console: Writes initialization steps and dry-run previews to stdout
 * @sideEffect filesystem: Creates `.tsdoc.config.json`, `tsdoc.json`, and workspace directories on disk unless `--dry-run` is active
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConfigManager } from '../config/ConfigManager';
import { generateTsdocJson } from '../parser/TSDocParser';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * InitCommand - Initialize TSDoc Edge
 * @public
 * @doc [[InitCommand]]
 * @doc [[CLI Commands]]
 * @doc [[CLI Commands#init]]
 * @sideEffect filesystem: Writes `.tsdoc.config.json`, `tsdoc.json`, and managed directories; writes CLI status to stdout
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

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge init [options]

  Options:
    --force, -f      Overwrite existing configuration
    --dry-run, -n    Preview initialization without writing files
    --name=NAME      Project name
    --version=VER    Project version`;
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(() => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const flagError = this.validateAllowedFlags(
        args,
        ['--force', '-f', '--dry-run', '-n'],
        ['--name', '--version']
      );
      if (flagError) return flagError;

      this.printHeader('TSDoc Edge - Initialize Project');

      const hasForce = this.hasFlag(args, ['--force', '-f']);
      const dryRun = this.hasFlag(args, ['--dry-run', '-n']);
      const projectName = this.getOption(args, '--name') || path.basename(process.cwd());
      const projectVersion = this.getOption(args, '--version') || '1.0.0';

      const configManager = ConfigManager.getInstance();

      if (configManager.exists() && !hasForce) {
        this.printWarning('Configuration file already exists at:');
        this.printInfo(`   ${configManager.getConfigPath()}`);
        console.log();
        console.log('Use --force to overwrite the existing configuration.');
        console.log();
        return this.failure('Configuration already exists');
      }

      if (dryRun) {
        this.printInfo(`Would create configuration at: ${configManager.getConfigPath()}`);
        this.printInfo(`Project: ${projectName} ${projectVersion}`);
        this.printInfo('Would create tsdoc.json and configured directories');
        return this.success('Dry run complete');
      }

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

      // Generate standard tsdoc.json for official TSDoc ecosystem integration
      const tsdocJsonPath = path.join(process.cwd(), 'tsdoc.json');
      if (!fs.existsSync(tsdocJsonPath) || hasForce) {
        fs.writeFileSync(
          tsdocJsonPath,
          `${JSON.stringify(generateTsdocJson(), null, 2)}\n`,
          'utf-8'
        );
        this.printSuccess('Created tsdoc.json (official Microsoft TSDoc configuration)');
        console.log();
      }

      console.log('Next steps:');
      console.log('  1. Customize your configuration in .tsdoc.config.json');
      console.log('  2. Synchronize workspace SSOT: tsdoc-edge sync');
      console.log('  3. Validate your project: tsdoc-edge validate');
      console.log(
        '  4. Official TSDoc config tsdoc.json generated for VS Code / @ttsc/lint compatibility'
      );
      console.log();

      return this.success();
    });
  }
}
