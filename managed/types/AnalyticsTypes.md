# [[AnalyticsTypes]]

**Source**: `src/types/analytics/index.ts`

## Purpose

Type system for CLI usage analytics and tracking.

## Command Usage Event

Records single command execution:

See implementation: [[CommandUsageEvent]]

**Key Properties**:
- `command`: Command name
- `args`: Arguments
- `timestamp`: ISO timestamp
- `duration`: Milliseconds
- `success`: Succeeded?
- `error`: Error message (optional)
- `cwd`: Working directory
- `nodeVersion`: Node.js version
- `version`: TSDoc Edge version

## Usage Statistics

Aggregated analytics:

See implementation: [[UsageStatistics]]

**Key Properties**:
- `totalCommands`: Total number of commands
- `commandCounts`: Count per command type
- `avgDuration`: Average duration per command
- `successRate`: Success rate per command
- `firstUsed`: ISO timestamp
- `lastUsed`: ISO timestamp
- `totalDuration`: Milliseconds

## Analytics Config

Configuration for analytics collection:

See implementation: [[AnalyticsConfig]]

**Key Properties**:
- `enabled`: Enable/disable analytics
- `storagePath`: JSONL storage path
- `maxEvents`: Max events before cleanup
- `retentionDays`: Days to keep events

## Usage Report Options

Report generation parameters:

See implementation: [[UsageReportOptions]]

**Key Properties**:
- `startDate`: Filter from (optional)
- `endDate`: Filter to (optional)
- `groupBy`: Grouping period - 'day', 'week', or 'month'
- `includeErrors`: Show error details (optional)

## Daily Usage Summary

Per-day aggregation:

See implementation: [[DailyUsageSummary]]

**Key Properties**:
- `date`: YYYY-MM-DD format
- `totalCommands`: Total commands for the day
- `uniqueCommands`: Unique commands used
- `successRate`: Success rate (0-1)
- `avgDuration`: Average duration in milliseconds
- `topCommand`: Most used command

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

- [[UsageCommand]] → /home/user/tsdoc-edge/managed/commands/UsageCommand.md:35
- [[UsageCommand]] → /home/user/tsdoc-edge/managed/commands/UsageCommand.md:36
- [[UsageCommand]] → /home/user/tsdoc-edge/managed/commands/UsageCommand.md:37
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:64
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:65
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:66
- [[UsageTracker]] → /home/user/tsdoc-edge/managed/utilities/UsageTracker.md:102
- [[UsageTracker]] → /home/user/tsdoc-edge/managed/utilities/UsageTracker.md:103
- [[UsageTracker]] → /home/user/tsdoc-edge/managed/utilities/UsageTracker.md:104

