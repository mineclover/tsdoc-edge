# ID Management System

**Status:** approved
**Author:** System
**Created:** 2025-10-29
**Tags:** id, registry, core

## Purpose

심볼에 **영구적인 식별자**를 부여하여 코드 리팩토링, 파일 이동, 이름 변경에도
참조가 깨지지 않도록 합니다.

## Problem Statement

전통적인 문서화 시스템의 문제:
```typescript
// 기존 방식: 파일 경로 + 심볼 이름으로 참조
See: src/parser/TSDocParser.ts#TSDocParser

// 문제 1: 파일 이동 시 참조 깨짐
// src/parser → lib/parsing으로 이동

// 문제 2: 이름 변경 시 참조 깨짐
// TSDocParser → DocumentParser로 리네임

// 문제 3: 모든 참조를 수동으로 업데이트 필요
```

## Solution: Permanent ID System

```typescript
/**
 * @id 000
 */
class TSDocParser { }

// 어디서든 ID로 참조
// Feature doc: {000} 사용
// TSDoc: @uses 000 - ...
// CLI: tsdoc-edge find 000
```

**장점:**
- ID는 영구적 (코드가 어디로 이동하든 유지)
- Registry에서 항상 최신 위치 추적
- 참조 업데이트 자동화

## Core Components

### IdGenerator `{000}`

**Responsibility:** 중복 없는 순차 ID 생성

**Implementation:**
```typescript
class IdGenerator {
  private mode: 'sequential' | 'random';
  private charset: string; // 0-9a-z (36 chars)
  private length: number;  // 3-5

  generate(): string {
    // 000, 001, 002, ..., 00z, 010, ...
  }
}
```

**Capacity:**
- 3글자: 46,656개 (36³)
- 4글자: 1,679,616개 (36⁴)
- 5글자: 60,466,176개 (36⁵)

**Why Sequential?**
| 방식 | 장점 | 단점 |
|------|------|------|
| Sequential | 예측 가능, 정렬 용이, 충돌 없음 | 순서 노출 |
| Random | 순서 숨김 | 충돌 가능, 정렬 어려움 |
| UUID | 완전 고유 | 너무 길어서 사람이 사용하기 어려움 |

**Decision:** Sequential 선택
- 이 프로젝트는 오픈 소스이므로 순서 노출 문제 없음
- 사람이 기억하고 타이핑하기 쉬워야 함 (000, 001, ...)

### SymbolRegistryManager `{001}`

**Responsibility:** JSONL 파일로 ID-to-Symbol 매핑 관리

**Storage Format (JSONL):**
```jsonl
{"version":"1.0.0","idGeneratorMode":"sequential","totalEntries":5}
{"id":"000","sourceRef":{"filePath":"src/utils/IdGenerator.ts","symbolName":"IdGenerator"},"createdAt":"...","updatedAt":"..."}
{"id":"001","sourceRef":{"filePath":"src/storage/SymbolRegistryManager.ts","symbolName":"SymbolRegistryManager"},"createdAt":"..."}
```

**Why JSONL?**
- Git-friendly: 한 줄 = 하나의 심볼
- Diff 명확: 새 심볼 추가 시 한 줄만 추가됨
- Merge 충돌 최소화
- Append-only 구조에 적합

**API:**

```typescript
class SymbolRegistryManager {
  // ID 등록
  register(sourceRef: SourceRef): string;

  // ID로 찾기
  findById(id: string): SymbolRegistryEntry;

  // 소스로 찾기
  findBySourceRef(sourceRef: SourceRef): SymbolRegistryEntry;

  // 위치 업데이트 (리팩토링 시)
  updateSourceRef(id: string, newSourceRef: SourceRef): boolean;

  // 의존성 관리
  addDependency(fromId: string, toId: string, reason: string): boolean;
  getDependencies(id: string): DependencyRelation[];
  getUsedBy(id: string): Array<{fromId, reason}>;

  // 분석
  findOrphans(): string[];
  getDependencyGraph(): Map<string, string[]>;
}
```

## CLI Usage

### 1. 새 ID 생성
```bash
$ tsdoc-edge id new src/parser/TSDocParser.ts TSDocParser
✅ ID generated:

  ID: 000
  File: src/parser/TSDocParser.ts
  Symbol: TSDocParser

Add this to your TSDoc comment:
  @id 000
```

### 2. ID 목록 조회
```bash
$ tsdoc-edge id list
Symbol Registry

Total entries: 5

000 → src/utils/IdGenerator.ts:IdGenerator
001 → src/storage/SymbolRegistryManager.ts:SymbolRegistryManager
002 → src/parser/TSDocParser.ts:TSDocParser
003 → src/validator/ConventionValidator.ts:ConventionValidator
004 → src/storage/DatabaseManager.ts:DatabaseManager
```

