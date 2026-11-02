---
title: Authored Project Specifications
type: spec-index
category: specifications
status: active
canonical: true
source: src/spec-graph/ManagedSpecExtractor.ts
---

# [[AuthoredProjectSpecifications]]

`managed/specs/` is the reserved authored SSOT root for project specifications. Roadmaps record execution order and verification proof; they never own a project requirement, binding, or policy definition.

## 개요 (Purpose)

`managed/specs/` organizes all authored `type: project-spec` specifications, naming policies, and cross-domain integration contracts so that executable `SpecGraphRevision` snapshots are compiled deterministically via [^extractManagedSpecGraph] without inferring requirements or bindings from prose.

## 핵심 개념 (Core Concepts)

### 1. Authority Transition & Derived Projections

`type: project-spec` documents in this root are the authored source for managed project-spec nodes, edges, and bindings. `tsdoc-edge spec extract` compiles them into a `SpecGraphRevision` via [^extractManagedSpecGraph] and atomically promotes that derived projection into [^SpecGraphRepository]. Each `project-spec` document must declare one `# [[PascalCheckpoint]]` H1 and exactly one explicit `tsdoc-spec` JSON fence; prose is never inferred as a binding.

`managed/conventions/tsdoc-edge-core.json` remains a separate bootstrap source for legacy canary rules and must never duplicate a managed-spec identity. [^SpecGraphRepository], result history, report JSON, and `.tsdoc.db` rows are derived projections consumed by [^ConventionCheckService] and [^SpecMetricsAggregator]; they must never be edited as alternate spec sources.

### 2. Authoring & Naming Governance

- File paths are workspace-relative and use kebab-case: `managed/specs/<area>/<spec-name>.md`.
- Every canonical spec document defines one H1 checkpoint in PascalCase: `# [[SpecName]]`.
- Every document covers the 7-aspect specification framework (`Purpose`, `Input`, `Output`, `Context`, `Logic`, `Effect`, `Scope`).
- Machine artifacts below `managed/specs/**/artifacts/` use `snake_case` filenames.
- Location-aware naming rules live in `.tsdoc.config.json#specGovernance.naming` and are evaluated deterministically by [^NamingConventionEvaluator] against canonical `@ttsc/graph` nodes and configured workspace files.

### 3. Domain Specification Catalog (8 Canonical Specs Covering Full Platform Surface)

The authored specification root separates upstream standards (`@microsoft/tsdoc` and `ttsc`) from `tsdoc-edge`'s product governance plane and binds every major platform subsystem (`54` explicit `CanonicalNodeId` implementation bindings across `8` `project-spec` documents):

| Domain | Canonical Spec | Independent Ownership Scope |
| --- | --- | --- |
| **1. `tsdoc` 독립 스펙** | [[TSDocStandardSpecification]] | `@microsoft/tsdoc` v0 comment grammar (`/** ... */`), 29 standard tags (`block`/`inline`/`modifier`), prose escape rules (`{` `}` `<` `>` `@`), `tsdoc.json` extension schema ([^generateTsdocJson]), unified `DocComment` AST reader ([^TSDocParser], [^readTsdocComment], [^EnhancedDocExtractor]) |
| **2. `ttsc` 독립 스펙** | [[TtscPlatformSpecification]] | `ttsc@0.34.3` + `tsgo 7.0.2` compiler/check/fix/prepare/cache CLI, `ttscserver` LSP, `@ttsc/lint@0.34.3` Go `rule` SPI (`25` `error` rules, `0` findings), `@ttsc/graph` (`graph-router` `1.1.0`) raw compiler facts & [^CanonicalGraphCoordinator] |
| **3. `tsdoc-edge` 독립 스펙** | [[TsdocEdgePlatformSpecification]] | SSOT `[[Checkpoint]]` flattening & backlinks ([^DocumentSymbolRegistry], [^UnusedDocumentDetector]), 22 irreducible domain extension tags ([^ModuleSpecTagParser]), 6-plane revision-pinned governance kernel, `work-context` / `design-context` / [[MCP Integration]] |
| **4. 교차 연동 계약** | [[CrossSpecIntegrationContract]] | Single-owner matrix across 8 architectural dimensions, Bridge 1 (`tools/ttsc-tsdoc` Go contributor + `@microsoft/tsdoc` parity oracle), Bridge 2 (`@ttsc/graph` → [^ProviderSnapshotNormalizer] → [^ProjectIndexer]), and Bridge 3 ([^projectCanonicalTtscRelationships] + [^graphEdgeSemantic]) |
| **5. CLI 명령어 표면 스펙** | [[CliCommandSurfaceSpecification]] | Canonical 20 top-level CLI commands ([^registerCliCommands]), zero-side-effect boot invariant, 1-step 3-layer SSOT synchronization ([^SyncCommand]), fail-closed unified symbol lookup ([^SymbolQueryCommand]), and 7 unified command groups |
| **6. 그래프·영속 리비전 스펙** | [[GraphAndPersistencePlaneSpecification]] | 5 content-addressed immutable SQLite revision stores ([^GraphRepository], [^SpecGraphRepository], [^AnalysisInputRevisionRepository], [^ConventionCheckHistoryRepository], [^CoverageMetricReportRepository]) and canonical graph analysis engine ([^GraphAnalysisService], [^CanonicalGraphIndex]) |
| **7. LSP·커버리지 표면 스펙** | [[LspAndCoverageSurfaceSpecification]] | Real-time `tsdoc-edge-lsp` service ([^TsdocEdgeService], [^IncrementalBuilder]), 6th Unsaved Overlay plane ([^OverlayGraphView], [^EffectiveCodeGraphView]), canonical coverage node projection ([^projectCoverageReportToCanonicalNodes]), and honest spec metrics ([^SpecMetricsAggregator]) |
| **8. 컨벤션 적합성 엔진 스펙** | [[ConventionCheck]] | Revision-pinned conformance kernel ([^extractManagedSpecGraph], [^EffectiveAnalysisService], [^ExactBindingResolver], [^ConformanceEngine], [^ConventionCheckService], [^NamingConventionEvaluator], [^TsdocConventionEvaluator]) |

