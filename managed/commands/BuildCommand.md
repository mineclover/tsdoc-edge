---
title: Build Command
type: command
category: commands
status: active
canonical: true
---

# [[BuildCommand]]

**Source**: `src/commands/BuildCommand.ts`

## Purpose

TypeScript 소스를 분석하여 심볼 그래프 데이터베이스 구축. TSDoc Edge의 핵심 인덱싱 명령어.

## Workflow

```bash
tsdoc-edge build src
```

**Process**:
1. **File Discovery**: TypeScript 파일 탐색 (`*.ts`, `*.tsx`)
2. **AST Parsing**: TypeScript 컴파일러로 파싱
3. **Symbol Extraction**: 모든 심볼 추출 (class, interface, method, property, etc.)
4. **Relationship Analysis**: 심볼 간 관계 분석 (dependency, call graph, type flow)
5. **Database Storage**: SQLite + JSONL 저장

## Extracted Symbols

**Types**:
- `class`: 133개
- `interface`: 211개
- `method`: 954개
- `property`: 153개
- `type`: 22개
- `function`: 7개

**Total**: 1,511 symbols (현재 프로젝트 기준)

## Relationship Analysis

**Types Analyzed**:
- [[Code Dependency]]: Import/export 관계
- [[Call Relationships]]: 함수/메서드 호출
- [[Type Dependency]]: 타입 참조 관계
- [[IO Dependency]]: 파일 I/O 관계
- [[Pipeline]]: 데이터 흐름

**Total**: 36,050 relationships

## Storage

**Dual Storage**:
1. **SQLite** (`.tsdoc.db`, 또는 `paths.databasePath`): legacy enrichment 빠른 쿼리
2. **JSONL** (`.tsdoc/registry.jsonl`): Git 버전 관리

`--canonical-graph`를 사용하면 compiler-resolved node/edge, alias, diagnostics revision을
별도 `.tsdoc/canonical-graph.db`에 원자 교체한다.
`--canonical-only`를 함께 사용하면 이 revision만 저장하고 legacy SQLite/JSONL enrichment는
열거나 수정하지 않는다. 실제 convention PoC와 graph-only CI가 이 경계를 사용한다.

legacy build에서 테스트 심볼 관계가 추출되고 `--canonical-graph`가 활성화된 경우에는
`test.symbol` projection 요약도 build XML에 포함된다. 이 요약은 active graph revision의
`graphRevisionId`·`graphFingerprint`, matched/uncovered symbol 수, 미매칭 관계 대상 수를
보존하며 현재 `inferred`·`report-only` 정책이다.

## Canonical graph operator inspection

저장된 ttsc graph revision은 writer/router를 다시 실행하지 않고 read-only로 확인할 수 있다.

```bash
tsdoc-edge canonical-graph status --graph-db .tsdoc/canonical-graph.db --json
tsdoc-edge canonical-graph list --graph-db .tsdoc/canonical-graph.db --json
tsdoc-edge canonical-graph read --graph-db .tsdoc/canonical-graph.db \
  --revision-id <revision-id> --json
tsdoc-edge canonical-graph prune --graph-db .tsdoc/canonical-graph.db --keep 2 --vacuum --json
```

`status`는 active revision과 retained 개수를, `list`는 revision별 provenance/count를,
`read`는 exact revision의 graph/alias/diagnostic envelope를 read-only로 반환한다. `prune`은
active revision을 항상 보존하면서 오래된 revision을 정리하며, 네 명령 모두 active pointer를
생성하거나 변경하지 않는다.

## Related

- [[ASTSymbolExtractor]]: AST 파싱 및 심볼 추출
- [[SymbolGraphBuilder]]: 관계 그래프 구축
- [[DatabaseManager]]: 저장소 관리
- [[CoreWorkflow]]: 전체 워크플로우

---

## Backlinks

### Referenced By

- [[CLI Commands]] → managed/CLI-COMMANDS.md:32
- [[TSDoc Edge Documentation]] → managed/README.md:52
- [[CoverageReportCommand]] → managed/commands/CoverageReportCommand.md:267
- [[InitCommand]] → managed/commands/InitCommand.md:343
- [[Phase Commands]] → managed/commands/PhaseCommands.md:103
- [[SyncCommand]] → managed/commands/SyncCommand.md:25
- [[Module Specification Framework]] → managed/concepts/module-specification-framework.md:399
- [[DatabaseManager]] → managed/core-components/DatabaseManager.md:288
- [[SymbolRegistryManager]] → managed/core-components/SymbolRegistryManager.md:475
- [[Feature Showcase]] → managed/examples/feature-showcase.md:30
- [[Relationship Usage Examples]] → managed/examples/relationship-usage-examples.md:527
- [[CoreWorkflow]] → managed/features/core-workflow.md:80
- [[SymbolGraphFeatures]] → managed/features/symbol-graph.md:197
- [[Build Pipeline Guide]] → managed/guides/build-pipeline-guide.md:202
- [[CLI Command Development Guide]] → managed/guides/command-development-guide.md:709
- [[Document Symbol Parser]] → managed/parser/DocumentSymbolParser.md:87
- [[ExtractionResult]] → managed/primary-types/ExtractionResult.md:106
- [[TsdocEdgeConfig]] → managed/primary-types/TsdocEdgeConfig.md:121
- [[FileScanner]] → managed/utilities/FileScanner.md:85

### Implemented By

- BuildCommand → src/commands/BuildCommand.ts:107
- BuildCommandDependencies → src/commands/BuildCommand.ts:55

