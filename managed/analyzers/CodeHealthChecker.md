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

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:149
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:173
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:218
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:343
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:344
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:345
- [[DocumentationAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DocumentationAnalyzer.md:74
- [[DocumentationAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DocumentationAnalyzer.md:122
- [[DocumentationAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DocumentationAnalyzer.md:139
- [[DocumentationAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DocumentationAnalyzer.md:140
- [[DocumentationAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DocumentationAnalyzer.md:141
- [[DocumentationAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DocumentationAnalyzer.md:142
- [[DocumentationAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DocumentationAnalyzer.md:143
- [[DocumentationAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DocumentationAnalyzer.md:144
- [[DocumentationAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DocumentationAnalyzer.md:145
- [[DocumentationAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DocumentationAnalyzer.md:146
- [[DocumentationAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DocumentationAnalyzer.md:147
- [[DocumentationAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DocumentationAnalyzer.md:148
- [[DocumentationAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DocumentationAnalyzer.md:149
- [[DocumentationAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DocumentationAnalyzer.md:150
- [[DocumentationAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DocumentationAnalyzer.md:151
- [[DocumentationAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DocumentationAnalyzer.md:152
- [[DocumentationAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DocumentationAnalyzer.md:153
- [[DocumentationAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DocumentationAnalyzer.md:154
- [[TestCoverageAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestCoverageAnalyzer.md:35
- [[TestCoverageAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestCoverageAnalyzer.md:36
- [[TestCoverageAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestCoverageAnalyzer.md:37
- [[TestCoverageAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestCoverageAnalyzer.md:38
- [[TestCoverageAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestCoverageAnalyzer.md:39
- [[TestCoverageAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestCoverageAnalyzer.md:40
- [[TestCoverageAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestCoverageAnalyzer.md:41
- [[TestCoverageAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestCoverageAnalyzer.md:42
- [[TestCoverageAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestCoverageAnalyzer.md:43
- [[TestCoverageAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestCoverageAnalyzer.md:44
- [[TestCoverageAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestCoverageAnalyzer.md:45
- [[TestCoverageAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestCoverageAnalyzer.md:46
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:91
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:97
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:220
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:285
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:286
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:287
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:288
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:289
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:290
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:86
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:388
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:389
- [[AnalyzeCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCommand.md:18
- [[AnalyzeCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCommand.md:31
- [[AnalyzeCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCommand.md:32
- [[AnalyzeCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCommand.md:33
- [[AnalyzeCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCommand.md:34
- [[AnalyzeCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCommand.md:35
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:18
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:34
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:35
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:36
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:37
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:38
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:39
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:40
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:41
- [[OrphansCommand]] → /home/user/tsdoc-edge/managed/commands/OrphansCommand.md:156
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:143
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:272
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:273
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:274
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:275
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:276
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:277
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:278
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:279
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:113
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:120
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:163
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:164
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:165
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:166
- [[Analyzer Development Guide]] → /home/user/tsdoc-edge/managed/guides/analyzer-development-guide.md:21
- [[Analyzer Development Guide]] → /home/user/tsdoc-edge/managed/guides/analyzer-development-guide.md:246
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:216
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:369
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:415
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:416
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:417
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:418
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:272
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:363
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:364
- [[AnalysisReport]] → /home/user/tsdoc-edge/managed/primary-types/AnalysisReport.md:91
- [[AnalysisReport]] → /home/user/tsdoc-edge/managed/primary-types/AnalysisReport.md:108
- [[AnalysisReport]] → /home/user/tsdoc-edge/managed/primary-types/AnalysisReport.md:109
- [[AnalysisReport]] → /home/user/tsdoc-edge/managed/primary-types/AnalysisReport.md:110
- [[AnalysisReport]] → /home/user/tsdoc-edge/managed/primary-types/AnalysisReport.md:111
- [[AnalysisReport]] → /home/user/tsdoc-edge/managed/primary-types/AnalysisReport.md:112
- [[AnalysisReport]] → /home/user/tsdoc-edge/managed/primary-types/AnalysisReport.md:113
- [[AnalysisReport]] → /home/user/tsdoc-edge/managed/primary-types/AnalysisReport.md:114
- [[AnalysisReport]] → /home/user/tsdoc-edge/managed/primary-types/AnalysisReport.md:115
- [[AnalysisReport]] → /home/user/tsdoc-edge/managed/primary-types/AnalysisReport.md:116
- [[AnalysisReport]] → /home/user/tsdoc-edge/managed/primary-types/AnalysisReport.md:117
- [[AnalysisReport]] → /home/user/tsdoc-edge/managed/primary-types/AnalysisReport.md:118

