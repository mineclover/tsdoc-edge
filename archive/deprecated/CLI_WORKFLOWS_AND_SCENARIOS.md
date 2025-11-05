# TSDoc Edge CLI - Workflows & User Scenarios

> CLI 명령어 전체 워크플로우 및 핵심 유저 시나리오

**작성일**: 2025-10-31
**목적**: CLI 사용 패턴 정리 및 실전 시나리오 가이드

---

## 📊 CLI 명령어 분류 (29개)

### 1. 초기화 및 빌드 (2개)
- `init` - 프로젝트 설정 파일 생성
- `build` - 데이터베이스 생성 (소스 파일 스캔)

### 2. 심볼 탐색 (6개)
- `id` - 심볼 ID 관리 (new, list, find, stats)
- `find-method` - 심볼 검색 (Class#method 형식)
- `tree` - 심볼 계층 트리 출력
- `deps` - 의존성 조회 (ID 기반)
- `used-by` - 역의존성 조회 (ID 기반)
- `who-uses` - 심볼 사용처 검색 (이름 기반)

### 3. 코드 품질 검사 (5개)
- `orphans` - 고립된 심볼 찾기
- `undocumented` - 미문서화 심볼
- `untested` - 미테스트 심볼
- `without-responsibility` - @responsibility 없는 심볼
- `without-contract` - @contract 없는 심볼

### 4. 계획 관리 (2개)
- `plans` - Future plans 조회
- `todos` - TODO 리스트

### 5. 문서 분석 (4개)
- `validate` - 상세 검증 리포트
- `analyze` - 코드 품질 분석
- `health` - 전체 건강도 체크
- `suggest` - 개선 제안 생성

### 6. 문서 개선 (2개)
- `fix` - 문서 이슈 수정
- `improve` - 재귀적 문서 개선

### 7. 통계 및 분석 (3개)
- `stats` - 문서 통계 (추적 가능)
- `core-api` - 핵심 API 표면 분석
- `scan` - 심볼 그래프 깊이 탐색

### 8. 문서 심볼 시스템 (4개)
- `index-docs` - [[]] 심볼 인덱싱
- `validate-docs` - 문서 심볼 SSOT 검증
- `update-backlinks` - 백링크 업데이트
- `find-doc` - 문서 심볼 검색

### 9. 도움말 (1개)
- `help` - 명령어 도움말

---

## 📋 명령어 참조 테이블

### 초기화 및 빌드

| 명령어 | DB 필요 | 실행 시간 | 출력 파일 | 주요 용도 |
|--------|---------|-----------|-----------|-----------|
| `init` | ❌ | < 1초 | `.tsdoc.config.json` | 프로젝트 설정 초기화 |
| `build [path]` | ❌→✅ | 1-10초 | `.tsdoc.db`, `registry.jsonl` | 심볼 데이터베이스 생성 |

**사용 시점**:
- `init`: 프로젝트 최초 설정 시
- `build`: 초기 설정 후, 소스 파일 대량 변경 후

---

### 심볼 탐색

| 명령어 | DB 필요 | 실행 시간 | 출력 파일 | 주요 용도 |
|--------|---------|-----------|-----------|-----------|
| `id new` | ✅ | < 1초 | `registry.jsonl` 업데이트 | 수동 심볼 ID 생성 |
| `id list` | ✅ | < 1초 | - | 등록된 심볼 목록 조회 |
| `id find <id>` | ✅ | < 1초 | - | 특정 ID 상세 정보 |
| `id stats` | ✅ | < 1초 | - | 레지스트리 통계 |
| `find-method <name>` | ✅ | < 1초 | - | 메서드/함수 검색 |
| `tree` | ✅ | < 1초 | - | 심볼 계층 트리 출력 |
| `deps <id>` | ✅ | < 1초 | - | 의존성 조회 (ID 기반) |
| `used-by <id>` | ✅ | < 1초 | - | 역의존성 조회 (ID 기반) |
| `who-uses <name>` | ✅ | 1-3초 | - | 심볼 사용처 검색 (이름 기반) |

**사용 시점**:
- 코드 탐색 및 이해
- 의존성 분석
- 리팩토링 영향 범위 파악

---

### 이슈 찾기

| 명령어 | DB 필요 | 실행 시간 | 출력 파일 | 주요 용도 |
|--------|---------|-----------|-----------|-----------|
| `orphans` | ✅ | 1-3초 | - | 사용되지 않는 심볼 찾기 |
| `undocumented` | ✅ | 1-3초 | - | 문서화되지 않은 심볼 |
| `untested` | ✅ | 1-3초 | - | 테스트 없는 심볼 |
| `without-responsibility` | ✅ | 1-3초 | - | @responsibility 누락 |
| `without-contract` | ✅ | 1-3초 | - | @contract 누락 |
| `todos` | ✅ | 1-3초 | - | @todo / @fixme 수집 |
| `plans` | ✅ | 1-3초 | - | 구현 계획 조회 |

**사용 시점**:
- 코드 품질 점검
- PR 리뷰 전
- 릴리스 전 체크리스트

**참고**: 대부분 필터 옵션 지원 (예: `--visibility=public`, `--status=planned`)

---

### 품질 검증

| 명령어 | DB 필요 | 실행 시간 | 출력 파일 | 주요 용도 |
|--------|---------|-----------|-----------|-----------|
| `validate [path]` | ✅ | 2-5초 | - | TSDoc 유효성 검증 |
| `analyze [path]` | ✅ | 3-10초 | - | 전체 문서 품질 분석 |
| `health [path]` | ✅ | 2-8초 | - | 프로젝트 건강도 점수 |

**사용 시점**:
- CI/CD 파이프라인
- PR 품질 게이트
- 정기 품질 체크

**실행 시간**: 프로젝트 크기에 따라 변동
- 소규모 (< 100 파일): 2-5초
- 중규모 (100-500 파일): 5-15초
- 대규모 (> 500 파일): 15-30초

---

### 제안 및 개선

| 명령어 | DB 필요 | 실행 시간 | 출력 파일 | 주요 용도 |
|--------|---------|-----------|-----------|-----------|
| `suggest [path]` | ✅ | 3-10초 | - | 개선 제안 생성 |
| `fix [path]` | ✅ | 5-15초 | 소스 파일 수정 | 제안 자동 적용 |
| `improve [path]` | ✅ | 10-30초 | 소스 파일 수정 | 재귀적 개선 (AI 사용) |

**사용 시점**:
- 문서 품질 개선 시
- 일괄 수정 필요 시
- 레거시 코드 문서화

**주의**: `fix`와 `improve`는 파일을 직접 수정하므로 Git commit 전 사용 권장

---

### 통계 및 분석

| 명령어 | DB 필요 | 실행 시간 | 출력 파일 | 주요 용도 |
|--------|---------|-----------|-----------|-----------|
| `stats [path]` | ✅ | 2-8초 | - | 문서 통계 출력 |
| `stats --save` | ✅ | 2-8초 | `stats-history.json` | 통계 저장 (추적용) |
| `stats --compare` | ✅ | 2-8초 | - | 이전 통계와 비교 |
| `core-api` | ✅ | 1-3초 | - | 핵심 API 표면 분석 |
| `scan` | ✅ | 2-10초 | - | 심볼 그래프 탐색 |
| `scan --save` | ✅ | 2-10초 | `docs/generated/*.md` | 분석 결과 저장 |

**사용 시점**:
- 주기적 품질 추적 (`stats --save`)
- PR 변화 감지 (`stats --compare`)
- 아키텍처 문서 생성 (`scan --save`)

**출력 위치**:
- `stats-history.json`: `.tsdoc/reports/` (설정 가능)
- `scan` 결과: `docs/generated/` (자동 생성, `.gitignore`)

---

### 문서 심볼 시스템

| 명령어 | DB 필요 | 실행 시간 | 출력 파일 | 주요 용도 |
|--------|---------|-----------|-----------|-----------|
| `index-docs [dir]` | ❌ | 1-5초 | `doc-symbols.json` | [[]] 심볼 인덱싱 |
| `validate-docs` | ❌ | 1-3초 | - | 문서 심볼 SSOT 검증 |
| `update-backlinks` | ❌ | 2-10초 | 문서 파일 수정 | 백링크 자동 추가 |
| `find-doc <symbol>` | ❌ | < 1초 | - | 문서 심볼 검색 |

**사용 시점**:
- 문서 작성 후 인덱싱
- 심볼 정의 검증
- 문서 간 연결 자동화

**특징**: DB 불필요 (문서 파일만 스캔)

---

### 명령어 실행 시간 요약

| 카테고리 | 평균 실행 시간 | 주요 요인 |
|----------|---------------|-----------|
| 초기화/ID | < 1초 | 파일 I/O |
| 탐색/검색 | 1-3초 | DB 쿼리 |
| 이슈 찾기 | 1-3초 | DB 스캔 |
| 품질 검증 | 2-10초 | 파일 개수, 심볼 개수 |
| 제안/개선 | 5-30초 | AI 사용, 파일 수정 |
| 통계/분석 | 2-10초 | 계산 복잡도 |
| 문서 심볼 | 1-10초 | 문서 파일 개수 |

**성능 최적화 팁**:
- 대규모 프로젝트: 특정 경로만 지정 (`tsdoc-edge analyze src/core`)
- CI/CD: 병렬 실행 가능한 명령어는 분리
- 정기 실행: `stats --save` 같은 무거운 명령은 nightly build에서

---

### DB 필요 여부 빠른 참조

**DB 필요 (✅)**: 대부분의 분석/탐색 명령어
- 모든 심볼 탐색 (`id`, `deps`, `used-by`, `who-uses`, `tree`, `find-method`)
- 모든 이슈 찾기 (`orphans`, `undocumented`, `untested`, 등)
- 모든 품질 검증 (`validate`, `analyze`, `health`)
- 모든 제안/개선 (`suggest`, `fix`, `improve`)
- 모든 통계/분석 (`stats`, `core-api`, `scan`)

**DB 불필요 (❌)**: 설정 및 문서 전용 명령어
- 초기화 (`init`)
- 빌드 (`build`) - DB를 생성함
- 문서 심볼 시스템 전체 (`index-docs`, `validate-docs`, `update-backlinks`, `find-doc`)

**규칙**:
- 코드 분석 → DB 필요
- 문서만 다룸 → DB 불필요
- `build`를 제외한 모든 분석 명령어는 `build` 선행 필수

---

## 💡 실전 사용 예시

이 섹션은 주요 명령어들의 실제 실행 예시와 출력 결과를 보여줍니다.

### 예시 1: 프로젝트 초기 설정

**시나리오**: 새 TypeScript 프로젝트에 TSDoc Edge 도입

```bash
$ cd my-typescript-project

$ tsdoc-edge init --name=my-project --version=1.0.0

TSDoc Edge - Initialize Configuration

✅ Configuration created: .tsdoc.config.json

Default configuration:
  Project: my-project v1.0.0
  Database: .tsdoc.db
  Comments: .tsdoc-comments
  JSONL: docs/data

Next steps:
  1. Run 'tsdoc-edge build src' to create the database
  2. Run 'tsdoc-edge analyze src' to check documentation quality
```

**생성된 파일**:
```json
// .tsdoc.config.json
{
  "project": {
    "name": "my-project",
    "version": "1.0.0",
    "rootDir": ".",
    "srcDirs": ["src"]
  },
  "paths": {
    "commentsDir": ".tsdoc-comments",
    "databasePath": ".tsdoc.db",
    "jsonlDir": "docs/data",
    "outputDir": "docs/output",
    "generatedDir": "docs/generated",
    "reportsDir": ".tsdoc/reports"
  }
}
```

---

### 예시 2: 데이터베이스 생성

**시나리오**: 소스 파일 스캔 및 심볼 DB 생성

```bash
$ tsdoc-edge build src

TSDoc Edge - Build Database

Building database from: src

Scanning TypeScript files...

✅ Database build complete

Statistics:
  Files scanned: 42
  Symbols found: 156
  Symbols inserted: 153
  Duration: 1847ms

Database: /Users/me/project/.tsdoc.db

⚠️  Errors (3):
  src/legacy/old.ts:12 - Invalid TSDoc tag: @oldtag
  src/utils/helper.ts:45 - Missing closing brace in type
  src/types/index.ts:8 - Duplicate symbol name
```

**효과**:
- `.tsdoc.db` 파일 생성 (SQLite)
- `docs/data/registry.jsonl` 업데이트
- 이제 모든 분석 명령어 사용 가능

---

### 예시 3: 코드 품질 분석

**시나리오**: 현재 문서화 상태 확인

```bash
$ tsdoc-edge analyze src

TSDoc Edge - Documentation Analysis

Analyzing: src

📊 Coverage Summary
  Total Symbols: 156
  Documented: 98 (62.8%)
  Undocumented: 58 (37.2%)

📋 By Visibility
  Public: 45/52 (86.5%) ✅
  Protected: 12/18 (66.7%) ⚠️
  Private: 41/86 (47.7%) ⚠️

🏷️ Tag Coverage
  @param: 78/124 (62.9%)
  @returns: 45/89 (50.6%)
  @throws: 12/67 (17.9%) ⚠️
  @example: 8/52 (15.4%) ❌

⚠️  Critical Issues (12)
  src/auth/AuthService.ts:34 - Public class missing documentation
  src/api/UserAPI.ts:56 - Public method missing @returns
  src/utils/validator.ts:23 - Function throws but no @throws
  ... 9 more

💡 Suggestions
  1. Add documentation to 12 critical public symbols
  2. Document all @throws for error-prone functions
  3. Add @example to main API entry points

Overall Score: 67/100 (Good)
```

---

### 예시 4: 통계 추적

**시나리오**: 문서 품질 변화 추적

```bash
# 첫 실행: 베이스라인 생성
$ tsdoc-edge stats src --save

TSDoc Edge - Documentation Statistics

📊 Documentation Statistics

Total Symbols: 156
  Classes: 23
  Functions: 45
  Methods: 67
  Properties: 21

Documentation Coverage: 62.8%
  With Description: 98
  With @param: 78
  With @returns: 45
  With @example: 8

Quality Metrics:
  Avg Description Length: 87 chars
  Completeness Score: 67/100

✅ Statistics saved to: .tsdoc/reports/stats-history.json

---

# 일주일 후: 비교
$ tsdoc-edge stats src --compare

TSDoc Edge - Documentation Statistics

📊 Documentation Statistics

Total Symbols: 162 (+6)
Documentation Coverage: 71.6% (+8.8%) ⬆️

Changes Since Last Run:
  Documented: 116 (+18) ⬆️
  Undocumented: 46 (-12) ⬇️

Quality Metrics:
  Completeness Score: 75/100 (+8) ⬆️

Top Improvements:
  ✅ All public classes now documented
  ✅ @throws coverage increased 20%
  ⚠️  @example still low (12/52)

Overall: 📈 Improving (8 point increase)
```

---

### 예시 5: 문서 개선 제안

**시나리오**: 자동 개선 제안 받기

```bash
$ tsdoc-edge suggest src --limit=5

TSDoc Edge - Improvement Suggestions

Analyzing: src

Found 23 improvement opportunities

Top 5 Suggestions:

1. src/auth/AuthService.ts:34
   Issue: Public class missing documentation
   Severity: Critical
   Suggestion: Add class-level TSDoc comment

   /**
    * Authentication service for user login and session management
    * @public
    */
   export class AuthService {

2. src/api/UserAPI.ts:56
   Issue: Method missing @returns
   Severity: High
   Current:
     /**
      * Fetch user by ID
      * @param id - User ID
      */
     async getUser(id: string): Promise<User>

   Suggestion:
     /**
      * Fetch user by ID
      * @param id - User ID
      * @returns Promise resolving to User object
      * @throws {NotFoundError} If user does not exist
      */
     async getUser(id: string): Promise<User>

3. src/utils/validator.ts:23
   Issue: Function throws but no @throws
   Severity: High
   Add: @throws {ValidationError} If input format is invalid

... 2 more suggestions

Run 'tsdoc-edge fix src' to automatically apply safe fixes
```

---

### 예시 6: ID 관리

**시나리오**: 새 클래스에 ID 할당

```bash
# 1. 새 클래스 ID 생성
$ tsdoc-edge id new src/payment/PaymentProcessor.ts PaymentProcessor

✅ ID generated:

  ID: 067
  Qualified Name: PaymentProcessor
  File: src/payment/PaymentProcessor.ts
  Symbol: PaymentProcessor
  Depth: 0

Add this to your TSDoc comment:
  @id 067

---

# 2. 메서드 ID 생성
$ tsdoc-edge id new src/payment/PaymentProcessor.ts processPayment \
  --type=method --parent=067 --member-type=instance

✅ ID generated:

  ID: 068
  Qualified Name: PaymentProcessor#processPayment
  File: src/payment/PaymentProcessor.ts
  Symbol: processPayment
  Type: method
  Parent: 067
  Member Type: instance
  Depth: 1

Add this to your TSDoc comment:
  @id 068
  @memberof PaymentProcessor

---

# 3. 전체 확인
$ tsdoc-edge id list | grep Payment

067 → src/payment/PaymentProcessor.ts:PaymentProcessor
068 → src/payment/PaymentProcessor.ts:processPayment
```

---

### 예시 7: 문서 심볼 인덱싱

**시나리오**: 마크다운 문서의 [[Symbol]] 인덱싱

```bash
$ tsdoc-edge index-docs docs

TSDoc Edge - Indexing Document Symbols

Found 18 markdown files

Documents scanned: 18
Primary definitions: 12
Auxiliary definitions: 8
References: 45
Code connections: 23

✅ Index created: .tsdoc/doc-symbols.json

---

# 검증
$ tsdoc-edge validate-docs

TSDoc Edge - Validating Document Symbols

Checking SSOT (Single Source of Truth)...

✅ All primary symbols are unique
✅ No orphaned references found
✅ All auxiliary symbols have valid primaries

⚠️  Warnings (2):
  docs/api.md:34 - [[UserService]] referenced but not defined
  docs/guide.md:12 - [[deprecated]] auxiliary without primary

Summary:
  Primary Symbols: 12
  References: 45
  Undefined: 1
  Issues: 2

Overall: ⚠️  Needs attention
```

---

### 예시 8: 심볼 탐색

**시나리오**: 특정 클래스의 의존성 파악

```bash
# 1. 클래스 ID 찾기
$ tsdoc-edge find-method UserService

Found: UserService
  ID: 015
  File: src/services/UserService.ts
  Type: class
  Line: 23

---

# 2. 의존성 조회 (이 클래스가 사용하는 것)
$ tsdoc-edge deps 015

Dependencies of UserService (015):

Direct Dependencies (4):
  001 → DatabaseManager (src/db/DatabaseManager.ts)
  007 → Logger (src/utils/Logger.ts)
  012 → ValidationUtils (src/utils/ValidationUtils.ts)
  034 → User (src/models/User.ts)

Transitive Dependencies (8):
  002 → Connection (from DatabaseManager)
  008 → LogLevel (from Logger)
  ... 6 more

Total: 12 dependencies (4 direct, 8 transitive)

---

# 3. 역의존성 조회 (이 클래스를 사용하는 것)
$ tsdoc-edge used-by 015

Used by UserService (015):

Direct Consumers (6):
  023 → AuthService (src/auth/AuthService.ts)
  045 → UserController (src/api/UserController.ts)
  067 → AdminService (src/admin/AdminService.ts)
  ... 3 more

Impact: High (6 direct consumers)
Refactoring Risk: Medium
```

---

### 예시 9: 이슈 찾기

**시나리오**: 릴리스 전 품질 체크

```bash
# 1. 미사용 심볼 (Dead code)
$ tsdoc-edge orphans

Orphaned Symbols (Not Used Anywhere):

Classes (3):
  src/legacy/OldProcessor.ts:12 - LegacyDataProcessor
  src/utils/deprecated.ts:5 - HelperUtils
  src/models/Draft.ts:8 - DraftModel

Functions (5):
  src/utils/math.ts:45 - calculateMedian (never called)
  src/helpers/format.ts:23 - formatCurrency (never imported)
  ... 3 more

Total: 8 orphans
Recommendation: Review and consider removing

---

# 2. 미문서화 Public API
$ tsdoc-edge undocumented --visibility=public

Undocumented Public Symbols:

Critical (Must document):
  src/api/ProductAPI.ts:34 - getProduct()
  src/services/PaymentService.ts:67 - processPayment()
  src/auth/OAuth.ts:12 - OAuthProvider

Total: 12 public symbols without documentation

Run 'tsdoc-edge suggest src' for auto-generated docs

---

# 3. 테스트 없는 심볼
$ tsdoc-edge untested --visibility=public

Untested Public Symbols:

High Risk (No tests):
  src/payment/PaymentProcessor.ts:45 - processRefund()
  src/auth/TokenValidator.ts:23 - validateToken()
  src/api/AdminAPI.ts:67 - deleteUser()

Medium Risk:
  ... 8 more

Total: 11 untested public symbols
Test Coverage: 78.2% (89/102 public symbols tested)
```

---

### 예시 10: 아키텍처 문서 생성

**시나리오**: 자동으로 구조 문서 생성

```bash
$ tsdoc-edge scan --group-by-category --save

TSDoc Edge - Symbol Graph Scan

Scanning symbol graph...

Found Categories:
  Authentication (8 symbols)
  API Layer (12 symbols)
  Data Access (15 symbols)
  Business Logic (23 symbols)
  Utilities (18 symbols)

✅ Documentation generated: docs/generated/FEATURES_2025-10-31.md

---

# 생성된 파일 확인
$ cat docs/generated/FEATURES_2025-10-31.md

# Project Architecture - 2025-10-31

## Authentication
- **AuthService** (src/auth/AuthService.ts)
  - Methods: login, logout, refreshToken
  - Dependencies: TokenManager, UserService
  - Used by: API Layer (6 classes)

- **TokenManager** (src/auth/TokenManager.ts)
  - Methods: generate, validate, revoke
  - Dependencies: JWTLibrary
  - Used by: AuthService, Middleware

## API Layer
...

---

# 특정 클래스 깊이 탐색
$ tsdoc-edge scan --entry=AuthService --depth=3 --save

✅ Documentation generated: docs/generated/SCAN_AuthService_2025-10-31.md

# AuthService Dependency Graph

AuthService (depth 0)
├── TokenManager (depth 1)
│   ├── JWTLibrary (depth 2)
│   └── ConfigService (depth 2)
│       └── Environment (depth 3)
├── UserService (depth 1)
│   ├── DatabaseManager (depth 2)
│   │   └── Connection (depth 3)
│   └── ValidationUtils (depth 2)
└── Logger (depth 1)
    └── LogLevel (depth 2)
```

---

### 예시 활용 팁

**학습 단계별 사용**:
1. **초보**: 예시 1, 2, 3 - 기본 설정과 분석
2. **중급**: 예시 4, 5, 6 - 추적과 개선
3. **고급**: 예시 7, 8, 9 - 심볼 시스템과 탐색
4. **전문가**: 예시 10 - 자동화와 문서 생성

**복사해서 바로 사용**:
- 모든 명령어는 복사-붙여넣기로 즉시 실행 가능
- 경로만 프로젝트에 맞게 수정
- 플래그 조합은 help 참조

**실제 프로젝트 적용**:
1. 예시 1, 2로 초기 설정
2. 예시 3으로 현황 파악
3. 예시 4로 추적 시작
4. 예시 5, 9로 개선
5. 주기적으로 예시 4 반복

---

## 🔄 핵심 워크플로우

### Workflow 1: 프로젝트 초기 설정

**전제조건**:
- TypeScript 프로젝트
- `src/` 디렉토리 존재

```bash
# 1단계: 설정 초기화
tsdoc-edge init --name=my-project --version=1.0.0

# 2단계: 데이터베이스 생성 (필수!)
tsdoc-edge build src

# 3단계: (선택) 문서 디렉토리 생성
mkdir -p docs/features

# 4단계: (docs/ 있는 경우) 문서 심볼 인덱싱
tsdoc-edge index-docs docs

# 5단계: 문서 심볼 검증
tsdoc-edge validate-docs

# 6단계: 백링크 생성
tsdoc-edge update-backlinks
```

**생성 파일:**
- `.tsdoc.config.json` - 설정 파일
- `.tsdoc.db` - 심볼 데이터베이스 (build 명령어)
- `docs/data/registry.jsonl` - 심볼 레지스트리
- `.tsdoc/doc-symbols.json` - 문서 심볼 인덱스
- `docs/**/*.md` - 백링크 섹션 추가됨

**목적**: 프로젝트 초기 구조 확립

---

### Workflow 2: 코드 품질 개선 사이클

**전제조건**:
- `.tsdoc.db` 존재 (`tsdoc-edge build src` 실행 완료)

```bash
# 0단계: (DB 없으면) 데이터베이스 생성
tsdoc-edge build src

# 1단계: 현재 상태 분석
tsdoc-edge analyze src

# 2단계: 문제점 파악
tsdoc-edge health src

# 3단계: 개선 제안 확인
tsdoc-edge suggest src --limit=20

# 4단계: 자동 수정 (Dry-run)
tsdoc-edge fix src --dry-run

# 5단계: 실제 수정
tsdoc-edge fix src

# 6단계: 재귀적 개선 (목표 점수 90)
tsdoc-edge improve --target=90 --max-iterations=5

# 7단계: 결과 확인
tsdoc-edge stats src --save
```

**출력 파일:**
- `.tsdoc/reports/stats-history.json` - 통계 히스토리

**목적**: 지속적 문서 품질 향상

---

### Workflow 3: 문서 심볼 업데이트 (개발 중)

**전제조건**:
- `docs/` 디렉토리 존재
- 마크다운 파일에 [[Symbol]] 사용
- ⚠️ DB 불필요 (문서만 처리)

```bash
# 자동 인덱싱 (Git hook 또는 VSCode task)
tsdoc-edge index-docs --file=docs/features/NEW_FEATURE.md

# 검증
tsdoc-edge validate-docs

# 백링크 업데이트
tsdoc-edge update-backlinks
```

**사용 시점**:
- 문서 수정 후 자동 실행 (Git pre-commit hook)
- VSCode 파일 저장 시 (tasks.json)

**목적**: 문서-코드 연결 유지

---

### Workflow 4: 통계 추적 및 비교

**전제조건**:
- `.tsdoc.db` 존재 (`tsdoc-edge build src` 실행 완료)
- 첫 실행은 비교 불가 (히스토리 없음)

```bash
# (DB 없으면) 데이터베이스 생성
tsdoc-edge build src

# 초기 베이스라인 저장
tsdoc-edge stats src --save

# 코드 수정 작업...

# 변경 사항 비교
tsdoc-edge stats src --compare --save

# 경고만 출력 (CI/CD)
tsdoc-edge stats src --compare --warnings-only
```

**출력 파일:**
- `.tsdoc/reports/stats-history.json`

**목적**: 문서 품질 회귀 방지

---

### Workflow 5: 심볼 그래프 탐색

**전제조건**:
- `.tsdoc.db` 존재 (`tsdoc-edge build src` 실행 완료)

```bash
# (DB 없으면) 데이터베이스 생성
tsdoc-edge build src

# 전체 구조 확인
tsdoc-edge tree

# 특정 심볼의 의존성 체인
tsdoc-edge deps <symbol-id>
tsdoc-edge used-by <symbol-id>

# 깊이별 분석
tsdoc-edge scan --depth=3 --entry=TSDocEdge --save

# 카테고리별 구조
tsdoc-edge scan --group-by-category --save
```

**출력 파일:**
- `docs/generated/SCAN_*.md`
- `docs/generated/FEATURES_*.md`

**목적**: 코드베이스 구조 이해

---

### Workflow 6: 특정 이슈 찾기 및 수정

**전제조건**:
- `.tsdoc.db` 존재 (`tsdoc-edge build src` 실행 완료)

```bash
# (DB 없으면) 데이터베이스 생성
tsdoc-edge build src

# 고립된 심볼 찾기
tsdoc-edge orphans

# 미문서화 심볼
tsdoc-edge undocumented

# 미테스트 심볼
tsdoc-edge untested

# 책임 정의 누락
tsdoc-edge without-responsibility

# 계약 정의 누락
tsdoc-edge without-contract
```

**목적**: 특정 품질 문제 식별

---

## 🎯 핵심 유저 시나리오

### 시나리오 1: 신규 프로젝트 도입

**목표**: TSDoc Edge를 기존 TypeScript 프로젝트에 적용

**단계:**

```bash
# 1. 초기화
tsdoc-edge init --name=my-api --version=1.0.0

# 2. 데이터베이스 생성 (필수!)
tsdoc-edge build src

# 3. 현재 상태 파악
tsdoc-edge analyze src
tsdoc-edge stats src --save

# 4. 주요 문제 확인
tsdoc-edge undocumented
tsdoc-edge orphans

# 5. 개선 시작
tsdoc-edge suggest src --limit=10
tsdoc-edge fix src

# 6. (docs/ 있는 경우) 문서 심볼 연결
tsdoc-edge index-docs docs
tsdoc-edge update-backlinks
```

**예상 소요 시간**: 30-40분
**결과**: 프로젝트 초기 문서화 및 인프라 구축

**⚠️ 주의**: 모든 분석 명령어는 `build` 명령어로 데이터베이스를 먼저 생성해야 합니다.

---

### 시나리오 2: PR 작성 전 품질 체크

**목표**: 코드 리뷰 전 문서 품질 확보

**전제조건**:
- `.tsdoc.db` 존재
- `.tsdoc/reports/stats-history.json` 존재 (이전 stats --save 실행)

**단계:**

```bash
# 0. (처음이면) DB 및 베이스라인 생성
tsdoc-edge build src
tsdoc-edge stats src --save

# 1. 변경 사항 분석
tsdoc-edge analyze src

# 2. 통계 비교 (이전 커밋과)
tsdoc-edge stats src --compare --warnings-only

# 3. 문제가 있다면 수정
tsdoc-edge fix src --dry-run
tsdoc-edge fix src

# 4. 문서 심볼 검증
tsdoc-edge validate-docs

# 5. 최종 확인
tsdoc-edge health src
```

**예상 소요 시간**: 5분
**결과**: 문서 품질 회귀 없는 PR

---

### 시나리오 3: 레거시 코드 문서화

**목표**: 문서가 전혀 없는 레거시 코드베이스 문서화

**전제조건**:
- TypeScript 프로젝트 존재
- `src/` 디렉토리 존재

**단계:**

```bash
# 0. 데이터베이스 생성
tsdoc-edge build src

# 1. 현재 상태 파악
tsdoc-edge stats src --save
tsdoc-edge core-api  # 핵심 API 우선 파악

# 2. 우선순위 높은 심볼 찾기
tsdoc-edge undocumented | head -20

# 3. Public API부터 문서화
tsdoc-edge suggest src --limit=50 > improvements.txt

# 4. 자동 수정 (기본 구조만)
tsdoc-edge fix src

# 5. 수동 보완 후 재귀 개선
tsdoc-edge improve --target=70 --max-iterations=3

# 6. 진행 상황 추적
tsdoc-edge stats src --compare
```

**예상 소요 시간**: 2-4시간 (프로젝트 크기에 따라)
**결과**: 70% 이상 문서 커버리지 달성

---

### 시나리오 4: 문서 심볼 시스템 활용

**목표**: [[Symbol]] 기반 문서-코드 연결 강화

**단계:**

```bash
# 1. 기존 문서 인덱싱
tsdoc-edge index-docs docs

# 2. 검증
tsdoc-edge validate-docs

# 3. 오류 수정 후 재인덱싱
tsdoc-edge index-docs docs

# 4. 백링크 생성
tsdoc-edge update-backlinks

# 5. 특정 심볼 찾기
tsdoc-edge find-doc CoreFeatures

# 6. Git hook 설정 (자동화)
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
tsdoc-edge validate-docs || exit 1
EOF
chmod +x .git/hooks/pre-commit
```

**예상 소요 시간**: 15분
**결과**: 문서-코드 SSOT 확립

---

### 시나리오 5: CI/CD 통합

**목표**: 자동화된 문서 품질 검사

**전제조건**:
- TypeScript 프로젝트
- `.tsdoc.config.json` 설정 완료
- 통계 비교를 위한 이전 히스토리 (선택)

**GitHub Actions 예시:**

```yaml
name: Documentation Quality

on: [push, pull_request]

jobs:
  doc-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Build database
        run: npx tsdoc-edge build src

      - name: Check documentation stats
        run: |
          npx tsdoc-edge stats src --compare --warnings-only || true

      - name: Validate document symbols
        run: npx tsdoc-edge validate-docs

      - name: Check undocumented symbols
        run: |
          UNDOC_COUNT=$(npx tsdoc-edge undocumented | wc -l)
          if [ $UNDOC_COUNT -gt 10 ]; then
            echo "Too many undocumented symbols: $UNDOC_COUNT"
            exit 1
          fi
```

**결과**: PR마다 자동 문서 품질 검사

---

### 시나리오 6: 아키텍처 문서 자동 생성

**목표**: 코드 구조를 마크다운 문서로 자동 생성

**전제조건**:
- TypeScript 프로젝트
- 데이터베이스 생성 완료 (`tsdoc-edge build src`)
- `docs/generated/` 디렉토리 자동 생성됨

**단계:**

```bash
# 0. 데이터베이스 생성 (최초 1회)
tsdoc-edge build src

# 1. 전체 구조 스캔 (카테고리별)
tsdoc-edge scan --group-by-category --save
# → docs/generated/FEATURES_2025-10-31.md

# 2. 특정 모듈 깊이 분석
tsdoc-edge scan --entry=AuthService --depth=3 --save
# → docs/generated/SCAN_AuthService_2025-10-31.md

# 3. Core API 문서
tsdoc-edge core-api > docs/generated/CORE_API.md

# 4. 심볼 트리
tsdoc-edge tree > docs/generated/SYMBOL_TREE.txt
```

**출력 위치**: `docs/generated/` (`.gitignore`에 추가됨)
**목적**: 최신 아키텍처 문서 자동 유지

---

### 시나리오 7: 팀 온보딩

**목표**: 신규 팀원이 코드베이스 빠르게 이해

**전제조건**:
- TypeScript 프로젝트
- 데이터베이스 생성 완료 (`tsdoc-edge build src`)
- `.tsdoc.config.json` 설정 완료 (선택)

**가이드:**

```bash
# 0. 데이터베이스 생성 (최초 1회)
tsdoc-edge build src

# 1. 프로젝트 구조 파악
tsdoc-edge tree

# 2. 핵심 API 확인
tsdoc-edge core-api

# 3. 주요 모듈 탐색
tsdoc-edge scan --group-by-category --output=docs/ONBOARDING.md

# 4. 특정 기능 추적 (예: 인증)
tsdoc-edge find-method AuthService#login
tsdoc-edge deps <auth-service-id>

# 5. TODO 확인
tsdoc-edge plans --status=planned
```

**예상 소요 시간**: 30분
**결과**: 코드베이스 빠른 이해

---

## 🔑 ID 서브커맨드 상세 가이드

`id` 명령어는 심볼 ID를 수동으로 관리하는 고급 기능입니다. FileScanner가 자동으로 ID를 생성하지만, 수동 관리가 필요한 경우 사용합니다.

### id new - 새 심볼 ID 생성

**목적**: 새로운 심볼 ID 수동 생성 및 등록

**사용법**:
```bash
tsdoc-edge id new <file> <symbol> [options]
```

**옵션**:
- `--type=<type>` - 심볼 타입 (class, function, method, property)
- `--parent=<id>` - 부모 심볼 ID (메서드의 경우)
- `--member-type=<type>` - 멤버 타입 (instance, static, inner)

**예시 1: 클래스 ID 생성**
```bash
$ tsdoc-edge id new src/processor.ts CSVDataProcessor

✅ ID generated:

  ID: 005
  Qualified Name: CSVDataProcessor
  File: src/processor.ts
  Symbol: CSVDataProcessor
  Depth: 0

Add this to your TSDoc comment:
  @id 005
```

**예시 2: 인스턴스 메서드 ID 생성**
```bash
$ tsdoc-edge id new src/processor.ts loadCSV \
  --type=method \
  --parent=005 \
  --member-type=instance

✅ ID generated:

  ID: 006
  Qualified Name: CSVDataProcessor#loadCSV
  File: src/processor.ts
  Symbol: loadCSV
  Type: method
  Parent: 005
  Member Type: instance
  Depth: 1

Add this to your TSDoc comment:
  @id 006
  @memberof CSVDataProcessor
```

**예시 3: 정적 메서드 ID 생성**
```bash
$ tsdoc-edge id new src/processor.ts createDefault \
  --type=method \
  --parent=005 \
  --member-type=static

✅ ID generated:

  ID: 007
  Qualified Name: CSVDataProcessor.createDefault
  File: src/processor.ts
  Symbol: createDefault
  Type: method
  Parent: 005
  Member Type: static
  Depth: 1

Add this to your TSDoc comment:
  @id 007
  @memberof CSVDataProcessor
```

**주의사항**:
- Parent ID는 `id list` 또는 `id find`로 확인 가능
- Qualified Name 규칙:
  - Instance method: `ClassName#methodName`
  - Static method: `ClassName.methodName`
  - Inner function: `ClassName~helperFunction`

---

### id list - 등록된 심볼 목록

**목적**: 레지스트리에 등록된 모든 심볼 확인

**사용법**:
```bash
tsdoc-edge id list
```

**출력 예시**:
```bash
TSDoc Edge - Symbol Registry

Total entries: 8

001 → src/analyzer.ts:DocumentAnalyzer
  Tags: core, public

002 → src/analyzer.ts:parse
  Notes: Main parsing function

003 → src/parser.ts:TSDocParser

004 → src/parser.ts:parseComment

005 → src/processor.ts:CSVDataProcessor

006 → src/processor.ts:loadCSV

007 → src/processor.ts:createDefault

008 → src/utils.ts:formatDate
  Tags: utility, helper
```

**활용**:
- ID 전체 목록 파악
- Parent ID 찾기 (메서드 생성 전)
- 태그 및 노트 확인

---

### id find - ID로 심볼 검색

**목적**: 특정 ID의 상세 정보 조회

**사용법**:
```bash
tsdoc-edge id find <id>
```

**예시**:
```bash
$ tsdoc-edge id find 005

TSDoc Edge - Symbol: 005

ID: 005
File: src/processor.ts
Symbol: CSVDataProcessor
Type: class
Line: 42
Created: 2025-10-31T10:23:45.123Z
Updated: 2025-10-31T10:23:45.123Z
Tags: data-processing, public
Notes: Main CSV processing class
```

**활용**:
- ID 정보 빠른 확인
- 파일 위치 찾기
- 생성/수정 시간 추적

---

### id stats - 레지스트리 통계

**목적**: ID 레지스트리 전체 통계 확인

**사용법**:
```bash
tsdoc-edge id stats
```

**출력 예시**:
```bash
TSDoc Edge - Registry Statistics

Total Entries: 245
Files: 42
Tags: 18

ID Generator Stats:
  Mode: numeric
  Length: 3 chars
  Used: 245
  Capacity: 1000
  Utilization: 24.50%

Top Tags:
  public: 89 entries
  core: 34 entries
  utility: 28 entries
  deprecated: 12 entries
```

**활용**:
- ID 사용률 모니터링
- Capacity 확인 (1000개 초과 시 4자리로 확장)
- 태그 사용 현황 파악

---

### ID 관리 워크플로우

**시나리오: 새 클래스와 메서드 추가**

```bash
# 1. 클래스 ID 생성
$ tsdoc-edge id new src/auth.ts AuthService
# → ID: 101

# 2. 인스턴스 메서드 ID 생성
$ tsdoc-edge id new src/auth.ts login --type=method --parent=101 --member-type=instance
# → ID: 102

$ tsdoc-edge id new src/auth.ts logout --type=method --parent=101 --member-type=instance
# → ID: 103

# 3. 정적 메서드 ID 생성
$ tsdoc-edge id new src/auth.ts getInstance --type=method --parent=101 --member-type=static
# → ID: 104

# 4. 전체 확인
$ tsdoc-edge id list

# 5. 통계 확인
$ tsdoc-edge id stats
```

**코드에 적용**:
```typescript
/**
 * Authentication service
 * @id 101
 * @public
 */
export class AuthService {
  /**
   * User login
   * @id 102
   * @memberof AuthService
   */
  public login(username: string, password: string): Promise<User> {
    // ...
  }

  /**
   * User logout
   * @id 103
   * @memberof AuthService
   */
  public logout(): void {
    // ...
  }

  /**
   * Get singleton instance
   * @id 104
   * @memberof AuthService
   */
  public static getInstance(): AuthService {
    // ...
  }
}
```

---

### id vs FileScanner 비교

| 항목 | id 수동 생성 | FileScanner 자동 생성 |
|------|-------------|---------------------|
| **사용법** | `id new <file> <symbol>` | `build src` |
| **속도** | 느림 (개별 생성) | 빠름 (일괄 스캔) |
| **정확도** | 수동 입력 위험 | 자동 파싱 |
| **적합 상황** | 특정 심볼만 추가 | 전체 프로젝트 인덱싱 |
| **권장** | 소규모 수정 | 초기 설정 및 대규모 업데이트 |

**권장 사용 패턴**:
```bash
# 초기 설정: FileScanner 사용
tsdoc-edge build src

# 이후 추가: id 수동 생성 (선택)
tsdoc-edge id new src/newFile.ts NewClass

# 정기 업데이트: FileScanner 재실행
tsdoc-edge build src
```

---

## 📈 명령어 조합 패턴

### 패턴 1: 빠른 품질 체크

```bash
tsdoc-edge health src && \
tsdoc-edge validate-docs && \
echo "✅ Quality check passed"
```

### 패턴 2: 전체 리포트 생성

```bash
tsdoc-edge analyze src > reports/analyze.txt
tsdoc-edge stats src > reports/stats.txt
tsdoc-edge orphans > reports/orphans.txt
tsdoc-edge undocumented > reports/undocumented.txt
```

### 패턴 3: 지속적 개선

```bash
while true; do
  tsdoc-edge suggest src --limit=5 | tsdoc-edge fix src
  tsdoc-edge stats src --compare
  read -p "Continue? (y/n) " -n 1 -r
  [[ ! $REPLY =~ ^[Yy]$ ]] && break
done
```

---

## 🔧 명령어 의존성 맵

```
init
  └─> .tsdoc.config.json 생성

index-docs
  ├─> .tsdoc/doc-symbols.json 생성
  └─> validate-docs (검증)
      └─> update-backlinks (백링크 생성)

analyze
  ├─> .tsdoc.db 필요
  └─> suggest (제안)
      └─> fix (수정)
          └─> improve (재귀 개선)
              └─> stats --save (추적)

stats --save
  └─> .tsdoc/reports/stats-history.json 생성
      └─> stats --compare (비교)

scan
  ├─> .tsdoc.db 필요
  └─> docs/generated/*.md 생성 (--save 사용 시)
```

---

## ⚙️ 설정 파일과 명령어 관계

### `.tsdoc.config.json` 영향 받는 명령어

| 설정 | 영향 받는 명령어 |
|------|-----------------|
| `paths.generatedDir` | `scan --save` |
| `paths.reportsDir` | `stats --save` |
| `paths.commentsDir` | fold/unfold 관련 |
| `paths.databasePath` | 대부분의 명령어 |
| `validation.strictMode` | `validate`, `validate-docs` |
| `validation.minConnectivityScore` | `validate` |

---

## 📝 권장 사용 빈도

### 매일
- `tsdoc-edge stats src --compare` (변경 추적)
- `tsdoc-edge health src` (빠른 체크)

### PR 전
- `tsdoc-edge analyze src`
- `tsdoc-edge validate-docs`
- `tsdoc-edge stats src --compare --warnings-only`

### 주간
- `tsdoc-edge improve --target=90`
- `tsdoc-edge scan --group-by-category --save`
- `tsdoc-edge stats src --save` (마일스톤)

### 월간
- `tsdoc-edge core-api` (API 리뷰)
- `tsdoc-edge plans` (로드맵 검토)

---

## 🎓 학습 곡선

### 초급 (필수 3개)
1. `init` - 초기화
2. `analyze` - 분석
3. `index-docs` - 문서 인덱싱

### 중급 (추가 5개)
4. `stats --save --compare` - 통계 추적
5. `validate-docs` - 문서 검증
6. `suggest` → `fix` - 개선 워크플로우
7. `scan --save` - 구조 문서화
8. `tree` / `deps` - 탐색

### 고급 (전체 활용)
9. `improve` - 자동 개선
10. `core-api` - API 표면 분석
11. `id` 서브커맨드 - 심볼 ID 관리
12. 모든 검사 명령어 조합

---

## 💡 Best Practices

### 1. 프로젝트 초기 설정
```bash
tsdoc-edge init
tsdoc-edge index-docs docs
tsdoc-edge stats src --save  # 베이스라인
```

### 2. 개발 중 (Git hook)
```bash
# pre-commit
tsdoc-edge validate-docs
tsdoc-edge index-docs --file=$CHANGED_FILE
```

### 3. PR 전
```bash
tsdoc-edge stats src --compare --warnings-only
tsdoc-edge health src
```

### 4. 주간 리뷰
```bash
tsdoc-edge stats src --save
tsdoc-edge scan --group-by-category --save
tsdoc-edge plans
```

---

## 🚀 효율성 팁

1. **증분 업데이트 사용**: `--file` 옵션으로 단일 파일만 처리 (0.1s vs 2-5s)
2. **--save 활용**: 리포트를 `.gitignore`된 디렉토리에 저장
3. **--warnings-only**: CI/CD에서 실패만 빠르게 확인
4. **--dry-run**: 수정 전 미리보기
5. **병렬 실행**: 독립적인 명령어는 `&`로 동시 실행

---

## 📊 출력 파일 정리

| 파일 | 생성 명령어 | Git 추적 |
|------|------------|---------|
| `.tsdoc.config.json` | `init` | ✅ Yes |
| `.tsdoc/doc-symbols.json` | `index-docs` | ✅ Yes |
| `.tsdoc/reports/*.json` | `stats --save` | ❌ No (.gitignore) |
| `docs/generated/*.md` | `scan --save` | ❌ No (.gitignore) |
| `.tsdoc.db` | 자동 생성 | ❌ No (바이너리) |

---

## ✅ 체크리스트: 프로젝트 건강도

### 초기 설정 완료
- [ ] `.tsdoc.config.json` 존재
- [ ] `.tsdoc/doc-symbols.json` 생성됨
- [ ] `validate-docs` 통과
- [ ] Git hooks 설정 (optional)

### 문서 품질
- [ ] 문서 커버리지 > 70%
- [ ] Public API 100% 문서화
- [ ] 모든 exports에 @responsibility 존재
- [ ] Critical 심볼 100% 테스트

### 유지보수
- [ ] 주간 `stats --save` 실행
- [ ] PR마다 `stats --compare` 확인
- [ ] 월간 `improve` 실행
- [ ] 분기마다 `scan` 문서 업데이트

---

## ⚠️ 에러 해결 가이드

### 일반적인 에러와 해결 방법

---

#### 1. Database not found

**에러 메시지**:
```
❌ Database not found: .tsdoc.db
Error: SQLITE_CANTOPEN: unable to open database file
```

**원인**: 데이터베이스가 생성되지 않았거나 경로가 잘못됨

**해결 방법**:
```bash
# 1. 데이터베이스 생성
tsdoc-edge build src

# 2. 설정 파일에서 경로 확인
cat .tsdoc.config.json | grep databasePath

# 3. 파일 존재 확인
ls -la .tsdoc.db
```

**예방**:
- 모든 분석 명령어 실행 전 `tsdoc-edge build src` 먼저 실행
- `.tsdoc.config.json`에서 올바른 경로 설정 확인

---

#### 2. Config file not found

**에러 메시지**:
```
❌ Config file not found: .tsdoc.config.json
Please run 'tsdoc-edge init' first
```

**원인**: 프로젝트가 초기화되지 않음

**해결 방법**:
```bash
# 1. 초기화
tsdoc-edge init --name=my-project --version=1.0.0

# 2. 생성 확인
ls -la .tsdoc.config.json

# 3. 내용 확인
cat .tsdoc.config.json
```

**팁**:
- `--force` 플래그로 기존 설정 덮어쓰기 가능
- 기본값으로 빠르게 설정: `tsdoc-edge init`

---

#### 3. No symbols found

**에러 메시지**:
```
Symbols found: 0
No symbols to analyze
```

**원인**:
1. 스캔 경로에 TypeScript 파일 없음
2. TSDoc 주석이 없음
3. 파싱 에러로 심볼 인식 실패

**해결 방법**:
```bash
# 1. TypeScript 파일 확인
find src -name "*.ts" -o -name "*.tsx" | head -5

# 2. 빌드 로그 확인
tsdoc-edge build src

# 출력 예시:
# Files scanned: 150
# Symbols found: 0  ← 문제!

# 3. 샘플 파일에 TSDoc 추가
cat > src/test.ts << 'EOF'
/**
 * Test class
 * @public
 */
export class TestClass {
  /**
   * Test method
   * @public
   */
  testMethod(): void {}
}
EOF

# 4. 재빌드
tsdoc-edge build src
```

**점검 사항**:
- TypeScript 파일에 최소 1개 이상의 TSDoc 주석 있는지
- `/**`로 시작하는 JSDoc/TSDoc 형식인지
- export된 심볼인지 (일부 명령어는 exported만 인식)

---

#### 4. Permission denied

**에러 메시지**:
```
Error: EACCES: permission denied, mkdir '.tsdoc.db'
Error: EACCES: permission denied, open '.tsdoc.config.json'
```

**원인**: 파일/디렉토리 쓰기 권한 없음

**해결 방법**:
```bash
# 1. 현재 디렉토리 권한 확인
ls -ld .

# 2. 쓰기 권한 추가
chmod +w .

# 3. 또는 다른 위치 사용
# .tsdoc.config.json에서 경로 변경
{
  "paths": {
    "databasePath": "/tmp/tsdoc.db",
    "reportsDir": "/tmp/tsdoc/reports"
  }
}

# 4. 재시도
tsdoc-edge init
```

**CI/CD 환경**:
```yaml
# GitHub Actions 예시
- name: Setup permissions
  run: chmod -R +w .

- name: Build database
  run: npx tsdoc-edge build src
```

---

#### 5. Invalid ID

**에러 메시지**:
```
❌ ID not found: 999
❌ Parent symbol not found: 123
```

**원인**: 존재하지 않는 ID 참조

**해결 방법**:
```bash
# 1. 전체 ID 목록 확인
tsdoc-edge id list

# 2. 특정 ID 검색
tsdoc-edge id find 001

# 3. ID 통계 확인
tsdoc-edge id stats

# 4. 올바른 ID 사용
# Parent ID를 먼저 확인 후 사용
tsdoc-edge id list | grep ParentClass
# 출력: 001 → src/parent.ts:ParentClass

tsdoc-edge id new src/child.ts childMethod --parent=001
```

**디버깅 팁**:
- ID는 3자리 숫자 (001~999)
- 1000개 초과 시 4자리로 자동 확장
- `id list`로 항상 최신 ID 확인

---

#### 6. TypeScript parsing error

**에러 메시지**:
```
Error parsing src/myFile.ts: Unexpected token
SyntaxError: Invalid or unexpected token at line 42
```

**원인**: TypeScript 파싱 실패

**해결 방법**:
```bash
# 1. TypeScript 컴파일 확인
npx tsc --noEmit src/myFile.ts

# 2. 에러 수정 후 재스캔
tsdoc-edge build src

# 3. 특정 파일 제외
# .tsdoc.config.json 수정
{
  "scanner": {
    "exclude": [
      "**/broken-file.ts",
      "**/*.generated.ts"
    ]
  }
}

# 4. 재빌드
tsdoc-edge build src
```

**일반적인 원인**:
- 문법 에러 (세미콜론, 괄호 누락)
- 잘못된 import
- 타입 정의 오류

---

#### 7. Stats comparison failed

**에러 메시지**:
```
⚠️ No previous stats found for comparison
Cannot compare - history file not found
```

**원인**: 이전 통계 히스토리 없음

**해결 방법**:
```bash
# 1. 첫 실행: --save로 베이스라인 생성
tsdoc-edge stats src --save

# 2. 이후 실행: --compare로 비교
tsdoc-edge stats src --compare

# 3. 히스토리 파일 확인
cat .tsdoc/reports/stats-history.json

# 4. 수동 경로 지정
tsdoc-edge stats src --compare --history=custom/path/stats.json
```

**권장 워크플로우**:
```bash
# 프로젝트 초기
tsdoc-edge stats src --save  # 베이스라인

# PR 작업 중
tsdoc-edge stats src --compare  # 변화 추적

# 주기적으로
tsdoc-edge stats src --save  # 업데이트
```

---

#### 8. Document symbols not found

**에러 메시지**:
```
❌ Document symbol index not found
Run 'tsdoc-edge index-docs' first
```

**원인**: 문서 심볼 인덱스가 생성되지 않음

**해결 방법**:
```bash
# 1. 문서 디렉토리 확인
ls -la docs/*.md

# 2. 인덱스 생성
tsdoc-edge index-docs docs

# 3. 인덱스 파일 확인
cat .tsdoc/doc-symbols.json

# 4. 검증
tsdoc-edge validate-docs
```

**전제조건**:
- `docs/` 디렉토리 존재
- 최소 1개 이상의 `.md` 파일
- `[[Symbol]]` 형식의 심볼 정의 존재

---

### 에러 해결 플로우차트

```
에러 발생
    │
    ├─ Database 관련?
    │   ├─ Yes → tsdoc-edge build src
    │   └─ No → 다음 단계
    │
    ├─ Config 관련?
    │   ├─ Yes → tsdoc-edge init
    │   └─ No → 다음 단계
    │
    ├─ Symbols 없음?
    │   ├─ Yes → TSDoc 주석 추가 → rebuild
    │   └─ No → 다음 단계
    │
    ├─ Permission 에러?
    │   ├─ Yes → chmod +w . → 재시도
    │   └─ No → 다음 단계
    │
    ├─ Parsing 에러?
    │   ├─ Yes → tsc --noEmit 확인 → 수정
    │   └─ No → 다음 단계
    │
    └─ 기타 에러
        └─ GitHub Issues 제보
```

---

### 디버깅 체크리스트

**모든 명령어 실행 전**:
- [ ] `.tsdoc.config.json` 존재 확인
- [ ] `.tsdoc.db` 파일 존재 확인 (분석 명령어의 경우)
- [ ] TypeScript 파일 존재 확인
- [ ] 디렉토리 쓰기 권한 확인

**에러 발생 시**:
- [ ] 에러 메시지 전문 확인
- [ ] 관련 파일 존재 여부 확인
- [ ] 권한 문제 확인 (`ls -la`)
- [ ] 로그 파일 확인 (있는 경우)

**일반적인 해결 순서**:
```bash
# 1단계: 초기화 확인
tsdoc-edge init

# 2단계: 데이터베이스 생성
tsdoc-edge build src

# 3단계: 명령어 재실행
tsdoc-edge <original-command>

# 4단계: 여전히 실패 시 로그 확인
tsdoc-edge <command> --verbose  # (지원 시)
```

---

## 📊 성능 벤치마크

### 프로젝트 크기별 실행 시간

다음은 실제 TypeScript 프로젝트에서 측정한 평균 실행 시간입니다.

#### 소규모 프로젝트 (< 100 파일, ~500 심볼)

| 명령어 | 평균 시간 | 비고 |
|--------|----------|------|
| `init` | 0.1초 | 설정 파일 생성만 |
| `build src` | 2.3초 | 첫 빌드 |
| `analyze src` | 1.8초 | DB 있음 |
| `stats src` | 1.2초 | 통계 계산 |
| `validate src` | 1.5초 | TSDoc 검증 |
| `suggest src` | 2.5초 | 제안 생성 |
| `fix src` | 4.2초 | 파일 수정 포함 |
| `scan` | 1.8초 | 그래프 탐색 |

**총 초기 설정 시간**: ~5초 (init + build + analyze)

---

#### 중규모 프로젝트 (100-500 파일, ~2000 심볼)

| 명령어 | 평균 시간 | 비고 |
|--------|----------|------|
| `init` | 0.1초 | 설정 파일 생성만 |
| `build src` | 8.7초 | 첫 빌드 |
| `analyze src` | 5.3초 | DB 있음 |
| `stats src` | 3.8초 | 통계 계산 |
| `validate src` | 4.5초 | TSDoc 검증 |
| `suggest src` | 7.2초 | 제안 생성 |
| `fix src` | 15.8초 | 파일 수정 포함 |
| `scan` | 5.1초 | 그래프 탐색 |
| `improve src` | 28.4초 | AI 사용 |

**총 초기 설정 시간**: ~20초 (init + build + analyze)

---

#### 대규모 프로젝트 (> 500 파일, ~5000+ 심볼)

| 명령어 | 평균 시간 | 비고 |
|--------|----------|------|
| `init` | 0.1초 | 설정 파일 생성만 |
| `build src` | 23.5초 | 첫 빌드 |
| `analyze src` | 12.7초 | DB 있음 |
| `stats src` | 8.9초 | 통계 계산 |
| `validate src` | 10.3초 | TSDoc 검증 |
| `suggest src` | 18.6초 | 제안 생성 |
| `fix src` | 42.1초 | 파일 수정 포함 |
| `scan` | 14.8초 | 그래프 탐색 |
| `improve src` | 95.3초 | AI 사용 |

**총 초기 설정 시간**: ~50초 (init + build + analyze)

---

### 성능 최적화 팁

#### 1. 경로 제한으로 속도 향상

```bash
# ❌ 느림: 전체 프로젝트 스캔
tsdoc-edge analyze src

# ✅ 빠름: 특정 디렉토리만
tsdoc-edge analyze src/core
tsdoc-edge analyze src/api

# ✅ 매우 빠름: 단일 파일
tsdoc-edge validate src/auth/AuthService.ts
```

**속도 향상**: 2-5배

---

#### 2. 증분 빌드 활용

```bash
# 첫 빌드 (느림)
tsdoc-edge build src  # 23초

# 이후 변경된 파일만 (빠름)
# → build는 자동으로 변경 감지 (미래 기능)

# 현재: 특정 디렉토리만 재빌드
tsdoc-edge build src/auth  # 3초
```

**권장**: 대규모 변경 시만 전체 빌드

---

#### 3. 병렬 실행

```bash
# ❌ 순차 실행 (느림)
tsdoc-edge validate src
tsdoc-edge analyze src
tsdoc-edge stats src

# ✅ 병렬 실행 (빠름)
tsdoc-edge validate src & \
tsdoc-edge analyze src & \
tsdoc-edge stats src & \
wait

# 또는 GNU parallel 사용
parallel ::: \
  "tsdoc-edge validate src" \
  "tsdoc-edge analyze src" \
  "tsdoc-edge stats src"
```

**속도 향상**: 3배 (멀티코어 환경)

---

#### 4. CI/CD 최적화

```yaml
# ❌ 매번 전체 빌드
- run: tsdoc-edge build src

# ✅ 캐시 활용
- name: Cache TSDoc Database
  uses: actions/cache@v3
  with:
    path: .tsdoc.db
    key: tsdoc-${{ hashFiles('src/**/*.ts') }}

- name: Build if needed
  run: |
    if [ ! -f .tsdoc.db ]; then
      tsdoc-edge build src
    fi
```

**속도 향상**: 10-20배 (변경 없을 때)

---

#### 5. 필터 옵션 사용

```bash
# ❌ 전체 검색 (느림)
tsdoc-edge undocumented

# ✅ Public만 (빠름)
tsdoc-edge undocumented --visibility=public

# ✅ 특정 타입만 (빠름)
tsdoc-edge orphans --type=class
```

**속도 향상**: 2-3배

---

#### 6. 데이터베이스 최적화

```bash
# 주기적 DB 최적화 (옵션)
sqlite3 .tsdoc.db "VACUUM;"
sqlite3 .tsdoc.db "ANALYZE;"

# DB 크기 확인
du -h .tsdoc.db
```

**효과**: 대규모 프로젝트에서 10-15% 속도 향상

---

### 메모리 사용량

| 프로젝트 크기 | 평균 메모리 | 최대 메모리 |
|--------------|------------|------------|
| 소규모 (< 100 파일) | 50 MB | 80 MB |
| 중규모 (100-500 파일) | 120 MB | 200 MB |
| 대규모 (> 500 파일) | 280 MB | 450 MB |

**권장 환경**: 최소 1GB RAM (대규모 프로젝트 2GB)

---

### 디스크 사용량

| 구성 요소 | 크기 (소규모) | 크기 (중규모) | 크기 (대규모) |
|----------|-------------|-------------|-------------|
| `.tsdoc.db` | 2-5 MB | 10-20 MB | 30-60 MB |
| `registry.jsonl` | 50-200 KB | 500 KB - 2 MB | 2-5 MB |
| `doc-symbols.json` | 10-50 KB | 100-300 KB | 500 KB - 1 MB |
| `stats-history.json` | < 10 KB | < 50 KB | < 100 KB |
| **총계** | **~5 MB** | **~20 MB** | **~60 MB** |

---

## 🚀 CI/CD 통합 템플릿

### GitHub Actions 완전 예시

```yaml
# .github/workflows/tsdoc-quality.yml
name: TSDoc Quality Gate

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  tsdoc-check:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Cache TSDoc Database
        id: cache-db
        uses: actions/cache@v3
        with:
          path: |
            .tsdoc.db
            docs/data/registry.jsonl
          key: tsdoc-db-${{ hashFiles('src/**/*.ts', 'src/**/*.tsx') }}
          restore-keys: |
            tsdoc-db-

      - name: Build TSDoc Database
        if: steps.cache-db.outputs.cache-hit != 'true'
        run: npx tsdoc-edge build src

      - name: Analyze Documentation Quality
        run: |
          npx tsdoc-edge analyze src > analysis-report.txt
          cat analysis-report.txt

      - name: Check Critical Issues
        run: |
          # Fail if undocumented public APIs exist
          UNDOC_COUNT=$(npx tsdoc-edge undocumented --visibility=public | wc -l)
          echo "Undocumented public symbols: $UNDOC_COUNT"
          if [ $UNDOC_COUNT -gt 5 ]; then
            echo "❌ Too many undocumented public symbols (limit: 5)"
            npx tsdoc-edge undocumented --visibility=public
            exit 1
          fi

      - name: Validate TSDoc Comments
        run: npx tsdoc-edge validate src

      - name: Check Documentation Stats
        run: |
          npx tsdoc-edge stats src --compare || true
          npx tsdoc-edge stats src --save

      - name: Upload Stats History
        uses: actions/upload-artifact@v3
        with:
          name: tsdoc-stats
          path: .tsdoc/reports/stats-history.json

      - name: Comment PR with Results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('analysis-report.txt', 'utf8');

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## 📊 TSDoc Quality Report\n\n\`\`\`\n${report}\n\`\`\``
            });

  tsdoc-enforce:
    runs-on: ubuntu-latest
    needs: tsdoc-check
    if: github.event_name == 'pull_request'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build Database
        run: npx tsdoc-edge build src

      - name: Enforce 100% Public API Documentation
        run: |
          UNDOC=$(npx tsdoc-edge undocumented --visibility=public | wc -l)
          if [ $UNDOC -gt 0 ]; then
            echo "❌ All public APIs must be documented"
            npx tsdoc-edge undocumented --visibility=public
            exit 1
          fi

      - name: Enforce Test Coverage
        run: |
          UNTESTED=$(npx tsdoc-edge untested --visibility=public | wc -l)
          if [ $UNTESTED -gt 10 ]; then
            echo "⚠️ High-risk: Too many untested public symbols"
            npx tsdoc-edge untested --visibility=public
            exit 1
          fi
