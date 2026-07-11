---
title: Convention Pack Check
type: feature
category: governance
status: active
canonical: true
---

# [[Convention Pack Check]]

`convention check` is the first complete convention-governance loop in TSDoc Edge. It compiles
one authored, workspace-installed pack into exact `SpecGraphRevision`, `PolicyRevision`, and
`RuleSetRevision` inputs, resolves its bindings on one saved canonical graph revision, applies
suppression policy, and returns a revision-pinned conformance report with a CI-usable exit code.

This v1 deliberately means **spec-binding conformance**. It does not claim to evaluate arbitrary
naming, formatting, layer, or TSDoc-tag predicates.

## Execution contract

```text
Authored convention pack JSON
  -> ConventionPackCompiler
     -> SpecGraphRevision
     -> PolicyRevision
     -> RuleSetRevision
     -> content-addressed ConventionPackManifest

Selected GraphRepository revision + compiled pack
  -> EffectiveAnalysisService.createSnapshot
  -> ExactBindingResolver.resolveWithDiagnostics
  -> EffectiveAnalysisService.resolveBindings
  -> ConformanceEngine.evaluate
  -> ConventionCheckResult
```

The transient `EffectiveAnalysisSnapshot` and `BindingResolutionSet` never leave the process.
The durable JSON result stores their identities and the derived report, not a deserialized object
that could bypass the effective-analysis trust boundary.
Likewise, the public check service accepts only the process-local compiled object emitted by
`ConventionPackCompiler`; persisted workflows recompile the authored source instead of trusting a
structurally similar manifest/revision bundle.

## Prerequisite

The command only checks a **saved** canonical graph revision. It defaults to the active revision and
can select a retained revision with `--code-revision`; it does not fall back to the legacy symbol
database or claim to include unsaved LSP buffers.

```bash
tsdoc-edge build src --canonical-graph \
  --router-module /path/to/ttsc-graph-router/dist/artifact-source.js \
  --graph-workspace acme-platform \
  --graph-namespace acme/ts7
```

The default graph database is `.tsdoc/canonical-graph.db`. Override it with `--graph-db` or
`TSDOC_EDGE_CANONICAL_GRAPH_DB`. Without explicit flags, the saved lane uses the router repo ID
(normally the project directory name) as `workspaceId` and `ttsc:<repoId>` as `graphNamespace`.

## Authored pack source

The v1 source is a strict workspace-local JSON document. Source anchors and compiler provenance
are generated from the pack path and exact file digest; authors do not write compiled revision IDs.

```json
{
  "contractId": "tsdoc-edge/convention-pack-source",
  "contractVersion": "1.0",
  "packId": "@acme/conventions/core",
  "packVersion": "1.0.0",
  "scope": {
    "kind": "workspace",
    "workspaceId": "acme-platform"
  },
  "graphNamespace": "acme/ts7",
  "capabilities": {},
  "spec": {
    "nodes": [
      {
        "id": "SPEC-CORE",
        "kind": "spec",
        "title": "Core conventions",
        "lifecycle": {
          "mode": "independent",
          "status": "active"
        },
        "tags": ["convention-pack"]
      },
      {
        "id": "REQ-PROJECT-INDEXER",
        "kind": "requirement",
        "title": "ProjectIndexer must exist",
        "lifecycle": {
          "mode": "inherited",
          "aggregateSpecId": "SPEC-CORE"
        },
        "tags": ["implementation"]
      }
    ],
    "bindings": [
      {
        "id": "BIND-PROJECT-INDEXER",
        "kind": "implementation",
        "specNodeId": "REQ-PROJECT-INDEXER",
        "target": {
          "type": "code-node",
          "workspaceId": "acme-platform",
          "graphNamespace": "acme/ts7",
          "canonicalNodeId": "src/indexer/ProjectIndexer.ts#ProjectIndexer:class"
        }
      }
    ]
  },
  "policy": {
    "lifecycleGateVersion": "1.0.0",
    "rules": [
      {
        "id": "binding.implementation",
        "version": "1.0.0",
        "enabled": true,
        "severity": "error"
      }
    ],
    "suppressions": []
  }
}
```

Every binding kind used by the pack must have an explicit policy rule and explicit
`error|warning|info` severity. The v1 executable rule IDs
are:

