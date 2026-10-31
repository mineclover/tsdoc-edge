---
title: TestCoverageAnalyzer
type: analyzer
category: core-components
status: active
canonical: true
---

# [[TestCoverageAnalyzer]]

**Source**: `src/analyzer/TestCoverageAnalyzer.ts`

## Purpose

Analyze test coverage patterns and gaps.

**Metric contract**: [[Coverage Metrics Contract]] / `test.symbol` and `test.scenario`.

이 analyzer의 결과는 테스트 케이스와 구현 심볼의 관계 추정이다. Istanbul line/function/branch
실행률이 아니며, 현재 canonical `ttsc` graph metric으로 저장되지 않는다.

## Analysis

Measures:
- Coverage completeness
- Untested symbols
- Coverage quality

## Symbol Count

7 symbols

## Related

- [[Test Coverage]]: Coverage data
- CoverageParser: Coverage parsing

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → managed/README.md:66
- [[CodeHealthChecker]] → managed/analyzers/CodeHealthChecker.md:33
- [[Analyzers & Extractors]] → managed/analyzers/index.md:101
- [[TestRelationshipsCommand]] → managed/commands/TestRelationshipsCommand.md:34
- [[AnalysisFeatures]] → managed/features/analysis-features.md:243
- [[Coverage Metrics Contract]] → managed/features/coverage-metrics-contract.md:278
- [[Relationship Analysis Guide]] → managed/guides/relationship-analysis-guide.md:427
- [[Relationship Types]] → managed/relationships/index.md:119
- [[Test Coverage]] → managed/relationships/test-coverage.md:15

### Implemented By

- TestCoverageAnalyzer → src/analyzer/TestCoverageAnalyzer.ts:65

