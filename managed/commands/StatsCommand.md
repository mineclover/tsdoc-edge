# [[StatsCommand]]

Show documentation statistics with optional historical comparison.

## Purpose

Track documentation quality metrics over time, enabling measurement of codebase health improvements and regressions.

## Responsibility

- Collect current documentation statistics
- Compare with historical snapshots
- Identify trends (improvements vs regressions)
- Save snapshots for future comparison
- Display warnings for quality decreases

## Input

**Command Syntax:**
```bash
tsdoc-edge stats [options]
```

**Options:**
- `--compare <snapshot-name>`: Compare with a previous snapshot
- `--save <snapshot-name>`: Save current stats as a snapshot
- `--warnings-only`: Show only regressions
- `--list-snapshots`: List all available snapshots

**Preconditions:**
- Database must be built (`.tsdoc/symbols.db`)

## Output

**Basic Stats:**
```
Documentation Statistics

Total Symbols: 1,127
Documented: 921 (82%)
Public Symbols: 450
Undocumented Public: 85 (19%)

Documentation Quality: 69/100
Test Coverage: 40/100
Overall Health: D (56/100)

Coverage by Type:
  Classes: 95%
  Functions: 78%
  Interfaces: 88%
  Types: 72%
```

**With Comparison:**
```
Documentation Statistics (comparing with baseline)

Total Symbols: 1,127 (+15 from baseline)
Documented: 921 (82%) [+2% ⬆]
Public Symbols: 450 (+8)
Undocumented Public: 85 (19%) [-1% ⬆]

Documentation Quality: 69/100 [+5 ⬆]
Test Coverage: 40/100 [-3 ⬇ WARNING]
Overall Health: D (56/100) [+2 ⬆]

Trends:
  ✅ Documentation coverage improved
  ⚠️  Test coverage decreased
  ✅ Overall health improved
```

**Warnings Only:**
```
Regressions Detected:

⚠️  Test Coverage: 40% (-3% from baseline)
⚠️  Undocumented Functions: 85 (+5 from baseline)
```

## Context

### Dependencies

- **[[DatabaseManager]]** (internal): Symbol data access
- **[[TrackableStatsCollector]]**: Stats collection
- **[[StatsHistoryManager]]**: Snapshot storage and retrieval
- **[[StatsComparator]]**: Historical comparison
- **[[BaseCommand]]**: Command infrastructure

### Used By

- Quality tracking workflows
- CI/CD quality gates
- Development metrics dashboards
- Regression detection

### Tracked Metrics

**Symbol Metrics:**
- Total symbols count
- Documented symbols
- Public symbols
- Undocumented public symbols

**Quality Scores:**
- Documentation quality (0-100)
- Test coverage percentage
- Overall health grade (A-F)

**Type Breakdown:**
- Classes coverage
- Functions coverage
- Interfaces coverage
- Types coverage
- Enums coverage

## Logic

```mermaid
graph TD
    A[Start] --> B{Database Exists?}
    B -->|No| C[Error: Database not found]
    B -->|Yes| D[Load Database]
    D --> E[Collect Current Stats]
    E --> F{--compare flag?}
    F -->|No| G[Display Current Stats]
    F -->|Yes| H[Load Snapshot]
    H --> I{Snapshot Found?}
    I -->|No| J[Error: Snapshot not found]
    I -->|Yes| K[Compare Stats]
    K --> L{--warnings-only?}
    L -->|Yes| M[Show Only Regressions]
    L -->|No| N[Show Full Comparison]
    N --> O{--save flag?}
    M --> O
    G --> O
    O -->|Yes| P[Save Snapshot]
    O -->|No| Q[Success]
    P --> Q
```

### Algorithm

1. **Validation Phase:**
   - Check for help flag
   - Verify database file exists
   - Parse command options

2. **Collection Phase:**
   - Use TrackableStatsCollector
   - Query database for symbol counts
   - Calculate coverage percentages
   - Compute quality scores

3. **Comparison Phase (if --compare):**
   - Load StatsHistoryManager
   - Retrieve named snapshot
   - Use StatsComparator for diff
   - Calculate trends

4. **Display Phase:**
   - Show current metrics
   - Show comparison (if applicable)
   - Highlight improvements (⬆) and regressions (⬇)
   - Filter to warnings only (if --warnings-only)

5. **Save Phase (if --save):**
   - Store current stats with timestamp
   - Save to history file

## Effects

**Side Effects:**
- May write snapshot file if `--save` used
- Reads historical data from `.tsdoc/stats-history.jsonl`

**Performance:**
- O(n) where n = total symbols in database
- Snapshot operations: O(1) file write

**Storage:**
- Each snapshot: ~500 bytes
- History file grows with snapshots

## Scope

**Public API:**
- Command name: `stats`
- Exported from Phase7Commands

**Usage:**
```bash
# Show current stats
tsdoc-edge stats

# Save baseline snapshot
tsdoc-edge stats --save baseline

# Compare with baseline
tsdoc-edge stats --compare baseline

# CI mode: fail on regressions
tsdoc-edge stats --compare baseline --warnings-only

# List all snapshots
tsdoc-edge stats --list-snapshots

# Save and compare in one command
tsdoc-edge stats --compare baseline --save current
```

## Related

- [[HealthCommand]]: Overall codebase health check
- [[TrackableStatsCollector]]: Stats collection engine
- [[StatsHistoryManager]]: Snapshot management
- [[StatsComparator]]: Comparison logic
- [[ValidateCommand]]: Documentation validation