- `binding.implementation`
- `binding.verification`
- `binding.constraint`
- `binding.governance`

`PolicyRule.parameters` is rejected because the current conformance engine does not interpret
arbitrary parameters. A pack with no bindings or with no enabled rule used by one of its bindings
is rejected instead of returning a vacuous success.

## Run the loop

```bash
tsdoc-edge convention check \
  --pack managed/conventions/core.json \
  --fail-on error \
  --output .reports/convention.json
```

For machine-readable stdout:

```bash
tsdoc-edge convention check \
  --pack managed/conventions/core.json \
  --json
```

`--fail-on` accepts `error`, `warning`, `info`, or `never`. Both `violated` and `indeterminate`
findings participate in the selected threshold; ambiguity or stale evidence is not silently treated
as success.

`--output` uses an atomic same-directory rename for the report itself and must point outside the
canonical graph database directory. This keeps SQLite main, WAL, SHM, and journal paths outside the
report writer's mutation scope.

For a release or protected CI check, lock the exact compiled manifest returned by an earlier JSON
result:

```bash
tsdoc-edge convention check \
  --pack managed/conventions/core.json \
  --code-revision <canonical-revision-id> \
  --expected-manifest convention-pack:<sha256>
```

The manifest digest provides content integrity. `--expected-manifest` supplies the external lock
that prevents a changed policy or capability requirement from being accepted under the same
human `packId@packVersion`. `--code-revision` makes the saved code input independently replayable;
without it the command intentionally follows the repository's current active pointer.

| Exit | Meaning |
| --- | --- |
| `0` | No unsuppressed finding reached the selected threshold |
| `1` | Conformance gate failed |
| `2` | Pack, graph, revision, workspace, namespace, capability, or clock input is invalid |

## Suppression

Suppressions remain part of `PolicyRevision`; the pack does not define a second exception model.
Target the exact binding participant. A missing implementation can be suppressed through its
resolved obligation spec node:

```json
{
  "id": "SUPPRESS-PROJECT-INDEXER-MIGRATION",
  "ruleId": "binding.implementation",
  "target": {
    "type": "spec-node",
    "workspaceId": "acme-platform",
    "specNodeId": "REQ-PROJECT-INDEXER"
  },
  "reason": "Migration window",
  "expiresAt": "2030-01-01T00:00:00.000Z"
}
```

An expiring suppression requires an explicit evaluation clock so the same historical report can be
reproduced:

```bash
tsdoc-edge convention check \
  --pack managed/conventions/core.json \
  --suppression-as-of 2029-06-01T00:00:00.000Z
```

Unused suppressions are retained in `unappliedSuppressionIds` and shown in human output.

## Result identity

The JSON result includes:

- convention manifest ID and content digest
- canonical code revision and graph fingerprint
- spec, policy, rule-set, evidence, and enrichment revision IDs
- effective analysis view ID
- binding resolution set ID and resolution diagnostics
- conformance report and finding IDs
- exact suppression evaluation clock when supplied
- versioned gate evaluator identity, gate ID, selected failure threshold, blocking finding IDs, and
  final pass/fail decision

This allows CI output to identify exactly which semantic inputs produced a pass or failure.
The analysis `checkId` remains threshold-independent; the separate `gateId` identifies how that
analysis result was converted into an exit decision.

## Current boundary

- The pack is an installed workspace instance, not yet a portable registry package.
- Capability requirements consume standard `{ "status", "version" }` provider capabilities and
  normalize raw graph-router strings as complete exact versions and booleans as complete/unsupported.
- The pack compiler is JSON-based; managed Markdown extraction is still a separate roadmap item.
- Evidence and enrichment use canonical-empty revisions in this first CLI slice. Verification and
  API-surface bindings can therefore detect missing evidence but require a later collector input to
  become satisfied.
- Findings are written only when `--output` is supplied; durable report history and `explain` are
  follow-up product work.
- LSP diagnostics and CodeAction are not connected to this check yet.

## Related

- [[Semantic Graph Analysis and Relationship Model]]
- [[Semantic Graph Spec Governance Roadmap]]
- [[Spec Management System]]
- [[LSP Integration]]
