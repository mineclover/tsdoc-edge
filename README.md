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

### ✅ 현재 구현 완료 (v0.1.0)

- **심볼 그래프 빌더**: 코드베이스의 모든 심볼과 관계를 그래프로 구축
- **심볼 검색 엔진**: 다양한 조건으로 심볼을 검색하고 필터링
- **연결성 검증**: SSOT 준수 여부를 점수화하고 문제점 탐지
- **순환 의존성 감지**: 심볼 간 순환 의존성 자동 탐지
- **깨진 링크 검출**: 존재하지 않는 심볼에 대한 참조 탐지
- **커스텀 TSDoc 태그**: 계약, 책임, 테스트 등을 위한 확장 태그
- **53개 테스트 통과**: 모든 핵심 기능 검증 완료

### ✅ Strict Mode (v0.2.0)

- **6-Category Documentation**: Problem, Functionality, Errors, Decisions, Dependencies, Plans
- **SQLite + JSONL**: 빠른 검색과 Git 버전 관리의 조화
- **Enhanced Markdown**: 완전한 문서 자동 생성
- **Strict Validation**: 100점 만점 준수도 검증
- **64개 테스트 통과**: 모든 기능 검증 완료

### ✅ Fold/Unfold System (v0.3.0)

- **주석 접기/펼치기**: 긴 주석을 프로그래밍적으로 관리
- **마크다운 저장소**: 주석 상태를 Git으로 버전 관리
- **패턴 매칭**: 정규식으로 선택적 접기/펼치기
- **팀 협업**: 동일한 접기 상태 공유 가능
- **양방향 변환**: TypeScript ↔ Markdown

### ✅ Configuration System (v0.4.0) - NEW! 🔥

- **init 명령어**: `tsdoc-edge init`로 프로젝트 초기화
- **설정 파일**: `.tsdoc.config.json`으로 중앙화된 설정 관리
- **경로 커스터마이징**: 주석, DB, JSONL 저장 위치 자유 설정
- **검증 규칙**: 프로젝트별 validation 규칙 정의
- **환경별 설정**: dev/prod 환경에 맞는 설정 분리

### 🚧 다음 단계

- TypeScript AST 자동 파싱 (TSDoc → EnhancedDoc 자동 변환)
- 테스트 커버리지 통합
- 의존성 그래프 시각화
- CI/CD 통합 (자동 검증)
- VSCode 확장 (실시간 Strict Mode 검증)

## 설치

```bash
npm install tsdoc-edge
```

## 빠른 시작

### 1. 프로젝트 초기화 (v0.4.0 🔥)

```bash
# 설정 파일 생성
tsdoc-edge init --name=my-project

# .tsdoc.config.json 생성됨
# 모든 필요한 디렉토리 자동 생성
```

생성된 `.tsdoc.config.json`:
```json
{
  "project": { "name": "my-project", "version": "1.0.0" },
  "paths": {
    "commentsDir": ".tsdoc-comments",
    "databasePath": ".tsdoc.db",
    "jsonlDir": "docs/data",
    "outputDir": "docs/output"
  },
  "fold": { "enabled": true },
  "validation": { "strictMode": false, "minConnectivityScore": 70 }
}
```

### 2. 기본 사용법

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

## 상세 가이드

- **기본 사용법**: [USAGE_GUIDE.md](./USAGE_GUIDE.md)
- **Strict Mode**: [STRICT_MODE_GUIDE.md](./STRICT_MODE_GUIDE.md)
- **Configuration System**: [docs/CONFIG_GUIDE.md](./docs/CONFIG_GUIDE.md) 🔥 NEW!
  - 설정 파일 완벽 가이드
  - 경로 커스터마이징
  - 프로그래밍 방식 설정
  - CI/CD 통합
- **Fold/Unfold System**: [docs/FOLD_UNFOLD_GUIDE.md](./docs/FOLD_UNFOLD_GUIDE.md)
  - 주석 접기/펼치기 완벽 가이드
  - 팀 협업 워크플로우
  - 실전 예제 코드
- **TSDoc 컨벤션**: [docs/tsdoc-conventions/](./docs/tsdoc-conventions/)
  - 7가지 필수/권장 규칙
  - 각 규칙마다 명확한 예시와 이유 제공
- **TSDoc 스펙 지원**: [docs/TSDOC_SPEC_SUPPORT.md](./docs/TSDOC_SPEC_SUPPORT.md) 🔥 NEW!
  - 지원하는 전체 TSDoc 태그 (35개)
  - 파싱 테스트 코드 및 결과
  - 커스텀 태그 추가 방법
- **POC 결과**: [POC_RESULTS.md](./POC_RESULTS.md)
- **예제 코드**:
  - 기본: [examples/sample-code.ts](./examples/sample-code.ts)
  - Strict Mode: [examples/strict-mode-example.ts](./examples/strict-mode-example.ts)
  - TSDoc Spec Test: [demo/tsdoc-spec-test.ts](./demo/tsdoc-spec-test.ts) 🔥 NEW!

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
│   ├── types/              # TypeScript 타입 정의
│   │   ├── index.ts
│   │   ├── graph.ts        # 그래프 관련 타입
│   │   └── tags.ts         # 커스텀 태그 타입
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
✅ Test Suites: 5 passed, 5 total
✅ Tests: 53 passed, 53 total
✅ Build: Success
✅ TypeScript: No errors

Coverage:
- SymbolGraphBuilder: 14 tests
- SymbolSearchEngine: 13 tests
- ConnectivityValidator: 11 tests
- Integration: 3 tests
- TSDocParser: 4 tests
```

## 라이선스

MIT

## 기여

이슈나 PR은 언제든 환영합니다!
