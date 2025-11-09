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
healthScore = (docQuality * 0.5) + (testCoverage * 0.5)
```

**Doc Quality** (0-100):
- TSDoc completeness
- Symbol documentation rate
- Documentation freshness

**Test Coverage** (0-100):
- Line coverage
- Branch coverage
- Symbol coverage

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
- Parses coverage reports (Istanbul, NYC)
- Tracks symbol-level coverage
- Identifies untested code paths
- Calculates coverage percentages

## Data Structures

**AnalysisOptions**:
```typescript
interface AnalysisOptions {
  path: string;              // Directory to analyze
  includeChildren?: boolean; // Recursive analysis
  includePrivate?: boolean;  // Include private symbols
}
```

**AnalysisReport**:
```typescript
interface AnalysisReport {
  healthScore: number;                    // 0-100
  metrics: CodeHealthMetrics;
  suggestions: ImprovementSuggestion[];
  timestamp: Date;
}
```

**CodeHealthMetrics**:
```typescript
interface CodeHealthMetrics {
  docQuality: DocQualityScore;
  testCoverage: TestCoverageInfo;
  totalSymbols: number;
  documentedSymbols: number;
  testedSymbols: number;
}
```

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
- [[AnalysisFeatures]] (`managed/features/analysis-features.md`) - Feature documentation

**Uses**:
- [[DocumentationAnalyzer]] (`src/analyzer/DocumentationAnalyzer.ts`) - Doc quality
- [[TestCoverageAnalyzer]] (`src/analyzer/TestCoverageAnalyzer.ts`) - Test coverage
- [[AnalysisReport]] (`managed/primary-types/AnalysisReport.md`) - Report format

**Produces**:
- [[AnalysisReport]] (`managed/primary-types/AnalysisReport.md`)
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
    "testCoverage": {
      "score": 71,
      "lineCoverage": 0.75,
      "branchCoverage": 0.68,
      "symbolCoverage": 0.71
    },
    "totalSymbols": 150,
    "documentedSymbols": 120,
    "testedSymbols": 107
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

**Decision**: Equal weighting (50/50) for doc and tests
**Rationale**: Both are equally important for code quality
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
- [[AnalysisReport]] (`managed/primary-types/AnalysisReport.md`)

**Features**:
- [[AnalysisFeatures]] (`managed/features/analysis-features.md`)

---

**Last Updated**: 2025-11-08
**Responsibility**: Generate comprehensive health reports with improvement suggestions
**Status**: ✅ Active - Powers health command
