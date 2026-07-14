---
title: Code Health Checker
type: analyzer
category: quality
status: active
canonical: true
source: src/analyzer/CodeHealthChecker.ts
---

# [[CodeHealthChecker]]

> **Component**: Analyzer | **Category**: Quality Analysis | **Type**: Health Metrics

Generate comprehensive health reports with improvement suggestions by combining documentation quality and test coverage.

**Metric contract**: [[Coverage Metrics Contract]] / `quality.health`.

이 analyzer의 test 값은 Istanbul 실행률이 아니다. 현재 구현은 소스 파일에 대응하는 테스트
파일 존재 비율을 사용하고, `TestCoverageAnalyzer` 연동은 API 변경으로 비활성화되어 있다.

## Purpose

**Problem**: Developers struggle to assess overall code quality and prioritize improvements
**Solution**: Combines documentation quality and test coverage into a single health score
**Context**: Need unified metrics to track code quality over time

## Implementation

**Source**: `src/analyzer/CodeHealthChecker.ts`

**Class**: `CodeHealthChecker`
- Constructor: `()`
- Dependencies: [[DocumentationAnalyzer]], [[TestCoverageAnalyzer]]

**Key Methods**:
```typescript
analyze(options: AnalysisOptions): AnalysisReport
calculateHealthScore(metrics: CodeHealthMetrics): number
generateSuggestions(metrics: CodeHealthMetrics): ImprovementSuggestion[]
```

## Functionality

### 1. Health Score Calculation

**Formula**:
```typescript
healthScore = (avgDocumentationQuality * 0.6) + (filesWithTestsRatio * 0.4)
```

**Doc Quality** (0-100):
- TSDoc completeness
- Symbol documentation rate
- Documentation freshness

**Test presence ratio** (0-100):
- `filesWithTests / (filesWithTests + filesWithoutTests) * 100`
- Test files are discovered using common filename and `__tests__` path conventions.
- `TestCoverageInfo.estimatedCoverage` is an inferred file/symbol estimate and is not used as
  Istanbul line, branch, or function coverage.

### 2. Improvement Suggestions

**Prioritized Recommendations**:
- High priority: Undocumented public APIs
- Medium priority: Missing test coverage
- Low priority: Documentation formatting

**Suggestion Types**:
```typescript
type SuggestionType =
  | 'add_documentation'
  | 'add_tests'
  | 'improve_doc_quality'
  | 'fix_broken_links'
  | 'update_stale_docs'
```

### 3. Documentation Analysis

**Uses**: [[DocumentationAnalyzer]] (`src/analyzer/DocumentationAnalyzer.ts`)
- Analyzes TSDoc completeness
- Detects missing summaries
- Validates parameter documentation
- Checks return type documentation

### 4. Test Coverage Analysis

**Uses**: [[TestCoverageAnalyzer]] (`src/analyzer/TestCoverageAnalyzer.ts`)
- The current `CodeHealthChecker` does not invoke this analyzer because its API changed.
- Symbol-level test relationships are produced by the build/test relationship path instead.
- Istanbul parsing is owned by `CoverageParser`, not this health analyzer.

## Data Structures

### AnalysisOptions

See implementation: AnalysisOptions

**Key Properties**:
- `path`: Directory to analyze
- `includeChildren`: Recursive analysis (optional)
- `includePrivate`: Include private symbols (optional)

### AnalysisReport

See implementation: AnalysisReport

**Key Properties**:
- `healthScore`: Overall health score (0-100)
- `metrics`: Detailed metrics (CodeHealthMetrics)
- `suggestions`: Improvement suggestions array
- `timestamp`: Analysis timestamp

### CodeHealthMetrics

See implementation: CodeHealthMetrics

**Key Properties**:
- `docQuality`: Documentation quality score
- `testCoverage`: Test coverage information
- `totalSymbols`: Total number of symbols
- `documentedSymbols`: Number of documented symbols
- `testedSymbols`: Number of tested symbols

**ImprovementSuggestion**:
```typescript
interface ImprovementSuggestion {
  type: SuggestionType;
  priority: 'high' | 'medium' | 'low';
  target: string;           // Symbol or file
  message: string;
  autoFixable: boolean;
}
```

## Usage

**Direct Usage**:
```typescript
import { CodeHealthChecker } from './analyzer/CodeHealthChecker';

const checker = new CodeHealthChecker();
const report = checker.analyze({
  path: 'src/commands',
  includeChildren: true,
  includePrivate: false
});

console.log(`Health Score: ${report.healthScore}/100`);
console.log(`Suggestions: ${report.suggestions.length}`);
```

**Via Command**:
```bash
# Analyze code health
tsdoc-edge health src

# Analyze specific file
tsdoc-edge health src/commands/BuildCommand.ts

# Include private symbols
tsdoc-edge health src --include-private
```

## Integration

**Used By**:
- [[HealthCommand]] (`src/commands/HealthCommand.ts`) - CLI interface
- AnalysisFeatures (`managed/features/analysis-features.md`) - Feature documentation

