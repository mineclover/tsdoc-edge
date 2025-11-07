---
tsdoc: managed
status: active
category: concept
tags:
  - reliability
  - verification
  - work-context
lastUpdated: 2025-11-07
---

# [[Work Context Reliability]]

## 개요

`work-context` 명령어가 제공하는 정보의 **신뢰도(Reliability)**를 검증 체인을 통해 보장하는 시스템입니다.

**핵심 원칙**: 모든 정보는 검증 가능해야 하며, 신뢰도를 측정하고 표시해야 합니다.

---

## 신뢰도 검증 체인

### 1. 📚 관련 문서 신뢰도

**제공 정보**:
- `@doc [[Symbol]]` 태그로 연결된 문서들

**검증 체인**:
```
@doc 태그 파싱
    ↓
validate-docs (문서 심볼 존재 확인)
    ↓
check-links (문서 내 링크 유효성)
    ↓
validate-spec (명세서 완성도 점수)
    ↓
✅ 신뢰도: 문서가 존재하고 품질이 보장됨
```

**신뢰도 점수**:
- ✅ **100%**: 문서 존재 + 링크 유효 + 완성도 70% 이상
- ⚠️  **50%**: 문서 존재하지만 품질 문제 (링크 깨짐, 낮은 완성도)
- ❌ **0%**: 문서 없음 (not found)

---

### 2. 🔗 의존 타입 신뢰도

**제공 정보**:
- 이 파일이 사용하는 타입들 (dependencies 테이블 쿼리)

**검증 체인**:
```
build (심볼 그래프 구축)
    ↓
dependencies 테이블 쿼리
    ↓
type-chain (타입 변환 체인 추적)
    ↓
detect-cycles (순환 참조 감지)
    ↓
✅ 신뢰도: 타입 관계가 정확하고 건강함
```

**신뢰도 점수**:
- ✅ **100%**: 모든 타입 존재 + 순환 참조 없음
- ⚠️  **70%**: 타입 존재하지만 순환 참조 있음 (경고)
- ⚠️  **50%**: 일부 타입 파일 없음 (broken dependency)
- ❌ **0%**: 데이터베이스 없음 (build 필요)

---

### 3. 🧪 테스트 신뢰도

**제공 정보**:
- 이 파일을 테스트하는 파일들 (test_mappings 테이블)

**검증 체인**:
```
sync-coverage (커버리지 데이터 동기화)
    ↓
test_mappings 테이블 쿼리
    ↓
test-relationships (테스트 매핑 검증)
    ↓
untested (테스트 누락 감지)
    ↓
✅ 신뢰도: 테스트가 실제로 코드를 검증함
```

**신뢰도 점수**:
- ✅ **100%**: 테스트 존재 + 커버리지 80% 이상
- ⚠️  **70%**: 테스트 존재 + 커버리지 50-80%
- ⚠️  **30%**: 테스트 존재 + 커버리지 50% 미만
- ❌ **0%**: 테스트 없음

---

### 4. ⚠️ 영향 범위 신뢰도

**제공 정보**:
- 이 파일을 사용하는 파일들 (역의존성 쿼리)

**검증 체인**:
```
build (역의존성 그래프 구축)
    ↓
dependencies WHERE target (역쿼리)
    ↓
who-uses (사용처 추적)
    ↓
analyze-chains (의존성 체인 분석)
    ↓
✅ 신뢰도: 영향 범위가 정확하게 추적됨
```

**신뢰도 점수**:
- ✅ **100%**: 모든 사용처 파일 존재 + 최신 빌드
- ⚠️  **70%**: 일부 사용처 파일 없음 (stale build)
- ❌ **0%**: 데이터베이스 없음 (build 필요)

---

## 전체 신뢰도 점수 계산

### 가중 평균

```typescript
totalReliability = (
  docsReliability * 0.3 +      // 30% 가중치
  depsReliability * 0.3 +      // 30% 가중치
  testsReliability * 0.2 +     // 20% 가중치
  impactReliability * 0.2      // 20% 가중치
)
```

**등급**:
- ✅ **Excellent** (90-100%): 모든 정보가 신뢰 가능
- 🟢 **Good** (70-89%): 대부분 신뢰 가능, 일부 개선 필요
- 🟡 **Fair** (50-69%): 부분적으로 신뢰 가능, 여러 문제 존재
- 🔴 **Poor** (0-49%): 신뢰 불가, 즉시 개선 필요

---

## 검증 실패 시 액션

### 문서 신뢰도 낮음
```bash
# 문제: @doc 태그의 문서가 없거나 품질 낮음
tsdoc-edge validate-docs           # 문제 진단
tsdoc-edge validate-spec managed/  # 완성도 확인
tsdoc-edge check-links             # 링크 검증

# 해결: 문서 작성 또는 개선
```

