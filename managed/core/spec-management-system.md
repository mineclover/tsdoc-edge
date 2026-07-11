---
title: spec-management-system
type: system
category: core
status: active
canonical: true
---

# [[Spec Management System]]

> 문서 명세의 완성도, 상태, 버전을 관리하는 생명주기 시스템

---

## 개요

Spec Management System은 문서 명세(Specification)의 생명주기를 관리합니다. 완성도 측정, 상태 전이, 버전 추적, 미사용 문서 탐지를 통해 문서 품질을 체계적으로 관리합니다.

**핵심 가치**: 설계/구현 완성도 분리 측정, 상태 기반 워크플로우, 불필요한 문서 정리

---

## Module Specification

### Purpose
문서 명세의 생명주기(초안→검토→승인→활성→폐기) 및 품질 관리

### Input
- 마크다운 문서 (Frontmatter 포함)
- 코드 참조 정보
- 상태 전이 요청

### Output
- `SpecCompletenessResult`: 완성도 분석
- `SpecStatusTransition`: 상태 전이 결과
- `SpecVersion[]`: 버전 이력
- `UnusedDocument[]`: 미사용 문서 목록

### Context
- Frontmatter로 메타데이터 관리
- [[Document Symbol System]]과 연동
- 설계 완성도와 구현 완성도 분리

### Logic
```
1. 문서 로드 → Frontmatter 파싱
2. 섹션 분석 → 필수/권장 섹션 확인
3. 참조 수집 → 코드/문서 참조 카운트
4. 점수 계산 → 가중치 기반 완성도
5. 상태 검증 → 전이 가능 여부 확인
```

### Effect
- Frontmatter 메타데이터 갱신
- 버전 이력 기록

### Scope
- `SpecCompletenessValidator`: 완성도 측정
- `SpecContentSimilarityChecker`: 중복 탐지
- `SpecStatusManager`: 상태 관리
- `SpecVersionManager`: 버전 추적
- `UnusedDocumentDetector`: 미사용 탐지

---

## 핵심 컴포넌트

### [[SpecCompletenessValidator]]

문서 완성도 측정

```typescript
/**
 * @doc [[Spec Management System]]
 * @functionality 필수 섹션, 코드 참조, 예제 완성도 측정
 * @decision 설계/구현 완성도 분리
 * @rationale 코드 없이도 설계 품질 측정 가능
 */
class SpecCompletenessValidator {
  validate(filePath: string): SpecCompletenessResult
  checkRequiredSections(content: string): SectionCheckResult
  extractSections(content: string): Map<string, string>
  calculateScores(): { designScore: number; implementationScore: number }
}
```

**Source**: `src/spec/SpecCompletenessValidator.ts`

### SpecStatusManager

문서 상태 생명주기 관리

```typescript
/**
 * @doc [[Spec Management System]]
 * @problem 문서 상태 관리의 일관성
 * @solves 상태 전이 규칙 강제
 * @context draft → review → approved → active → deprecated → archived
 */
class SpecStatusManager {
  updateStatus(filePath: string, newStatus: SpecStatus): SpecStatusTransition
  validateTransition(from: SpecStatus, to: SpecStatus): TransitionValidation
  getMetadata(filePath: string): SpecMetadata
}
```

**Source**: `src/spec/SpecStatusManager.ts`

### SpecVersionManager

버전 이력 추적

```typescript
/**
 * @doc [[Spec Management System]]
 * @functionality 버전 기록, 이력 조회, 변경 비교
 */
class SpecVersionManager {
  recordVersion(filePath: string, content: string, reason: string): void
  getVersionHistory(filePath: string): SpecVersion[]
  diffVersions(v1: SpecVersion, v2: SpecVersion): VersionDiff
}
```

**Source**: `src/spec/SpecVersionManager.ts`

### [[UnusedDocumentDetector]]

미사용 문서 탐지

```typescript
/**
 * @doc [[Spec Management System]]
 * @depends DocumentSymbolRegistry
 * @depType runtime
 * @depReason 문서 참조 정보 조회
 */
class UnusedDocumentDetector {
  detectUnused(docs: string[]): UnusedDocument[]
  analyzeReferences(filePath: string): ReferenceAnalysis
  suggestAction(unused: UnusedDocument): 'archive' | 'delete' | 'review'
}
```

**Source**: `src/spec/UnusedDocumentDetector.ts`

---

## 완성도 측정

### 설계 완성도 (코드 없이 측정)

| 항목 | 가중치 | 기준 |
|------|--------|------|
| 필수 섹션 | 40% | 개요, 핵심개념, 핵심산출물, 사용시나리오 |
| 권장 섹션 | 20% | CLI명령어, 관련기능, 가이드 |
| 시나리오 수 | 25% | 최소 3개 |
| 개념 참조 | 15% | [[Symbol]] 참조 수 |

### 구현 완성도 (코드 필요)

| 항목 | 가중치 | 기준 |
|------|--------|------|
| 코드 참조 | 50% | 최소 5개 소스 참조 |
| 예제 코드 | 30% | 최소 2개 예제 |
| 교차 참조 | 20% | 다른 문서 참조 수 |

### 점수 계산

```typescript
interface SpecCompletenessResult {
  filePath: string
  score: number           // 전체 점수 (0-100)
  designScore: number     // 설계 점수 (0-100)
  implementationScore: number  // 구현 점수 (0-100)
  isComplete: boolean     // 전체 점수 >= 80
  breakdown: {
    design: {
      structure: { score: number; required: {...}; recommended: {...} }
      scenarios: { score: number; count: number; required: number }
      conceptReferences: { score: number; count: number }
    }
    implementation: {
      codeReferences: { score: number; count: number; required: number }
      examples: { score: number; count: number; required: number }
    }
  }
  issues: ValidationIssue[]
}
```

