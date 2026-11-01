---
title: CLI Command Surface Specification
type: project-spec
category: specifications
status: active
canonical: true
source: src/commands/registerCliCommands.ts
tags:
  - tsdoc-edge
  - cli-surface
  - ssot-sync
  - unified-commands
---

# [[CliCommandSurfaceSpecification]]

`tsdoc-edge`의 **정본 20개 최상위 CLI 명령어 표면(10 Core + 7 Unified Groups + 3 Revision/Coverage), 부수효과 없는 부팅 등록(`registerCliCommands`), 단일 3계층 SSOT 동기화(`sync`), 그리고 Fail-Closed 심볼 통합 조회(`symbol query`)** 의 규범 명세를 정의합니다.

```tsdoc-spec
{
  "requirements": [
    {
      "id": "REQ-CLI-CANONICAL-REGISTRATION-BOUNDARY",
      "title": "registerCliCommands must register strictly the canonical 20 top-level commands with zero filesystem or SQLite boot side effects",
      "tags": ["cli", "registration", "zero-side-effect"]
    },
    {
      "id": "REQ-CLI-UNIFIED-SSOT-SYNC",
      "title": "SyncCommand must orchestrate 3-plane SSOT synchronization and read-only CI drift verification",
      "tags": ["cli", "sync", "ssot"]
    },
    {
      "id": "REQ-CLI-SYSTEM-STATUS-DASHBOARD",
      "title": "SystemStatusCommand must report read-only 3-plane telemetry across symbol DB, canonical graph, and managed specs",
      "tags": ["cli", "observability"]
    },
    {
      "id": "REQ-CLI-STATS-REPORTING",
      "title": "StatsCommand must aggregate documentation, canonical graph, and snapshot baseline comparison statistics",
      "tags": ["cli", "stats"]
    },
    {
      "id": "REQ-CLI-HEALTH-SCORING",
      "title": "HealthCommand must evaluate codebase documentation, test, and connectivity health grades",
      "tags": ["cli", "health"]
    },
    {
      "id": "REQ-CLI-UNIFIED-VALIDATE-GROUP",
      "title": "ValidateUnifiedCommand must dispatch code, docs, tsdoc, spec, and generated validation gates uniformly",
      "tags": ["cli", "validate", "unified-group"]
    },
    {
      "id": "REQ-CLI-UNIFIED-SYMBOL-GROUP",
      "title": "SymbolUnifiedCommand must dispatch canonical code and document symbol queries without legacy top-level command bloat",
      "tags": ["cli", "symbol", "unified-group"]
    },
    {
      "id": "REQ-CLI-FAIL-CLOSED-SYMBOL-QUERY",
      "title": "SymbolQueryCommand must distinguish verified @doc/@source bindings from unbound homonyms and enforce strict similarity thresholds",
      "tags": ["cli", "symbol-query", "fail-closed"]
    },
    {
      "id": "REQ-CLI-UNIFIED-RELATIONSHIP-GROUP",
      "title": "RelationshipCommand must expose canonical graph impact, query, path, metrics, clusters, check, and export subcommands",
      "tags": ["cli", "relationship", "unified-group"]
    },
    {
      "id": "REQ-CLI-UNIFIED-DOCS-GROUP",
      "title": "DocsCommand must unify checkpoint indexing, backlink updates, validation, unused-doc detection, and generation workflows",
      "tags": ["cli", "docs", "unified-group"]
    },
    {
      "id": "REQ-CLI-UNIFIED-SPEC-GROUP",
      "title": "SpecCommand must unify SpecGraph extraction, revision inspection, metrics, and lifecycle management",
      "tags": ["cli", "spec", "unified-group"]
    },
    {
      "id": "REQ-CLI-UNIFIED-CONVENTION-GROUP",
      "title": "ConventionCommand must expose revision-pinned convention check, inputs, and retention subcommands",
      "tags": ["cli", "convention", "unified-group"]
    },
    {
      "id": "REQ-CLI-UNIFIED-ONTOLOGY-GROUP",
      "title": "OntologyCommand must expose canonical @ttsc/graph and unified ontology statistics and edge listings",
      "tags": ["cli", "ontology", "unified-group"]
    },
    {
      "id": "REQ-CLI-CANONICAL-GRAPH-OPERATIONS",
      "title": "CanonicalGraphCommand must expose read-only status/list/diff inspection and explicit revision pruning",
      "tags": ["cli", "canonical-graph", "revision-ops"]
    }
  ],
  "edges": [
    {
      "kind": "contains",
      "from": "spec:CliCommandSurfaceSpecification",
      "to": "REQ-CLI-CANONICAL-REGISTRATION-BOUNDARY"
    },
    {
      "kind": "contains",
      "from": "spec:CliCommandSurfaceSpecification",
      "to": "REQ-CLI-UNIFIED-SSOT-SYNC"
    },
    {
      "kind": "contains",
      "from": "spec:CliCommandSurfaceSpecification",
      "to": "REQ-CLI-SYSTEM-STATUS-DASHBOARD"
    },
    {
      "kind": "contains",
      "from": "spec:CliCommandSurfaceSpecification",
      "to": "REQ-CLI-STATS-REPORTING"
    },
    {
      "kind": "contains",
      "from": "spec:CliCommandSurfaceSpecification",
      "to": "REQ-CLI-HEALTH-SCORING"
    },
    {
      "kind": "contains",
      "from": "spec:CliCommandSurfaceSpecification",
      "to": "REQ-CLI-UNIFIED-VALIDATE-GROUP"
    },
    {
      "kind": "contains",
      "from": "spec:CliCommandSurfaceSpecification",
      "to": "REQ-CLI-UNIFIED-SYMBOL-GROUP"
    },
    {
      "kind": "contains",
      "from": "spec:CliCommandSurfaceSpecification",
      "to": "REQ-CLI-FAIL-CLOSED-SYMBOL-QUERY"
    },
    {
      "kind": "contains",
      "from": "spec:CliCommandSurfaceSpecification",
      "to": "REQ-CLI-UNIFIED-RELATIONSHIP-GROUP"
    },
    {
      "kind": "contains",
      "from": "spec:CliCommandSurfaceSpecification",
      "to": "REQ-CLI-UNIFIED-DOCS-GROUP"
    },
    {
      "kind": "contains",
      "from": "spec:CliCommandSurfaceSpecification",
      "to": "REQ-CLI-UNIFIED-SPEC-GROUP"
    },
    {
      "kind": "contains",
      "from": "spec:CliCommandSurfaceSpecification",
      "to": "REQ-CLI-UNIFIED-CONVENTION-GROUP"
    },
    {
      "kind": "contains",
      "from": "spec:CliCommandSurfaceSpecification",
      "to": "REQ-CLI-UNIFIED-ONTOLOGY-GROUP"
    },
    {
      "kind": "contains",
      "from": "spec:CliCommandSurfaceSpecification",
      "to": "REQ-CLI-CANONICAL-GRAPH-OPERATIONS"
    }
  ],
  "bindings": [
    {
      "id": "BIND-CLI-CANONICAL-REGISTRATION-BOUNDARY",
      "kind": "implementation",
      "specNodeId": "REQ-CLI-CANONICAL-REGISTRATION-BOUNDARY",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/commands/registerCliCommands.ts#registerCliCommands:function"
      }
    },
    {
      "id": "BIND-CLI-UNIFIED-SSOT-SYNC",
      "kind": "implementation",
      "specNodeId": "REQ-CLI-UNIFIED-SSOT-SYNC",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/commands/SyncCommand.ts#SyncCommand:class"
      }
    },
    {
      "id": "BIND-CLI-SYSTEM-STATUS-DASHBOARD",
      "kind": "implementation",
      "specNodeId": "REQ-CLI-SYSTEM-STATUS-DASHBOARD",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/commands/SystemStatusCommand.ts#SystemStatusCommand:class"
      }
    },
    {
      "id": "BIND-CLI-STATS-REPORTING",
      "kind": "implementation",
      "specNodeId": "REQ-CLI-STATS-REPORTING",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/commands/StatsCommand.ts#StatsCommand:class"
      }
    },
    {
      "id": "BIND-CLI-HEALTH-SCORING",
      "kind": "implementation",
      "specNodeId": "REQ-CLI-HEALTH-SCORING",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/commands/HealthCommand.ts#HealthCommand:class"
      }
    },
    {
      "id": "BIND-CLI-UNIFIED-VALIDATE-GROUP",
      "kind": "implementation",
      "specNodeId": "REQ-CLI-UNIFIED-VALIDATE-GROUP",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/commands/ValidateUnifiedCommand.ts#ValidateUnifiedCommand:class"
      }
    },
    {
      "id": "BIND-CLI-UNIFIED-SYMBOL-GROUP",
      "kind": "implementation",
      "specNodeId": "REQ-CLI-UNIFIED-SYMBOL-GROUP",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/commands/SymbolUnifiedCommand.ts#SymbolUnifiedCommand:class"
      }
    },
    {
      "id": "BIND-CLI-FAIL-CLOSED-SYMBOL-QUERY",
      "kind": "implementation",
      "specNodeId": "REQ-CLI-FAIL-CLOSED-SYMBOL-QUERY",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/commands/SymbolQueryCommand.ts#SymbolQueryCommand:class"
      }
    },
    {
      "id": "BIND-CLI-UNIFIED-RELATIONSHIP-GROUP",
      "kind": "implementation",
      "specNodeId": "REQ-CLI-UNIFIED-RELATIONSHIP-GROUP",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/commands/RelationshipCommand.ts#RelationshipCommand:class"
      }
    },
    {
      "id": "BIND-CLI-UNIFIED-DOCS-GROUP",
      "kind": "implementation",
      "specNodeId": "REQ-CLI-UNIFIED-DOCS-GROUP",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/commands/DocsCommand.ts#DocsCommand:class"
      }
    },
    {
      "id": "BIND-CLI-UNIFIED-SPEC-GROUP",
      "kind": "implementation",
      "specNodeId": "REQ-CLI-UNIFIED-SPEC-GROUP",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/commands/SpecCommand.ts#SpecCommand:class"
      }
    },
    {
      "id": "BIND-CLI-UNIFIED-CONVENTION-GROUP",
      "kind": "implementation",
      "specNodeId": "REQ-CLI-UNIFIED-CONVENTION-GROUP",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/commands/ConventionCommand.ts#ConventionCommand:class"
      }
    },
    {
      "id": "BIND-CLI-UNIFIED-ONTOLOGY-GROUP",
      "kind": "implementation",
      "specNodeId": "REQ-CLI-UNIFIED-ONTOLOGY-GROUP",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/commands/OntologyCommand.ts#OntologyCommand:class"
      }
    },
    {
      "id": "BIND-CLI-CANONICAL-GRAPH-OPERATIONS",
      "kind": "implementation",
      "specNodeId": "REQ-CLI-CANONICAL-GRAPH-OPERATIONS",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/commands/CanonicalGraphCommand.ts#CanonicalGraphCommand:class"
      }
    }
  ]
}
```

