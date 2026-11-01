---
title: LSP and Coverage Surface Specification
type: project-spec
category: specifications
status: active
canonical: true
source: src/lsp/service.ts
tags:
  - tsdoc-edge
  - lsp
  - overlay-plane
  - coverage-metrics
  - spec-metrics
---

# [[LspAndCoverageSurfaceSpecification]]

`tsdoc-edge`의 **실시간 IDE 통합 서비스(`TsdocEdgeService`, `IncrementalBuilder`) 및 미저장 버퍼 오버레이 평면(`OverlayGraphView`, `EffectiveCodeGraphView`), 그리고 정본 커버리지·명세 메트릭 투영 표면(`CoverageReportCommand`, `CoverageBaselineCommand`, `projectCoverageReportToCanonicalNodes`, `SpecMetricsAggregator`)** 의 규범 명세를 정의합니다.

```tsdoc-spec
{
  "requirements": [
    {
      "id": "REQ-LSP-REALTIME-ANALYSIS-SERVICE",
      "title": "TsdocEdgeService must deliver hover, code lens, definition, document link, code action, and diagnostic capabilities over canonical and overlay views",
      "tags": ["lsp", "ide-surface"]
    },
    {
      "id": "REQ-LSP-INCREMENTAL-BUFFER-BUILDER",
      "title": "IncrementalBuilder must extract per-file AST and TSDoc deltas from unsaved editor buffers without mutating persisted SQLite stores",
      "tags": ["lsp", "incremental-builder"]
    },
    {
      "id": "REQ-LSP-OVERLAY-GRAPH-ISOLATION",
      "title": "OverlayGraphView must isolate unsaved editor buffer GraphDelta nodes under explicit overlay provenance without polluting saved revisions",
      "tags": ["lsp", "overlay-plane", "isolation"]
    },
    {
      "id": "REQ-LSP-EFFECTIVE-CODE-GRAPH-COMPOSITION",
      "title": "EffectiveCodeGraphView must deterministically compose saved canonical graph revisions with active per-file overlay deltas",
      "tags": ["lsp", "overlay-plane", "composition"]
    },
    {
      "id": "REQ-COVERAGE-CANONICAL-NODE-PROJECTION",
      "title": "projectCoverageReportToCanonicalNodes must map documentation and runtime test coverage metrics onto exact CanonicalNodeId targets",
      "tags": ["coverage", "canonical-projection"]
    },
    {
      "id": "REQ-COVERAGE-REPORT-COMMAND-CONTRACT",
      "title": "CoverageReportCommand must measure honest documentation.symbol and @doc SSOT link coverage without conflating it with test execution coverage",
      "tags": ["coverage", "cli-contract"]
    },
    {
      "id": "REQ-COVERAGE-BASELINE-GATE-CONTRACT",
      "title": "CoverageBaselineCommand must persist and verify revision-pinned coverage metric baselines against regression thresholds",
      "tags": ["coverage", "baseline-gate"]
    },
    {
      "id": "REQ-SPEC-METRICS-HONEST-AGGREGATION",
      "title": "SpecMetricsAggregator must report measured completeness, lifecycle, SpecGraph counts, 7-aspect coverage, and code-link integrity without fabricating unevaluated conformance scores",
      "tags": ["spec-metrics", "honest-telemetry"]
    }
  ],
  "edges": [
    {
      "kind": "contains",
      "from": "spec:LspAndCoverageSurfaceSpecification",
      "to": "REQ-LSP-REALTIME-ANALYSIS-SERVICE"
    },
    {
      "kind": "contains",
      "from": "spec:LspAndCoverageSurfaceSpecification",
      "to": "REQ-LSP-INCREMENTAL-BUFFER-BUILDER"
    },
    {
      "kind": "contains",
      "from": "spec:LspAndCoverageSurfaceSpecification",
      "to": "REQ-LSP-OVERLAY-GRAPH-ISOLATION"
    },
    {
      "kind": "contains",
      "from": "spec:LspAndCoverageSurfaceSpecification",
      "to": "REQ-LSP-EFFECTIVE-CODE-GRAPH-COMPOSITION"
    },
    {
      "kind": "contains",
      "from": "spec:LspAndCoverageSurfaceSpecification",
      "to": "REQ-COVERAGE-CANONICAL-NODE-PROJECTION"
    },
    {
      "kind": "contains",
      "from": "spec:LspAndCoverageSurfaceSpecification",
      "to": "REQ-COVERAGE-REPORT-COMMAND-CONTRACT"
    },
    {
      "kind": "contains",
      "from": "spec:LspAndCoverageSurfaceSpecification",
      "to": "REQ-COVERAGE-BASELINE-GATE-CONTRACT"
    },
    {
      "kind": "contains",
      "from": "spec:LspAndCoverageSurfaceSpecification",
      "to": "REQ-SPEC-METRICS-HONEST-AGGREGATION"
    }
  ],
  "bindings": [
    {
      "id": "BIND-LSP-REALTIME-ANALYSIS-SERVICE",
      "kind": "implementation",
      "specNodeId": "REQ-LSP-REALTIME-ANALYSIS-SERVICE",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/lsp/service.ts#TsdocEdgeService:class"
      }
    },
    {
      "id": "BIND-LSP-INCREMENTAL-BUFFER-BUILDER",
      "kind": "implementation",
      "specNodeId": "REQ-LSP-INCREMENTAL-BUFFER-BUILDER",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/lsp/incremental-builder.ts#IncrementalBuilder:class"
      }
    },
    {
      "id": "BIND-LSP-OVERLAY-GRAPH-ISOLATION",
      "kind": "implementation",
      "specNodeId": "REQ-LSP-OVERLAY-GRAPH-ISOLATION",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/lsp/overlay/OverlayGraphView.ts#OverlayGraphView:class"
      }
    },
    {
      "id": "BIND-LSP-EFFECTIVE-CODE-GRAPH-COMPOSITION",
      "kind": "implementation",
      "specNodeId": "REQ-LSP-EFFECTIVE-CODE-GRAPH-COMPOSITION",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/lsp/overlay/EffectiveCodeGraphView.ts#EffectiveCodeGraphView:class"
      }
    },
    {
      "id": "BIND-COVERAGE-CANONICAL-NODE-PROJECTION",
      "kind": "implementation",
      "specNodeId": "REQ-COVERAGE-CANONICAL-NODE-PROJECTION",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/metrics/CanonicalCoverageProjection.ts#projectCoverageReportToCanonicalNodes:function"
      }
    },
    {
      "id": "BIND-COVERAGE-REPORT-COMMAND-CONTRACT",
      "kind": "implementation",
      "specNodeId": "REQ-COVERAGE-REPORT-COMMAND-CONTRACT",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/commands/CoverageReportCommand.ts#CoverageReportCommand:class"
      }
    },
    {
      "id": "BIND-COVERAGE-BASELINE-GATE-CONTRACT",
      "kind": "implementation",
      "specNodeId": "REQ-COVERAGE-BASELINE-GATE-CONTRACT",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/commands/CoverageBaselineCommand.ts#CoverageBaselineCommand:class"
      }
    },
    {
      "id": "BIND-SPEC-METRICS-HONEST-AGGREGATION",
      "kind": "implementation",
      "specNodeId": "REQ-SPEC-METRICS-HONEST-AGGREGATION",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/spec/SpecMetricsAggregator.ts#SpecMetricsAggregator:class"
      }
    }
  ]
}
```

