/**
 * Analytics module exports
 *
 * @packageDocumentation
 * @doc [[AnalyticsTypes]]
 * @doc [[Analyzer System]]
 * @context Public barrel surface for local CLI usage telemetry types and `UsageTracker`
 * @functionality Re-exports `UsageTracker` and analytics configuration, event, and report types
 */

export type {
  AnalyticsConfig,
  CommandUsageEvent,
  DailyUsageSummary,
  UsageReportOptions,
  UsageStatistics,
} from '../types/analytics';
export { UsageTracker } from './UsageTracker';
