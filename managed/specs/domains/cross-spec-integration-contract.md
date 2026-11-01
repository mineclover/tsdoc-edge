---
title: Cross-Spec Integration Contract
type: project-spec
category: specifications
status: active
canonical: true
source: src/provider/ProviderSnapshotNormalizer.ts
tags:
  - integration-contract
  - tsdoc
  - ttsc
  - tsdoc-edge
---

# [[CrossSpecIntegrationContract]]

독립된 세 명세 계층인 **`tsdoc` 표준 스펙**([[TSDocStandardSpecification]]), **`ttsc` 플랫폼 스펙**([[TtscPlatformSpecification]]), **`tsdoc-edge` 제품 거버넌스 스펙**([[TsdocEdgePlatformSpecification]])이 **이중 SSOT나 역할 침범 없이 상호 연동되는 소유권 매트릭스와 2대 브리지(어댑터) 계약**을 정의합니다.

```tsdoc-spec
{
  "requirements": [
    {
      "id": "REQ-CROSS-SPEC-SNAPSHOT-NORMALIZATION",
      "title": "ProviderSnapshotNormalizer must translate provider-local ttsc facts into workspace-namespaced tsdoc-edge canonical identities",
      "tags": ["bridge", "ttsc", "tsdoc-edge"]
    },
    {
      "id": "REQ-CROSS-SPEC-SINGLE-CANONICAL-INDEXER",
      "title": "ProjectIndexer must remain the single canonical code-graph assembly boundary across CLI and LSP consumers",
      "tags": ["bridge", "canonical-graph", "indexer"]
    },
    {
      "id": "REQ-CROSS-SPEC-CANONICAL-TAG-BRIDGE",
      "title": "projectCanonicalTtscRelationships must map canonical @ttsc/graph compiler edges onto tsdoc-edge RelationshipType ontology without duplicate comment tags",
      "tags": ["bridge", "tag-ontology", "ttsc"]
    },
    {
      "id": "REQ-CROSS-SPEC-GRAPH-EDGE-SEMANTICS",
      "title": "graphEdgeSemantic must classify canonical @ttsc/graph edge kinds deterministically across dependency, containment, and query policies",
      "tags": ["bridge", "edge-semantics", "graph-analysis"]
    }
  ],
  "edges": [
    {
      "kind": "contains",
      "from": "spec:CrossSpecIntegrationContract",
      "to": "REQ-CROSS-SPEC-SNAPSHOT-NORMALIZATION"
    },
    {
      "kind": "contains",
      "from": "spec:CrossSpecIntegrationContract",
      "to": "REQ-CROSS-SPEC-SINGLE-CANONICAL-INDEXER"
    },
    {
      "kind": "contains",
      "from": "spec:CrossSpecIntegrationContract",
      "to": "REQ-CROSS-SPEC-CANONICAL-TAG-BRIDGE"
    },
    {
      "kind": "contains",
      "from": "spec:CrossSpecIntegrationContract",
      "to": "REQ-CROSS-SPEC-GRAPH-EDGE-SEMANTICS"
    }
  ],
  "bindings": [
    {
      "id": "BIND-CROSS-SPEC-SNAPSHOT-NORMALIZATION",
      "kind": "implementation",
      "specNodeId": "REQ-CROSS-SPEC-SNAPSHOT-NORMALIZATION",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/provider/ProviderSnapshotNormalizer.ts#ProviderSnapshotNormalizer:class"
      }
    },
    {
      "id": "BIND-CROSS-SPEC-SINGLE-CANONICAL-INDEXER",
      "kind": "implementation",
      "specNodeId": "REQ-CROSS-SPEC-SINGLE-CANONICAL-INDEXER",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/indexer/ProjectIndexer.ts#ProjectIndexer:class"
      }
    },
    {
      "id": "BIND-CROSS-SPEC-CANONICAL-TAG-BRIDGE",
      "kind": "implementation",
      "specNodeId": "REQ-CROSS-SPEC-CANONICAL-TAG-BRIDGE",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/types/tags/canonical-tag-bridge.ts#projectCanonicalTtscRelationships:function"
      }
    },
    {
      "id": "BIND-CROSS-SPEC-GRAPH-EDGE-SEMANTICS",
      "kind": "implementation",
      "specNodeId": "REQ-CROSS-SPEC-GRAPH-EDGE-SEMANTICS",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/graph-analysis/edge-semantics.ts#graphEdgeSemantic:function"
      }
    }
  ]
}
```