## 개요 (Purpose)

과거 82개로 파편화되어 있던 평면 명령어와 숨김 별칭(hidden alias)을 완전히 제거하고, 작업자와 AI 에이전트가 직관적으로 예측·검증할 수 있는 **정본 20개 최상위 CLI 명령어 체계**를 단일 등록 경계[^registerCliCommands]에서 강제합니다.

## 핵심 개념 (Core Concepts: Input · Context · Logic)

### 1. 정본 20개 최상위 명령어 토폴로지 (Input & Context)

[^registerCliCommands]가 `CommandRegistry`에 등록하는 최상위 명령어는 아래 3개 계층 총 **20개**로 고정됩니다([[CLI Commands]]).

| 계층 | 소속 최상위 명령어 | 책임 및 위임 구조 |
| --- | --- | --- |
| **1. Core Commands (10)** | `init`, `sync`, `build`, `work-context` (`wc`), `design-context` (`dc`), `system-status`, `stats`, `health`, `fix`, `help` (`h`, `--help`, `-h`) | 프로젝트 초기화, 단일 SSOT 동기화[^SyncCommand], 수정 전 컨텍스트 전달[^WorkContextCommand]/[^DesignContextCommand], 3-플레인 상태·건강도 관측[^SystemStatusCommand]/[^StatsCommand]/[^HealthCommand] |
| **2. Unified Groups (7)** | `validate`, `symbol`, `relationship` (`rel`), `docs`, `spec`, `convention`, `ontology` | 도메인별 하위 명령어 라우팅([^ValidateUnifiedCommand], [^SymbolUnifiedCommand], [^RelationshipCommand], [^DocsCommand], [^SpecCommand], [^ConventionCommand], [^OntologyCommand]) |
| **3. Revision & Coverage (3)** | `canonical-graph`, `coverage-report`, `coverage-baseline` | 불변 `@ttsc/graph` 리비전 조회·정리[^CanonicalGraphCommand] 및 문서 커버리지 측정·베이스라인 게이트 |

