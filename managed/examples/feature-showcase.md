---
title: Feature Showcase
type: example
category: documentation
status: active
created: 2025-12-09
---

# [[Feature Showcase]]

TSDoc Edge의 모든 주요 기능을 실제로 활용하는 종합 예시 문서입니다.

**Purpose**: 이 문서는 TSDoc Edge가 지원하는 문서 작성 기능들을 실제로 사용하여 레퍼런스 역할을 합니다.

## Document Symbol System

### Primary Definition (H1)

문서의 H1 제목에 `# [[SymbolName]]` 형식으로 체크포인트를 정의합니다.
이 문서의 경우 `# [[Feature Showcase]]`가 Primary Definition입니다.

### Auxiliary Definitions (H2+)

H2 이하에서 정의된 심볼은 Auxiliary Definition으로 취급됩니다:

#### [[Feature Showcase - Symbol References]]

다른 문서나 코드를 참조할 때 `[[SymbolName]]` 형식을 사용합니다:

- 코드 심볼: [[BuildCommand]], [[DatabaseManager]], [[SymbolRegistryManager]]
- 문서 심볼: [[CoreWorkflow]], [[DocumentSymbolSystem]], [[SSOT]]
- 타입 심볼: [[EnhancedSymbolDoc]], [[TsdocEdgeConfig]]

## Code-Document Connection

### Source Links

소스 코드와 문서를 연결하는 방법:

**Source**: `src/commands/BuildCommand.ts`
**Source**: `src/storage/DatabaseManager.ts:45`

### @doc Tag Usage

코드에서 문서를 참조하는 방법 (TSDoc 주석 내):

```typescript
/**
 * BuildCommand - Symbol database builder
 *
 * @doc [[BuildCommand]]
 * @doc [[CoreWorkflow]]
 */
export class BuildCommand extends BaseCommand {
  // ...
}
```

## Relationship Documentation

### @depends / @depType / @depReason

의존성을 명시적으로 문서화:

```typescript
/**
 * @depends DatabaseManager, SymbolRegistryManager
 * @depType internal, internal
 * @depReason Data persistence, Symbol ID management
 */
```

**실제 프로젝트의 핵심 의존성** (relationship-metrics 결과):

| Symbol | Importance | Role |
|--------|------------|------|
| [[SymbolRegistryManager]] | 0.401 | Core dependency |
| [[DatabaseManager]] | 0.389 | Core dependency |
| [[UsageTracker]] | 0.379 | Core dependency |
| [[SymbolGraphBuilder]] | 0.289 | Core dependency |
| [[ConfigManager]] | 0.283 | Core dependency |

### @enhances Tag

기능 확장 관계 표현:

```typescript
/**
 * @enhances BaseCommand
 * @reason Adds relationship analysis capabilities
 */
```

## Problem-Solution Documentation

### @problem / @solves / @context

문제 해결 맥락 문서화:

```typescript
/**
 * @problem 모놀리식 Phase 파일들이 1000+ 줄로 관리 어려움
 * @solves 개별 파일로 분리하여 모듈화
 * @context CLI 도구 특성상 명령어별 독립성 필요
 */
```

**실제 적용 사례**: [[Phase Commands Refactoring Guide]]
- 4,965줄 → 33개 개별 파일 (평균 ~140줄)
- 100% 완료 (Phase4~Phase10)

## Design Decision Documentation

### @decision / @rationale / @consequences

설계 결정 기록:

```typescript
/**
 * @decision Use SQLite for local storage + JSONL for version control
 * @rationale SQLite provides fast queries, JSONL enables git tracking
 * @consequences Hybrid approach requires sync logic
 */
```

**프로젝트 핵심 설계 결정**:

1. **체크포인트 기반 평탄화**
   - Decision: 계층 구조 대신 직접 라우팅
   - Rationale: 전체 흐름 파악 용이
   - Consequences: Backlinks로 역추적 가능

2. **19개 관계 타입 분류**
   - Decision: 6개 카테고리로 정규화
   - Rationale: 일관된 분석 프레임워크
   - Consequences: 분석기 개별 구현 필요

## Functionality Documentation

### @functionality Tag

기능별 상세 문서화:

