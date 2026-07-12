/**
 * Spec History Command - Show specification version history
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { SpecVersionManager } from '../spec/SpecVersionManager';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * Command for showing specification version history
 *
 * @public
 * @responsibility Display version history from Git
 * @contract Reads Git history, shows versions with metadata
 * @doc [[SpecHistoryCommand]]
 * @doc [[CLI Commands#spec-history]]
 *
 * @problem Need to track document evolution over time
 * @solves Shows all versions with commit info
 * @context Part of specification versioning system
 *
 * @functionality
 * - Git history: Read version history from Git
 * - Version display: Show version, date, author, commit
 * - Chronological order: Latest versions first
 * - Empty state: Handle files with no history
 * - Metadata: Commit message and author info
 *
 * @decision Use SpecVersionManager for version tracking
 * @rationale Integrates with Git for version history
 * @consequences Requires Git repository and file in version control
 *
 * @depends SpecVersionManager
 * @depType internal
 * @depReason Version history management
 */
export class SpecHistoryCommand extends BaseCommand {
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
    return 'spec-history';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Show specification version history';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return 'tsdoc-edge spec-history <file-path>';
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

      if (!target) {
        this.printError('Usage: tsdoc-edge spec-history <file>');
        console.log();
        return this.failure('File path required');
      }

      const filePath = path.resolve(process.cwd(), target);

      if (!fs.existsSync(filePath)) {
        this.printError(`File not found: ${filePath}`);
        console.log();
        return this.failure(`File not found: ${filePath}`);
      }

      const manager = this.manager || new SpecVersionManager();
      const history = manager.getHistory(filePath);

      if (history.length === 0) {
        console.log(`${colors.yellow}No version history found${colors.reset}`);
        console.log();
        return this.success();
      }

      this.printHeader('Specification Version History');
      console.log(`File: ${colors.cyan}${path.relative(process.cwd(), filePath)}${colors.reset}`);
      console.log();

      this.printSection(`${history.length} versions found`);

      for (const entry of history) {
        console.log(`${colors.green}v${entry.version}${colors.reset} (${entry.date})`);
        console.log(`  ${colors.dim}Commit:  ${entry.commit}${colors.reset}`);
        console.log(`  ${colors.dim}Author:  ${entry.author}${colors.reset}`);
        console.log(`  ${colors.dim}Message: ${entry.message}${colors.reset}`);
        console.log();
      }

      return this.success();
    });
  }
}
