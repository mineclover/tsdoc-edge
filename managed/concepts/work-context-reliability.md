# [[Work Context Reliability]]

Multi-dimensional reliability scoring system (Documentation 30%, Dependencies 30%, Tests 20%, Impact 20%) that measures context quality for safe code modifications.

## Purpose

Measure and ensure the quality of context provided by [[WorkContextCommand]] through multi-dimensional reliability scoring.

## Problem

Context provided to developers before file modification must be trustworthy. Without reliability measurement:
- **Incomplete context**: Missing critical information leads to wrong decisions
- **Stale context**: Outdated relationships cause breaking changes
- **Low confidence**: Developers can't trust the provided context
- **No feedback**: No way to improve context quality over time

## Solution

4-dimensional reliability scoring system that validates context completeness and accuracy:

```
Total Reliability =
  (Docs Reliability × 30%) +
  (Deps Reliability × 30%) +
  (Tests Reliability × 20%) +
  (Impact Reliability × 20%)
```

## Reliability Dimensions

### 1. Documentation Reliability (30% weight)

**Measures**: Completeness and accuracy of TSDoc comments

**Checks**:
- Primary definition exists (`# [[Symbol]]`)
- TSDoc comment completeness (Purpose, Input, Output, etc.)
- Cross-references validity
- Example code freshness
- Related symbol coverage

**Scoring**:
```typescript
docsReliability = (
  hasPrimaryDefinition ? 40 : 0 +
  tsdocCompleteness * 30 +  // 0-30 points
  crossRefsValid * 20 +      // 0-20 points
  hasExamples ? 10 : 0
) / 100
```

**Example Output**:
```
📚 Documentation Reliability: 85% (A)
  ✅ Primary definition exists
  ✅ TSDoc complete (7/7 sections)
  ⚠️  1 broken cross-reference
  ✅ Examples present
```

### 2. Dependencies Reliability (30% weight)

**Measures**: Accuracy of dependency relationships

**Checks**:
- Code dependencies completeness (import/export tracking)
- I/O dependencies accuracy (type matching)
- Circular dependency detection
- Upstream/downstream mapping
- Transitive dependency closure

**Scoring**:
```typescript
depsReliability = (
  importsCaptured / totalImports * 40 +
  ioDepsConfidence * 30 +  // Based on type match confidence
  hasCircular ? -20 : 0 +
  transitiveComplete ? 30 : 0
) / 100
```

**Example Output**:
```
🔗 Dependencies Reliability: 92% (A)
  ✅ All imports tracked (15/15)
  ✅ I/O deps high confidence (avg 0.95)
  ✅ No circular dependencies
  ✅ Transitive closure complete (3 levels)
```

### 3. Test Coverage Reliability (20% weight)

**Measures**: Test-to-implementation relationship quality

**Checks**:
- Test files exist and map correctly
- Test coverage percentage
- Test relationship freshness (last update)
- Integration test presence
- Critical path coverage

**Scoring**:
```typescript
testsReliability = (
  hasTestFile ? 40 : 0 +
  coveragePercent * 0.4 +  // 0-40 points (100% cov = 40pts)
  testsFresh ? 20 : 0      // Updated within 30 days
) / 100
```

**Example Output**:
```
🧪 Tests Reliability: 75% (B)
  ✅ Test file exists (BuildCommand.test.ts)
  ⚠️  Coverage: 68% (target: 80%)
  ✅ Tests fresh (updated 5 days ago)
  ❌ No integration tests
```

### 4. Impact Reliability (20% weight)

**Measures**: Understanding of change impact

**Checks**:
- Who-uses analysis completeness
- Breaking change risk assessment
- Usage frequency data
- Public API surface documentation
- Deprecation warnings

**Scoring**:
```typescript
impactReliability = (
  whoUsesComplete ? 40 : 0 +
  breakingRiskAssessed ? 30 : 0 +
  hasUsageMetrics ? 20 : 0 +
  apiDocumented ? 10 : 0
) / 100
```

**Example Output**:
```
⚠️  Impact Reliability: 60% (C)
  ✅ Who-uses complete (23 dependents)
  ✅ Breaking change risk: LOW
  ❌ No usage metrics
  ⚠️  API partially documented (3/5 public methods)
```

## Overall Grading

| Score | Grade | Meaning | Action |
|-------|-------|---------|--------|
| 90-100% | A | Excellent | Safe to modify |
| 80-89% | B | Good | Minor improvements recommended |
| 70-79% | C | Adequate | Review and improve before changes |
| 60-69% | D | Poor | Significant improvements needed |
| <60% | F | Failing | Do not modify without investigation |

## Workflow Integration

### Command Usage

```bash
# Show reliability scores
tsdoc-edge work-context src/commands/BuildCommand.ts

# Minimum reliability threshold
tsdoc-edge work-context src/commands/BuildCommand.ts --min-reliability=80

# Detailed reliability breakdown
tsdoc-edge work-context src/commands/BuildCommand.ts --reliability
```

### Example Output