### 3. ID로 심볼 찾기
```bash
$ tsdoc-edge id find 000
Symbol: 000

ID: 000
File: src/utils/IdGenerator.ts
Symbol: IdGenerator
Type: class
Created: 2025-10-29T11:57:01.444Z
Updated: 2025-10-29T11:57:01.444Z
```

### 4. 통계
```bash
$ tsdoc-edge id stats
Registry Statistics

Total Entries: 5
Files: 5
Tags: 0

ID Generator Stats:
  Mode: sequential
  Length: 3 chars
  Used: 5
  Capacity: 46656
  Utilization: 0.01%
```

## Workflow

### Initial Registration

```
Developer creates new class/function
  ↓
$ tsdoc-edge id new src/utils/Helper.ts Helper
  ↓
ID 005 generated
  ↓
{001} saves to .tsdoc/registry.jsonl:
  {"id":"005","sourceRef":{"filePath":"src/utils/Helper.ts","symbolName":"Helper"},...}
  ↓
Developer adds to TSDoc:
  /**
   * @id 005
   */
  class Helper { }
  ↓
Git commit (registry.jsonl tracked)
```

### Refactoring (File Move)

```
Developer moves file:
  src/utils/Helper.ts → lib/helpers/Helper.ts
  ↓
Option 1 (Manual):
  $ tsdoc-edge id update 005 lib/helpers/Helper.ts Helper
  ↓
Option 2 (Future: Auto-detect):
  $ tsdoc-edge sync
  → Scans for @id tags
  → Updates registry automatically
  ↓
{001} updates registry.jsonl:
  {"id":"005","sourceRef":{"filePath":"lib/helpers/Helper.ts",...},"updatedAt":"..."}
  ↓
All references still work:
  - Feature docs: {005}
  - TSDoc: @uses 005
  - CLI: tsdoc-edge find 005
```

## Best Practices

### 1. ID는 코드 작성 시점에 부여
```bash
# ✅ Good: 코드 작성하자마자 ID 생성
$ tsdoc-edge id new src/parser/NewParser.ts NewParser
# → 000 generated
# → Add @id 000 to TSDoc immediately

# ❌ Bad: 나중에 한꺼번에 ID 부여
# → Git history에서 언제 만들어졌는지 추적 어려움
```

### 2. @id는 항상 첫 번째 태그
```typescript
// ✅ Good
/**
 * @id 005
 * @public
 * @param x - value
 */

// ❌ Bad (찾기 어려움)
/**
 * @public
 * @param x - value
 * @id 005
 */
```

### 3. Registry는 항상 Git 추적
```bash
# .gitignore
*.db           # SQLite DB는 제외
*.jsonl.bak    # 백업 제외

# Git에 포함
.tsdoc/registry.jsonl  # ✅ 반드시 커밋
```

### 4. 정기적인 Orphan 검사
```bash
# CI/CD에서 실행
$ tsdoc-edge orphans

# 고아 심볼 발견 시 조치:
# - 사용하지 않으면 삭제
# - 또는 의존성 추가
```

## Data Integrity

### Validation Rules

1. **ID Uniqueness:** 동일 ID는 단 하나의 심볼만
2. **Source Existence:** filePath가 실제 존재해야 함
3. **Dependency Validity:** uses/usedBy의 targetId가 registry에 존재해야 함

### Repair Commands (Future)

```bash
# Registry 검증
$ tsdoc-edge validate
⚠️  Issues found:
  - 007: File not found (src/old/Removed.ts)
  - 008: Depends on non-existent 999

# 자동 복구
$ tsdoc-edge repair
✅ Removed orphaned entry 007
✅ Removed invalid dependency 008 → 999
```

## Integration Points

### With TSDoc Parser `{002}`
```typescript
// 파싱 시 @id 태그 추출
const idTag = comment.customBlocks.find(b => b.tagName === '@id');
const id = extractText(idTag);

// Registry에서 검증
const entry = registry.findById(id);
if (!entry) {
  warn(`ID ${id} not in registry`);
}
```

### With Dependency Tracking
```typescript
// @uses 태그 파싱 시
/**
 * @id 003
 * @uses 002 - Parse before validation
 */

// Registry에 의존성 저장
registry.addDependency('003', '002', 'Parse before validation');
```

### With Feature Documents
```markdown
# Architecture

The system uses {000} to generate IDs and {001} to manage the registry.
```

렌더링 시 → `{000}` → `[IdGenerator](src/utils/IdGenerator.ts:25)`

## Performance Considerations

- **In-memory cache:** 전체 registry를 메모리에 로드 (5000개 심볼 ≈ 1MB)
- **Lazy loading:** JSONL은 읽기만, 쓰기는 save() 호출 시
- **Indexing:** ID로 O(1) 조회 (Map 사용)

## Limitations

1. **Cross-repo references:** 현재는 단일 저장소만 지원
2. **Rename detection:** 심볼 이름 변경 시 수동 업데이트 필요
3. **Max symbols:** 3글자 기준 46,656개 제한
