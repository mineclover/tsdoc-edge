# [[Immediate Feedback Design]]

**Document Type**: Design Pattern

## Purpose

사용자 행동에 대해 **즉각적인 피드백**을 제공하여 **인과 관계를 명확히** 하고 **지속적 동기 부여**를 제공하는 UX 디자인 패턴입니다.

## Definition

**Immediate Feedback이란?**
> 사용자가 **행동을 취한 직후** (수 초 이내), 그 행동의 **결과를 시각적/숫자적으로** 확인할 수 있게 하는 설계 기법.

**핵심 원리:**
```
Action (행동)
  ↓ < 3초
Feedback (즉각 피드백)
  ↓
Reinforcement (강화)
```

---

## Why It Matters

### Psychological Foundation

**Operant Conditioning (조작적 조건화):**
```
행동 → 보상 → 행동 반복
```

**시간 간격의 중요성:**
- **즉시 피드백** (1-3초): 강력한 강화
- **지연 피드백** (1시간 후): 약한 강화
- **없음**: 행동 소멸

**TSDoc Edge 적용:**
```bash
[주석 추가]
  ↓ 1초 (빠른 빌드)
tsdoc-edge health
  ↓ 2초
"72 → 73" ✅
  ↓
"오, 올라갔다!" (도파민)
  ↓
[또 주석 추가] (행동 반복)
```

---

### Problem: Delayed Feedback

**Bad Example:**
```bash
[월요일: 주석 100개 추가]
...
[금요일: 주간 리포트 확인]
"Documentation improved by 5%"
```

**Problems:**
1. **시간 간격**: 5일 후 → 인과 관계 약함
2. **불명확**: 어떤 주석이 효과 있었는지 모름
3. **동기 부족**: 즉각적 보상 없음

**Result:** 행동 반복 안 함 😞

---

### Solution: Immediate Feedback Loop

**Good Example:**
```bash
[주석 1개 추가]
↓ 즉시 실행
tsdoc-edge build && tsdoc-edge health
↓ 3초 후
"72 → 72.1" ✅

[주석 10개 더 추가]
↓ 즉시 실행
tsdoc-edge build && tsdoc-edge health
↓ 3초 후
"72.1 → 73.2" ✅✅

💭 "계속 올라가네! 재밌다"
```

**Benefits:**
1. **명확한 인과**: 주석 추가 → 점수 상승
2. **작은 승리**: 0.1점이라도 보임
3. **지속 동기**: 바로바로 확인 가능

---

## Design Principles

### Principle 1: Fast Response Time
> **3초 룰**: 피드백은 3초 이내에 제공되어야 함

**TSDoc Edge 성능 목표:**
```bash
tsdoc-edge build     # < 2초 (1247 symbols)
tsdoc-edge health    # < 1초
tsdoc-edge stats     # < 1초
```

**Why 3 seconds?**
- 3초 이상: 사용자는 "느리다"고 인식
- 3초 이하: "즉각적"으로 느낌
- 1초 이하: "실시간"으로 느낌

---

### Principle 2: Visible Change
> 변화가 **눈에 보여야** 함

**Good (변화 명시):**
```
Before: 72
After:  73 (+1) ✅
```

**Bad (변화 불명확):**
```
Score: 73
(이전이 뭐였지? 올라간건가?)
```

**Implementation:**
```bash
# 간단한 스크립트
echo "Before:" && tsdoc-edge health
[Fix]
echo "After:" && tsdoc-edge health
```

---

### Principle 3: Granular Feedback
> **작은 개선도** 인식 가능해야 함

**Good:**
```
72.0 → 72.1 → 72.3 → 72.8 → 73.0
(각 주석마다 0.1씩 올라감)
```

**Bad:**
```
72 → 72 → 72 → 73
(주석 10개 추가해도 변화 없다가 갑자기 1점)
```

**Implementation Note:**
- 점수 계산에 **소수점 활용**
- 반올림은 **표시할 때만**

---

### Principle 4: Multi-Channel Feedback
> 여러 채널로 피드백

