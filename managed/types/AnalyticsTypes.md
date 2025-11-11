# [[AnalyticsTypes]]

**Source**: `src/types/analytics/index.ts`

## Purpose

Type system for CLI usage analytics and tracking.

## Command Usage Event

Records single command execution:
```typescript
interface CommandUsageEvent {
  command: string;         // Command name
  args: string[];          // Arguments
  timestamp: string;       // ISO timestamp
  duration: number;        // Milliseconds
  success: boolean;        // Succeeded?
  error?: string;          // Error message
  cwd: string;             // Working directory
  nodeVersion: string;     // Node.js version
  version: string;         // TSDoc Edge version
}
```

## Usage Statistics

Aggregated analytics:
```typescript
interface UsageStatistics {
  totalCommands: number;
  commandCounts: Record<string, number>;
  avgDuration: Record<string, number>;
  successRate: Record<string, number>;
  firstUsed: string;       // ISO timestamp
  lastUsed: string;        // ISO timestamp
  totalDuration: number;   // Milliseconds
}
```

## Analytics Config

Configuration for analytics collection:
```typescript
interface AnalyticsConfig {
  enabled: boolean;        // Enable/disable
  storagePath: string;     // JSONL storage path
  maxEvents: number;       // Max events before cleanup
  retentionDays: number;   // Days to keep events
}
```

## Usage Report Options

Report generation parameters:
```typescript
interface UsageReportOptions {
  startDate?: Date;        // Filter from
  endDate?: Date;          // Filter to
  groupBy?: 'day' | 'week' | 'month';
  includeErrors?: boolean; // Show error details
}
```

## Daily Usage Summary

Per-day aggregation:
```typescript
interface DailyUsageSummary {
  date: string;            // YYYY-MM-DD
  totalCommands: number;
  uniqueCommands: number;
  successRate: number;     // 0-1
  avgDuration: number;     // Milliseconds
  topCommand: string;      // Most used
}
```

## Usage Patterns

### Event Recording
```typescript
// After each command execution
const event: CommandUsageEvent = {
  command: 'build',
  args: ['src'],
  timestamp: new Date().toISOString(),
  duration: 2341,
  success: true,
  cwd: process.cwd(),
  nodeVersion: process.version,
  version: '1.0.0'
};
tracker.recordEvent(event);
```

### Statistics Query
```typescript
const stats = tracker.getStatistics();
console.log(`Total: ${stats.totalCommands}`);
console.log(`Most used: ${Object.keys(stats.commandCounts)[0]}`);
```

### Report Generation
```typescript
const report = tracker.generateReport({
  startDate: new Date('2025-11-01'),
  endDate: new Date('2025-11-30'),
  groupBy: 'day'
});
```

## Privacy Design

- All data stored locally
- No network transmission
- No PII collection
- User controls retention
- Can be disabled

## Symbol Count

5 interfaces

## Related

- [[UsageTracker]]: Analytics implementation
- [[UsageCommand]]: Display usage stats
- [[ConfigManager]]: Analytics configuration

---

## Backlinks

### Referenced By

- [[UsageCommand]] → /home/user/tsdoc-edge/managed/commands/UsageCommand.md:33
- [[UsageCommand]] → /home/user/tsdoc-edge/managed/commands/UsageCommand.md:34
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:52
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:53
- [[UsageTracker]] → /home/user/tsdoc-edge/managed/utilities/UsageTracker.md:98
- [[UsageTracker]] → /home/user/tsdoc-edge/managed/utilities/UsageTracker.md:99

