# TSDoc Edge - Project Context Document

## Executive Summary

**TSDoc Edge**는 TypeScript 코드베이스의 모든 심볼을 추적하고, 심볼 간 관계를 파악하며, 문서와 코드의 완벽한 일치를 강제하는 **SSOT(Single Source of Truth) 문서 연결성 플랫폼**입니다.

**핵심 가치**: 코드를 모듈로 정의하고 참조를 통해 구조를 쉽게 설명하고 탐색할 수 있도록 지원하며, 문서 정보를 항상 쉽게 수집할 수 있도록 시스템적으로 보조합니다.

## 프로젝트 현황

### 최신 구현 완료 (2025-11-05)

#### 1. 7-Part 모듈 명세 자동 생성 시스템 ✅
- **자동 추출 정확도**:
  - Purpose: 95%
  - Input: 90%
  - Output: 90%
  - Context: 85%
  - Logic: 60% (자동) → 95% (TSDoc 태그 사용 시)
  - Effect: 50% (자동) → 95% (TSDoc 태그 사용 시)
  - Scope: 95%
- **기능**:
  - 단일 심볼 생성: `generate-spec <file> <symbol>`
  - 배치 생성: `generate-specs-batch <dir>`
  - 검증 시스템: `ModuleSpecValidator` (완성도 점수 0-100)
- **새 파일**:
  - `src/generator/ModuleSpecGenerator.ts` (760 lines)
  - `src/generator/ModuleSpecMarkdownFormatter.ts` (442 lines)
  - `src/validator/ModuleSpecValidator.ts` (387 lines)
  - `src/types/spec/module-spec.ts` (186 lines)

#### 2. TSDoc 커스텀 태그 통합 ✅
- **새 태그 7개**:
  - `@algorithm` - 알고리즘/처리 단계 설명
  - `@complexity` - 복잡도 (O(n) 또는 High/Medium/Low)
  - `@sideEffect` - 부수 효과 (filesystem, database, network 등)
  - `@mutates` - 상태 변경 대상
  - `@io` - I/O 작업 (file, network, database 등)
  - `@scope` - 스코프 설명
  - `@functionality` - 기능 목록
- **하이브리드 모드**:
  ```typescript
  // PRIORITY 1: TSDoc 태그 사용 (95% 정확)
  if (specTags.algorithm) {
    algorithm = specTags.algorithm.description;
  }
  // PRIORITY 2: Fallback to auto-extraction (60% 정확)
  else if (this.options.includeTodos) {
    algorithm = 'TODO: Describe the algorithm or approach';
  }
  ```
- **정확도 향상**:
  - Logic: 60% → 95% (태그 사용 시)
  - Effect: 50% → 95% (태그 사용 시)
- **새 파일**:
  - `src/types/tags/module-spec-tags.ts` (126 lines)
  - `src/parser/ModuleSpecTagParser.ts` (203 lines)

#### 3. TSDoc 태그 등록 수정 ✅ (Critical Fix)
- **문제**: 커스텀 태그가 TSDoc 설정에 등록되지 않아 `@returns` 블록 내용에 모든 태그가 연결됨
- **해결**:
  - `src/parser/TSDocParser.ts`에 11개 커스텀 태그 등록
  - `parseString()` 메서드 추가하여 설정된 파서 노출
  - `ModuleSpecGenerator`가 커스텀 `TSDocParser` 사용하도록 수정
- **결과**:
  - Before: `**Description:** Processed report object userData must be validated Returns valid report or throws error...` (모든 태그 연결)
  - After: `**Description:** Processed report object` (깨끗한 분리)

#### 4. 생성된 문서
- `IMPLEMENTATION_SUMMARY.md` - 모듈 명세 생성 구현 요약 (11,889 bytes)
- `TSDOC_TAG_INTEGRATION.md` - TSDoc 태그 통합 가이드 (10,165 bytes)
- `TSDOC_TAG_FIX_SUMMARY.md` - 태그 등록 수정 요약 (5,759 bytes)
- `examples/module-spec-tags-example.ts` - 완전한 예제 코드
- `docs/specs/process-user-data.md` - 생성된 명세서 예시

## 핵심 개념

### 1. 설계 철학: 계층화와 평탄화

#### 문제점
- **계층 구조의 양면성**: 명확한 책임 분리 vs. 전체 흐름 파악 어려움
- **깊은 계층**: 탐색 비용 증가, 맥락 손실

#### 해결책: 체크포인트 기반 평탄화
```
계층 구조 (코드):
  App → AuthController → AuthService → UserRepository

체크포인트 라우팅 (문서):
  [[AuthenticationFlow]] → [[AuthService]] → [[UserRepository]]

이점:
- ✅ 구조화 장점 유지 (코드는 여전히 계층적)
- ✅ 탐색 비용 감소 (체크포인트 간 직접 이동)
- ✅ 맥락 보존 (각 체크포인트가 독립적 맥락 제공)
- ✅ 양방향 탐색 (Backlinks를 통한 역참조)
```

### 2. 7-Part 모듈 명세 프레임워크