## 핵심 산출물 (Output)

- **Authoritative Spec Layout**:

```text
managed/specs/
  index.md
  conventions/
    convention-check.md
  domains/
    tsdoc-standard-spec.md
    ttsc-platform-spec.md
    tsdoc-edge-platform-spec.md
    cross-spec-integration-contract.md
    cli-command-surface-spec.md
    graph-and-persistence-plane-spec.md
    lsp-and-coverage-surface-spec.md
  <area>/
    <spec-name>.md
    artifacts/
      <machine_readable_artifact>.json
```

- **Derived SpecGraph Revision**: Active immutable `SpecGraphRevision` stored in `.tsdoc/spec-graph.db` via [^SpecGraphRepository] and verified against `.tsdoc/canonical-graph.db` by [^ConventionCheckService].

## 사용 시나리오 (Usage Scenarios)

### Scenario 1: Compile Authored Managed Specs into an Active SpecGraph Revision

Extract all `type: project-spec` declarations under `managed/specs/` and promote the compiled revision atomically:

```bash
tsdoc-edge spec extract --spec-db .tsdoc/spec-graph.db --json
```

### Scenario 2: Inspect Derived SpecGraph Revisions Read-Only

Operators inspect active and retained revisions in [^SpecGraphRepository] without mutating authored Markdown or opening a write transaction:

```bash
tsdoc-edge spec graph status --spec-db .tsdoc/spec-graph.db --json
tsdoc-edge spec graph list --spec-db .tsdoc/spec-graph.db --json
tsdoc-edge spec graph read --spec-db .tsdoc/spec-graph.db --revision-id <revision-id> --json
```

### Scenario 3: Audit Managed Specification Completeness and Naming Conformance

Verify that every document under `managed/specs/` satisfies completeness, footnote integrity, and kebab-case naming rules via [^SpecMetricsAggregator] and [^ConventionCheckService]:

```bash
tsdoc-edge spec metrics --dir managed/specs --detail
tsdoc-edge convention check --pack managed/conventions/tsdoc-edge-core-policy.json --graph-db .tsdoc/canonical-graph.db --spec-db .tsdoc/spec-graph.db --json
```

## CLI 명령어 (CLI Commands)

- `tsdoc-edge spec extract`: Compile `managed/specs/**/*.md` `tsdoc-spec` blocks into `.tsdoc/spec-graph.db`.
- `tsdoc-edge spec graph status`: Inspect active `SpecGraphRevision` metadata.
- `tsdoc-edge spec metrics --dir managed/specs --detail`: Measure completeness, lifecycle ratio, 7-aspect coverage, and code-footnote integrity.
- `tsdoc-edge convention check`: Evaluate compiled bindings and naming/TSDoc policies against the active `@ttsc/graph` revision.

