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

- [[TEST-COVERAGE]]: 테스트 커버리지 관계
- [[Work Context]]: 테스트 정보 제공
