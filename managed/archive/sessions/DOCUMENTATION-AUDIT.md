---
title: Documentation Audit & Improvement Plan
date: 2025-11-08
status: active
---

# Documentation Audit & Improvement Plan

## 현재 상황 분석

### 구축된 인프라 ✅

TSDoc Edge는 **문서 ↔ 코드 양방향 의존성 분석 인프라**를 완성했습니다:

1. **코드 → 문서 방향**:
   - `build` → 모든 심볼 DB 구축
   - `work-context` → 파일 수정 전 완전한 컨텍스트 제공
   - 심볼 그래프, 관계 추적, 의존성 분석

2. **문서 → 코드 방향**:
   - `[[Symbol]]` 참조 시스템
   - `explore-entrypoint` → 문서에서 시작하여 전체 코드 탐색
   - `--detect-orphans` → 문서에서 도달 불가능한 고아 코드 탐지

3. **자동화 도구**:
   - `parse-mermaid` → 다이어그램 기반 문서 자동 생성
   - `promote-symbol` → H2 → H1 승격
   - `validate-symbol-refs` → 심볼 일관성 검증

### 목표 🎯

**"문서와 코드 품질을 지속적으로 개선하는 자가 검증 시스템"**

- 문서를 진입점으로 전체 코드베이스 탐색 가능
- 고아 코드/문서 자동 탐지
- 문서 품질 ↑ = 코드 커버리지 ↑

### 현재 문제 ⚠️

**문서 품질이 낮아 인프라의 가치를 제대로 활용하지 못함**

#### 정량적 지표

```
Entrypoint: managed/README.md (메인 진입점)
├─ 문서 탐색: 9개 파일만 도달
├─ 심볼 커버리지: 11.6% (175 / 1,511)
├─ 파일 커버리지: 27.8% (35 / 126)
└─ 고아 파일: 95개 (75.4%)

Total Active Docs: 37 files
├─ 실제 유용: ~15 files (40%)
├─ 중복/과거: ~10 files (27%)
└─ 불명확: ~12 files (33%)
```

**문제점**:
1. 메인 진입점에서 도달하는 문서가 9개뿐 (37개 중 24%)
2. 심볼 커버리지 11.6% → 88.4%의 코드가 문서에서 참조 안 됨
3. 95개 고아 파일 → 실제로는 사용 중인 코드일 가능성 높음

#### 정성적 문제

1. **쓸모없는 문서들**:
   - 과거 세션 노트 (5개): `implementation-session-2025-11-07.md` 등
   - 디자인 원칙 (8개): `progressive-disclosure.md`, `user-mental-model.md` 등
   - 중복 문서 (3개): `unified-relationship-taxonomy.md` 등

2. **진입점 연결 부족**:
   - `managed/README.md`에서 링크 끊김
   - 각 문서의 `[[Symbol]]` 참조 부족
   - 코드 참조 (`src/analyzer/Foo.ts:123`) 누락

3. **문서 계층 구조 불명확**:
   - 어떤 문서가 진입점인지 모호
   - 문서 간 관계 불명확
   - SSOT 정의 vs 참조 구분 안 됨

---

## 개선 계획

### Phase 1: 쓸모없는 문서 정리 (우선순위 1)

#### 1.1 Archive 이동 대상

**Historical Docs** (5 files) → `managed/archive/history/`
```bash
managed/reviews/implementation-progress-2025-11-07.md
managed/reviews/system-review-2025-11-06.md
managed/sessions/implementation-session-2025-11-07.md
managed/sessions/work-context-integration-2025-11-07.md
managed/architecture/diagrams/SESSION_SUMMARY.md
```

**Design Principles** (6 files) → `managed/archive/design-principles/`
```bash
managed/concepts/immediate-feedback.md
managed/concepts/progressive-disclosure.md
managed/concepts/purpose-refinement.md
managed/concepts/user-mental-model.md
managed/workflows/add-enhanced-docs-workflow.md
managed/workflows/cli-feedback-cycle.md
managed/workflows/cognitive-user-flow.md
```

#### 1.2 삭제 대상

**Duplicate Docs** (3 files)
```bash
managed/concepts/unified-relationship-taxonomy.md    # → relationships/index.md
managed/concepts/work-context-reliability.md         # → workflows/work-context-workflow.md
managed/relationships/SYMBOL-CONVENTION.md           # → outdated convention doc
```

