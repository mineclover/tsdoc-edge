---
title: TSDoc Edge Platform Specification
type: project-spec
category: specifications
status: active
canonical: true
source: src/spec-graph/ManagedSpecExtractor.ts
tags:
  - tsdoc-edge
  - product-spec
  - ssot-governance
  - domain-boundary
---

# [[TsdocEdgePlatformSpecification]]

`tsdoc-edge`가 **독립적으로 소유하는 SSOT 체크포인트 문서 연결성(`[[Checkpoint]]`), 도메인 확장 태그 온톨로지(7관점 모듈 명세·계약·ADR·관계), 6-플레인 리비전 고정 거버넌스 커널, 그리고 작업자·AI 컨텍스트 표면(`work-context`, `design-context`, `spec`, `convention`, LSP, MCP)** 의 고유 제품 명세를 정의합니다.

```tsdoc-spec
{
  "requirements": [
    {
      "id": "REQ-TSDOC-EDGE-CHECKPOINT-REGISTRY-SSOT",
      "title": "DocumentSymbolRegistry must enforce unique primary H1 checkpoints and bidirectional code-doc connectivity",
      "tags": ["tsdoc-edge", "ssot", "doc-symbol"]
    },
    {
      "id": "REQ-TSDOC-EDGE-AUTHORED-SPEC-EXTRACTION",
      "title": "Authored project-spec Markdown declarations must compile deterministically into immutable SpecGraph revisions",
      "tags": ["tsdoc-edge", "spec-graph", "ssot"]
    },
    {
      "id": "REQ-TSDOC-EDGE-WORK-CONTEXT-DELIVERY",
      "title": "WorkContextCommand must deliver composed canonical structure, spec bindings, dependencies, and impact context",
      "tags": ["tsdoc-edge", "work-context", "product-surface"]
    },
    {
      "id": "REQ-TSDOC-EDGE-DESIGN-CONTEXT-DELIVERY",
      "title": "DesignContextCommand must deliver normative SpecGraph bindings alongside @contract invariants and @decision ADR triads",
      "tags": ["tsdoc-edge", "design-context", "product-surface"]
    },
    {
      "id": "REQ-TSDOC-EDGE-MODULE-SPEC-TAG-PARSER",
      "title": "ModuleSpecTagParser must extract the 7-aspect module specification tags cleanly from TSDoc DocComment AST blocks",
      "tags": ["tsdoc-edge", "module-spec", "parser"]
    },
    {
      "id": "REQ-TSDOC-EDGE-UNUSED-DOC-DETECTOR",
      "title": "UnusedDocumentDetector must detect unreferenced and code-disconnected managed documents accurately via checkpoint and source links",
      "tags": ["tsdoc-edge", "doc-hygiene", "ssot"]
    }
  ],
  "edges": [
    {
      "kind": "contains",
      "from": "spec:TsdocEdgePlatformSpecification",
      "to": "REQ-TSDOC-EDGE-CHECKPOINT-REGISTRY-SSOT"
    },
    {
      "kind": "contains",
      "from": "spec:TsdocEdgePlatformSpecification",
      "to": "REQ-TSDOC-EDGE-AUTHORED-SPEC-EXTRACTION"
    },
    {
      "kind": "contains",
      "from": "spec:TsdocEdgePlatformSpecification",
      "to": "REQ-TSDOC-EDGE-WORK-CONTEXT-DELIVERY"
    },
    {
      "kind": "contains",
      "from": "spec:TsdocEdgePlatformSpecification",
      "to": "REQ-TSDOC-EDGE-DESIGN-CONTEXT-DELIVERY"
    },
    {
      "kind": "contains",
      "from": "spec:TsdocEdgePlatformSpecification",
      "to": "REQ-TSDOC-EDGE-MODULE-SPEC-TAG-PARSER"
    },
    {
      "kind": "contains",
      "from": "spec:TsdocEdgePlatformSpecification",
      "to": "REQ-TSDOC-EDGE-UNUSED-DOC-DETECTOR"
    }
  ],
  "bindings": [
    {
      "id": "BIND-TSDOC-EDGE-CHECKPOINT-REGISTRY-SSOT",
      "kind": "implementation",
      "specNodeId": "REQ-TSDOC-EDGE-CHECKPOINT-REGISTRY-SSOT",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/doc-symbol/DocumentSymbolRegistry.ts#DocumentSymbolRegistry:class"
      }
    },
    {
      "id": "BIND-TSDOC-EDGE-AUTHORED-SPEC-EXTRACTION",
      "kind": "implementation",
      "specNodeId": "REQ-TSDOC-EDGE-AUTHORED-SPEC-EXTRACTION",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/spec-graph/ManagedSpecExtractor.ts#extractManagedSpecGraph:function"
      }
    },
    {
      "id": "BIND-TSDOC-EDGE-WORK-CONTEXT-DELIVERY",
      "kind": "implementation",
      "specNodeId": "REQ-TSDOC-EDGE-WORK-CONTEXT-DELIVERY",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/commands/WorkContextCommand.ts#WorkContextCommand:class"
      }
    },
    {
      "id": "BIND-TSDOC-EDGE-DESIGN-CONTEXT-DELIVERY",
      "kind": "implementation",
      "specNodeId": "REQ-TSDOC-EDGE-DESIGN-CONTEXT-DELIVERY",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/commands/DesignContextCommand.ts#DesignContextCommand:class"
      }
    },
    {
      "id": "BIND-TSDOC-EDGE-MODULE-SPEC-TAG-PARSER",
      "kind": "implementation",
      "specNodeId": "REQ-TSDOC-EDGE-MODULE-SPEC-TAG-PARSER",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/parser/ModuleSpecTagParser.ts#ModuleSpecTagParser:class"
      }
    },
    {
      "id": "BIND-TSDOC-EDGE-UNUSED-DOC-DETECTOR",
      "kind": "implementation",
      "specNodeId": "REQ-TSDOC-EDGE-UNUSED-DOC-DETECTOR",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/spec/UnusedDocumentDetector.ts#UnusedDocumentDetector:class"
      }
    }
  ]
}
```

