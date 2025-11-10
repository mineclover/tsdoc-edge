/**
 * Usage analytics command
 * @packageDocumentation
 */

import * as path from 'node:path';
import { UsageTracker } from '../analytics/UsageTracker';
import { BaseCommand, type CommandResult } from './BaseCommand';

/**
 * Command for viewing and managing CLI usage analytics
 *
 * @public
 * @responsibility Provide CLI interface for usage analytics
 * @contract Execute analytics operations and return results
 *
 * @problem Users need to understand their CLI usage patterns and diagnose issues
 * @solves Provides report, export, clear, and error viewing subcommands
 * @context Usage data helps optimize workflows and identify problem commands
 *
 * @functionality
 * - report: Display full analytics report
 * - export: Export analytics to JSON file
 * - clear: Clear all analytics data
 * - errors: Show recent command errors
 *
 * @decision Subcommands instead of separate commands
 * @rationale Related operations grouped under single namespace, consistent with git/npm patterns
 * @consequences Clearer command structure, easier discoverability
 *
 * @depends UsageTracker
 * @depType internal
 * @depReason Analytics data access and formatting
 */
export class UsageCommand extends BaseCommand {
  private tracker: UsageTracker;

  constructor(tracker?: UsageTracker) {
    super();
    this.tracker = tracker || new UsageTracker();
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'usage';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'View and manage CLI usage analytics';
  }

  protected getUsage(): string {
    return `tsdoc-edge usage [subcommand]

  Subcommands:
    report          Show usage analytics report (default)
    export [file]   Export analytics to JSON
    clear           Clear all analytics data
    errors          Show recent command errors`;
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

      this.printHeader('TSDoc Edge - Usage Analytics');

      const subCommand = args[0];

      switch (subCommand) {
        case 'report':
        case undefined:
          return this.showReport();

        case 'export':
          return this.exportData(args[1]);

        case 'clear':
          return this.clearData();

        case 'errors':
          return this.showErrors();

        case 'help':
          return this.showHelp();

        default:
          this.printError(`Unknown subcommand: ${subCommand}`);
          console.log();
          console.log('Run "tsdoc-edge usage help" for available commands');
          console.log();
          return this.failure(`Unknown subcommand: ${subCommand}`);
      }
    });
  }

  /**
   * Show full analytics report
   */
  private showReport(): CommandResult {
    const report = this.tracker.formatReport();
    console.log(report);
    return this.success();
  }

  /**
   * Export analytics data to JSON
   *
   * @param outputPath - Optional output path
   */
  private exportData(outputPath?: string): CommandResult {
    const path = outputPath || 'usage-analytics.json';
    const success = this.tracker.exportToJSON(path);

    if (success) {
      this.printSuccess(`Analytics exported to: ${this.colors.cyan}${path}${this.colors.reset}`);
      return this.success(`Exported to ${path}`);
    }

    this.printError('Failed to export analytics');
    return this.failure('Export failed');
  }

  /**
   * Clear all analytics data
   */
  private clearData(): CommandResult {
    const success = this.tracker.clear();

    if (success) {
      this.printSuccess('Analytics data cleared');
      return this.success('Data cleared');
    }

    this.printError('Failed to clear analytics');
    return this.failure('Clear failed');
  }

  /**
   * Show recent errors
   */
  private showErrors(): CommandResult {
    const errors = this.tracker.getRecentErrors(20);

    if (errors.length === 0) {
      this.printSuccess('No recent errors!');
      console.log();
      return this.success('No errors');
    }

    console.log(`${this.colors.bold}Recent Errors (${errors.length}):${this.colors.reset}\n`);

    for (const error of errors) {
      const date = new Date(error.timestamp).toLocaleString();
      console.log(`${this.colors.red}✗${this.colors.reset} ${this.colors.bold}${error.command}${this.colors.reset} (${date})`);
      console.log(`  ${this.colors.dim}${error.cwd}${this.colors.reset}`);

      if (error.error) {
        console.log(`  ${this.colors.red}${error.error.split('\n')[0]}${this.colors.reset}`);
      }
      console.log();
    }

    return this.success(`Found ${errors.length} errors`);
  }

  /**
   * Show help message
   */
  private showHelp(): CommandResult {
    console.log('Usage: tsdoc-edge usage [command]\n');
    console.log('Commands:');
    console.log('  report (default)  Show full usage analytics report');
    console.log('  export [path]     Export analytics to JSON file');
    console.log('  clear             Clear all analytics data');
    console.log('  errors            Show recent command errors');
    console.log('  help              Show this help message');
    console.log();

    return this.success();
  }

  private get colors() {
    return {
      reset: '\x1b[0m',
      bold: '\x1b[1m',
      dim: '\x1b[2m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m',
      red: '\x1b[31m',
    };
  }
}