### 의존 타입 신뢰도 낮음
```bash
# 문제: 순환 참조, 깨진 의존성
tsdoc-edge detect-cycles           # 순환 참조 확인
tsdoc-edge type-chain A B          # 타입 체인 추적

# 해결: 리팩토링 또는 재빌드
tsdoc-edge build src
```

### 테스트 신뢰도 낮음
```bash
# 문제: 테스트 없음, 낮은 커버리지
tsdoc-edge untested                # 테스트 없는 심볼
tsdoc-edge sync-coverage           # 커버리지 동기화

# 해결: 테스트 작성
```

### 영향 범위 신뢰도 낮음
```bash
# 문제: 오래된 빌드, 깨진 참조
tsdoc-edge build src               # 재빌드
tsdoc-edge who-uses <symbol>       # 사용처 확인

# 해결: 빌드 업데이트
```

---

## work-context 출력에 신뢰도 표시

### 현재 출력 (v1)
```
📚 관련 문서 (2개)
  • [[User Management System]]
    → managed/features/user-management.md
```

### 신뢰도 추가 (v2)
```
📚 관련 문서 (2개) - 신뢰도: ✅ 85%
  • [[User Management System]]
    → managed/features/user-management.md
    ✅ 문서 존재, 완성도 90%, 링크 유효

  • [[Authentication Flow]]
    → (not found)
    ❌ 문서 없음 - validate-docs 실행 필요
```

### 섹션별 신뢰도 표시
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 전체 신뢰도: 🟢 Good (78%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📚 관련 문서:  ⚠️  50% (1/2 문서 누락)
  🔗 의존 타입:  ✅ 100% (모든 타입 정상)
  🧪 테스트:     ❌ 0% (테스트 없음)
  ⚠️  영향 범위:  ✅ 100% (최신 빌드)

💡 개선 제안:
  1. 테스트 작성 필요 (untested 참고)
  2. [[Authentication Flow]] 문서 작성 필요
```

---

## 구현 계획

### Phase 1: 신뢰도 계산 로직
- [ ] `ReliabilityChecker` 클래스 생성
- [ ] 각 섹션별 신뢰도 계산 메서드
- [ ] 전체 점수 계산 및 등급 분류

### Phase 2: WorkContextCommand 통합
- [ ] 신뢰도 정보 수집
- [ ] 출력 포맷에 신뢰도 표시
- [ ] 개선 제안 자동 생성

### Phase 3: 검증 체인 강화
- [ ] `validate-docs` 결과를 신뢰도 계산에 반영
- [ ] `sync-coverage` 커버리지 데이터 연동
- [ ] `detect-cycles` 순환 참조 감지 연동

### Phase 4: CLI 플래그
```bash
# 신뢰도 상세 표시
tsdoc-edge work-context <file> --reliability

# 신뢰도 임계값 설정
tsdoc-edge work-context <file> --min-reliability=70

# 신뢰도 낮은 항목만 표시
tsdoc-edge work-context <file> --show-issues
```

---

## 장기 목표

### 주석 및 문서 작성법 최적화

**피드백 루프**:
```
개발자가 work-context 실행
    ↓
신뢰도 낮음 발견 (예: 문서 없음)
    ↓
개선 제안 확인 (validate-docs 실행)
    ↓
문서 작성 가이드 참고
    ↓
개선된 방식으로 문서화
    ↓
work-context 신뢰도 향상
    ↓
(반복)
```

**작성법 최적화 예시**:
```typescript
// Before (신뢰도 낮음)
export class UserService {
  // ...
}

// After (신뢰도 높음)
/**
 * User management service
 *
 * @doc [[User Management System]]     ← 문서 연결
 * @responsibility User CRUD            ← 책임 명시
 * @contract Requires valid User        ← 계약 명시
 * @test [[UserService Tests]]          ← 테스트 연결
 */
export class UserService {
  // ...
}
```

**문서 작성법 최적화 예시**:
```markdown
# Before (신뢰도 낮음)
# User Management

Some description...

# After (신뢰도 높음)
# [[User Management System]]

**Primary Symbols**: UserService, UserRepository

## Purpose
사용자 생명주기 관리

## Dependencies
- [[User Type]] - 데이터 모델
- [[Database Manager]] - 영속성

## Tests
- [[UserService Tests]] - 단위 테스트
```

---

## 관련 문서

- [[Work Context Workflow]] - work-context 명령어 상세
- [[CLI Feedback Cycle]] - 전체 피드백 사이클
- [[Document Symbol System]] - 문서 심볼 시스템

---

**Status**: ✅ Design Complete, Implementation Pending
**Last Updated**: 2025-11-07