## 개요 (Purpose)

파일을 수정하기 전에 작업자와 AI 에이전트에게 필요한 **관련 명세·설계 의사결정·의존 타입·테스트·변경 영향 범위**를 단일 진실 공급원([[SSOT]])으로부터 즉시 제공하고, 문서와 코드 사이의 드리프트를 리비전 단위로 차단합니다.

- **존재 이유**: `@microsoft/tsdoc`은 주석 문법만 정의하고 `ttsc`는 컴파일러 사실과 린트 실행기만 제공하므로, **"문서 체크포인트 ↔ 코드 심볼 ↔ 테스트 증거 ↔ 아키텍처 정책"을 양방향으로 연결하고 적합성(Conformance)을 판정하는 도메인 모델**은 오직 `tsdoc-edge`가 소유합니다.
- **비소유 및 위임(Delegated Non-Scope) 경계**:
  - `/** ... */` 기본 어휘 문법과 표준 태그 29종 정의는 [[TSDocStandardSpecification]]에 위임합니다.
  - TypeScript 7 타입체크, 원시 구조 토폴로지 추출(`superseded` C2 판정), Go 린트 프로세스 실행은 [[TtscPlatformSpecification]]에 위임합니다.
  - 코드 포맷팅 및 로컬 문법 스타일 검사는 Biome([[Lint Governance]])에 위임합니다.

## 핵심 개념 (Core Concepts: Input · Context · Logic)

### 1. 체크포인트 기반 평탄화 문서 체계 (Input)

[^DocumentSymbolParser]와 [^DocumentSymbolRegistry], [^BacklinkGenerator]가 관리하는 `managed/` 마크다운 계약입니다.

