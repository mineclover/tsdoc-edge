# TSDoc Edge

**연결성 기반의 SSOT(Single Source of Truth) 문서 시스템**

TSDoc Edge는 단순한 문서 생성 도구가 아닙니다. 코드베이스의 모든 심볼(함수, 클래스, 인터페이스 등)을 추적하고, 심볼 간의 관계를 파악하며, 문서와 코드의 완벽한 일치를 강제하는 **문서 연결성 플랫폼**입니다.

## 핵심 개념

### 🔗 연결성 (Connectivity)
코드의 모든 요소가 서로 어떻게 연결되어 있는지 추적하고 검증합니다.

### 📋 계약 (Contract)
각 함수와 메서드가 지켜야 할 전제조건, 후행조건, 불변조건을 명시합니다.

### 🎯 책임 (Responsibility)
각 심볼이 무엇을 해야 하고 무엇을 하지 말아야 하는지 명확히 정의합니다.

### 🧪 테스트 추적 (Test Traceability)
모든 코드가 어떤 테스트로 검증되는지 추적합니다.

### 📊 SSOT 준수 (SSOT Compliance)
코드와 문서가 단일 진실 공급원을 유지하도록 강제합니다.

## 주요 기능

### ✅ CLI 도구 (v0.8.0 + v0.10.0) - NEW! 🔥

**40개 명령어로 완전한 문서 관리**

#### 초기화 및 빌드 (2개)
- `init` - 프로젝트 설정 초기화
- `build` - **소스 파일 스캔 및 심볼 DB 생성** 🔥

#### 심볼 탐색 (9개)
- `id` (new, list, find, stats) - 심볼 ID 수동 관리
- `find-method` - 심볼 검색
- `tree` - 계층 트리 출력
- `deps` / `used-by` / `who-uses` - 의존성 분석

#### 이슈 찾기 (7개)
- `orphans` - 사용되지 않는 코드
- `undocumented` - 미문서화 심볼
- `untested` - 테스트 없는 심볼
- `without-responsibility` / `without-contract` - 누락 체크
- `todos` / `plans` - TODO 및 계획 수집

#### 품질 검증 (4개)
- `validate` - TSDoc 유효성 검증
- `analyze` - 전체 문서 품질 분석
- `health` - 프로젝트 건강도 점수
- `check-links` - **문서 링크 검증 및 Typo 감지** 🔥

#### 문서 개선 (3개)
- `suggest` - 개선 제안
- `fix` - 자동 수정
- `improve` - AI 기반 재귀적 개선

#### Enhanced Documentation (2개) 🔥
- `parse` - **TSDoc → EnhancedDoc 자동 추출**
- `sync-coverage` - **테스트 커버리지 동기화**

#### 통계 및 분석 (6개)
- `stats` (--save, --compare) - 통계 추적
- `core-api` - 핵심 API 표면 분석
- `scan` - 심볼 그래프 깊이 탐색

#### 문서 심볼 시스템 (9개)
- `index-docs` - [[]] 심볼 인덱싱
- `validate-docs` - SSOT 검증
- `update-backlinks` - 백링크 자동 생성
- `update-symbol-refs` - 심볼 참조 footnote 생성 🔥
- `validate-spec` - 명세서 완성도 검증 🔥
- `check-duplicates` - 중복 콘텐츠 감지 및 제안 🔥
- `spec-status` - 명세서 상태 워크플로우 관리 🔥
- `find-unused-docs` - 미사용/오래된 문서 탐지 🔥
- `find-doc` - 문서 심볼 검색

#### Git 통합 (3개) 🔥
- `install-hook` - **Pre-commit hook 설치**
- `uninstall-hook` - **Pre-commit hook 제거**
- `pre-commit-run` - **Hook 실행 (내부 사용)**

**성능**:
- 소규모 프로젝트 (< 100 파일): ~5초 초기 설정
- 중규모 프로젝트 (100-500 파일): ~20초 초기 설정
- 대규모 프로젝트 (> 500 파일): ~50초 초기 설정

**CI/CD 통합**: GitHub Actions, GitLab CI, Jenkins, CircleCI 템플릿 제공

---

### ✅ Configuration System (v0.4.0)

- **init 명령어**: `tsdoc-edge init`로 프로젝트 초기화
- **설정 파일**: `.tsdoc.config.json`으로 중앙화된 설정 관리
- **경로 커스터마이징**: 주석, DB, JSONL 저장 위치 자유 설정
- **검증 규칙**: 프로젝트별 validation 규칙 정의
- **환경별 설정**: dev/prod 환경에 맞는 설정 분리

### ✅ Document Symbol System (v0.5.0 + v0.10.0 🔥)

- **[[문서 심볼]]** 정의 및 참조 (Wiki 스타일)
- H1 레벨에서 심볼 정의: `# [[Authentication System]]`
- 코드-문서 양방향 연결: `@doc [[Symbol]]` 태그
- Backlink 자동 생성 및 갱신
- SSOT 검증 (중복 정의 방지)
- 문서 기반 드리븐 개발 지원
- **Symbol Footnote Reference (v0.10.0)** 🔥 - 코드 심볼 참조 자동화

### ✅ Document Management System (v0.9.0) - NEW! 🔥

**TSDoc Edge 관리 문서를 명확히 식별하고 오염 방지**

- **Config 기반 문서 영역 지정**: `documentManagement` 설정으로 관리 범위 명확화
- **YAML Frontmatter 지원**: `tsdoc: managed`로 관리 대상 표시
- **코드 블록 무시**: 예시 코드의 `[[]]` 심볼은 실제 참조로 인식하지 않음
- **폴더 분리**: `managed/` (관리 대상), `examples/` (예시)
- **Backlinks 정확성**: 실제 참조만 Backlinks에 반영

