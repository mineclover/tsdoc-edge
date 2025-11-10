# [[UsageTracker]]

**Source**: `src/analytics/UsageTracker.ts`

## Purpose

Track CLI command usage for analytics and optimization, privacy-first.

## Tracked Events

Each command execution records:
- Command name and arguments
- Execution duration
- Success/failure status
- Error messages (if any)
- Timestamp
- System context (Node version, cwd)

## Storage Strategy

### JSONL Format

Events stored as JSON Lines:
```jsonl
{"command":"build","args":["src"],"duration":2341,"success":true,"timestamp":"2025-11-09T12:00:00.000Z"}
{"command":"validate","args":[],"duration":543,"success":true,"timestamp":"2025-11-09T12:05:00.000Z"}
```

**Why JSONL:**
- Human-readable
- Git-friendly (line-by-line diffs)
- No schema migrations
- Easy to parse incrementally

### Local-Only Storage

- Storage path: `~/.tsdoc-edge/analytics/`
- No external transmission
- User controls data retention
- Can be disabled completely

## Usage Statistics

### Aggregated Metrics

- Total commands executed
- Commands by frequency
- Success/failure rates
- Average execution duration
- Slowest commands
- Most common errors

### Daily Summaries

```typescript
{
  date: "2025-11-09",
  totalCommands: 42,
  uniqueCommands: 8,
  successRate: 0.95,
  avgDuration: 1234,
  topCommands: ["build", "validate", "index-docs"]
}
```

## Configuration

```typescript
const tracker = new UsageTracker({
  enabled: true,           // Toggle analytics
  storagePath: "~/.tsdoc-edge/analytics",
  maxEvents: 10000,        // Auto-cleanup threshold
  retentionDays: 90        // Delete older events
});
```

## Auto-Cleanup

Automatically removes:
- Events older than retention period (90 days)
- Excess events beyond maxEvents limit
- Keeps most recent events

## Privacy Design

- All data stored locally
- No network transmission
- No personally identifiable information
- User can inspect/delete data anytime
- Can be disabled via config

## Usage

```bash
# View usage statistics
tsdoc-edge usage

# Disable analytics
tsdoc-edge config set analytics.enabled false
```

## Symbol Count

1 class, 5 interfaces

## Related

- [[UsageCommand]]: Display usage statistics
- [[ConfigManager]]: Analytics configuration
- [[StatsCommand]]: Codebase statistics

---

## Backlinks

### Referenced By

- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:36
- [[AnalyticsTypes]] → /home/user/tsdoc-edge/managed/types/AnalyticsTypes.md:59

