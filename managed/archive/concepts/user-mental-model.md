# [[User Mental Model]]

**Document Type**: Conceptual Framework

## Purpose

사용자가 TSDoc Edge 시스템을 **어떻게 이해하고** **어떻게 생각하는지**에 대한 인지 모델을 정의합니다. 시스템 설계는 이 멘탈 모델에 부합해야 합니다.

## Definition

**Mental Model이란?**
> 사용자가 시스템에 대해 머릿속에 구축하는 **개념적 프레임워크**. 시스템이 어떻게 작동하고, 무엇을 할 수 있고, 어떻게 사용해야 하는지에 대한 **내부 표현**.

**TSDoc Edge의 User Mental Model:**
```
"문서와 코드는 연결되어 있고,
시스템이 그 연결성을 측정하고,
내가 개선하면 점수가 올라간다"
```

---

## Core Mental Model Components

### 1. System Structure Model (구조 모델)

**사용자가 생각하는 시스템 구조:**

```
내 코드 (Source)
   ↓ build
DB (Symbol Storage)
   ↓ analyze
점수 (Quality Metric)
   ↓ 개선
더 높은 점수
```

**특징:**
- **선형적 흐름**: 코드 → DB → 점수 → 개선
- **단순화**: 복잡한 내부 구조는 추상화됨
- **Feedback Loop**: 개선하면 점수가 올라간다는 인과 관계

**설계 원칙:**
> 실제 내부 구현이 복잡해도, 사용자에게는 **선형 흐름**으로 보여야 함

---

### 2. Quality Perception Model (품질 인식 모델)

**사용자가 품질을 어떻게 인식하는가:**

```
점수 높음 (80+)   → "좋다" 😊
점수 중간 (60-80) → "괜찮다" 😐
점수 낮음 (0-60)  → "나쁘다" 😟
```

**인지적 특징:**
- **숫자 하나**로 전체를 판단
- **상대적 기준**: 80이 높은지 낮은지는 경험으로 학습
- **감정 연결**: 점수가 감정 상태와 직결

**설계 원칙:**
> 점수 하나만 봐도 **"괜찮은지 아닌지"** 즉시 판단 가능해야 함

---

### 3. Action-Result Model (행동-결과 모델)

**사용자가 기대하는 인과 관계:**

| 행동 | 기대 결과 | 실제 결과 | 멘탈 모델 일치? |
|------|----------|----------|----------------|
| 주석 추가 | 점수 ↑ | 점수 ↑ | ✅ 일치 |
| 테스트 추가 | 점수 ↑ | 점수 ↑ | ✅ 일치 |
| 파일 삭제 | 점수 ? | 점수 ↓ (심볼 감소) | ⚠️ 불일치 |
| 주석 고침 | 점수 ? | 점수 동일 | ⚠️ 불일치 |

**불일치 케이스 처리:**
- 파일 삭제 → 점수 하락 예상 못함
  - **해결**: "153개 → 148개" 같은 **개수 변화**를 함께 보여줘야 함
- 주석 개선 → 점수 동일
  - **해결**: "Quality improved but coverage unchanged" 메시지

**설계 원칙:**
> **예상과 다른 결과**가 나오면 **명확한 설명** 제공

---

### 4. Problem-Solution Model (문제-해결 모델)

**사용자의 문제 해결 사고 흐름:**

```
Step 1: 문제 인식
  "뭔가 잘못됐나?" → tsdoc-edge health

Step 2: 문제 특정
  "뭐가 문제지?" → tsdoc-edge undocumented

Step 3: 해결 실행
  [주석 추가]

Step 4: 검증
  "고쳐졌나?" → tsdoc-edge health
```

**멘탈 모델 특징:**
- **질문 중심**: 명령어가 아닌 질문으로 생각
- **점진적 구체화**: 넓게 → 좁게
- **즉각 피드백**: 매 단계마다 결과 확인

**설계 원칙:**
> CLI 명령어는 **질문에 대한 답**이어야 함

---

### 5. Learning Model (학습 모델)

**사용자가 시스템을 어떻게 학습하는가:**

```
Phase 1: 탐색 (Exploration)
  "이게 뭐하는건지 모르겠는데 일단 실행"
  → tsdoc-edge health
  → "오 숫자가 나오네"

Phase 2: 이해 (Comprehension)
  "72가 좋은거야 나쁜거야?"
  → tsdoc-edge stats
  → "아, Doc 87%구나. 괜찮네"

Phase 3: 활용 (Utilization)
  "주석 추가하면 올라가겠지?"
  → [주석 추가]
  → tsdoc-edge health
  → "73 됐다! 맞네"

Phase 4: 숙달 (Mastery)
  "이제 알아. 문제 있으면 undocumented 보면 돼"
  → tsdoc-edge undocumented | head
  → [효율적 개선]
```

**학습 곡선 특징:**
- **시행착오 기반**: 실행하고 결과 보면서 학습
- **패턴 인식**: 반복하면서 워크플로우 내재화
- **도구화**: 숙달 후 자동화 (스크립트, alias 등)

**설계 원칙:**
> **초보자도 실행 가능**하고, **숙련자는 조합 가능**해야 함

---

## Mental Model vs Reality

### Case 1: 점수 계산 방식

