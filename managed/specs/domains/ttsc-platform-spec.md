---
title: ttsc Platform Specification
type: project-spec
category: specifications
status: active
canonical: true
source: src/indexer/TtscGraphRouterArtifactAdapter.ts
tags:
  - ttsc
  - platform-spec
  - domain-boundary
---

# [[TtscPlatformSpecification]]

`ttsc`(`0.34.3`), 네이티브 Go TypeScript 컴파일러(`typescript-native` / `tsgo 7.0.2`), `@ttsc/lint`(`0.34.3`), `@ttsc/graph`(`ttsc-graph-router` raw artifact `1.1.0`)가 **독립적으로 소유하는 컴파일·체크·자동수정·플러그인 호스트·원시 컴파일러 그래프 아티팩트 규격**을 정의합니다. 본 명세는 `@microsoft/tsdoc` 표준 어휘([[TSDocStandardSpecification]])나 `tsdoc-edge`의 제품 거버넌스 도메인([[TsdocEdgePlatformSpecification]])과 독립된 컴파일러·정적분석 플랫폼 계층입니다.

```tsdoc-spec
{
  "requirements": [
    {
      "id": "REQ-TTSC-RAW-GRAPH-ARTIFACT-BOUNDARY",
      "title": "ttsc graph-router raw compiler-fact artifacts must be ingested strictly through versioned contract validation",
      "tags": ["ttsc", "graph-router", "raw-artifact"]
    },
    {
      "id": "REQ-TTSC-SEMANTIC-PROVIDER-ISOLATION",
      "title": "ttsc semantic graph provider must preserve producer provenance and raw compiler facts without synthesizing spec semantics",
      "tags": ["ttsc", "provider", "provenance"]
    },
    {
      "id": "REQ-TTSC-CANONICAL-GRAPH-COORDINATOR",
      "title": "CanonicalGraphCoordinator must orchestrate ttsc raw artifact capture, normalization, and revision promotion atomically",
      "tags": ["ttsc", "coordinator", "canonical-graph"]
    }
  ],
  "edges": [
    {
      "kind": "contains",
      "from": "spec:TtscPlatformSpecification",
      "to": "REQ-TTSC-RAW-GRAPH-ARTIFACT-BOUNDARY"
    },
    {
      "kind": "contains",
      "from": "spec:TtscPlatformSpecification",
      "to": "REQ-TTSC-SEMANTIC-PROVIDER-ISOLATION"
    },
    {
      "kind": "contains",
      "from": "spec:TtscPlatformSpecification",
      "to": "REQ-TTSC-CANONICAL-GRAPH-COORDINATOR"
    }
  ],
  "bindings": [
    {
      "id": "BIND-TTSC-RAW-GRAPH-ARTIFACT-BOUNDARY",
      "kind": "implementation",
      "specNodeId": "REQ-TTSC-RAW-GRAPH-ARTIFACT-BOUNDARY",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/indexer/TtscGraphRouterArtifactAdapter.ts#TtscGraphRouterArtifactAdapter:class"
      }
    },
    {
      "id": "BIND-TTSC-SEMANTIC-PROVIDER-ISOLATION",
      "kind": "implementation",
      "specNodeId": "REQ-TTSC-SEMANTIC-PROVIDER-ISOLATION",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/provider/TtscSemanticGraphProvider.ts#TtscSemanticGraphProvider:class"
      }
    },
    {
      "id": "BIND-TTSC-CANONICAL-GRAPH-COORDINATOR",
      "kind": "implementation",
      "specNodeId": "REQ-TTSC-CANONICAL-GRAPH-COORDINATOR",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/indexer/CanonicalGraphCoordinator.ts#CanonicalGraphCoordinator:class"
      }
    }
  ]
}
```

## 개요 (Purpose)

`tsgo` 네이티브 컴파일 파이프라인 위에서 **단일 패스 타입체크·린트(`check` / `fix`)·LSP(`ttscserver`)·컴파일러 해석 그래프(`@ttsc/graph`)** 를 제공하는 외부 플랫폼의 고유 계약과 확장 SPI를 명확히 분리합니다.

