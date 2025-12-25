---
title: Documentation Analyzer
type: analyzer
category: quality
status: active
canonical: true
source: src/analyzer/DocumentationAnalyzer.ts
---

# [[DocumentationAnalyzer]]

**Source**: `src/analyzer/DocumentationAnalyzer.ts`

## Purpose

Analyze TSDoc documentation quality for TypeScript symbols, including nested child symbols, to evaluate completeness and quality.

## Responsibility

Evaluate TSDoc comment completeness and quality for all symbols (classes, functions, methods, properties) in TypeScript source files.

## Problem

Documentation quality varies widely across codebases:
- Missing TSDoc comments
- Incomplete @param or @returns tags
- No descriptions
- Child symbols (methods, properties) often undocumented

## Solution

Systematic documentation quality analysis with child symbol support:

### Quality Metrics

1. **Has Comment**: TSDoc comment block exists
2. **Has Description**: Non-empty description text
3. **Param Coverage**: All parameters documented with @param
4. **Returns Coverage**: Return type documented with @returns
5. **Example Coverage**: Usage examples with @example
6. **Public API Tags**: @public, @internal markers

### Quality Score Calculation

```typescript
interface DocQualityScore {
  symbolName: string;
  filePath: string;
  hasComment: boolean;
  hasDescription: boolean;
  paramsDocumented: number;
  totalParams: number;
  hasReturns: boolean;
  hasExamples: boolean;
  score: number; // 0-100
  issues: string[];
}
```

**Score Formula**:
```
score = (
  hasComment * 20 +
  hasDescription * 20 +
  (paramsDocumented / totalParams) * 30 +
  hasReturns * 20 +
  hasExamples * 10
)
```

## Usage

```typescript
import { DocumentationAnalyzer } from './analyzer/DocumentationAnalyzer';

const analyzer = new DocumentationAnalyzer();

// Analyze file including child symbols
const scores = analyzer.analyzeFile(
  'src/commands/BuildCommand.ts',
  sourceCode,
  true // includeChildren
);

// Review scores
scores.forEach(score => {
  console.log(`${score.symbolName}: ${score.score}/100`);
  if (score.issues.length > 0) {
    console.log(`  Issues: ${score.issues.join(', ')}`);
  }
});
```

## Features

### Child Symbol Analysis

Analyzes nested symbols within parent symbols:

```typescript
class MyClass {           // Parent symbol
  private field: string;  // Child symbol

  constructor() { }       // Child symbol

  method() { }            // Child symbol
}
```

**Benefits**:
- Complete documentation coverage
- Finds undocumented private members
- Ensures API consistency

### Issue Detection

Reports specific documentation issues:

```typescript
issues: [
  "Missing @param for 'filePath'",
  "Missing @returns documentation",
  "No description provided",
  "Missing @example"
]
```

### AST Traversal

Uses TypeScript compiler API for accurate analysis:

```typescript
1. Create SourceFile from source code
2. Visit each AST node
3. For each symbol-bearing node:
   a. Extract JSDoc comment
   b. Parse with @microsoft/tsdoc
   c. Calculate quality score
   d. Collect issues
4. Recursively analyze child symbols
```

## Integration

### Used By

- [[CodeHealthChecker]]: Overall code health analysis
- [[HealthCommand]]: Health report generation
- [[AnalyzeCommand]]: Code quality analysis

### Depends On

- `@microsoft/tsdoc`: TSDoc parsing
- TypeScript compiler API: AST traversal
- `DocQualityScore`: Type definitions

## Implementation Details

### Node Types Analyzed

```typescript
Analyzes:
- ClassDeclaration
- FunctionDeclaration
- MethodDeclaration
- PropertyDeclaration
- InterfaceDeclaration
- TypeAliasDeclaration
- EnumDeclaration
- VariableStatement

Recursively visits children for:
- Class members (methods, properties)
- Interface members
- Enum members
```

### Quality Thresholds

```typescript
Excellent: score >= 90
Good: score >= 70
Fair: score >= 50
Poor: score < 50
```

### Example Output

```typescript
{
  symbolName: "BuildCommand",
  filePath: "src/commands/BuildCommand.ts",
  hasComment: true,
  hasDescription: true,
  paramsDocumented: 1,
  totalParams: 1,
  hasReturns: true,
  hasExamples: false,
  score: 90,
  issues: ["Missing @example"]
}
```

## Configuration

```json
{
  "documentation": {
    "includeChildren": true,
    "requireExamples": false,
    "minimumScore": 70,
    "failOnMissing": true
  }
}
```

## Testing

```typescript
// Test setup
const analyzer = new DocumentationAnalyzer();

// Test cases
describe('DocumentationAnalyzer', () => {
  it('detects missing TSDoc comments', () => {
    const code = 'function foo() {}';
    const scores = analyzer.analyzeFile('test.ts', code);
    expect(scores[0].hasComment).toBe(false);
  });

  it('calculates param coverage', () => {
    const code = `
      /**
       * Test function
       * @param a - First param
       */
      function foo(a: number, b: string) {}
    `;
    const scores = analyzer.analyzeFile('test.ts', code);
    expect(scores[0].paramsDocumented).toBe(1);
    expect(scores[0].totalParams).toBe(2);
  });

  it('analyzes child symbols', () => {
    const code = `
      class MyClass {
        method() {}
      }
    `;
    const scores = analyzer.analyzeFile('test.ts', code, true);
    expect(scores.length).toBe(2); // Class + method
  });
});
```

## Examples

### Find Undocumented Symbols

```typescript
const scores = analyzer.analyzeFile(filePath, code);
const undocumented = scores.filter(s => !s.hasComment);

undocumented.forEach(s => {
  console.log(`${s.symbolName} has no documentation`);
});
```

### Calculate File Score

```typescript
const scores = analyzer.analyzeFile(filePath, code);
const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;

console.log(`File score: ${avgScore.toFixed(1)}/100`);
```

### Generate Report

```typescript
const scores = analyzer.analyzeFile(filePath, code);

scores.forEach(score => {
  const status = score.score >= 70 ? '✅' : '❌';
  console.log(`${status} ${score.symbolName}: ${score.score}/100`);

  if (score.issues.length > 0) {
    score.issues.forEach(issue => {
      console.log(`  ⚠️  ${issue}`);
    });
  }
});
```

## Related

- [[CodeHealthChecker]]: Uses DocumentationAnalyzer for health reports
- [[TSDocParser]]: Parses TSDoc comments
- AnalysisFeatures: Part of analysis feature set
- ValidationFeatures: Documentation validation

## See Also

- [TSDoc Specification](https://tsdoc.org/)
- [TypeScript Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)
- Documentation quality best practices

---

## Backlinks

### Referenced By

- [[CodeHealthChecker]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:20
- [[CodeHealthChecker]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:54
- [[CodeHealthChecker]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:118
- [[CodeHealthChecker]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:211
- Analyzers & Extractors → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/index.md:87
- [[AnalyzeCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/AnalyzeCommand.md:19
- [[SuggestCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/SuggestCommand.md:189
- AnalysisFeatures → /Users/junwoobang/workflow/tsdoc-edge/managed/features/analysis-features.md:144
- AnalysisFeatures → /Users/junwoobang/workflow/tsdoc-edge/managed/features/analysis-features.md:166
- AnalysisFeatures → /Users/junwoobang/workflow/tsdoc-edge/managed/features/analysis-features.md:194

