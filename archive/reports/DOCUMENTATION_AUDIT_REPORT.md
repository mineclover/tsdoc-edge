# Documentation Audit Report

> 문서 과다성 검토 및 정리 권장사항

**작성일**: 2025-10-31
**목적**: 커버리지 확보 후 문서의 중복성과 필요성 검토

---

## 📊 전체 통계

```
총 문서 수: 47개
총 라인 수: 15,486 lines
평균 라인 수: 329 lines/document
```

### 규모별 분포

| 규모 | 라인 수 | 문서 수 | 비율 |
|-----|--------|--------|-----|
| 초대형 | 700+ | 3 | 6.4% |
| 대형 | 400-699 | 11 | 23.4% |
| 중형 | 200-399 | 14 | 29.8% |
| 소형 | <200 | 19 | 40.4% |

---

## 🔴 심각한 중복 (즉시 조치 필요)

### 1. GENERATED 파일 완전 중복 (3개 → 1개)

**문제**: 완전히 동일한 파일이 3개 존재
```
GENERATED_FEATURES.md    567 lines  (MD5: 40249d76)
GENERATED_DEPTH0.md      567 lines  (MD5: 40249d76)
GENERATED_DEPTH1.md      567 lines  (MD5: 40249d76)
```

**권장 조치**:
```bash
# 1개만 남기고 삭제
rm docs/GENERATED_DEPTH0.md docs/GENERATED_DEPTH1.md
# 또는 생성 프로세스 검토 후 전체 삭제 고려
```

**영향**: 1,134 lines 절감 (7.3%)

---

### 2. CORE_FEATURES 버전 중복 (2개 → 1개)

**문제**: 구버전과 신버전이 공존
```
CORE_FEATURES.md         338 lines  (구버전, 컴포넌트 나열식)
CORE_FEATURES_V2.md      458 lines  (신버전, [[CoreFeatures]] 심볼)
```

**비교**:
- `CORE_FEATURES.md`: 직접 컴포넌트 설명
- `CORE_FEATURES_V2.md`: 기능별 인덱스, 문서 링크, 산출물 중심

**권장 조치**:
```bash
# 구버전 삭제
rm docs/CORE_FEATURES.md
```

**영향**: 338 lines 절감 (2.2%)

---

### 3. AUTO_INDEXING 문서 중복 (2개 → 1개)

**문제**: 가이드 문서와 기능 정의 문서 내용 중복
```
AUTO_INDEXING_GUIDE.md           309 lines  (사용자 가이드)
features/AUTO_INDEXING.md        332 lines  (기능 정의 + [[AutoIndexing]])
```

**비교**:
- 두 문서 모두 증분 업데이트, Git Hook, VSCode Task 설명
- `features/AUTO_INDEXING.md`가 더 구조화되고 [[]] 심볼 정의 포함

**권장 조치**:
```bash
# 가이드 문서 삭제 (기능 문서가 더 완전함)
rm docs/AUTO_INDEXING_GUIDE.md
```

**영향**: 309 lines 절감 (2.0%)

---

## 🟡 임시/완료 문서 (아카이빙 고려)

### 4. Phase/Report 문서

**문제**: 특정 시점의 분석/완료 리포트가 계속 메인에 위치
```
PHASE1_COMPLETION_REPORT.md      517 lines
DOC_CODE_CONNECTION_REPORT.md    451 lines
ORPHAN_FILES_REPORT.md           186 lines
QUALITY_COMPARISON.md            153 lines
DEPTH_COMPARISON.md              253 lines
```

**권장 조치**:
```bash
# archive/ 디렉토리로 이동
mkdir -p docs/archive/2025-10
mv docs/*REPORT*.md docs/archive/2025-10/
mv docs/*COMPARISON*.md docs/archive/2025-10/
```

**영향**: 1,560 lines 정리 (10.1%)

---

## 🟠 설계 문서 검토 (통합/아카이빙 고려)