**Channels:**
1. **숫자 변화**: 72 → 73
2. **시각적 기호**: ✅, ⚠️, ❌
3. **색상**: 녹색 (상승), 빨강 (하락)
4. **텍스트**: "Improved!", "Needs work"

**Example:**
```bash
$ tsdoc-edge health
72 → 73 ✅ (+1)
[32m▲[0m Documentation improved
```

---

### Principle 5: Predictable Timing
> 피드백 시점이 **예측 가능**해야 함

**Good:**
```bash
tsdoc-edge build  # 항상 build 후 health 확인
tsdoc-edge health # 즉시 확인 가능
```

**Bad:**
```bash
[어딘가에서 백그라운드 처리]
...언젠가...
[이메일로 리포트 도착]
```

---

## Implementation Patterns

### Pattern A: Command Chaining (명령어 체이닝)

```bash
# Before-After 패턴
tsdoc-edge health && \
[Fix] && \
tsdoc-edge health
```

**Automation:**
```bash
# .bashrc / .zshrc
alias tsdoc-check='tsdoc-edge health'
alias tsdoc-fix='tsdoc-edge build && tsdoc-edge health'
```

---

### Pattern B: Watch Mode (감시 모드)

```bash
# 파일 변경 감지 → 자동 피드백
tsdoc-edge watch src

# Output:
[14:23:45] File changed: UserService.ts
[14:23:46] Build complete
[14:23:47] Health: 72 → 73 ✅
```

**Implementation:**
- File watcher (chokidar)
- Debounce (1초 대기 후 빌드)
- Incremental build (변경된 파일만)

---

### Pattern C: Git Hook Integration (Git Hook 통합)

```bash
# pre-commit hook
git commit
  ↓
[자동 실행: tsdoc-edge health]
  ↓
Health: 71 (threshold: 70) ✅
Commit allowed
```

**Feedback Timing:**
- Pre-commit: 커밋 전 즉시
- Pre-push: 푸시 전 즉시
- 사용자는 **푸시 전에** 품질 확인

---

### Pattern D: Progress Indicators (진행 표시)

```bash
$ tsdoc-edge build
[=========>          ] 45% (561/1247 files)
```

**Benefits:**
- 사용자는 **진행 중**임을 알 수 있음
- **예상 시간** 파악 가능
- 멈춘 것인지 **실행 중**인지 명확

---

## Feedback Types

### Type 1: Quantitative (정량적)

```
72 → 73 (+1)
```

**When to use:**
- 점수, 개수 같은 숫자형 메트릭
- 비교 가능한 값

---

### Type 2: Qualitative (정성적)

```
"Documentation quality improved"
```

**When to use:**
- 숫자로 표현 어려운 개선
- 맥락적 설명 필요할 때

---

### Type 3: Visual (시각적)

```
[████████░░] 80%
✅ Pass
⚠️ Warning
❌ Fail
```

**When to use:**
- 빠른 상태 파악
- 색맹 사용자 고려 (기호 + 색상)

---

### Type 4: Directional (방향성)

```
↑ +5.2%
↓ -2.1%
→ No change
```

**When to use:**
- 추세 파악
- 변화 방향만 중요할 때

---

## Timing Optimization

### Fast Path (빠른 경로)

**목표: < 1초**

```bash
tsdoc-edge health
# 캐시된 DB에서 즉시 계산
→ 72/100 (0.3s)
```

**Techniques:**
- DB 인덱싱
- 캐시 활용
- 최소 계산

---

### Normal Path (일반 경로)

**목표: < 3초**

```bash
tsdoc-edge build && tsdoc-edge health
# 빌드 + 계산
→ Built 1247 symbols (1.2s)
→ Health: 73/100 (0.3s)
→ Total: 1.5s
```

**Techniques:**
- 병렬 처리
- Incremental build
- 최적화된 파서

---

### Slow Path (느린 경로)

**목표: < 10초 + 진행 표시**

```bash
tsdoc-edge build src --full
[=====     ] 50% (623/1247)
# 전체 재빌드 + 상세 분석
→ 8.5s
```

**Techniques:**
- Progress bar
- 예상 시간 표시
- 취소 가능 (Ctrl+C)

