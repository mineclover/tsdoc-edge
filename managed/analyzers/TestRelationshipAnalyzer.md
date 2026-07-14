---
title: TestRelationshipAnalyzer
type: analyzer
category: core-components
status: historical
canonical: false
---

# [[TestRelationshipAnalyzer]]

**Source**: `src/analyzer/TestRelationshipAnalyzer.ts`

> **Historical document**: 현재 checkout에는 위 source 파일이 없다. 현재 테스트-심볼 관계
> 추출의 구현 소유자는 `src/analyzer/TestCoverageAnalyzer.ts`이며 metric ID는
> [[Coverage Metrics Contract]] / `test.symbol`이다.

## Purpose

테스트와 구현 코드 간 관계 매핑.

## Detection

**Strategies**:
1. File path convention (`*.test.ts`)
2. Import analysis
3. Describe block 분석

## Output

```typescript
interface TestCoverage {
  sourceFile: string;
  testFile: string;
  coverage: 'unit' | 'integration';
}
```

## Related

- [[Test Coverage]]: 테스트 커버리지 관계
- WorkContextCommand: 테스트 정보 제공

---

## Backlinks

### Referenced By

- TestRelationshipExtractor → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/TestRelationshipExtractor.md:22
- Analyzers & Extractors → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/index.md:152
- AnalyzeTestsCommand → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/AnalyzeTestsCommand.md:21
- TestRelationshipsCommand → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/TestRelationshipsCommand.md:21
- [[Test Coverage]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:8
- [[Relationship Types]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/index.md:97
