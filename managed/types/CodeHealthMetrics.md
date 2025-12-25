# CodeHealthMetrics

**Source**: `src/types/analysis/quality.ts`

## Purpose

Type system for code quality analysis and health checking.

## Documentation Quality Score

Per-symbol quality assessment:

See implementation: DocQualityScore

**Key Properties**:
- `symbolId`: Symbol identifier
- `symbolName`: Symbol name
- `symbolType`: Type of symbol
- `filePath`: File path
- `line`: Line number
- `isPublic`: Public API flag
- `hasDoc`: Has documentation
- `hasSummary`: Has summary
- `hasCompleteParams`: Has complete parameter docs
- `hasReturns`: Has return value docs
- `hasExamples`: Has usage examples
- `hasCustomTags`: Has custom tags
- `qualityScore`: Quality score (0-100)
- `missing`: Missing doc items
- `parentSymbol`: Parent symbol (optional)
- `children`: Child quality scores

### Quality Scoring

Points awarded for:
- Summary: 20 points
- Complete @param tags: 20 points
- @returns tag: 15 points
- Examples: 25 points
- Custom tags (@responsibility, @contract): 20 points

**Total: 100 points**

### Missing Items

Common missing elements:
- "summary" - No JSDoc summary
- "param: argName" - Missing parameter docs
- "returns" - No return value docs
- "examples" - No usage examples
- "custom tags" - No @responsibility/@contract

## Test Coverage Info

Per-file test coverage:

See implementation: TestCoverageInfo

**Key Properties**:
- `sourceFile`: Source file path
- `testFile`: Test file path (optional)
- `hasTest`: Has test file
- `symbolCount`: Number of symbols
- `estimatedCoverage`: Estimated coverage percentage

## Code Health Metrics

Overall codebase health:

See implementation: CodeHealthMetrics

**Key Properties**:
- `totalFiles`: Total number of files
- `totalSymbols`: Total number of symbols
- `publicSymbols`: Number of public symbols
- `documentedSymbols`: Number of documented symbols
- `fullyDocumentedSymbols`: Number of fully documented symbols
- `filesWithTests`: Files with tests
- `filesWithoutTests`: Files without tests
- `avgQualityScore`: Average quality score
- `overallHealthScore`: Overall health score (0-100)

### Health Score Calculation

Weighted average of:
- Documentation coverage: 40%
- Documentation quality: 30%
- Test coverage: 30%

**Grades:**
- 90-100: Excellent
- 80-89: Good
- 70-79: Fair
- 60-69: Poor
- <60: Critical

## Usage

### HealthCommand
```bash
tsdoc-edge health
# Shows overall health metrics and scores
```

### AnalyzeCommand
```bash
tsdoc-edge analyze src
# Detailed quality scores per symbol
```

### ValidateCommand
```bash
tsdoc-edge validate
# Enforce quality thresholds
```

## Symbol Count

3 interfaces

## Related

- [[HealthCommand]]: Display health metrics
- [[AnalyzeCommand]]: Analyze code quality
- [[ValidateCommand]]: Enforce quality standards

---

## Backlinks

### Referenced By

- [[CodeHealthChecker]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:85
- [[CodeHealthChecker]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:91
- [[CoreWorkflow]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/core-workflow.md:121
- CodeHealthMetrics → /Users/junwoobang/workflow/tsdoc-edge/managed/types/CodeHealthMetrics.md:70

