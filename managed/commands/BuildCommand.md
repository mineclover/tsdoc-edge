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

## Related

- [[ASTSymbolExtractor]]: AST 파싱 및 심볼 추출
- [[SymbolGraphBuilder]]: 관계 그래프 구축
- [[DatabaseManager]]: 저장소 관리
- [[CoreWorkflow]]: 전체 워크플로우

---

## Backlinks

### Referenced By

- [[CLI Commands]] → /Users/junwoobang/workflow/tsdoc-edge/managed/CLI-COMMANDS.md:44
- [[CLI Commands]] → /Users/junwoobang/workflow/tsdoc-edge/managed/CLI-COMMANDS.md:290
- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:26
- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:50
- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:198
- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:232
- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:274
- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:291
- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:325
- [[ASTSymbolExtractor]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:100
- [[ASTSymbolExtractor]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:185
- [[Analyzers & Extractors]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/index.md:22
- [[Analyzers & Extractors]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/index.md:217
- [[Analyzers & Extractors]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/index.md:246
- [[CoverageReportCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/CoverageReportCommand.md:110
- [[InitCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/InitCommand.md:134
- [[Module Specification Framework]] → /Users/junwoobang/workflow/tsdoc-edge/managed/concepts/module-specification-framework.md:228
- [[DatabaseManager]] → /Users/junwoobang/workflow/tsdoc-edge/managed/core-components/DatabaseManager.md:113
- [[DatabaseManager]] → /Users/junwoobang/workflow/tsdoc-edge/managed/core-components/DatabaseManager.md:193
- [[SymbolRegistryManager]] → /Users/junwoobang/workflow/tsdoc-edge/managed/core-components/SymbolRegistryManager.md:223
- [[CoreWorkflow]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/core-workflow.md:68
- [[SymbolGraphFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/symbol-graph.md:118
- [[Build Pipeline Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/build-pipeline-guide.md:16
- [[Build Pipeline Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/build-pipeline-guide.md:238
- [[CLI Command Development Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/command-development-guide.md:262
- [[CLI Command Development Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/command-development-guide.md:339
- [[Document Symbol Parser]] → /Users/junwoobang/workflow/tsdoc-edge/managed/parser/DocumentSymbolParser.md:69
- ExtractionResult → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/ExtractionResult.md:78
- ExtractionResult → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/ExtractionResult.md:82
- ExtractionResult → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/ExtractionResult.md:94
- TsdocEdgeConfig → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/TsdocEdgeConfig.md:104
- [[Inheritance]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/INHERITANCE.md:9
- [[Interface Implementation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/INTERFACE-IMPL.md:9
- [[Code Dependency]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/code-dependency.md:15
- [[Relationship Types]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/index.md:24
- [[Relationship Types]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/index.md:32
- [[Relationship Types]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/index.md:40
- [[Relationship Types]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/index.md:184
- FileScanner → /Users/junwoobang/workflow/tsdoc-edge/managed/utilities/FileScanner.md:74

### Implemented By

- BuildCommand → /Users/junwoobang/workflow/tsdoc-edge/src/commands/BuildCommand.ts:55