- **Primary Checkpoint (`# [[SymbolName]]`)**: 워크스페이스 전체에서 정확히 1개만 존재하는 H1 정본 정의.
- **Auxiliary Checkpoint (`## [[SectionSymbol]]`)**: Primary 문서를 보완하는 하위 섹션 체크포인트.
- **Code ↔ Doc 양방향 링크**: 코드의 `@doc [[SymbolName]]` 블록 태그([^TSDocSymbolParser])와 문서의 `[^SymbolName]` / `[^sym-NNN]` 코드 각주 및 `## Backlinks` 섹션이 양방향 그래프를 형성합니다.

### 2. `tsdoc-edge` 비환원(Irreducible) 고유 도메인 태그 22종 (Context)

`@microsoft/tsdoc` 표준 29종이나 `ttsc`(`@ttsc/graph` + TypeScript AST)로부터 추론·대체 가능한 중복 태그 41종(레거시 JSDoc 심 7종, `ttsc` 코드 의존성·식별 태그 9종, TSDoc 표준 중복 9종, 내부 동의어·메타 중복 16종)을 전량 제거하고, 오직 **`tsdoc-edge`만이 표현할 수 있는 비환원 도메인 태그 22종**만 `tsdoc.json`에 유지합니다.

| 도메인 축 | 소속 태그 (`tsdoc-edge` 순수 소유 22종) | 정본 위임 경계 (`tsdoc` / `ttsc` 브리지) | 소비자 |
| --- | --- | --- | --- |
| **1. SSOT 체크포인트 라우팅 (1)** | `@doc` (`@doc [[Checkpoint]]`) | 인라인 코드 심볼 참조는 TSDoc 표준 `{@link}` 위임 | [^TSDocSymbolParser], `tools/ttsc-tsdoc` |
| **2. 목적·맥락·계약 (8)** | `@responsibility`, `@problem`, `@solves`, `@context`, `@contract`, `@precondition`, `@postcondition`, `@invariant` | 파라미터·반환·예외·제네릭은 `@param`/`@returns`/`@throws`/`@typeParam` + `ttsc` `type_ref` 위임 | [^EnhancedDocExtractor], [^DesignContextCommand] |
| **3. 모듈 로직 & 부수효과 (4)** | `@functionality`, `@algorithm`, `@complexity`, `@sideEffect` | 상태 변이(`state:`)·외부 I/O(`filesystem:`/`database:`/`network:`)를 `@sideEffect` 단일 태그로 통합; 공개 범위(Scope)는 `@public`/`@internal` + TS AST 위임 | [^ModuleSpecTagParser], [[Module Specification Framework]] |
| **4. 인라인 ADR 트리아드 (3)** | `@decision`, `@rationale`, `@consequences` | 프로젝트 수준 요구사항·아키텍처 불변식은 `managed/specs/` `tsdoc-spec` JSON 블록이 소유 | [^DesignContextCommand], [^EnhancedDocExtractor] |
| **5. 비-AST 의미 관계 & 거버넌스 (6)** | `@relatedTo`, `@enhances`, `@requires`, `@feature`, `@testScenario`, `@deadcode` | 코드 의존성·호출·상속·구현(`calls`/`accesses`/`instantiates`/`type_ref`/`extends`/`implements`)은 `@ttsc/graph` 정본 브리지로 위임 | [[Relationship Ontology]], [^SymbolGraphBuilder], [^SpecCompletenessValidator] |

### 3. 6-플레인 리비전 고정 거버넌스 커널 (Logic)

`tsdoc-edge`는 서로 다른 수명주기를 가진 6개 의미 평면을 혼합하지 않고 불변 리비전 ID로 합성합니다.