- **존재 이유**: TypeScript 7 호환 네이티브 AST 및 타입 체커를 단일 Go 프로세스 안에서 실행하고, Go 소스 플러그인(contributor)과 원시 심볼/엣지 덤프를 결정론적으로 공급합니다.
- **비소유(Non-Scope) 경계**:
  - `tsdoc.json`에 등록되는 서드파티 커스텀 태그의 의미나 `@microsoft/tsdoc`의 `DocComment` JS 클래스 계층은 소유하지 않습니다(→ [[TSDocStandardSpecification]]).
  - `managed/` 명세 생명주기(`draft` → `active`), `tsdoc-spec` 요구사항·바인딩 적합성 판정, `work-context` / `design-context` 컨텍스트 조립은 소유하지 않습니다(→ [[TsdocEdgePlatformSpecification]]).
  - 설정 파일에 `format` 블록을 선언하지 않는 한 코드 포맷팅 권한을 주장하지 않으며(`ttsc format` 비활성), 포맷팅은 Biome이 소유합니다(→ [[Lint Governance]]).

## 핵심 개념 (Core Concepts: Input · Context · Logic)

### 1. 컴파일러 드라이버 및 CLI 계약 (Input)

- **주요 실행 모드**:
  - `ttsc -p <tsconfig>`: 타입체크 + 자동 탐색된 check-stage 플러그인(`error` 게이트) + JS/d.ts emit 수행.
  - `ttsc check` / `ttsc fix`: emit 없이 모든 등록 규칙을 검사하거나 `FixReporter`의 `TextEdit`를 원자적으로 적용.
  - `ttsc prepare` / `ttsc cache paths --json`: `@ttsc/lint` 및 contributor Go 소스를 사전 컴파일하고 CI 캐시 경로(`node_modules/.cache/ttsc`, `go-build`)를 노출.
  - `ttscserver`: 에디터/IDE 세션용 LSP 서버(저장 상태 진단, Quick Fix, `HintRule` 자동완성, `ProjectInputRule` 파일 감시 무효화).
- **자동 플러그인 탐색 (`0.34.3`)**: 설치된 패키지의 `package.json#ttsc.plugin`(`{ "transform": "@ttsc/lint" }`)을 자동 감지하여 별도 `tsconfig.plugins` 선언이 없어도 루트 `lint.config.mjs`를 로드합니다.

### 2. `@ttsc/lint` Go `rule` SPI 및 내장 규칙 네임스페이스 (Context)

`@ttsc/lint`는 내장 규칙(`typescript/*` 타입 인지 규칙, `jsdoc/*` 기본 주석 구조 규칙) 외에 Go 소스 contributor가 구현할 수 있는 정식 인터페이스를 제공합니다.

| SPI 인터페이스 | 역할 및 수명주기 |
| --- | --- |
| `rule.ProjectRule` + `ProjectInputRule` + `ProjectInputObservationRule` | Program 사이클당 1회 실행; `ProjectInputFile` / `ProjectInputGlob` 선언으로 비-TS 파일(`tsdoc.json`, `managed/**/*.md`)을 읽고 변경 시 `ttscserver` 캐시를 자동 무효화하며 `ctx.SetState(...)`로 불변 상태를 공유 |
| `rule.Rule` + `TypeAwareRule` + `OptionsRule` | 파일/AST 노드 단위 검사; `NeedsTypeChecker() == false` 선언 시 체커 직렬화 없이 병렬 AST 패스에서 실행 |
| `FixReporter` / `SuggestionReporter` | `ctx.ReportRangeFix`(무손실 `ttsc fix` 자동수정) 및 `ctx.ReportRangeSuggestion`(에디터 선택형 Quick Fix) 발행 |
| `rule.HintRule` | `ttscserver` 전용 풀(pull) 방식 자동완성(`HintScopeJSDoc` 등, 배치 `ttsc check` 오버헤드 0) |
| `rule.GraphRule` | 고정 어휘 아티팩트 노드(`markdown_document`, `markdown_section`, `prisma_*`, `swagger_operation`)를 호스트 그래프에 발행 |

- **단일 수명주기 제약**: 서드파티 contributor는 동일 규칙 이름에 `ProjectRule`과 파일 `Rule`을 동시에 등록할 수 없으므로(충돌 시 `ProjectRule` 드롭), 상태 생산자 규칙과 파일 검사 규칙의 이름을 분리하고 `ctx.ProjectResult(...)`로 조회해야 합니다.

### 3. `@ttsc/graph` 및 `ttsc-graph-router` 원시 아티팩트 계약 (Logic)

