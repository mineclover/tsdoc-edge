---
title: Coverage Report Command
type: command
category: commands
status: active
canonical: true
---

# [[CoverageReportCommand]]

**Source**: `src/commands/CoverageReportCommand.ts`

## Purpose

Report real SSOT (Single Source of Truth) coverage based on `@doc` tags in source code. Measures actual code→docs links rather than docs→docs navigation completeness.

**Metric contract**: [[Coverage Metrics Contract]] / `documentation.symbol`.

이 명령의 coverage는 테스트 실행률(`execution.line|function|branch`)이나 테스트-심볼 관계
(`test.symbol`)를 의미하지 않는다. 기본 출력은 legacy `DatabaseManager`의 심볼 목록과
소스 `@doc` 태그를 사용한다. `--canonical-graph-db`를 지정하면 활성 ttsc graph revision에
`documentation.symbol` projection을 추가하고, revision·fingerprint·미매칭 수를 함께 출력한다.

## Problem

The explore-entrypoint metric shows misleading coverage (9.2%) because it only measures docs→docs navigation, not actual code documentation status.

## Solution

Analyze source code for `@doc [[Symbol]]` tags to determine true documentation coverage from code to documentation direction.

## Usage

```bash
# Full report with hierarchical view
tsdoc-edge coverage-report --hierarchical

# JSON output for CI/CD
tsdoc-edge coverage-report --hierarchical --json

# Basic coverage summary
tsdoc-edge coverage-report

# Add canonical documentation.symbol projection
tsdoc-edge coverage-report --canonical-graph-db .tsdoc/canonical-graph.db

# JSON report with canonical projection
tsdoc-edge coverage-report --json --canonical-graph-db .tsdoc/canonical-graph.db

# Inspect persisted source-identified reports without mutation
tsdoc-edge coverage-report list \
  --workspace <workspace-id> \
  --report-db .tsdoc/coverage-metrics.db --json

tsdoc-edge coverage-report read \
  --workspace <workspace-id> \
  --report-id <coverage-report-id> \
  --report-db .tsdoc/coverage-metrics.db --json
```

`list|read`는 `SyncCoverageCommand`가 저장한 immutable report를 read-only로 확인한다.
`list`는 workspace별 report pin만 반환하고, `read`는 exact source identity와 metric/file metric
payload를 반환한다. 두 연산 모두 report DB나 active pointer를 변경하지 않는다.

## Report Structure

### Overall Coverage
- Total symbols analyzed
- Documented symbols (with @doc tags)
- Coverage percentage

### By Category
- **Commands**: CLI command classes
- **Analyzers**: Analysis and extraction classes
- **Types**: TypeScript interfaces and types
- **Utilities**: Helper functions and utilities

### Undocumented Symbols
Lists symbols without `@doc` tags, prioritized by:
- **High**: Public API, commands, core analyzers
- **Medium**: Supporting analyzers, utilities
- **Low**: Internal helpers, private methods

## Implementation

### Detection Algorithm

```typescript
1. Load all symbols from database
2. For each symbol:
   a. Read source file
   b. Parse TSDoc comments
   c. Check for @doc tag
   d. Extract referenced [[Symbol]]
3. Categorize by symbol type
4. Calculate coverage by category
5. Generate report
```

### Categorization

```typescript
// Symbol categorization rules
if (filePath.includes('/commands/')) → 'commands'
if (filePath.includes('/analyzer/')) → 'analyzers'
if (symbolType === 'interface' || symbolType === 'type') → 'types'
else → 'utilities'
```

### Priority Ranking

```typescript
// High priority
- isExported && (isCommand || isAnalyzer)
- Public API with many dependencies

// Medium priority
- isExported && isUtility
- Supporting classes

// Low priority
- Internal helpers
- Private methods
```

## Output Format

### Terminal Output
```
================================================================================
Coverage Report - Hierarchical View
================================================================================

Overall Coverage
────────────────────────────────────────────────────────────────
  Total symbols: 1,511
  Documented: 1,511
  Coverage: 100.0%

By Category
────────────────────────────────────────────────────────────────
  Commands: 100.0% (45 / 45)
  Analyzers: 100.0% (28 / 28)
  Types: 100.0% (156 / 156)
  Utilities: 100.0% (1,282 / 1,282)

Undocumented Symbols (0)
────────────────────────────────────────────────────────────────
  (none)
```