## 개요 (Purpose)

세 시스템(`tsdoc`, `ttsc`, `tsdoc-edge`)은 모두 TypeScript AST와 주석을 다루기 때문에 경계가 흐려지면 태그 오염(`tsdoc.json`에 비태그 식별자 유입), 이중 파싱 병목, 혹은 이중 그래프 SSOT가 발생합니다. 본 계약은 **각 기능 차원의 단일 소유자(Single Owner)** 와 **교차 경계 어댑터의 입출력 불변식**을 고정합니다.

## 핵심 개념 (Core Concepts: 3-스펙 독립 소유권 매트릭스 및 2대 브리지)

### 1. 3-스펙 독립 소유권 매트릭스 (Context)

| 아키텍처 차원 | `tsdoc` 독립 스펙 (`@microsoft/tsdoc`) | `ttsc` 독립 스펙 (`ttsc` · `@ttsc/lint` · `@ttsc/graph`) | `tsdoc-edge` 독립 스펙 (본 플랫폼) |
| --- | --- | --- | --- |
| **주석 문법 & 이스케이프** | **정본 소유 (SSOT)** — `/** ... */`, `{` `}` `<` `>` `@` 규칙, 46개 `messageId` | 내장 `jsdoc/tsdoc-syntax` 기본 구조 검사 실행기 제공 | 어댑터(`tsdoc-escapes`)로 표준 규칙을 `ttsc`에 투영 + 패리티 검증 |
| **태그 어휘 정의** | 표준 태그 **29종** + `tsdoc.json` 스키마 규격 소유 | 태그 어휘 비소유 (`HintRule` / `ProjectInputRule` SPI만 제공) | 비환원 도메인 태그 **22종**만 `tsdoc.json`에 선언 (중복·JSDoc 호환 태그 **41종 전량 퇴출**) |
| **컴파일 & 타입체크** | 비소유 | **정본 소유 (SSOT)** — `tsgo 7.0.2` 네이티브 컴파일 & 타입 체커 | 런타임 AST 분석용 JS API(`typescript@6.0.3`)만 분리 소비 |
| **정적 린트 & `fix` 호스트** | 비소유 | **정본 소유 (SSOT)** — `typescript/*` · `jsdoc/*` 규칙, `ttsc check`/`fix` | 2계층 정책(`lint.config.mjs` 20 전역 `error` + `lint.ratchet.config.mjs` 5 추가 `error` = 총 **25 `error`**, 0 findings) 구성 |
| **원시 코드 구조 그래프** | 비소유 | **원시 사실 생산자 (`superseded`)** — `@ttsc/graph` 노드·호출·참조 덤프 | `ProviderSnapshotNormalizer` → `ProjectIndexer`로 정규 리비전 승격 |
| **문서 심볼 & 체크포인트** | 비소유 (`@doc`를 일반 블록 태그로만 인식) | `GraphRule`(`markdown_*`) 노드 수용 슬롯만 제공 | **정본 소유 (SSOT)** — `# [[Checkpoint]]`, 백링크, `[^Symbol]` 각주 |
| **명세 생명주기 & 적합성** | 비소유 | 비소유 | **정본 소유 (SSOT)** — `tsdoc-spec`, `SpecGraphRevision`, `ConventionCheckService` |
| **작업/설계 컨텍스트 전달** | 비소유 | 비소유 | **정본 소유 (SSOT)** — `work-context`(`composed`), `design-context`, MCP, `tsdoc-edge-lsp` |

### 2. 브리지 1 — 네이티브 Go Contributor (`tools/ttsc-tsdoc` v0.3.0) (Logic)