1. **Code Plane** ([^GraphRepository]): 정규화된 코드 그래프 리비전(`.tsdoc/canonical-graph.db`).
2. **Spec Plane** ([^extractManagedSpecGraph], [^SpecGraphRepository]): `managed/specs/**/*.md`의 명시적 `tsdoc-spec` 선언 블록만 컴파일한 `SpecGraphRevision`(`.tsdoc/spec-graph.db`, 산문 추론 금지).
3. **Evidence Plane**: Jest 테스트 및 커버리지 아티팩트 리비전.
4. **Enrichment Plane**: TSDoc 도메인 태그 추출 리비전.
5. **Policy & Conformance Plane** ([^EffectiveAnalysisService], [^ConformanceEngine], [^ConventionCheckService]): `.tsdoc.config.json#specGovernance` 네이밍·TSDoc 정책과 컨벤션 팩 바인딩 의무를 합성 평가하고 결과를 불변 히스토리로 보존.
6. **Unsaved Overlay Plane**: LSP 편집 버퍼의 `GraphDelta`(`@overlay` 접미사 노드) 읽기 전용 합성 뷰.

## 핵심 산출물 (Output · Effect · Scope)

- **Output**:
  - 작업 컨텍스트 리포트(`work-context` 인간 친화 / `--llm` XML·Markdown) 및 설계 의사결정 리포트(`design-context`).
  - 불변 리비전 저장소(`.tsdoc/canonical-graph.db`, `.tsdoc/spec-graph.db`) 및 컨벤션 적합성·게이트 리포트(`convention-check:<sha256>`, `convention-gate:<sha256>`).
  - 정직한 읽기 전용 명세 메트릭(`spec metrics`: 완성도·생명주기·SpecGraph·7관점·코드 연결성).
- **Effect**: 명시적 동기화/추출 명령(`sync`, `build`, `spec extract`, `docs backlinks`)에서만 영속 저장소를 갱신하며, 조회·검증 명령(`work-context`, `design-context`, `spec metrics`, `convention check`, `sync --check`, LSP, MCP)은 상태를 변이시키지 않습니다.
- **Scope**: 정본 20개 최상위 CLI 명령어([[CliCommandSurfaceSpecification]]), 5대 불변 리비전 저장소 및 정규 그래프 분석 계층([[GraphAndPersistencePlaneSpecification]]), `tsdoc-edge-lsp` 서버 및 커버리지 표면([[LspAndCoverageSurfaceSpecification]], [[LSP Integration]]), 9종 읽기 전용 MCP 서버([[MCP Integration]]) 및 프로그래밍 라이브러리 API(`dist/index.js`).

## 사용 시나리오 (Usage Scenarios)

### 시나리오 1: 파일 수정 전 작업 및 설계 컨텍스트 즉시 확보

대상 파일의 관련 기획·명세 문서, 의존 타입, 테스트 파일, 상·하류 영향 범위를 한 번에 조회합니다([^WorkContextCommand], [^DesignContextCommand]).

```bash
node dist/cli.js work-context src/convention/ConventionCheckService.ts --llm
node dist/cli.js design-context src/indexer/ProjectIndexer.ts
```

### 시나리오 2: 작성된 프로젝트 명세(`managed/specs/`) 컴파일 및 적합성 게이트 실행

`type: project-spec` 문서의 `tsdoc-spec` 선언을 `SpecGraphRevision`으로 추출하고 정규 코드 그래프 리비전 대비 구현 바인딩과 네이밍 정책을 검증합니다.

```bash
node dist/cli.js spec extract --spec-db .tsdoc/spec-graph.db
node dist/cli.js convention check --pack managed/conventions/tsdoc-edge-core-policy.json --graph-db .tsdoc/canonical-graph.db --spec-db .tsdoc/spec-graph.db --json
```

### 시나리오 3: 관리 문서 SSOT 무결성 및 명세 건강도 측정

중복 H1 체크포인트·깨진 각주·미사용 문서 여부를 검증([^UnusedDocumentDetector])하고 `managed/specs`의 정량 완성도를 확인합니다.

