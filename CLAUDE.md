# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

TSDoc Edge는 TypeScript 코드베이스의 모든 심볼을 추적하고, 심볼 간 관계를 파악하며, 문서와 코드의 완벽한 일치를 강제하는 **SSOT(Single Source of Truth) 문서 연결성 플랫폼**입니다.

핵심 목표: 코드를 모듈로 정의하고 참조를 통해 구조를 쉽게 설명하고 탐색할 수 있도록 지원하며, 문서 정보를 항상 쉽게 수집할 수 있도록 시스템적으로 보조합니다.

## 필수 개발 명령어

### 빌드 및 개발
```bash
npm run build          # TypeScript 컴파일 (dist/ 생성)
npm run dev           # Watch 모드로 개발
```

### 테스트
```bash
npm test              # 전체 테스트 실행 (Jest)
npm run test:watch    # Watch 모드로 테스트
```

### 린트 및 포맷팅
```bash
npm run lint          # Biome으로 코드 검사
npm run format        # Biome으로 코드 포맷팅
npm run check         # Biome 검사 + 자동 수정
```

### CLI 실행
```bash
# 로컬 개발 중
npx ts-node src/cli.ts <command>

# 빌드 후
node dist/cli.js <command>

# 글로벌 설치 후
tsdoc-edge <command>
```

### 주요 CLI 명령어 (개발/테스트용)
```bash
# 프로젝트 초기화 및 DB 생성
tsdoc-edge init
tsdoc-edge build src

# 문서 분석 및 검증
tsdoc-edge analyze src
tsdoc-edge validate src
tsdoc-edge health src

# Enhanced Documentation 파싱
tsdoc-edge parse src/analyzer/CodeHealthChecker.ts

# Document Symbol System
tsdoc-edge index-docs managed
tsdoc-edge validate-docs
tsdoc-edge update-backlinks
```

## 핵심 아키텍처

### 설계 철학: 계층화와 평탄화

#### 계층 구조의 양면성

**구조화의 이점**:
- 명확한 책임 분리 (Separation of Concerns)
- 모듈 간 결합도 감소
- 재사용성 및 유지보수성 향상
- Scope와 Context를 통한 복잡도 격리

**구조화의 단점**:
- 깊은 계층 → 전체 흐름 파악 어려움
- 레이어 간 이동 → 맥락 손실 (context switching)
- 순차적 추적 필요 → 탐색 비용 증가
- 진입점에서 실제 로직까지 거리 증가

#### 해결책: 체크포인트 기반 평탄화

**핵심 개념**: 기능을 맥락적으로 정의하고, 기능들이 **라우팅되는 체크포인트**를 관리

**체크포인트(Checkpoint)란**:
- 계층 구조에서 **의미적 경계**를 표시하는 지점
- 각 체크포인트는 **독립적으로 이해 가능한 기능 단위**
- 문서 심볼 `[[Symbol]]`로 체크포인트를 정의
- 체크포인트 간 이동 → 계층 탐색 없이 **직접 라우팅**

**작동 방식**:
```
계층 구조 (코드):
  App
   ├─ AuthController
   │   └─ AuthService
   │       └─ UserRepository
   │           └─ User Model
   └─ ValidationMiddleware
       └─ SchemaValidator

체크포인트 라우팅 (문서):
  [[AuthenticationFlow]]     ← 전체 인증 흐름 체크포인트
    → [[AuthService]]        ← 인증 로직 체크포인트
    → [[UserRepository]]     ← 데이터 접근 체크포인트
    → [[UserValidation]]     ← 검증 로직 체크포인트

사용자 흐름:
  1. [[AuthenticationFlow]]에서 전체 맥락 파악
  2. 필요 시 [[UserValidation]]로 직접 라우팅 (중간 레이어 스킵)
  3. Backlinks로 역방향 추적 (어디서 사용되는지)
```

