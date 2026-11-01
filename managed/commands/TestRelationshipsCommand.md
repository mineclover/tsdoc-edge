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

- [[TSDoc Edge Documentation]] → managed/README.md:67
- [[AnalyzeTestsCommand]] → managed/commands/AnalyzeTestsCommand.md:14
- [[UntestedCommand]] → managed/commands/UntestedCommand.md:198
- [[Integration Test Traceability]] → managed/concepts/integration-test-traceability.md:545
- [[TestRelationships]] → managed/types/TestRelationships.md:124
- [[UnifiedRelationships]] → managed/types/UnifiedRelationships.md:205

### Implemented By

- TestRelationshipsCommand → src/commands/TestRelationshipsCommand.ts:36