```bash
node dist/cli.js validate docs managed
node dist/cli.js docs find-unused managed --json
node dist/cli.js spec metrics --dir managed/specs --detail
```

## CLI 명령어 (CLI Commands)

- `tsdoc-edge sync [--check] [--dry-run] [--force]`: 3계층 SSOT 일괄 동기화 및 CI 검증.
- `tsdoc-edge work-context <file> [--llm]`: 수정 전 필수 컨텍스트 조회.
- `tsdoc-edge design-context <file>`: 규범 명세 바인딩 및 `@contract`, `@decision`, `@rationale` 추적.
- `tsdoc-edge spec extract` / `tsdoc-edge spec metrics`: 명세 그래프 컴파일 및 다차원 메트릭 조회.
- `tsdoc-edge convention check`: 코드·명세·증거·네이밍 리비전 고정 적합성 검증.
- `tsdoc-edge validate docs managed`: `[[Checkpoint]]` SSOT 및 연결 무결성 검증.

## 설계 결정 및 경계 가이드 (Design Decisions)

1. **산문 추론 금지 (Explicit `tsdoc-spec` Only)**: 자연어 설명은 작업자 이해를 돕지만 적합성 게이트의 요구사항이나 코드 바인딩으로 암묵 추론하지 않으며, 오직 `tsdoc-spec` JSON 블록만 `SpecGraphRevision`에 반영합니다.
2. **평가되지 않은 지표의 허위 보고 금지**: `spec metrics`는 적합성 엔진을 직접 실행하지 않으므로 `conformanceEvaluated: false`로 명시 보고하고 건강도 가중치에서 제외합니다.

## 관련 기능 (Related Concepts)

- [[AuthoredProjectSpecifications]]
- [[TSDocStandardSpecification]]
- [[TtscPlatformSpecification]]
- [[CrossSpecIntegrationContract]]
- [[CliCommandSurfaceSpecification]]
- [[GraphAndPersistencePlaneSpecification]]
- [[LspAndCoverageSurfaceSpecification]]
- [[MCP Integration]]
- [[SSOT]]
- [[Module Specification Framework]]
- [[Relationship Ontology]]
- [[Convention Pack Check]]
- [[WorkContextCommand]]

---

## Backlinks

### Referenced By

- [[DesignContextCommand]] → managed/commands/DesignContextCommand.md:41
- [[MCP Integration]] → managed/features/mcp-integration.md:65
- [[ConventionCheck]] → managed/specs/conventions/convention-check.md:200
- [[CliCommandSurfaceSpecification]] → managed/specs/domains/cli-command-surface-spec.md:399
- [[CrossSpecIntegrationContract]] → managed/specs/domains/cross-spec-integration-contract.md:17
- [[GraphAndPersistencePlaneSpecification]] → managed/specs/domains/graph-and-persistence-plane-spec.md:255
- [[LspAndCoverageSurfaceSpecification]] → managed/specs/domains/lsp-and-coverage-surface-spec.md:267
- [[TSDocStandardSpecification]] → managed/specs/domains/tsdoc-standard-spec.md:16
- [[TtscPlatformSpecification]] → managed/specs/domains/ttsc-platform-spec.md:16
- [[AuthoredProjectSpecifications]] → managed/specs/index.md:42

### Implemented By

