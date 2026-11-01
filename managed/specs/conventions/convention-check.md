---
title: Convention Check
type: project-spec
status: active
source: src/convention/ConventionCheckService.ts
tags:
  - convention
  - governance
---

# [[ConventionCheck]]

The convention check is the managed-spec P4.4 vertical slice. Its executable projection is derived only from this document's explicit declaration block; prose never creates a requirement or binding.

```tsdoc-spec
{
  "requirements": [
    {
      "id": "REQ-MANAGED-CONVENTION-CHECK",
      "title": "Managed convention specifications compile deterministically",
      "tags": ["p4", "managed-spec"]
    },
    {
      "id": "REQ-CANONICAL-PROJECT-INDEXER",
      "title": "ProjectIndexer must remain in the canonical graph",
      "tags": ["implementation", "canonical-graph"]
    },
    {
      "id": "REQ-CONVENTION-EXACT-BINDING-RESOLVER",
      "title": "ExactBindingResolver must deterministically resolve workspace-scoped CanonicalNodeId and edge selectors without fuzzy fallback",
      "tags": ["convention", "binding-resolver", "fail-closed"]
    },
    {
      "id": "REQ-CONVENTION-CONFORMANCE-ENGINE",
      "title": "ConformanceEngine must evaluate implementation, verification, constraint, and governance obligations with explicit suppression semantics",
      "tags": ["convention", "conformance-engine"]
    },
    {
      "id": "REQ-CONVENTION-EFFECTIVE-ANALYSIS-SERVICE",
      "title": "EffectiveAnalysisService must stamp and compose pinned code, spec, evidence, enrichment, and policy revisions deterministically",
      "tags": ["convention", "effective-analysis", "6-plane"]
    },
    {
      "id": "REQ-CONVENTION-CHECK-SERVICE-ORCHESTRATOR",
      "title": "ConventionCheckService must orchestrate binding conformance, naming rules, TSDoc tag policies, coverage gates, and ttsc graph-lint into one immutable report",
      "tags": ["convention", "orchestrator"]
    },
    {
      "id": "REQ-CONVENTION-NAMING-EVALUATOR",
      "title": "NamingConventionEvaluator must enforce location-aware file and exported symbol naming styles over canonical graph nodes",
      "tags": ["convention", "naming-policy"]
    },
    {
      "id": "REQ-CONVENTION-TSDOC-TAG-EVALUATOR",
      "title": "TsdocConventionEvaluator must enforce path-scoped required TSDoc tag policies over canonical exported symbols",
      "tags": ["convention", "tsdoc-policy"]
    }
  ],
  "edges": [
    {
      "kind": "contains",
      "from": "spec:ConventionCheck",
      "to": "REQ-MANAGED-CONVENTION-CHECK"
    },
    {
      "kind": "contains",
      "from": "spec:ConventionCheck",
      "to": "REQ-CANONICAL-PROJECT-INDEXER"
    },
    {
      "kind": "contains",
      "from": "spec:ConventionCheck",
      "to": "REQ-CONVENTION-EXACT-BINDING-RESOLVER"
    },
    {
      "kind": "contains",
      "from": "spec:ConventionCheck",
      "to": "REQ-CONVENTION-CONFORMANCE-ENGINE"
    },
    {
      "kind": "contains",
      "from": "spec:ConventionCheck",
      "to": "REQ-CONVENTION-EFFECTIVE-ANALYSIS-SERVICE"
    },
    {
      "kind": "contains",
      "from": "spec:ConventionCheck",
      "to": "REQ-CONVENTION-CHECK-SERVICE-ORCHESTRATOR"
    },
    {
      "kind": "contains",
      "from": "spec:ConventionCheck",
      "to": "REQ-CONVENTION-NAMING-EVALUATOR"
    },
    {
      "kind": "contains",
      "from": "spec:ConventionCheck",
      "to": "REQ-CONVENTION-TSDOC-TAG-EVALUATOR"
    }
  ],
  "bindings": [
    {
      "id": "BIND-MANAGED-CONVENTION-CHECK",
      "kind": "implementation",
      "specNodeId": "REQ-MANAGED-CONVENTION-CHECK",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "canonicalNodeId": "src/spec-graph/ManagedSpecExtractor.ts#extractManagedSpecGraph:function"
      }
    },
    {
      "id": "BIND-CANONICAL-PROJECT-INDEXER",
      "kind": "implementation",
      "specNodeId": "REQ-CANONICAL-PROJECT-INDEXER",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/indexer/ProjectIndexer.ts#ProjectIndexer:class"
      }
    },
    {
      "id": "BIND-CONVENTION-EXACT-BINDING-RESOLVER",
      "kind": "implementation",
      "specNodeId": "REQ-CONVENTION-EXACT-BINDING-RESOLVER",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/spec-graph/BindingResolver.ts#ExactBindingResolver:class"
      }
    },
    {
      "id": "BIND-CONVENTION-CONFORMANCE-ENGINE",
      "kind": "implementation",
      "specNodeId": "REQ-CONVENTION-CONFORMANCE-ENGINE",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/spec-graph/ConformanceEngine.ts#ConformanceEngine:class"
      }
    },
    {
      "id": "BIND-CONVENTION-EFFECTIVE-ANALYSIS-SERVICE",
      "kind": "implementation",
      "specNodeId": "REQ-CONVENTION-EFFECTIVE-ANALYSIS-SERVICE",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/semantic-graph/EffectiveAnalysisService.ts#EffectiveAnalysisService:class"
      }
    },
    {
      "id": "BIND-CONVENTION-CHECK-SERVICE-ORCHESTRATOR",
      "kind": "implementation",
      "specNodeId": "REQ-CONVENTION-CHECK-SERVICE-ORCHESTRATOR",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/convention/ConventionCheckService.ts#ConventionCheckService:class"
      }
    },
    {
      "id": "BIND-CONVENTION-NAMING-EVALUATOR",
      "kind": "implementation",
      "specNodeId": "REQ-CONVENTION-NAMING-EVALUATOR",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/convention/NamingConventionEvaluator.ts#NamingConventionEvaluator:class"
      }
    },
    {
      "id": "BIND-CONVENTION-TSDOC-TAG-EVALUATOR",
      "kind": "implementation",
      "specNodeId": "REQ-CONVENTION-TSDOC-TAG-EVALUATOR",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/convention/TsdocConventionEvaluator.ts#TsdocConventionEvaluator:class"
      }
    }
  ]
}
```