```
================================================================================
Work Context: BuildCommand
================================================================================

Reliability Score: 85% (B) ⚠️  Below A grade

📚 Documentation: 90% (A)
  ✅ Primary definition complete
  ✅ All 7 TSDoc sections present
  ✅ Cross-references valid

🔗 Dependencies: 95% (A)
  ✅ 12 imports tracked
  ✅ I/O dependencies: 0.98 avg confidence
  ✅ No circular dependencies

🧪 Tests: 75% (B)
  ✅ Test file present
  ⚠️  Coverage: 72% (target: 80%)

⚠️  Impact: 70% (C)
  ✅ 8 dependents identified
  ❌ No usage metrics
  ⚠️  Public API partially documented

💡 Improvement Suggestions:
  1. Increase test coverage to 80%+ (currently 72%)
  2. Add usage metrics tracking
  3. Document remaining public API methods (2/5 missing)

Estimated improvement time: 2-3 hours
```

### Pre-commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit

# Check reliability for modified files
for file in $(git diff --cached --name-only --diff-filter=M | grep '\.ts$'); do
  reliability=$(tsdoc-edge work-context "$file" --min-reliability=70 2>&1)

  if [ $? -ne 0 ]; then
    echo "❌ $file has low context reliability"
    echo "$reliability"
    exit 1
  fi
done
```

## Implementation

### Reliability Calculator

**Source**: `src/analyzer/ReliabilityCalculator.ts` (planned)

**Interface**:
```typescript
interface ReliabilityScore {
  overall: number;      // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  dimensions: {
    docs: DimensionScore;
    deps: DimensionScore;
    tests: DimensionScore;
    impact: DimensionScore;
  };
  suggestions: ImprovementSuggestion[];
}

interface DimensionScore {
  score: number;        // 0-100
  grade: string;
  weight: number;       // 0.0-1.0
  details: string[];
  issues: string[];
}
```

### Integration Points

| Component | Usage |
|-----------|-------|
| [[WorkContextCommand]] | Display reliability with context |
| [[HealthCommand]] | Project-wide reliability metrics |
| [[ValidateCommand]] | Fail on low reliability files |
| [[CoverageReportCommand]] | Include reliability in coverage reports |

## Configuration

```json
{
  "reliability": {
    "enabled": true,
    "weights": {
      "docs": 0.30,
      "deps": 0.30,
      "tests": 0.20,
      "impact": 0.20
    },
    "thresholds": {
      "A": 90,
      "B": 80,
      "C": 70,
      "D": 60
    },
    "minReliability": 70,
    "failOnLow": false
  }
}
```

## Benefits

### 1. Developer Confidence

**Before**:
```
Developer: "Is this context accurate? Can I trust it?"
→ No way to know, proceed with uncertainty
```

**After**:
```
Reliability: 92% (A)
Developer: "High confidence, safe to proceed"
```

### 2. Context Quality Improvement

Track reliability over time:
```bash
# Historical reliability trends
tsdoc-edge health --reliability-trend

# Output:
# BuildCommand: 72% → 85% → 92% (improving)
# ParseCommand: 90% → 88% → 85% (declining, needs attention)
```

### 3. Risk Assessment

```bash
# High-risk changes flagged
tsdoc-edge work-context src/core/SymbolRegistry.ts

# ⚠️  Impact Reliability: 55% (F)
# This file has 47 dependents and poor documentation
# HIGH RISK: Review carefully before modification
```

## Related

- [[WorkContextCommand]]: Primary consumer of reliability scores
- [[SELF-IMPROVEMENT-PROCESS]]: Systematic context improvement
- [[HealthCommand]]: Project-wide reliability metrics
- [[Module Specification Framework]]: Documentation completeness standards

## Visualization

See [[Work Context Reliability Chain]] diagram (`managed/architecture/diagrams/work-context-reliability-chain.mmd`) for the complete verification flow.

## Status

**Current**: Design/Planning
**Target**: v2.0
**Priority**: High (core feature for developer confidence)

## See Also

- Reliability scoring algorithms
- Context quality metrics
- Developer confidence measurement
- Pre-commit validation patterns

---

## Backlinks

### Referenced By

- [[CoverageReportCommand]] → /home/user/tsdoc-edge/managed/commands/CoverageReportCommand.md:150
- [[CoverageReportCommand]] → /home/user/tsdoc-edge/managed/commands/CoverageReportCommand.md:151
- [[CoverageReportCommand]] → /home/user/tsdoc-edge/managed/commands/CoverageReportCommand.md:152
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:69
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:70
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:71
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:72
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:73
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:74
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:43
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:44
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:45
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:96
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:97
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:98
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:99
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:100
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:101
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:102
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:103
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:104
- [[Concepts Index]] → /home/user/tsdoc-edge/managed/concepts/index.md:227
- [[Concepts Index]] → /home/user/tsdoc-edge/managed/concepts/index.md:246
- [[Concepts Index]] → /home/user/tsdoc-edge/managed/concepts/index.md:281
- [[Concepts Index]] → /home/user/tsdoc-edge/managed/concepts/index.md:282
- [[Module Specification Framework]] → /home/user/tsdoc-edge/managed/concepts/module-specification-framework.md:278
- [[Module Specification Framework]] → /home/user/tsdoc-edge/managed/concepts/module-specification-framework.md:279
- [[Module Specification Framework]] → /home/user/tsdoc-edge/managed/concepts/module-specification-framework.md:280
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:83
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:84
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:85