## 가이드 (Guidelines)

1. **Explicit `tsdoc-spec` Fence Only**: Requirements, edges, and canonical node bindings in `type: project-spec` files are parsed exclusively from the single `tsdoc-spec` JSON fence (`ManagedSpecExtractor@1.0.0`). Duplicate IDs or malformed selectors fail closed.
2. **Standard-First Boundary Discipline**: Before proposing any custom TSDoc tag or bespoke parser, check [[TSDocStandardSpecification]] (`@microsoft/tsdoc` 29 standard tags) and [[TtscPlatformSpecification]] (`@ttsc/graph` compiler facts) first; only non-AST product semantics belong in `tsdoc.json`.

## 관련 기능 (Related Concepts)

- [[TSDocStandardSpecification]]
- [[TtscPlatformSpecification]]
- [[TsdocEdgePlatformSpecification]]
- [[CrossSpecIntegrationContract]]
- [[CliCommandSurfaceSpecification]]
- [[GraphAndPersistencePlaneSpecification]]
- [[LspAndCoverageSurfaceSpecification]]
- [[ConventionCheck]]
- [[MCP Integration]]
- [[Semantic Graph Spec Governance Roadmap]]
- [[Semantic Graph Analysis and Relationship Model]]
- [[Spec Management System]]
- [[SpecCommands]]
- [[Convention Pack Check]]

---

## Backlinks

### Referenced By

- [[SyncCommand]] → managed/commands/SyncCommand.md:25
- [[MCP Integration]] → managed/features/mcp-integration.md:72
- [[ConventionCheck]] → managed/specs/conventions/convention-check.md:195
- [[CliCommandSurfaceSpecification]] → managed/specs/domains/cli-command-surface-spec.md:398
- [[CrossSpecIntegrationContract]] → managed/specs/domains/cross-spec-integration-contract.md:225
- [[GraphAndPersistencePlaneSpecification]] → managed/specs/domains/graph-and-persistence-plane-spec.md:275
- [[LspAndCoverageSurfaceSpecification]] → managed/specs/domains/lsp-and-coverage-surface-spec.md:266
- [[TsdocEdgePlatformSpecification]] → managed/specs/domains/tsdoc-edge-platform-spec.md:254
- [[TSDocStandardSpecification]] → managed/specs/domains/tsdoc-standard-spec.md:197
- [[TtscPlatformSpecification]] → managed/specs/domains/ttsc-platform-spec.md:179
- [[Semantic Graph Spec Governance Roadmap]] → managed/workflows/semantic-graph-spec-governance-roadmap.md:37

### Implemented By