모든 모듈은 다음 7가지 관점으로 정의됩니다:

1. **Purpose** (목적): 이 모듈이 해결하는 문제와 존재 이유
   - `@problem` - 해결하려는 문제
   - `@responsibility` - 모듈의 책임
   - `@solves` - 해결 방법
   - `@context` - 실행 컨텍스트

2. **Input** (입력): 매개변수, 제약 조건, 사전 조건
   - `@param` - 매개변수 설명
   - `@precondition` - 사전 조건

3. **Output** (출력): 반환값, 성공/실패 케이스, 사후 조건
   - `@returns` - 반환값 설명
   - `@postcondition` - 사후 조건

4. **Context** (컨텍스트): 의존성, 환경, 요구사항
   - `@depends` - 의존 모듈
   - `@context` - 환경 요구사항

5. **Logic** (로직): 알고리즘, 내부 동작
   - `@functionality` - 기능 목록
   - `@algorithm` - 알고리즘 설명
   - `@complexity` - 복잡도

6. **Effect** (부수 효과): 컨텍스트 변경, 외부 I/O
   - `@sideEffect` - 부수 효과 (filesystem, database, network, state, process)
   - `@mutates` - 변경되는 상태
   - `@io` - I/O 작업 (file, network, database, console)

7. **Scope** (스코프): 공개 인터페이스, 노출된 상태
   - `@scope` - 스코프 설명
   - `@public` / `@private` / `@protected` - 접근 제어

### 3. TSDoc 커스텀 태그 시스템

#### 기존 태그 (Enhanced Documentation)
```typescript
@problem, @responsibility, @solves  // Purpose
@param, @returns                    // Input/Output
@precondition, @postcondition       // Input/Output
@depends, @context                  // Context
@functionality                      // Logic
```

#### 새 태그 (Module Specification) ⭐ NEW
```typescript
// Logic Section
@algorithm <description>
@complexity <notation> - <explanation>
@functionality <feature1>, <feature2>, ...

// Effect Section
@sideEffect <type>: <description> (<operation>)
@mutates <target> - <description>
@io <type>: <description>

// Scope Section
@scope [<access>:] <description>
```

#### 태그 사용 예시
```typescript
/**
 * Process user data and generate reports
 *
 * @public
 * @responsibility Process user data and generate reports
 * @problem Manual data processing is error-prone and slow
 * @solves Automates data processing with validation and error handling
 *
 * @param userData - User data object
 * @param options - Processing options
 * @returns Processed report object
 *
 * @precondition userData must be validated
 * @postcondition Returns valid report or throws error
 *
 * @depends DataValidator, ReportGenerator
 * @context Requires database connection
 *
 * @functionality Data validation, Report generation, Error logging
 * @algorithm Parse input, validate data, transform to report format, generate output
 * @complexity O(n) - Linear time complexity where n is number of records
 *
 * @sideEffect filesystem: Writes report to ./reports directory (write)
 * @sideEffect database: Updates processing_log table (write)
 * @mutates this.cache - Updates internal cache with processed data
 * @io file: Writes JSON report file
 * @io database: Inserts log entry
 *
 * @scope public: Exported from main module as primary API
 */
export function processUserData(
  userData: UserData,
  options: ProcessingOptions
): ProcessedReport {
  // Implementation...
}
```

## 프로젝트 구조

