# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## 프로젝트 현황 (2026-11-02)

| Metric | Value |
|--------|-------|
| CLI Commands | 20 top-level (10 Core + 7 Unified Groups + 3 Revision/Coverage) |
| Test Cases | 2,939 (225 suites) |
| Symbols | 8,601 (Enrichment DB, local function-body variables excluded) |
| Canonical `@ttsc/graph` | 8,349 internal (8,613 total) nodes / 16,870 internal (20,995 total) edges |
| Normative `SpecGraph` | 8 `project-spec` docs · 63 nodes · 55 bindings (`55/55` satisfied) |
| Managed Docs & Links | 299/299 `With [[Symbol]]` (`100%`) · 1,995 links (`0` broken) · `0` unused docs |
| Code ↔ Doc `@doc` Coverage | 297/297 `src/` files + 6/6 `mcp-server/src/` files (`100%` file coverage · `80.0%` effective symbol coverage) |
| Custom TSDoc Tags | 22 + Standard 29 + `@ttsc/graph` 6 |
| `@ttsc/lint` | 25 error rules (0 findings) |
| Health Score | 90/100 (A) system-status · 89/100 (A) spec metrics · 93/100 (A+) core modules |

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
# 1. 단일 명령 전체 정본 동기화 (심볼 DB + @ttsc/graph + 체크포인트 + SpecGraph + Backlinks)
tsdoc-edge sync
tsdoc-edge sync --check          # CI / 읽기 전용 정합성 검증
tsdoc-edge sync --dry-run        # 파일 변조 없이 갱신 대상 미리보기
tsdoc-edge sync --force --json   # 전체 재생성 및 기계 판독 결과

# 2. 파일 작업 전 컨텍스트 확인 (가장 중요)
tsdoc-edge wc <file-path> --llm  # 모듈 개요 + 전체 export API + 의존/피의존/테스트
tsdoc-edge dc <file-path>        # 규범 명세 바인딩 + 계약(@contract) + ADR(@decision)
tsdoc-edge symbol query <name>   # 코드 심볼(@ttsc/graph) + [[Symbol]] 체크포인트 통합 조회
tsdoc-edge symbol trace <target> # 3계층 데이터 추적 (Type/Field 흐름 + 경계 간 계보 + AST 슬라이싱)
tsdoc-edge symbol find-method <name> # 메서드 이름으로 심볼 검색
tsdoc-edge convention check --pack managed/conventions/tsdoc-edge-core.json