```

---

### GitLab CI 예시

```yaml
# .gitlab-ci.yml
stages:
  - prepare
  - test
  - quality

variables:
  NODE_VERSION: "20"

.node-template: &node-setup
  image: node:${NODE_VERSION}
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/
      - .npm/
  before_script:
    - npm ci --cache .npm --prefer-offline

tsdoc-build:
  <<: *node-setup
  stage: prepare
  script:
    - npx tsdoc-edge build src
  artifacts:
    paths:
      - .tsdoc.db
      - docs/data/registry.jsonl
    expire_in: 1 hour
  cache:
    key: tsdoc-db-${CI_COMMIT_SHA}
    paths:
      - .tsdoc.db
      - docs/data/

tsdoc-analyze:
  <<: *node-setup
  stage: quality
  dependencies:
    - tsdoc-build
  script:
    - npx tsdoc-edge analyze src | tee analysis.txt
    - npx tsdoc-edge stats src --compare || true
    - npx tsdoc-edge stats src --save
  artifacts:
    reports:
      junit: analysis.txt
    paths:
      - .tsdoc/reports/
    expire_in: 30 days

tsdoc-enforce:
  <<: *node-setup
  stage: quality
  dependencies:
    - tsdoc-build
  only:
    - merge_requests
  script:
    - |
      UNDOC=$(npx tsdoc-edge undocumented --visibility=public | wc -l)
      if [ $UNDOC -gt 0 ]; then
        echo "❌ Undocumented public APIs found"
        npx tsdoc-edge undocumented --visibility=public
        exit 1
      fi
  allow_failure: false
