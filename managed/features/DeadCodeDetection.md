# [[Dead Code Detection]]

Identify unused code that can be safely removed.

## Purpose

Find symbols, functions, types, and modules that are defined but never used, enabling safe code cleanup and reducing codebase bloat.

## Strategy

### Detection Methods

#### 1. Orphan Analysis
Symbols with no incoming references:
```bash
tsdoc-edge orphans
```

**Indicators**:
- Zero usages in registry
- No import statements
- Not exported for external use

#### 2. Graph-based Analysis
Unreachable symbols from entry points:
```bash
tsdoc-edge analyze-graph --find-unreachable
```

**Algorithm**:
1. Mark all entry points (main.ts, index.ts, exports)
2. Traverse graph from entry points
3. Unmarked symbols are unreachable (dead code)

#### 3. Test Coverage Correlation
Symbols without tests are candidates:
```bash
tsdoc-edge untested
```

**Note**: Not all untested code is dead, but correlation is strong.

## Classification

### Safe to Remove
- **Orphaned utilities**: No dependencies, no usages
- **Unreachable code**: Not reachable from any entry point
- **Duplicate implementations**: Multiple symbols with identical behavior

### Investigate Before Removal
- **Exported symbols**: May be used externally (package exports)
- **Plugin interfaces**: May be used by plugins at runtime
- **Dynamic imports**: `import()` not tracked by static analysis
- **Reflection-based usage**: `require()`, `eval()`, etc.

### Keep (False Positives)
- **Entry points**: Main files, CLI scripts
- **Public APIs**: Exported for consumers
- **Configuration**: Environment-specific code
- **Future implementations**: Planned features

## Workflow

### 1. Initial Scan
```bash
# Find potential dead code
tsdoc-edge orphans > dead-code-candidates.txt
```

### 2. Manual Review
Review each candidate:
- Check if exported
- Verify no dynamic imports
- Confirm not used in tests
- Check documentation for planned usage

### 3. Safe Removal
```bash
# Remove confirmed dead code
git rm src/old-utility.ts

# Rebuild and test
npm test
```

### 4. Monitoring
```bash
# Track dead code over time
tsdoc-edge stats --save before-cleanup
# ... cleanup ...
tsdoc-edge stats --compare before-cleanup
```

## Commands

- **[[OrphansCommand]]**: Find orphaned symbols
- **[[UntestedCommand]]**: Find untested symbols
- **[[StatsCommand]]**: Track cleanup progress
- **[[UsedByCommand]]**: Verify no usages before removal

## Metrics

### Dead Code Ratio
```
Dead Code % = (Orphaned Symbols / Total Symbols) × 100
```

**Target**: < 5%

### Cleanup Impact
```
LOC Reduction = Lines Before - Lines After
```

## Use Cases

### 1. Legacy Codebase Cleanup
Find and remove old implementations:
```bash
tsdoc-edge orphans --min-age 180d
```

### 2. Post-Refactoring
Remove old implementations after migration:
```bash
# Before refactor: save baseline
tsdoc-edge stats --save pre-refactor

# After refactor: find orphans
tsdoc-edge orphans

# Verify and remove
```

### 3. Pre-Release Audit
Clean up before major release:
```bash
tsdoc-edge orphans
tsdoc-edge untested
tsdoc-edge undocumented
```

## Integration

### CI/CD
```yaml
# .github/workflows/quality.yml
- name: Check for dead code
  run: |
    ORPHANS=$(tsdoc-edge orphans --json | jq '.count')
    if [ "$ORPHANS" -gt 10 ]; then
      echo "Too many orphaned symbols: $ORPHANS"
      exit 1
    fi
```

### Pre-commit Hook
```bash
# Check for newly introduced orphans
tsdoc-edge orphans --diff origin/main
```

## Related

- [[OrphansCommand]]: Primary detection tool
- [[UntestedCommand]]: Coverage-based detection
- [[Impact Analysis]]: Assess removal safety
- [[CI/CD Integration]]: Automated detection

---

**Status**: Active
**Priority**: Medium (code health)
**Automation**: Partial (detection automated, removal manual)

---

## Backlinks

### Referenced By

- [[OrphansCommand]] → /home/user/tsdoc-edge/managed/commands/OrphansCommand.md:163
- [[OrphansCommand]] → /home/user/tsdoc-edge/managed/commands/OrphansCommand.md:164
- [[OrphansCommand]] → /home/user/tsdoc-edge/managed/commands/OrphansCommand.md:165
- [[StatsCommand]] → /home/user/tsdoc-edge/managed/commands/StatsCommand.md:184
- [[UntestedCommand]] → /home/user/tsdoc-edge/managed/commands/UntestedCommand.md:170
- [[UntestedCommand]] → /home/user/tsdoc-edge/managed/commands/UntestedCommand.md:171
- [[UsedByCommand]] → /home/user/tsdoc-edge/managed/commands/UsedByCommand.md:144
- [[CI/CD Integration]] → /home/user/tsdoc-edge/managed/features/CICDIntegration.md:128
- [[Dependency Analysis]] → /home/user/tsdoc-edge/managed/features/DependencyAnalysis.md:125
- [[Dependency Analysis]] → /home/user/tsdoc-edge/managed/features/DependencyAnalysis.md:165
- [[Impact Analysis]] → /home/user/tsdoc-edge/managed/features/ImpactAnalysis.md:176

