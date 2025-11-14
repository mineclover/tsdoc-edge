# [[Context Quality Improvements]]

## Purpose

TSDoc Edge 컨텍스트 품질 개선 작업 기록 - work-context 명령어 고도화 및 데이터 일관성 개선.

**Date**: 2025-11-12

## Context

작업자가 파일을 수정하기 전에 필요한 모든 컨텍스트를 제공하는 것이 TSDoc Edge의 핵심 목표입니다. 이를 위해 `work-context` 명령어가 제공하는 정보의 품질과 정확성을 점검하고 개선했습니다.

## Problems Identified

### 1. **WorkContextCommand가 구식 테이블 사용** ❌

**증상**:
```bash
tsdoc-edge work-context src/commands/RelationshipPathCommand.ts
```
```
🔗 의존 타입 (0개)
  No dependencies found
```

**원인**:
- `dependencies` 테이블 (962 rows) 사용
- `unified_relationships` 테이블 (40,762 rows) 미사용
- 결과: 의존 타입 정보가 제대로 표시되지 않음

**영향도**: 🔴 Critical - 핵심 기능 장애

### 2. **고아 관계 276개 존재** ⚠️

**증상**:
```sql
SELECT COUNT(*) FROM unified_relationships r
WHERE NOT EXISTS (
  SELECT 1 FROM symbols s
  WHERE json_extract(r.from_symbols, '$[0]') = s.id
)
-- Result: 276 orphan relationships
```

**원인**:
- `test:파일경로` 형식의 가상 심볼 사용
- 테스트 커버리지 관계에서 발생
- 가상 심볼이 `symbols` 테이블에 없음

**판단**: 설계상 의도된 것 - 테스트 파일은 별도 관리

**영향도**: 🟡 Low - 데이터 품질 체크에서만 오해

### 3. **증분 빌드 시 관계 스킵** ⚠️

**증상**:
```
Files scanned: 1
Relationships found: 19
Relationships inserted: 0
⚠ Errors (19):
  Relationship skipped: WorkContextCommand -> BaseCommand (symbols not found)
```

**원인**:
- 증분 빌드 시 수정된 파일만 스캔
- 다른 파일의 심볼이 메모리에 로드되지 않음
- 관계 생성 실패

**영향도**: 🟡 Medium - 관계 갱신이 지연될 수 있음

## Solutions Implemented

### 1. ✅ WorkContextCommand 개선

**File**: `src/commands/WorkContextCommand.ts`

**Changes**:

#### Before (구식 테이블 사용):
```typescript
// 의존성 추출
const dependencyRows = dbManager.db.prepare(`
  SELECT DISTINCT s.name, s.type, s.file_path
  FROM dependencies d
  INNER JOIN symbols s ON d.target = s.id
  WHERE d.symbol_id IN (${placeholder})
`).all(...symbolIds);
```

#### After (unified_relationships 사용):
```typescript
// unified_relationships에서 structural/behavioral 관계 쿼리
const relationshipRows = dbManager.db.prepare(`
  SELECT DISTINCT r.to_symbols, r.type, r.category
  FROM unified_relationships r
  WHERE r.category IN ('structural', 'behavioral')
    AND json_valid(r.from_symbols)
    AND EXISTS (
      SELECT 1 FROM json_each(r.from_symbols) je
      WHERE je.value IN (${placeholder})
    )
`).all(...symbolIds);

// JSON 배열에서 타겟 심볼 추출
const targetIds = new Set<string>();
for (const row of relationshipRows) {
  const toSymbols = JSON.parse(row.to_symbols);
  for (const target of toSymbols) {
    if (target) targetIds.add(target);
  }
}

// 심볼 정보 조회
const dependencyRows = dbManager.db.prepare(`
  SELECT DISTINCT s.id, s.name, s.type, s.file_path
  FROM symbols s
  WHERE s.id IN (${targetPlaceholder})
    AND s.file_path != ?
`).all(...Array.from(targetIds), relativePath);
```

**Result**:
- 의존 타입: **0개 → 17개** (RelationshipPathCommand 기준)
- 영향 범위: **정확한 파일만 표시** (이전에는 관련 없는 변수들 나열)

#### UsedBy (영향 범위) 개선:

동일한 방식으로 `usedBy` 쿼리도 `unified_relationships`를 사용하도록 수정:

```typescript
// from_symbols에서 이 파일의 심볼을 참조하는 관계 찾기
const relationshipRows = dbManager.db.prepare(`
  SELECT DISTINCT r.from_symbols, r.type, r.category
  FROM unified_relationships r
  WHERE r.category IN ('structural', 'behavioral')
    AND json_valid(r.to_symbols)
    AND EXISTS (
      SELECT 1 FROM json_each(r.to_symbols) je
      WHERE je.value IN (${placeholder})
    )
`).all(...symbolIds);
```

### 2. ✅ 고아 관계 분석 및 문서화

**Analysis Results**:
- 276개 모두 `test-coverage` 타입
- `test-analysis`에서 발견됨
- 32개의 고유한 테스트 파일 심볼