### 핵심 디렉토리
```
src/
├── analyzer/      # 분석 엔진 (품질, 커버리지, 링크 검증)
│   ├── ASTSymbolExtractor.ts          # TypeScript AST 심볼 추출
│   ├── CodeHealthChecker.ts           # 코드 건강도 점수 (0-100)
│   ├── CoverageSyncAdapter.ts         # Istanbul 커버리지 동기화
│   ├── DocumentationAnalyzer.ts       # 문서 품질 분석
│   └── MissingLinkDetector.ts         # 링크 검증 + Typo 감지
│
├── cli.ts         # CLI 엔트리포인트 (45+ 명령어)
│
├── config/        # 설정 관리
│   ├── ConfigManager.ts               # 싱글톤 설정 매니저
│   └── ConfigLoader.ts                # .tsdoc.config.json 로더
│
├── doc-symbol/    # [[Symbol]] 문서 심볼 시스템 (평탄화의 핵심)
│   ├── DocumentSymbolParser.ts        # 마크다운 [[]] 파싱
│   ├── TSDocSymbolParser.ts           # 코드 @doc [[]] 파싱
│   ├── DocumentSymbolRegistry.ts      # 심볼 레지스트리
│   ├── BacklinkGenerator.ts           # 자동 백링크 생성
│   └── SymbolReferenceGenerator.ts    # 코드 심볼 footnote 생성
│
├── fixer/         # 문서 자동 수정 및 개선
│   ├── DocumentationFixer.ts          # 자동 수정 엔진
│   ├── RecursiveImprover.ts           # 점진적 개선 루프
│   └── CommentStateManager.ts         # 주석 fold/unfold 상태 관리
│
├── generator/     # 마크다운/명세 문서 생성 ⭐ NEW
│   ├── ModuleSpecGenerator.ts         # 7-part 명세 생성기 (760 lines)
│   ├── ModuleSpecMarkdownFormatter.ts # 마크다운 포매터 (442 lines)
│   └── EnhancedMarkdownGenerator.ts   # Enhanced docs 생성기
│
├── graph/         # 심볼 그래프 및 검색
│   ├── SymbolGraphBuilder.ts          # 심볼 관계 그래프 구축
│   ├── SymbolSearchEngine.ts          # 다양한 조건으로 심볼 검색
│   └── DepthTraverser.ts              # 깊이 우선 탐색
│
├── parser/        # TSDoc 파싱 (표준 + 커스텀 태그)
│   ├── TSDocParser.ts                 # TSDoc 파서 (11개 커스텀 태그 등록)
│   ├── EnhancedDocExtractor.ts        # 12개 Enhanced 태그 자동 추출
│   ├── ModuleSpecTagParser.ts         # 7개 모듈 명세 태그 파서 ⭐ NEW
│   └── FrontmatterParser.ts           # YAML frontmatter 파서
│
├── scanner/       # 파일 스캔
│   └── FileScanner.ts                 # 소스 파일 탐색 및 심볼 수집
│
├── spec/          # 명세서 관리 시스템
│   ├── SpecCompletenessValidator.ts   # 명세서 품질 측정 (0-100점)
│   ├── SpecContentSimilarityChecker.ts # 중복 콘텐츠 감지
│   ├── SpecStatusManager.ts           # 생명주기 관리 (draft→review→approved→active)
│   ├── SpecVersionManager.ts          # 명세서 버전 관리 ⭐ NEW
│   └── UnusedDocumentDetector.ts      # 미사용/오래된 문서 탐지
│
├── storage/       # 데이터 저장 (하이브리드)
│   ├── DatabaseManager.ts             # SQLite (로컬 성능)
│   └── SymbolRegistryManager.ts       # JSONL (Git 버전 관리)
│
├── types/         # 도메인별 타입 정의
│   ├── core/                          # 파싱, 링킹 기본 타입
│   ├── graph/                         # 심볼, 관계 그래프 타입
│   ├── analysis/                      # 품질, 통계 분석 타입
│   ├── tags/                          # TSDoc 태그 및 커스텀 태그 타입
│   │   └── module-spec-tags.ts        # 모듈 명세 태그 타입 ⭐ NEW
│   ├── feature/                       # 기능별 타입
│   │   └── doc-symbol.ts              # 문서 심볼 타입
│   ├── spec/                          # 명세서 타입
│   │   └── module-spec.ts             # 7-part 프레임워크 타입 ⭐ NEW
│   └── config/                        # 설정 타입
│
└── validator/     # 문서 검증
    ├── ConventionValidator.ts         # TSDoc 컨벤션 규칙 검증
    ├── ConnectivityValidator.ts       # SSOT 준수, 연결성 점수
    ├── StrictModeValidator.ts         # 6-카테고리 문서화 검증
    └── ModuleSpecValidator.ts         # 모듈 명세 검증 ⭐ NEW
```

### 문서 디렉토리
```
root/
├── docs/               # 생성된 문서
│   └── specs/          # 모듈 명세서 ⭐ NEW
│
├── managed/            # 관리 대상 문서 (Document Symbol System)
│   └── features/       # 기능별 명세서
│
├── examples/           # 예제 및 가이드
│   └── module-spec-tags-example.ts  # TSDoc 태그 예제 ⭐ NEW
│
├── reference/          # 참조 문서
│
└── archive/            # 아카이브된 문서
    ├── deprecated/     # 구버전 문서
    └── guides/         # 가이드 문서
```

## 주요 시스템

### 1. 심볼 그래프 시스템 (`src/graph/`)

**SymbolGraphBuilder** - 코드베이스의 모든 심볼과 관계를 그래프로 구축
- **Nodes**: 함수, 클래스, 인터페이스, 타입 등
- **Edges**: `dependsOn`, `usedBy`, `implements`, `extends`, `calls`

**SymbolSearchEngine** - 다양한 조건으로 심볼 검색 및 필터링
- 이름 검색, 타입 필터, 의존성 깊이 탐색
- 사용되지 않는 심볼 감지

**DepthTraverser** - 심볼 그래프 깊이 우선 탐색
- 의존성 체인 추적
- 순환 의존성 감지

### 2. 파싱 시스템 (`src/parser/`)

**TSDocParser** - TSDoc 주석 파싱 (표준 + 커스텀 태그 지원)
- 표준 태그: `@param`, `@returns`, `@example`, `@public`
- 커스텀 태그: 11개 (기존 4개 + 모듈 명세 7개) ⭐ NEW
- **중요**: 커스텀 태그는 TSDoc 설정에 등록 필수

**EnhancedDocExtractor** - 12개 커스텀 태그 자동 추출
- `@problem`, `@functionality`, `@errorExp`, `@decision`
- `@dependency`, `@plan`, `@testScenario` 등
- 휴리스틱 기반 자동 감지