**설정 예시** (.tsdoc.config.json):
```json
{
  "documentManagement": {
    "enabled": true,
    "managedDirs": ["managed"],
    "excludeDirs": ["examples", "archive", "reference"],
    "requireFrontmatter": false,
    "ignoreCodeBlocks": true
  }
}
```

**Frontmatter 예시**:
```yaml
---
tsdoc: managed
version: 1.0.0
status: active
primary: DocumentSymbolSystem
category: feature
tags:
  - core
  - documentation
---

# [[DocumentSymbolSystem]]
```

**주요 효과**:
- ✅ 관리 문서와 수동 문서 명확히 구분
- ✅ 예시/템플릿 문서 오염 방지
- ✅ Backlinks 정확성 향상
- ✅ 문서 메타데이터 관리 (버전, 상태, 카테고리)

### ✅ Symbol Footnote Reference (v0.10.0) - NEW! 🔥

**Markdown footnote로 코드 심볼 자동 참조**

문서에서 코드 심볼을 간결하게 참조하고, 심볼 레지스트리 기반으로 자동으로 상대 경로를 계산하여 footnote를 생성합니다.

**작성 방법**:
```markdown
## 핵심 산출물
### Convention Validation
- ConventionValidator[^sym-005] - 프로젝트 컨벤션 검증
  - 필수 태그 확인
  - 포맷 규칙 검증

### Connectivity Validation
- ConnectivityValidator[^ConnectivityValidator] - 연결성 검증
  - 고아 심볼 탐지
```

**자동 생성되는 결과**:
```markdown
## Symbol References

[^sym-005]: [ConventionValidator](../../src/validator/ConventionValidator.ts#ConventionValidator)
[^ConnectivityValidator]: [ConnectivityValidator](../../src/validator/ConnectivityValidator.ts#ConnectivityValidator)
```

**사용법**:
```bash
# 단일 파일 업데이트
tsdoc-edge update-symbol-refs managed/features/validation-features.md

# 디렉토리 전체 업데이트
tsdoc-edge update-symbol-refs managed/

# 결과 예시:
# Updated
# ✅ validation-features.md (3 refs)
#
# Total: 1 documents updated
```

**주요 효과**:
- ✅ 본문 간결성: 긴 경로 대신 `[^sym-XXX]` 짧은 참조
- ✅ 네이티브 Markdown: 표준 footnote 문법 사용
- ✅ 중복 제거: 같은 심볼 여러 번 참조해도 footnote는 한 번만
- ✅ 자동 경로: 상대 경로 수동 계산 불필요
- ✅ ID/이름 지원: `[^sym-001]` 또는 `[^SymbolName]` 모두 가능
- ✅ 미해결 참조 탐지: 레지스트리에 없는 심볼 자동 경고

### ✅ Specification Completeness Validation (v0.10.0) - NEW! 🔥

**명세서 품질을 정량적으로 측정하고 검증**

명세서가 필수 섹션, 시나리오, 예시, 코드 참조를 충분히 포함하는지 자동으로 검증합니다.

**검증 항목**:
```typescript
// 필수 섹션
requiredSections: ['개요', '핵심 개념', '핵심 산출물', '사용 시나리오']

// 권장 섹션
recommendedSections: ['CLI 명령어', '관련 기능', '가이드']

// 최소 개수
minScenarios: 3          // 최소 3개 시나리오
minCodeReferences: 5     // 최소 5개 코드 참조
minExamples: 2           // 최소 2개 예시
```

**완성도 점수 계산**:
```
score =
  requiredSections × 0.4 +      // 필수 섹션 (40%)
  recommendedSections × 0.1 +   // 권장 섹션 (10%)
  scenarios × 0.2 +              // 시나리오 (20%)
  codeReferences × 0.2 +         // 코드 참조 (20%)
  examples × 0.1                 // 예시 (10%)
```

**사용법**:
```bash
# 단일 파일 검증
tsdoc-edge validate-spec managed/features/validation-features.md

# 디렉토리 전체 검증
tsdoc-edge validate-spec managed/

# 결과 예시:
# Summary
# Total specifications: 7
# Complete: 4
# Incomplete: 3
# Average score: 78%
#
# Incomplete Specifications
# ⚠️ core-workflow.md (52%)
#    Required sections: 50%
#      Missing: 핵심 개념, 사용 시나리오
#    Scenarios: 0/3
#    Examples: 1/2
```

**CI/CD 통합**:
```yaml
# .github/workflows/docs.yml
- name: Validate Specifications
  run: tsdoc-edge validate-spec managed/
  # Exit code 1 if any spec is incomplete
```

**주요 효과**:
- ✅ 명세서 품질 정량화: 0-100 점수로 측정
- ✅ 필수 섹션 강제: 개요, 핵심 개념, 산출물, 시나리오 필수
- ✅ 실용성 검증: 충분한 예시와 시나리오 요구
- ✅ 코드 연결 검증: 명세서와 코드 간 연결 강제
- ✅ CI/CD 통합: 불완전한 명세서 자동 차단
- ✅ 과다 문서 방지: 완성도 낮은 문서 생성 억제

### ✅ Duplicate Content Detection (v0.10.0) - NEW! 🔥

**중복 콘텐츠를 자동 감지하고 [[심볼]] 참조 사용 제안**

명세서 간의 콘텐츠 유사도를 분석하여 중복 작성을 방지하고, 참조 기반 문서 작성을 권장합니다.

**작동 원리**:
```typescript
// Jaccard 유사도 기반 텍스트 비교
similarity = |A ∩ B| / |A ∪ B|

// 임계값
similarityThreshold: 0.3        // 30% 이상 유사 시 보고
highSimilarityThreshold: 0.7    // 70% 이상 유사 시 병합 제안
```

