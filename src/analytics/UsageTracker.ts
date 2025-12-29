/**
 * CLI usage analytics tracker
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type {
  AnalyticsConfig,
  CommandUsageEvent,
  DailyUsageSummary,
  UsageReportOptions,
  UsageStatistics,
} from '../types/analytics';

/**
 * Tracks CLI command usage for analytics and optimization
 *
 * @public
 * @responsibility Collect and analyze CLI usage patterns
 * @contract Record command executions and provide usage statistics
 *
 * @problem Need to understand which CLI commands are used most frequently and where performance issues occur
 * @solves Lightweight event logging with JSONL storage and aggregation capabilities
 * @context Product decisions and optimization priorities require usage data, but users value privacy
 *
 * @functionality
 * - Event recording: Track command, args, duration, success/failure
 * - Statistics aggregation: Calculate usage counts, success rates, avg duration
 * - Report generation: Daily summaries, top commands, error analysis
 * - Auto-cleanup: Remove events older than retention period
 * - Privacy-first: Local-only storage, no external transmission
 *
 * @decision Store events as JSONL instead of structured database
 * @rationale Human-readable, Git-friendly, no schema migrations, easy to parse line-by-line
 * @consequences Simple implementation, but aggregation requires full file scan
 *
 * @depends fs, path, os
 * @depType external
 * @depReason File I/O for JSONL storage and system info
 */
export class UsageTracker {
  private config: AnalyticsConfig;
  private eventsPath: string;
  private eventCount: number = 0;
  private lastCleanupCheck: number = 0;
  private static readonly CLEANUP_CHECK_INTERVAL = 100; // Check every 100 events

  /**
   * Create a new UsageTracker
   *
   * @param config - Analytics configuration (optional)
   */
  constructor(config?: Partial<AnalyticsConfig>) {
    const defaultConfig: AnalyticsConfig = {
      enabled: true,
      storagePath: path.join(os.homedir(), '.tsdoc-edge', 'analytics'),
      maxEvents: 10000,
      retentionDays: 90,
    };

    this.config = { ...defaultConfig, ...config };
    this.eventsPath = path.join(this.config.storagePath, 'events.jsonl');

    // Ensure storage directory exists
    if (this.config.enabled) {
      this.ensureStorageDir();
      // Estimate current event count from file size (avg ~200 bytes per event)
      this.eventCount = this.estimateEventCount();
    }
  }

  /**
   * Estimate event count from file size (avoids full file read)
   */
  private estimateEventCount(): number {
    try {
      if (!fs.existsSync(this.eventsPath)) return 0;
      const stats = fs.statSync(this.eventsPath);
      // Estimate ~200 bytes per event line
      return Math.floor(stats.size / 200);
    } catch {
      return 0;
    }
  }

  /**
   * Ensure storage directory exists
   */
  private ensureStorageDir(): void {
    if (!fs.existsSync(this.config.storagePath)) {
      fs.mkdirSync(this.config.storagePath, { recursive: true });
    }
  }

  /**
   * Record a command usage event
   *
   * @param event - Command usage event
   * @returns True if recorded successfully
   */
  recordEvent(event: CommandUsageEvent): boolean {
    if (!this.config.enabled) {
      return false;
    }

    try {
      const line = JSON.stringify(event) + '\n';
      fs.appendFileSync(this.eventsPath, line, 'utf-8');
      this.eventCount++;

      // Only check cleanup every CLEANUP_CHECK_INTERVAL events
      if (this.eventCount - this.lastCleanupCheck >= UsageTracker.CLEANUP_CHECK_INTERVAL) {
        this.lastCleanupCheck = this.eventCount;
        this.autoCleanup();
      }

      return true;
    } catch {
      // Silent fail - analytics should never break CLI functionality
      return false;
    }
  }