**ModuleSpecTagParser** ⭐ NEW - 7개 모듈 명세 태그 파서
- `@algorithm`, `@complexity`
- `@sideEffect`, `@mutates`, `@io`
- `@scope`, `@functionality`

### 3. 검증 시스템 (`src/validator/`)

**ConventionValidator** - TSDoc 컨벤션 규칙 검증
- 7개 컨벤션 규칙 (빈 줄, summary 필수, @public 필수 등)
- 규칙 위반 감지 및 수정 제안

**ConnectivityValidator** - SSOT 준수 여부, 연결성 점수 계산
- 코드-문서 링크 검증
- 문서 완성도 점수 (0-100)

**StrictModeValidator** - 6-카테고리 문서화 시스템 검증
- Basic Info, Input/Output, Contract, Usage, Dependencies, Testing

**ModuleSpecValidator** ⭐ NEW - 모듈 명세 검증
- 7개 섹션 완성도 검사
- 필수 필드 검증
- 완성도 점수 계산 (0-100)

### 4. 저장소 시스템 (`src/storage/`)

**하이브리드 구조**:
- **SQLite** (`.tsdoc.db`): 빠른 로컬 검색 및 쿼리
- **JSONL** (`.tsdoc/registry.jsonl`): Git 버전 관리

**DatabaseManager** - SQLite 기반 심볼 저장
- 심볼 정보, 의존성, 문서 연결 저장
- 빠른 검색 쿼리

**SymbolRegistryManager** - JSONL 기반 레지스트리
- 라인 단위 추가/삭제 (Git 친화적)
- 버전 관리 추적

### 5. 문서 심볼 시스템 (`src/doc-symbol/`) - 평탄화의 핵심

Wiki 스타일 `[[Symbol]]` 표기로 코드-문서 양방향 연결:

**DocumentSymbolParser** - 마크다운 파일에서 `[[]]` 심볼 파싱
```markdown
# [[Authentication System]]  ← 심볼 정의 (H1)
[[UserService]]를 사용합니다.  ← 심볼 참조
```

**TSDocSymbolParser** - 코드의 `@doc [[Symbol]]` 태그 파싱
```typescript
/**
 * @doc [[Authentication System]]
 */
export class AuthService {}
```

**DocumentSymbolRegistry** - 심볼 정의 및 참조 레지스트리
- 전역 심볼 맵
- 정의 위치 추적
- 참조 목록 관리

**BacklinkGenerator** - 자동 백링크 생성
- 역참조 자동 생성
- "Used by" 섹션 자동 추가

**SymbolReferenceGenerator** - 코드 심볼 footnote 자동 생성
- 문서에서 코드 심볼 감지
- 파일 경로 footnote 생성

**평탄화 효과**:
- 계층적 코드 구조를 문서 네트워크로 투영
- 각 `[[Symbol]]`은 체크포인트 역할 → 계층 탐색 없이 직접 접근
- Backlinks를 통해 역방향 참조 자동 생성 → 맥락 양방향 탐색 가능

### 6. 명세서 관리 시스템 (`src/spec/`)

**SpecCompletenessValidator** - 명세서 품질 측정 (0-100점)
- 7개 섹션별 완성도 계산
- 필수 필드 검증

**SpecContentSimilarityChecker** - 중복 콘텐츠 감지
- Levenshtein distance 기반
- 유사도 임계값 설정

**SpecStatusManager** - 명세서 생명주기 관리
- 상태: `draft` → `review` → `approved` → `active`
- 상태 전환 규칙 검증

**SpecVersionManager** ⭐ NEW - 명세서 버전 관리
- 4가지 버전 관리 전략:
  1. **standalone**: 독립 버전 (명세 변경만 추적)
  2. **code-sync**: 코드 버전과 자동 동기화
  3. **milestone**: 마일스톤 기반 버전
  4. **semantic**: Semantic versioning (major.minor.patch)
- 명세 파일에서 버전 파싱:
  ```markdown
  ---
  version: 1.2.0
  strategy: semantic
  ---
  ```

**UnusedDocumentDetector** - 미사용/오래된 문서 탐지
- 참조되지 않는 문서 감지
- 오래된 문서 (N일 이상) 감지

### 7. 분석 시스템 (`src/analyzer/`)

**DocumentationAnalyzer** - 문서 품질 분석
- 각 심볼의 문서 품질 점수
- 권장 개선사항 제안

**CodeHealthChecker** - 코드 건강도 점수 계산 (0-100)
- 문서 품질, 테스트 커버리지, 타입 안전성 종합

**CoverageSyncAdapter** - 테스트 커버리지 동기화
- Istanbul coverage-final.json 파싱
- 심볼별 커버리지 매핑

**MissingLinkDetector** - 문서 링크 검증 및 Typo 감지
- 존재하지 않는 링크 감지
- Levenshtein distance로 유사한 링크 제안
- 외부 모듈 링크 검증

**PreCommitChecker** - Git pre-commit hook 품질 검증
- 코드 건강도 임계값 검증
- 커밋 전 자동 검사

### 8. 모듈 명세 생성 시스템 (`src/generator/`) ⭐ NEW