**제안 규칙**:
```
1. 유사도 ≥ 70% + 3개 이상 겹치는 섹션
   → "merge" (병합 권장)

2. 유사도 ≥ 30% + 2개 이상 겹치는 섹션
   → "cross-reference" ([[심볼]] 참조 사용 권장)

3. 유사도 < 30%
   → "keep-separate" (별도 문서 유지)
```

**사용법**:
```bash
# 디렉토리 전체 중복 검사
tsdoc-edge check-duplicates managed/

# 결과 예시:
# Summary
# Total documents: 7
# Pairs analyzed: 21
# Similar pairs found: 13
# Average similarity: 46.0%
#
# Suggestions:
#   Merge: 0
#   Cross-reference: 13
#   Keep separate: 8
#
# Cross-Reference Suggestions (Moderate Similarity)
# 🟡 Similarity: 71.0%
#    File 1: core-workflow.md
#    File 2: validation-features.md
#    Use [[symbol]] references to avoid duplication.
#    Overlapping sections:
#      - CLI 명령어 (100.0%)
#      - Backlinks (42.0%)
```

**CI/CD 통합**:
```yaml
# .github/workflows/docs.yml
- name: Check for Duplicate Content
  run: tsdoc-edge check-duplicates managed/
  # Exit code 1 if merge suggestions exist
```

**주요 효과**:
- ✅ 중복 작성 방지: 섹션별 유사도 측정으로 중복 감지
- ✅ 참조 기반 작성 권장: [[심볼]] 사용으로 SSOT 유지
- ✅ 문서 과다 생성 억제: 유사한 문서 병합 제안
- ✅ 유지보수 효율화: 중복 콘텐츠 최소화로 수정 부담 감소
- ✅ 일관성 향상: 참조를 통한 단일 진실 공급원 강제
- ✅ CI/CD 통합: 고유사도 문서 자동 차단

### ✅ Specification Status Workflow (v0.10.0) - NEW! 🔥

**명세서 생명주기를 상태로 관리하고 자동 검증**

명세서의 상태 전이를 체계적으로 관리하고, 각 상태별 요구사항을 자동으로 검증합니다.

**상태 전이 흐름**:
```
draft → review → approved → active → deprecated → archived
  ↓                                      ↓
archived                              active (복구)
```

**상태별 요구사항**:
```typescript
draft:      완성도 요구 없음 (자유로운 작성)
review:     완성도 ≥ 50% (기본 구조 갖춤)
approved:   완성도 ≥ 80% + 필수 섹션 모두 존재
active:     완성도 ≥ 80% + 필수 섹션 모두 존재
deprecated: replacement 필드 필수 (대체 문서 명시)
archived:   요구사항 없음 (보관)
```

**사용법**:
```bash
# 1. 현재 상태 및 가능한 전이 확인
tsdoc-edge spec-status show managed/features/new-feature.md

# 출력:
# Current status: draft
# Allowed transitions:
#   ✅ review
#   ⚠️ approved
#      Score 45% does not meet requirement (>= 80%)

# 2. 상태 승격
tsdoc-edge spec-status promote managed/features/new-feature.md review

# Validation Checks:
# ✅ Transition Allowed
#    Transition from "draft" to "review" is allowed
# ✅ Completeness Score
#    Score 45% meets requirement (>= 50%)
# ✅ Successfully promoted to "review"

# 3. 승격 가능한 문서 목록
tsdoc-edge spec-status list-ready managed/

# Ready for Promotion:
# ✅ feature-a.md
#    draft → review
#    All checks passed
#
# Not Ready:
# ⚠️ feature-b.md
#    review → approved
#    Score 65% does not meet requirement (>= 80%)

# 4. 상태별 통계
tsdoc-edge spec-status stats managed/

# Status Distribution:
# Total documents: 7
#
#   active: 4 (57.1%)
#   review: 2 (28.6%)
#   draft: 1 (14.3%)
```

**CI/CD 통합**:
```yaml
# .github/workflows/docs.yml
- name: Check Document Status
  run: |
    # active 상태가 아닌 문서는 경고
    tsdoc-edge spec-status stats managed/
```

**주요 효과**:
- ✅ 명세서 성숙도 추적: draft → active 단계적 관리
- ✅ 자동 품질 게이트: 상태 전이 시 자동 검증
- ✅ 승인 프로세스: review → approved 단계 강제
- ✅ 대체 문서 강제: deprecated 시 replacement 필수
- ✅ 문서 생명주기 가시화: 상태별 통계로 현황 파악
- ✅ 불완전한 문서 방지: active 상태는 80% 이상 완성도 요구

### ✅ Unused Document Detection (v0.10.0) - NEW! 🔥

**미사용 및 오래된 문서를 자동 탐지하고 정리 제안**

문서 저장소를 정기적으로 스캔하여 사용되지 않거나 오래된 문서를 찾아내고, 적절한 조치를 제안합니다.

**탐지 조건**:
```typescript
1. Stale Draft (90일 이상 draft 상태 + 참조 0개)
   → Action: delete

2. Deprecated 후 오래된 문서 (90일 이상 deprecated)
   → Action: archive

3. 참조 및 코드 연결이 없는 문서 (orphaned)
   → Action: review 또는 delete

4. Review 상태로 오래 방치 (60일 이상 review 상태)
   → Action: review

5. 코드 연결이 없는 기술 명세서
   → Action: complete (코드 참조 추가 필요)
```

