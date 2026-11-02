---
title: Graph and Persistence Plane Specification
type: project-spec
category: specifications
status: active
canonical: true
source: src/storage/GraphRepository.ts
tags:
  - tsdoc-edge
  - persistence
  - canonical-graph
  - graph-analysis
---

# [[GraphAndPersistencePlaneSpecification]]

`tsdoc-edge`의 **불변 콘텐츠 주소 지정(Content-Addressed) 리비전 저장소 5종(`GraphRepository`, `SpecGraphRepository`, `AnalysisInputRevisionRepository`, `ConventionCheckHistoryRepository`, `CoverageMetricReportRepository`)과 정규 `@ttsc/graph` 인메모리 분석 엔진(`GraphAnalysisService`, `CanonicalGraphIndex`)** 의 규범 계약을 정의합니다.

```tsdoc-spec
{
  "requirements": [
    {
      "id": "REQ-PERSISTENCE-CANONICAL-GRAPH-REPOSITORY",
      "title": "GraphRepository must persist immutable content-addressed CanonicalProjectGraph revisions with atomic active-pointer promotion",
      "tags": ["storage", "canonical-graph", "immutability"]
    },
    {
      "id": "REQ-PERSISTENCE-SPEC-GRAPH-REPOSITORY",
      "title": "SpecGraphRepository must persist immutable compiled SpecGraphRevision snapshots derived strictly from authored tsdoc-spec declarations",
      "tags": ["storage", "spec-graph", "immutability"]
    },
    {
      "id": "REQ-PERSISTENCE-ANALYSIS-INPUT-REVISIONS",
      "title": "AnalysisInputRevisionRepository must store content-addressed evidence, enrichment, and policy plane snapshots",
      "tags": ["storage", "analysis-inputs", "revisions"]
    },
    {
      "id": "REQ-PERSISTENCE-CONVENTION-HISTORY-REPLAY",
      "title": "ConventionCheckHistoryRepository must retain self-contained convention check records enabling deterministic bit-exact replay",
      "tags": ["storage", "convention-history", "replay"]
    },
    {
      "id": "REQ-PERSISTENCE-COVERAGE-METRIC-REPOSITORY",
      "title": "CoverageMetricReportRepository must persist source-identified coverage metric reports pinned to canonical graph fingerprints",
      "tags": ["storage", "coverage-metrics"]
    },
    {
      "id": "REQ-GRAPH-ANALYSIS-CANONICAL-SERVICE",
      "title": "GraphAnalysisService must execute deterministic dependency, impact, cycle, path, and cluster queries exclusively over canonical graph revisions",
      "tags": ["graph-analysis", "canonical-graph"]
    },
    {
      "id": "REQ-GRAPH-ANALYSIS-IMMUTABLE-INDEX",
      "title": "CanonicalGraphIndex must build frozen forward/reverse adjacency indexes over canonical nodes and semantic edge policies",
      "tags": ["graph-analysis", "adjacency-index"]
    },
    {
      "id": "REQ-GRAPH-ANALYSIS-DATA-TRACE-SERVICE",
      "title": "DataTraceService must execute deterministic 3-tier data tracing (Type/Field roles and shared-state junctions, non-collapsing cross-boundary domain lineage, and fail-closed AST variable/parameter slicing) over canonical graph revisions",
      "tags": ["graph-analysis", "data-trace", "lineage", "ast-slicing"]
    }
  ],
  "edges": [
    {
      "kind": "contains",
      "from": "spec:GraphAndPersistencePlaneSpecification",
      "to": "REQ-PERSISTENCE-CANONICAL-GRAPH-REPOSITORY"
    },
    {
      "kind": "contains",
      "from": "spec:GraphAndPersistencePlaneSpecification",
      "to": "REQ-PERSISTENCE-SPEC-GRAPH-REPOSITORY"
    },
    {
      "kind": "contains",
      "from": "spec:GraphAndPersistencePlaneSpecification",
      "to": "REQ-PERSISTENCE-ANALYSIS-INPUT-REVISIONS"
    },
    {
      "kind": "contains",
      "from": "spec:GraphAndPersistencePlaneSpecification",
      "to": "REQ-PERSISTENCE-CONVENTION-HISTORY-REPLAY"
    },
    {
      "kind": "contains",
      "from": "spec:GraphAndPersistencePlaneSpecification",
      "to": "REQ-PERSISTENCE-COVERAGE-METRIC-REPOSITORY"
    },
    {
      "kind": "contains",
      "from": "spec:GraphAndPersistencePlaneSpecification",
      "to": "REQ-GRAPH-ANALYSIS-CANONICAL-SERVICE"
    },
    {
      "kind": "contains",
      "from": "spec:GraphAndPersistencePlaneSpecification",
      "to": "REQ-GRAPH-ANALYSIS-IMMUTABLE-INDEX"
    },
    {
      "kind": "contains",
      "from": "spec:GraphAndPersistencePlaneSpecification",
      "to": "REQ-GRAPH-ANALYSIS-DATA-TRACE-SERVICE"
    }
  ],
  "bindings": [
    {
      "id": "BIND-PERSISTENCE-CANONICAL-GRAPH-REPOSITORY",
      "kind": "implementation",
      "specNodeId": "REQ-PERSISTENCE-CANONICAL-GRAPH-REPOSITORY",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/storage/GraphRepository.ts#GraphRepository:class"
      }
    },
    {
      "id": "BIND-PERSISTENCE-SPEC-GRAPH-REPOSITORY",
      "kind": "implementation",
      "specNodeId": "REQ-PERSISTENCE-SPEC-GRAPH-REPOSITORY",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/storage/SpecGraphRepository.ts#SpecGraphRepository:class"
      }
    },
    {
      "id": "BIND-PERSISTENCE-ANALYSIS-INPUT-REVISIONS",
      "kind": "implementation",
      "specNodeId": "REQ-PERSISTENCE-ANALYSIS-INPUT-REVISIONS",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/storage/AnalysisInputRevisionRepository.ts#AnalysisInputRevisionRepository:class"
      }
    },
    {
      "id": "BIND-PERSISTENCE-CONVENTION-HISTORY-REPLAY",
      "kind": "implementation",
      "specNodeId": "REQ-PERSISTENCE-CONVENTION-HISTORY-REPLAY",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/storage/ConventionCheckHistoryRepository.ts#ConventionCheckHistoryRepository:class"
      }
    },
    {
      "id": "BIND-PERSISTENCE-COVERAGE-METRIC-REPOSITORY",
      "kind": "implementation",
      "specNodeId": "REQ-PERSISTENCE-COVERAGE-METRIC-REPOSITORY",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/storage/CoverageMetricReportRepository.ts#CoverageMetricReportRepository:class"
      }
    },
    {
      "id": "BIND-GRAPH-ANALYSIS-CANONICAL-SERVICE",
      "kind": "implementation",
      "specNodeId": "REQ-GRAPH-ANALYSIS-CANONICAL-SERVICE",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/graph-analysis/GraphAnalysisService.ts#GraphAnalysisService:class"
      }
    },
    {
      "id": "BIND-GRAPH-ANALYSIS-IMMUTABLE-INDEX",
      "kind": "implementation",
      "specNodeId": "REQ-GRAPH-ANALYSIS-IMMUTABLE-INDEX",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/graph-analysis/CanonicalGraphIndex.ts#CanonicalGraphIndex:class"
      }
    },
    {
      "id": "BIND-GRAPH-ANALYSIS-DATA-TRACE-SERVICE",
      "kind": "implementation",
      "specNodeId": "REQ-GRAPH-ANALYSIS-DATA-TRACE-SERVICE",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/graph-analysis/DataTraceService.ts#DataTraceService:class"
      }
    }
  ]
}
```