# 3. 개별 문서 관리 (필요 시)
tsdoc-edge docs index managed
tsdoc-edge docs backlinks managed --dry-run
tsdoc-edge validate docs managed
tsdoc-edge spec extract
```

TSDoc Edge는 세 계층 SSOT를 함께 동기화합니다. `@microsoft/tsdoc`이 표준 문서 AST(29개
표준 태그)를 제공하고, `ttsc`/`@ttsc/graph`/`@ttsc/lint`가 정본 코드 그래프와 25개 오류
규칙을 관리하며, `tsdoc-edge`가 22개 도메인 태그와 문서·명세 연결을 소유합니다.
`tsdoc-edge sync [--force] [--dry-run] [--check] [--json]`은 이 계층을 한 단계로 갱신하거나
검증합니다. `symbol`, `spec`, `convention`은 각각 심볼 조회·검색, SpecGraph 생명주기,
정확한 그래프 revision에 대한 규약 검사를 제공합니다.

## 차세대 Go 네이티브 통합 엔진 (`ttsc-doc` / TypeScript 7 `ttsc@0.34.3`)

`/Users/junwoobang/workflow/ttsc-doc`은 `tsdoc-edge`의 297개 TypeScript 파일과
`ttsc-graph-router`의 65개 파일, 그리고 `.tsdoc.db`, `canonical-graph.db`,
`spec-graph.db`, `.ttsc-graph-router-cache`로 나뉜 4개 SQLite/JSON 저장소를 하나의
19개 파일 Go 네이티브 무의존성 바이너리로 통합하는 동반/후속 엔진입니다. TypeScript 7
`ttsc@0.34.3`과 함께 실행하며, 상주 `ttscgraph serve` NDJSON 파이프를 통해 증분 및 캐시
질의를 `<1ms`에 처리합니다. 기존 `tsdoc-edge` 명령과 문서·SpecGraph SSOT는 그대로
유지되므로 두 엔진은 동일한 프로젝트에서 병행 검증할 수 있습니다.

### 명령어 대응표

| `tsdoc-edge` / `ttsc-graph-router` | `ttsc-doc` 통합 명령 |
|---|---|
| `tsdoc-edge sync [--check\|--dry-run\|--json]` | `ttsc-doc sync [--check\|--dry-run\|--json]` |
| `tsdoc-edge wc <file>` / 심볼·체크포인트 조회 | `ttsc-doc wc <file\|symbol\|[[Checkpoint]]>` |
| `tsdoc-edge dc <file>` / 심볼·체크포인트 설계 조회 | `ttsc-doc dc <file\|symbol\|[[Checkpoint]]>` |
| `symbol trace` / `relationship trace <from> [to]` | `ttsc-doc trace <from> [to]` |
| `relationship` 및 `ttsc-graph-router` graph routes | `ttsc-doc route repo-map\|related\|dependencies\|scope\|impact\|graph-lint` |
| `mcp-server`의 tsdoc/graph 도구 | `ttsc-doc mcp` |

`ttsc-doc mcp`는 다음 10개 통합 STDIO MCP 도구를 제공합니다.

`inspect_typescript_graph`, `graph_repo_map`, `graph_related_nodes`,
`graph_file_dependencies`, `graph_scope_tree`, `graph_changed_impact`,
`tsdoc_work_context`, `tsdoc_design_context`, `tsdoc_trace_data`,
`tsdoc_sync_check`.

### 양 엔진 호환 문서·SpecGraph 작성 규칙

새 문서와 주석은 다음 형태를 지켜야 `tsdoc-edge`와 `ttsc-doc`에서 100% 같은 체크포인트,
백링크, 명세 바인딩을 생성합니다.

- 관리 문서의 H1은 반드시 `# [[Checkpoint]]` 형식으로 작성합니다.
- 모듈 파일의 패키지 문서에는 `@packageDocumentation`을 사용합니다.
- 공개 심볼의 JSDoc은 선언 바로 앞에서 줄을 시작하는 `/**` 주석으로 쓰고,
  `@doc [[Checkpoint]]`를 포함합니다.
- SpecGraph 문서는 front matter 또는 메타데이터에 `type: project-spec`를 선언합니다.
  `spec:<Checkpoint> -> REQ-*` 요구사항 엣지와 `BIND-*` 바인딩의
  `canonicalNodeId` 대상을 정확히 기록합니다.

이 규칙을 바꾸거나 예외를 추가할 때는 두 엔진에서 `sync --check --json`을 실행해
백링크, 끊어진 링크, `SpecGraph` 바인딩 결과를 함께 확인합니다.

### work-context & design-context 활용 가이드

**파일 수정 전 필수 실행**:
```bash
# 사람이 읽기 편한 터미널 형식
tsdoc-edge wc src/commands/BuildCommand.ts --human

# LLM 친화적 형식 (모듈 개요 + 전체 공개 심볼 시그니처 + 테스트·영향 분석)
tsdoc-edge wc src/commands/BuildCommand.ts --llm

# 설계 의사결정 및 계약 집중 뷰 (규범 명세, @contract, ADR, 오류 패턴, JSON 지원)
tsdoc-edge dc src/commands/BuildCommand.ts
tsdoc-edge dc src/commands/BuildCommand.ts --json
```

**제공되는 정보**:
- 📚 관련 문서: 기획서, 명세서 링크
- 🔗 의존 타입: 파일이 사용하는 타입들
- 🧪 테스트: 해당 파일을 테스트하는 파일
- ⚠️ 영향 범위: 수정 시 영향받는 파일들
- 💡 권장사항: 테스트 커버리지, 문서화 상태

