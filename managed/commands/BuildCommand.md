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
1. **SQLite** (`.tsdoc/symbols.db`): 빠른 쿼리
2. **JSONL** (`.tsdoc/registry.jsonl`): Git 버전 관리

## Related

- [[ASTSymbolExtractor]]: AST 파싱 및 심볼 추출
- [[SymbolGraphBuilder]]: 관계 그래프 구축
- [[DatabaseManager]]: 저장소 관리
- [[Core Workflow]]: 전체 워크플로우
