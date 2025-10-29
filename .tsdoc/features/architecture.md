# TSDoc Edge - Architecture

**Status:** approved
**Author:** System
**Created:** 2025-10-29
**Tags:** architecture, overview

## Overview

TSDoc Edge는 TSDoc 주석 기반의 문서화 시스템으로, 코드의 **스펙**과 **의도**를 분리 관리합니다.

### 핵심 철학

1. **파싱 가능한 정보는 저장하지 않음** - 소스코드에서 추출 가능한 정보는 JSONL에 중복 저장하지 않음
2. **ID 기반 영구 참조** - 코드 리팩토링/이동에도 참조가 깨지지 않도록 영구 ID 부여
3. **개발 지식 중심** - 에러 경험, 설계 결정, 향후 계획 등 자동 추출 불가능한 지식만 기록

## Architecture Layers

```
┌──────────────────────────────────────────┐
│  Source Code (TypeScript + TSDoc)       │  ← 진실의 원천
│  - 실제 코드 구현                         │
│  - TSDoc 주석 (스펙, 계약, 책임)          │
├──────────────────────────────────────────┤
│  JSONL Registry (.tsdoc/registry.jsonl) │  ← Git 추적
│  - ID ↔ 소스 위치 매핑                    │
│  - 의존성 관계 (수동 명시)                 │
├──────────────────────────────────────────┤
│  SQLite Database (*.db)                  │  ← 검색/쿼리 최적화
│  - 파싱 결과 + JSONL 통합                 │
│  - FTS(Full-Text Search) 인덱스          │
└──────────────────────────────────────────┘
```

## Core Components

### 1. ID Management System

**Purpose:** 심볼에 영구적인 3-5글자 ID 부여

**Components:**
- `{000}` - IdGenerator: 순차 ID 생성 (000, 001, 002...)
- `{001}` - SymbolRegistryManager: JSONL 읽기/쓰기, ID 조회

**Workflow:**
```
Developer writes new code
  ↓
tsdoc-edge id new <file> <symbol>
  ↓
ID generated (e.g., 005)
  ↓
Add @id 005 to TSDoc comment
  ↓
{001} saves mapping to registry.jsonl
```

**Design Decision:** 순차 ID 방식 선택
- **Reason:** 랜덤보다 예측 가능하고 정렬 용이
- **Capacity:** 46,656개 심볼 (000~zzz)

### 2. TSDoc Parsing System

**Purpose:** TypeScript 소스코드에서 TSDoc 주석 추출

**Components:**
- `{002}` - TSDocParser: AST 순회 + TSDoc 파싱

**Supported Tags:**
- `@id` - 심볼 ID
- `@uses` - 의존성 명시
- `@contract` - 계약 스펙
- `@precondition` / `@postcondition` - 사전/사후 조건
- `@responsibility` - 책임 정의

**Flow:**
```
Source Code (.ts)
  ↓
TypeScript Compiler API → AST
  ↓
{002} extracts JSDoc comments
  ↓
Microsoft TSDoc Parser
  ↓
ParsedDocComment objects
```

### 3. Dependency Tracking System

**Purpose:** TSDoc 기반 수동 의존성 명시 및 관리

**Why Manual?** 정적 분석은 100% 정확하지 않음. 개발자가 **왜** 의존하는지 명시하는 것이 더 가치 있음.

**Components:**
- `{001}` - addDependency(), getDependencies(), getUsedBy()

**Usage:**
```typescript
/**
 * @id 003
 * @uses 002 - Parse TSDoc before validation
 * @uses 004 - Store results in database
 */
class Validator {
  constructor(
    private parser: TSDocParser,  // 002
    private db: DatabaseManager    // 004
  ) {}
}
```

**CLI:**
```bash
tsdoc-edge deps 003      # 003이 의존하는 것들
tsdoc-edge used-by 002   # 002를 사용하는 것들
tsdoc-edge orphans       # 고아 심볼 탐지
```

### 4. Database Management

**Purpose:** 파싱 결과와 JSONL 메타데이터를 SQLite DB로 통합

**Components:**
- `{004}` - DatabaseManager: SQLite CRUD, FTS 인덱스

**Schema Highlights:**
- `symbols` - 심볼 메타데이터
- `symbols_fts` - 전문 검색 인덱스
- `enhanced_docs` - 6가지 카테고리 문서
- `relationships` - 심볼 간 관계

**Build Process:**
```
TSDoc Parsing → Symbol objects
JSONL Registry → Metadata
  ↓
Merge
  ↓
{004} inserts into SQLite
  ↓
Query & Search available
```

## Lifecycle

```
┌─────────────────────────────────────────────┐
│ 1. Developer writes code + TSDoc           │
│    @id 005                                  │
│    @uses 002 - reason                       │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ 2. ID Registration                          │
│    tsdoc-edge id new src/file.ts Symbol     │
│    → 005 saved to registry.jsonl            │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ 3. Parsing (on demand)                      │
│    {002} parses .ts files                   │
│    Extract @id, @uses, @contract, etc.      │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ 4. Database Build                           │
│    registry.jsonl + parsed docs             │
│    → {004} merges into SQLite               │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ 5. Query & Analysis                         │
│    tsdoc-edge deps 005                      │
│    tsdoc-edge orphans                       │
└─────────────────────────────────────────────┘
```

## Design Decisions

### DD-001: JSONL vs JSON
- **Decision:** JSONL (한 줄 = 하나의 레코드)
- **Reason:** Git diff 명확, 병합 충돌 최소화
- **Format:**
  ```jsonl
  {"version":"1.0.0","idGeneratorMode":"sequential"}
  {"id":"000","sourceRef":{...}}
  {"id":"001","sourceRef":{...}}
  ```

### DD-002: Sequential ID vs Random ID
- **Decision:** Sequential (000, 001, 002...)
- **Reason:** 예측 가능, 정렬 용이, 충돌 없음
- **Alternatives Considered:**
  - Random (a3f, p7r): 충돌 가능성, 정렬 어려움
  - UUID: 너무 길어서 사람이 기억하기 어려움

### DD-003: Manual Dependency vs Static Analysis
- **Decision:** TSDoc `@uses` 태그로 수동 명시
- **Reason:**
  - 정적 분석은 동적 import, re-export 처리 어려움
  - **왜** 의존하는지가 더 중요한 정보
  - 프로젝트 철학과 일관성 (지식 중심)

### DD-004: SQLite vs PostgreSQL
- **Decision:** SQLite (임베디드)
- **Reason:**
  - 설치 불필요, 파일 기반
  - FTS5 지원으로 전문 검색 가능
  - 로컬 개발에 적합

## Future Directions

1. **Feature Document System** (진행 중)
   - 큰 그림 문서에서 심볼 참조 `{005}`
   - 마크다운 렌더링 시 링크로 변환

2. **IDE Integration**
   - VSCode extension
   - `@id` hover → 심볼 정보 표시
   - Go to definition by ID

3. **Documentation Generation**
   - Feature docs + TSDoc → 통합 문서
   - API 문서 자동 생성

4. **Validation**
   - TSDoc 규칙 위반 감지
   - 의도된 아키텍처 vs 실제 코드 drift 검출