**Obsolete Specs** (1 file)
```bash
managed/specs/enhanced-database-schema.md            # → already implemented
managed/specs/relationship-standard-format.md        # → covered by relationships/index.md
```

#### 1.3 예상 결과

```
Before: 37 active files
After:  22 active files (41% reduction)

Focus on:
- 11 relationship types (SSOT)
- 5 feature docs
- 3 architecture docs
- 2 workflow docs
- 1 commands index
```

---

### Phase 2: 진입점 문서 강화 (우선순위 2)

#### 2.1 Main Entrypoint 강화

**File**: `managed/README.md`

**현재 문제**:
- 링크만 나열, `[[Symbol]]` 참조 부족
- 코드 참조 없음
- 하위 문서와 연결 약함

**개선 방안**:
```markdown
## Core Workflow

### [[Work Context Workflow]]
**Commands**: [[WorkContextCommand]] (`src/commands/WorkContextCommand.ts`)

파일 작업 전 필요한 모든 컨텍스트 제공:
- Dependencies: [[DepsCommand]], [[WhoUsesCommand]]
- I/O Flow: [[IOAnalyzer]] (`src/analyzer/IOAnalyzer.ts`)
- Test Coverage: [[AnalyzeTestsCommand]]

**Related**: [[Core Workflow Features]] (`managed/features/core-workflow.md`)
```

**목표**:
- 모든 주요 명령어 `[[Symbol]]` 참조 추가
- 각 섹션에 구현 파일 경로 추가
- 하위 문서 명시적 연결

#### 2.2 Relationship Index 강화

**File**: `managed/relationships/index.md`

**현재**: 6.6% 심볼 커버리지

**개선**:
```markdown
## [[Code Dependency]]

**Implementation**:
- Extractor: [[ASTSymbolExtractor]] (`src/analyzer/ASTSymbolExtractor.ts:234`)
- Storage: [[DatabaseManager]] (`src/storage/DatabaseManager.ts:156`)
- Command: [[BuildCommand]] (`src/commands/BuildCommand.ts:89`)

**Related Analyzers**:
- [[DependencyResolver]] (`src/analyzer/DependencyResolver.ts`)
- [[ImportanceClassifier]] (`src/analyzer/ImportanceClassifier.ts`)
```

**목표**: 6.6% → 25% 심볼 커버리지

#### 2.3 Feature Docs 강화

**Files**: `managed/features/*.md`

**현재 문제**: 명령어 나열만, 구현 참조 부족

**개선 패턴**:
```markdown
### [[AnalyzeCallsCommand]]

**Purpose**: Extract call relationships (foo() calls bar())

**Implementation**:
- Main: `src/commands/AnalyzeCallsCommand.ts:45`
- Analyzer: [[CallAnalyzer]] (`src/analyzer/CallAnalyzer.ts:123`)
- Storage: [[unified_relationships]] table

**Dependencies**:
- [[ASTSymbolExtractor]] - AST 파싱
- [[DatabaseManager]] - 관계 저장

**Output**: [[Call Relationships]] (`managed/relationships/CALLS.md`)

**Test**: `src/__tests__/commands/AnalyzeCallsCommand.test.ts`
```

**목표**: 각 명령어마다 완전한 구현 체인 문서화

---

### Phase 3: 고아 코드 연결 (우선순위 3)

#### 3.1 Orphan Analysis

**현재 고아 파일** (95개 중 주요):
```
src/analyzer/CallGraphAnalyzer.ts
src/analyzer/DataFlowAnalyzer.ts
src/analyzer/DependencyResolver.ts
src/analyzer/DocumentationAnalyzer.ts
src/analyzer/ImportanceClassifier.ts
src/analyzer/IntegrationCoverageCalculator.ts
```

**실제로는 사용 중**:
- `CallGraphAnalyzer` → `AnalyzeCallsCommand`에서 사용
- `DataFlowAnalyzer` → `AnalyzeIOCommand`에서 사용
- 단지 문서에서 `[[Symbol]]` 참조가 없어서 고아로 표시됨

#### 3.2 연결 전략

**1단계: 명령어 → Analyzer 연결**
```markdown
# managed/features/analysis-features.md

### [[AnalyzeCallsCommand]]
**Analyzers**:
- [[CallGraphAnalyzer]] (`src/analyzer/CallGraphAnalyzer.ts`)
- [[DependencyResolver]] (`src/analyzer/DependencyResolver.ts`)
```