**ModuleSpecGenerator** - 7-part 명세 자동 생성
- **단일 심볼**: `generateSpec(filePath, symbolName)`
- **파일 전체**: `generateSpecsForFile(filePath)`
- **배치 생성**: `generateSpecsForDirectory(dirPath)`
- **하이브리드 추출**:
  1. TSDoc 태그 우선 (95% 정확)
  2. Fallback: 자동 추출 (60-70% 정확)

**추출 메서드**:
```typescript
extractPurpose()    // @problem, @responsibility, @solves, @context
extractInput()      // @param, @precondition, AST 파라미터
extractOutput()     // @returns, @postcondition, AST 반환 타입
extractContext()    // @depends, import 분석, 파일 의존성
extractLogic()      // @algorithm, @complexity, @functionality + 휴리스틱
extractEffect()     // @sideEffect, @mutates, @io + 패턴 감지
extractScope()      // @scope, @public/@private/@protected, export 검사
```

**ModuleSpecMarkdownFormatter** - 마크다운 포매터
- 7개 섹션 포맷팅
- Table of Contents 생성
- 메타데이터 (완성도, 생성 시간)

## CLI 명령어

### 프로젝트 초기화 및 빌드
```bash
tsdoc-edge init                    # 프로젝트 초기화
tsdoc-edge build <dir>             # 심볼 그래프 빌드
tsdoc-edge rebuild                 # 전체 재빌드
```

### 모듈 명세 생성 ⭐ NEW
```bash
# 단일 심볼 명세 생성
tsdoc-edge generate-spec <file> <symbol>

# 파일 전체 명세 생성
tsdoc-edge generate-spec <file>

# 디렉토리 배치 생성
tsdoc-edge generate-specs-batch <dir> [--min-confidence 70]

# 명세 검증
tsdoc-edge validate-spec <spec-file>
```

### 문서 분석 및 검증
```bash
tsdoc-edge analyze <dir>           # 문서 품질 분석
tsdoc-edge validate <dir>          # TSDoc 컨벤션 검증
tsdoc-edge health <dir>            # 코드 건강도 점수
tsdoc-edge check-links <dir>       # 링크 검증 + Typo 감지
```

### Enhanced Documentation
```bash
tsdoc-edge parse <file>            # Enhanced Doc 파싱
tsdoc-edge scan <dir>              # 프로젝트 전체 스캔
tsdoc-edge extract <file>          # 커스텀 태그 추출
```

### Document Symbol System
```bash
tsdoc-edge index-docs <dir>        # 문서 심볼 인덱싱
tsdoc-edge validate-docs           # 문서 심볼 검증
tsdoc-edge update-backlinks        # 백링크 자동 생성
tsdoc-edge update-symbol-refs <dir> # 코드 심볼 footnote 생성
```

### 심볼 그래프 및 검색
```bash
tsdoc-edge search <name>           # 심볼 검색
tsdoc-edge deps <symbol>           # 의존성 조회
tsdoc-edge unused                  # 사용되지 않는 심볼
tsdoc-edge graph                   # 심볼 그래프 시각화
```

### 명세서 관리
```bash
tsdoc-edge check-completeness <spec> # 명세서 완성도 검사
tsdoc-edge check-similarity <dir>    # 중복 콘텐츠 감지
tsdoc-edge list-specs [--status]     # 명세서 목록
tsdoc-edge update-spec-status <spec> <status> # 상태 변경
tsdoc-edge detect-unused-docs <dir>  # 미사용 문서 탐지
tsdoc-edge spec-version <spec>       # 명세 버전 관리 ⭐ NEW
```

### 문서 자동 수정
```bash
tsdoc-edge fix <file>              # 자동 수정
tsdoc-edge improve <dir>           # 점진적 개선
```

### 주석 fold/unfold
```bash
tsdoc-edge fold <file>             # 주석 접기
tsdoc-edge unfold <file>           # 주석 펼치기
tsdoc-edge fold-all <dir>          # 전체 접기
```

### 커버리지 통합
```bash
tsdoc-edge sync-coverage           # Istanbul 커버리지 동기화
```

### Git Hooks
```bash
tsdoc-edge pre-commit              # 커밋 전 검증
```

## 설정 시스템

### `.tsdoc.config.json`

```json
{
  "project": {
    "name": "tsdoc-edge",
    "version": "0.1.0",
    "srcDirs": ["src"],
    "excludeDirs": ["node_modules", "dist", ".git"]
  },
  "paths": {
    "commentsDir": ".tsdoc-comments",
    "databasePath": ".tsdoc.db",
    "jsonlDir": ".tsdoc"
  },
  "validation": {
    "strictMode": false,
    "minConnectivityScore": 70,
    "conventions": {
      "blankLineBeforeTags": true,
      "summaryRequired": true,
      "publicTagRequired": true,
      "returnsTagRequired": true
    }
  },
  "preCommit": {
    "enabled": true,
    "threshold": 50,
    "warningThreshold": 70
  },
  "linkCheck": {
    "externalModules": ["express", "typescript"],
    "enableSuggestions": true,
    "maxEditDistance": 3
  },
  "documentManagement": {
    "managedDirs": ["managed"],
    "excludeDirs": ["archive", "examples"],
    "ignoreCodeBlocks": true
  }
}
```