## 개요 (Purpose)

에디터 미저장 편집 세션에서도 영속 정본 DB를 오염시키지 않고 실시간 영향도·문서 링크·컨벤션 진단을 제공하는 **LSP + Unsaved Overlay 평면([[LSP Integration]])** 과, 문서화·테스트·명세 완성도 지표를 정규 코드 그래프 노드에 정직하게 투영하는 **커버리지·명세 메트릭 계약([[Coverage Metrics Contract]])** 을 정의합니다.

## 핵심 개념 (Core Concepts: Input · Context · Logic)

### 1. LSP 서버 및 6번째 평면(Unsaved Overlay Plane) 합성 (Input & Logic)

1. **증분 버퍼 추출**: 에디터가 `textDocument/didChange` 이벤트를 보내면 [^IncrementalBuilder]가 메모리 내 버퍼의 TypeScript AST와 TSDoc 주석 변경분을 파싱하여 파일 단위 `GraphDelta`를 생성합니다.
2. **오버레이 격리 및 유효 그래프 합성**: [^OverlayGraphView]는 미저장 변경분을 `@overlay` 프로비넌스로 격리 보관하고, [^EffectiveCodeGraphView]가 저장된 활성 `CanonicalProjectGraph` 리비전 위에 오버레이 델타를 읽기 전용으로 합성합니다.
3. **IDE 기능 제공**: [^TsdocEdgeService]는 합성된 뷰와 `DocumentSymbolRegistry`, `CacheManager`, `StatementManager`를 결합하여 Hover(심볼 요약 + 상·하류 영향도), Code Lens(`↓downstream ↑upstream`), Document Link(`[[Checkpoint]]` 클릭 이동), Definition, Code Action, 컨벤션·아키텍처 Diagnostics를 실시간 반환합니다.

### 2. 정본 노드 커버리지 투영 및 정직한 명세 메트릭 (Context & Logic)