## 개요 (Purpose)

코드 그래프, 명세 그래프, 테스트/TSDoc 분석 입력, 적합성 판정 이력, 커버리지 메트릭이 서로 덮어쓰거나 시간차 드리프트를 일으키지 않도록 **SHA-256 콘텐츠 주소 지정 기반 불변 리비전 저장소**와 **결정론적 정규 그래프 질의 계층**을 정의합니다.

## 핵심 개념 (Core Concepts: Input · Context · Logic)

### 1. 5대 불변 리비전 SQLite 저장소 (Input & Context)

| 저장소 클래스 | 기본 DB 경로 | 소유 평면 및 불변식 |
| --- | --- | --- |
| [^GraphRepository] | `.tsdoc/canonical-graph.db` | **Code Plane** — 정규화된 `CanonicalProjectGraph` 스냅샷, 활성 리비전 포인터 승격, 보존 개수(`maxRetainedRevisions`) 기반 프루닝 |
| [^SpecGraphRepository] | `.tsdoc/spec-graph.db` | **Spec Plane** — `managed/specs/`에서 컴파일된 불변 `SpecGraphRevision` 저장 및 원자적 활성 리비전 전환 |
| [^AnalysisInputRevisionRepository] | `.tsdoc/analysis-inputs.db` | **Evidence · Enrichment · Policy Planes** — `(plane, workspaceId, revisionId)` 핀 기반 불변 입력 페이로드 보존 |
| [^ConventionCheckHistoryRepository] | `.tsdoc/convention-history.db` | **Conformance Audit Plane** — 판정 결과·입력·팩·게이트를 함께 보존하여 `--replay <history-id>` 비트 단위 재현 및 핀/GC 지원 |
| [^CoverageMetricReportRepository] | `.tsdoc/coverage-metrics.db` | **Coverage Metric Plane** — 그래프 리비전 지문(`graphFingerprint`)에 귀속된 커버리지 리포트 보존 |