### 2. 부수효과 0 부팅 및 Fail-Closed 라우팅 불변식 (Logic)

1. **Zero-Disk-Side-Effect CLI Boot**: [^registerCliCommands] 및 모든 커맨드 생성자(`constructor`)는 파일 생성이나 SQLite 연결(`new DatabaseManager(...)`)을 절대 수행하지 않으며, 오직 `execute()` 실행 시점에만 필요한 저장소를 엽니다.
2. **단일 명령 3계층 SSOT 동기화 (`sync`)**: [^SyncCommand]는 코드 심볼/강화 DB(`.tsdoc.db`), 정규 `@ttsc/graph`(`.tsdoc/canonical-graph.db`), 체크포인트(`managed/`), 명세 그래프(`.tsdoc/spec-graph.db`), 백링크(`## Backlinks`)를 결정론적 순서로 갱신하며 `--check`와 `--dry-run`에서는 디스크를 일절 변이시키지 않습니다.
3. **Fail-Closed 심볼 조회 (`symbol query`)**: [^SymbolQueryCommand]는 `@ttsc/graph` 코드 심볼과 `[[Checkpoint]]` 문서를 통합 조회할 때 실제 `@doc` 또는 `source:` 연결이 검증된 경우에만 `bound-@doc` / `bound-@source`로 표기하고, 동명이인 심볼은 `unbound-homonym`으로 격리하며, 테스트 픽스처 심볼과 약한 오타 유사도 매칭을 차단합니다.
4. **알 수 없는 플래그 즉시 거부**: 모든 명령어는 `validateAllowedFlags` 또는 전용 인자 검증기를 통해 오타 플래그에 대해 `exitCode !== 0`으로 즉시 실패합니다.

