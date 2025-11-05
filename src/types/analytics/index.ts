/**
 * Analytics and usage tracking types
 * @packageDocumentation
 */

/**
 * CLI command usage event
 */
export interface CommandUsageEvent {
  /** Command name (e.g., "build", "analyze", "validate") */
  command: string;
  /** Command arguments */
  args: string[];
  /** Execution timestamp */
  timestamp: string;
  /** Execution duration in milliseconds */
  duration: number;
  /** Success or failure */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Working directory */
  cwd: string;
  /** Node version */
  nodeVersion: string;
  /** TSDoc Edge version */
  version: string;
}

/**
 * CLI usage statistics
 */
export interface UsageStatistics {
  /** Total commands executed */
  totalCommands: number;
  /** Commands by name */
  commandCounts: Record<string, number>;
  /** Average execution time by command */
  avgDuration: Record<string, number>;
  /** Success rate by command */
  successRate: Record<string, number>;
  /** First usage timestamp */
  firstUsed: string;
  /** Last usage timestamp */
  lastUsed: string;
  /** Total duration (milliseconds) */
  totalDuration: number;
}

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
  /** Enable analytics collection */
  enabled: boolean;
  /** Storage file path */
  storagePath: string;
  /** Maximum events to store */
  maxEvents: number;
  /** Auto-clean old events (days) */
  retentionDays: number;
}

/**
 * Usage report options
 */
export interface UsageReportOptions {
  /** Start date for report */
  startDate?: Date;
  /** End date for report */
  endDate?: Date;
  /** Group by time period */
  groupBy?: 'day' | 'week' | 'month';
  /** Include error details */
  includeErrors?: boolean;
}

/**
 * Daily usage summary
 */
export interface DailyUsageSummary {
  /** Date (YYYY-MM-DD) */
  date: string;
  /** Total commands */
  totalCommands: number;
  /** Unique commands used */
  uniqueCommands: number;
  /** Success rate */
  successRate: number;
  /** Average duration */
  avgDuration: number;
  /** Most used command */
  topCommand: string;
}
