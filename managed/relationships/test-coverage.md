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

- Commands Index → /Users/junwoobang/workflow/tsdoc-edge/managed/COMMANDS.md:78
- TSDoc Edge Documentation → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:39
- TSDoc Edge Documentation → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:108
- TSDoc Edge Documentation → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:316
- [[TestCoverageAnalyzer]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/TestCoverageAnalyzer.md:22
- TestRelationshipsCommand → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/TestRelationshipsCommand.md:22
- Guides & Tutorials → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:61
- Guides & Tutorials → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:67
- [[Relationship Analysis Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/relationship-analysis-guide.md:323
- [[Call Relationships]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/CALLS.md:38
- [[Integration Verification]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/integration-verification.md:162
- [[Integration Verification]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/integration-verification.md:185