## 핵심 산출물 (Output · Effect · Scope)

- **Output**: 일관된 인간 친화 터미널 리포트 및 기계 판독 `--json` / `--llm` 페이로드, 결정론적 종료 코드(`0` 성공, `1` 검증/적합성 실패, `2` 인자/입력 오류).
- **Effect**: 조회 명령(`wc`, `dc`, `system-status`, `stats`, `health`, `validate`, `symbol query`, `relationship`, `ontology`, `sync --check`)은 읽기 전용이며, 변이 명령(`init`, `sync`, `build`, `fix`, `docs backlinks`, `spec extract`)은 `--dry-run` 미리보기를 제공합니다.
- **Scope**: `src/cli.ts`, `src/commands/registerCliCommands.ts`, 20개 최상위 커맨드 및 통합 하위 커맨드 전체.

## 사용 시나리오 (Usage Scenarios)

### 시나리오 1: 단일 명령 워크스페이스 정본 동기화 및 CI 드리프트 검사

작업 후 또는 CI 파이프라인에서 [^SyncCommand]로 3계층 SSOT 정합성을 한 번에 갱신하거나 읽기 전용으로 검증합니다.

```bash
tsdoc-edge sync
tsdoc-edge sync --check --json
```

### 시나리오 2: 코드 + `[[Checkpoint]]` 문서 통합 Fail-Closed 조회

[^SymbolUnifiedCommand]와 [^SymbolQueryCommand]를 통해 코드 심볼과 연결된 정본 체크포인트 문서를 혼동 없이 조회합니다.

```bash
tsdoc-edge symbol query ProjectIndexer --json
tsdoc-edge symbol find-method readActiveRevision
```

### 시나리오 3: 통합 검증 그룹 및 관계 분석 실행

[^ValidateUnifiedCommand]와 [^RelationshipCommand] 하위 명령으로 코드·문서·TSDoc 문법 검증과 영향도 분석을 수행합니다.

```bash
tsdoc-edge validate tsdoc src --strict
tsdoc-edge validate docs managed
tsdoc-edge relationship impact ProjectIndexer
```

## CLI 명령어 (CLI Commands)