`tools/ttsc-tsdoc`는 `@ttsc/lint`의 Go `rule` SPI 위에서 **`tsdoc` 표준 규칙 4종**과 **`tsdoc-edge` 도메인 규칙 3종**을 한 번의 `tsgo` AST 패스로 실행하는 브리지입니다.

| 규칙 이름 | 대리(Enforce)하는 원천 스펙 | 수명주기 & SPI | 현재 게이트 |
| --- | --- | --- | --- |
| `tsdoc-edge/tsdoc-config` | **TSDoc 표준** (`tsdoc.json` 로드 + `@태그` 자동완성) | `ProjectRule` + `ProjectInputFile` + `HintRule` | `error` |
| `tsdoc-edge/check-tag-names` | **TSDoc 표준** + `tsdoc-edge` 선언 어휘 대조 | `Rule` (리터럴 스팬 제외 + `shimscanner`) | `error` |
| `tsdoc-edge/tsdoc-escapes` | **TSDoc 표준** (산문 이스케이프 + `ttsc fix` 자동수정) | `Rule` + `ReportRangeFix` | `error` |
| `tsdoc-edge/param-signatures` | **TSDoc 표준** (`@param name - desc`) + TS 선언 파라미터 일치 | `Rule` + `ReportRangeFix` + `ReportRangeSuggestion` | `error` |
| `tsdoc-edge/spec-index` | **`tsdoc-edge` 고유 스펙** (`managed/**/*.md` 체크포인트 인덱싱) | `ProjectRule` + `ProjectInputGlob` + `HintRule` + `GraphRule` | `error` |
| `tsdoc-edge/doc-link-syntax` | **`tsdoc-edge` 고유 스펙** (`@doc [[Checkpoint]]` 구문 강제) | `Rule` | `error` |
| `tsdoc-edge/doc-link-target` | **`tsdoc-edge` 고유 스펙** (`managed/` 실제 체크포인트 해소 검사) | `Rule` (`spec-index` 상태 참조) | `error` |

- **패리티 오라클 불변식**: Go 규칙(`tsdoc-escapes` 등)은 표준 문법의 재정의자가 아니며, [^TSDocParser](`@microsoft/tsdoc`)가 패리티 오라클입니다. `ttsc fix` 적용 결과가 `@microsoft/tsdoc` 파서 에러 **0건**으로 수렴할 때만 `error` 등급을 유지합니다.

### 3. 브리지 2 — 시맨틱 그래프 정규화 파이프라인 & C2 소유권 판정 (Logic)

- **파이프라인**: `@ttsc/graph` → [^TtscGraphRouterArtifactAdapter] → [^TtscSemanticGraphProvider] → [^ProviderSnapshotNormalizer] → [^ProjectIndexer] → [^GraphRepository] → [^EffectiveAnalysisService] / [^WorkContextCommand].
- **C2 Capability Owner 판정**:
  - `structural-topology` & `symbol-identity-position`: **`superseded`** (`ttsc` 원시 사실 기반 정규 그래프가 정본 소유자).
  - `documentation-test-enrichment`: **`retained`** (`tsdoc-edge`의 TSDoc 도메인 추출기[^EnhancedDocExtractor] 및 테스트 관계 분석기가 정본 소유자).
  - `work-context-output`: **`composed`** (`ttsc` 구조 그래프 + `tsdoc-edge` 문서·설계·테스트 강화 평면을 합성).
- **TypeScript 이중 패키지 분리**:
  - `dependencies.typescript` (`6.0.3`): 런타임 JS Compiler API(`ts.createSourceFile` 등)를 소비하는 `src/` 내 분석기·파서 전용.
  - `devDependencies.typescript-native` (`npm:typescript@7.0.2`): `ttsc`가 구동하는 네이티브 `tsgo` 컴파일러 바이너리 전용.

### 4. 브리지 3 — 정본 태그·관계 매핑 계약 (`src/types/tags/canonical-tag-bridge.ts`) (Logic)

