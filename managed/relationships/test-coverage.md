---
title: Test Coverage
type: relationship
category: meta
status: partial
canonical: true
---

# [[Test Coverage]]

> **Type**: `test-coverage` | **Status**: ⚠️ Partial (legacy relationship path)

Map test files to implementation (`*.test.ts` → source).

**Implementation**: [[TestCoverageAnalyzer]] (`src/analyzer/TestCoverageAnalyzer.ts`)
**Command**: TestRelationshipsCommand

**Metric contract**: [[Coverage Metrics Contract]] / `test.symbol`.

이 관계는 테스트 파일·케이스와 구현 심볼의 연결을 추정하는 관계 메트릭이다. Istanbul line,
function, branch 실행률과 동일하지 않으며, 현재 결과는 legacy DB/관계 추출 경로에 속한다.
canonical graph 기반 metric으로 승격하려면 canonical node ID와 revision evidence를 추가해야
한다.

---

## Backlinks

### Referenced By

- [[Commands Index]] → managed/COMMANDS.md:80
- [[TSDoc Edge Documentation]] → managed/README.md:65
- [[TestCoverageAnalyzer]] → managed/analyzers/TestCoverageAnalyzer.md:35
- [[TestRelationshipAnalyzer]] → managed/analyzers/TestRelationshipAnalyzer.md:38
- [[AnalyzerCommands]] → managed/commands/AnalyzerCommands.md:63
- [[Phase Commands]] → managed/commands/PhaseCommands.md:50
- [[Coverage Metrics Contract]] → managed/features/coverage-metrics-contract.md:277
- [[Guides & Tutorials]] → managed/guides/index.md:85
- [[Relationship Analysis Guide]] → managed/guides/relationship-analysis-guide.md:486
- [[Call Relationships]] → managed/relationships/calls.md:55
- [[Integration Verification]] → managed/relationships/integration-verification.md:376

