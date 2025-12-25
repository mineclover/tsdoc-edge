---
tsdoc: managed
version: 1.0.0
status: active
primary: DocumentSymbolSystem
category: feature
tags:
  - core
  - documentation
  - ssot
lastUpdated: 2025-01-15
---
# DocumentSymbolSystem

> Wiki 스타일 [[]] 문법으로 문서와 코드를 양방향 연결
## 개요

문서에서 `[[Symbol]]` 문법으로 개념을 정의하고, 코드에서 `@doc [[Symbol]]` 태그로 연결하는 시스템입니다. Obsidian, Roam Research와 유사한 Wiki 스타일 문서 작성을 지원하며, SSOT(Single Source of Truth)를 보장합니다.
**해결하는 문제:**
- 문서 간 참조 일관성 유지
- 중복 정의 방지 (SSOT)
- 코드와 문서 동기화 자동화
- 사용되지 않는 문서 탐지

## 핵심 개념
### 1. 심볼 정의 (Symbol Definition)

#### Primary Definition (H1)
파일당 **하나의 Primary 정의만** 허용하여 SSOT 보장. 중복 정의 시 `validate-docs`에서 에러 발생.

#### Auxiliary Definition (H2+)
같은 심볼을 여러 파일에서 보조 정의 가능. Primary 없는 Auxiliary는 orphaned 에러.

