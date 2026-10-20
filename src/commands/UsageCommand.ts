/**
 * Usage analytics command
 * @packageDocumentation
 */

import { UsageTracker } from '../analytics/UsageTracker';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * Command for viewing and managing CLI usage analytics
 *
 * @doc [[UsageCommand]]
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

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge usage [subcommand] [options]

  Subcommands:
    report          Show usage analytics report (default)
    export [file]   Export analytics to JSON
    clear           Clear all analytics data
    errors          Show recent command errors

  Options:
    --human         Output in human-readable format (default: XML)`;
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

      const isHuman = this.hasFlag(args, '--human');
      if (isHuman) {
        this.printHeader('TSDoc Edge - Usage Analytics');
      }

      // --human is a mode switch, not part of the subcommand grammar
      const commandArgs = args.filter((arg) => arg !== '--human');
      const subCommand = commandArgs[0];

      switch (subCommand) {
        case 'report':
        case undefined:
          return this.showReport(args);

        case 'export':
          return this.exportData(commandArgs[1], args);

        case 'clear':
          return this.clearData(args);

        case 'errors':
          return this.showErrors(args);

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
  private showReport(args: string[]): CommandResult {
    if (this.hasFlag(args, '--human')) {
      const report = this.tracker.formatReport();
      console.log(report);
      return this.success();
    }

    const stats = this.tracker.getStatistics();
    const round = (value: number, digits: number): number => {
      const factor = 10 ** digits;
      return Math.round(value * factor) / factor;
    };

    this.printOutput(
      'usage-report',
      {
        statistics: {
          totalCommands: stats.totalCommands,
          firstUsed: stats.firstUsed,
          lastUsed: stats.lastUsed,
          totalDurationMs: stats.totalDuration,
        },
        topCommands: this.tracker.getTopCommands(10).map((entry) => ({
          command: entry.command,
          count: entry.count,
          percent: round(entry.percentage, 1),
        })),
        commandMetrics: Object.entries(stats.commandCounts)
          .sort(([nameA, countA], [nameB, countB]) => countB - countA || nameA.localeCompare(nameB))
          .map(([command, count]) => ({
            command,
            count,
            avgDurationMs: round(stats.avgDuration[command] ?? 0, 2),
            successRate: round(stats.successRate[command] ?? 0, 1),
          })),
        dailySummaries: this.tracker.getDailySummaries().map((summary) => ({
          date: summary.date,
          totalCommands: summary.totalCommands,
          uniqueCommands: summary.uniqueCommands,
          successRate: round(summary.successRate, 1),
          avgDurationMs: round(summary.avgDuration, 2),
          topCommand: summary.topCommand,
        })),
        recentErrors: this.tracker.getRecentErrors(5).map((event) => ({
          timestamp: event.timestamp,
          command: event.command,
          error: event.error ?? '',
        })),
      },
      args
    );
    return this.success();
  }

  /**
   * Export analytics data to JSON
   *
   * @param outputPath - Optional output path
   */
  private exportData(outputPath: string | undefined, args: string[]): CommandResult {
    const path = outputPath || 'usage-analytics.json';
    const success = this.tracker.exportToJSON(path);

    if (success) {
      if (this.hasFlag(args, '--human')) {
        this.printSuccess(`Analytics exported to: ${colors.cyan}${path}${colors.reset}`);
      } else {
        this.printOutput('usage-export', { export: { path, exported: true } }, args);
      }
      return this.success(`Exported to ${path}`);
    }

    this.printError('Failed to export analytics');
    return this.failure('Export failed');
  }

  /**
   * Clear all analytics data
   */
  private clearData(args: string[]): CommandResult {
    const success = this.tracker.clear();

    if (success) {
      if (this.hasFlag(args, '--human')) {
        this.printSuccess('Analytics data cleared');
      } else {
        this.printOutput('usage-clear', { clear: { cleared: true } }, args);
      }
      return this.success('Data cleared');
    }

    this.printError('Failed to clear analytics');
    return this.failure('Clear failed');
  }

  /**
   * Show recent errors
   */
  private showErrors(args: string[]): CommandResult {
    const errors = this.tracker.getRecentErrors(20);

    if (!this.hasFlag(args, '--human')) {
      this.printOutput(
        'usage-errors',
        {
          summary: { count: errors.length },
          errors: errors.map((event) => ({
            timestamp: event.timestamp,
            command: event.command,
            cwd: event.cwd,
            error: event.error ?? '',
          })),
        },
        args
      );
      return errors.length === 0
        ? this.success('No errors')
        : this.success(`Found ${errors.length} errors`);
    }

    if (errors.length === 0) {
      this.printSuccess('No recent errors!');
      console.log();
      return this.success('No errors');
    }

    console.log(`${colors.bold}Recent Errors (${errors.length}):${colors.reset}\n`);

    for (const error of errors) {
      const date = new Date(error.timestamp).toLocaleString();
      console.log(
        `${colors.red}✗${colors.reset} ${colors.bold}${error.command}${colors.reset} (${date})`
      );
      console.log(`  ${colors.dim}${error.cwd}${colors.reset}`);

      if (error.error) {
        console.log(`  ${colors.red}${error.error.split('\n')[0]}${colors.reset}`);
      }
      console.log();
    }

    return this.success(`Found ${errors.length} errors`);
  }

  /**
   * Show help message
   */
  private showHelp(): CommandResult {
    console.log('Usage: tsdoc-edge usage [command] [options]\n');
    console.log('Commands:');
    console.log('  report (default)  Show full usage analytics report');
    console.log('  export [path]     Export analytics to JSON file');
    console.log('  clear             Clear all analytics data');
    console.log('  errors            Show recent command errors');
    console.log('  help              Show this help message');
    console.log('\nOptions:');
    console.log('  --human           Output in human-readable format (default: XML)');
    console.log();

    return this.success();
  }
}