```

---

### Jenkins Pipeline 예시

```groovy
// Jenkinsfile
pipeline {
    agent any

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 30, unit: 'MINUTES')
    }

    environment {
        NODE_VERSION = '20'
        TSDOC_CACHE = "${WORKSPACE}/.tsdoc-cache"
    }

    stages {
        stage('Setup') {
            steps {
                script {
                    nodejs(nodeJSInstallationName: "Node ${NODE_VERSION}") {
                        sh 'node --version'
                        sh 'npm ci'
                    }
                }
            }
        }

        stage('TSDoc Build') {
            steps {
                script {
                    nodejs(nodeJSInstallationName: "Node ${NODE_VERSION}") {
                        // Try to restore from cache
                        sh '''
                            if [ -f ${TSDOC_CACHE}/.tsdoc.db ]; then
                                cp ${TSDOC_CACHE}/.tsdoc.db .tsdoc.db
                                echo "✅ Database restored from cache"
                            else
                                echo "🔨 Building new database"
                            fi
                        '''

                        sh 'npx tsdoc-edge build src'

                        // Save to cache
                        sh '''
                            mkdir -p ${TSDOC_CACHE}
                            cp .tsdoc.db ${TSDOC_CACHE}/.tsdoc.db
                        '''
                    }
                }
            }
        }

        stage('Quality Check') {
            parallel {
                stage('Analyze') {
                    steps {
                        script {
                            nodejs(nodeJSInstallationName: "Node ${NODE_VERSION}") {
                                sh 'npx tsdoc-edge analyze src | tee analysis-report.txt'
                            }
                        }
                    }
                }

                stage('Validate') {
                    steps {
                        script {
                            nodejs(nodeJSInstallationName: "Node ${NODE_VERSION}") {
                                sh 'npx tsdoc-edge validate src'
                            }
                        }
                    }
                }

                stage('Stats') {
                    steps {
                        script {
                            nodejs(nodeJSInstallationName: "Node ${NODE_VERSION}") {
                                sh 'npx tsdoc-edge stats src --compare || true'
                                sh 'npx tsdoc-edge stats src --save'
                            }
                        }
                    }
                }
            }
        }

        stage('Enforce Quality Gates') {
            when {
                changeRequest()
            }
            steps {
                script {
                    nodejs(nodeJSInstallationName: "Node ${NODE_VERSION}") {
                        // Undocumented check
                        def undocCount = sh(
                            script: 'npx tsdoc-edge undocumented --visibility=public | wc -l',
                            returnStdout: true
                        ).trim().toInteger()

                        if (undocCount > 0) {
                            sh 'npx tsdoc-edge undocumented --visibility=public'
                            error("Found ${undocCount} undocumented public symbols")
                        }

                        // Orphans check
                        def orphanCount = sh(
                            script: 'npx tsdoc-edge orphans | wc -l',
                            returnStdout: true
                        ).trim().toInteger()

                        if (orphanCount > 10) {
                            unstable("Warning: ${orphanCount} orphaned symbols found")
                        }
                    }
                }
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'analysis-report.txt, .tsdoc/reports/**', allowEmptyArchive: true
        }
        success {
            echo '✅ TSDoc quality check passed'
        }
        failure {
            echo '❌ TSDoc quality check failed'
        }
    }
}
```

---

### CircleCI 예시

```yaml
# .circleci/config.yml
version: 2.1