### 5. 대형 설계 문서

**문제**: 800 라인 설계 문서가 활성 docs/에 존재
```
REFACTOR_AND_LINKING_DESIGN.md        794 lines  (20KB)
SYMBOL_HIERARCHY_AND_ID_STRATEGY.md   759 lines  (19KB)
DOCUMENT_SYMBOL_DESIGN.md             608 lines  (12KB)
FOLD_UNFOLD_DESIGN.md                 342 lines  (9KB)
```

**검토 질문**:
- 이 설계 문서들이 여전히 참조되는가?
- 내용이 실제 구현에 반영되었는가?
- 기능 문서 (features/)로 대체 가능한가?

**권장 조치**:

**옵션 A - 아카이빙** (구현 완료된 경우):
```bash
mv docs/*DESIGN*.md docs/archive/design/
```

**옵션 B - 통합** (여전히 활성인 경우):
- Document Symbol 관련 → `features/DOCUMENT_SYMBOL_SYSTEM.md`에 통합
- Fold/Unfold 관련 → `FOLD_UNFOLD_GUIDE.md`에 통합
- Refactor 관련 → Phase 완료로 아카이빙

**영향**: 2,503 lines 정리 (16.2%)

---

## 🟢 유지 필요 문서

### 핵심 기능 문서 (features/)
```
✅ CORE_WORKFLOW.md             136 lines
✅ DOCUMENT_SYMBOL_SYSTEM.md    286 lines
✅ SYMBOL_GRAPH.md              310 lines
✅ ANALYSIS_FEATURES.md         417 lines
✅ VALIDATION_FEATURES.md       422 lines
✅ AUTO_INDEXING.md             332 lines
```
**이유**: [[]] 심볼 정의, 코드 연결, 산출물 관리

### 사용자 가이드
```
✅ FOLD_UNFOLD_GUIDE.md         356 lines
✅ DEPENDENCY_ANALYSIS_GUIDE.md  535 lines
✅ CONFIG_GUIDE.md              492 lines
✅ CLI_ADVANCED_FEATURES.md     602 lines
```
**이유**: 사용자 대상 실용 가이드

### 컨벤션 문서
```
✅ TSDOC_CONVENTIONS_PRUNED.md  437 lines
✅ tsdoc-conventions/*.md       (7개 파일)
```
**이유**: 코드 작성 규칙 정의

### 전략/인덱스
```
✅ CORE_FEATURES_V2.md          458 lines  (메인 인덱스)
✅ FEATURE_DOCS_STRATEGY.md     305 lines  (문서화 전략)
✅ DOCUMENTATION_REVIEW_SUMMARY.md 300 lines
```
**이유**: 프로젝트 전체 구조와 전략

---

## 🟣 기타 검토 항목

### stats 관련 문서 (3개)

```
stats-design.md     460 lines
stats-tracking.md   275 lines
stats-simple.md     100 lines
```

**질문**:
- 3개 문서의 역할 구분이 명확한가?
- 통합 가능한가?

**권장**: 내용 검토 후 1-2개로 통합 고려

---

### TSDOC_SPEC 문서 (2개)

```
TSDOC_SPEC_SUMMARY.md    284 lines
TSDOC_SPEC_SUPPORT.md    339 lines
```

**질문**: 두 문서의 차이점이 명확한가?

**권장**: 필요시 통합 또는 역할 명확화

---

## 📋 권장 정리 작업 요약

### 즉시 삭제 (중복 확인 완료)

```bash
# 1. GENERATED 중복 (선택: 1개 유지 또는 전체 삭제)
rm docs/GENERATED_DEPTH0.md docs/GENERATED_DEPTH1.md

# 2. 구버전 CORE_FEATURES
rm docs/CORE_FEATURES.md

# 3. AUTO_INDEXING 가이드 중복
rm docs/AUTO_INDEXING_GUIDE.md
```

**즉시 효과**: 1,781 lines 절감 (11.5%)