## Implementation

Source: `src/commands/Phase7Commands.ts`

**Key Design Decisions:**
- Snapshot-based comparison for flexibility
- Named snapshots for multiple baseline tracking
- Warnings-only mode for CI integration
- Trend indicators for quick insights

**Alternatives Considered:**
- Git-based comparison: Too coupled to version control
- Always auto-save: Pollutes history with every run
- Only latest comparison: Less flexible for multi-branch workflows

**CI Integration:**
```bash
# In CI pipeline
tsdoc-edge stats --compare main-branch --warnings-only
if [ $? -ne 0 ]; then
  echo "Quality regression detected"
  exit 1
fi
```

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:60
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:223
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:409
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:410
- [[StatsComparator]] → /home/user/tsdoc-edge/managed/analyzers/StatsComparator.md:33
- [[StatsComparator]] → /home/user/tsdoc-edge/managed/analyzers/StatsComparator.md:34
- [[StatsComparator]] → /home/user/tsdoc-edge/managed/analyzers/StatsComparator.md:35
- [[StatsComparator]] → /home/user/tsdoc-edge/managed/analyzers/StatsComparator.md:36
- [[StatsHistoryManager]] → /home/user/tsdoc-edge/managed/analyzers/StatsHistoryManager.md:38
- [[StatsHistoryManager]] → /home/user/tsdoc-edge/managed/analyzers/StatsHistoryManager.md:39
- [[StatsHistoryManager]] → /home/user/tsdoc-edge/managed/analyzers/StatsHistoryManager.md:40
- [[StatsHistoryManager]] → /home/user/tsdoc-edge/managed/analyzers/StatsHistoryManager.md:41
- [[TrackableStatsCollector]] → /home/user/tsdoc-edge/managed/analyzers/TrackableStatsCollector.md:33
- [[TrackableStatsCollector]] → /home/user/tsdoc-edge/managed/analyzers/TrackableStatsCollector.md:34
- [[TrackableStatsCollector]] → /home/user/tsdoc-edge/managed/analyzers/TrackableStatsCollector.md:35
- [[TrackableStatsCollector]] → /home/user/tsdoc-edge/managed/analyzers/TrackableStatsCollector.md:36
- [[BaseCommand]] → /home/user/tsdoc-edge/managed/commands/BaseCommand.md:62
- [[BaseCommand]] → /home/user/tsdoc-edge/managed/commands/BaseCommand.md:63
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:57
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:58
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:39
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:40
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:74
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:163
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:164
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:116
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:254
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:255
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:256
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:257
- [[CI/CD Integration]] → /home/user/tsdoc-edge/managed/features/CICDIntegration.md:80
- [[CI/CD Integration]] → /home/user/tsdoc-edge/managed/features/CICDIntegration.md:102
- [[CI/CD Integration]] → /home/user/tsdoc-edge/managed/features/CICDIntegration.md:119
- [[CI/CD Integration]] → /home/user/tsdoc-edge/managed/features/CICDIntegration.md:120
- [[CI/CD Integration]] → /home/user/tsdoc-edge/managed/features/CICDIntegration.md:121
- [[CI/CD Integration]] → /home/user/tsdoc-edge/managed/features/CICDIntegration.md:122
- [[Dead Code Detection]] → /home/user/tsdoc-edge/managed/features/DeadCodeDetection.md:78
- [[Dead Code Detection]] → /home/user/tsdoc-edge/managed/features/DeadCodeDetection.md:137
- [[Dead Code Detection]] → /home/user/tsdoc-edge/managed/features/DeadCodeDetection.md:138
- [[QueryCommands]] → /home/user/tsdoc-edge/managed/features/QueryCommands.md:126
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:154
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:323
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:324
- [[CLI Command Development Guide]] → /home/user/tsdoc-edge/managed/guides/command-development-guide.md:31
- [[CLI Command Development Guide]] → /home/user/tsdoc-edge/managed/guides/command-development-guide.md:45
- [[CLI Command Development Guide]] → /home/user/tsdoc-edge/managed/guides/command-development-guide.md:238
- [[CLI Command Development Guide]] → /home/user/tsdoc-edge/managed/guides/command-development-guide.md:338
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:246
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:439
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:440
- [[TrackableStatistics]] → /home/user/tsdoc-edge/managed/primary-types/TrackableStatistics.md:84
- [[TrackableStatistics]] → /home/user/tsdoc-edge/managed/primary-types/TrackableStatistics.md:89
- [[TrackableStatistics]] → /home/user/tsdoc-edge/managed/primary-types/TrackableStatistics.md:138
- [[TrackableStatistics]] → /home/user/tsdoc-edge/managed/primary-types/TrackableStatistics.md:139
- [[TrackableStatistics]] → /home/user/tsdoc-edge/managed/primary-types/TrackableStatistics.md:140
- [[TrackableStatistics]] → /home/user/tsdoc-edge/managed/primary-types/TrackableStatistics.md:141
- [[UsageTracker]] → /home/user/tsdoc-edge/managed/utilities/UsageTracker.md:85
- [[UsageTracker]] → /home/user/tsdoc-edge/managed/utilities/UsageTracker.md:93
- [[UsageTracker]] → /home/user/tsdoc-edge/managed/utilities/UsageTracker.md:94

### Implemented By

- StatsCommand → /home/user/tsdoc-edge/src/commands/StatsCommand.ts:39