- **읽기 전용 격리(`readOnly: true`)**: 조회·검증 커맨드(`wc`, `dc`, `system-status`, `convention check`, `relationship`, `ontology`, LSP, MCP)는 항상 `{ readOnly: true }` 모드로 저장소를 열어 WAL/SHM 변이나 암묵적 스키마 생성을 차단합니다.
- **보조 인덱스 DB와의 분리**: `DatabaseManager`(`src/storage/DatabaseManager.ts`, `.tsdoc.db`)와 `JSONLExporter`는 TSDoc 도메인 태그 강화 및 빠른 전문 검색을 위한 파생 보조 저장소이며, 구조 토폴로지 정본은 오직 [^GraphRepository]가 소유합니다.

### 2. 정규 그래프 인메모리 분석 커널 (Logic)

1. [^CanonicalGraphIndex]는 활성 `CanonicalProjectGraph`의 노드·엣지·별칭(`CanonicalAliasContext`)을 정렬·동결(`Object.freeze`)된 순방향/역방향 인접 리스트로 인덱싱합니다.
2. `edge-semantics.ts`([^graphEdgeSemantic])는 `@ttsc/graph`의 6종 정규 엣지(`calls`, `accesses`, `instantiates`, `type_ref`, `extends`, `implements`)와 포함 관계(`contains`)를 질의 정책별(`impact`, `dependencies`, `type-chain`, `hierarchy`)로 분류합니다.
3. [^GraphAnalysisService]는 [^CanonicalGraphIndex] 위에서 전방/역방향 의존성, 다중 홉 변경 영향도(`impact`), 최단 경로(`path`), 강결합 순환(`cycles`), 중심성 메트릭(`metrics`), 모듈 클러스터(`clusters`)를 순수 결정론적 함수로 계산합니다.

## 핵심 산출물 (Output · Effect · Scope)

- **Output**: 콘텐츠 해시로 식별되는 불변 리비전 레코드(`revisionId`, `fingerprint`)와 정렬·동결된 그래프 분석 결과 객체.
- **Effect**: 쓰기 트랜잭션은 명시적 인덱싱·추출·기록·프루닝 시점에만 원자적으로 수행되며, 동일 `revisionId`에 상이한 페이로드를 기록하려 하면 충돌 예외(`ConflictError`)로 즉시 거부합니다.
- **Scope**: `src/storage/` 불변 리비전 저장소 계층 및 `src/graph-analysis/` 정규 그래프 질의 계층 전체.