- `tsdoc-edge sync [--force] [--dry-run] [--check] [--json]`: 3계층 SSOT 일괄 동기화 및 검증.
- `tsdoc-edge validate [code|docs|tsdoc|spec|symbols|links|generated]`: 통합 품질 검증 그룹.
- `tsdoc-edge symbol <query|find-method|who-uses|deps|impact|core-api|...>`: 코드·문서 심볼 통합 탐색 그룹.
- `tsdoc-edge relationship <impact|query|path|metrics|clusters|check|export>`: 정규 그래프 기반 관계 분석 그룹.
- `tsdoc-edge docs <index|backlinks|validate|find-unused|generate|...>`: 체크포인트 문서 생명주기 그룹.

## 설계 결정 및 경계 가이드 (Design Decisions)

1. **평면 레거시 별칭 영구 퇴출**: `validate-tsdoc`, `index-docs`, `spec-metrics`, `relationship-impact` 등 구형 최상위 별칭을 숨김 등록으로 남겨두지 않고 `registerCliCommands`에서 완전히 제거하여 단일 정규 진입점만 유지합니다.
2. **생성자 내 I/O 금지**: CLI 부팅 지연과 유령 DB 파일 생성을 원천 차단하기 위해 모든 커맨드 인스턴스화는 순수 메모리 연산이어야 하며 `SlimCliSurfaceRegistration.test.ts`가 이를 회귀 검증합니다.

## 관련 기능 (Related Concepts)

- [[AuthoredProjectSpecifications]]
- [[TsdocEdgePlatformSpecification]]
- [[CLI Commands]]
- [[Commands Index]]
- [[SyncCommand]]
- [[WorkContextCommand]]
- [[DesignContextCommand]]
- [[SymbolQueryCommand]]

---

## Backlinks

### Referenced By

- [[DesignContextCommand]] → managed/commands/DesignContextCommand.md:42
- [[SyncCommand]] → managed/commands/SyncCommand.md:30
- [[SystemStatusCommand]] → managed/commands/SystemStatusCommand.md:45
- [[TsdocEdgePlatformSpecification]] → managed/specs/domains/tsdoc-edge-platform-spec.md:206
- [[AuthoredProjectSpecifications]] → managed/specs/index.md:44

### Implemented By

- CliCommandSurfaceSpecification → src/commands/registerCliCommands.ts:1
- AnalyzeRelationshipsCommand → src/commands/AnalyzeRelationshipsCommand.ts:42
- ResolvedSymbol → src/commands/BaseCommand.ts:26
- CommandResult → src/commands/BaseCommand.ts:39
- colors → src/commands/BaseCommand.ts:55
- BaseCommand → src/commands/BaseCommand.ts:91
- CanonicalGraphCommand → src/commands/CanonicalGraphCommand.ts:30
- DocsCommand → src/commands/DocsCommand.ts:59
- MoveCommand → src/commands/MoveCommand.ts:25
- OntologyCommand → src/commands/OntologyCommand.ts:31
- RelationshipCommand → src/commands/RelationshipCommand.ts:60
- SymbolUnifiedCommand → src/commands/SymbolUnifiedCommand.ts:60
- ValidateUnifiedCommand → src/commands/ValidateUnifiedCommand.ts:43
- DEFAULT_SPEC_GRAPH_DATABASE → src/commands/canonicalReadHelper.ts:31
- CanonicalGraphPlaneSnapshot → src/commands/canonicalReadHelper.ts:42
- SpecGraphPlaneSnapshot → src/commands/canonicalReadHelper.ts:66
- ProjectedCanonicalOntologyEdge → src/commands/canonicalReadHelper.ts:85
- resolveCanonicalGraphDbPath → src/commands/canonicalReadHelper.ts:102
- resolveSpecGraphDbPath → src/commands/canonicalReadHelper.ts:127
- isExternalCanonicalNode → src/commands/canonicalReadHelper.ts:144
- readCanonicalGraphSnapshot → src/commands/canonicalReadHelper.ts:161
- readSpecGraphSnapshot → src/commands/canonicalReadHelper.ts:234
- projectCanonicalEdgeToOntology → src/commands/canonicalReadHelper.ts:280
- registerCliCommands → src/commands/registerCliCommands.ts:45