**Mental Model:**
```
"주석 1개 = +1점"
```

**Reality:**
```
점수 = f(documentation%, test%, coverage, importance, ...)
→ 복잡한 가중치 계산
```

**Gap Handling:**
- 사용자에게 **단순 모델**만 제시 (점수만 보여줌)
- 상세 원하면 `stats`로 **점진적 공개**

---

### Case 2: 심볼 중요도

**Mental Model:**
```
"모든 심볼은 동등하게 중요하다"
```

**Reality:**
```
public > private
exported > internal
API boundary > internal helper
```

**Gap Handling:**
- 기본 명령어는 **모든 심볼 동등** 취급
- `--important` 플래그로 **중요한 것만** 필터링 가능

---

### Case 3: 문서 연결성

**Mental Model:**
```
"문서는 독립된 파일들"
```

**Reality:**
```
[[Symbol]] 참조로 그래프 구조
→ 연결성, 백링크, 고립 심볼 등
```

**Gap Handling:**
- 기본은 **파일 단위** 작업 (`validate-spec managed/file.md`)
- 고급 기능은 **그래프 단위** (`validate-docs` - 전체 연결성)

---

## Mental Model Alignment Principles

### Principle 1: Match User Expectations
> 사용자가 예상하는 대로 동작해야 함

**Example:**
- `tsdoc-edge build src` → "src 디렉토리 스캔하겠지"
- **NOT**: "현재 디렉토리의 .tsdoc.config.json에 설정된 경로 스캔"

---

### Principle 2: Consistent Metaphors
> 일관된 은유 사용

**Metaphor: "Health Check"**
- `health` → 건강 검진 (전체 점수)
- `stats` → 세부 검사 (범주별)
- `undocumented` → 병변 위치 (구체적 문제)

**Consistency:**
- 모든 명령어가 "의료 검진" 은유를 따름
- 사용자는 **health → stats → undocumented** 흐름을 자연스럽게 이해

---

### Principle 3: Progressive Disclosure
> 복잡도를 점진적으로 공개

**Level 1: 간단**
```bash
tsdoc-edge health
→ 72/100
```

**Level 2: 중간**
```bash
tsdoc-edge stats
→ Doc: 87%, Test: 60%, ...
```

**Level 3: 복잡**
```bash
tsdoc-edge undocumented
→ 153개 파일:라인 목록
```

---

### Principle 4: Immediate Feedback
> 행동 후 즉시 피드백

**Bad (멘탈 모델 불일치):**
```bash
[주석 100개 추가]
tsdoc-edge health
→ "Still 72" (변화 없음)
💭 "뭐지? 왜 안 올라가지?"
```

**Good (멘탈 모델 일치):**
```bash
[주석 1개 추가]
tsdoc-edge build && tsdoc-edge health
→ "72 → 72.1" (작은 변화라도 보임)
💭 "올라가네! 계속 하자"
```

---

## Mental Model Violations (피해야 할 것들)

### Violation 1: Hidden State
```bash
tsdoc-edge health
→ 72/100

[어딘가에서 캐시 삭제됨]

tsdoc-edge health
→ 65/100 (같은 코드인데 점수 다름)
```

**Why Bad:** 사용자는 "코드 동일 → 점수 동일" 멘탈 모델 가짐

**Fix:** 캐시 무효화 시 명시적 알림

---

### Violation 2: Surprising Side Effects
```bash
tsdoc-edge build src
→ "Built 1247 symbols"

[부작용: .tsdoc 디렉토리에 registry.jsonl 생성]
```

**Why Bad:** 사용자는 "build = DB 생성"만 예상, 파일 생성 예상 못함

**Fix:** 명시적 알림 또는 문서화

---

### Violation 3: Inconsistent Naming
```bash
tsdoc-edge analyze    # 뭘 분석?
tsdoc-edge validate   # 뭘 검증?
tsdoc-edge check      # 뭘 확인?
```

**Why Bad:** 이름만으로 기능 예측 불가

**Fix:** 구체적 이름 사용 (`validate-spec`, `validate-docs`, `health`)

---

## Related Concepts

- [[Cognitive User Flow]] - 사용자 인지적 작업 흐름
- [[Purpose Refinement]] - 각 기능의 존재 목적
- [[CLI Feedback Cycle]] - 시스템 피드백 사이클
- [[Progressive Disclosure]] - 점진적 정보 공개 패턴

## Design Applications

**이 멘탈 모델을 적용한 설계:**
- [[CLI Feedback Cycle]] - 사용자 멘탈 모델 기반 명령어 구조
- [[Cognitive User Flow]] - 멘탈 모델 따라가는 인지적 흐름
- `health` 명령어 - "건강 검진" 은유
- `undocumented` 명령어 - "문제 위치 특정" 멘탈 모델

## References

- Don Norman: "The Design of Everyday Things" (Mental Models in Design)
- Indi Young: "Mental Models: Aligning Design Strategy with Human Behavior"
- Jakob Nielsen: "Mental Models and User Experience"

## Code References

- cli.ts - 명령어 이름과 구조가 멘탈 모델 반영
- BaseCommand - 일관된 출력 포맷으로 멘탈 모델 유지
- CodeHealthChecker - "health" 은유 구현

---

**Status**: Active
**Last Updated**: 2025-11-06
