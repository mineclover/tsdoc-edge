---
title: Analyze Tests Command
type: command
category: commands
status: historical
canonical: false
---

# [[AnalyzeTestsCommand]]

**Source**: `src/commands/AnalyzeTestsCommand.ts`

> **Historical document**: 현재 checkout에는 위 command source가 없다. 현재 실행 가능한
> 테스트 관계 명령은 [[TestRelationshipsCommand]]이며, 구현 소유자는
> `src/analyzer/TestCoverageAnalyzer.ts`다. Metric ID는 [[Coverage Metrics Contract]] /
> `test.symbol`이다.

## Purpose

Analyze test coverage and relationships.

## Historical Features

- Test detection
- Coverage calculation
- Gap analysis

## Symbol Count

5 symbols

## Related

- [[TestRelationshipAnalyzer]]: Core analysis
- [[Test Coverage]]: Coverage tracking

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:71
- [[Integration Test Traceability]] → /Users/junwoobang/workflow/tsdoc-edge/managed/concepts/integration-test-traceability.md:159
- [[Test Coverage]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:9
- TestRelationships → /Users/junwoobang/workflow/tsdoc-edge/managed/types/TestRelationships.md:107