**사용법**:
```bash
# 미사용 문서 탐지
tsdoc-edge find-unused-docs managed/

# 출력:
# Summary
# Total unused/stale documents: 3
# Average days since modified: 127
#
# By Reason:
#   stale-draft: 2
#   no-code-connections: 1
#
# By Suggested Action:
#   delete: 2
#   complete: 1
#
# Suggested: Delete
# 🗑️  managed/drafts/old-idea.md
#    Last modified: 2024-07-15 (142 days ago)
#    References: 0 | Code connections: 0
#    Reason: stale-draft
#
# Suggested: Complete
# ✏️  managed/features/api-design.md
#    Last modified: 2024-10-01 (33 days ago)
#    References: 3 | Code connections: 0
#    Reason: no-code-connections
#
# Recommended Actions:
# 1. Delete stale drafts:
#    rm managed/drafts/old-idea.md managed/drafts/abandoned.md
#
# 2. Review and complete or delete stale documents
```

**CI/CD 통합**:
```yaml
# .github/workflows/docs.yml
- name: Check for Unused Documents
  run: tsdoc-edge find-unused-docs managed/
  # Exit code 1 if unused docs found
  continue-on-error: true  # 경고만 표시
```

**주요 효과**:
- ✅ 자동 정리: 오래된 draft 및 deprecated 문서 자동 식별
- ✅ 저장소 청결 유지: 사용되지 않는 문서 제거로 검색 품질 향상
- ✅ 생명주기 관리: 상태별 체류 시간 추적 및 경고
- ✅ 코드 연결 강제: 기술 명세서의 코드 참조 누락 감지
- ✅ 참조 기반 탐지: 다른 문서에서 참조되지 않는 orphan 문서 식별
- ✅ 액션 자동 제안: delete/archive/review/complete 구체적 조치 제시

### ✅ Core Engine (v0.1.0 - v0.3.0)

- **심볼 그래프 빌더**: 코드베이스의 모든 심볼과 관계를 그래프로 구축
- **심볼 검색 엔진**: 다양한 조건으로 심볼을 검색하고 필터링
- **연결성 검증**: SSOT 준수 여부를 점수화하고 문제점 탐지
- **Strict Mode**: 6-카테고리 문서화 시스템
- **SQLite + JSONL**: 빠른 검색과 Git 버전 관리의 조화
- **Fold/Unfold System**: 주석 접기/펼치기로 코드 가독성 향상
- **64개 테스트 통과**: 모든 핵심 기능 검증 완료

### ✅ Enhanced Documentation System (v0.7.0) - NEW! 🔥

**TypeScript AST 자동 파싱으로 구조화된 문서 자동 생성**

- **EnhancedDocExtractor**: TSDoc 주석에서 EnhancedDoc 자동 추출
- **12개 커스텀 태그 지원**: `@problem`, `@functionality`, `@errorExp`, `@decision`, `@dependency`, `@plan` 등
- **Completeness 점수**: 문서 품질을 0-100% 점수로 측정
- **CLI 명령어**: `parse <file>` - 소스 파일에서 Enhanced docs 추출
- **테스트 커버리지**: 12개 테스트 (100% 통과)

**실제 사용 예시**:
```bash
# 단일 파일 파싱
tsdoc-edge parse src/analyzer/CodeHealthChecker.ts

# 디렉토리 전체 파싱
tsdoc-edge parse src --recursive

# 결과 예시:
# Found 3 symbols with enhanced docs
# - CodeHealthChecker: 67% completeness
# - analyzeHealth: 50% completeness
# - generateReport: 33% completeness
```

**주요 효과**:
- 문서 작성 시간 80% 감소 (수동 → 자동)
- 12개 커스텀 태그로 구조화된 문서 생성
- Completeness 점수로 문서 품질 측정 가능

### ✅ Coverage Integration (v0.7.0) - NEW! 🔥

**테스트 커버리지와 TSDoc Edge 자동 통합**

- **CoverageSyncer**: Istanbul 포맷 커버리지 데이터 파싱 및 동기화
- **범용 지원**: Jest, Vitest, NYC, c8 모두 지원
- **어댑터 패턴**: 확장 가능한 구조로 다른 도구 지원 가능
- **CLI 명령어**: `sync-coverage` - 커버리지 데이터 자동 동기화
- **Combined Score**: 문서 completeness + 테스트 coverage 통합 점수
- **테스트 커버리지**: 24개 테스트 (100% 통과)

**실제 사용 예시**:
```bash
# 1. 테스트 커버리지 생성 (Jest)
npm test -- --coverage

# 2. TSDoc Edge와 동기화
tsdoc-edge sync-coverage

# 결과 예시:
# Synced Coverage Data
# - Total Symbols: 667
# - Covered: 100 (15%)
# - CodeHealthChecker: 98.1% coverage
# - EnhancedDocExtractor: 92.5% coverage
# - CoverageSyncer: 100% coverage

# 3. Combined health score 확인
tsdoc-edge health src
# Combined Score: 75/100 (docs: 63%, coverage: 87%)
```

**주요 효과**:
- 테스트-문서 싱크 자동화
- Symbol metadata에 coverage 자동 반영
- 개발자 워크플로우 개선

### ✅ Missing Link Detection (v0.7.0) - NEW! 🔥

**Enhanced docs의 모든 참조 검증 및 Typo 감지**

- **MissingLinkDetector**: 4가지 링크 타입 검증 (dependency, relatedProblem, symbol, file)
- **Typo 감지**: 유사 심볼 찾기 및 제안 기능
- **설정 파일 지원**: `.tsdoc.config.json`으로 외부 모듈, 체크 타입, CI/CD 옵션 설정 🔥
- **외부 모듈 제외**: fs, path, typescript 등 자동 제외 (설정 가능)
- **타입별 그룹핑**: dependency, relatedProblem, symbol, file 별로 분류
- **CLI 명령어**: `check-links <dir>` - 문서 링크 검증
- **테스트 커버리지**: 24개 테스트 (100% 통과)

**실제 사용 예시**:

