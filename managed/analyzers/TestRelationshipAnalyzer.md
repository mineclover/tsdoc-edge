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

- [[TestRelationshipExtractor]] → /home/user/tsdoc-edge/managed/analyzers/TestRelationshipExtractor.md:22
- [[TestRelationshipExtractor]] → /home/user/tsdoc-edge/managed/analyzers/TestRelationshipExtractor.md:31
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:152
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:301
- [[AnalyzeTestsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeTestsCommand.md:21
- [[AnalyzeTestsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeTestsCommand.md:30
- [[TestRelationshipsCommand]] → /home/user/tsdoc-edge/managed/commands/TestRelationshipsCommand.md:21
- [[TestRelationshipsCommand]] → /home/user/tsdoc-edge/managed/commands/TestRelationshipsCommand.md:32
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:78
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:79
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:8
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:30
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:31
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:32
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:82
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:197

