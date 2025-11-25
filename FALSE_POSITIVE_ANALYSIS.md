# 거짓 양성 (False Positives) 분석

## 문제 요약

고아 탐지에서 98개 파일이 실제로는 사용되는데도 "고아"로 잘못 플래그되는 문제가 발생했습니다.

## 근본 원인

### 1. 관계 데이터 이중 저장 구조

TSDoc Edge는 관계를 두 곳에 저장합니다:

**A. `registry.jsonl` (Legacy)**
```json
{
  "id": "symbol-id",
  "sourceRef": {...},
  "uses": ["dep1", "dep2"],  // ← 이 필드가 비어있음!
  "usedBy": []
}
```

**B. `unified_relationships` 테이블 (Current)**
```sql
CREATE TABLE unified_relationships (
  id TEXT PRIMARY KEY,
  type TEXT,
  fromSymbols TEXT,  -- JSON array
  toSymbols TEXT,    -- JSON array
  ...
)
```

### 2. BuildCommand 동작

`src/commands/BuildCommand.ts:287-300`:

```typescript
// Registry entry 생성 - uses 필드 없음!
const registryEntry = {
  id,
  sourceRef: {
    filePath: symbol.filePath,
    line: symbol.line,
    ...
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  // ❌ uses: [] 필드 없음!
};

// 관계는 unified_relationships에만 저장됨
dbManager.insertUnifiedRelationship({...});
```

### 3. OrphansCommand 동작

`src/commands/OrphansCommand.ts:91-92`:
```typescript
const manager = this.manager || new SymbolRegistryManager(registryPath);
const orphans = manager.findOrphans();  // ← registry.jsonl만 확인!
```

`src/storage/SymbolRegistryManager.ts:470-487`:
```typescript
findOrphans(): string[] {
  const orphans: string[] = [];

  for (const entry of this.registry.entries) {
    const hasDeps = (entry.uses?.length || 0) > 0;  // ← 항상 0!
    const isUsed = this.getUsedBy(entry.id).length > 0;  // ← registry.jsonl만 확인

    if (!hasDeps && !isUsed) {
      orphans.push(entry.id);  // ← 모두 고아로 표시됨
    }
  }

  return orphans;
}
```

### 4. 임포트 관계는 실제로 추적됨

`src/analyzer/ASTSymbolExtractor.ts:101-122`:

```typescript
private buildRelationshipsFromImports(): void {
  for (const symbol of this.symbols) {
    if (symbol.parentSymbol) continue;

    for (const importInfo of this.imports) {
      for (const importedName of importInfo.imported) {
        // ✅ 관계 생성됨!
        this.relationships.push({
          type: 'dependsOn',
          from: symbol.name,
          to: importedName,
          filePath: importInfo.from,
          description: `${symbol.name} imports ${importedName}...`,
        });
      }
    }
  }
}
```

이 관계들은 `unified_relationships` 테이블에 저장되지만, `findOrphans()`는 이를 확인하지 않습니다!

## 데이터 검증

### Unified Relationships 테이블 확인

```bash
$ sqlite3 .tsdoc/symbols.db "SELECT COUNT(*) FROM unified_relationships WHERE type = 'code-dependency'"
# 결과: 수천 개의 관계 존재
```

### Registry.jsonl 확인

```bash
$ cat .tsdoc/registry.jsonl | jq 'select(.uses != null) | .uses | length' | wc -l
# 결과: 0 (uses 필드를 가진 엔트리 없음)
```

## 해결 방안

### 옵션 1: OrphansCommand 개선 (권장)

`unified_relationships` 테이블을 쿼리하여 실제 관계 확인:

```typescript
// DatabaseManager를 사용하여 실제 관계 확인
async findOrphansFromDatabase(): Promise<string[]> {
  const db = this.getDb();

  // 들어오는 관계가 없는 심볼 찾기
  const orphans = db.prepare(`
    SELECT s.id
    FROM symbols s
    WHERE s.id NOT IN (
      SELECT DISTINCT json_each.value
      FROM unified_relationships,
      json_each(unified_relationships.toSymbols)
    )
    AND s.type NOT IN ('test-suite', 'test-case')
  `).all();

  return orphans.map(r => r.id);
}
```

**장점:**
- 모든 관계 소스를 고려 (static analysis, semantic analysis, etc.)
- analyze-all 명령어로 추가된 관계도 포함
- 더 정확한 고아 탐지

**단점:**
- DatabaseManager 의존성 필요
- registry.jsonl 독립성 상실

### 옵션 2: BuildCommand 수정

Registry entry에 uses 필드 추가:

```typescript
// 관계 수집 후 registry entry 업데이트
const symbolUses = allRelationships
  .filter(r => r.from === symbol.name)
  .map(r => symbolIdMap.get(r.to))
  .filter(Boolean);

const registryEntry = {
  id,
  sourceRef: {...},
  uses: symbolUses,  // ← 추가!
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
```

**장점:**
- registry.jsonl 독립성 유지
- 기존 OrphansCommand 수정 불필요

**단점:**
- analyze-all로 추가된 관계는 여전히 반영 안 됨
- 이중 저장 (unified_relationships + registry.jsonl)

### 옵션 3: Hybrid 접근 (최선)

OrphansCommand에 옵션 추가:

```typescript
async execute(args: string[]): Promise<CommandResult> {
  const useDatabase = args.includes('--accurate');

  if (useDatabase) {
    // unified_relationships 테이블 쿼리
    orphans = await this.findOrphansFromDatabase();
  } else {
    // 기존 방식 (빠르지만 부정확)
    orphans = manager.findOrphans();
  }
}
```

**장점:**
- 기존 동작 유지 (호환성)
- 정확한 탐지 옵션 제공
- 점진적 마이그레이션 가능

## 권장 사항

**즉시 조치:** 옵션 1 구현 - OrphansCommand를 unified_relationships 기반으로 변경

**근본 해결:** registry.jsonl 사용 중단 계획 수립
- unified_relationships만 사용
- registry.jsonl은 Git 추적용 백업으로만 유지

## 영향 분석

### 변경 전
- 고아로 표시: 1,474개 심볼 (많은 거짓 양성)
- 실제 고아: 13개 파일만

### 변경 후 (예상)
- 고아로 표시: ~13-50개 심볼 (실제 미사용 코드만)
- 거짓 양성: 0개

### 성능 영향
- Registry.jsonl 파싱: ~10ms
- Database 쿼리: ~50ms
- 허용 가능한 오버헤드 (정확도 향상 대비)