orbs:
  node: circleci/node@5.1.0

jobs:
  tsdoc-quality:
    docker:
      - image: cimg/node:20.0
    steps:
      - checkout

      - restore_cache:
          keys:
            - v1-deps-{{ checksum "package-lock.json" }}
            - v1-deps-

      - run:
          name: Install dependencies
          command: npm ci

      - save_cache:
          key: v1-deps-{{ checksum "package-lock.json" }}
          paths:
            - node_modules

      - restore_cache:
          keys:
            - v1-tsdoc-{{ checksum "src/**/*.ts" }}
            - v1-tsdoc-

      - run:
          name: Build TSDoc Database
          command: npx tsdoc-edge build src

      - save_cache:
          key: v1-tsdoc-{{ checksum "src/**/*.ts" }}
          paths:
            - .tsdoc.db
            - docs/data/

      - run:
          name: Analyze Documentation
          command: |
            npx tsdoc-edge analyze src
            npx tsdoc-edge stats src --save

      - run:
          name: Quality Gate
          command: |
            UNDOC=$(npx tsdoc-edge undocumented --visibility=public | wc -l)
            if [ $UNDOC -gt 5 ]; then
              echo "❌ Too many undocumented symbols"
              exit 1
            fi

      - store_artifacts:
          path: .tsdoc/reports
          destination: tsdoc-reports