## 개요 (Purpose)

`[[ConventionCheck]]` verifies revision-pinned conformance between authored specifications in [[AuthoredProjectSpecifications]] (`.tsdoc/spec-graph.db`) and the active canonical `@ttsc/graph` code snapshot (`.tsdoc/canonical-graph.db`) through [^ConventionCheckService], ensuring every declared implementation binding and naming/TSDoc policy holds without indeterminate drift.

## 핵심 개념 (Core Concepts: 7-Aspect Specification)

- **Input**: Compiled convention pack manifest (`managed/conventions/tsdoc-edge-core-policy.json`), active `SpecGraphRevision` from [^SpecGraphRepository], active `CanonicalProjectGraph` revision assembled by [^ProjectIndexer], and workspace `.tsdoc.config.json` `specGovernance` rules.
- **Context**: Operates across the 6-plane governance architecture defined in [[TsdocEdgePlatformSpecification]] and consumes normalized `@ttsc/graph` identities governed by [[CrossSpecIntegrationContract]].
- **Logic**:
  1. [^extractManagedSpecGraph] compiles explicit `tsdoc-spec` JSON blocks into deterministic `SpecNode`, `SpecEdge`, and `SpecBindingDeclaration` records.
  2. [^EffectiveAnalysisService] stamps and validates all participating analysis input planes, and [^ExactBindingResolver] resolves each `code-node` selector against workspace-scoped `CanonicalNodeId` entries in the active graph revision.
  3. [^ConformanceEngine], [^NamingConventionEvaluator], and [^TsdocConventionEvaluator] evaluate implementation bindings, naming rules, TSDoc tag policies, and lifecycle gates into a revision-stamped report via [^ConventionCheckService].
- **Effect & Scope**: Read-only evaluation over `.tsdoc/canonical-graph.db` and `.tsdoc/spec-graph.db`, optionally persisting audit history rows when history recording is requested; enforces workspace-wide CI/CLI conformance gates.

## 핵심 산출물 (Output)

- Revision-pinned `ConventionCheckReport` JSON containing `effectiveAnalysisStamp`, binding conformance counts (`satisfied`, `violated`, `indeterminate`), naming/TSDoc policy results, and deterministic gate exit status (`gate.failed: boolean`).