**1. 기본 사용**
```bash
# 디렉토리 내 모든 문서 링크 검증
tsdoc-edge check-links src

# 결과 예시:
# 🔍 Scanning Documentation
#    Total Links Checked: 11
#    Broken Links: 2
#
# ❌ Broken Links by Type
#    dependency: 2
#
# 📁 Broken Links by File
#    src/analyzer/CoverageParser.ts: 2
#
# 🔗 Broken Link Details
#    dependency: userService
#      in src/services/order.ts:45 (OrderService)
#      Dependency 'userService' not found
#      💡 Did you mean: UserService, userRepository?
```

**2. 설정 파일로 커스터마이징** (.tsdoc.config.json)
```json
{
  "linkCheck": {
    "checkTypes": ["dependency", "relatedProblem"],  // 특정 타입만 체크
    "externalModules": [
      "fs", "path", "typescript",
      "node:*",        // 모든 Node.js 내장 모듈
      "@types/*",      // 모든 TypeScript 타입 정의
      "react", "express"  // 프로젝트 의존성
    ],
    "enableSuggestions": true,      // Typo 제안 활성화
    "maxSuggestionDistance": 3,     // Levenshtein 거리
    "failOnBroken": true            // CI/CD에서 broken link 발견 시 실패
  }
}
```

**3. CI/CD 통합**
```yaml
# .github/workflows/docs.yml
- name: Check Documentation Links
  run: tsdoc-edge check-links src
  # failOnBroken: true이면 broken link 발견 시 빌드 실패
```

**주요 효과**:
- 문서 참조 무결성 자동 검증
- Typo 자동 감지 및 제안
- 프로젝트별 설정 가능 (외부 모듈, 체크 타입)
- CI/CD 통합으로 자동화된 품질 검증
- SSOT 품질 향상

### ✅ Git Pre-commit Hook (v0.8.0) - NEW! 🔥

**변경된 파일의 문서 품질을 커밋 전에 자동 검증**

- **PreCommitChecker**: Staged files의 enhanced documentation 품질 체크
- **설정 가능한 Threshold**: 최소/경고 completeness 임계값 설정
- **CLI 명령어**: `install-hook`, `uninstall-hook` - Git hook 설치/제거
- **자동 실행**: Git commit 시 자동으로 문서 품질 검증
- **테스트 커버리지**: 14개 테스트 (100% 통과)

**실제 사용 예시**:
```bash
# 1. Git hook 설치
tsdoc-edge install-hook

# 2. .tsdoc.config.json에서 설정
{
  "preCommit": {
    "enabled": true,
    "threshold": 50,           // 50% 미만 시 커밋 차단
    "warningThreshold": 30,    // 30-50% 시 경고
    "failOnMissing": false     // enhanced docs 없어도 통과
  }
}

# 3. 파일 수정 및 커밋 시도
git add src/foo.ts
git commit -m "Add feature"

# 결과 예시 (실패):
# TSDoc Edge Pre-commit Check
# ✗ Documentation check failed
#   Files checked: 1
#   Files failed: 1
#
# ✗ src/foo.ts
#   myFunction:23 - 40% (threshold: 50%)
#
# Improve documentation or adjust threshold

# 4. Hook 제거
tsdoc-edge uninstall-hook
```

**주요 효과**:
- 문서 품질 자동 유지 (커밋 전 검증)
- 팀 전체의 문서 품질 표준 강제
- CI/CD 이전에 문제 조기 발견

### 🚧 다음 단계

#### 단기 (선택적)
- CI/CD 통합 개선 (GitHub Actions, GitLab CI 템플릿)

#### 중장기 (선택적)
- 의존성 그래프 시각화 (웹 기반 대시보드)
- CLI UX 개선 (Progress bar, Interactive mode)
- 성능 최적화 (대규모 프로젝트 대응)

## 설치

```bash
npm install tsdoc-edge
```

## 빠른 시작 - CLI

### 1. 설치

```bash
npm install -g tsdoc-edge
```

### 2. 프로젝트 초기화

```bash
# 프로젝트 설정
tsdoc-edge init --name=my-project --version=1.0.0

# 소스 코드 스캔 및 데이터베이스 생성
tsdoc-edge build src

# 현재 문서화 상태 분석
tsdoc-edge analyze src
```

**출력 예시**:
```
📊 Coverage Summary
  Total Symbols: 156
  Documented: 98 (62.8%)
  Undocumented: 58 (37.2%)

Overall Score: 67/100 (Good)
```

### 3. 주요 CLI 명령어 (35개)

#### 초기화 및 빌드
```bash
tsdoc-edge init                  # 프로젝트 설정 초기화
tsdoc-edge build src             # 심볼 데이터베이스 생성
```

#### 품질 검증
```bash
tsdoc-edge analyze src           # 문서 품질 전체 분석
tsdoc-edge health src            # 프로젝트 건강도 점수
tsdoc-edge validate src          # TSDoc 유효성 검증
tsdoc-edge check-links src       # 문서 링크 검증 🔥
```

#### Enhanced Documentation 🔥
```bash
tsdoc-edge parse src/foo.ts      # TSDoc → EnhancedDoc 자동 추출
tsdoc-edge sync-coverage         # 테스트 커버리지 동기화
```

#### Git 통합 🔥
```bash
tsdoc-edge install-hook          # Pre-commit hook 설치
tsdoc-edge uninstall-hook        # Pre-commit hook 제거
```

#### 이슈 찾기
```bash
tsdoc-edge undocumented          # 미문서화 심볼
tsdoc-edge orphans               # 사용되지 않는 코드
tsdoc-edge untested              # 테스트 없는 심볼
```