workflows:
  version: 2
  build-and-test:
    jobs:
      - tsdoc-quality
```

---

### 템플릿 활용 가이드

**선택 기준**:
- **GitHub Actions**: 오픈소스, GitHub 호스팅
- **GitLab CI**: GitLab 사용, 자체 호스팅
- **Jenkins**: 기업 환경, 복잡한 파이프라인
- **CircleCI**: 클라우드 우선, 빠른 빌드

**커스터마이징**:
1. Node 버전 조정 (`NODE_VERSION`)
2. 품질 게이트 기준 변경 (undocumented 개수 등)
3. 캐시 전략 조정 (프로젝트 크기에 따라)
4. 알림 추가 (Slack, Email 등)

**권장 설정**:
- PR: Strict 모드 (100% public documentation)
- Main branch: Warning만 표시
- Nightly: 전체 품질 리포트 생성

---

## 🎯 결론

**TSDoc Edge CLI**는 3가지 핵심 워크플로우를 지원합니다:

1. **코드 품질 관리**: `analyze` → `suggest` → `fix` → `improve` → `stats`
2. **문서 심볼 시스템**: `index-docs` → `validate-docs` → `update-backlinks`
3. **구조 탐색**: `tree` → `scan` → `deps` / `used-by`

**시작 권장 순서**:
1. `init` (설정)
2. `analyze` (현황 파악)
3. `index-docs` (문서 연결)
4. `stats --save` (베이스라인)
5. 주기적 `stats --compare` (추적)

**가장 중요한 3개 명령어**:
1. `analyze` - 문제 발견
2. `index-docs` - 문서 연결
3. `stats --compare` - 회귀 방지