---

## 상태 생명주기

### 상태 정의

| 상태 | 설명 | 전이 가능 |
|------|------|-----------|
| `draft` | 초안 작성 중 | review |
| `review` | 검토 중 | draft, approved |
| `approved` | 승인됨 | active, draft |
| `active` | 활성 사용 중 | deprecated |
| `deprecated` | 폐기 예정 | archived, active |
| `archived` | 보관됨 | - |

### 상태 전이 다이어그램

```
draft ──────► review ──────► approved ──────► active
  ▲             │                │               │
  │             │                │               │
  └─────────────┴────────────────┘               │
                                                 ▼
                                           deprecated
                                                 │
                                                 ▼
                                            archived
```

### 전이 규칙

```typescript
interface TransitionValidation {
  valid: boolean
  checks: Array<{
    name: string           // 검사 항목
    passed: boolean        // 통과 여부
    required: boolean      // 필수 여부
    message?: string       // 실패 메시지
  }>
}

// 예: draft → review 전이 조건
// - 필수 섹션 모두 존재
// - 설계 점수 >= 60
```

---

## Frontmatter 구조

```yaml
---
primary: "[[Feature Name]]"
version: "1.2.0"
status: active
category: features
tags:
  - authentication
  - security
lastUpdated: "2024-01-15"
authors:
  - developer@example.com
reviewers:
  - reviewer@example.com
---
```

### SpecMetadata

```typescript
interface SpecMetadata {
  primary: string                      // Primary [[Symbol]]
  version: string                      // 시맨틱 버전
  status: SpecStatus                   // 현재 상태
  category: string                     // 카테고리
  tags: string[]                       // 태그 목록
  lastUpdated: string                  // 최종 수정일
  authors?: string[]                   // 작성자 목록
  reviewers?: string[]                 // 검토자 목록
}

type SpecStatus = 'draft' | 'review' | 'approved' | 'active' | 'deprecated' | 'archived';
```

---

## 사용 시나리오

### 시나리오 1: 완성도 측정

```typescript
import { SpecCompletenessValidator } from './spec/SpecCompletenessValidator';

const validator = new SpecCompletenessValidator();
const result = validator.validate('managed/features/auth.md');

console.log(`전체 점수: ${result.score}/100`);
console.log(`설계 점수: ${result.designScore}/100`);
console.log(`구현 점수: ${result.implementationScore}/100`);
console.log(`완성 여부: ${result.isComplete ? '완성' : '미완성'}`);
```

### 시나리오 2: 상태 전이

```typescript
import { SpecStatusManager } from './spec/SpecStatusManager';

const manager = new SpecStatusManager();

// 전이 가능 여부 확인
const validation = manager.validateTransition('draft', 'review');
if (validation.valid) {
  const transition = manager.updateStatus('managed/features/auth.md', 'review');
  console.log(`${transition.from} → ${transition.to}`);
}
```

### 시나리오 3: 미사용 문서 탐지

```typescript
import { UnusedDocumentDetector } from './spec/UnusedDocumentDetector';

const detector = new UnusedDocumentDetector(registry);
const unused = detector.detectUnused(allDocs);

unused.forEach(doc => {
  const action = detector.suggestAction(doc);
  console.log(`${doc.filePath}: ${action} 권장`);
});
```

### 시나리오 4: 버전 비교

```typescript
import { SpecVersionManager } from './spec/SpecVersionManager';

const versionManager = new SpecVersionManager();
const history = versionManager.getVersionHistory('managed/features/auth.md');

if (history.length >= 2) {
  const diff = versionManager.diffVersions(history[0], history[1]);
  console.log(`추가: ${diff.additions.length}줄`);
  console.log(`삭제: ${diff.deletions.length}줄`);
}
```

---

## 미사용 문서 정책

### 탐지 기준

| 기준 | 조건 | 권장 조치 |
|------|------|-----------|
| 참조 없음 | docRefs = 0, codeRefs = 0 | delete |
| 코드만 | docRefs = 0, codeRefs > 0 | review |
| 문서만 | docRefs > 0, codeRefs = 0 | review |
| 오래됨 | 6개월 이상 미수정 | archive |

### UnusedDocument

```typescript
interface UnusedDocument {
  filePath: string
  lastModified: string
  docReferences: number      // 문서에서 참조 수
  codeReferences: number     // 코드에서 참조 수
  reason: 'no-references' | 'stale' | 'orphaned'
  suggestedAction: 'delete' | 'archive' | 'review'
}
```

---

## 관련 시스템

- [[Semantic Graph Analysis and Relationship Model]] - 목표 분석·그래프·관계 계약
- [[Semantic Graph Spec Governance Roadmap]] - compiler evidence 기반 spec graph 확장 계획
- [[Document Symbol System]] - 문서 심볼 레지스트리
- [[Parser System]] - Frontmatter 파싱
- [[Validator System]] - 품질 검증 연동
- [[Storage System]] - 버전 이력 저장

---

## CLI 명령어

| 명령어 | 설명 |
|--------|------|
| `tsdoc-edge spec-completeness <file>` | 명세 완성도 측정 |
| `tsdoc-edge spec-status <file>` | 명세 상태 조회 |
| `tsdoc-edge find-unused-docs` | 미사용 문서 탐지 |
| `tsdoc-edge validate-docs` | 문서 품질 검증 |

---

## Backlinks

### Referenced By

- [[Validator System]] → /Users/junwoobang/workflow/tsdoc-edge/managed/core/validator-system.md:175