**이점**:
- ✅ 구조화 장점 유지 (코드는 여전히 계층적)
- ✅ 탐색 비용 감소 (체크포인트 간 직접 이동)
- ✅ 맥락 보존 (각 체크포인트가 독립적 맥락 제공)
- ✅ 양방향 탐색 (Backlinks를 통한 역참조)

### 모듈 명세 프레임워크

모든 모듈은 다음 7가지 관점으로 정의됩니다:

1. **Purpose (목적)**: 이 모듈이 해결하는 문제와 존재 이유
2. **Input (입력)**: 매개변수, 제약 조건, 사전 조건
3. **Output (출력)**: 반환값, 성공/실패 케이스, 사후 조건
4. **Context (컨텍스트)**: 의존성, 환경, 요구사항
5. **Logic (로직)**: 알고리즘, 내부 동작
6. **Effect (부수 효과)**: 컨텍스트 변경, 외부 I/O
7. **Scope (스코프)**: 공개 인터페이스, 노출된 상태

**중요**: Scope와 Context는 모듈의 경계를 정의하며, 이것이 계층화를 만듭니다. 문서 심볼 시스템은 이 경계를 넘나들며 맥락을 연결합니다.

### 주요 시스템 구성

#### 1. 심볼 그래프 시스템 (`src/graph/`)
- **SymbolGraphBuilder**: 코드베이스의 모든 심볼과 관계를 그래프로 구축
- **SymbolSearchEngine**: 다양한 조건으로 심볼 검색 및 필터링
- **DepthTraverser**: 심볼 그래프 깊이 우선 탐색

**핵심 개념**:
- Symbol: 함수, 클래스, 인터페이스 등 모든 코드 심볼
- Relationship: `dependsOn`, `usedBy`, `implements`, `extends` 등

#### 2. 파싱 시스템 (`src/parser/`)
- **TSDocParser**: TSDoc 주석 파싱 (표준 태그 지원)
- **EnhancedDocExtractor**: 12개 커스텀 태그 자동 추출
  - `@problem`, `@functionality`, `@errorExp`, `@decision`, `@dependency`, `@plan` 등

#### 3. 검증 시스템 (`src/validator/`)
- **ConventionValidator**: TSDoc 컨벤션 규칙 검증
- **ConnectivityValidator**: SSOT 준수 여부, 연결성 점수 계산
- **StrictModeValidator**: 6-카테고리 문서화 시스템 검증

#### 4. 저장소 시스템 (`src/storage/`)
- **DatabaseManager**: SQLite 기반 심볼 저장 (빠른 검색)
- **SymbolRegistryManager**: JSONL 기반 레지스트리 (Git 버전 관리)
- **하이브리드 구조**: SQLite (로컬 성능) + JSONL (버전 관리)

#### 5. 문서 심볼 시스템 (`src/doc-symbol/`) - 평탄화의 핵심
Wiki 스타일 `[[Symbol]]` 표기로 코드-문서 양방향 연결:
- **DocumentSymbolParser**: 마크다운 파일에서 `[[]]` 심볼 파싱
- **TSDocSymbolParser**: 코드의 `@doc [[Symbol]]` 태그 파싱
- **DocumentSymbolRegistry**: 심볼 정의 및 참조 레지스트리
- **BacklinkGenerator**: 자동 백링크 생성
- **SymbolReferenceGenerator**: 코드 심볼 footnote 자동 생성

**작동 원리**:
```markdown
# 문서에서
# [[Authentication System]]  <- 심볼 정의 (H1)
[[UserService]]를 사용합니다.  <- 심볼 참조

# 코드에서
/**
 * @doc [[Authentication System]]
 */
export class AuthService {}
```

**평탄화 효과**:
- 계층적 코드 구조를 문서 네트워크로 투영
- 각 `[[Symbol]]`은 체크포인트 역할 → 계층 탐색 없이 직접 접근
- Backlinks를 통해 역방향 참조 자동 생성 → 맥락 양방향 탐색 가능

