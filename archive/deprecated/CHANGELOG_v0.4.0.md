# Changelog - v0.4.0

**Configuration System 고도화**

릴리스 날짜: 2025-10-30

---

## 🎉 주요 변경사항

### 🔥 Configuration System (NEW!)

tsdoc-edge v0.4.0에서 가장 큰 변화는 **설정 시스템의 도입**입니다. 이제 프로젝트마다 독립적인 설정 파일을 통해 모든 경로와 옵션을 관리할 수 있습니다.

---

## 새로운 기능

### 1. `tsdoc-edge init` 명령어

프로젝트를 초기화하고 설정 파일을 생성합니다.

```bash
# 기본 초기화
tsdoc-edge init

# 옵션 지정
tsdoc-edge init --name=my-project --version=2.0.0

# 강제 덮어쓰기
tsdoc-edge init --force
```

**생성되는 파일:**
- `.tsdoc.config.json` - 설정 파일
- `.tsdoc-comments/` - 주석 저장 디렉토리
- `docs/data/` - JSONL 데이터 디렉토리
- `docs/output/` - 문서 출력 디렉토리

### 2. `.tsdoc.config.json` 설정 파일

모든 프로젝트 설정을 중앙화된 JSON 파일로 관리합니다.

```json
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
    "outputDir": "docs/output"
  },
  "fold": {
    "enabled": true,
    "autoExport": false,
    "excludePatterns": []
  },
  "validation": {
    "strictMode": false,
    "minConnectivityScore": 70,
    "rules": {}
  },
  "generator": {
    "template": "enhanced",
    "includePrivate": false,
    "includeInternal": false
  }
}
```

### 3. ConfigManager 클래스

프로그래밍 방식으로 설정을 관리할 수 있는 싱글톤 클래스입니다.

```typescript
import { ConfigManager } from 'tsdoc-edge';

// 싱글톤 인스턴스 가져오기
const config = ConfigManager.getInstance();

// 설정 읽기
const projectName = config.get().project.name;
const commentsDir = config.get().paths.commentsDir;

// 경로 해석
const absolutePath = config.resolvePath(commentsDir);

// 설정 업데이트
config.update('paths', {
  commentsDir: '.tsdoc-custom'
});

// 설정 검증
const validation = config.validate();

// 디렉토리 생성
config.ensureDirectories();
```

### 4. 자동 설정 통합

기존 클래스들이 자동으로 설정을 사용합니다.

**CommentStateManager:**
```typescript
// 설정에서 자동으로 경로 로드
const manager = new CommentStateManager();

// 커스텀 경로로 오버라이드 가능
const customManager = new CommentStateManager('/custom/path');
```

**DatabaseManager:**
```typescript
// 설정에서 자동으로 경로 로드
const db = new DatabaseManager();

// 커스텀 경로로 오버라이드 가능
const customDb = new DatabaseManager('/custom/db.sqlite', '/custom/jsonl');
```

---

## 변경된 API

### Breaking Changes

**없음** - 모든 기존 API는 하위 호환성을 유지합니다.

기존 코드에서 경로를 명시적으로 전달하던 방식은 여전히 작동하며, 이제 경로를 생략하면 설정 파일에서 자동으로 읽어옵니다.

### New APIs

#### ConfigManager

```typescript
class ConfigManager {
  static getInstance(projectRoot?: string): ConfigManager
  static reset(): void

  init(options?: Partial<TsdocEdgeConfig>, force?: boolean): void
  get(): TsdocEdgeConfig
  save(config: TsdocEdgeConfig): void
  resolvePath(relativePath: string): string
  exists(): boolean
  ensureDirectories(): void
  validate(): { valid: boolean; errors: string[] }
  update<K extends keyof TsdocEdgeConfig>(
    section: K,
    value: Partial<TsdocEdgeConfig[K]>
  ): void
  getConfigPath(): string
  getProjectRoot(): string
}
```

#### Types

```typescript
export interface TsdocEdgeConfig {
  project: ProjectConfig;
  paths: PathsConfig;
  fold?: FoldConfig;
  validation?: ValidationConfig;
  generator?: GeneratorConfig;
}

export interface ProjectConfig {
  name: string;
  version: string;
  rootDir?: string;
  srcDirs?: string[];
}

export interface PathsConfig {
  commentsDir: string;
  databasePath: string;
  jsonlDir: string;
  outputDir?: string;
}

// ... 및 기타 설정 인터페이스
```

---

## 마이그레이션 가이드

### v0.3.x → v0.4.0

**기존 코드는 수정 없이 작동합니다!**

그러나 새로운 설정 시스템을 사용하려면:

#### 1. 프로젝트 초기화

```bash
cd your-project
tsdoc-edge init --name=your-project
```

#### 2. 설정 커스터마이징 (선택사항)

