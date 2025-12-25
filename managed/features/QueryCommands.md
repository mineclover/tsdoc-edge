---
title: QueryCommands
type: feature
category: feature
status: active
canonical: true
---

# [[QueryCommands]]

**Phase 5 Commands**: Symbol queries and graph analysis

## Purpose

Provide command-line tools for querying symbol relationships, dependencies, and graph structure.

## Category

Command Group (Phase 5)

## Commands

### Dependency Queries

#### [[DepsCommand]]
```bash
tsdoc-edge deps <symbol-id>
```
Show forward dependencies (what the symbol uses).

#### [[UsedByCommand]]
```bash
tsdoc-edge used-by <symbol-id>
```
Show reverse dependencies (what uses the symbol) - registry-based.

#### [[WhoUsesCommand]]
```bash
tsdoc-edge who-uses <symbol-name>
```
Show reverse dependencies (what uses the symbol) - database-based, name search.

### Analysis Queries

#### [[OrphansCommand]]
```bash
tsdoc-edge orphans
```
Find symbols with no dependencies or usages (potential dead code).

#### [[StatsCommand]]
```bash
tsdoc-edge stats [--compare <snapshot>] [--save <snapshot>]
```
Documentation statistics with historical comparison.

#### [[UndocumentedCommand]]
```bash
tsdoc-edge undocumented
```
Find symbols without TSDoc comments.

#### [[UntestedCommand]]
```bash
tsdoc-edge untested
```
Find symbols without test coverage.

## Design Pattern

All query commands follow a consistent pattern:

1. **Registry/Database Access**: Fast data retrieval
2. **Filtering**: Optional query refinement
3. **Formatting**: Consistent output format
4. **Performance**: O(1) or O(log n) lookups where possible

## Data Sources

### Registry-based (Fast)
- **DepsCommand**: JSONL registry
- **UsedByCommand**: JSONL registry
- Uses symbol ID for exact matching

### Database-based (Flexible)
- **WhoUsesCommand**: SQLite database
- Uses symbol name for pattern matching
- Supports fuzzy search

## Common Workflows

### Impact Analysis
```bash
# Before modifying a symbol, check its usage
tsdoc-edge used-by database-manager

# Find who depends on it
tsdoc-edge who-uses DatabaseManager
```

### Dead Code Detection
```bash
# Find orphaned symbols
tsdoc-edge orphans

# Check if specific symbol is used
tsdoc-edge used-by old-utility
```

### Documentation Health
```bash
# Get current stats
tsdoc-edge stats

# Compare with baseline
tsdoc-edge stats --compare baseline

# Find undocumented symbols
tsdoc-edge undocumented
```

## Related

- [[Phase Commands]]: Source file (`src/commands/Phase5Commands.ts`)
- SymbolRegistryManager: Registry data access
- DatabaseManager: Database queries
- [[SymbolGraphBuilder]]: Graph construction

## Performance

| Command | Complexity | Data Source |
|---------|-----------|-------------|
| deps | O(1) | Registry |
| used-by | O(1) | Registry |
| who-uses | O(log n) | Database |
| orphans | O(n) | Registry |
| stats | O(n) | Registry + DB |
| undocumented | O(n) | Database |
| untested | O(n) | Database |

## Use Cases

### 1. Pre-Refactoring Analysis
Check impact before changing code:
```bash
tsdoc-edge used-by symbol-id
tsdoc-edge who-uses SymbolName
```

### 2. Code Cleanup
Identify removal candidates:
```bash
tsdoc-edge orphans
tsdoc-edge untested
```

### 3. Documentation Improvement
Track documentation completeness:
```bash
tsdoc-edge stats --save before-sprint
# ... improve docs ...
tsdoc-edge stats --compare before-sprint
```

### 4. CI/CD Integration
Enforce quality gates:
```bash
# Fail build if undocumented symbols increase
tsdoc-edge undocumented | wc -l
```

---

## Backlinks

### Referenced By

- [[Dependency Analysis]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/DependencyAnalysis.md:140
- [[Impact Analysis]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/ImpactAnalysis.md:153
- [[Features Index]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/index.md:200