1. **정본 노드 투영**: [^projectCoverageReportToCanonicalNodes]는 TSDoc 문서화 커버리지, LCOV/Jest 함수 실행 커버리지, 테스트 심볼 검증 커버리지를 정규 `CanonicalNodeId` 단위로 정밀 매핑하고 신뢰도(`confidence`)와 `graphFingerprint`를 기록합니다.
2. **명칭 혼동 없는 커버리지 리포트**: [^CoverageReportCommand]는 `documentation.symbol` 및 `@doc [[Checkpoint]]` SSOT 연결률을 측정하며(테스트 실행률과 혼동 금지), [^CoverageBaselineCommand]는 `.tsdoc/coverage-metrics.db`에 리비전 고정 베이스라인 리포트를 기록·검증합니다.
3. **허위 추정 없는 명세 건강도**: [^SpecMetricsAggregator]는 (1) 명세 완성도(30%), (2) 생명주기 비율(20%), (3) 소스 파일 7관점 태그 분포(20%), (4) 코드 `doc-reference` 및 각주 해소율(30%)만 실측 합산하며, 실행하지 않은 적합성 판정은 `conformanceEvaluated: false`로 명시 분리합니다.

## 핵심 산출물 (Output · Effect · Scope)

- **Output**:
  - LSP JSON-RPC 응답(Hover, CodeLens, DocumentLink, Location, CodeAction, Diagnostic 배열).
  - `CanonicalCoverageProjection` 리포트 및 `UnifiedSpecMetrics` 건강도 리포트.
- **Effect**: LSP 오버레이와 `coverage-report` / `spec metrics` 조회는 영속 DB를 변이시키지 않으며, 오직 `coverage-baseline record` 실행 시에만 `.tsdoc/coverage-metrics.db`에 불변 리포트를 추가합니다.
- **Scope**: `src/lsp/**` 실시간 IDE 통합 계층, `src/metrics/**` 커버리지 투영 계층, `src/spec/SpecMetricsAggregator.ts`, `CoverageReportCommand`, `CoverageBaselineCommand`.

## 사용 시나리오 (Usage Scenarios)

### 시나리오 1: IDE용 TSDoc Edge LSP 서버 구동

에디터 확장 또는 언어 클라이언트에서 `node dist/lsp/server.js`를 실행하여 [^TsdocEdgeService]와 [^EffectiveCodeGraphView] 기반 실시간 분석을 활성화합니다.

```bash
node dist/lsp/server.js --stdio
```

### 시나리오 2: SSOT `@doc` 커버리지 측정 및 리비전 고정 베이스라인 기록

[^CoverageReportCommand]와 [^CoverageBaselineCommand]로 문서화 및 체크포인트 연결 커버리지를 측정하고 컨벤션 게이트용 베이스라인을 생성합니다.

```bash
tsdoc-edge coverage-report --json
tsdoc-edge coverage-baseline status --json
```

### 시나리오 3: 작성된 명세(`managed/specs`)의 다차원 완성도 및 코드 연결성 감사

[^SpecMetricsAggregator]를 통해 명세 완성도, 7관점 커버리지, 코드 각주 무결성을 단일 리포트로 확인합니다.

```bash
tsdoc-edge spec metrics --dir managed/specs --detail
```

## CLI 명령어 (CLI Commands)

- `node dist/lsp/server.js`: 실시간 IDE 통합 LSP 서버 실행.
- `tsdoc-edge coverage-report [--threshold <n>] [--json]`: SSOT `@doc` 및 문서화 커버리지 측정.
- `tsdoc-edge coverage-baseline <record|status|verify>`: 리비전 고정 커버리지 메트릭 리포트 기록 및 회귀 검증.
- `tsdoc-edge spec metrics [--dir <dir>] [--file <path>] [--detail] [--json]`: 명세 완성도·생명주기·7관점·코드 연결성 측정.

## 설계 결정 및 경계 가이드 (Design Decisions)

1. **미저장 오버레이의 영속 저장소 유입 절대 금지**: 에디터 미저장 버퍼에서 파생된 `@overlay` 노드는 메모리 내 [^OverlayGraphView]에만 존재하며, `.tsdoc/canonical-graph.db`나 `ConventionCheckHistoryRepository`의 릴리스 적합성 증거로 절대 승격될 수 없습니다.
2. **문서 커버리지와 런타임 테스트 커버리지의 엄격 분리**: 모든 메트릭은 `documentation.symbol`, `execution.line`, `verification.symbol_test` 등 명시적 메트릭 ID로 구분하여 단일 퍼센트 숫자의 의미 오염을 차단합니다([[Coverage Metrics Contract]]).

## 관련 기능 (Related Concepts)

- [[AuthoredProjectSpecifications]]
- [[TsdocEdgePlatformSpecification]]
- [[GraphAndPersistencePlaneSpecification]]
- [[LSP Integration]]
- [[MCP Integration]]
- [[Coverage Metrics Contract]]
- [[CoverageReportCommand]]
- [[SpecMetricsAggregator]]