## 사용 시나리오 (Usage Scenarios)

### Scenario 1: Extract Managed Spec Revision Before Checking Conformance

Compile `managed/specs/**/*.md` declarations into `.tsdoc/spec-graph.db` so [^ConventionCheckService] evaluates the latest authored bindings:

```bash
tsdoc-edge spec extract --spec-db .tsdoc/spec-graph.db --json
```

### Scenario 2: Execute Revision-Pinned Managed Policy Conformance Gate

Verify that `BIND-MANAGED-CONVENTION-CHECK` ([^extractManagedSpecGraph]) and `BIND-CANONICAL-PROJECT-INDEXER` ([^ProjectIndexer]) resolve cleanly with zero violations:

```bash
tsdoc-edge convention check \
  --pack managed/conventions/tsdoc-edge-core-policy.json \
  --graph-db .tsdoc/canonical-graph.db \
  --spec-db .tsdoc/spec-graph.db \
  --json
```

### Scenario 3: Validate Naming and TSDoc Governance Policies Across `src/`

Run the full convention check with workspace `.tsdoc.config.json` `specGovernance` rules to confirm zero naming or `@public` tag regressions:

```bash
tsdoc-edge convention check \
  --pack managed/conventions/tsdoc-edge-core.json \
  --graph-db .tsdoc/canonical-graph.db \
  --json
```

## CLI 명령어 (CLI Commands)

- `tsdoc-edge spec extract`: Compile authored `tsdoc-spec` blocks into `.tsdoc/spec-graph.db`.
- `tsdoc-edge convention check --pack <manifest> --graph-db <db> [--json]`: Evaluate bindings, naming rules, and TSDoc policies against the active canonical graph.

## 가이드 (Guidelines)

1. **Single `tsdoc-spec` Fence Rule**: Keep exactly one `tsdoc-spec` JSON block per `type: project-spec` document; never rely on Markdown prose or footnotes to declare executable bindings.
2. **Fail-Closed Indeterminate Handling**: Any binding whose target `canonicalNodeId` or `graphNamespace` cannot be resolved deterministically by [^ExactBindingResolver] is reported as `violated` or `indeterminate` and fails the release gate.

## 관련 기능 (Related Concepts)

- [[AuthoredProjectSpecifications]]
- [[TsdocEdgePlatformSpecification]]
- [[CrossSpecIntegrationContract]]
- [[Convention Pack Check]]
- [[Semantic Graph Spec Governance Roadmap]]

---

## Backlinks

### Referenced By

- [[Convention Pack Check]] → managed/features/convention-pack-check.md:440
- [[GraphAndPersistencePlaneSpecification]] → managed/specs/domains/graph-and-persistence-plane-spec.md:260
- [[AuthoredProjectSpecifications]] → managed/specs/index.md:47

### Implemented By

