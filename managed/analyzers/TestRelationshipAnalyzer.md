# [[TestRelationshipAnalyzer]]

**Source**: `src/analyzer/TestRelationshipAnalyzer.ts`

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
- [[WorkContextCommand]]: 테스트 정보 제공

---

## Backlinks

### Referenced By

- [[TestRelationshipExtractor]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/TestRelationshipExtractor.md:22
- [[Analyzers & Extractors]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/index.md:152
- [[AnalyzeTestsCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/AnalyzeTestsCommand.md:21
- [[TestRelationshipsCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/TestRelationshipsCommand.md:21
- [[Test Coverage]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:8
- [[Relationship Types]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/index.md:97