- **원시 컴파일러 사실(Raw Fact Plane)**: `@ttsc/graph`는 컴파일러가 해석한 심볼 노드(`@ttsc/graph:path#qualifiedName:kind`)와 호출·참조·상속 엣지 및 1-based 소스 좌표를 `ITtscGraphDump`로 생산합니다.
- **경계 불변식**: `ttsc-graph-router` raw artifact contract `1.1.0`은 저장된 파일 기준(saved-file snapshot)의 순수 컴파일러 사실만 담으며, 합성된 도메인 관계나 명세 생명주기 상태를 절대 포함하지 않습니다. `tsdoc-edge` 측 어댑터[^TtscGraphRouterArtifactAdapter]와 프로바이더[^TtscSemanticGraphProvider]는 이 계약을 검증한 뒤 정규화 계층[^ProviderSnapshotNormalizer]으로 전달합니다.

## 핵심 산출물 (Output · Effect · Scope)

- **Output**:
  - 컴파일 산출물(`dist/`, `.test-dist/`), 타입 및 check-stage 린트 진단(`TS...`), `ttsc fix` 소스 패치.
  - 컴파일된 Go 플러그인 바이너리(`node_modules/.cache/ttsc/plugins/<hash>/plugin`).
  - 원시 그래프 아티팩트(`@ttsc-ex/ttsc-graph-router/raw-graph-artifact`, 스키마 `@ttsc/graph/ITtscGraphDump`).
- **Effect**: 플러그인 캐시 디렉터리 및 빌드 출력 디렉터리 외에는 워크스페이스 도메인 DB(`.tsdoc.db`, `.tsdoc/canonical-graph.db`, `.tsdoc/spec-graph.db`)를 직접 변경하지 않습니다.
- **Scope**: [^TtscGraphRouterArtifactAdapter], [^TtscSemanticGraphProvider], [^ProviderSnapshotNormalizer], [^ProjectIndexer], [^GraphRepository]가 소비하는 컴파일러 기반 인프라 계층.

## 사용 시나리오 (Usage Scenarios)

### 시나리오 1: Go 소스 플러그인 사전 컴파일 및 캐시 경로 조회

CI 또는 로컬 클린 환경에서 `@ttsc/lint`와 프로젝트 contributor를 사전 링크하여 후속 빌드·테스트의 콜드 컴파일 지연을 제거합니다.

```bash
npm run ttsc:cache
npm run ttsc:prepare
```

### 시나리오 2: 단일 패스 빌드 20개 `error` 게이트 및 프로덕션 25개 `error` 엄격 검증

일반 빌드·테스트(`lint.config.mjs`)에서는 20개 전역 `error` 규칙을 강제하고, 프로덕션 린트 게이트(`tsconfig.lint.json` → `lint.ratchet.config.mjs`)에서는 추가 타입 안전 규칙 5종을 포함한 총 **25개 `error` 규칙(0 findings)** 을 검증합니다.

```bash
npm run build
npm run lint:ttsc
```

### 시나리오 3: 원시 `@ttsc/graph` 덤프 수집 및 정규화 전달

[^CanonicalGraphCoordinator]와 [^TtscGraphRouterArtifactAdapter]가 `graph-router` 아티팩트의 프로듀서 버전과 스키마 계약을 검증한 뒤 [^TtscSemanticGraphProvider]와 [^ProjectIndexer]로 넘겨 정규 그래프 리비전을 생성합니다.

## CLI 명령어 (CLI Commands)

- `npm run ttsc:prepare`: `@ttsc/lint` + contributor Go 바이너리 사전 빌드.
- `npm run ttsc:check` / `npm run ttsc:fix`: 워크스페이스 check-stage 진단 및 자동수정 실행.
- `npm run lint:ttsc`: `tsconfig.lint.json` 기준 25개 `error` 규칙 무결성 검증.

## 설계 결정 및 경계 가이드 (Design Decisions)