**2단계: Analyzer 문서 생성** (선택적)
```markdown
# managed/analyzers/call-graph-analyzer.md

# [[CallGraphAnalyzer]]

**Purpose**: Build call graph from AST

**Used By**: [[AnalyzeCallsCommand]]

**Implementation**: `src/analyzer/CallGraphAnalyzer.ts:45`
```

**목표**: 95개 → 30개 고아 파일 (68% 감소)

---

### Phase 4: 자동화 및 지속 개선 (우선순위 4)

#### 4.1 Pre-commit Hook

```bash
# .git/hooks/pre-commit
tsdoc-edge explore-entrypoint managed/README.md --detect-orphans

# Fail if coverage drops below threshold
if coverage < 25%; then
  echo "⚠️ Symbol coverage too low: add [[Symbol]] references"
  exit 1
fi
```

#### 4.2 주간 리포트

```bash
# Weekly cron job
tsdoc-edge explore-entrypoint managed/README.md --detect-orphans > weekly-report.txt

# Email if orphans increase
if orphans > last_week; then
  notify "New orphan code detected"
fi
```

#### 4.3 문서 작성 가이드

**Rule**: 새 기능 추가 시 문서 필수

```markdown
# Template: managed/features/NEW-FEATURE.md

## [[NewFeatureCommand]]

**Implementation**: `src/commands/NewFeatureCommand.ts:XX`

**Dependencies**:
- [[SymbolA]] (`src/path/A.ts`)
- [[SymbolB]] (`src/path/B.ts`)

**Tests**: `src/__tests__/commands/NewFeatureCommand.test.ts`
```

---

## 실행 계획

### Week 1: Cleanup
- [ ] Archive 15 historical/design docs
- [ ] Delete 5 duplicate/obsolete docs
- [ ] Verify remaining 22 docs

### Week 2: Strengthen Entrypoints
- [ ] `managed/README.md`: Add `[[Symbol]]` to all sections
- [ ] `managed/relationships/index.md`: Add implementation chains
- [ ] Update 5 feature docs with complete references

### Week 3: Connect Orphans
- [ ] Map 20 analyzer files to commands
- [ ] Create analyzer docs for key analyzers
- [ ] Re-run orphan detection

### Week 4: Automation
- [ ] Setup pre-commit hook
- [ ] Create weekly audit script
- [ ] Document contribution guidelines

---

## 예상 개선 효과

### Metrics

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Active Docs | 37 | 22 | 41% reduction |
| Symbol Coverage | 11.6% | 30%+ | 2.6x |
| File Coverage | 27.8% | 50%+ | 1.8x |
| Orphan Files | 95 | 30 | 68% reduction |
| Reachable Docs | 9 | 22 | 2.4x |

### Qualitative Benefits

1. **Clarity**: 쓸모없는 문서 제거 → 핵심 문서에 집중
2. **Discoverability**: 진입점 강화 → 전체 시스템 파악 용이
3. **Traceability**: 문서-코드 완전 연결 → 변경 영향 파악
4. **Maintainability**: 고아 코드 감소 → 리팩토링 안전
5. **Automation**: 지속적 검증 → 품질 유지

---

## 성공 기준

### Phase 1 Complete
- [ ] 37 → 22 active docs
- [ ] Zero duplicate docs
- [ ] Archive structure organized

### Phase 2 Complete
- [ ] Symbol coverage > 25%
- [ ] All core commands have implementation chains
- [ ] Main entrypoint reaches 20+ docs

### Phase 3 Complete
- [ ] Orphan files < 40
- [ ] All analyzers mapped to commands
- [ ] File coverage > 45%

### Phase 4 Complete
- [ ] Pre-commit hook active
- [ ] Weekly audit automated
- [ ] Contribution guide published

---

## Next Steps

**Immediate Actions** (오늘):
1. Archive 15 files → `managed/archive/`
2. Delete 5 duplicate files
3. Update `managed/README.md` 진입점

**This Week**:
1. 모든 feature docs에 구현 참조 추가
2. `relationships/index.md` 강화
3. 고아 파일 20개 연결

**측정 및 반복**:
```bash
# Daily check
tsdoc-edge explore-entrypoint managed/README.md

# Target: 11.6% → 15% → 20% → 25% → 30%
```

---

**Last Updated**: 2025-11-08
**Status**: Ready to Execute
**Owner**: Documentation Quality Initiative
