---
title: storage-system
type: system
category: core
status: active
canonical: true
---

# [[Storage System]]

> SQLite + JSONL 하이브리드 저장소로 빠른 조회와 버전 관리 동시 지원

---

## 개요

Storage System은 심볼, 문서, 관계 데이터를 영속화하는 하이브리드 저장소입니다. SQLite로 빠른 조회를, JSONL로 Git 친화적인 버전 관리를 지원합니다.

**핵심 가치**: O(log n) 조회 + FTS5 전문 검색 + Git diff 가능한 포맷

---

## Module Specification

### Purpose
심볼 및 관계 데이터의 영속화, 빠른 검색, 버전 관리 지원

### Input
- `Symbol[]`: 저장할 심볼 목록
- `EnhancedSymbolDoc[]`: 확장 문서
- `UnifiedRelationship[]`: 관계 데이터
- `SymbolRegistryEntry[]`: ID 레지스트리 항목

### Output
- 영속화된 데이터베이스 (`.tsdoc/symbols.db`)
- JSONL 레지스트리 (`.tsdoc/registry.jsonl`)
- 검색 결과

### Context
- better-sqlite3 사용 (동기 API)
- FTS5 전문 검색 활성화
- ACID 트랜잭션 보장

### Logic
```
1. 초기화 → 스키마 생성 및 인덱스 구축
2. 삽입 → 트랜잭션으로 배치 삽입
3. 검색 → 인덱스 또는 FTS5 활용
4. 동기화 → JSONL ↔ SQLite 양방향 변환
```

### Effect
- 파일 시스템 쓰기 (DB, JSONL)
- 인덱스 갱신

### Scope
- `DatabaseManager`: SQLite 관리
- `SymbolRegistryManager`: JSONL 레지스트리

---

## 핵심 컴포넌트

### [[DatabaseManager]]

SQLite 데이터베이스 관리

```typescript
/**
 * @doc [[Storage System]]
 * @functionality 심볼/문서/관계 저장, FTS5 검색, CRUD 작업
 * @depends better-sqlite3
 * @depType runtime
 * @depReason SQLite 네이티브 바인딩
 */
class DatabaseManager {
  constructor(dbPath?: string, jsonlPath?: string)
  initializeSchema(): void
  insertSymbol(symbol: Symbol): void
  insertEnhancedDoc(doc: EnhancedSymbolDoc): void
  insertRelationships(relationships: UnifiedRelationship[]): void
  searchSymbols(query: string): Symbol[]
  exportToJsonl(): void
  importFromJsonl(): void
  getCoverageData(symbolId: string): Coverage | null
}
```

**Source**: `src/storage/DatabaseManager.ts`

### [[SymbolRegistryManager]]

심볼 ID 레지스트리 (JSONL)

```typescript
/**
 * @doc [[Storage System]]
 * @problem 심볼 ID의 일관성 및 추적
 * @solves 중앙 집중식 ID 레지스트리
 * @context Git 병합 가능한 JSONL 포맷
 */
class SymbolRegistryManager {
  registerSymbol(entry: SymbolRegistryEntry): void
  getEntry(id: string): SymbolRegistryEntry | null
  search(query: string): SymbolRegistryEntry[]
  save(): void
  load(): SymbolRegistry
  generateNewId(prefix?: string): string
}
```

**Source**: `src/storage/SymbolRegistryManager.ts`

---

## 데이터베이스 스키마

### symbols 테이블

```sql
CREATE TABLE symbols (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  line INTEGER NOT NULL,
  column INTEGER NOT NULL,
  is_exported INTEGER NOT NULL,
  is_public INTEGER NOT NULL,
  summary TEXT
);

CREATE INDEX idx_symbols_name ON symbols(name);
CREATE INDEX idx_symbols_file ON symbols(file_path);
CREATE INDEX idx_symbols_type ON symbols(type);
```

### enhanced_docs 테이블

```sql
CREATE TABLE enhanced_docs (
  symbol_id TEXT PRIMARY KEY,
  problem_solving TEXT,      -- JSON
  functionality TEXT,        -- JSON
  error_experiences TEXT,    -- JSON
  decisions TEXT,            -- JSON
  dependencies TEXT,         -- JSON
  future_plans TEXT,         -- JSON
  FOREIGN KEY (symbol_id) REFERENCES symbols(id)
);
```

### relationships 테이블 (FTS5)

```sql
CREATE VIRTUAL TABLE relationships USING fts5(
  id,
  type,
  category,
  from_symbol,
  to_symbol,
  direction,
  strength,
  evidence,
  discovered_by,
  confidence,
  properties
);
```

### coverage 테이블

```sql
CREATE TABLE coverage (
  symbol_id TEXT PRIMARY KEY,
  line_coverage REAL,
  branch_coverage REAL,
  function_coverage REAL,
  statement_coverage REAL,
  covered_lines TEXT,        -- JSON array
  uncovered_lines TEXT,      -- JSON array
  FOREIGN KEY (symbol_id) REFERENCES symbols(id)
);
```

---

## JSONL 레지스트리 구조

