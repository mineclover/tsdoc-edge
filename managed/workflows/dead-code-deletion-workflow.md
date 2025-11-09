# Safe Dead Code Deletion Workflow

## Overview

This workflow ensures safe removal of unused code using [[DetectDeadCodeCommand]] analysis.

## Step 1: Detect Dead Code

```bash
# Start with high-confidence candidates only
tsdoc-edge detect-dead-code --high
```

**Expected output**: List of symbols with 0 incoming calls and 0 dependencies.

## Step 2: Verify Detection

For each candidate symbol, verify:

### Check Entry Points
- Is it a CLI command? → Keep (entry point)
- Is it exported in index.ts? → Keep (public API)
- Is it a main/init function? → Keep (entry point)

### Check Dynamic Usage
- Reflection/metaprogramming? → Keep
- Configuration-based loading? → Keep
- Plugin system? → Keep
- String-based imports? → Keep

### Check Test Coverage
```bash
# If symbol has tests, it may be needed
tsdoc-edge analyze-tests
```

## Step 3: Manual Code Review

Before deletion, search for:
```bash
# Search for string references
grep -r "SymbolName" src/

# Check git history
git log -p --all -S "SymbolName"

# Check if used in package.json scripts
cat package.json | grep "SymbolName"
```

## Step 4: Safe Deletion Process

### Option A: Deprecate First (Recommended)
1. Add `@deprecated` tag to JSDoc
2. Wait one release cycle
3. Monitor for usage warnings
4. Delete if no warnings appear

### Option B: Direct Deletion
1. Create feature branch
2. Delete the code
3. Run full test suite
4. Run build
5. Manual testing of affected areas

```bash
git checkout -b cleanup/remove-dead-code
# Delete code
npm run build
npm test
```

## Step 5: Verify No Breakage

After deletion:
```bash
# Build must succeed
npm run build

# Tests must pass
npm test

# Re-run detection (symbol should be gone)
tsdoc-edge detect-dead-code --high

# Check coverage hasn't dropped unexpectedly
tsdoc-edge coverage-report --hierarchical
```

## Step 6: Commit and Monitor

```bash
git add .
git commit -m "refactor: remove dead code - SymbolName

- Detected by: tsdoc-edge detect-dead-code
- Confidence: high (0 calls, 0 dependencies)
- Verified: no dynamic usage, no tests"

# Create PR and monitor CI
```

## Red Flags (Do Not Delete)

❌ Symbol appears in:
- Package.json "exports" field
- README examples
- Migration guides
- Public documentation
- Type declaration files (.d.ts)

❌ Symbol usage patterns:
- Passed as callback to library
- Used in configuration objects
- Implements required interface
- Overrides parent method

❌ Project characteristics:
- Library (not application)
- Has external consumers
- Breaking change policy

## Example: Safe Deletion

```typescript
// BEFORE: Dead code detected
class UsageTracker {
  recordEvent(event: CommandUsageEvent): void {
    // Implementation
  }
}

// Detection output:
// Symbol: UsageTracker (class)
// Confidence: high
// Reason: isolated (0 calls, 0 deps)

// Verification:
// ✓ Not exported in index.ts
// ✓ No string references found
// ✓ No tests exist
// ✓ No dynamic usage patterns

// AFTER: Safely deleted
// File removed: src/analytics/UsageTracker.ts
// Build: ✓ Passing
// Tests: ✓ Passing
```

## Related

- [[DetectDeadCodeCommand]]: Detection tool
- [[CoverageReportCommand]]: Find undocumented code
- [[AnalyzeCallsCommand]]: Verify call relationships