- AuthoredProjectSpecifications → src/spec-graph/ManagedSpecExtractor.ts:1
- SpecCommand → src/commands/SpecCommand.ts:54
- SpecExtractCommand → src/commands/SpecExtractCommand.ts:27
- SpecGraphCommand → src/commands/SpecGraphCommand.ts:26
- EXACT_BINDING_RESOLVER_ID → src/spec-graph/BindingResolver.ts:43
- EXACT_BINDING_RESOLVER_VERSION → src/spec-graph/BindingResolver.ts:52
- IndexedCodeNode → src/spec-graph/BindingResolver.ts:68
- IndexedCodeEdge → src/spec-graph/BindingResolver.ts:85
- IndexedSpecNode → src/spec-graph/BindingResolver.ts:96
- IndexedTestEvidence → src/spec-graph/BindingResolver.ts:106
- IndexedApiSurface → src/spec-graph/BindingResolver.ts:122
- BindingResolverInputIndex → src/spec-graph/BindingResolver.ts:138
- MaterializedBindingResolverIndex → src/spec-graph/BindingResolver.ts:152
- BindingResolverIndexProvider → src/spec-graph/BindingResolver.ts:166
- createAnalysisInputBindingResolverIndex → src/spec-graph/BindingResolver.ts:177
- ExactBindingResolverOptions → src/spec-graph/BindingResolver.ts:247
- BindingResolutionDiagnosticCode → src/spec-graph/BindingResolver.ts:260
- BindingResolutionDiagnostic → src/spec-graph/BindingResolver.ts:272
- BindingResolutionReport → src/spec-graph/BindingResolver.ts:291
- ExactBindingResolver → src/spec-graph/BindingResolver.ts:314
- createSnapshotBindingResolverIndex → src/spec-graph/BindingResolver.ts:413
- CONFORMANCE_ENGINE_ID → src/spec-graph/ConformanceEngine.ts:48
- CONFORMANCE_ENGINE_VERSION → src/spec-graph/ConformanceEngine.ts:57
- CONFORMANCE_RULE_IDS → src/spec-graph/ConformanceEngine.ts:66
- ConformanceOutcome → src/spec-graph/ConformanceEngine.ts:80
- ConformanceEngineIdentity → src/spec-graph/ConformanceEngine.ts:93
- ConformanceEvaluationOptions → src/spec-graph/ConformanceEngine.ts:105
- ConformanceFinding → src/spec-graph/ConformanceEngine.ts:119
- ConformanceSummary → src/spec-graph/ConformanceEngine.ts:145
- ConformanceReport → src/spec-graph/ConformanceEngine.ts:161
- ConformanceEngine → src/spec-graph/ConformanceEngine.ts:202
- MANAGED_SPEC_EXTRACTOR_ID → src/spec-graph/ManagedSpecExtractor.ts:37
- MANAGED_SPEC_EXTRACTOR_VERSION → src/spec-graph/ManagedSpecExtractor.ts:46
- ExtractManagedSpecOptions → src/spec-graph/ManagedSpecExtractor.ts:55
- extractManagedSpecGraph → src/spec-graph/ManagedSpecExtractor.ts:84
- SPEC_GRAPH_CONTRACT_VERSION → src/spec-graph/contracts.ts:23
- SpecNodeKind → src/spec-graph/contracts.ts:31
- ObligationNodeKind → src/spec-graph/contracts.ts:39
- SpecEdgeKind → src/spec-graph/contracts.ts:47
- SpecBindingKind → src/spec-graph/contracts.ts:56
- SourceRange → src/spec-graph/contracts.ts:64
- SpecSourceAnchor → src/spec-graph/contracts.ts:77
- SpecLifecycle → src/spec-graph/contracts.ts:92
- SpecNode → src/spec-graph/contracts.ts:109
- SpecProvenance → src/spec-graph/contracts.ts:124
- SpecEvidence → src/spec-graph/contracts.ts:137
- SpecEdge → src/spec-graph/contracts.ts:148
- CodeNodeSelector → src/spec-graph/contracts.ts:171
- CodeEdgeSelector → src/spec-graph/contracts.ts:191
- SpecNodeSelector → src/spec-graph/contracts.ts:207
- TestEvidenceSelector → src/spec-graph/contracts.ts:220
- ApiSurfaceSelector → src/spec-graph/contracts.ts:235
- CodeSubjectSelector → src/spec-graph/contracts.ts:249
- BindingEndpointSelector → src/spec-graph/contracts.ts:258
- ImplementationBindingDeclaration → src/spec-graph/contracts.ts:275
- VerificationBindingDeclaration → src/spec-graph/contracts.ts:287
- ConstraintBindingDeclaration → src/spec-graph/contracts.ts:300
- GovernanceBindingDeclaration → src/spec-graph/contracts.ts:312
- SpecBindingDeclaration → src/spec-graph/contracts.ts:324
- RelationPlane → src/spec-graph/contracts.ts:336
- EndpointRef → src/spec-graph/contracts.ts:352
- ResolvedBindingParticipant → src/spec-graph/contracts.ts:416
- BindingResolverIdentity → src/spec-graph/contracts.ts:435
- ResolvedSpecBinding → src/spec-graph/contracts.ts:449
- SpecGraphProvenance → src/spec-graph/contracts.ts:470
- SpecGraphRevision → src/spec-graph/contracts.ts:481
- PolicyRule → src/spec-graph/contracts.ts:499
- PolicySuppression → src/spec-graph/contracts.ts:514
- PolicyProvenance → src/spec-graph/contracts.ts:529
- PolicyRevision → src/spec-graph/contracts.ts:543
- CreateSpecEdgeInput → src/spec-graph/identity.ts:67
- createSpecEdge → src/spec-graph/identity.ts:82
- bindingDeclarationDigest → src/spec-graph/identity.ts:127
- bindingResolutionId → src/spec-graph/identity.ts:138
- CreateSpecGraphRevisionInput → src/spec-graph/identity.ts:174
- CreatePolicyRevisionInput → src/spec-graph/identity.ts:189
- createPolicyRevision → src/spec-graph/identity.ts:204
- createSpecGraphRevision → src/spec-graph/identity.ts:267
- normalizeRfc3339Timestamp → src/spec-graph/identity.ts:806
- matchesNodeIdentity → src/spec-graph/identity.ts:1076