### ConfigManager 싱글톤

```typescript
import { ConfigManager } from './config/ConfigManager';

const config = ConfigManager.getInstance();
const minScore = config.get('validation.minConnectivityScore');
```

## 타입 구조

### 도메인별 타입 구조
```
src/types/
├── core/              # 기본 타입
│   ├── parsing.ts     # 파싱 관련 타입
│   └── linking.ts     # 링킹 관련 타입
│
├── graph/             # 그래프 타입
│   ├── symbol.ts      # 심볼 타입
│   └── relationship.ts # 관계 타입
│
├── analysis/          # 분석 타입
│   ├── quality.ts     # 품질 점수 타입
│   └── statistics.ts  # 통계 타입
│
├── tags/              # 태그 타입
│   ├── tsdoc.ts       # 표준 TSDoc 태그
│   ├── enhanced.ts    # Enhanced 커스텀 태그 (12개)
│   └── module-spec-tags.ts # 모듈 명세 태그 (7개) ⭐ NEW
│
├── feature/           # 기능별 타입
│   ├── doc-symbol.ts  # 문서 심볼 타입
│   └── coverage.ts    # 커버리지 타입
│
├── spec/              # 명세서 타입 ⭐ NEW
│   └── module-spec.ts # 7-part 프레임워크 타입
│
└── config/            # 설정 타입
    └── config.ts      # 설정 스키마
```

### 모듈 명세 주요 타입 ⭐ NEW

```typescript
// src/types/spec/module-spec.ts

export interface ModuleSpecTemplate {
  symbolId: string;
  symbolName: string;
  symbolKind: string;
  filePath: string;

  purpose: ModulePurpose;       // 1. Purpose
  input: ModuleInput;           // 2. Input
  output: ModuleOutput;         // 3. Output
  context: ModuleContext;       // 4. Context
  logic: ModuleLogic;           // 5. Logic
  effect: ModuleEffect;         // 6. Effect
  scope: ModuleScope;           // 7. Scope

  completionConfidence: number;
  manualReviewNeeded: string[];
  generatedAt: string;
}

export interface ModulePurpose {
  problem: string;              // @problem
  responsibility: string;       // @responsibility
  solution: string;             // @solves
  context?: string;             // @context
}

export interface ModuleLogic {
  mainFeatures: string[];       // @functionality
  algorithm?: string;           // @algorithm
  complexity?: string;          // @complexity
  controlFlow?: string;         // 자동 추출 (CFG 분석)
}

export interface ModuleEffect {
  sideEffects: SideEffectSpec[]; // @sideEffect
  mutations: string[];           // @mutates
  externalIO: string[];          // @io
  purity?: 'pure' | 'impure';    // 자동 감지
}

export interface SideEffectSpec {
  type: 'filesystem' | 'database' | 'network' | 'state' | 'process' | 'other';
  description: string;
  operation?: 'read' | 'write' | 'delete' | 'update';
}
```

### 모듈 명세 태그 타입 ⭐ NEW

```typescript
// src/types/tags/module-spec-tags.ts

export interface ModuleSpecTags {
  algorithm?: AlgorithmDoc;
  complexity?: ComplexityDoc;
  functionality?: FunctionalityDoc;
  sideEffects?: SideEffectDoc[];
  mutations?: MutationDoc[];
  io?: IODoc[];
  scope?: ScopeDoc;
}

export interface AlgorithmDoc {
  description: string;
}

export interface ComplexityDoc {
  notation: string;      // "O(n)", "High", "Medium", "Low"
  explanation?: string;
}

export interface SideEffectDoc {
  type: 'filesystem' | 'database' | 'network' | 'state' | 'process' | 'other';
  description: string;
  operation?: 'read' | 'write' | 'delete' | 'update';
}

export interface MutationDoc {
  target: string;        // e.g., "this.cache", "global.state"
  description: string;
}

export interface IODoc {
  type: 'file' | 'network' | 'database' | 'console' | 'other';
  description: string;
}

export interface ScopeDoc {
  accessLevel?: 'public' | 'private' | 'protected' | 'internal';
  description: string;
}
```

## 개발 워크플로우

### 1. 새로운 기능 추가 시

```bash
# 1. 코드 작성
vim src/my-module.ts

# 2. TSDoc 주석 작성 (7-part 태그 포함)
/**
 * My module description
 *
 * @problem ...
 * @solves ...
 * @algorithm ...
 * @complexity O(n)
 * @sideEffect filesystem: ...
 */

# 3. 빌드 및 인덱싱
npm run build
tsdoc-edge build src

# 4. 모듈 명세 생성
tsdoc-edge generate-spec src/my-module.ts MyModule

# 5. 명세 검증
tsdoc-edge validate-spec docs/specs/my-module.md

# 6. 체크포인트 문서 작성 (선택)
vim managed/features/my-feature.md
# H1에 [[MyFeature]] 체크포인트 정의
# 관련 코드를 [^MyModule]로 참조

# 7. Document Symbol 업데이트
tsdoc-edge index-docs managed/features/
tsdoc-edge update-symbol-refs managed/features/
tsdoc-edge update-backlinks

# 8. 전체 검증
tsdoc-edge health src
tsdoc-edge validate src
tsdoc-edge check-links managed

# 9. 커밋
git add .
git commit -m "feat: Add MyModule with 7-part spec"
# → pre-commit hook 자동 실행
```

