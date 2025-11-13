/**
 * Spec Diff Command - Compare specification versions
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { SpecVersionManager } from '../spec/SpecVersionManager';

/**
 * Command for comparing specification versions
 *
 * @public
 * @responsibility Compare two versions of a specification
 * @contract Reads versions from Git, computes diff, displays changes
 * @doc [[SpecDiffCommand]]
 * @doc [[CLI Commands#spec-diff]]
 *
 * @problem Need to understand changes between versions
 * @solves Shows added, removed, and modified sections
 * @context Part of specification versioning system
 *
 * @functionality
 * - Version retrieval: Get content from Git history
 * - Diff computation: Compare two versions
 * - Change categorization: Added, removed, modified sections
 * - Summary generation: High-level change description
 * - Detailed display: Show specific changes
 *
 * @decision Use SpecVersionManager for diff computation
 * @rationale Integrates with Git for version comparison
 * @consequences Requires valid version numbers in Git history
 *
 * @depends SpecVersionManager
 * @depType internal
 * @depReason Version comparison
 */
export class SpecDiffCommand extends BaseCommand {
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
    return 'spec-diff';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Compare specification versions';
  }

  protected getUsage(): string {
    return `tsdoc-edge spec-diff <file> <from-version> <to-version>

  Example: tsdoc-edge spec-diff managed/features/validation.md 1.0.0 2.0.0`;
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
      const fromVersion = args[1];
      const toVersion = args[2];

      if (!target || !fromVersion || !toVersion) {
        this.printError('Usage: tsdoc-edge spec-diff <file> <from-version> <to-version>');
        this.printInfo('Example: tsdoc-edge spec-diff managed/features/validation.md 1.0.0 2.0.0');
        console.log();
        return this.failure('File and version numbers required');
      }

      const filePath = path.resolve(process.cwd(), target);

      if (!fs.existsSync(filePath)) {
        this.printError(`File not found: ${filePath}`);
        console.log();
        return this.failure(`File not found: ${filePath}`);
      }

      const manager = this.manager || new SpecVersionManager();

      const diff = manager.diff(filePath, fromVersion, toVersion);

      this.printHeader('Specification Version Comparison');
      console.log(`File: ${colors.cyan}${path.relative(process.cwd(), filePath)}${colors.reset}`);
      console.log(`From: ${colors.yellow}v${diff.from}${colors.reset}`);
      console.log(`To:   ${colors.green}v${diff.to}${colors.reset}`);
      console.log();

      this.printSection('Summary');
      console.log(diff.summary);
      console.log();

      if (diff.changes.added.length > 0) {
        this.printSection('Added Sections');
        for (const section of diff.changes.added) {
          console.log(`${colors.green}+ ${section}${colors.reset}`);
        }
        console.log();
      }

      if (diff.changes.removed.length > 0) {
        this.printSection('Removed Sections');
        for (const section of diff.changes.removed) {
          console.log(`${colors.red}- ${section}${colors.reset}`);
        }
        console.log();
      }

      if (diff.changes.modified.length > 0) {
        this.printSection('Modified Content');
        for (const section of diff.changes.modified) {
          console.log(`${colors.yellow}~ ${section}${colors.reset}`);
        }
        console.log();
      }

      return this.success();
    });
  }
}