## 사용 시나리오 (Usage Scenarios)

### 시나리오 1: 정규 코드 그래프 및 명세 그래프 활성 리비전 조회

[^GraphRepository]와 [^SpecGraphRepository]의 활성 리비전 메타데이터와 보존 상태를 읽기 전용으로 점검합니다.

```bash
tsdoc-edge canonical-graph status --json
tsdoc-edge spec graph status --spec-db .tsdoc/spec-graph.db --json
```

### 시나리오 2: 정규 그래프 기반 다중 홉 영향도 및 중심성 분석

[^CanonicalGraphIndex]와 [^GraphAnalysisService]를 통해 특정 심볼 수정 시 파급되는 하류 의존성과 핵심 허브 심볼을 계산합니다.

```bash
tsdoc-edge relationship impact GraphRepository
tsdoc-edge relationship metrics --top 10
```

### 시나리오 3: 적합성 이력 기록 및 결정론적 리플레이 검증

[^ConventionCheckHistoryRepository]와 [^AnalysisInputRevisionRepository]에 검사 이력을 보존하고 `--replay`로 동일 게이트 해시가 재현되는지 검증합니다.

```bash
tsdoc-edge convention check \
  --pack managed/conventions/tsdoc-edge-core-policy.json \
  --spec-db .tsdoc/spec-graph.db \
  --history-db .tsdoc/convention-history.db \
  --json
```

## CLI 명령어 (CLI Commands)

- `tsdoc-edge canonical-graph <status|list|diff|prune>`: [^GraphRepository] 리비전 상태 조회, 리비전 간 구조 비교 및 보존 정리.
- `tsdoc-edge spec graph <status|list|read>`: [^SpecGraphRepository] 활성/보존 명세 리비전 조회.
- `tsdoc-edge convention inputs <list|read>` / `tsdoc-edge convention retention <list|pin|unpin|gc>`: [^AnalysisInputRevisionRepository] 및 [^ConventionCheckHistoryRepository] 관리.
- `tsdoc-edge relationship <impact|query|path|metrics|clusters>`: [^GraphAnalysisService] 정규 그래프 질의 실행.

## 설계 결정 및 경계 가이드 (Design Decisions)

1. **In-Place UPDATE 금지 (Append & Atomic Pointer Swap)**: 리비전 페이로드는 한 번 기록되면 절대 수정되지 않으며, 상태 전환은 오직 활성 리비전 포인터 교체와 보존 정책 기반 프루닝으로만 이루어집니다.
2. **외부 노드와 내부 노드의 명시적 구분**: [^GraphAnalysisService]는 `external` 심볼(`node_modules` / 표준 라이브러리)과 워크스페이스 내부 심볼을 명확히 분리 집계하여 허수 의존성 오염을 방지합니다.

## 관련 기능 (Related Concepts)

- [[AuthoredProjectSpecifications]]
- [[TsdocEdgePlatformSpecification]]
- [[CrossSpecIntegrationContract]]
- [[Semantic Graph Analysis and Relationship Model]]
- [[Storage System]]
- [[ProjectIndexer]]
- [[ConventionCheck]]

---

## Backlinks

### Referenced By

- [[Data Lineage and Slicing]] → managed/features/data-lineage-and-trace.md:75
- [[LspAndCoverageSurfaceSpecification]] → managed/specs/domains/lsp-and-coverage-surface-spec.md:268
- [[TsdocEdgePlatformSpecification]] → managed/specs/domains/tsdoc-edge-platform-spec.md:206
- [[AuthoredProjectSpecifications]] → managed/specs/index.md:45

### Implemented By