1. **2계층 설정 분리 (`lint.config.mjs` 20 `error` + `lint.ratchet.config.mjs` 5 추가 프로덕션 `error`)**: `0.34.3` 자동 탐색으로 인해 모든 `ttsc` 호출이 `lint.config.mjs`(20개 전역 `error`)를 읽으며, `lint.ratchet.config.mjs`는 `extends: './lint.config.mjs'` 위에 `src/` 전용 엄격 타입 안전 `error` 규칙 5종을 추가하여 총 25개 `error` 게이트(경고 백로그 0건)를 유지합니다.
2. **원시 그래프와 정규 그래프의 분리**: `@ttsc/graph`의 로컬 노드 ID를 영속 DB 기본키로 직접 노출하지 않고, 항상 [^ProviderSnapshotNormalizer]에서 `workspaceId`와 `graphNamespace`(`ttsc:<repoId>`)를 결합한 정규 ID로 변환합니다.
3. **AST·그래프 사실과 중복되는 주석 태그 제거**: `@ttsc/graph`가 결정론적으로 산출하는 6종 정규 엣지(`implements`, `extends`, `calls`, `accesses`, `instantiates`, `type_ref`), `CanonicalNodeId`, TypeScript `import`/가시성 수식어가 코드 공간 의존성·식별자의 유일한 정본이므로, 수동 주석 태그 9종(`@implements`, `@extends`, `@uses`, `@usedBy`, `@dependsOn`, `@depends`, `@depType`, `@depReason`, `@id`)은 퇴출하고 관계 브리지로만 연결합니다.

## 관련 기능 (Related Concepts)

- [[AuthoredProjectSpecifications]]
- [[TSDocStandardSpecification]]
- [[TsdocEdgePlatformSpecification]]
- [[CrossSpecIntegrationContract]]
- [[ProjectIndexer]]
- [[Lint Governance]]

---

## Backlinks

### Referenced By

- [[ProjectIndexer]] → managed/architecture/project-indexer.md:76
- [[Lint Governance]] → managed/features/lint-governance.md:15
- [[CrossSpecIntegrationContract]] → managed/specs/domains/cross-spec-integration-contract.md:17
- [[TsdocEdgePlatformSpecification]] → managed/specs/domains/tsdoc-edge-platform-spec.md:163
- [[TSDocStandardSpecification]] → managed/specs/domains/tsdoc-standard-spec.md:16
- [[AuthoredProjectSpecifications]] → managed/specs/index.md:41

### Implemented By