---

## Backlinks

### Referenced By

- [[MCP Integration]] → managed/features/mcp-integration.md:66
- [[TsdocEdgePlatformSpecification]] → managed/specs/domains/tsdoc-edge-platform-spec.md:206
- [[AuthoredProjectSpecifications]] → managed/specs/index.md:46

### Implemented By

- LspAndCoverageSurfaceSpecification → src/lsp/service.ts:1
- CoverageBaselineCommand → src/commands/CoverageBaselineCommand.ts:31
- CacheEntry → src/lsp/cache-manager.ts:25
- CacheManagerOptions → src/lsp/cache-manager.ts:40
- CacheManager → src/lsp/cache-manager.ts:73
- CanonicalLspSymbolLocation → src/lsp/canonical-graph-view.ts:22
- CanonicalLspRelatedSymbol → src/lsp/canonical-graph-view.ts:35
- CanonicalGraphLspView → src/lsp/canonical-graph-view.ts:46
- canonicalNodeDisplayName → src/lsp/canonical-graph-view.ts:156
- SavedConventionDiagnosticData → src/lsp/convention-diagnostics.ts:23
- SavedConventionFindingAnchor → src/lsp/convention-diagnostics.ts:39
- findSavedConventionFindingAnchor → src/lsp/convention-diagnostics.ts:56
- conventionDiagnosticsForFile → src/lsp/convention-diagnostics.ts:119
- DiagnosticInfo → src/lsp/diagnostics.ts:24
- mapCanonicalDiagnostic → src/lsp/diagnostics.ts:50
- toLanguageServerDiagnostic → src/lsp/diagnostics.ts:75
- ExtractedSymbol → src/lsp/incremental-builder.ts:30
- ExtractedRelationship → src/lsp/incremental-builder.ts:52
- IncrementalExtractResult → src/lsp/incremental-builder.ts:67
- BuildEventCallback → src/lsp/incremental-builder.ts:82
- IncrementalBuilder → src/lsp/incremental-builder.ts:101
- RetainedConventionFixPlan → src/lsp/mutating-code-action.ts:93
- ValidatedMutatingCodeAction → src/lsp/mutating-code-action.ts:163
- ResolvedSavedConventionMutatingActions → src/lsp/mutating-code-action.ts:249
- computeSourceContentDigest → src/lsp/mutating-code-action.ts:281
- parseConventionFixPlanBundle → src/lsp/mutating-code-action.ts:294
- loadConventionFixPlanBundleFile → src/lsp/mutating-code-action.ts:342
- validateRetainedConventionFixPlan → src/lsp/mutating-code-action.ts:399
- resolveSavedConventionMutatingActions → src/lsp/mutating-code-action.ts:642
- EffectiveCodeGraphView → src/lsp/overlay/EffectiveCodeGraphView.ts:30
- GraphDeltaEdgeKey → src/lsp/overlay/GraphDelta.ts:31
- GRAPH_DELTA_CONTRACT_VERSION → src/lsp/overlay/GraphDelta.ts:44
- GraphDeltaRelationshipCoverage → src/lsp/overlay/GraphDelta.ts:53
- GraphDeltaExtractorIdentity → src/lsp/overlay/GraphDelta.ts:62
- LSP_SYNTAX_GRAPH_DELTA_EXTRACTOR → src/lsp/overlay/GraphDelta.ts:79
- GraphDeltaIdentityRemap → src/lsp/overlay/GraphDelta.ts:92
- GraphDeltaProviderSourceContext → src/lsp/overlay/GraphDelta.ts:104
- GraphDelta → src/lsp/overlay/GraphDelta.ts:122
- GraphDeltaBuilder → src/lsp/overlay/GraphDelta.ts:153
- CodeGraphRevision → src/lsp/overlay/GraphDelta.ts:416
- EffectiveCodeGraph → src/lsp/overlay/GraphDelta.ts:428
- applyGraphDelta → src/lsp/overlay/GraphDelta.ts:444
- composeGraphDeltas → src/lsp/overlay/GraphDelta.ts:456
- OverlayGraphView → src/lsp/overlay/OverlayGraphView.ts:21
- CodeLensInfo → src/lsp/service.ts:84
- SymbolSearchResult → src/lsp/service.ts:101
- TsdocEdgeServiceOptions → src/lsp/service.ts:121
- TsdocEdgeService → src/lsp/service.ts:162
- StatementManagerOptions → src/lsp/statement-manager.ts:38
- StatementManager → src/lsp/statement-manager.ts:63
- filePathFromUri → src/lsp/uri.ts:20
- fileUriFromPath → src/lsp/uri.ts:36
- resolveWorkspaceRoot → src/lsp/uri.ts:49
- isTypeScriptSourcePath → src/lsp/uri.ts:68

