/**
 * Spec Bump Command - Bump specification version
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { SpecVersionManager } from '../spec/SpecVersionManager';

/**
 * Command for bumping specification version
 *
 * @public
 * @responsibility Increment specification version number
 * @contract Validates bump type, updates frontmatter, shows changes
 * @doc [[SpecBumpCommand]]
 * @doc [[CLI Commands#spec-bump]]
 *
 * @problem Need to increment version following semver
 * @solves Bumps version (major, minor, patch) automatically
 * @context Part of specification versioning system
 *
 * @functionality
 * - Bump type validation: major, minor, or patch
 * - Version parsing: Read current version from frontmatter
 * - Version increment: Follow semver rules
 * - Frontmatter update: Write new version to file
 * - Change display: Show old and new versions
 *
 * @decision Use SpecVersionManager for version bumping
 * @rationale Centralized semver logic
 * @consequences Requires valid semver format in frontmatter
 *
 * @depends SpecVersionManager
 * @depType internal
 * @depReason Version bumping logic
 */
export class SpecBumpCommand extends BaseCommand {
  private manager?: SpecVersionManager;

  constructor(manager?: SpecVersionManager) {
    super();
    this.manager = manager;
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'spec-bump';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Bump specification version';
  }

  protected getUsage(): string {
    return `tsdoc-edge spec-bump <file> <bump-type>

  Bump types: major, minor, patch
  Example: tsdoc-edge spec-bump managed/features/validation.md minor`;
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

      const target = args[0];
      const bumpType = args[1] as 'major' | 'minor' | 'patch' | undefined;

      if (!target) {
        this.printError('Usage: tsdoc-edge spec-bump <file> <bump-type>');
        this.printInfo('Bump types: major, minor, patch');
        this.printInfo('Example: tsdoc-edge spec-bump managed/features/validation.md minor');
        console.log();
        return this.failure('File and bump type required');
      }

      if (!bumpType || !['major', 'minor', 'patch'].includes(bumpType)) {
        this.printError('Invalid bump type. Use: major, minor, or patch');
        console.log();
        return this.failure('Invalid bump type');
      }

      const filePath = path.resolve(process.cwd(), target);

      if (!fs.existsSync(filePath)) {
        this.printError(`File not found: ${filePath}`);
        console.log();
        return this.failure(`File not found: ${filePath}`);
      }

      const manager = this.manager || new SpecVersionManager();

      const oldVersion = manager.getCurrentVersion(filePath);
      const newVersion = manager.bump(filePath, bumpType);

      this.printHeader('Version Bumped');
      console.log(`File: ${colors.cyan}${path.relative(process.cwd(), filePath)}${colors.reset}`);
      console.log(`Old version: ${colors.yellow}${oldVersion}${colors.reset}`);
      console.log(`New version: ${colors.green}${newVersion}${colors.reset}`);
      console.log(`Bump type:   ${colors.blue}${bumpType}${colors.reset}`);
      console.log();
      this.printSuccess('Version updated successfully');
      console.log();

      return this.success();
    });
  }
}
