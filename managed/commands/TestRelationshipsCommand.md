---
title: Test Relationships Command
type: command
category: commands
status: active
canonical: true
---

# [[TestRelationshipsCommand]]

**Source**: `src/commands/TestRelationshipsCommand.ts`

## Purpose

Analyze and display test-to-code relationships.

**Metric contract**: [[Coverage Metrics Contract]] / `test.symbol` and `test.scenario`.

이 명령은 테스트 파일·케이스와 구현 심볼의 관계를 보여준다. Istanbul line/function/branch
실행률을 계산하거나 canonical `ttsc` graph coverage를 생성하지 않는다.

## Features

- Test file detection
- Relationship mapping
- Coverage visualization

## Symbol Count

9 symbols

## Related

- [[TestCoverageAnalyzer]]: Core analysis
- [[Test Coverage]]: Coverage tracking

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:41
- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:261
- [[Analyzers & Extractors]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/index.md:97
- [[UntestedCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/UntestedCommand.md:131
- [[Integration Test Traceability]] → /Users/junwoobang/workflow/tsdoc-edge/managed/concepts/integration-test-traceability.md:158
- [[Relationship Types]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/index.md:98
- TestRelationships → /Users/junwoobang/workflow/tsdoc-edge/managed/types/TestRelationships.md:108
- [[UnifiedRelationships]] → /Users/junwoobang/workflow/tsdoc-edge/managed/types/UnifiedRelationships.md:147
