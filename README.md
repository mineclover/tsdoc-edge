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

### ✅ CLI 도구 (v0.6.0) - NEW! 🔥

**29개 명령어로 완전한 문서 관리**

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

#### 품질 검증 (3개)
- `validate` - TSDoc 유효성 검증
- `analyze` - 전체 문서 품질 분석
- `health` - 프로젝트 건강도 점수

#### 문서 개선 (3개)
- `suggest` - 개선 제안
- `fix` - 자동 수정
- `improve` - AI 기반 재귀적 개선

#### 통계 및 분석 (6개)
- `stats` (--save, --compare) - 통계 추적
- `core-api` - 핵심 API 표면 분석
- `scan` - 심볼 그래프 깊이 탐색

#### 문서 심볼 시스템 (4개)
- `index-docs` - [[]] 심볼 인덱싱
- `validate-docs` - SSOT 검증
- `update-backlinks` - 백링크 자동 생성
- `find-doc` - 문서 심볼 검색

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

### ✅ Document Symbol System (v0.5.0)

- **[[문서 심볼]]** 정의 및 참조 (Wiki 스타일)
- H1 레벨에서 심볼 정의: `# [[Authentication System]]`
- 코드-문서 양방향 연결: `@doc [[Symbol]]` 태그
- Backlink 자동 생성 및 갱신
- SSOT 검증 (중복 정의 방지)
- 문서 기반 드리븐 개발 지원

### ✅ Core Engine (v0.1.0 - v0.3.0)

- **심볼 그래프 빌더**: 코드베이스의 모든 심볼과 관계를 그래프로 구축
- **심볼 검색 엔진**: 다양한 조건으로 심볼을 검색하고 필터링
- **연결성 검증**: SSOT 준수 여부를 점수화하고 문제점 탐지
- **Strict Mode**: 6-카테고리 문서화 시스템
- **SQLite + JSONL**: 빠른 검색과 Git 버전 관리의 조화
- **Fold/Unfold System**: 주석 접기/펼치기로 코드 가독성 향상
- **64개 테스트 통과**: 모든 핵심 기능 검증 완료

### 🚧 다음 단계

- TypeScript AST 자동 파싱 (TSDoc → EnhancedDoc 자동 변환)
- 테스트 커버리지 통합
- 의존성 그래프 시각화
- VSCode 확장 (실시간 Strict Mode 검증)
- AI 기반 문서 생성 고도화

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

### 3. 주요 CLI 명령어 (29개)

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
```

**전체 명령어 가이드**: [docs/CLI_WORKFLOWS_AND_SCENARIOS.md](./docs/CLI_WORKFLOWS_AND_SCENARIOS.md) 🔥

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

**더 많은 CI/CD 템플릿** (GitLab CI, Jenkins, CircleCI): [docs/CLI_WORKFLOWS_AND_SCENARIOS.md#cicd-통합-템플릿](./docs/CLI_WORKFLOWS_AND_SCENARIOS.md#🚀-cicd-통합-템플릿)

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
const db = new DatabaseManager('.tsdoc.db', './docs/data');
db.insertSymbol(symbol, 0);
db.insertEnhancedDoc(doc, 0);

// Git 버전 관리를 위한 JSONL Export
const exportPath = db.exportToJSONL();
console.log(`📦 Exported: ${exportPath}`);
```

## 📚 상세 가이드

### CLI 가이드 (권장)

- **🚀 CLI 워크플로우 & 시나리오**: [docs/CLI_WORKFLOWS_AND_SCENARIOS.md](./docs/CLI_WORKFLOWS_AND_SCENARIOS.md) 🔥 **필독!**
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

- **⚙️ Configuration System**: [docs/CONFIG_GUIDE.md](./docs/CONFIG_GUIDE.md)
  - `.tsdoc.config.json` 완벽 가이드
  - 경로 커스터마이징
  - 환경별 설정 분리
  - 프로그래밍 방식 사용

- **🔧 CLI 고급 기능**: [docs/CLI_ADVANCED_FEATURES.md](./docs/CLI_ADVANCED_FEATURES.md)
  - 필터링 옵션
  - 출력 포맷
  - 고급 검색

### 프로그래밍 API 가이드

- **기본 사용법**: [USAGE_GUIDE.md](./USAGE_GUIDE.md)
- **Strict Mode**: [STRICT_MODE_GUIDE.md](./STRICT_MODE_GUIDE.md)

### 핵심 기능 가이드

- **📖 [[문서 심볼]] 시스템**: [docs/DOCUMENT_SYMBOL_DESIGN.md](./docs/DOCUMENT_SYMBOL_DESIGN.md)
  - Wiki 스타일 문서 심볼 정의
  - 코드-문서 양방향 연결
  - Backlink 자동 생성
  - SSOT 검증 및 문서 기반 드리븐

- **🔍 의존성 분석**: [docs/DEPENDENCY_ANALYSIS_GUIDE.md](./docs/DEPENDENCY_ANALYSIS_GUIDE.md)
  - 버그 수정 전 영향 범위 파악
  - 리팩토링 계획 수립
  - PR 리뷰용 문서 생성
  - 실전 시나리오 통합

- **📂 Fold/Unfold System**: [docs/FOLD_UNFOLD_GUIDE.md](./docs/FOLD_UNFOLD_GUIDE.md)
  - 주석 접기/펼치기 완벽 가이드
  - 팀 협업 워크플로우
  - 실전 예제 코드

- **🔄 자동 인덱싱**: [docs/AUTO_INDEXING_GUIDE.md](./docs/AUTO_INDEXING_GUIDE.md)
  - 파일 저장 시 자동 인덱스 업데이트
  - Git Hook, VSCode Task, GitHub Actions
  - 증분 업데이트로 빠른 성능

### 레퍼런스

- **TSDoc 컨벤션**: [docs/tsdoc-conventions/](./docs/tsdoc-conventions/)
  - 7가지 필수/권장 규칙
  - 각 규칙마다 명확한 예시와 이유 제공

- **TSDoc 스펙 지원**: [docs/TSDOC_SPEC_SUPPORT.md](./docs/TSDOC_SPEC_SUPPORT.md)
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