- GraphAndPersistencePlaneSpecification → src/storage/GraphRepository.ts:1
- CanonicalGraphCommand → src/commands/CanonicalGraphCommand.ts:30
- CanonicalGraphIndex → src/graph-analysis/CanonicalGraphIndex.ts:28
- DataTraceService → src/graph-analysis/DataTraceService.ts:123
- RelationshipProjectionOptions → src/graph-analysis/GraphAnalysisService.ts:40
- GraphAnalysisService → src/graph-analysis/GraphAnalysisService.ts:58
- SymbolResolution → src/graph-analysis/contracts.ts:63
- GraphImpactResult → src/graph-analysis/contracts.ts:96
- GraphDegreeMetric → src/graph-analysis/contracts.ts:108
- GraphAnalysisSummary → src/graph-analysis/contracts.ts:138
- RELATION_SEMANTIC_REGISTRY_VERSION → src/graph-analysis/edge-semantics.ts:28
- GraphEdgeSemantic → src/graph-analysis/edge-semantics.ts:37
- graphEdgeSemantic → src/graph-analysis/edge-semantics.ts:279
- ANALYSIS_INPUT_REVISION_REPOSITORY_SCHEMA_VERSION → src/storage/AnalysisInputRevisionRepository.ts:36
- StoredAnalysisInputPlane → src/storage/AnalysisInputRevisionRepository.ts:45
- AnalysisInputRevisionByPlane → src/storage/AnalysisInputRevisionRepository.ts:54
- AnalysisInputRevisionPin → src/storage/AnalysisInputRevisionRepository.ts:67
- AnalysisInputRevisionRepositoryOptions → src/storage/AnalysisInputRevisionRepository.ts:82
- AnalysisInputRevisionSummary → src/storage/AnalysisInputRevisionRepository.ts:95
- AnalysisInputRevisionRepository → src/storage/AnalysisInputRevisionRepository.ts:142
- CONVENTION_CHECK_HISTORY_CONTRACT_VERSION → src/storage/ConventionCheckHistoryRepository.ts:40
- CONVENTION_CHECK_HISTORY_SCHEMA_VERSION → src/storage/ConventionCheckHistoryRepository.ts:49
- CONVENTION_CHECK_HISTORY_RETENTION_CONTRACT_VERSION → src/storage/ConventionCheckHistoryRepository.ts:58
- CONVENTION_CHECK_HISTORY_RETENTION_SCHEMA_VERSION → src/storage/ConventionCheckHistoryRepository.ts:67
- RetainedConventionCheckInputs → src/storage/ConventionCheckHistoryRepository.ts:76
- RetainedConventionGate → src/storage/ConventionCheckHistoryRepository.ts:90
- RetainedConventionCheck → src/storage/ConventionCheckHistoryRepository.ts:99
- ConventionCheckHistoryRepositoryOptions → src/storage/ConventionCheckHistoryRepository.ts:121
- ConventionHistoryTombstone → src/storage/ConventionCheckHistoryRepository.ts:133
- ConventionHistoryPin → src/storage/ConventionCheckHistoryRepository.ts:150
- ConventionHistorySummary → src/storage/ConventionCheckHistoryRepository.ts:164
- ConventionHistoryRetentionResult → src/storage/ConventionCheckHistoryRepository.ts:179
- ConventionCheckHistoryRepository → src/storage/ConventionCheckHistoryRepository.ts:232
- COVERAGE_METRIC_REPORT_REPOSITORY_SCHEMA_VERSION → src/storage/CoverageMetricReportRepository.ts:32
- CoverageMetricReportPin → src/storage/CoverageMetricReportRepository.ts:42
- CoverageMetricReportRevision → src/storage/CoverageMetricReportRepository.ts:55
- CoverageMetricReportRepositoryOptions → src/storage/CoverageMetricReportRepository.ts:71
- CoverageMetricReportRepository → src/storage/CoverageMetricReportRepository.ts:111
- GRAPH_REPOSITORY_SCHEMA_VERSION → src/storage/GraphRepository.ts:37
- CANONICAL_GRAPH_ARTIFACT_NAME → src/storage/GraphRepository.ts:47
- CANONICAL_GRAPH_FINGERPRINT_ALGORITHM → src/storage/GraphRepository.ts:56
- CanonicalGraphArtifactContract → src/storage/GraphRepository.ts:102
- CanonicalGraphRevisionMetadata → src/storage/GraphRepository.ts:119
- CanonicalGraphRevisionSummary → src/storage/GraphRepository.ts:138
- ActiveCanonicalGraphRevision → src/storage/GraphRepository.ts:149
- assertGraphRepositoryRevision → src/storage/GraphRepository.ts:165
- GraphRepositoryOptions → src/storage/GraphRepository.ts:178
- GraphRepositoryReplaceOptions → src/storage/GraphRepository.ts:191
- GraphRepositoryPruneOptions → src/storage/GraphRepository.ts:208
- GraphRepositoryPruneResult → src/storage/GraphRepository.ts:226
- GraphRepositoryConflictError → src/storage/GraphRepository.ts:240
- GraphRepository → src/storage/GraphRepository.ts:372
- SPEC_GRAPH_REPOSITORY_SCHEMA_VERSION → src/storage/SpecGraphRepository.ts:33
- SpecGraphRepositoryOptions → src/storage/SpecGraphRepository.ts:42
- SpecGraphRepositoryReplaceOptions → src/storage/SpecGraphRepository.ts:55
- SpecGraphRevisionSummary → src/storage/SpecGraphRepository.ts:70
- SpecGraphRepositoryConflictError → src/storage/SpecGraphRepository.ts:91
- SpecGraphRepository → src/storage/SpecGraphRepository.ts:145
- symbols → src/storage/schema.ts:20
- enhancedDocs → src/storage/schema.ts:81
- errorExperiences → src/storage/schema.ts:104
- decisionRecords → src/storage/schema.ts:131
- futurePlans → src/storage/schema.ts:156
- dependencies → src/storage/schema.ts:184
- unifiedRelationships → src/storage/schema.ts:211
- relationshipSymbols → src/storage/schema.ts:254
- testMappings → src/storage/schema.ts:276
- contracts → src/storage/schema.ts:301
- responsibilities → src/storage/schema.ts:319
- indexingRules → src/storage/schema.ts:337
- syncMetadata → src/storage/schema.ts:356
- tasks → src/storage/schema.ts:372
- endpoints → src/storage/schema.ts:412
- codeBlocks → src/storage/schema.ts:449
- entryPoints → src/storage/schema.ts:481
- Symbol → src/storage/schema.ts:512
- NewSymbol → src/storage/schema.ts:520
- EnhancedDoc → src/storage/schema.ts:529
- NewEnhancedDoc → src/storage/schema.ts:537
- ErrorExperience → src/storage/schema.ts:546
- NewErrorExperience → src/storage/schema.ts:554
- DecisionRecord → src/storage/schema.ts:563
- NewDecisionRecord → src/storage/schema.ts:571
- FuturePlan → src/storage/schema.ts:580
- NewFuturePlan → src/storage/schema.ts:588
- Dependency → src/storage/schema.ts:597
- NewDependency → src/storage/schema.ts:605
- UnifiedRelationship → src/storage/schema.ts:614
- NewUnifiedRelationship → src/storage/schema.ts:622
- RelationshipSymbol → src/storage/schema.ts:631
- NewRelationshipSymbol → src/storage/schema.ts:639
- TestMapping → src/storage/schema.ts:648
- NewTestMapping → src/storage/schema.ts:656
- Contract → src/storage/schema.ts:665
- NewContract → src/storage/schema.ts:673
- Responsibility → src/storage/schema.ts:682
- NewResponsibility → src/storage/schema.ts:690
- IndexingRule → src/storage/schema.ts:699
- NewIndexingRule → src/storage/schema.ts:707
- SyncMetadataRow → src/storage/schema.ts:716
- NewSyncMetadata → src/storage/schema.ts:724
- TaskRow → src/storage/schema.ts:733
- NewTask → src/storage/schema.ts:741
- Endpoint → src/storage/schema.ts:750
- NewEndpoint → src/storage/schema.ts:758
- CodeBlock → src/storage/schema.ts:767
- NewCodeBlock → src/storage/schema.ts:775
- EntryPoint → src/storage/schema.ts:784
- NewEntryPoint → src/storage/schema.ts:792