### 파일 형식

```jsonl
{"version":"1.0.0","idGeneratorMode":"sequential","nextSequentialId":100}
{"id":"user-service","source":{"file":"src/services/UserService.ts","line":10},"qualified":"UserService","depth":1,"createdAt":"2024-01-15T10:00:00Z"}
{"id":"user-repository","source":{"file":"src/repositories/UserRepository.ts","line":5},"qualified":"UserRepository","depth":1,"createdAt":"2024-01-15T10:00:00Z"}
```

### SymbolRegistryEntry

```typescript
interface SymbolRegistryEntry {
  id: string                 // 고유 ID (kebab-case)
  source: {
    file: string             // 소스 파일 경로
    line: number             // 정의 라인
  }
  qualified?: string         // 정규화된 이름
  depth?: number             // 중첩 깊이
  dependencies?: Array<{     // 의존성 목록
    targetId: string
    type: string
  }>
  createdAt: string          // 생성 시각
  updatedAt: string          // 수정 시각
}
```

---

## 설계 의사결정

### ADR-005: Hybrid Storage Strategy]]

```
@decision SQLite + JSONL 하이브리드 저장소
@rationale
  - SQLite: O(log n) 조회, FTS5 검색, ACID 보장
  - JSONL: Git diff 가능, 병합 용이, 사람이 읽을 수 있음
  - 양쪽 장점 활용
@consequences
  - 동기화 로직 필요
  - 저장 공간 2배 사용
  - 양방향 변환 지원
```

### ADR-006: Synchronous SQLite]]

```
@decision better-sqlite3 (동기 API) 사용
@rationale
  - CLI 도구 특성상 동기 I/O가 적합
  - 코드 단순화
  - 트랜잭션 관리 용이
@consequences
  - 대용량 작업 시 블로킹
  - Node.js 워커 스레드 고려 가능
```

---

## 사용 시나리오

### 시나리오 1: 데이터베이스 초기화

```typescript
import { DatabaseManager } from './storage/DatabaseManager';

const db = new DatabaseManager('.tsdoc/symbols.db', '.tsdoc/registry.jsonl');
db.initializeSchema();
```

### 시나리오 2: 심볼 저장 및 검색

```typescript
// 심볼 저장
db.insertSymbol({
  id: 'user-service',
  name: 'UserService',
  type: 'class',
  filePath: 'src/services/UserService.ts',
  // ...
});

// 전문 검색
const results = db.searchSymbols('User');
console.log(`${results.length}개 심볼 발견`);
```

### 시나리오 3: JSONL 동기화

```typescript
// SQLite → JSONL 내보내기
db.exportToJsonl();

// JSONL → SQLite 가져오기
db.importFromJsonl();
```

### 시나리오 4: ID 레지스트리 관리

```typescript
import { SymbolRegistryManager } from './storage/SymbolRegistryManager';

const registry = new SymbolRegistryManager('.tsdoc/registry.jsonl');
registry.load();

// 새 ID 생성
const newId = registry.generateNewId('auth');  // 'auth-001'

// 심볼 등록
registry.registerSymbol({
  id: newId,
  source: { file: 'src/auth/AuthService.ts', line: 10 },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

registry.save();
```

---

## 저장 경로

| 경로 | 용도 | Git 추적 |
|------|------|----------|
| `.tsdoc/symbols.db` | SQLite 데이터베이스 | No |
| `.tsdoc/registry.jsonl` | ID 레지스트리 | No |
| `.tsdoc/doc-symbols.json` | 문서 심볼 캐시 | No |
| `.tsdoc/data/` | 분석 데이터 | No |

> `.gitignore`에 `.tsdoc/` 추가 권장

---

## 관련 시스템

- [[Symbol Graph System]] - 저장할 그래프 데이터 제공
- [[Parser System]] - 파싱 결과 저장
- [[Analyzer System]] - 분석 결과 저장
- [[Document Symbol System]] - 문서 심볼 캐시

---

## CLI 명령어

| 명령어 | 설명 |
|--------|------|
| `tsdoc-edge init` | 저장소 초기화 |
| `tsdoc-edge build <src>` | 심볼 빌드 및 저장 |
| `tsdoc-edge stats` | 저장소 통계 |
| `tsdoc-edge export` | 데이터 내보내기 |

---

## Backlinks

### Referenced By

- [[Analyzer System]] → /Users/junwoobang/workflow/tsdoc-edge/managed/core/analyzer-system.md:34
- [[Analyzer System]] → /Users/junwoobang/workflow/tsdoc-edge/managed/core/analyzer-system.md:234
- [[Parser System]] → /Users/junwoobang/workflow/tsdoc-edge/managed/core/parser-system.md:181
- [[Spec Management System]] → /Users/junwoobang/workflow/tsdoc-edge/managed/core/spec-management-system.md:188
- [[Symbol Graph System]] → /Users/junwoobang/workflow/tsdoc-edge/managed/core/symbol-graph.md:31
- [[Symbol Graph System]] → /Users/junwoobang/workflow/tsdoc-edge/managed/core/symbol-graph.md:119

