# [[Progressive Disclosure]]

**Document Type**: Design Pattern

## Purpose

복잡한 정보를 **점진적으로 공개**하여 사용자가 **압도되지 않고** **필요한 만큼만** 탐색할 수 있도록 하는 UX 디자인 패턴입니다.

## Definition

**Progressive Disclosure란?**
> 정보를 **한 번에 모두 보여주지 않고**, **기본 정보**부터 시작해서 사용자가 **원할 때** **더 자세한 정보**를 드러내는 디자인 기법.

**핵심 아이디어:**
```
Level 1 (간단)
  ↓ 더 알고 싶으면
Level 2 (중간)
  ↓ 더 알고 싶으면
Level 3 (복잡)
```

---

## Why It Matters

### Problem: Information Overload (정보 과부하)

**Bad Example (모든 정보 한번에):**
```bash
$ tsdoc-edge analyze
────────────────────────────────────────
Total Symbols: 1247
Documented: 1094 (87.7%)
Undocumented: 153 (12.3%)
Test Coverage: 748 (60%)
Untested: 499 (40%)
Orphaned Symbols: 1256
Missing Links: 23
Broken Links: 0
Quality Score: 72.4
Documentation Score: 87.7
Test Score: 60.0
Connectivity Score: 45.2
...
[10000 lines more]
────────────────────────────────────────
```

**User Reaction:** 😱 "너무 많아... 뭐부터 봐야 하지?"

---

### Solution: Progressive Disclosure

**Good Example (점진적 공개):**

```bash
# Level 1: 핵심 요약 (3초 이해)
$ tsdoc-edge health
Overall Health: 72/100

# 궁금하면 Level 2로
$ tsdoc-edge stats
Documentation: 87.7% ✓
Test Coverage: 60.0% ⚠️
Connectivity: 45.2% ✗

# 더 궁금하면 Level 3으로
$ tsdoc-edge undocumented | head
UserService.ts:44
UserService.ts:45
...
```

**User Reaction:** 😊 "오케이, 72점이구나. 테스트가 약점이네"

---

## TSDoc Edge에서의 적용

### Pattern 1: Numeric Hierarchy (숫자 계층)

```
Level 1: 단일 숫자 (Overall)
  72/100
  ↓
Level 2: 범주별 숫자 (Categories)
  Doc: 87%, Test: 60%, ...
  ↓
Level 3: 개별 항목 (Items)
  153개 미문서화 심볼 목록
  ↓
Level 4: 상세 정보 (Details)
  파일:라인:컬럼 + 코드 스니펫
```

**CLI 매핑:**
```bash
tsdoc-edge health              # Level 1
tsdoc-edge stats               # Level 2
tsdoc-edge undocumented        # Level 3
tsdoc-edge parse <file>        # Level 4
```

---

### Pattern 2: Scope Expansion (범위 확장)

```
Level 1: 전체 요약
  "Overall: 72/100"
  ↓
Level 2: 파일별
  "UserService.ts: 65/100"
  ↓
Level 3: 심볼별
  "UserService.config: No docs"
  ↓
Level 4: 코드 레벨
  "Line 44: config property"
```

**CLI 매핑:**
```bash
tsdoc-edge health src          # 전체
tsdoc-edge health src/UserService.ts  # 파일
tsdoc-edge undocumented | grep UserService  # 심볼
tsdoc-edge parse src/UserService.ts  # 코드
```

---

### Pattern 3: Detail on Demand (요구시 상세)

```
기본 출력: 요약만
  "153 undocumented symbols"
  ↓ --verbose
상세 출력: 위치 포함
  "UserService.ts:44 config"
  ↓ --full
전체 출력: 코드 스니펫까지
  "UserService.ts:44
   > private config: Config
     ^^^^ Missing @doc tag"
```

**CLI 매핑:**
```bash
tsdoc-edge undocumented              # 요약
tsdoc-edge undocumented --verbose    # 상세
tsdoc-edge undocumented --full       # 전체
```

---

## Design Principles

### Principle 1: Start Simple
> 첫 화면은 **3초 안에 이해 가능**해야 함

**Good:**
```
72/100
```

**Bad:**
```
Overall Health Score: 72.456789
(weighted average of documentation quality 87.7%,
test coverage 60.0%, connectivity score 45.2%,
using formula: 0.4*doc + 0.3*test + 0.3*conn)
```

---

### Principle 2: Clear Path Forward
> **다음 단계**가 명확해야 함

**Good:**
```bash
$ tsdoc-edge health
72/100
💡 Run 'tsdoc-edge stats' for breakdown
```

**Bad:**
```bash
$ tsdoc-edge health
72/100
# (이제 뭐하지? 🤔)
```

---

### Principle 3: No Forced Depth
> 깊이 탐색은 **선택**이어야 함

**Good:**
- 간단히 보고 싶으면: `health`만 실행
- 자세히 보고 싶으면: `stats`, `undocumented` 추가 실행

**Bad:**
- 모든 명령어가 자동으로 모든 레벨 출력
- 사용자가 원하지 않아도 강제로 상세 정보 노출

---