#### 6. 명세서 관리 시스템 (`src/spec/`)
- **SpecCompletenessValidator**: 명세서 품질 측정 (0-100점)
- **SpecContentSimilarityChecker**: 중복 콘텐츠 감지
- **SpecStatusManager**: 명세서 생명주기 관리 (draft → review → approved → active)
- **SpecVersionManager**: 명세서 버전 관리
- **UnusedDocumentDetector**: 미사용/오래된 문서 탐지

#### 7. 분석 시스템 (`src/analyzer/`)
- **DocumentationAnalyzer**: 문서 품질 분석
- **CodeHealthChecker**: 코드 건강도 점수 계산
- **CoverageSyncAdapter**: 테스트 커버리지 동기화 (Istanbul 포맷)
- **MissingLinkDetector**: 문서 링크 검증 및 Typo 감지
- **PreCommitChecker**: Git pre-commit hook 품질 검증

### 설정 시스템

`.tsdoc.config.json` 파일로 모든 동작 제어:
- **project**: 프로젝트 메타데이터 (name, version, srcDirs)
- **paths**: 저장 경로 (commentsDir, databasePath, jsonlDir)
- **validation**: 검증 규칙 (strictMode, minConnectivityScore)
- **preCommit**: Git hook 설정 (threshold, warningThreshold)
- **linkCheck**: 링크 검증 설정 (externalModules, enableSuggestions)
- **documentManagement**: 문서 관리 (managedDirs, excludeDirs, ignoreCodeBlocks)

설정 로드는 **ConfigManager 싱글톤**을 통해 전역 접근.

### 타입 구조 (`src/types/`)