---

## Anti-Patterns

### Anti-Pattern 1: Silent Operations

```bash
tsdoc-edge build
# ... 10초 경과 ...
# (아무 출력 없음)
# ... 20초 경과 ...
"Build complete"
```

**Problem:** 사용자는 "멈춘건가?" 불안

**Fix:** 진행 표시

---

### Anti-Pattern 2: Delayed Confirmation

```bash
git commit
# ... 커밋 완료 ...
# ... 5분 후 CI에서 이메일 ...
"Quality check failed"
```

**Problem:** 이미 푸시 후 → 되돌리기 어려움

**Fix:** Pre-commit hook으로 즉시 검증

---

### Anti-Pattern 3: Inconsistent Feedback

```bash
[주석 추가]
tsdoc-edge health → 72
[주석 추가]
tsdoc-edge health → 72 (안올라감?)
[주석 10개 추가]
tsdoc-edge health → 74 (갑자기 2점?)
```

**Problem:** 예측 불가능 → 신뢰 상실

**Fix:** 선형적이고 예측 가능한 점수 계산

---

### Anti-Pattern 4: No Feedback

```bash
[주석 추가]
# (이제 뭐하지? 확인해야 하나?)
```

**Problem:** 사용자가 능동적으로 확인해야 함

**Fix:** Watch mode 또는 git hook 자동 피드백

---

## Measurement

**Immediate Feedback이 잘 적용되었는지:**

### ✅ Success Metrics
1. 피드백 시간: **< 3초**
2. 작은 변화 감지: **0.1 단위**
3. 시각적 변화: **색상/기호** 활용
4. 사용자 만족도: **"빠르다"는 피드백**

### ❌ Failure Signs
1. 피드백 시간: **> 10초**
2. 변화 무감각: **정수 단위만**
3. 텍스트만: **숫자만** 나옴
4. 사용자 불만: **"느리다", "반응 없다"**

---

## Psychological Impact

### Positive Reinforcement (긍정 강화)

```
Action → Immediate Reward → Dopamine → Repeat
```

**TSDoc Edge:**
```
주석 추가 → 점수 상승 확인 → "뿌듯함" → 계속 추가
```

---

### Flow State (몰입 상태)

**Conditions:**
1. 명확한 목표 ("80점 만들기")
2. 즉각적 피드백 ("73 → 74")
3. 도전과 능력의 균형

**Result:**
- 시간 가는 줄 모름
- 계속하고 싶은 욕구
- 높은 생산성

---

### Habit Formation (습관 형성)

**Habit Loop:**
```
Cue (트리거)
  → Routine (행동)
  → Reward (보상)
  → Repeat
```

**TSDoc Edge Habit:**
```
Cue: 코드 작성 완료
  → Routine: tsdoc-edge health
  → Reward: 점수 확인 (73!)
  → Repeat: 다음에도 확인
```

---

## Related Concepts

- [[User Mental Model]] - 사용자가 기대하는 즉각성
- [[Progressive Disclosure]] - 단계적 피드백 공개
- [[Cognitive User Flow]] - 피드백 기반 의사결정
- [[CLI Feedback Cycle]] - 시스템 피드백 사이클

## Implementations

- `tsdoc-edge health` - 즉시 점수 확인
- `tsdoc-edge build` - 빠른 빌드 (< 2초)
- Pre-commit hook - 커밋 시점 즉시 피드백
- Watch mode (계획) - 파일 변경 시 자동 피드백

## Code References

[^CodeHealthChecker] - 빠른 점수 계산 (< 1초)
[^BaseCommand] - 일관된 피드백 포맷
[^PreCommitChecker] - Git hook 즉시 피드백

## References

- B.F. Skinner: "Operant Conditioning"
- Mihaly Csikszentmihalyi: "Flow: The Psychology of Optimal Experience"
- Nir Eyal: "Hooked: How to Build Habit-Forming Products"
- Jakob Nielsen: "Response Times: The 3 Important Limits"

---

**Status**: Active
**Pattern Type**: UX / Behavioral Design
**Last Updated**: 2025-11-06
