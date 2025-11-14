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
- [[TestRelationshipExtractor]] → /home/user/tsdoc-edge/managed/analyzers/TestRelationshipExtractor.md:32
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:152
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:327
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:328
- [[AnalyzeTestsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeTestsCommand.md:21
- [[AnalyzeTestsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeTestsCommand.md:30
- [[AnalyzeTestsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeTestsCommand.md:31
- [[TestRelationshipsCommand]] → /home/user/tsdoc-edge/managed/commands/TestRelationshipsCommand.md:21
- [[TestRelationshipsCommand]] → /home/user/tsdoc-edge/managed/commands/TestRelationshipsCommand.md:34
- [[TestRelationshipsCommand]] → /home/user/tsdoc-edge/managed/commands/TestRelationshipsCommand.md:35
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:88
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:89
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:90
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:8
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:38
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:39
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:40
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:41
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:42
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:95
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:229
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:230

