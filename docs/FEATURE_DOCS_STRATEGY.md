# 기능 문서 전략 (Feature Documentation Strategy)

> 문서 심볼 [[]] 기반 기능 정의 및 코드 연동 가이드

## 핵심 원칙

### 1. 문서의 역할 분리

**문서 (Docs):**
- ✅ **WHAT**: 기능이 무엇을 하는가?
- ✅ **WHY**: 왜 이 기능이 필요한가?
- ✅ **WHEN**: 언제 사용하는가?
- ✅ **산출물**: 어떤 클래스/함수들이 있는가? (리스트)

**코드 (Code):**
- ✅ **HOW**: 어떻게 구현되었는가?
- ✅ **디테일**: 구체적 알고리즘, 파라미터, 예외 처리

### 2. 문서 심볼 [[]] 활용

```text
# [[FeatureName]]

> 한 줄 요약

## 개요 (Overview)
- 무엇을 하는 기능인가?
- 왜 필요한가?
- 어떤 문제를 해결하는가?

## 핵심 산출물 (Core Deliverables)
- [ClassName](../src/path/ClassName.ts#ClassName) - 역할 설명
- [functionName](../src/path/file.ts#functionName) - 역할 설명

## 사용 시나리오 (Use Cases)
1. 시나리오 A: ...
2. 시나리오 B: ...

## 관련 기능 (Related Features)
- [[OtherFeature]] - 관계 설명
```

### 3. 코드에서 @doc 태그로 연결

```typescript
/**
 * Parse [[]] document symbols from markdown
 *
 * @doc [[DocumentSymbolSystem#Parser]]
 * @public
 */
export class DocumentSymbolParser {
  // 구현 코드...
}
```

---

## 문서 구조 예시

### Before (기존 방식)

```text
## DocumentSymbolParser
마크다운에서 [[]] 심볼을 파싱합니다.
- H1 정의 파싱: `# [[Symbol]]`
- H2+ 보조 정의 파싱: `## [[Symbol]]`
- 인라인 참조 파싱: `[[Symbol]]` 또는 `[[Symbol#Section]]`
- 코드 참조 추출
- 참조: `src/doc-symbol/DocumentSymbolParser.ts`
```

**문제점:**
- 코드 경로가 문자열로만 존재 (클릭 불가)
- 구현 디테일과 기능 개요가 혼재
- 문서 심볼 없어 다른 문서에서 참조 불가

### After (개선 방식)

**docs/features/DOCUMENT_SYMBOL_SYSTEM.md:**
```text
# [[DocumentSymbolSystem]]

> Wiki 스타일 [[]] 문법으로 문서와 코드를 양방향 연결하는 시스템

## 개요

마크다운 문서에서 `[[Symbol]]` 문법을 사용해 용어를 정의하고, 코드에서 `@doc [[Symbol]]` 태그로 연결합니다.

**해결하는 문제:**
- 문서 간 참조 일관성 유지
- SSOT (Single Source of Truth) 보장
- 코드-문서 연결 자동화

## 핵심 산출물

