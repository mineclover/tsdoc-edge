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

- TSDoc Edge Documentation → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:40
- TSDoc Edge Documentation → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:262
- [[CodeHealthChecker]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:20
- [[CodeHealthChecker]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:62
- [[CodeHealthChecker]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:119
- [[CodeHealthChecker]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:212
- Analyzers & Extractors → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/index.md:93
- AnalysisFeatures → /Users/junwoobang/workflow/tsdoc-edge/managed/features/analysis-features.md:144
- AnalysisFeatures → /Users/junwoobang/workflow/tsdoc-edge/managed/features/analysis-features.md:201
- [[Relationship Analysis Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/relationship-analysis-guide.md:280
- [[Relationship Types]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/index.md:100
