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
  2. [^ExactBindingResolver] resolves each `code-node` selector against workspace-scoped `CanonicalNodeId` entries in the active graph revision.
  3. [^ConformanceEngine] and [^NamingConventionEvaluator] evaluate implementation bindings, naming rules, TSDoc tag policies, and lifecycle gates into a revision-stamped report.
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

### Implemented By

- ConventionCheck → src/convention/ConventionCheckService.ts:1