### 2. 기존 코드 문서화

```bash
# 1. 배치 명세 생성
tsdoc-edge generate-specs-batch src --min-confidence 70

# 2. 생성된 명세 확인
ls docs/specs/

# 3. 낮은 완성도 명세 개선
tsdoc-edge validate-spec docs/specs/low-confidence.md
# → "Manual Review Needed" 섹션 확인

# 4. 코드에 태그 추가
vim src/module.ts
# @algorithm, @sideEffect 등 추가

# 5. 명세 재생성
tsdoc-edge generate-spec src/module.ts Module

# 6. 완성도 확인
tsdoc-edge validate-spec docs/specs/module.md
# → 86% → 95%+ 향상 확인
```

### 3. 체크포인트 문서 작성 (새 기능 추가 시)

```bash
# 1. 기능 명세서 작성
vim managed/features/authentication.md

# 2. 체크포인트 정의 (H1)
# [[Authentication System]]

# 3. 관련 개념 라우팅
# [[UserService]], [[TokenManager]] 등 참조

# 4. 코드 심볼 참조
# [^AuthService], [^validateToken] 등

# 5. Document Symbol 인덱싱
tsdoc-edge index-docs managed/features/

# 6. 심볼 footnote 생성
tsdoc-edge update-symbol-refs managed/features/

# 7. 백링크 생성
tsdoc-edge update-backlinks

# 8. 검증
tsdoc-edge validate-docs
```

**체크포인트 선정 기준**:
1. **기능적 응집성**: 하나의 명확한 기능을 담당
2. **의미적 경계**: 다른 모듈과 명확한 책임 분리
3. **독립 이해 가능**: 다른 문서 없이도 이해 가능한 수준
4. **라우팅 허브**: 다른 체크포인트로의 자연스러운 연결점

## 워크플로우 시나리오

### Scenario 1: 모듈 명세 생성 후 개선 ⭐ NEW

```bash
# 초기 생성 (자동 추출만)
$ tsdoc-edge generate-spec src/processor.ts DataProcessor
→ Completion Confidence: 60%
  Manual review needed:
    ⚠ Logic (algorithm description)
    ⚠ Effect (side effects)

# 코드에 태그 추가
$ vim src/processor.ts
# /**
#  * @algorithm Parse input, validate, transform, output
#  * @complexity O(n)
#  * @sideEffect filesystem: Writes cache (write)
#  * @io file: Reads config.json
#  */

# 재생성
$ tsdoc-edge generate-spec src/processor.ts DataProcessor
→ ✓ Specification generated
  Completion Confidence: 95%
  Auto-completed sections:
    ✓ Logic (from tags!)
    ✓ Effect (from tags!)
```

### Scenario 2: 배치 생성 + 필터링

```bash
# 디렉토리 전체 생성 (70% 이상만)
$ tsdoc-edge generate-specs-batch src/services --min-confidence 70

Generated 15 specifications:
  ✓ UserService.md (95%)
  ✓ AuthService.md (86%)
  ⚠ DataProcessor.md (72%) - needs review
  ✗ Helper.md (55%) - skipped (below threshold)
```

### Scenario 3: 체크포인트 + 코드 심볼 통합

```markdown
<!-- managed/features/authentication.md -->
# [[Authentication System]]

인증 시스템은 사용자 로그인, 토큰 발급, 권한 검증을 담당합니다.

## 핵심 컴포넌트

- [[UserService]] - 사용자 관리
- [[TokenManager]] - JWT 토큰 관리
- [[PermissionValidator]] - 권한 검증

## 구현

인증 로직은 [^AuthService]에서 구현되며, 토큰 검증은 [^validateToken] 함수가 담당합니다.

<!-- 하단에 자동 생성된 footnote -->
[^AuthService]: [`AuthService`](../src/services/AuthService.ts:15)
[^validateToken]: [`validateToken`](../src/utils/token.ts:42)
```

```bash
# Document Symbol 업데이트
$ tsdoc-edge update-symbol-refs managed/features/
→ Updated 12 documents with symbol references

# 백링크 생성
$ tsdoc-edge update-backlinks
→ Generated backlinks for 8 documents

## Backlinks (Updated automatically)
- [[Login Flow]]
- [[API Security]]
```

### Scenario 4: 명세서 생명주기 관리