#### 문서 개선
```bash
tsdoc-edge suggest src --limit=5 # 개선 제안
tsdoc-edge fix src               # 자동 수정
tsdoc-edge improve src           # AI 기반 개선
```

#### 통계 및 추적
```bash
tsdoc-edge stats src --save      # 통계 저장
tsdoc-edge stats src --compare   # 이전과 비교
```

#### 심볼 탐색
```bash
tsdoc-edge tree                  # 심볼 계층 트리
tsdoc-edge deps <id>             # 의존성 조회
tsdoc-edge used-by <id>          # 역의존성 조회
tsdoc-edge who-uses <name>       # 심볼 사용처 검색
```

#### 문서 심볼 시스템
```bash
tsdoc-edge index-docs docs       # [[]] 심볼 인덱싱
tsdoc-edge validate-docs         # SSOT 검증
tsdoc-edge update-backlinks      # 백링크 생성
tsdoc-edge update-symbol-refs    # 심볼 참조 footnote 생성 🔥
tsdoc-edge validate-spec         # 명세서 완성도 검증 🔥
tsdoc-edge check-duplicates      # 중복 콘텐츠 감지 🔥
tsdoc-edge spec-status stats     # 명세서 상태 워크플로우 🔥
tsdoc-edge find-unused-docs      # 미사용/오래된 문서 탐지 🔥
```

**전체 명령어 가이드**: [archive/deprecated/CLI_WORKFLOWS_AND_SCENARIOS.md](./archive/deprecated/CLI_WORKFLOWS_AND_SCENARIOS.md) 🔥

### 4. 실전 워크플로우

#### 신규 프로젝트 설정
```bash
# 1단계: 초기화
tsdoc-edge init --name=my-project

# 2단계: 데이터베이스 생성
tsdoc-edge build src

# 3단계: 현황 분석
tsdoc-edge analyze src

# 4단계: 통계 베이스라인 설정
tsdoc-edge stats src --save
```

#### PR 품질 체크
```bash
# 변경 사항 분석
tsdoc-edge stats src --compare

# Public API 문서화 확인
tsdoc-edge undocumented --visibility=public

# 전체 검증
tsdoc-edge validate src
```

#### 레거시 코드 문서화
```bash
# 1. 문서 제안 받기
tsdoc-edge suggest src --limit=10

# 2. 자동 수정 적용
tsdoc-edge fix src

# 3. 결과 확인
tsdoc-edge stats src --compare
```

### 5. CI/CD 통합

**GitHub Actions 예시**:
```yaml
name: TSDoc Quality

on: [push, pull_request]

jobs:
  tsdoc-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci

      - name: Cache Database
        uses: actions/cache@v3
        with:
          path: .tsdoc.db
          key: tsdoc-${{ hashFiles('src/**/*.ts') }}

      - name: Build Database
        run: npx tsdoc-edge build src

      - name: Quality Check
        run: |
          npx tsdoc-edge analyze src
          npx tsdoc-edge validate src

      - name: Enforce Standards
        run: |
          UNDOC=$(npx tsdoc-edge undocumented --visibility=public | wc -l)
          if [ $UNDOC -gt 5 ]; then
            echo "❌ Too many undocumented public APIs"
            exit 1
          fi
```