---

### 아카이빙 (히스토리 보존)

```bash
# 1. archive 디렉토리 생성
mkdir -p docs/archive/{design,reports}

# 2. 완료/분석 리포트 이동
mv docs/PHASE1_COMPLETION_REPORT.md docs/archive/reports/
mv docs/DOC_CODE_CONNECTION_REPORT.md docs/archive/reports/
mv docs/ORPHAN_FILES_REPORT.md docs/archive/reports/
mv docs/*COMPARISON*.md docs/archive/reports/

# 3. 설계 문서 이동 (검토 후)
mv docs/*DESIGN*.md docs/archive/design/
```

**아카이빙 효과**: 4,063 lines 정리 (26.3%)

---

## 📈 정리 후 예상 결과

### 현재
```
총 문서: 47개
총 라인: 15,486 lines
활성 문서: 47개
```

### 정리 후
```
총 문서: 47개 (아카이빙 11개)
활성 문서: 36개 (-23.4%)
활성 라인: 9,642 lines (-37.7%)
```

### 효과
- ✅ 중복 제거로 일관성 향상
- ✅ 활성 문서 집중도 증가
- ✅ 히스토리는 archive/에 보존
- ✅ 문서 탐색 용이성 개선

---

## 🎯 권장 실행 순서

### Phase 1: 안전한 삭제 (5분)
```bash
# 완전 중복 파일만 삭제
rm docs/GENERATED_DEPTH0.md docs/GENERATED_DEPTH1.md
rm docs/CORE_FEATURES.md
rm docs/AUTO_INDEXING_GUIDE.md
```

### Phase 2: 아카이빙 (10분)
```bash
# archive 구조 생성 후 이동
mkdir -p docs/archive/{design,reports}
# 리포트 이동
mv docs/*REPORT*.md docs/*COMPARISON*.md docs/archive/reports/
```

### Phase 3: 설계 문서 검토 (30분)
- 각 DESIGN 문서의 현재 유효성 확인
- 기능 문서로 통합 또는 아카이빙 결정

### Phase 4: 통합 검토 (1시간)
- stats-*.md 3개 → 1-2개 통합 검토
- TSDOC_SPEC_*.md 역할 명확화

---

## 💡 문서 유지 원칙 (향후)

### 활성 docs/에 두어야 할 문서
1. **기능 정의** (features/): [[]] 심볼, 코드 연결
2. **사용자 가이드**: 실용적 how-to
3. **컨벤션/규칙**: 코드 작성 기준
4. **전략/인덱스**: 프로젝트 구조

### archive/로 이동해야 할 문서
1. **완료 리포트**: 특정 시점 분석
2. **설계 문서**: 구현 완료 후
3. **비교/분석**: 일회성 검토
4. **구버전**: 대체된 문서

### 삭제 가능한 문서
1. **완전 중복**: MD5 동일
2. **자동 생성**: 재생성 가능
3. **임시 파일**: 목적 달성 완료

---

## ✅ 최종 체크리스트

- [ ] GENERATED 중복 파일 처리 결정
- [ ] CORE_FEATURES.md 삭제
- [ ] AUTO_INDEXING_GUIDE.md 삭제
- [ ] archive/ 디렉토리 생성
- [ ] 리포트 문서 아카이빙
- [ ] 설계 문서 유효성 검토
- [ ] stats-*.md 통합 검토
- [ ] 정리 후 index-docs 재실행
- [ ] 정리 후 validate-docs 재실행

---

## 📌 결론

**현재 상태**: 문서 커버리지는 양호하나 **중복과 임시 문서가 37.7%** 차지

**권장 조치**:
1. **즉시 삭제** (중복 3개) - 11.5% 절감
2. **아카이빙** (리포트 11개) - 26.3% 정리
3. **통합 검토** (stats, TSDOC_SPEC)

**기대 효과**: 활성 문서 36개로 집중, 유지보수성 향상, 탐색 용이성 개선