### 2. 심볼 참조 (Symbol Reference)
문서 내 참조는 `[[Symbol]]` 또는 섹션 지정 ``[[Symbol#Section]]`` 형식 사용.

### 3. 코드 연결 (Code Connection)
TypeScript 코드에서 `@doc [[Symbol]]` 태그로 문서와 연결.

## 핵심 산출물
### Parser
- [DocumentSymbolParser](../../../src/doc-symbol/DocumentSymbolParser.ts#DocumentSymbolParser) - 마크다운 [[]] 파싱
  - H1 primary 정의 추출
  - H2+ auxiliary 정의 추출
  - 인라인 참조 추출
  - 코드 링크 추출
- [TSDocSymbolParser](../../../src/doc-symbol/TSDocSymbolParser.ts#TSDocSymbolParser) - 코드 @doc 태그 파싱
  - TypeScript Compiler API 사용
  - `@doc [[Symbol]]` 태그 추출
  - 섹션 지정 지원
### Registry & Validation
- [DocumentSymbolRegistry](../../../src/doc-symbol/DocumentSymbolRegistry.ts#DocumentSymbolRegistry) - SSOT 검증 및 저장
  - 심볼 등록 및 인덱싱
  - 중복 primary 정의 방지
  - 고아 auxiliary 탐지
  - 미정의 참조 검증
  - 사용되지 않는 심볼 경고

**검증 규칙:**
- ❌ **Error**: 중복 primary 정의
- ❌ **Error**: Auxiliary without primary (orphaned)
- ❌ **Error**: 미정의 심볼 참조
- ⚠️  **Warning**: 사용되지 않는 정의
- ⚠️  **Warning**: 과도한 참조 (>20)
- ⚠️  **Warning**: 코드 구현 없음
### Backlink Generation
- [BacklinkGenerator](../../../src/doc-symbol/BacklinkGenerator.ts#BacklinkGenerator) - 자동 백링크 생성
  - 양방향 참조 수집
  - 문서 최하단 자동 갱신
  - "Referenced By" / "Implemented By" 분류

### Symbol Footnote Reference (NEW!)
- [SymbolReferenceResolver](../../../src/doc-symbol/SymbolReferenceResolver.ts#SymbolReferenceResolver) - 심볼 참조 해석
  - 레지스트리에서 심볼 ID/이름 조회
  - 문서 위치 기준 상대 경로 자동 계산
  - 미해결 참조 탐지
- [SymbolReferenceGenerator](../../../src/doc-symbol/SymbolReferenceGenerator.ts#SymbolReferenceGenerator) - Symbol References 섹션 생성
  - Markdown footnote 자동 생성
  - 중복 제거 (같은 심볼은 한 번만)
  - Backlinks 섹션 앞에 자동 삽입

**작성 방법:**
```markdown
ConventionValidator[^sym-005] - 프로젝트 컨벤션 검증
ConnectivityValidator[^ConnectivityValidator] - 연결성 검증
```

**자동 생성 결과:**
```markdown
## Symbol References

[^sym-005]: [ConventionValidator](../../src/validator/ConventionValidator.ts#ConventionValidator)
[^ConnectivityValidator]: [ConnectivityValidator](../../src/validator/ConnectivityValidator.ts#ConnectivityValidator)
```

**장점:**
- 본문 간결: 긴 경로 없이 `[^sym-XXX]` 짧은 참조
- 네이티브 Markdown: 표준 footnote 문법
- 중복 제거: 같은 심볼 여러 번 참조해도 footnote는 한 번만
- 자동 경로: 상대 경로 수동 계산 불필요
- ID/이름 지원: `[^sym-001]` 또는 `[^SymbolName]` 모두 가능

## CLI 명령어
```bash
# 인덱싱
tsdoc-edge index-docs [dir]              # 전체 스캔
tsdoc-edge index-docs --file=<path>      # 단일 파일 업데이트 (증분)
# 검증
tsdoc-edge validate-docs [dir]           # SSOT 규칙 검증
# 백링크
tsdoc-edge update-backlinks [path]       # 백링크 자동 생성
# 심볼 참조 (NEW!)
tsdoc-edge update-symbol-refs [path]     # 코드 심볼 footnote 생성
# 검색
tsdoc-edge find-doc <symbol>             # 심볼 찾기
```

## 자동화
### Git Hook으로 자동 인덱싱

저장된 마크다운 파일만 증분 업데이트 → 빠른 성능
### VSCode 저장 시 자동 실행

자세한 내용: [[AutoIndexing]]
## 성능

| 작업 | 파일 수 | 실행 시간 | 권장 |
|------|---------|-----------|------|
| 증분 업데이트 (`--file`) | 1 | ~0.1s | ✅ 개발 중 |
| 전체 스캔 | 100 | ~2-5s | CI/CD |
| 전체 스캔 | 500 | ~10-20s | 초기 설정 |
## 관련 기능

- [[AutoIndexing]] - 파일 저장 시 자동 인덱스 업데이트
- [[CoreWorkflow]] - 메인 문서화 파이프라인
- [[ValidationFeatures]] - 연결성 및 SSOT 검증
## 설계 문서

전체 설계 및 구현 세부사항: [DOCUMENT_SYMBOL_DESIGN.md](../../DOCUMENT_SYMBOL_DESIGN.md)
---

---
---

---
---

## Related

- [[AutoIndexing]] - Automatic index updates on file save
- [[CoreWorkflow]] - Main documentation pipeline
- [[ValidationFeatures]] - Connectivity and SSOT validation

---

## Backlinks

### Referenced By

- TSDoc Edge Documentation → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:243
- [[Symbol Reference System]] → /Users/junwoobang/workflow/tsdoc-edge/managed/concepts/symbol-reference-system.md:169
- [[DocumentSymbolRegistry]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/DocumentSymbolRegistry.md:147
- [[AutoIndexing]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/auto-indexing.md:163
- [[CoreFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/core-features-catalog.md:122
- [[CoreFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/core-features-catalog.md:290
- [[CoreWorkflow]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/core-workflow.md:143
- [[Features Index]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/index.md:195
- [[ValidationFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/validation-features.md:209
- [[Guides & Tutorials]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:354

### Implemented By

- DocumentSymbolParser (Parser) → /Users/junwoobang/workflow/tsdoc-edge/src/doc-symbol/DocumentSymbolParser.ts:25
- DocumentSymbolRegistry (Registry) → /Users/junwoobang/workflow/tsdoc-edge/src/doc-symbol/DocumentSymbolRegistry.ts:42

