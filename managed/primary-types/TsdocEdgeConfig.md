# [[TsdocEdgeConfig]]

**Primary Type**: Project Configuration Root

## 1. Purpose (목적)

프로젝트 전체의 동작을 제어하는 중앙 설정 타입입니다. 모든 TSDoc Edge 기능의 설정을 하나의 구조로 통합하여 일관성 있는 구성 관리를 제공합니다.

### Problem (해결하는 문제)
- 여러 설정 파일 분산으로 인한 관리 복잡도
- 설정 간 불일치 가능성
- 타입 안전성 부재

### Solution (해결 방법)
- 단일 설정 파일 (`.tsdoc.config.json`)
- TypeScript 타입으로 스키마 정의
- 8개 도메인별 설정 그룹화

## 2. Structure (구조)

### Type Definition

```typescript
interface TsdocEdgeConfig {
  project: ProjectConfig;           // 프로젝트 메타데이터
  paths: PathsConfig;                // 파일 경로 설정
  fold: FoldConfig;                  // 주석 접기 설정
  validation: ValidationConfig;      // 검증 규칙
  generator: GeneratorConfig;        // 문서 생성 설정
  preCommit: PreCommitConfig;        // Git hook 설정
  linkCheck: LinkCheckConfig;        // 링크 검증 설정
  documentManagement: DocumentManagementConfig; // 문서 관리 설정
}
```

### Composed Types

이 타입은 8개의 하위 설정 타입을 명시적으로 조합합니다:

1. **ProjectConfig** - 프로젝트 이름, 버전, 소스 디렉토리
2. **PathsConfig** - 데이터베이스, JSONL, 문서 경로
3. **FoldConfig** - 주석 접기/펼치기 동작 설정
4. **ValidationConfig** - Strict mode, 연결성 점수 임계값
5. **GeneratorConfig** - 마크다운 생성 옵션
6. **PreCommitConfig** - Git hook 임계값 및 경고 설정
7. **LinkCheckConfig** - 외부 모듈, 제안 기능 설정
8. **DocumentManagementConfig** - 관리 대상 문서 디렉토리

## 3. Usage Scenarios (사용 시나리오)

### 1. 프로젝트 초기화
```bash
tsdoc-edge init
# .tsdoc.config.json 파일 생성 (TsdocEdgeConfig 스키마)
```

### 2. 설정 로드
```typescript
const config = ConfigManager.getInstance().getConfig();
// TsdocEdgeConfig 전체 로드
```

### 3. 부분 설정 접근
```typescript
const strictMode = config.validation.strictMode;
const dbPath = config.paths.databasePath;
```

## 4. Design Decisions (설계 결정)

### Decision 1: 8-part Composition

**Rationale:**
- 각 설정 영역의 명확한 분리 (Separation of Concerns)
- 독립적 확장 가능성
- 타입 안전성 보장

**Alternatives Considered:**
- Flat structure: 확장성 부족, 설정 증가 시 관리 어려움
- 파일 분산: 일관성 유지 어려움, 버전 관리 복잡

**Consequences:**
- ✅ 구조적 명확성
- ✅ IDE 자동완성 지원
- ⚠️ 중첩 깊이 증가 (최대 2단계)

### Decision 2: JSON Configuration File

**Rationale:**
- 표준 형식, 도구 지원 우수
- TypeScript 타입으로 스키마 검증 가능
- Git diff 친화적

**Alternatives Considered:**
- YAML: 가독성 우수하지만 JSON이 더 보편적
- JavaScript: 동적 설정 가능하지만 보안 이슈

## 5. Related Concepts (관련 개념)

- [[ConfigManager]] - 싱글톤 설정 관리자
- [[InitCommand]] - `tsdoc-edge init` 프로젝트 초기화
- [[ValidateCommand]] - 검증 규칙 적용

## 6. Commands Using This Type

**[[InitCommand]]** (`src/commands/Phase4Commands.ts:153`)
- `.tsdoc.config.json` 생성
- 기본 `TsdocEdgeConfig` 값 초기화

**[[ValidateCommand]]** (`src/commands/ValidateCommand.ts:67`)
- `validation` 설정 기반 검증 수행
- `strictMode`, `connectivityThreshold` 사용

**[[BuildCommand]]** (`src/commands/BuildCommand.ts:40`)
- `paths.sourceDir` 기반 소스 추출
- `paths.databasePath` DB 저장

## 7. Code References (코드 참조)

**Type Definition**: `src/types/TsdocEdgeConfig.ts`
**Config Manager**: `src/config/ConfigManager.ts`

[^TsdocEdgeConfig]
[^ConfigManager]
[^ProjectConfig]
[^ValidationConfig]

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:224
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:462
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:151
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:152
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:153
- [[InitCommand]] → /home/user/tsdoc-edge/managed/commands/InitCommand.md:182
- [[InitCommand]] → /home/user/tsdoc-edge/managed/commands/InitCommand.md:183
- [[InitCommand]] → /home/user/tsdoc-edge/managed/commands/InitCommand.md:184
- [[InitCommand]] → /home/user/tsdoc-edge/managed/commands/InitCommand.md:185
- [[InitCommand]] → /home/user/tsdoc-edge/managed/commands/InitCommand.md:186
- [[InitCommand]] → /home/user/tsdoc-edge/managed/commands/InitCommand.md:187
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:60
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:61
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:62
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:63
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:64
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:65
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:23
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:56
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:57
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:58
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:59
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:60
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:100
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:191
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:192
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:379
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:495
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:496
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:158
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:249
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:250
- [[ConfigLoader]] → /home/user/tsdoc-edge/managed/utilities/ConfigLoader.md:91
- [[ConfigLoader]] → /home/user/tsdoc-edge/managed/utilities/ConfigLoader.md:107
- [[ConfigLoader]] → /home/user/tsdoc-edge/managed/utilities/ConfigLoader.md:108

### Implemented By

- TsdocEdgeConfig → /home/user/tsdoc-edge/src/types/config/config.ts:16

