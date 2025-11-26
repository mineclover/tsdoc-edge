# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

TSDoc Edge는 TypeScript 코드베이스의 모든 심볼을 추적하고, 심볼 간 관계를 파악하며, 문서와 코드의 완벽한 일치를 강제하는 **SSOT(Single Source of Truth) 문서 연결성 플랫폼**입니다.

**핵심 목표**: 작업자가 파일을 수정하기 전에 필요한 모든 컨텍스트를 즉시 제공

```bash
tsdoc-edge work-context <file-path>
```

## 필수 개발 명령어

### 빌드 및 개발
```bash
npm run build          # TypeScript 컴파일
npm run dev           # Watch 모드
```

### CLI 실행
```bash
# 로컬 개발
npx ts-node src/cli.ts <command>

# 빌드 후
node dist/cli.js <command>
```

### 주요 CLI 워크플로우
```bash
# 1. 초기화
tsdoc-edge init
tsdoc-edge build src

# 2. 파일 작업 전 컨텍스트 확인 (가장 중요)
tsdoc-edge work-context <file-path>

# 3. 문서 관리
tsdoc-edge index-docs managed
tsdoc-edge update-backlinks
tsdoc-edge validate-docs
```

### work-context 활용 가이드

**파일 수정 전 필수 실행**:
```bash
# 기본 사용 (사람이 읽기 편한 형식)
tsdoc-edge wc src/commands/BuildCommand.ts

# LLM 친화적 형식 (AI 어시스턴트와 협업 시)
tsdoc-edge wc src/commands/BuildCommand.ts --llm

# 설계 의사결정 추적 (contracts, decisions)
tsdoc-edge dc src/services/UserService.ts
```

**제공되는 정보**:
- 📚 관련 문서: 기획서, 명세서 링크
- 🔗 의존 타입: 파일이 사용하는 타입들
- 🧪 테스트: 해당 파일을 테스트하는 파일
- ⚠️ 영향 범위: 수정 시 영향받는 파일들
- 💡 권장사항: 테스트 커버리지, 문서화 상태

**관계 분석** (109개 명령어 중 핵심):
```bash
# 변경 영향 분석
tsdoc-edge relationship-impact <symbol-id>

# 중요 심볼 찾기
tsdoc-edge relationship-metrics --top 10

# 모듈 경계 발견
tsdoc-edge relationship-clusters
```

## 핵심 아키텍처

### 설계 철학: 체크포인트 기반 평탄화

**문제**: 계층 구조는 책임을 분리하지만 전체 흐름 파악이 어려움
**해결**: 문서 심볼 `[[Symbol]]`로 체크포인트를 정의하고 직접 라우팅

```
계층 구조 (코드):
  App → Controller → Service → Repository

체크포인트 (문서):
  [[Feature A]] → [[Service B]] → [[Repository C]]
  (계층 탐색 없이 직접 이동, Backlinks로 역추적)
```

### 모듈 명세 프레임워크

모든 모듈은 7가지 관점으로 정의:
1. **Purpose**: 존재 이유
2. **Input**: 매개변수, 제약
3. **Output**: 반환값, 결과
4. **Context**: 의존성
5. **Logic**: 알고리즘
6. **Effect**: 부수 효과
7. **Scope**: 공개 인터페이스

### 주요 시스템

1. **심볼 그래프** (`src/graph/`): 코드 심볼과 관계를 그래프로 관리
2. **파싱** (`src/parser/`): TSDoc 주석 파싱 및 커스텀 태그 추출
3. **검증** (`src/validator/`): 문서 품질 및 연결성 검증
4. **저장** (`src/storage/`): SQLite (빠름) + JSONL (버전 관리)
5. **문서 심볼** (`src/doc-symbol/`): `[[Symbol]]` 기반 양방향 연결
6. **명세서 관리** (`src/spec/`): 문서 완성도 및 생명주기 관리
7. **분석** (`src/analyzer/`): 코드 건강도 및 품질 분석

설정: `.tsdoc.config.json`으로 모든 동작 제어

## 개발 시 주의사항

### 코드 작성
- 모든 public API는 TSDoc 주석 필수 (`@public`, `@param`, `@returns`)
- 심볼 ID는 kebab-case (`user-service`)
- 파일 I/O는 동기 함수 사용 (CLI 도구 특성)

### 테스트
- 위치: `src/__tests__/`
- 네이밍: `<ModuleName>.test.ts`
- 커버리지: 핵심 로직 100% 목표

### 문서 작성
- 관리 대상 문서: `managed/` 디렉토리
- H1에 `# [[FeatureName]]` 체크포인트 정의
- 각 문서는 독립적으로 이해 가능해야 함
- 관련 개념은 `[[Symbol]]` 참조로 연결

### 체크포인트 선정 기준
1. 기능적 응집성: 하나의 명확한 기능
2. 의미적 경계: 명확한 책임 분리
3. 독립 이해 가능: 다른 문서 없이도 이해 가능
4. 라우팅 허브: 자연스러운 연결점

## 프로젝트 구조

```
src/
├── analyzer/      # 분석 (품질, 커버리지)
├── cli.ts        # CLI 엔트리포인트
├── commands/     # CLI 명령어
├── doc-symbol/   # [[Symbol]] 시스템
├── graph/        # 심볼 그래프
├── parser/       # TSDoc 파싱
├── storage/      # DB + JSONL
├── validator/    # 검증
└── types/        # 타입 정의
```

## 추가 참고

- `README.md`: 프로젝트 개요 및 전체 기능
- `managed/workflows/work-context-workflow.md`: work-context 명령어 상세
- `managed/features/`: 기능별 명세서