- ConventionCheck → src/convention/ConventionCheckService.ts:1
- ConventionCheckCommandOutput → src/commands/ConventionCheckCommand.ts:47
- ConventionCheckCommand → src/commands/ConventionCheckCommand.ts:66
- ConventionCommand → src/commands/ConventionCommand.ts:24
- ConventionInputsCommand → src/commands/ConventionInputsCommand.ts:30
- ConventionRetentionCommand → src/commands/ConventionRetentionCommand.ts:29
- ConventionCapabilityCheck → src/convention/ConventionCheckService.ts:65
- ConventionCheckInput → src/convention/ConventionCheckService.ts:78
- ConventionCheckResult → src/convention/ConventionCheckService.ts:106
- ConventionCheckService → src/convention/ConventionCheckService.ts:147
- ConventionFailureThreshold → src/convention/ConventionGate.ts:20
- CONVENTION_GATE_CONTRACT_VERSION → src/convention/ConventionGate.ts:28
- CONVENTION_GATE_EVALUATOR_ID → src/convention/ConventionGate.ts:36
- CONVENTION_GATE_EVALUATOR_VERSION → src/convention/ConventionGate.ts:44
- ConventionGateDecision → src/convention/ConventionGate.ts:52
- blockingConventionFindings → src/convention/ConventionGate.ts:75
- evaluateConventionGate → src/convention/ConventionGate.ts:100
- ConventionPackSourceContext → src/convention/ConventionPackCompiler.ts:72
- CompileConventionPackFileOptions → src/convention/ConventionPackCompiler.ts:87
- assertCompiledConventionPack → src/convention/ConventionPackCompiler.ts:99
- restoreCompiledConventionPack → src/convention/ConventionPackCompiler.ts:112
- compileConventionPackFile → src/convention/ConventionPackCompiler.ts:158
- compileConventionPackSource → src/convention/ConventionPackCompiler.ts:201
- validateConventionPackManifest → src/convention/ConventionPackCompiler.ts:450
- COVERAGE_METRIC_POLICY_CONTRACT_VERSION → src/convention/CoverageMetricPolicy.ts:25
- CoverageMetricPolicyInput → src/convention/CoverageMetricPolicy.ts:33
- CoverageMetricPolicyThreshold → src/convention/CoverageMetricPolicy.ts:48
- CoverageMetricPolicyMetric → src/convention/CoverageMetricPolicy.ts:59
- CoverageMetricPolicyFinding → src/convention/CoverageMetricPolicy.ts:70
- CoverageMetricPolicyReport → src/convention/CoverageMetricPolicy.ts:87
- evaluateCoverageMetricPolicy → src/convention/CoverageMetricPolicy.ts:104
- parseCoverageMetricThresholds → src/convention/CoverageMetricPolicy.ts:181
- JEST_JSON_EVIDENCE_LOADER_ID → src/convention/JestJsonEvidenceLoader.ts:27
- JEST_JSON_EVIDENCE_LOADER_VERSION → src/convention/JestJsonEvidenceLoader.ts:35
- LoadJestJsonEvidenceOptions → src/convention/JestJsonEvidenceLoader.ts:43
- loadJestJsonEvidence → src/convention/JestJsonEvidenceLoader.ts:62
- NAMING_CONVENTION_EVALUATOR_ID → src/convention/NamingConventionEvaluator.ts:25
- NAMING_CONVENTION_EVALUATOR_VERSION → src/convention/NamingConventionEvaluator.ts:33
- NamingConventionFinding → src/convention/NamingConventionEvaluator.ts:41
- NamingConventionReport → src/convention/NamingConventionEvaluator.ts:61
- NamingConventionEvaluationOptions → src/convention/NamingConventionEvaluator.ts:89
- NamingConventionEvaluator → src/convention/NamingConventionEvaluator.ts:101
- TSDOC_CONVENTION_EVALUATOR_ID → src/convention/TsdocConventionEvaluator.ts:23
- TSDOC_CONVENTION_EVALUATOR_VERSION → src/convention/TsdocConventionEvaluator.ts:31
- TsdocConventionFinding → src/convention/TsdocConventionEvaluator.ts:39
- TsdocConventionReport → src/convention/TsdocConventionEvaluator.ts:56
- TsdocConventionEvaluator → src/convention/TsdocConventionEvaluator.ts:76
- TSDOC_ENRICHMENT_LOADER_ID → src/convention/TsdocEnrichmentLoader.ts:30
- TSDOC_ENRICHMENT_LOADER_VERSION → src/convention/TsdocEnrichmentLoader.ts:38
- LoadTsdocEnrichmentOptions → src/convention/TsdocEnrichmentLoader.ts:46
- loadTsdocEnrichment → src/convention/TsdocEnrichmentLoader.ts:66
- TTSC_GRAPH_LINT_ADAPTER_ID → src/convention/TtscGraphLintAdapter.ts:25
- TTSC_GRAPH_LINT_ADAPTER_VERSION → src/convention/TtscGraphLintAdapter.ts:33
- TtscGraphLintModule → src/convention/TtscGraphLintAdapter.ts:41
- GraphLintFinding → src/convention/TtscGraphLintAdapter.ts:51
- GraphLintRuleResult → src/convention/TtscGraphLintAdapter.ts:71
- GraphLintReport → src/convention/TtscGraphLintAdapter.ts:90
- EvaluateTtscGraphLintFileOptions → src/convention/TtscGraphLintAdapter.ts:110
- evaluateTtscGraphLint → src/convention/TtscGraphLintAdapter.ts:124
- evaluateTtscGraphLintFile → src/convention/TtscGraphLintAdapter.ts:170
- emptyGraphLintReport → src/convention/TtscGraphLintAdapter.ts:219
- CONVENTION_PACK_SOURCE_CONTRACT_ID → src/convention/contracts.ts:33
- CONVENTION_PACK_MANIFEST_CONTRACT_ID → src/convention/contracts.ts:41
- CONVENTION_PACK_CONTRACT_VERSION → src/convention/contracts.ts:49
- CONVENTION_PACK_COMPILER_ID → src/convention/contracts.ts:57
- CONVENTION_PACK_COMPILER_VERSION → src/convention/contracts.ts:65
- ConventionPackWorkspaceScope → src/convention/contracts.ts:73
- ConventionCapabilityRequirement → src/convention/contracts.ts:84
- ConventionSpecNodeSource → src/convention/contracts.ts:96
- ConventionSpecEdgeSource → src/convention/contracts.ts:104
- ConventionBindingSource → src/convention/contracts.ts:119
- ConventionSpecSource → src/convention/contracts.ts:130
- ConventionPolicySource → src/convention/contracts.ts:142
- ConventionPackSource → src/convention/contracts.ts:160
- ConventionRevisionPin → src/convention/contracts.ts:178
- ConventionPolicyRevisionPin → src/convention/contracts.ts:189
- ConventionPackManifest → src/convention/contracts.ts:201
- CompiledConventionPack → src/convention/contracts.ts:224
- EXACT_BINDING_RESOLVER_ID → src/spec-graph/BindingResolver.ts:43
- EXACT_BINDING_RESOLVER_VERSION → src/spec-graph/BindingResolver.ts:52
- BindingResolverInputIndex → src/spec-graph/BindingResolver.ts:138
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
- ConformanceEvaluationOptions → src/spec-graph/ConformanceEngine.ts:105
- ConformanceFinding → src/spec-graph/ConformanceEngine.ts:119
- ConformanceSummary → src/spec-graph/ConformanceEngine.ts:145
- ConformanceReport → src/spec-graph/ConformanceEngine.ts:161
- ConformanceEngine → src/spec-graph/ConformanceEngine.ts:202
- MANAGED_SPEC_EXTRACTOR_ID → src/spec-graph/ManagedSpecExtractor.ts:37
- MANAGED_SPEC_EXTRACTOR_VERSION → src/spec-graph/ManagedSpecExtractor.ts:46
- ExtractManagedSpecOptions → src/spec-graph/ManagedSpecExtractor.ts:55
- extractManagedSpecGraph → src/spec-graph/ManagedSpecExtractor.ts:84
- SpecBindingKind → src/spec-graph/contracts.ts:56
- CodeNodeSelector → src/spec-graph/contracts.ts:171
- CodeEdgeSelector → src/spec-graph/contracts.ts:191
- TestEvidenceSelector → src/spec-graph/contracts.ts:220
- ApiSurfaceSelector → src/spec-graph/contracts.ts:235
- BindingEndpointSelector → src/spec-graph/contracts.ts:258
- ImplementationBindingDeclaration → src/spec-graph/contracts.ts:275
- VerificationBindingDeclaration → src/spec-graph/contracts.ts:287
- ConstraintBindingDeclaration → src/spec-graph/contracts.ts:300
- GovernanceBindingDeclaration → src/spec-graph/contracts.ts:312
- SpecBindingDeclaration → src/spec-graph/contracts.ts:324
- EndpointRef → src/spec-graph/contracts.ts:352
- ResolvedBindingParticipant → src/spec-graph/contracts.ts:416
- ResolvedSpecBinding → src/spec-graph/contracts.ts:449
- SpecGraphRevision → src/spec-graph/contracts.ts:481
- PolicyRule → src/spec-graph/contracts.ts:499
- PolicySuppression → src/spec-graph/contracts.ts:514
- PolicyProvenance → src/spec-graph/contracts.ts:529
- PolicyRevision → src/spec-graph/contracts.ts:543
- bindingDeclarationDigest → src/spec-graph/identity.ts:127
- bindingResolutionId → src/spec-graph/identity.ts:138
- CreatePolicyRevisionInput → src/spec-graph/identity.ts:189
- createPolicyRevision → src/spec-graph/identity.ts:204
- createSpecGraphRevision → src/spec-graph/identity.ts:267
- normalizeRfc3339Timestamp → src/spec-graph/identity.ts:806
- matchesNodeIdentity → src/spec-graph/identity.ts:1076