### Principle 4: Consistent Structure
> 모든 명령어가 **같은 계층 구조** 따름

**TSDoc Edge 일관성:**
```
health   → 전체 점수
stats    → 범주별 점수
<detail> → 개별 항목
```

**적용:**
```
health → stats → undocumented
health → stats → orphans
health → stats → suggest
```

---

## Anti-Patterns (피해야 할 것들)

### Anti-Pattern 1: Hidden Levels
```
Level 1: 72/100
Level 2: ??? (어떻게 가지?)
Level 3: 개별 목록
```

**Fix:** 각 레벨에서 **다음 레벨로 가는 방법** 명시

---

### Anti-Pattern 2: Too Many Levels
```
Level 1 → Level 2 → Level 3 → Level 4 → Level 5 → ...
```

**Problem:** 원하는 정보까지 거리가 너무 멀어짐

**Fix:** **3-4 레벨**이 적정

---

### Anti-Pattern 3: Inconsistent Depth
```
health: 단일 숫자
stats: 10줄 출력
undocumented: 10000줄 출력 (💀)
```

**Fix:** 각 레벨의 **정보량 균형** 맞추기 (`undocumented | head`)

---

### Anti-Pattern 4: No Exit Path
```
복잡한 레벨에 들어갔는데 나갈 방법이 없음
```

**Fix:** 항상 **상위 레벨로 돌아가는 방법** 제공

---

## Cognitive Benefits

### Benefit 1: Reduced Cognitive Load
> 한 번에 처리할 정보량이 줄어듦

**Measurement:**
- Level 1: 1개 숫자 (72)
- Level 2: 3-5개 숫자 (Doc 87%, Test 60%, ...)
- Level 3: 10-20개 항목 (head로 제한)

**Result:** 각 단계에서 **의사결정 가능**

---

### Benefit 2: Sense of Control
> 사용자가 **탐색 속도 제어**

**User Feeling:**
- "내가 원하는 만큼만 볼게"
- "궁금하면 더 볼 수 있다는 걸 알아"
- "압박감 없음"

---

### Benefit 3: Faster Learning
> 초보자도 **쉬운 레벨부터** 시작

**Learning Path:**
```
Day 1: health만 사용
  "72점이면 괜찮네"

Day 3: stats도 사용
  "아, 테스트가 약점이구나"

Day 7: undocumented 사용
  "여기를 고쳐야겠다"

Day 14: 전체 워크플로우 숙달
  "이제 조합해서 쓸 수 있어"
```

---

### Benefit 4: Expert Efficiency
> 숙련자는 **직접 깊은 레벨**로 이동

**Expert Pattern:**
```bash
# 초보자
tsdoc-edge health
tsdoc-edge stats
tsdoc-edge undocumented

# 숙련자 (바로 레벨 3)
tsdoc-edge undocumented | grep UserService
```

---

## Implementation Patterns

### Pattern A: Funnel (깔때기)

```
넓게 시작 → 점점 좁아짐
```

**Example:**
```bash
health       # 전체 코드베이스
  ↓
stats        # 범주별
  ↓
undocumented # 특정 이슈
  ↓
parse        # 특정 파일
```

---

### Pattern B: Drill-Down (드릴 다운)

```
요약 → 세부 → 상세
```

**Example:**
```bash
validate-spec managed/         # 전체 명세 요약
  ↓
validate-spec managed/core-workflow.md  # 파일별
  ↓
validate-spec managed/core-workflow.md --verbose  # 상세
```

---

### Pattern C: Expand-Collapse (확장-축소)

```
기본: 축소 상태
사용자 요청: 확장
```

**Example:**
```bash
tsdoc-edge stats              # 축소 (숫자만)
tsdoc-edge stats --explain    # 확장 (설명 포함)
```

---

## Measurement Criteria

**Progressive Disclosure가 잘 적용되었는지 판단:**

### ✅ Good Signs
1. 첫 출력이 **1-2줄**
2. 다음 명령어가 **명시적으로 제안**됨
3. 각 레벨이 **10배 이내 정보량** 차이
4. 사용자가 **중간에 멈춰도 괜찮음**

### ❌ Bad Signs
1. 첫 출력이 **100줄+**
2. 다음 단계 **불명확**
3. 레벨 간 **1000배 차이** (1줄 → 1000줄)
4. 모든 정보 봐야만 **의미 파악 가능**

---

## Related Concepts

- [[User Mental Model]] - 사용자 이해 모델
- [[Purpose Refinement]] - Level 3에서 Progressive Disclosure 설명
- [[Cognitive User Flow]] - 점진적 맥락 수집
- [[CLI Feedback Cycle]] - 단계별 피드백

## Implementations

- `health` → `stats` → `undocumented` 명령어 체인
- `validate-spec` 상세도 옵션
- `--verbose`, `--full` 플래그
- `| head` 파이프를 통한 출력 제한

## References

- Nielsen Norman Group: "Progressive Disclosure"
- Apple Human Interface Guidelines: "Disclosure Controls"
- Edward Tufte: "The Visual Display of Quantitative Information"

---

**Status**: Active
**Pattern Type**: UX Design Pattern
**Last Updated**: 2025-11-06