**Uses**:
- [[DocumentationAnalyzer]] (`src/analyzer/DocumentationAnalyzer.ts`) - Doc quality
- [[TestCoverageAnalyzer]] (`src/analyzer/TestCoverageAnalyzer.ts`) - Test coverage
- AnalysisReport (`managed/primary-types/AnalysisReport.md`) - Report format

**Produces**:
- AnalysisReport (`managed/primary-types/AnalysisReport.md`)
- Improvement suggestions for developers
- Health metrics for tracking

## Example Output

**Analysis Report**:
```json
{
  "healthScore": 78,
  "metrics": {
    "docQuality": {
      "score": 85,
      "documented": 120,
      "total": 150,
      "completeness": 0.8
    },
    "totalFiles": 20,
    "totalSymbols": 150,
    "publicSymbols": 120,
    "documentedSymbols": 120,
    "fullyDocumentedSymbols": 107,
    "filesWithTests": 14,
    "filesWithoutTests": 6,
    "avgQualityScore": 85,
    "healthScore": 78
  },
  "suggestions": [
    {
      "type": "add_documentation",
      "priority": "high",
      "target": "BuildCommand.execute",
      "message": "Public method missing JSDoc summary",
      "autoFixable": false
    },
    {
      "type": "add_tests",
      "priority": "high",
      "target": "ValidateCommand",
      "message": "No test coverage found",
      "autoFixable": false
    }
  ],
  "timestamp": "2025-11-08T..."
}
```

## Analysis Capabilities

### 1. Holistic Quality Assessment
- Single metric combining multiple dimensions
- Easy to track over time
- Identifies improvement priorities

### 2. Actionable Suggestions
- Specific targets (file, symbol)
- Prioritized by impact
- Auto-fix capability flagged

### 3. Trend Tracking
- Historical health scores
- Quality improvement over time
- Regression detection

### 4. Granular Analysis
- Per-file health scores
- Per-symbol metrics
- Aggregate project metrics

## Health Score Interpretation

**90-100**: Excellent
- Comprehensive documentation
- High test coverage
- Few improvement opportunities

**70-89**: Good
- Most symbols documented
- Adequate test coverage
- Some gaps to address

**50-69**: Fair
- Documentation incomplete
- Test coverage spotty
- Many improvement opportunities

**0-49**: Poor
- Minimal documentation
- Low test coverage
- Urgent improvements needed

## Design Decisions

**Decision**: Combine doc quality and test coverage into single metric
**Rationale**: Both are essential for maintainability and should be tracked together
**Consequences**:
- ✅ Single score simplifies tracking
- ⚠️ May oversimplify complex quality issues

**Decision**: Documentation quality 60%, test-file presence 40%
**Rationale**: The current implementation has reliable documentation scores but only a coarse test-file presence signal.
**Consequences**:
- ✅ Balanced focus on documentation and testing
- ⚠️ May not reflect project-specific priorities

## Limitations

**Current**:
- Fixed weighting (50/50)
- No code complexity metrics
- No security analysis
- No performance metrics

**Future Enhancements**:
- Configurable weighting
- Cyclomatic complexity
- Security vulnerability scanning
- Performance profiling integration

## Related

**Commands**:
- [[HealthCommand]] (`src/commands/HealthCommand.ts`)
- [[AnalyzeCommand]] (`src/commands/AnalyzeCommand.ts`)

**Analyzers**:
- [[DocumentationAnalyzer]] (`src/analyzer/DocumentationAnalyzer.ts`)
- [[TestCoverageAnalyzer]] (`src/analyzer/TestCoverageAnalyzer.ts`)

**Types**:
- AnalysisReport (`managed/primary-types/AnalysisReport.md`)

**Features**:
- AnalysisFeatures (`managed/features/analysis-features.md`)

---

**Last Updated**: 2025-11-08
**Responsibility**: Generate comprehensive health reports with improvement suggestions
**Status**: ✅ Active - Powers health command

---

## Backlinks

### Referenced By

- TSDoc Edge Documentation → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:212
- TSDoc Edge Documentation → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:236
- TSDoc Edge Documentation → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:272
- [[DocumentationAnalyzer]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/DocumentationAnalyzer.md:74
- [[DocumentationAnalyzer]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/DocumentationAnalyzer.md:122
- Analyzers & Extractors → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/index.md:91
- Analyzers & Extractors → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/index.md:97
- Analyzers & Extractors → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/index.md:220
- [[AnalyzeCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/AnalyzeCommand.md:18
- [[HealthCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/HealthCommand.md:18
- AnalysisFeatures → /Users/junwoobang/workflow/tsdoc-edge/managed/features/analysis-features.md:143
- [[CoreWorkflow]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/core-workflow.md:113
- [[CoreWorkflow]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/core-workflow.md:120
- Analyzer Development Guide → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/analyzer-development-guide.md:21
- Analyzer Development Guide → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/analyzer-development-guide.md:258
- Guides & Tutorials → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:216
- Guides & Tutorials → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:369
- [[Relationship Analysis Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/relationship-analysis-guide.md:272
- AnalysisReport → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/AnalysisReport.md:91