  /**
   * Get all recorded events
   *
   * @param options - Filter options
   * @returns Array of events
   */
  getEvents(options?: UsageReportOptions): CommandUsageEvent[] {
    if (!fs.existsSync(this.eventsPath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(this.eventsPath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      let events = lines.map((line) => JSON.parse(line) as CommandUsageEvent);

      // Apply filters
      if (options?.startDate) {
        events = events.filter((e) => new Date(e.timestamp) >= options.startDate!);
      }

      if (options?.endDate) {
        events = events.filter((e) => new Date(e.timestamp) <= options.endDate!);
      }

      return events;
    } catch {
      // Return empty array on read errors - analytics data is non-critical
      return [];
    }
  }

  /**
   * Calculate usage statistics
   *
   * @param options - Report options
   * @returns Usage statistics
   */
  getStatistics(options?: UsageReportOptions): UsageStatistics {
    const events = this.getEvents(options);

    if (events.length === 0) {
      return {
        totalCommands: 0,
        commandCounts: {},
        avgDuration: {},
        successRate: {},
        firstUsed: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        totalDuration: 0,
      };
    }

    const commandCounts: Record<string, number> = {};
    const commandDurations: Record<string, number[]> = {};
    const commandSuccess: Record<string, { success: number; total: number }> = {};

    let totalDuration = 0;
    let firstUsed = events[0].timestamp;
    let lastUsed = events[0].timestamp;

    for (const event of events) {
      // Count
      commandCounts[event.command] = (commandCounts[event.command] || 0) + 1;

      // Duration
      if (!commandDurations[event.command]) {
        commandDurations[event.command] = [];
      }
      commandDurations[event.command].push(event.duration);
      totalDuration += event.duration;

      // Success rate
      if (!commandSuccess[event.command]) {
        commandSuccess[event.command] = { success: 0, total: 0 };
      }
      commandSuccess[event.command].total++;
      if (event.success) {
        commandSuccess[event.command].success++;
      }

      // Timestamps
      if (event.timestamp < firstUsed) {
        firstUsed = event.timestamp;
      }
      if (event.timestamp > lastUsed) {
        lastUsed = event.timestamp;
      }
    }

    // Calculate averages
    const avgDuration: Record<string, number> = {};
    for (const [command, durations] of Object.entries(commandDurations)) {
      const sum = durations.reduce((a, b) => a + b, 0);
      avgDuration[command] = sum / durations.length;
    }

    const successRate: Record<string, number> = {};
    for (const [command, stats] of Object.entries(commandSuccess)) {
      successRate[command] = (stats.success / stats.total) * 100;
    }

    return {
      totalCommands: events.length,
      commandCounts,
      avgDuration,
      successRate,
      firstUsed,
      lastUsed,
      totalDuration,
    };
  }

  /**
   * Generate daily usage summaries
   *
   * @param options - Report options
   * @returns Daily summaries
   */
  getDailySummaries(options?: UsageReportOptions): DailyUsageSummary[] {
    const events = this.getEvents(options);

    // Group by date
    const dayGroups = new Map<string, CommandUsageEvent[]>();

    for (const event of events) {
      const date = event.timestamp.split('T')[0];
      if (!dayGroups.has(date)) {
        dayGroups.set(date, []);
      }
      dayGroups.get(date)!.push(event);
    }

    // Calculate daily summaries
    const summaries: DailyUsageSummary[] = [];

    for (const [date, dayEvents] of dayGroups.entries()) {
      const uniqueCommands = new Set(dayEvents.map((e) => e.command)).size;
      const successCount = dayEvents.filter((e) => e.success).length;
      const successRate = (successCount / dayEvents.length) * 100;
      const avgDuration =
        dayEvents.reduce((sum, e) => sum + e.duration, 0) / dayEvents.length;

      // Find top command
      const commandCounts: Record<string, number> = {};
      for (const event of dayEvents) {
        commandCounts[event.command] = (commandCounts[event.command] || 0) + 1;
      }
      const topCommand = Object.entries(commandCounts).sort(
        ([, a], [, b]) => b - a
      )[0][0];

      summaries.push({
        date,
        totalCommands: dayEvents.length,
        uniqueCommands,
        successRate,
        avgDuration,
        topCommand,
      });
    }

    return summaries.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get top N most used commands
   *
   * @param limit - Number of commands to return
   * @returns Top commands with counts
   */
  getTopCommands(limit = 10): Array<{ command: string; count: number; percentage: number }> {
    const stats = this.getStatistics();

    const sorted = Object.entries(stats.commandCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit);

    return sorted.map(([command, count]) => ({
      command,
      count,
      percentage: (count / stats.totalCommands) * 100,
    }));
  }

  /**
   * Get commands with errors
   *
   * @param limit - Number of errors to return
   * @returns Recent errors
   */
  getRecentErrors(limit = 20): CommandUsageEvent[] {
    const events = this.getEvents();
    return events
      .filter((e) => !e.success)
      .reverse()
      .slice(0, limit);
  }

  /**
   * Auto-cleanup old events (only runs if file size indicates excess)
   */
  private autoCleanup(): void {
    try {
      // Quick check using estimated count - avoid file read if not needed
      const estimatedCount = this.estimateEventCount();
      if (estimatedCount <= this.config.maxEvents) {
        return;
      }

      // Only now load events (expensive operation)
      const events = this.getEvents();

      // Double-check with actual count
      if (events.length <= this.config.maxEvents) {
        this.eventCount = events.length; // Sync estimate
        return;
      }

      // Remove old events
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      const filtered = events.filter((e) => new Date(e.timestamp) >= cutoffDate);

      // If still too many, keep only latest maxEvents
      const toKeep =
        filtered.length > this.config.maxEvents
          ? filtered.slice(-this.config.maxEvents)
          : filtered;

      // Rewrite file
      const content = toKeep.map((e) => JSON.stringify(e)).join('\n') + '\n';
      fs.writeFileSync(this.eventsPath, content, 'utf-8');

      // Update count after cleanup
      this.eventCount = toKeep.length;
    } catch {
      // Cleanup failure is not critical - will try again on next interval
    }
  }

  /**
   * Clear all analytics data
   *
   * @returns True if cleared successfully
   */
  clear(): boolean {
    try {
      if (fs.existsSync(this.eventsPath)) {
        fs.unlinkSync(this.eventsPath);
      }
      return true;
    } catch {
      // Silent fail - return false to indicate failure
      return false;
    }
  }

  /**
   * Export analytics data to JSON
   *
   * @param outputPath - Output file path
   * @returns True if exported successfully
   */
  exportToJSON(outputPath: string): boolean {
    try {
      const events = this.getEvents();
      const stats = this.getStatistics();
      const summaries = this.getDailySummaries();
      const topCommands = this.getTopCommands();

      const exportData = {
        exportDate: new Date().toISOString(),
        statistics: stats,
        dailySummaries: summaries,
        topCommands,
        recentEvents: events.slice(-100), // Last 100 events
      };

      fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2), 'utf-8');
      return true;
    } catch {
      // Export failure - return false to indicate failure
      return false;
    }
  }

  /**
   * Format statistics as human-readable report
   *
   * @returns Formatted report string
   */
  formatReport(): string {
    const stats = this.getStatistics();
    const topCommands = this.getTopCommands(10);
    const recentErrors = this.getRecentErrors(5);

    let report = '';

    report += '═'.repeat(80) + '\n';
    report += '                     TSDoc Edge - Usage Analytics Report\n';
    report += '═'.repeat(80) + '\n\n';

    // Overview
    report += '📊 OVERVIEW\n';
    report += '─'.repeat(80) + '\n';
    report += `Total Commands: ${stats.totalCommands}\n`;
    report += `First Used: ${new Date(stats.firstUsed).toLocaleString()}\n`;
    report += `Last Used: ${new Date(stats.lastUsed).toLocaleString()}\n`;
    report += `Total Duration: ${(stats.totalDuration / 1000).toFixed(2)}s\n\n`;

    // Top commands
    report += '🏆 TOP COMMANDS\n';
    report += '─'.repeat(80) + '\n';
    for (const { command, count, percentage } of topCommands) {
      const bar = '█'.repeat(Math.floor(percentage / 2));
      report += `  ${command.padEnd(20)} ${count.toString().padStart(5)} (${percentage.toFixed(1)}%) ${bar}\n`;
    }
    report += '\n';

    // Performance
    report += '⚡ PERFORMANCE\n';
    report += '─'.repeat(80) + '\n';
    const sortedByDuration = Object.entries(stats.avgDuration)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    for (const [command, duration] of sortedByDuration) {
      report += `  ${command.padEnd(20)} ${(duration / 1000).toFixed(2)}s avg\n`;
    }
    report += '\n';

    // Success rates
    report += '✓ SUCCESS RATES\n';
    report += '─'.repeat(80) + '\n';
    const sortedBySuccess = Object.entries(stats.successRate)
      .filter(([cmd]) => stats.commandCounts[cmd] >= 3) // Min 3 uses
      .sort(([, a], [, b]) => a - b)
      .slice(0, 5);

    for (const [command, rate] of sortedBySuccess) {
      const icon = rate >= 95 ? '✓' : rate >= 80 ? '⚠' : '✗';
      report += `  ${icon} ${command.padEnd(20)} ${rate.toFixed(1)}%\n`;
    }
    report += '\n';

    // Recent errors
    if (recentErrors.length > 0) {
      report += '❌ RECENT ERRORS\n';
      report += '─'.repeat(80) + '\n';
      for (const error of recentErrors.slice(0, 5)) {
        const date = new Date(error.timestamp).toLocaleString();
        report += `  ${error.command} (${date})\n`;
        if (error.error) {
          report += `    ${error.error.split('\n')[0]}\n`;
        }
      }
      report += '\n';
    }

    report += '═'.repeat(80) + '\n';

    return report;
  }
}