도메인별로 구조화:
- **core/**: 파싱, 링킹 기본 타입
- **graph/**: 심볼, 관계 그래프 타입
- **analysis/**: 품질, 통계 분석 타입
- **tags/**: TSDoc 태그 및 커스텀 태그 타입
- **feature/**: 기능별 타입 (doc-symbol, spec 등)
- **config/**: 설정 타입

## 개발 시 주의사항

### 코드 작성 원칙

1. **모든 public API는 TSDoc 주석 필수**
   - `@public` 태그 명시
   - 매개변수는 `@param` 필수
   - 반환값은 `@returns` 필수

2. **심볼 ID는 kebab-case**
   - 예: `user-service`, `auth-validator`
   - IdGenerator 유틸리티 사용

3. **에러 처리는 명시적으로**
   - try-catch 사용 시 에러 타입 체크
   - 의미 있는 에러 메시지 제공

4. **비동기 함수 사용 최소화**
   - 파일 I/O는 동기 함수 사용 (fs.readFileSync)
   - CLI 도구 특성상 동기 흐름 선호

### 테스트 작성 가이드

- **위치**: `src/__tests__/` 디렉토리
- **네이밍**: `<ModuleName>.test.ts`
- **구조**:
  ```typescript
  describe('ModuleName', () => {
    describe('methodName', () => {
      it('should do something', () => {
        // Arrange
        // Act
        // Assert
      });
    });
  });
  ```
- **커버리지**: 핵심 로직 100% 목표

### 파일 스캔 및 DB 빌드

`build` 명령어는 다음 단계로 실행됩니다:
1. FileScanner로 소스 파일 탐색
2. TSDocParser로 주석 파싱
3. SymbolGraphBuilder로 심볼 그래프 구축
4. DatabaseManager로 SQLite에 저장
5. SymbolRegistryManager로 JSONL 내보내기

### Document Symbol 작업 시

1. **관리 대상 문서는 `managed/` 디렉토리에 배치**
2. **예시 문서는 `examples/` 또는 `reference/`에 배치**
3. **Frontmatter 사용 권장**:
   ```yaml
   ---
   tsdoc: managed
   status: active
   primary: SymbolName
   ---
   ```
4. **코드 블록의 `[[]]`은 자동 무시** (ignoreCodeBlocks: true)

**체크포인트 문서 작성 원칙**:
- 각 문서는 **독립적으로 이해 가능**해야 함 (자기완결적 체크포인트)
- **맥락적 기능 정의**: "무엇을", "왜", "어떻게"를 명확히
- 계층 정보는 Backlinks로 자동 생성되므로 **명시적 계층 설명 최소화**
- 관련 개념은 `[[Symbol]]` 참조로 연결 → 독자가 필요시 라우팅
- 문서는 **기능 중심**으로 작성, 구현 계층은 코드 참조로 연결

**체크포인트 선정 기준**:
1. **기능적 응집성**: 하나의 명확한 기능을 담당
2. **의미적 경계**: 다른 모듈과 명확한 책임 분리
3. **독립 이해 가능**: 다른 문서 없이도 이해 가능한 수준
4. **라우팅 허브**: 다른 체크포인트로의 자연스러운 연결점

### CLI 명령어 추가 방법

1. `src/cli.ts`에 명령어 핸들러 추가
2. 도움말 텍스트 업데이트
3. 관련 모듈 import 및 호출
4. 에러 핸들링 및 색상 출력 추가

예시:
```typescript
if (command === 'my-command') {
  const result = new MyModule().execute(args);
  console.log(`${colors.green}✓${colors.reset} Success`);
  process.exit(0);
}
```

## 일반적인 작업 흐름

### 새로운 분석 기능 추가
1. `src/analyzer/`에 새 클래스 생성
2. 필요한 타입을 `src/types/analysis/`에 정의
3. `src/__tests__/`에 테스트 추가
4. `src/cli.ts`에 CLI 명령어 추가
5. `src/index.ts`에서 export

### 새로운 검증 규칙 추가
1. `ConventionValidator` 또는 `ConnectivityValidator` 수정
2. `ValidationConfig`에 규칙 옵션 추가
3. 테스트 케이스 추가
4. 문서 업데이트

### Document Symbol 기능 확장
1. `src/doc-symbol/`에 새 모듈 추가
2. `ParsedDocSymbols` 타입 확장 (필요 시)
3. `DocumentSymbolRegistry` 통합
4. CLI 명령어 추가

### 체크포인트 문서 작성 (새 기능 추가 시)
1. `managed/features/`에 기능 명세서 작성
2. H1에 `# [[FeatureName]]` 체크포인트 정의
3. 관련 코드 심볼을 `[^sym-XXX]` 또는 `[^SymbolName]`로 참조
4. 관련 기능을 `[[RelatedFeature]]`로 라우팅
5. `tsdoc-edge update-symbol-refs managed/features/` 실행
6. `tsdoc-edge update-backlinks` 실행
7. `tsdoc-edge validate-spec managed/features/` 로 완성도 확인

## 프로젝트 구조 요약

```
src/
├── analyzer/        # 분석 엔진 (품질, 커버리지, 링크 검증)
├── cli.ts          # CLI 엔트리포인트 (40개 명령어)
├── config/         # 설정 관리
├── doc-symbol/     # [[Symbol]] 문서 심볼 시스템
├── fixer/          # 문서 자동 수정 및 개선
├── fold/           # 주석 접기/펼치기 시스템
├── generator/      # 마크다운 문서 생성
├── graph/          # 심볼 그래프 및 검색
├── linking/        # 코드-문서 링킹
├── parser/         # TSDoc 파싱 (표준 + 커스텀 태그)
├── scanner/        # 파일 스캔
├── spec/           # 명세서 관리 (완성도, 상태, 버전)
├── storage/        # 데이터 저장 (SQLite + JSONL)
├── types/          # 도메인별 타입 정의
├── validator/      # 문서 검증 (컨벤션, 연결성, strict mode)
└── index.ts        # 메인 export
```

## 추가 참고 문서

- **README.md**: 프로젝트 개요 및 전체 기능 설명
- **archive/deprecated/CLI_WORKFLOWS_AND_SCENARIOS.md**: 40개 CLI 명령어 상세 가이드
- **archive/guides/CONFIG_GUIDE.md**: 설정 파일 완전 가이드
- **managed/features/**: 각 기능별 명세서
