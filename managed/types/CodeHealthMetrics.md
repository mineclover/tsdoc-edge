# [[CodeHealthMetrics]]

**Source**: `src/types/analysis/quality.ts`

## Purpose

Type system for code quality analysis and health checking.

## Documentation Quality Score

Per-symbol quality assessment:
```typescript
interface DocQualityScore {
  symbolId: string;
  symbolName: string;
  symbolType: string;
  filePath: string;
  line: number;
  isPublic: boolean;
  hasDoc: boolean;
  hasSummary: boolean;
  hasCompleteParams: boolean;
  hasReturns: boolean;
  hasExamples: boolean;
  hasCustomTags: boolean;
  qualityScore: number;     // 0-100
  missing: string[];        // Missing doc items
  parentSymbol?: string;
  children: DocQualityScore[];
}
```

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
```typescript
interface TestCoverageInfo {
  sourceFile: string;
  testFile?: string;
  hasTest: boolean;
  symbolCount: number;
  estimatedCoverage: number;  // Percentage
}
```

## Code Health Metrics

Overall codebase health:
```typescript
interface CodeHealthMetrics {
  totalFiles: number;
  totalSymbols: number;
  publicSymbols: number;
  documentedSymbols: number;
  fullyDocumentedSymbols: number;
  filesWithTests: number;
  filesWithoutTests: number;
  avgQualityScore: number;
  overallHealthScore: number;  // 0-100
}
```

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

- [[AnalyzeCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCommand.md:40
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:47
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:41
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:121
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:214