`.tsdoc.config.json`을 수정하여 원하는 경로로 변경:

```json
{
  "paths": {
    "commentsDir": ".my-custom-comments",
    "databasePath": "data/tsdoc.db"
  }
}
```

#### 3. 코드 업데이트 (선택사항)

경로를 하드코딩하지 않고 설정에서 읽도록:

**Before:**
```typescript
const manager = new CommentStateManager('.tsdoc-comments');
const db = new DatabaseManager('.tsdoc.db', './docs/data');
```

**After:**
```typescript
const manager = new CommentStateManager(); // 설정에서 자동 로드
const db = new DatabaseManager(); // 설정에서 자동 로드
```

---

## 새 파일 및 디렉토리

### 추가된 파일

```
src/
├── config/
│   └── ConfigManager.ts          # 설정 관리자 (NEW)
├── types/
│   └── config.ts                  # 설정 타입 정의 (NEW)
└── __tests__/
    └── ConfigManager.test.ts      # ConfigManager 테스트 (NEW)

demo/
└── config-demo.ts                 # 설정 시스템 데모 (NEW)

docs/
└── CONFIG_GUIDE.md                # 설정 가이드 문서 (NEW)
```

### 수정된 파일

```
src/
├── cli.ts                         # init 명령어 추가
├── index.ts                       # ConfigManager export 추가
├── fold/
│   └── CommentStateManager.ts     # 설정 통합
└── storage/
    └── DatabaseManager.ts         # 설정 통합

README.md                          # 설정 시스템 문서 추가
```

---

## 테스트 결과

### 새로운 테스트

- **ConfigManager.test.ts**: 20개 테스트 추가
  - getInstance (2 tests)
  - init (3 tests)
  - get (2 tests)
  - save (1 test)
  - resolvePath (2 tests)
  - exists (2 tests)
  - ensureDirectories (1 test)
  - validate (3 tests)
  - update (2 tests)
  - getConfigPath (1 test)
  - getProjectRoot (1 test)

### 전체 테스트 결과

```
Test Suites: 11 passed, 11 total
Tests:       185 passed, 185 total (20 new)
```

---

## 사용 예제

### 1. 기본 사용

```typescript
import { ConfigManager, CommentStateManager, DatabaseManager } from 'tsdoc-edge';

// 1. 설정 초기화 (CLI 또는 프로그래밍 방식)
const config = ConfigManager.getInstance();
config.init({ project: { name: 'my-project', version: '1.0.0' } });

// 2. 클래스들이 자동으로 설정 사용
const manager = new CommentStateManager();
const db = new DatabaseManager();

// 3. 설정 기반으로 작업
manager.exportAll('./src');
```

### 2. 환경별 설정

**개발 환경:**
```json
{
  "paths": {
    "commentsDir": ".tsdoc-dev",
    "databasePath": "dev.db"
  },
  "validation": {
    "strictMode": false
  }
}
```

**프로덕션 환경:**
```json
{
  "paths": {
    "commentsDir": ".tsdoc",
    "databasePath": "prod.db"
  },
  "validation": {
    "strictMode": true,
    "minConnectivityScore": 95
  }
}
```

### 3. Monorepo 지원

각 패키지마다 독립적인 설정:

```
monorepo/
├── packages/
│   ├── frontend/
│   │   └── .tsdoc.config.json
│   ├── backend/
│   │   └── .tsdoc.config.json
│   └── shared/
│       └── .tsdoc.config.json
```

---

## 문서

### 새로운 문서

- **[CONFIG_GUIDE.md](./CONFIG_GUIDE.md)** - 설정 시스템 완벽 가이드
  - 빠른 시작
  - 모든 설정 옵션 설명
  - 프로그래밍 방식 사용
  - 공통 시나리오
  - 모범 사례
  - 트러블슈팅
  - API 레퍼런스

### 업데이트된 문서

- **README.md** - Configuration System 섹션 추가
- **CLI help** - `tsdoc-edge init` 명령어 추가

---

## 향후 계획

### v0.5.0 (예정)

- **환경 변수 지원**: `TSDOC_CONFIG_PATH` 등
- **설정 상속**: 베이스 설정 + 환경별 오버라이드
- **설정 스키마 검증**: JSON Schema 기반 검증
- **VSCode 확장**: 설정 파일 자동완성 지원

---

## 감사의 글

Configuration System은 다음 사용 사례를 고려하여 설계되었습니다:
- 팀 협업 환경에서 일관된 경로 설정
- CI/CD 파이프라인에서 환경별 설정 분리
- Monorepo 환경에서 패키지별 독립 설정
- 프로젝트 이동 시 설정 이식성

---

**버전**: v0.4.0
**릴리스 날짜**: 2025-10-30
**작성자**: TSDoc Edge Team