**Decision**: 고아 관계 허용
- 테스트 파일 심볼은 가상 심볼로 설계됨
- 참조 무결성 체크에서 `test:` 접두사 제외

### 3. ⚠️ 증분 빌드 제한사항 문서화

**Current Behavior**:
- 수정된 파일만 스캔 ✅ (성능 최적화)
- 심볼 정보는 갱신됨 ✅
- 관계 정보는 전체 빌드에서만 완전히 갱신 ⚠️

**Recommendation**:
- 주요 변경 후 전체 빌드 실행
- 또는: 관계 갱신 로직 개선 (향후)

## Verification

### Test 1: work-context 의존성 표시

**Before**:
```bash
$ tsdoc-edge work-context src/commands/RelationshipPathCommand.ts
🔗 의존 타입 (0개)
  No dependencies found
```

**After**:
```bash
$ tsdoc-edge work-context src/commands/RelationshipPathCommand.ts
🔗 의존 타입 (17개)
  CommandResult        ✅ → src/commands/BaseCommand.ts
  BaseCommand.displayHelp ✅ → src/commands/BaseCommand.ts
  BaseCommand.executeWithErrorHandling ✅ → src/commands/BaseCommand.ts
  ...
```

### Test 2: work-context 영향 범위

**Before**:
```
⚠️ 영향 범위 (13개 파일이 이 파일 사용)
  args → src/cli.ts
  configPath → src/cli.ts
  configIndex → src/cli.ts
  ...
```

**After**:
```
⚠️ 영향 범위 (1개 파일이 이 파일 사용)
  AnalyzeTypesCommand → src/commands/AnalyzeTypesCommand.ts

  ⚠️ 수정 시 위 1개 파일 영향 받음
```

### Test 3: 데이터베이스 품질

**Metrics**:
- ✅ 중복 관계 패턴: 0개
- ✅ 심볼 ID 충돌: 0개
- ✅ 고빈도 중복: 0개
- ⚠️ 고아 관계: 276개 (설계상 의도됨)

**Query Performance**:
- 전체 빌드: ~5-10초 (2,388 symbols, 40,762 relationships)
- 증분 빌드: ~300ms (1 file)
- work-context: ~200ms (1 file)

## Performance Impact

### Before:
```
work-context 쿼리 시간: ~50ms
의존성 발견: 0개 (dependencies 테이블만)
관계 정보: 부정확
```

### After:
```
work-context 쿼리 시간: ~200ms (+150ms)
의존성 발견: 17개 (unified_relationships 사용)
관계 정보: 정확
```

**Trade-off**: 쿼리 시간은 4배 증가했지만, 정확도가 극적으로 개선됨. 200ms는 여전히 충분히 빠름.

## Decisions

### 1. **unified_relationships를 SSOT로 사용**

**Rationale**:
- 40,762 relationships vs 962 dependencies
- 모든 관계 타입 포함 (type-dependency, code-dependency, calls, composition 등)
- 신뢰도 및 증거 정보 포함

**Trade-off**: 쿼리 복잡도 증가 (JSON 파싱 필요)

### 2. **고아 관계 허용 (test: 심볼)**

**Rationale**:
- 테스트 파일 심볼은 가상 심볼로 설계됨
- symbols 테이블에 없는 것이 정상
- 참조 무결성 체크에서 제외

### 3. **증분 빌드 제한사항 문서화**

**Rationale**:
- 증분 빌드의 성능 이점 유지
- 전체 빌드로 완전성 보장
- 사용자에게 명확한 가이드 제공

## Future Enhancements

### 1. **증분 빌드 관계 갱신 개선**

**Problem**: 증분 빌드 시 관계가 스킵됨

**Solution Options**:
1. 전체 심볼 그래프를 메모리에 로드 (메모리 트레이드오프)
2. 관계 갱신을 별도 단계로 분리
3. 점진적 관계 갱신 (복잡도 증가)

### 2. **테스트 파일 심볼 정식 등록**

**Problem**: `test:` 가상 심볼이 symbols 테이블에 없음

**Solution**: 테스트 파일도 symbols 테이블에 등록
- 타입: `test-file`
- 파일 경로 유지
- 참조 무결성 보장

### 3. **work-context 캐싱**

**Problem**: 동일 파일 반복 조회 시 매번 200ms

**Solution**: 컨텍스트 결과 캐싱
- File hash 기반 무효화
- 메모리 사용량 vs 성능 트레이드오프

## Related

- [[Work Context Workflow]]: work-context 명령어 워크플로우
- [[WorkContextCommand]]: 구현 상세
- [[UnifiedRelationship]]: 관계 데이터 모델
- [[DatabaseManager]]: 데이터베이스 관리

## Links

- Commit: feat: Update WorkContextCommand to use unified_relationships table
- Source: src/commands/WorkContextCommand.ts:230-359

---

## Backlinks

### Referenced By

- [[Codebase Health Report]] → /home/user/tsdoc-edge/managed/features/codebase-health-report.md:155
- [[Codebase Health Report]] → /home/user/tsdoc-edge/managed/features/codebase-health-report.md:340

