# 의존성 분석 베스트 프랙티스

> DepthTraverser 기반 의존성 추적 실전 가이드

## 목차
1. [언제 사용할까?](#언제-사용할까)
2. [깊이(depth) 설정 가이드](#깊이depth-설정-가이드)
3. [방향(direction) 선택 기준](#방향direction-선택-기준)
4. [실전 시나리오](#실전-시나리오)
5. [팁과 주의사항](#팁과-주의사항)

---

## 언제 사용할까?

### ✅ 이런 상황에서 사용하세요

| 상황 | 사용 명령어 | 목적 |
|------|------------|------|
| 🐛 버그 수정 전 | `scan --entry=BuggyClass --direction=dependents --depth=3` | 수정 시 영향받는 코드 파악 |
| 🔨 리팩토링 계획 | `scan --entry=TargetClass --direction=both --depth=2` | 전체 영향 범위 분석 |
| ✨ 새 기능 추가 | `scan --entry=NewFeature --direction=dependencies --depth=5` | 필요한 의존성 파악 |
| 📊 코드 리뷰 | `scan --entry=ModifiedClass --direction=dependents --depth=2 --output=review.md` | PR 영향도 문서화 |
| 🏗️ 아키텍처 분석 | `scan --direction=both --depth=3 --output=architecture.md` | 전체 구조 파악 |
| 🔍 사이드 이펙트 추적 | `scan --entry=SideEffectFunction --direction=dependents --depth=4` | 부작용 영향 범위 |

### ❌ 이런 경우는 다른 명령어를 사용하세요

- **1단계만 빠르게 확인**: `tsdoc-edge deps <id>` 또는 `used-by <id>`
- **심볼 이름으로 검색**: `tsdoc-edge who-uses <name>`
- **전체 고아 심볼 찾기**: `tsdoc-edge orphans`

---

## 깊이(depth) 설정 가이드

### Depth별 특징

```
depth=1  [직접 의존성만]
  └─ 빠름, 명확함
  └─ 버그 핫픽스, 간단한 수정

depth=2-3  [일반적인 영향 범위]
  └─ 균형잡힌 분석
  └─ 대부분의 리팩토링, PR 리뷰

depth=4-5  [넓은 영향 범위]
  └─ 상세한 분석
  └─ 아키텍처 결정, 대규모 변경

depth=6+  [전체 영향 범위]
  └─ 느림, 복잡함
  └─ 핵심 인프라 변경 시만
```

### 실전 예시

```bash
# Case 1: 간단한 유틸 함수 수정
scan --entry=formatDate --direction=dependents --depth=1

# Case 2: 서비스 클래스 리팩토링
scan --entry=UserService --direction=both --depth=3

# Case 3: 핵심 타입 인터페이스 변경
scan --entry=BaseEntity --direction=dependents --depth=5

# Case 4: 전체 아키텍처 문서화
scan --direction=both --depth=3 --group-by-category --output=docs/ARCHITECTURE.md
```

---

## 방향(direction) 선택 기준

### 🔽 `dependencies` (하위 의존성)

**질문:** "이 코드를 수정하려면 뭘 알아야 하나?"

**사용 시나리오:**
- 새 기능 추가 시 필요한 의존성 파악
- 코드 이해를 위한 의존성 탐색
- 리팩토링 시 영향받는 하위 모듈 확인

```bash
# 예시: UserController를 수정하려면?
tsdoc-edge scan \
  --entry=UserController \
  --direction=dependencies \
  --depth=3 \
  --output=docs/user-controller-deps.md

# 결과: UserService, UserRepository, Database 등 필요한 것들
```

**활용:**
```typescript
// UserController 수정 전
// → UserService, UserRepository를 알아야 함
// → 이들의 인터페이스 변경 시 UserController도 수정 필요
```

---

### 🔼 `dependents` (상위 의존성) ⭐ **가장 유용**

**질문:** "이 코드를 수정하면 어디가 영향받나?"

**사용 시나리오:**
- 버그 수정 전 영향 범위 파악 (가장 중요!)
- Breaking change 범위 분석
- API 변경 시 영향받는 클라이언트 확인
- 사이드 이펙트 추적

```bash
# 예시: UserRepository를 수정하면 어디가 깨질까?
tsdoc-edge scan \
  --entry=UserRepository \
  --direction=dependents \
  --depth=4 \
  --output=impact-analysis.md

# 결과: UserService, UserController, AuthService 등 영향받는 코드들
```

**활용:**
```typescript
// UserRepository.findById() 시그니처 변경 전
// → depth=3으로 스캔
// → UserService, AuthService, AdminService가 영향받음
// → 이들도 같이 수정해야 함을 알 수 있음
```

---

### 🔀 `both` (양방향)

**질문:** "이 코드의 전체 맥락은?"

**사용 시나리오:**
- 대규모 리팩토링 계획
- 아키텍처 문서 생성
- 코드베이스 온보딩
- 복잡한 의존성 순환 탐지

```bash
# 예시: UserService의 전체 맥락
tsdoc-edge scan \
  --entry=UserService \
  --direction=both \
  --depth=2 \
  --output=docs/user-service-context.md

# 결과:
# - dependencies: Database, ConfigLoader, Logger
# - dependents: UserController, AuthService, AdminDashboard
```

---

## 실전 시나리오

### 시나리오 1: 버그 수정 전 영향 범위 파악 🐛

```bash
# 상황: parseDate() 함수에서 타임존 버그 발견
# 질문: 이걸 고치면 어디가 영향받을까?

# Step 1: 영향 범위 스캔
tsdoc-edge scan \
  --entry=parseDate \
  --direction=dependents \
  --depth=3 \
  --output=bug-fix-impact.md

# Step 2: 문서 확인
cat bug-fix-impact.md
# → formatDateTime (depth 1)
#   → UserProfileFormatter (depth 2)
#     → UserProfileController (depth 3)
# → EventLogger (depth 1)
#   → AuditService (depth 2)

# Step 3: 영향받는 코드 테스트 작성
# → UserProfileFormatter.test.ts 업데이트
# → EventLogger.test.ts 추가

# Step 4: 안전하게 수정
```

**베스트 프랙티스:**
- `depth=3`이면 충분 (너무 깊으면 노이즈)
- `--output` 옵션으로 PR에 첨부
- 각 레벨별로 테스트 우선순위 결정

---

### 시나리오 2: 리팩토링 전 계획 수립 🔨

```bash
# 상황: UserService를 도메인 주도 설계로 리팩토링
# 목표: UserService → UserAggregate + UserRepository 분리

# Step 1: 현재 의존성 파악
tsdoc-edge scan \
  --entry=UserService \
  --direction=both \
  --depth=2 \
  --output=refactor-before.md

# Step 2: 문서 분석
# Dependencies (이걸 사용):
#   - Database (직접)
#   - ConfigLoader (직접)
#   - EmailService (직접)
# Dependents (이게 사용됨):
#   - UserController (직접)
#   - AuthService (직접)
#   - AdminService (직접)

# Step 3: 리팩토링 계획
# 1. UserAggregate 생성 (Domain logic)
# 2. UserRepository 분리 (Database 의존성 격리)
# 3. UserController, AuthService, AdminService 수정

# Step 4: 점진적 마이그레이션
# - 먼저 UserRepository 생성
# - UserService에서 DB 로직 이동
# - 하나씩 의존성 업데이트
```

**베스트 프랙티스:**
- `both` 방향으로 전체 맥락 파악
- 리팩토링 전/후 문서 비교
- 의존성 그래프를 보며 순서 결정

---

### 시나리오 3: 새 기능 추가 시 의존성 이해 ✨

```bash
# 상황: 기존 코드베이스에 "결제 기능" 추가
# 목표: OrderService가 뭘 사용하는지 파악

# Step 1: 유사 기능 분석
tsdoc-edge scan \
  --entry=OrderService \
  --direction=dependencies \
  --depth=4 \
  --output=order-service-deps.md

# Step 2: 패턴 학습
# Level 1: OrderRepository, PaymentGateway
# Level 2: Database, HttpClient, ConfigLoader
# Level 3: Logger, ErrorHandler
# Level 4: 기반 유틸리티들

# Step 3: 새 기능 설계
# PaymentService 생성 시 참고:
# - PaymentRepository (Level 1)
# - HttpClient로 외부 API 호출 (Level 2)
# - ErrorHandler 재사용 (Level 3)
```

**베스트 프랙티스:**
- 유사 기능의 패턴 파악
- `depth=4-5`로 깊게 탐색
- 재사용 가능한 컴포넌트 찾기

---

### 시나리오 4: PR 리뷰용 문서 생성 📊

```bash
# 상황: UserService 수정한 PR 생성
# 목표: 리뷰어가 영향 범위를 쉽게 이해하도록

# Step 1: 영향 범위 문서 생성
tsdoc-edge scan \
  --entry=UserService \
  --direction=dependents \
  --depth=2 \
  --output=PR_IMPACT.md

# Step 2: PR 설명에 추가
# ```
# ## 변경 사항
# - UserService.updateProfile() 메서드 리팩토링
#
# ## 영향 범위
# - ✅ UserController (테스트 업데이트 완료)
# - ✅ AuthService (영향 없음 - 다른 메서드 사용)
# - ⚠️ AdminService (수동 테스트 필요)
#
# 상세 의존성 분석: [PR_IMPACT.md](./PR_IMPACT.md)
# ```

# Step 3: 리뷰어 피드백
# "AdminService도 영향받네요. 테스트 추가해주세요."
```

**베스트 프랙티스:**
- `depth=2`면 충분 (리뷰어 부담 최소화)
- 마크다운 문서로 PR에 첨부
- 각 의존성별로 대응 상태 표시

---

### 시나리오 5: 순환 의존성 탐지 및 해결 🔄

```bash
# 상황: 빌드가 느리고 복잡도 증가
# 의심: 순환 의존성 문제

# Step 1: 양방향 스캔으로 순환 탐지
tsdoc-edge scan \
  --entry=UserService \
  --direction=both \
  --depth=3 \
  --output=circular-deps.md

# 분석 결과:
# UserService
#   → (depends on) NotificationService
#     → (depends on) EventBus
#       → (depends on) UserService  ❌ 순환!

# Step 2: 해결 방법
# - EventBus를 중간 매개체로 분리
# - UserService → EventBus ← NotificationService

# Step 3: 리팩토링 후 검증
tsdoc-edge scan \
  --entry=UserService \
  --direction=both \
  --depth=3 \
  --output=circular-deps-fixed.md

# 결과: 순환 제거 확인 ✅
```

---

## 팁과 주의사항

### ✅ DO (권장사항)

1. **영향 범위 분석은 항상 먼저**
   ```bash
   # 수정 전에 항상!
   scan --entry=TargetClass --direction=dependents --depth=3
   ```

2. **문서화 습관**
   ```bash
   # 중요한 분석은 저장
   scan ... --output=docs/analysis/$(date +%Y%m%d)-feature-X.md
   ```

3. **depth 점진적 증가**
   ```bash
   # depth=1부터 시작해서 필요하면 증가
   scan --entry=X --depth=1  # 먼저 확인
   scan --entry=X --depth=3  # 더 필요하면
   ```

4. **카테고리별 그룹핑**
   ```bash
   # 아키텍처 문서는 카테고리별로
   scan --group-by-category --output=docs/ARCH.md
   ```

5. **팀과 공유**
   ```bash
   # 주요 컴포넌트 의존성 문서를 Git에 커밋
   docs/dependencies/
     ├── core-services.md
     ├── api-layer.md
     └── database-layer.md
   ```

### ❌ DON'T (피해야 할 것)

1. **무작정 depth 크게 설정**
   ```bash
   # ❌ 너무 많은 정보 (노이즈)
   scan --depth=10  # 거의 전체 코드베이스

   # ✅ 적절한 깊이
   scan --depth=2-3
   ```

2. **every commit마다 스캔**
   ```bash
   # ❌ CI에서 매번 실행 (느림)
   # ✅ PR 생성 시, 주요 수정 시만
   ```

3. **output 없이 긴 분석**
   ```bash
   # ❌ 터미널 출력만 (기록 안 남음)
   scan --depth=5

   # ✅ 파일로 저장
   scan --depth=5 --output=analysis.md
   ```

4. **entry 없이 전체 스캔 남발**
   ```bash
   # ❌ 성능 저하 (모든 exported 심볼)
   scan --depth=5

   # ✅ 타겟 지정
   scan --entry=SpecificClass --depth=5
   ```

---

## 성능 최적화

### 스캔 속도 가이드

| depth | entry 유무 | 예상 시간 | 용도 |
|-------|-----------|---------|------|
| 1 | O | < 1초 | 빠른 확인 |
| 2-3 | O | 1-3초 | 일반적 분석 |
| 4-5 | O | 3-10초 | 상세 분석 |
| 2-3 | X (전체) | 5-15초 | 아키텍처 문서 |
| 5+ | X (전체) | 15초+ | 피하세요 |

### 최적화 팁

```bash
# 1. 특정 심볼만 분석 (--entry 사용)
scan --entry=TargetClass --depth=3  # 빠름

# 2. 필요한 방향만 (dependents가 더 유용한 경우가 많음)
scan --entry=X --direction=dependents  # 빠름

# 3. 캐시 활용 (같은 DB 여러 번 스캔)
# DB는 한번만 생성, 여러 entry 스캔
```

---

## 워크플로우 통합

### Git Hooks

```bash
# .git/hooks/pre-push
#!/bin/bash
# 주요 파일 변경 시 영향 범위 체크

CHANGED_FILES=$(git diff --name-only @{u}..HEAD)

if echo "$CHANGED_FILES" | grep -q "src/core/"; then
  echo "🔍 Core 파일 변경 감지. 영향 범위 분석 중..."
  tsdoc-edge scan \
    --direction=dependents \
    --depth=3 \
    --output=.pre-push-impact.md

  echo "📄 영향 범위 분석 완료: .pre-push-impact.md"
  echo "⚠️  푸시 전에 확인해주세요!"
fi
```

### CI/CD

```yaml
# .github/workflows/pr-analysis.yml
name: PR Impact Analysis

on: [pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install
        run: npm install
      - name: Analyze Impact
        run: |
          tsdoc-edge scan \
            --direction=dependents \
            --depth=3 \
            --output=PR_IMPACT.md
      - name: Comment PR
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const impact = fs.readFileSync('PR_IMPACT.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## 📊 Impact Analysis\n\n${impact}`
            });
```

---

## 다음 단계

이 가이드를 익혔다면:

1. **프로젝트에 적용해보기**
   ```bash
   # 핵심 컴포넌트 3개 선택해서 문서화
   scan --entry=CoreComponent1 --direction=both --depth=2 --output=docs/core1.md
   scan --entry=CoreComponent2 --direction=both --depth=2 --output=docs/core2.md
   scan --entry=CoreComponent3 --direction=both --depth=2 --output=docs/core3.md
   ```

2. **팀 컨벤션 수립**
   - PR 생성 시 영향 범위 분석 필수
   - 주요 리팩토링은 before/after 문서 작성
   - 월 1회 아키텍처 문서 업데이트

3. **자동화 구축**
   - Git hooks 설정
   - CI/CD 통합
   - 문서 자동 생성

---

## 참고

- [DepthTraverser API](../src/graph/DepthTraverser.ts)
- [CLI 사용법](../README.md#cli-명령어)
- [Core Features](./CORE_FEATURES.md#심볼-그래프-symbol-graph)