### JSON Output
```json
{
  "overall": {
    "total": 1511,
    "documented": 1511,
    "coverage": 100.0
  },
  "byCategory": {
    "commands": { "total": 45, "documented": 45, "coverage": 100.0 },
    "analyzers": { "total": 28, "documented": 28, "coverage": 100.0 },
    "types": { "total": 156, "documented": 156, "coverage": 100.0 },
    "utilities": { "total": 1282, "documented": 1282, "coverage": 100.0 }
  },
  "undocumentedSymbols": []
}
```

## Hierarchical Mode

When `--hierarchical` flag is used:
- Counts file-level documentation
- Cascades coverage to all symbols in file
- More accurate for projects with file-level `@doc` tags

**Rationale**: If a file is documented with `@doc [[FileSymbol]]`, all symbols in that file are considered documented (hierarchical coverage).

**Example**:
```typescript
/**
 * CLI Runner
 * @doc [[CLI Runner]]
 */

// All symbols in this file are covered by [[CLI Runner]]
export class CommandRegistry { }
export class CommandExecutor { }
```

## Integration

### CI/CD Pipeline
```bash
# Run in CI
tsdoc-edge coverage-report --hierarchical --json > coverage.json

# Check threshold
coverage=$(jq '.overall.coverage' coverage.json)
if (( $(echo "$coverage < 90" | bc -l) )); then
  echo "Coverage below 90%: $coverage%"
  exit 1
fi
```

### Pre-commit Hook
```bash
# Ensure coverage doesn't decrease
tsdoc-edge coverage-report --hierarchical
```

### Documentation Workflow
```bash
# 1. Check current coverage
tsdoc-edge coverage-report --hierarchical

# 2. Find undocumented symbols
tsdoc-edge coverage-report | grep "High priority"

# 3. Add @doc tags to source code
# (Edit source files)

# 4. Verify improvement
tsdoc-edge coverage-report --hierarchical
```

## Comparison with explore-entrypoint

| Metric | explore-entrypoint | coverage-report |
|--------|-------------------|-----------------|
| **Direction** | docs → docs | code → docs |
| **Measures** | Navigation completeness | Documentation coverage |
| **Metric** | Files reachable from entrypoint | Symbols with @doc tags |
| **Use Case** | Find orphan documentation | Measure SSOT compliance |
| **Coverage** | 9.2% (misleading) | 100.0% (actual) |

**Recommendation**: Use `coverage-report --hierarchical` for true documentation coverage, use `explore-entrypoint` for finding orphaned documentation files.

## Examples

### Find Undocumented Commands
```bash
tsdoc-edge coverage-report --hierarchical | grep -A 50 "Undocumented" | grep "commands/"
```

### Track Coverage Over Time
```bash
# [[Baseline]]
tsdoc-edge coverage-report --hierarchical --json > baseline.json

# After changes
tsdoc-edge coverage-report --hierarchical --json > current.json

# Compare
diff <(jq '.overall.coverage' baseline.json) <(jq '.overall.coverage' current.json)
```

### Generate Coverage Badge
```bash
coverage=$(tsdoc-edge coverage-report --hierarchical --json | jq -r '.overall.coverage')
echo "Coverage: $coverage%" > coverage-badge.txt
```

## Related

- [[Coverage Metrics Contract]]: Metric ID, evidence, baseline, and migration rules
- [[BuildCommand]]: Populates symbol database
- [[IndexDocsCommand]]: Indexes documentation symbols
- [[ValidateDocsCommand]]: Validates documentation quality
- [[DetectDeadCodeCommand]]: Finds unused code
- [[Work Context Workflow]]: Shows context for file modifications

## See Also

- TSDoc `@doc` tag specification
- SSOT (Single Source of Truth) principles
- Hierarchical coverage calculation

---

## Backlinks

### Referenced By

- [[DetectDeadCodeCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/DetectDeadCodeCommand.md:61
- [[UntestedCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/UntestedCommand.md:132
- [[ValidateSpecCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/ValidateSpecCommand.md:146
- TestRelationships → /Users/junwoobang/workflow/tsdoc-edge/managed/types/TestRelationships.md:109