역할이 겹치는 태그는 각 시스템의 정본(SSOT)만 남기고 `tsdoc-edge`에서는 [^projectCanonicalTtscRelationships]와 [^graphEdgeSemantic]을 통해 관계 매핑만 정의·관리합니다.

| 정본 소유자 | 정본 사실 / 표준 태그 | `tsdoc-edge` 투영 대상 (`RelationshipType` · 7관점) | 퇴출된 중복 태그 (총 41종) |
| --- | --- | --- | --- |
| **`ttsc` (`@ttsc/graph` + TS AST)** | `implements`, `extends`, `calls`, `accesses`, `instantiates`, `type_ref`, `ImportDeclaration`, `CanonicalNodeId`, TS `private`/`export` | `implementation`, `inheritance`, `calls`, `code-dependency`, `type-dependency`, `Context` · `Scope` 관점 | `@implements`, `@extends`, `@uses`, `@usedBy`, `@dependsOn`, `@depends`, `@depType`, `@depReason`, `@id`, `@private`, `@testedBy`, `@fixture` (12종) |
| **`tsdoc` (`@microsoft/tsdoc` 표준 29종)** | Summary, `@param`, `@returns`, `@throws`, `@typeParam`, `@packageDocumentation`, `@defaultValue`, `@public`/`@internal`/`@beta`/`@alpha`, `@remarks`, `@privateRemarks`, `@deprecated`+`{@link}`, `@see` | `Purpose`, `Input`, `Output`, `Logic`, `Scope` 관점 및 인라인 백로그(`TODO:`/`PLAN:`) | `@description`, `@template`, `@module`, `@default`, `@todo`, `@plan`, `@priority`, `@scope`, `@input`, `@output`, `@deprecatedInFavorOf`, `@symbol`, `@issue` (13종) |
| **`tsdoc-edge` 명세·통합 온톨로지** | `managed/specs/` `tsdoc-spec` JSON 블록, Git 이력, LCOV 런타임 리포트, 22종 핵심 도메인 태그(`@sideEffect`, `@decision`, `@complexity` 등) | `SpecGraphRevision`, `Effect`(`state:`/`filesystem:`/`database:`), ADR 트리아드 | `@version`, `@updated`, `@changelog`, `@requirement`, `@architecture`, `@coverage`, `@purpose`, `@useCase`, `@logic`, `@performance`, `@mutates`, `@io`, `@reads`, `@writes`, `@designDecision`, `@pattern` (16종) |

## 핵심 산출물 (Output · Effect · Scope)

- **Output**:
  - `lint.config.mjs`(20개 전역 `error` 게이트) + `lint.ratchet.config.mjs`(5개 프로덕션 추가 `error` 게이트 = 총 25개 `error` 규칙, 0 findings) 정적 검증 파이프라인.
  - `TtscTsdocPluginParity.test.ts` 종단간 패리티 증거 및 `capability-owner-matrix.v1.json` C2 소유권 증빙.
- **Effect**: 세 스펙 중 어느 한쪽이 업그레이드되더라도 어댑터 경계(`tools/ttsc-tsdoc`, `TtscGraphRouterArtifactAdapter`, `TSDocParser`)에서만 버전 핀과 패리티 테스트를 갱신하면 나머지 도메인 평면은 영향받지 않습니다.
- **Scope**: 빌드·테스트·린트·정규 그래프 인덱싱·LSP 전 구간의 스펙 교차 지점.

## 사용 시나리오 (Usage Scenarios)

### 시나리오 1: `tsdoc` ↔ `ttsc` 네이티브 플러그인 종단간 패리티 검증

`tools/ttsc-tsdoc` Go 바이너리가 `tsdoc.json`과 `managed/**/*.md`를 읽고 `ttsc fix` 후 `@microsoft/tsdoc` 에러 0건을 달성하는지 검증합니다.

```bash
npm run ttsc:prepare
npm run test:run -- TtscTsdocPluginParity
```

### 시나리오 2: `ttsc` ↔ `tsdoc-edge` C2 Capability Owner 매트릭스 및 런타임 계약 검증