### Parser
- [DocumentSymbolParser](../../src/doc-symbol/DocumentSymbolParser.ts#DocumentSymbolParser) - 마크다운 [[]] 파싱
- [TSDocSymbolParser](../../src/doc-symbol/TSDocSymbolParser.ts#TSDocSymbolParser) - 코드 @doc 태그 파싱

### Registry & Validation
- [DocumentSymbolRegistry](../../src/doc-symbol/DocumentSymbolRegistry.ts#DocumentSymbolRegistry) - SSOT 검증 및 저장
- 중복 정의 방지
- 고아 심볼 탐지

### Generation
- [BacklinkGenerator](../../src/doc-symbol/BacklinkGenerator.ts#BacklinkGenerator) - 자동 백링크 생성

## 사용 시나리오

### 1. 새로운 개념 문서화
```text
# [[UserAuthentication]]

인증 시스템 설명...
```

### 2. 코드에서 문서 참조
```typescript
/**
 * @doc [[UserAuthentication#Implementation]]
 */
class AuthService {}
```

### 3. 자동 백링크
문서 하단에 자동 생성:
```text
## Backlinks
### Referenced By
- [[APIDesign]] → design.md:45
### Implemented By
- AuthService → auth.ts:10
```

## 관련 기능
- [[AutoIndexing]] - 파일 저장 시 자동 인덱스 업데이트
- [[CoreWorkflow]] - 메인 문서화 파이프라인과 통합
```

**개선점:**
- ✅ [[DocumentSymbolSystem]]으로 다른 문서에서 참조 가능
- ✅ 코드 링크 클릭 가능 (GitHub/IDE)
- ✅ 구현 디테일은 코드로 위임
- ✅ 기능 개요와 사용법에 집중

---

## CORE_FEATURES.md 개선 전략

### 현재 구조
```text
## 1. 핵심 워크플로우
### TSDocEdge
메인 진입점...
- 참조: `src/index.ts:78`

### FileScanner
파일 스캔...
- 참조: `src/scanner/FileScanner.ts`
```

### 개선 구조

실제 구현 예시는 다음 파일들을 참조:
- `docs/CORE_FEATURES_V2.md` - 전체 카탈로그
- `docs/features/CORE_WORKFLOW.md` - 워크플로우 예시
- `docs/features/DOCUMENT_SYMBOL_SYSTEM.md` - 문서 심볼 시스템 예시
- `docs/features/SYMBOL_GRAPH.md` - 심볼 그래프 예시

---

## 파일 구조 제안

```
docs/
├── features/                    # 기능별 정의 문서
│   ├── CORE_WORKFLOW.md        # [[CoreWorkflow]]
│   ├── ANALYSIS_FEATURES.md    # [[AnalysisFeatures]]
│   ├── SYMBOL_GRAPH.md         # [[SymbolGraphFeatures]]
│   ├── VALIDATION.md           # [[ValidationFeatures]]
│   ├── DOC_SYMBOL_SYSTEM.md    # [[DocumentSymbolSystem]]
│   └── AUTO_INDEXING.md        # [[AutoIndexing]]
│
├── guides/                      # 사용 가이드
│   ├── DEPENDENCY_ANALYSIS_GUIDE.md
│   ├── AUTO_INDEXING_GUIDE.md
│   └── ...
│
├── design/                      # 설계 문서
│   ├── DOCUMENT_SYMBOL_DESIGN.md
│   └── ...
│
└── CORE_FEATURES.md            # 통합 인덱스 (모든 기능 링크)
```

---

## 코드에 @doc 태그 추가 전략

### 1. 핵심 클래스에 추가

```typescript
/**
 * Parse [[]] document symbols from markdown
 *
 * @doc [[DocumentSymbolSystem#Parser]]
 * @responsibility Extract primary, auxiliary, and reference [[]] symbols
 * @public
 */
export class DocumentSymbolParser {
  /**
   * Parse document for [[]] symbols
   *
   * @doc [[DocumentSymbolSystem#Parsing]]
   */
  parse(filePath: string): ParsedDocSymbols {
    // ...
  }
}
```

### 2. 기능 진입점에 추가

```typescript
/**
 * Main entry point for TSDoc Edge
 *
 * @doc [[CoreWorkflow]]
 * @public
 */
export class TSDocEdge {
  // ...
}
```

### 3. 유틸리티에도 추가

```typescript
/**
 * Generate unique IDs for symbols
 *
 * @doc [[SymbolGraphFeatures#IDGeneration]]
 * @public
 */
export class IdGenerator {
  // ...
}
```

---

## 실행 계획

### Phase 1: 문서 구조 개편
1. ✅ 전략 문서 작성 (현재)
2. features/ 디렉토리 생성
3. CORE_FEATURES.md를 기능별로 분할
4. 각 문서에 [[Symbol]] 추가

### Phase 2: 코드 연동
1. 핵심 클래스에 @doc 태그 추가
2. `tsdoc-edge index-docs` 실행
3. 백링크 자동 생성
4. SSOT 검증

### Phase 3: 자동화
1. Git hook 설치
2. VSCode task 설정
3. CI/CD 통합

---

## 기대 효과

### 1. 문서 관리 용이성
- 기능 단위 독립 문서 → 유지보수 쉬움
- [[Symbol]] 참조 → 변경 영향 추적 가능

### 2. 코드-문서 동기화
- @doc 태그 → 자동 연결
- 백링크 → 어디서 사용되는지 자동 표시

### 3. 탐색 효율성
- 클릭 가능한 링크
- IDE/GitHub에서 바로 이동
- 순환 참조 방지

### 4. 신규 개발자 온보딩
- 기능 개요 → 관련 코드로 바로 이동
- 실제 구현 위치 명확
- 학습 곡선 감소

---

## Backlinks

### Referenced By

- [[UserAuthentication]]#Implementation → /Users/junwoobang/project/tsdoc-edge/docs/FEATURE_DOCS_STRATEGY.md:121
- [[NewFeature]] → /Users/junwoobang/project/tsdoc-edge/docs/features/DOCUMENT_SYMBOL_SYSTEM.md:43
- [[NewFeature]]#Implementation → /Users/junwoobang/project/tsdoc-edge/docs/features/DOCUMENT_SYMBOL_SYSTEM.md:49
- [[NewFeature]] → /Users/junwoobang/project/tsdoc-edge/docs/features/DOCUMENT_SYMBOL_SYSTEM.md:58
- [[NewFeature]]#Login → /Users/junwoobang/project/tsdoc-edge/docs/features/DOCUMENT_SYMBOL_SYSTEM.md:65