- TsdocEdgePlatformSpecification → src/spec-graph/ManagedSpecExtractor.ts:1
- TSDocSymbolParser → src/doc-symbol/TSDocSymbolParser.ts:23
- TSDOC_EDGE_CUSTOM_TAGS → src/parser/TSDocParser.ts:49
- assertValidatedBindingResolutionSet → src/semantic-graph/EffectiveAnalysisService.ts:59
- EffectiveAnalysisService → src/semantic-graph/EffectiveAnalysisService.ts:77
- createRuleSetRevision → src/semantic-graph/EffectiveAnalysisService.ts:300
- observedEdgeSemanticDigest → src/semantic-graph/EffectiveAnalysisService.ts:844
- providerAnalysisIdentityFromGraph → src/semantic-graph/EffectiveAnalysisService.ts:857
- ANALYSIS_INPUT_REVISION_CONTRACT_VERSION → src/semantic-graph/analysis-input-revisions.ts:22
- AnalysisInputRevisionPlane → src/semantic-graph/analysis-input-revisions.ts:30
- AnalysisInputItemProvenance → src/semantic-graph/analysis-input-revisions.ts:38
- AnalysisInputRevisionProvenance → src/semantic-graph/analysis-input-revisions.ts:53
- AnalysisInputSourceAnchor → src/semantic-graph/analysis-input-revisions.ts:67
- RawTestEvidenceItem → src/semantic-graph/analysis-input-revisions.ts:82
- ApiSurfaceEvidenceItem → src/semantic-graph/analysis-input-revisions.ts:101
- EvidenceItem → src/semantic-graph/analysis-input-revisions.ts:120
- TsdocTagEnrichment → src/semantic-graph/analysis-input-revisions.ts:128
- TsdocEnrichmentItem → src/semantic-graph/analysis-input-revisions.ts:139
- EnrichmentItem → src/semantic-graph/analysis-input-revisions.ts:156
- EvidenceRevision → src/semantic-graph/analysis-input-revisions.ts:165
- EnrichmentRevision → src/semantic-graph/analysis-input-revisions.ts:182
- CreateEvidenceRevisionInput → src/semantic-graph/analysis-input-revisions.ts:198
- CreateEnrichmentRevisionInput → src/semantic-graph/analysis-input-revisions.ts:210
- createEvidenceRevision → src/semantic-graph/analysis-input-revisions.ts:223
- createEnrichmentRevision → src/semantic-graph/analysis-input-revisions.ts:240
- createCanonicalEmptyEvidenceRevision → src/semantic-graph/analysis-input-revisions.ts:256
- createCanonicalEmptyEnrichmentRevision → src/semantic-graph/analysis-input-revisions.ts:270
- createCanonicalEmptyRevision → src/semantic-graph/analysis-input-revisions.ts:284
- CodeViewStamp → src/semantic-graph/contracts.ts:27
- EffectiveAnalysisInputStamp → src/semantic-graph/contracts.ts:47
- EffectiveAnalysisStamp → src/semantic-graph/contracts.ts:72
- CodeAnalysisView → src/semantic-graph/contracts.ts:83
- SpecAnalysisView → src/semantic-graph/contracts.ts:103
- RevisionInput → src/semantic-graph/contracts.ts:114
- RuleSetRevision → src/semantic-graph/contracts.ts:125
- ProviderAnalysisIdentity → src/semantic-graph/contracts.ts:136
- EffectiveAnalysisInputs → src/semantic-graph/contracts.ts:163
- EffectiveAnalysisSnapshot → src/semantic-graph/contracts.ts:183
- BindingResolutionSet → src/semantic-graph/contracts.ts:202
- EffectiveBindingResolver → src/semantic-graph/contracts.ts:218
- FactOccurrence → src/semantic-graph/fact-topology.ts:83
- CompilerFactTopologyEdge → src/semantic-graph/fact-topology.ts:181
- DerivedTopologyEdge → src/semantic-graph/fact-topology.ts:194
- TopologyEdge → src/semantic-graph/fact-topology.ts:210
- FactTopologyProjection → src/semantic-graph/fact-topology.ts:262
- createFactOccurrence → src/semantic-graph/fact-topology.ts:280
- createDerivedTopologyEdge → src/semantic-graph/fact-topology.ts:328
- buildFactTopologyProjection → src/semantic-graph/fact-topology.ts:386
- assertTopologyEdge → src/semantic-graph/fact-topology.ts:448
- CUSTOM_TAGS → src/types/tags/base.ts:15