구조 토폴로지(`superseded`), 문서·테스트 강화(`retained`), 작업 컨텍스트(`composed`) 경계가 깨지지 않았는지 확인합니다.

```bash
npm run verify:c2-capability-matrix
npm run verify:runtime-contract
```

### 시나리오 3: 3-스펙 통합 게이트 일괄 실행

Biome(포맷·스타일), `ttsc` + `@ttsc/lint`(타입·25개 `error` 게이트), `@microsoft/tsdoc`(전수 문법), `validate docs`(체크포인트 SSOT)를 순차 검증합니다.

```bash
npm run build
node dist/cli.js validate tsdoc src --strict --json
npm run lint
npm run verify:document-validation
```

## CLI 명령어 (CLI Commands)

- `npm run ttsc:prepare`: 브리지 1 Go contributor 바이너리 컴파일.
- `npm run verify:c2-capability-matrix`: 브리지 2 C2 소유권 매트릭스 검증.
- `node dist/cli.js validate tsdoc src --strict --json`: `@microsoft/tsdoc` 기준선 패리티 확인.

## 설계 결정 및 경계 가이드 (Design Decisions)

1. **`DocComment` 트리의 Go 직렬화 금지**: 배치 문서 생성·7관점 분석에서의 순수 `@microsoft/tsdoc` 파싱 비용은 5,082개 주석 기준 warm ~28ms이므로, `DocNode` 트리는 TypeScript([^TSDocParser])에 유지하고 매 빌드·저장 시 실행되는 규칙 검사만 Go contributor로 이식합니다.
2. **새 규칙·태그 추가 시 귀속 판정 원칙**:
   - 표준 TSDoc 문법/이스케이프면 → [[TSDocStandardSpecification]] 및 `tools/ttsc-tsdoc` 표준 규칙에 귀속.
   - 범용 TypeScript 타입/비동기 안전성이면 → [[TtscPlatformSpecification]] (`@ttsc/lint` `typescript/*`)에 귀속.
   - 체크포인트·7관점·아키텍처 정책·관계 온톨로지면 → [[TsdocEdgePlatformSpecification]] (`managed/specs/`, `.tsdoc.config.json`, `tsdoc.json` 도메인 태그)에 귀속.

## 관련 기능 (Related Concepts)

- [[AuthoredProjectSpecifications]]
- [[TSDocStandardSpecification]]
- [[TtscPlatformSpecification]]
- [[TsdocEdgePlatformSpecification]]
- [[ProjectIndexer]]
- [[Lint Governance]]
- [[Semantic Graph Spec Governance Roadmap]]

---

## Backlinks

### Referenced By

- [[ProjectIndexer]] → managed/architecture/project-indexer.md:76
- [[Lint Governance]] → managed/features/lint-governance.md:16
- [[ConventionCheck]] → managed/specs/conventions/convention-check.md:200
- [[GraphAndPersistencePlaneSpecification]] → managed/specs/domains/graph-and-persistence-plane-spec.md:256
- [[TsdocEdgePlatformSpecification]] → managed/specs/domains/tsdoc-edge-platform-spec.md:257
- [[TSDocStandardSpecification]] → managed/specs/domains/tsdoc-standard-spec.md:160
- [[TtscPlatformSpecification]] → managed/specs/domains/ttsc-platform-spec.md:182
- [[AuthoredProjectSpecifications]] → managed/specs/index.md:43

### Implemented By

- CrossSpecIntegrationContract → src/provider/ProviderSnapshotNormalizer.ts:1
- ModuleSpecGenerator → src/generator/ModuleSpecGenerator.ts:76
- TSDOC_EDGE_CUSTOM_TAGS → src/parser/TSDocParser.ts:49
- SourceDocCheckpointReference → src/parser/TsdocCommentReader.ts:159
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
- CANONICAL_TSDOC_STANDARD_BRIDGE → src/types/tags/canonical-tag-bridge.ts:177
- RETIRED_CUSTOM_TAG_MIGRATIONS → src/types/tags/canonical-tag-bridge.ts:247