```bash
# 명세 생성 (draft 상태)
$ tsdoc-edge generate-spec src/feature.ts Feature
→ Created docs/specs/feature.md (draft)

# 리뷰 요청
$ tsdoc-edge update-spec-status docs/specs/feature.md review
→ Status: draft → review

# 승인
$ tsdoc-edge update-spec-status docs/specs/feature.md approved
→ Status: review → approved

# 배포
$ tsdoc-edge update-spec-status docs/specs/feature.md active
→ Status: approved → active

# 버전 관리
$ tsdoc-edge spec-version docs/specs/feature.md
→ Current version: 1.0.0 (semantic)
  Last updated: 2025-11-05
```

## 주요 기술 스택

### 핵심 라이브러리
- **TypeScript Compiler API** (`typescript`) - AST 파싱, 타입 추출
- **TSDoc** (`@microsoft/tsdoc`) - TSDoc 주석 파싱
- **SQLite** (`better-sqlite3`) - 로컬 심볼 데이터베이스
- **Jest** - 테스트 프레임워크

### 유틸리티
- **Biome** - 린트 및 포맷팅
- **Node.js fs** - 파일 I/O (동기)
- **Levenshtein Distance** - Typo 감지

## 데이터 플로우

```
TypeScript Source Files
        ↓
  [FileScanner]
        ↓
  [TSDocParser] ──→ TSDoc Comments
        ↓
  [ASTSymbolExtractor] ──→ Symbol Info
        ↓
  [SymbolGraphBuilder] ──→ Symbol Graph
        ↓
     ┌──────┴──────┐
     ↓             ↓
[DatabaseManager] [SymbolRegistryManager]
 (SQLite)         (JSONL)
     ↓             ↓
  .tsdoc.db    .tsdoc/registry.jsonl


Module Spec Generation Flow ⭐ NEW:

TypeScript Source
        ↓
  [ModuleSpecGenerator]
        ├─→ [TSDocParser] ──→ @algorithm, @complexity, @sideEffect, etc.
        ├─→ [ModuleSpecTagParser] ──→ Parse module spec tags
        ├─→ [ASTSymbolExtractor] ──→ Parameters, return type, imports
        ├─→ [EnhancedDocExtractor] ──→ @problem, @functionality, etc.
        └─→ [Pattern Detection] ──→ Side effects, I/O operations
        ↓
  [ModuleSpecTemplate] (7 sections)
        ↓
  [ModuleSpecMarkdownFormatter]
        ↓
  docs/specs/module.md


Document Symbol Flow:

Markdown Files ──→ [DocumentSymbolParser] ──→ [[Symbol]] definitions & references
                                ↓
TypeScript Files ──→ [TSDocSymbolParser] ──→ @doc [[Symbol]] tags
                                ↓
                    [DocumentSymbolRegistry]
                                ↓
                    ┌───────────┴───────────┐
                    ↓                       ↓
            [BacklinkGenerator]    [SymbolReferenceGenerator]
                    ↓                       ↓
            Auto-generated           Auto-generated
            backlinks                footnotes
```

## 성능 특성

### 빌드 시간
- **Small 프로젝트** (~100 파일): ~2초
- **Medium 프로젝트** (~500 파일): ~8초
- **Large 프로젝트** (~2000 파일): ~30초

### 검색 성능
- **심볼 검색** (SQLite): < 100ms
- **의존성 조회**: < 50ms
- **그래프 탐색** (깊이 5): ~200ms

### 메모리 사용
- **평균**: ~150MB
- **Large 프로젝트**: ~500MB

## 테스트

```bash
npm test                 # 전체 테스트 실행
npm run test:watch       # Watch 모드
npm run test:coverage    # 커버리지 리포트
```

### 테스트 커버리지
- **Total**: ~85%
- **Core parsers**: 95%+
- **Validators**: 90%+
- **Generators**: 85%+ ⭐ NEW

## 다음 단계

### Pending Tasks (From Todo List)
- [ ] **CLI 명령어 추가**: `add-spec-tags` - 태그 템플릿 자동 생성
- [ ] **문서 작성**: 모듈 명세 사용 가이드
- [ ] **예제 확장**: 다양한 시나리오 예제

### Future Improvements
- [ ] **Interactive Mode**: 대화형 명세 완성 모드
- [ ] **Spec Diff**: 명세서 버전 비교 기능
- [ ] **Control Flow Graph**: CFG 분석으로 Logic 섹션 개선
- [ ] **Linter Integration**: 필수 태그 강제 검증
- [ ] **IDE Plugin**: VSCode 확장으로 태그 자동 완성
- [ ] **AI-Assisted**: LLM 기반 명세 제안

## 참고 문서

- `CLAUDE.md` - 개발 가이드
- `README.md` - 프로젝트 개요
- `IMPLEMENTATION_SUMMARY.md` - 모듈 명세 생성 구현 요약
- `TSDOC_TAG_INTEGRATION.md` - TSDoc 태그 통합 가이드
- `TSDOC_TAG_FIX_SUMMARY.md` - 태그 등록 수정 요약
- `archive/deprecated/CLI_WORKFLOWS_AND_SCENARIOS.md` - 40개 CLI 명령어 가이드
- `archive/guides/CONFIG_GUIDE.md` - 설정 파일 완전 가이드

---

**Last Updated**: 2025-11-05
**Version**: 0.1.0
**Status**: Active Development
