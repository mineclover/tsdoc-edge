---
title: # DataFlowAnalyzer
type: analyzer
category: core-components
status: active
canonical: true
---

# DataFlowAnalyzer

**Source**: `src/analyzer/DataFlowAnalyzer.ts`

## Purpose

데이터 흐름 추적 (변수 → 함수 → 반환값).

## Analysis

**Tracks**:
1. Variable assignments
2. Function parameters
3. Return values
4. Property access chains

## Related

- [[Pipeline]]: 파이프라인 관계
- [[CallGraphAnalyzer]]: 호출 그래프

---

## Backlinks

### Referenced By

- TSDoc Edge Documentation → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:221
- Analyzers & Extractors → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/index.md:109
- [[Relationship Analysis Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/relationship-analysis-guide.md:278