- TtscPlatformSpecification → src/indexer/TtscGraphRouterArtifactAdapter.ts:1
- CanonicalAliasContext → src/indexer/CanonicalAliasContext.ts:28
- DEFAULT_GRAPH_ROUTER_CONFIG → src/indexer/CanonicalGraphCoordinator.ts:44
- DEFAULT_GRAPH_TSCONFIG → src/indexer/CanonicalGraphCoordinator.ts:53
- CanonicalGraphCoordinatorOptions → src/indexer/CanonicalGraphCoordinator.ts:62
- CanonicalGraphCoordinator → src/indexer/CanonicalGraphCoordinator.ts:117
- canonicalGraphOptionsFromEnvironment → src/indexer/CanonicalGraphCoordinator.ts:253
- verifyLegacyAstParity → src/indexer/LegacyAstParityAdapter.ts:55
- ProjectIndexer → src/indexer/ProjectIndexer.ts:35
- canonicalProjectGraphFingerprint → src/indexer/ProjectIndexer.ts:134
- SUPPORTED_TTSC_GRAPH_ARTIFACT_CONTRACT_VERSION → src/indexer/TtscGraphRouterArtifactAdapter.ts:31
- SUPPORTED_TTSC_GRAPH_ARTIFACT_CONTRACT_VERSIONS → src/indexer/TtscGraphRouterArtifactAdapter.ts:40
- SupportedTtscGraphArtifactContractVersion → src/indexer/TtscGraphRouterArtifactAdapter.ts:49
- TtscGraphRouterArtifactAdapterOptions → src/indexer/TtscGraphRouterArtifactAdapter.ts:142
- TtscGraphRouterArtifactAdapter → src/indexer/TtscGraphRouterArtifactAdapter.ts:171
- CANONICAL_ID_SCHEME → src/indexer/canonical-id.ts:18
- ParsedCanonicalId → src/indexer/canonical-id.ts:35
- parseCanonicalId → src/indexer/canonical-id.ts:49
- formatCanonicalId → src/indexer/canonical-id.ts:70
- canonicalFsPath → src/indexer/canonical-path.ts:22
- PROJECT_GRAPH_CONTRACT_VERSION → src/indexer/contracts.ts:23
- ProjectGraphEvidence → src/indexer/contracts.ts:32
- ProjectGraphSourceNode → src/indexer/contracts.ts:47
- ProjectGraphSourceEdge → src/indexer/contracts.ts:65
- ProjectGraphProvenance → src/indexer/contracts.ts:79
- ProjectGraphInput → src/indexer/contracts.ts:113
- ProjectIndexRequest → src/indexer/contracts.ts:130
- ProjectGraphSource → src/indexer/contracts.ts:146
- CanonicalGraphNode → src/indexer/contracts.ts:158
- CanonicalGraphEdge → src/indexer/contracts.ts:167
- ProjectIndexResult → src/indexer/contracts.ts:176
- CanonicalProjectGraph → src/indexer/contracts.ts:188
- CANONICAL_DIAGNOSTICS_CONTRACT_VERSION → src/indexer/diagnostics-contract.ts:18
- CanonicalDiagnosticSeverity → src/indexer/diagnostics-contract.ts:27
- CanonicalDiagnosticCategory → src/indexer/diagnostics-contract.ts:36
- CanonicalDiagnostic → src/indexer/diagnostics-contract.ts:45
- normalizeRouterDiagnostics → src/indexer/diagnostics-contract.ts:67
- generateLegacyId → src/indexer/legacy-id.ts:22
- normalizeLegacyKind → src/indexer/legacy-id.ts:45
- AliasMatchStrategy → src/indexer/symbol-alias.ts:25
- SymbolAliasRecord → src/indexer/symbol-alias.ts:34
- LegacySymbolIdentity → src/indexer/symbol-alias.ts:50
- buildLegacyIdentityMap → src/indexer/symbol-alias.ts:69
- materializeAliases → src/indexer/symbol-alias.ts:157
- InMemoryAliasResolver → src/indexer/symbol-alias.ts:229
- PROVIDER_DELTA_NORMALIZER_VERSION → src/provider/DeltaNormalizer.ts:51
- OWNED_OUTGOING_RELATIONSHIPS_CAPABILITY → src/provider/DeltaNormalizer.ts:60
- ProviderDeltaNormalizationState → src/provider/DeltaNormalizer.ts:69
- NormalizedProviderDelta → src/provider/DeltaNormalizer.ts:78
- NormalizeProviderDeltaInput → src/provider/DeltaNormalizer.ts:105
- DeltaNormalizer → src/provider/DeltaNormalizer.ts:122
- ProviderProjectIndexResult → src/provider/ProviderProjectIndexer.ts:33
- ProviderProjectIndexer → src/provider/ProviderProjectIndexer.ts:48
- PROVIDER_SNAPSHOT_NORMALIZER_ID → src/provider/ProviderSnapshotNormalizer.ts:47
- PROVIDER_SNAPSHOT_NORMALIZER_VERSION → src/provider/ProviderSnapshotNormalizer.ts:56
- ProviderSnapshotNormalizerOptions → src/provider/ProviderSnapshotNormalizer.ts:65
- NormalizedProviderSnapshot → src/provider/ProviderSnapshotNormalizer.ts:82
- ProviderSnapshotNormalizer → src/provider/ProviderSnapshotNormalizer.ts:123
- canonicalProviderNodeId → src/provider/ProviderSnapshotNormalizer.ts:293
- TtscSemanticGraphProviderOptions → src/provider/TtscSemanticGraphProvider.ts:43
- TtscSemanticGraphProvider → src/provider/TtscSemanticGraphProvider.ts:62
- SEMANTIC_GRAPH_PROVIDER_CONTRACT_ID → src/provider/contracts.ts:27
- SEMANTIC_GRAPH_PROVIDER_CONTRACT_VERSION → src/provider/contracts.ts:36
- ProviderIdentity → src/provider/contracts.ts:45
- ProviderCapabilityStatus → src/provider/contracts.ts:60
- ProviderCapability → src/provider/contracts.ts:69
- GraphCapabilities → src/provider/contracts.ts:82
- ProviderNode → src/provider/contracts.ts:91
- ProviderFactOccurrence → src/provider/contracts.ts:110
- ProviderDiagnostic → src/provider/contracts.ts:131
- ProviderProvenance → src/provider/contracts.ts:149
- ProviderSnapshot → src/provider/contracts.ts:169
- ProviderIdentityRemapReason → src/provider/contracts.ts:190
- ProviderChange → src/provider/contracts.ts:199
- ProviderDelta → src/provider/contracts.ts:221
- ProviderProjectInput → src/provider/contracts.ts:243
- ProviderDocumentInput → src/provider/contracts.ts:256
- TypeScriptProviderConfig → src/provider/contracts.ts:269
- SemanticGraphProvider → src/provider/contracts.ts:282
- CANONICAL_TTSC_RELATIONSHIP_BRIDGE → src/types/tags/canonical-tag-bridge.ts:114