```typescript
/**
 * @functionality
 * - Symbol scanning: Extract all TypeScript symbols via AST
 * - Relationship detection: Identify 19 relationship types
 * - Database persistence: SQLite + JSONL hybrid storage
 * - Incremental build: Only process changed files
 */
```

## Module Specification Framework

### 7-Aspect Specification

모든 모듈은 7가지 관점으로 정의:

| Aspect | Description | Example |
|--------|-------------|---------|
| **Purpose** | 존재 이유 | Symbol database builder |
| **Input** | 매개변수, 제약 | Source directory path |
| **Output** | 반환값, 결과 | symbols.db, registry.jsonl |
| **Context** | 의존성 | DatabaseManager, ConfigManager |
| **Logic** | 알고리즘 | AST traversal + TSDoc parsing |
| **Effect** | 부수 효과 | File system writes |
| **Scope** | 공개 인터페이스 | execute(args: string[]) |

## Work Context Output

### work-context 명령어 결과 형식

```
tsdoc-edge work-context src/commands/BuildCommand.ts
```

**출력 정보**:
- Symbols: 11개 (5 exported, 5 public)
- Relationships: 146개 (density: 13.27)
- Test Coverage: 9.1% (10 tests)
- Documentation: 72.7% (8 docs)
- Dependencies: 13 files
- Impact: 1 dependent file (src/cli.ts)

### --llm 플래그

```
tsdoc-edge work-context src/commands/BuildCommand.ts --llm
```

AI 어시스턴트 친화적 JSON 형식 출력.

## Relationship Analysis Results

### relationship-clusters 결과

현재 프로젝트의 아키텍처 클러스터:

| Cluster | Size | Cohesion | Dominant Category |
|---------|------|----------|-------------------|
| 1 | 4 | 100.0% | semantic |
| 2 | 262 | 95.8% | semantic |
| 3 | 2,968 | 93.8% | semantic |
| 4 | 411 | 84.6% | semantic |
| 5 | 1,159 | ~80% | semantic |

**총계**: 7,341 symbols, 40,828 edges, 11 clusters

### relationship-metrics 인사이트

**아키텍처 인사이트**:
- 8 critical hubs (high degree + betweenness)
- 90 core components (many dependents)
- 361 hub symbols (2x avg degree)
- 376 bridge symbols (2x avg betweenness)

## Statistics Summary

### stats 명령어 결과

```
Total Symbols: 5,178
Documented: 3,947 (76.2%)
Undocumented: 1,231
DB Size: 50,340 KB
```

### health 명령어 결과

```
Overall Health: F (40/100)
- Documentation Quality: 67/100
- Test Coverage: 0/100

Total Symbols: 1,424
Documented: 1,120 (79%)
Files Needing Attention: 55
```

## CLI Commands Used

이 문서 작성에 활용된 명령어들:

| Command | Purpose | Result |
|---------|---------|--------|
| `build src` | Symbol DB 구축 | 352 symbols, 974 relationships |
| `index-docs managed` | 문서 심볼 인덱싱 | 249 definitions, 10,835 references |
| `analyze-all` | 관계 분석 | 20,947 relationships |
| `work-context` | 파일 컨텍스트 | 146 relationships |
| `stats` | 통계 확인 | 76.2% coverage |
| `health src` | 건강도 체크 | F grade (40/100) |
| `relationship-metrics` | 중요도 분석 | Top 10 symbols |
| `relationship-clusters` | 클러스터 분석 | 11 clusters |
| `doc-symbols` | 문서 심볼 목록 | 249 definitions |
| `find-unused-docs` | 미사용 문서 | 30 unused |

## Related Documents

- [[CoreWorkflow]] - 핵심 워크플로우
- [[DocumentSymbolSystem]] - 심볼 시스템 상세
- [[Relationship Ontology]] - 관계 타입 정의
- [[Module Specification Framework]] - 7관점 명세 프레임워크
- [[Work Context Workflow]] - 컨텍스트 워크플로우 가이드

---

**Last Updated**: 2025-12-09
**Generated Using**: TSDoc Edge v0.12.1

---

## Backlinks

### Referenced By

*이 섹션은 `tsdoc-edge update-backlinks` 실행 시 자동 업데이트됩니다.*