**관계 분석** (`relationship` 그룹 핵심 하위 명령):
```bash
# 변경 영향 분석
tsdoc-edge relationship impact <symbol-id>

# 3계층 데이터 흐름·계보·슬라이싱 추적 (Type.field / 경계 간 계보 / AST 변수·파라미터 슬라이스)
tsdoc-edge relationship trace <target> [to-target]

# 중요 심볼 찾기
tsdoc-edge relationship metrics --top 10

# 모듈 경계 발견
tsdoc-edge relationship clusters
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
8. **LSP 서버** (`src/lsp/`): IDE 통합 실시간 분석

설정: `.tsdoc.config.json`으로 모든 동작 제어

### LSP 통합

IDE에서 실시간 분석 결과 활용:

```bash
# LSP 서버 실행
node dist/lsp/server.js
```

**지원 기능**:
- Hover: 심볼 정보 + 영향 분석
- Code Lens: `↓downstream ↑upstream` 인라인 표시
- Code Action: 영향 분석, 관련 심볼 탐색
- Document Link: `[[Symbol]]` 클릭 시 정의로 이동
- Definition: 심볼 정의로 이동
- Diagnostics: 순환 의존성, 레이어 위반 경고

상세: `managed/features/lsp-integration.md`

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

## 패키지 및 프로젝트 구조

### 1. 워크스페이스 패키지 구성

| 패키지 / 경로 | 주제 및 핵심 책임 | 주요 엔트리포인트 |
|---|---|---|
| **`tsdoc-edge` (Root)** | 3계층 SSOT 동기화, 정본 `@ttsc/graph`·`SpecGraph` 거버넌스 커널, 3계층 데이터 추적(`DataTraceService`), CLI(`20`개 최상위 명령), LSP 서버 | `src/cli.ts`, `src/index.ts`, `src/lsp/server.ts` |
| **`tsdoc-edge-mcp-server` (`mcp-server/`)** | `.tsdoc.db`, `.tsdoc/canonical-graph.db`, `.tsdoc/spec-graph.db`를 읽기 전용으로 노출하는 10-도구 Model Context Protocol 서버 | `mcp-server/src/index.ts`, `mcp-server/src/tools/index.ts` |
| **`tools/ttsc-tsdoc` (`tools/ttsc-tsdoc/`)** | `ttsc` 컴파일 타임에 TSDoc 문법 및 도메인 태그 규칙을 검사하는 네이티브 Go `@ttsc/lint` 플러그인 | `tools/ttsc-tsdoc/plugin.go` |

### 2. `src/` 서브시스템 주제별 구조 (`26`개 디렉토리 · `297`개 파일)

```
src/
├── cli.ts              # 부수효과 없는 CLI 부트스트랩 및 최상위 명령 디스패처
├── index.ts            # 프로그래밍 방식 SDK 파사드 (TSDocEdge, 파서, 그래프, 컨텍스트 생성기)
│
├── [1. TSDoc AST 파싱 및 타입 계약 계층]
│   ├── parser/         # 통합 Microsoft TSDoc AST 리더 (TsdocCommentReader, TSDocParser, ModuleSpecTagParser, EnhancedDocExtractor)
│   └── types/          # 도메인 타입 계약 (tags/ 22개 커스텀 태그 및 canonical-tag-bridge, graph/, domain/, spec/, analysis/)
│
├── [2. 정본 코드 그래프(@ttsc/graph) 및 인덱싱 계층]
│   ├── provider/       # SemanticGraphProvider SPI, TtscSemanticGraphProvider, Snapshot/Delta 정규화기
│   ├── indexer/        # ProjectIndexer, TtscGraphRouterArtifactAdapter, CanonicalGraphCoordinator, 충돌 안전 별칭 매핑
│   ├── graph/          # Enrichment 심볼 그래프 빌더 (SymbolGraphBuilder, SymbolSearchEngine, DepthTraverser)
│   ├── graph-analysis/ # 정본 @ttsc/graph 질의(CanonicalGraphIndex, GraphAnalysisService) 및 3계층 데이터 추적(DataTraceService)
│   └── query/          # 다중 홉 관계 탐색 쿼리 엔진 (RelationshipQueryEngine)
│
├── [3. 규범 명세(SpecGraph) 및 컨벤션 거버넌스 계층]
│   ├── spec-graph/     # 실행 가능한 SpecGraph(`tsdoc-spec`) 추출기(ManagedSpecExtractor), ExactBindingResolver, ConformanceEngine
│   ├── semantic-graph/ # 교차 평면 EffectiveAnalysisService 및 불변 AnalysisInputRevision 고정
│   ├── convention/     # 규약 팩 컴파일러(ConventionPackCompiler), ConventionCheckService, Naming/TSDoc/graph-lint 평가기
│   └── spec/           # 명세 완성도(SpecCompletenessValidator), 메트릭(SpecMetricsAggregator), 미사용 문서 탐지(UnusedDocumentDetector)
│
├── [4. 문서 체크포인트([[Symbol]]) 및 연결성 검증 계층]
│   ├── doc-symbol/     # [[Symbol]] 체크포인트 레지스트리(DocumentSymbolRegistry), BacklinkGenerator, SymbolReferenceResolver
│   ├── linking/        # 코드 ↔ 문서 양방향 링커(DocCodeLinker) 및 LinkValidator
│   ├── validator/      # ConnectivityValidator, ConventionValidator, StrictModeValidator, GeneratedDocsValidator
│   └── fixer/          # TSDoc 태그 및 체크포인트 자동 보정기 (DocumentationFixer)
│
├── [5. 동적 컨텍스트 생성·분석·출력 계층]
│   ├── generator/      # 동적 LLM/XML 작업 컨텍스트 생성기 (LLMsTextGenerator, XMLContextGenerator)
│   ├── analyzer/       # 52개 도메인·AST·테스트·타입·인터페이스·건강도 분석기 (EnhancedWorkContextAnalyzer, TypeChainTracer 등)
│   ├── metrics/        # 정본 노드 커버리지 프로젝션(CanonicalCoverageProjection), 베이스라인 및 게이트 평가
│   ├── analytics/      # CLI 명령 및 심볼 활용 통계 추적기 (UsageTracker)
│   └── output/         # JSON / XML / Human 구조화 출력 빌더 및 스키마 검증기
│
└── [6. 영속 저장소·LSP·CLI 명령 계층]
    ├── storage/        # 5대 불변 리비전 SQLite 저장소(GraphRepository, SpecGraphRepository 등) + DatabaseManager(.tsdoc.db)
    ├── lsp/            # 실시간 LSP 서버(TsdocEdgeService, IncrementalBuilder) 및 6번째 평면 미저장 오버레이(OverlayGraphView)
    ├── commands/       # 20개 정본 CLI 최상위 명령 및 7개 통합 그룹 라우터 (wc, dc, sync, symbol, relationship, docs, spec 등)
    ├── config/         # .tsdoc.config.json 생명주기 관리 (ConfigManager)
    ├── utilities/      # 심볼·파일 참조 리팩토링 갱신기 (SymbolReferenceUpdater, FileReferenceUpdater)
    └── utils/          # 결정론적 kebab-case IdGenerator 및 ConfigLoader
```

## 추가 참고

- `README.md`: 프로젝트 개요 및 전체 기능
- `managed/specs/index.md`: 전 서브시스템 규범 명세(`SpecGraph`, 55개 코드 바인딩)
- `managed/features/data-lineage-and-trace.md`: 3계층 데이터 흐름·계보·슬라이싱 추적 명세
- `managed/workflows/work-context-workflow.md`: work-context 명령어 상세
- `managed/features/`: 기능별 명세서 (`lsp-integration.md`, `mcp-integration.md` 등)