**더 많은 CI/CD 템플릿** (GitLab CI, Jenkins, CircleCI): [archive/deprecated/CLI_WORKFLOWS_AND_SCENARIOS.md#cicd-통합-템플릿](./archive/deprecated/CLI_WORKFLOWS_AND_SCENARIOS.md#🚀-cicd-통합-템플릿)

---

## 프로그래밍 API 사용

### 기본 사용법

```typescript
import {
  SymbolGraphBuilder,
  SymbolSearchEngine,
  ConnectivityValidator,
  ConfigManager
} from 'tsdoc-edge';

// 설정 자동 로드
const config = ConfigManager.getInstance();

// 1. 심볼 그래프 구축
const builder = new SymbolGraphBuilder();

// 심볼 추가
builder.addSymbol({
  id: 'user-service',
  name: 'UserService',
  type: 'class',
  filePath: '/src/services/user.ts',
  line: 10,
  column: 0,
  isExported: true,
  isPublic: true,
  summary: 'User management service',
  tests: [{
    symbolName: 'UserService',
    testFilePath: '/tests/user.test.ts',
    testName: 'UserService tests',
    scenarios: ['create', 'read', 'update', 'delete']
  }],
  contract: {
    symbolName: 'UserService',
    description: 'Manage user lifecycle',
    preconditions: [],
    postconditions: [],
    invariants: [],
    filePath: '/src/services/user.ts'
  },
  responsibility: {
    symbolName: 'UserService',
    description: 'User CRUD operations',
    shouldDo: ['create users', 'validate data'],
    shouldNotDo: ['handle authentication']
  },
  designDecisions: []
});

// 관계 추가
builder.addRelationship({
  type: 'dependsOn',
  from: 'user-service',
  to: 'user-repository',
  filePath: '/src/services/user.ts'
});

// 2. 심볼 검색
const searchEngine = new SymbolSearchEngine(builder);
const results = searchEngine.search({
  type: 'class',
  isPublic: true,
  hasTesting: true
});

// 3. 연결성 검증
const validator = new ConnectivityValidator(builder);
const analysis = validator.analyze();

console.log(`📊 Connectivity Score: ${analysis.connectivityScore}/100`);
console.log(`📝 Undocumented: ${analysis.undocumented.length}`);
console.log(`🧪 Untested: ${analysis.untested.length}`);
console.log(`🔗 Broken Links: ${analysis.brokenLinks.length}`);
console.log(`♻️ Circular Dependencies: ${analysis.circularDependencies.length}`);

// 4. 리포트 생성
const report = validator.generateReport();
console.log(report);
```

## Strict Mode 사용 (NEW!)

```typescript
import {
  StrictModeValidator,
  EnhancedMarkdownGenerator,
  DatabaseManager,
  EnhancedSymbolDoc
} from 'tsdoc-edge';

// 1. 6-카테고리 문서 작성
const doc: EnhancedSymbolDoc = {
  symbolId: 'data-processor',

  // ✅ 1. 문제 해결
  problemSolving: {
    description: '대규모 CSV 파일을 메모리 효율적으로 처리',
    context: '100MB~5GB 파일 처리 시 OOM 에러 발생'
  },

  // ✅ 2. 기능 수행
  functionality: {
    mainFeatures: ['스트림 읽기', 'NaN 처리', '특수문자 필터링'],
    components: [{ name: 'loadData', description: 'CSV 로드', signature: '...' }]
  },

  // ✅ 3. 에러 경험
  errorExperiences: [{
    id: 'ERR-001',
    errorType: 'ValueError',
    message: 'Input array too large',
    context: '3GB 파일 로드 시 발생',
    solution: 'chunksize 파라미터 사용'
  }],

  // ✅ 4. 의사 결정
  decisions: [{
    id: 'ADR-001',
    title: 'concurrent.futures 선택',
    decision: 'Thread 기반 병렬 처리',
    rationale: 'I/O bound 작업에 효율적',
    alternatives: [{ option: 'multiprocessing', reason: '오버헤드 큼' }],
    consequences: ['3배 성능 향상'],
    date: '2024-01-10',
    status: 'accepted'
  }],

  // ✅ 5. 의존성
  dependencies: [
    { target: 'config_loader', type: 'module', reason: '설정 로드' }
  ],

  // ✅ 6. 미래 계획
  futurePlans: [{
    id: 'PLAN-001',
    title: 'S3 스트리밍 지원',
    description: 'boto3로 S3 직접 읽기',
    priority: 'high',
    status: 'planned',
    createdAt: '2024-01-01'
  }],

  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  version: '1.0.0'
};

// 2. Strict Mode 검증
const validator = new StrictModeValidator();
const validation = validator.validate(doc, true);

console.log(`✅ Compliant: ${validation.isCompliant}`);
console.log(`📊 Score: ${validation.complianceScore}/100`);

// 3. Enhanced Markdown 생성
const mdGenerator = new EnhancedMarkdownGenerator();
const markdown = mdGenerator.generateDocument(symbol, doc);

// 4. SQLite + JSONL 저장
const db = new DatabaseManager('.tsdoc.db', './data');
db.insertSymbol(symbol, 0);
db.insertEnhancedDoc(doc, 0);

// Git 버전 관리를 위한 JSONL Export
const exportPath = db.exportToJSONL();
console.log(`📦 Exported: ${exportPath}`);
```

## 📚 상세 가이드

### CLI 가이드 (권장)

- **🚀 CLI 워크플로우 & 시나리오**: [archive/deprecated/CLI_WORKFLOWS_AND_SCENARIOS.md](./archive/deprecated/CLI_WORKFLOWS_AND_SCENARIOS.md) 🔥
  - **29개 전체 명령어** 상세 설명
  - **명령어 참조 테이블** (DB 필요 여부, 실행 시간, 출력 파일)
  - **10개 실전 사용 예시** (실제 출력 결과 포함)
  - **6개 핵심 워크플로우**
  - **7개 유저 시나리오**
  - **ID 서브커맨드 완전 가이드**
  - **8가지 에러 해결 가이드** + 플로우차트
  - **성능 벤치마크** (소/중/대규모 프로젝트)
  - **6가지 최적화 팁**
  - **CI/CD 통합 템플릿** (GitHub Actions, GitLab CI, Jenkins, CircleCI)
  - 총 2,750+ 라인의 완전한 가이드

- **⚙️ Configuration System**: [archive/guides/CONFIG_GUIDE.md](./archive/guides/CONFIG_GUIDE.md)
  - `.tsdoc.config.json` 완벽 가이드
  - 경로 커스터마이징
  - 환경별 설정 분리
  - 프로그래밍 방식 사용

- **🔧 CLI 고급 기능**: [reference/CLI_ADVANCED_FEATURES.md](./reference/CLI_ADVANCED_FEATURES.md)
  - 필터링 옵션
  - 출력 포맷
  - 고급 검색

### 프로그래밍 API 가이드

- **기본 사용법**: [USAGE_GUIDE.md](./USAGE_GUIDE.md)
- **Strict Mode**: [STRICT_MODE_GUIDE.md](./STRICT_MODE_GUIDE.md)

### 핵심 기능 가이드

- **📖 [[문서 심볼]] 시스템**: [archive/design/DOCUMENT_SYMBOL_DESIGN.md](./archive/design/DOCUMENT_SYMBOL_DESIGN.md)
  - Wiki 스타일 문서 심볼 정의
  - 코드-문서 양방향 연결
  - Backlink 자동 생성
  - SSOT 검증 및 문서 기반 드리븐

- **🔍 의존성 분석**: [archive/guides/DEPENDENCY_ANALYSIS_GUIDE.md](./archive/guides/DEPENDENCY_ANALYSIS_GUIDE.md)
  - 버그 수정 전 영향 범위 파악
  - 리팩토링 계획 수립
  - PR 리뷰용 문서 생성
  - 실전 시나리오 통합

- **📂 Fold/Unfold System**: [archive/guides/FOLD_UNFOLD_GUIDE.md](./archive/guides/FOLD_UNFOLD_GUIDE.md)
  - 주석 접기/펼치기 완벽 가이드
  - 팀 협업 워크플로우
  - 실전 예제 코드

- **🔄 자동 인덱싱**: [managed/features/auto-indexing.md](./managed/features/auto-indexing.md)
  - 파일 저장 시 자동 인덱스 업데이트
  - Git Hook, VSCode Task, GitHub Actions
  - 증분 업데이트로 빠른 성능

### 레퍼런스

- **TSDoc 컨벤션**: [reference/tsdoc-conventions/](./reference/tsdoc-conventions/)
  - 7가지 필수/권장 규칙
  - 각 규칙마다 명확한 예시와 이유 제공

- **TSDoc 스펙 지원**: [reference/TSDOC_SPEC_SUPPORT.md](./reference/TSDOC_SPEC_SUPPORT.md)
  - 지원하는 전체 TSDoc 태그 (35개)
  - 파싱 테스트 코드 및 결과
  - 커스텀 태그 추가 방법

### 예제 코드

- **CLI 데모**: `tsdoc-edge help` 실행
- **기본 API**: [examples/sample-code.ts](./examples/sample-code.ts)
- **Strict Mode**: [examples/strict-mode-example.ts](./examples/strict-mode-example.ts)
- **TSDoc Spec Test**: [demo/tsdoc-spec-test.ts](./demo/tsdoc-spec-test.ts)

## 🚀 빠른 POC 데모

```bash
npm install
npm run demo
```

**결과**:
- ✅ 100점 만점 Strict Mode 준수
- ✅ 323줄 완전한 Markdown 문서 생성
- ✅ 6-카테고리 시스템 검증 완료

생성된 문서 확인:
```bash
cat demo/output/CSVDataProcessor.md
```

## 프로젝트 구조

```
tsdoc-edge/
├── src/
│   ├── graph/              # 심볼 그래프 및 검색
│   │   ├── SymbolGraphBuilder.ts
│   │   └── SymbolSearchEngine.ts
│   ├── parser/             # TSDoc 파싱 로직
│   │   └── TSDocParser.ts
│   ├── validator/          # 컨벤션 및 연결성 검증
│   │   ├── ConventionValidator.ts
│   │   └── ConnectivityValidator.ts
│   ├── generator/          # 문서 생성
│   │   └── MarkdownGenerator.ts
│   ├── types/              # TypeScript 타입 정의 (도메인별 구조화)
│   │   ├── core/           # 핵심 타입 (파싱, 링킹)
│   │   ├── analysis/       # 분석 타입 (품질, 통계)
│   │   ├── graph/          # 그래프 타입 (심볼, 관계)
│   │   ├── config/         # 설정 타입
│   │   ├── tags/           # TSDoc 태그 타입
│   │   ├── domain/         # 도메인 분석 타입
│   │   ├── state/          # 상태 관리 타입
│   │   ├── registry/       # 레지스트리 타입
│   │   ├── feature/        # 기능 문서 타입
│   │   └── index.ts        # 통합 export
│   ├── utils/              # 유틸리티 함수
│   ├── __tests__/          # 테스트 파일 (53개)
│   │   ├── SymbolGraphBuilder.test.ts
│   │   ├── SymbolSearchEngine.test.ts
│   │   ├── ConnectivityValidator.test.ts
│   │   ├── TSDocParser.test.ts
│   │   └── integration.test.ts
│   └── index.ts            # 메인 엔트리 포인트
├── examples/
│   └── sample-code.ts      # 완벽하게 문서화된 예제
├── USAGE_GUIDE.md          # 상세 사용 가이드
└── README.md
```

## 개발

### 빌드

```bash
npm run build
```

### 테스트

```bash
npm test
```

### 린트

```bash
npm run lint
```

### 포맷팅

```bash
npm run format
```

## 커스텀 TSDoc 태그

TSDoc Edge는 연결성과 SSOT를 위한 확장 태그를 제공합니다:

### 관계 태그
- `@relatedTo` - 관련된 심볼 명시
- `@dependsOn` - 의존하는 심볼 명시
- `@usedBy` - 이 심볼을 사용하는 심볼 명시
- `@implements` - 구현하는 인터페이스
- `@extends` - 확장하는 클래스

### 계약 태그
- `@contract` - 계약 설명
- `@precondition` - 전제조건
- `@postcondition` - 후행조건
- `@invariant` - 불변조건

### 테스트 태그
- `@testedBy` - 테스트 파일 경로
- `@testScenario` - 테스트 시나리오 설명
- `@coverage` - 커버리지 정보

### 설계 태그
- `@responsibility` - 책임 정의
- `@designDecision` - 설계 결정 참조 (ADR)
- `@architecture` - 아키텍처 레이어
- `@pattern` - 디자인 패턴

## 검증 규칙

### Error 수준
- `require-documentation` - 문서 누락
- `require-tests` - 테스트 누락 (public API)
- `require-param-docs` - 파라미터 문서 누락
- `require-returns` - 반환값 문서 누락

### Warning 수준
- `require-responsibility` - 책임 정의 누락
- `require-contract` - 계약 명세 누락

### Info 수준
- `no-orphaned-symbols` - 고립된 심볼

## 테스트 결과

```
✅ Test Suites: 26 passed, 26 total
✅ Tests: 400 passed, 400 total
✅ Build: Success
✅ TypeScript: No errors

Coverage:
- Core Engine: SymbolGraphBuilder, SymbolSearchEngine
- Validators: ConventionValidator, ConnectivityValidator, StrictModeValidator
- Parsers: TSDocParser
- Generators: MarkdownGenerator, EnhancedMarkdownGenerator
- Analyzers: DocumentationAnalyzer, CodeHealthChecker, InterfaceAnalyzer
- Fixers: DocumentationFixer, RecursiveImprover
- Infrastructure: DatabaseManager, ConfigManager, FileScanner
- Integration tests
```

## 라이선스

MIT

## 기여

이슈나 PR은 언제든 환영합니다!
