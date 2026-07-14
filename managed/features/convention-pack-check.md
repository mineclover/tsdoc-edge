---
title: Convention Pack Check
type: feature
category: governance
status: active
canonical: true
source: src/convention/ConventionCheckService.ts
---

# [[Convention Pack Check]]

`convention check` is the first complete convention-governance loop in TSDoc Edge. It compiles
one authored, workspace-installed pack into exact `SpecGraphRevision`, `PolicyRevision`, and
`RuleSetRevision` inputs, resolves its bindings on one saved canonical graph revision, applies
suppression policy, and returns a revision-pinned conformance report with a CI-usable exit code.

This v1 deliberately means **spec-binding conformance** plus the configured P4.2 naming and P4.3
TSDoc-tag checks. It does not claim arbitrary formatting, layer, or general predicate DSL support.

An explicit `--graph-lint-rules <file>` option adds the upstream `ttsc graph-lint` evaluator as a
separate graph-quality plane in the same report and gate. TSDoc Edge adapts the canonical graph to
the upstream dump contract and normalizes its rule results/findings; graph traversal and matcher
semantics remain owned by `ttsc graph-router`. The evaluator module must be the graph-router
package root exporting `buildGraphLintRules`, not its `artifact-source` subpath. Without the
option, the result contains an empty graph-lint report so the convention result shape stays stable.

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
  -> optional ttsc graph-lint evaluation
  -> optional source-identified coverage report + gate-eligibility evaluation
  -> ConventionCheckResult + ConventionGate
```

The transient `EffectiveAnalysisSnapshot` and `BindingResolutionSet` never leave the process.
The serializable JSON result stores their identities and the derived report, not a deserialized object
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

The v1 source is a strict workspace-local JSON document. Source anchors and extractor provenance
are generated from the pack path and exact file digest; authors do not write compiled revision IDs.

This JSON remains a standalone/bootstrap authored input for portable convention fixtures. It may own
canary spec nodes, bindings, policy, and rule selection, but it is not the authored project-spec
SSOT when managed-document mode is selected. `ConventionPackManifest`, not the source JSON, is the
compiled composition descriptor.

The P4.4 target makes managed spec documents the only authored source for project spec nodes and
bindings. The convention source then selects policy/rules and pins or is compiled with that managed
spec revision. The same spec identity must never be authored independently in both JSON and
Markdown. Portable convention definitions require a separate namespace and installation contract.

Standalone bootstrap packs retain their own source provenance. Managed-document mode records the
`managed-spec-extractor` provenance and rejects duplicate JSON spec authoring, so bootstrap input and
extracted managed documents cannot silently participate as two authored SSOTs.

The managed-spec runtime path is now available as an explicit product workflow. Keep the pack JSON
as a policy-only source with empty `spec.nodes`, `spec.edges`, and `spec.bindings`, extract the
configured Markdown documents, and pass the exact active SpecGraph revision to the check:

```bash
tsdoc-edge spec extract --spec-db .tsdoc/spec-graph.db
tsdoc-edge convention check \
  --pack managed/conventions/tsdoc-edge-core-policy.json \
  --spec-db .tsdoc/spec-graph.db \
  --graph-db .tsdoc/canonical-graph.db \
  --json
```

`--spec-db` is an explicit input pin, not an implicit fallback. The compiler rejects a managed-mode
pack that contains any JSON spec node, edge, or binding, and rejects a workspace mismatch between the
pack scope and the extracted revision. The resulting manifest retains the managed revision identity
and `managed-spec-extractor` provenance while policy and rule selection remain owned by the pack
JSON. A replayed history uses the retained compiled pack and does not reread the current spec DB.

Location-aware naming convention is configured separately in
`.tsdoc.config.json#specGovernance.naming`. Its deterministic report and findings are evaluated by
this check/gate without making the JSON bootstrap an alternate naming-policy source.

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
  --pack managed/conventions/tsdoc-edge-core.json \
  --graph-lint-rules managed/conventions/tsdoc-edge-graph-lint.json \
  --fail-on error \
  --output .reports/convention.json
```

Set `TSDOC_EDGE_GRAPH_LINT_MODULE` to the built graph-router package root when it is not available
at the default sibling checkout path. Graph-lint violations use the same `--fail-on` threshold as
binding, naming, and TSDoc findings. Seeded violations with file anchors are also projected into
saved file-scoped LSP diagnostics.

For machine-readable stdout:

```bash
tsdoc-edge convention check \
  --pack managed/conventions/tsdoc-edge-core.json \
  --json
```

`--fail-on` accepts `error`, `warning`, `info`, or `never`. Both `violated` and `indeterminate`
findings participate in the selected threshold; ambiguity or stale evidence is not silently treated
as success.

### Coverage metric gate

An immutable, source-identified coverage report can be bound to the same saved canonical graph
revision:

```bash
tsdoc-edge convention check \
  --pack managed/conventions/tsdoc-edge-core-policy.json \
  --spec-db .tsdoc/spec-graph.db \
  --coverage-report-db .tsdoc/coverage-metrics.db \
  --coverage-report-id coverage-report:<source-identity> \
  --coverage-gate error \
  --coverage-thresholds execution.line=0.8 \
  --graph-db .tsdoc/canonical-graph.db \
  --json
```

`report-only`, `warning`, and `error` select the requested evidence gate. `--coverage-thresholds`
accepts a comma-separated `metric.id=fraction` list and evaluates only the explicitly named metrics.
Direct evidence with graph identity may produce a `violated` finding when it is below the minimum;
inferred, estimated, historical, or planned evidence remains an `indeterminate` finding. The report
ID, graph identity, thresholds, metric decisions, and findings are retained in history, so replay
does not reread the coverage database.

`--output` uses an atomic same-directory rename for the report itself and must point outside the
canonical graph database directory. This keeps SQLite main, WAL, SHM, and journal paths outside the
report writer's mutation scope.

### Exact input revision store

For an operator-owned source-checkout database, `--input-revisions-db <file>` stores the exact
evidence, enrichment, and policy revisions emitted by this check:

```bash
tsdoc-edge convention check \
  --pack managed/conventions/tsdoc-edge-core-policy.json \
  --spec-db .tsdoc/spec-graph.db \
  --input-revisions-db .tsdoc/analysis-inputs.db \
  --json
```

The database has no active pointer. Each row is addressed by the complete
`plane + workspaceId + revisionId` pin, and an existing identity collision fails closed. The JSON
result exposes the stored database path and the three pins under `inputRevisionStore`; retained
history remains the replay authority and continues to retain its own input payloads. This option
is an explicit persistence aid for inspection and downstream tooling, not an implicit input source
for `--replay` or a second producer of the canonical graph.

The output report cannot overwrite this database or its SQLite sidecars. If the store write fails,
history append is not attempted for that invocation.

The pointer-free store is read through the same convention command group:

```bash
tsdoc-edge convention inputs list \
  --input-revisions-db .tsdoc/analysis-inputs.db \
  --workspace acme-platform \
  --json

tsdoc-edge convention inputs read \
  --input-revisions-db .tsdoc/analysis-inputs.db \
  --plane evidence \
  --workspace acme-platform \
  --revision-id evidence-revision:<sha256> \
  --json
```

`list` is metadata-only and `read` requires the complete plane/workspace/revision pin. Both
operations open the database read-only; neither creates an active pointer or changes retained
history.

### Source-checkout operational minimum PoC

The source checkout includes one non-vacuous implementation-binding pack and a real-router proof
command:

```bash
npm run poc:convention
```

The repository build lane uses `ttsc@0.18.4` with TypeScript Native `7.0.2`. The imported graph
artifact reports `@ttsc/graph@0.18.4` as its producer and uses the sibling built
`@ttsc-ex/ttsc-graph-router` by default. Its `compilerVersion` is currently unreported, so the PoC
does not infer compiler provenance from the repository build lane. Set
`TSDOC_EDGE_GRAPH_ROUTER_MODULE` when the router is installed elsewhere. The command writes a
PoC-specific router config, cache, graph DB, reports, and logs below
`.test-results/convention-poc`, then verifies:

- the saved graph contains the exact `ProjectIndexer` class node required by the committed pack;
- canonical-only refresh leaves the legacy database, its WAL/SHM/journal sidecars, and registry
  byte-identical;
- the pack passes with exit `0`;
- an exact code-revision and manifest replay preserves `checkId`, `reportId`, and `gateId`;
- a missing implementation produces exit `1` and a `violated` finding;
- invalid code revision and manifest pins each produce exit `2`.

The generated `summary.json`, reports, graph DB, and command logs are disposable proof artifacts
and are not an authored SSOT. The committed pack and proof script define the reproducible input.
They are source-checkout development assets and are not included by the current npm package
`files` allowlist. Generic runner/enrichment adapters and convention/spec-conformance
LSP diagnostics/CodeAction are explicitly outside this minimum PoC. P4.1 Jest evidence, P4.2 naming,
P4.3 TSDoc and P4.5 retained history/replay are source-checkout product slices, not package proof.

For a release or protected CI check, lock the exact compiled manifest returned by an earlier JSON
result:

```bash
tsdoc-edge convention check \
  --pack managed/conventions/tsdoc-edge-core.json \
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
  --pack managed/conventions/tsdoc-edge-core.json \
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
- optional coverage report identity, graph pin, metric decisions, and gate findings
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
- The v1 pack compiler still supports the JSON bootstrap path for compatibility. The managed runtime
  path is the authority for project spec nodes and bindings when `--spec-db` is supplied; its policy
  pack must leave the JSON spec arrays empty.
- Evidence defaults to a canonical-empty revision when `--evidence` is omitted. A complete Jest JSON
  artifact can supply an in-memory revision for verification bindings. When `specGovernance.tsdoc`
  has rules, the check loads workspace-authored source into an exact `EnrichmentRevision`; bundled
  library nodes are deliberately excluded.
- `--history-db <file>` appends a validated P4.5 envelope containing canonical
  compiled-pack/evidence/enrichment/policy/rule-set payloads, evaluation config and exact
  check/result/gate identity. `--replay <history-id>` re-runs conformance from only that retained
  bundle and the exact graph revision; it neither reads the current pack/config nor falls back to
  the active graph. Tamper, missing input and ID divergence are exit `2`. `explain` remains follow-up.
- `convention retention` is the operator path for retained-result lifecycle. `list` exposes the
  current view, `pin`/`unpin` protect an exact history ID, and `gc` requires an explicit RFC3339
  cutoff. `gc --dry-run` is read-only. GC skips pinned rows and writes a versioned tombstone with
  the original payload digest before deleting the payload; replay of a tombstoned ID fails closed.
  Legacy history databases remain readable, but rows without the retention timestamp are not
  eligible for automatic collection until they are rewritten by a future migration.
- `--coverage-report-id <id>` reads one immutable source-identified report from
  `CoverageMetricReportRepository`. Coverage gate findings are included in the normal convention
  gate; the report is retained for replay.
- `--input-revisions-db <file>` optionally persists the exact evidence, enrichment, and policy
  revisions for operator inspection. It has no active pointer and is not read by retained replay;
  the durable history envelope remains the historical authority. `convention inputs list|read`
  provides read-only exact inspection of this auxiliary store.
- Saved LSP diagnostics and read-only Explain/Open CodeActions project the retained convention result,
  including graph-lint findings, when the exact canonical revision matches. Unsaved TypeScript buffers
  already use the read-only effective overlay for navigation and impact actions, but evaluating the
  ttsc graph-lint/spec contract against that overlay and mutating CodeAction remain deferred; CLI/CI
  graph-lint and convention gate execution are implemented.

### Jest evidence slice

The implemented slice keeps one user-facing path:
`tsdoc-edge convention check --pack <pack.json> --evidence <jest.json>`. A single Jest-package-free
JSON loader will validate the artifact, recover authored TypeScript source
through adjacent source maps, create an in-memory content-addressed `EvidenceRevision`, and pass it
to the existing check service. No separate import command, evidence database option, active pointer,
generic adapter registry, or mapping DSL is part of that slice.

The normalized identity, raw-status mapping, duplicate policy, `subjectFiles`, and provenance
contract are owned by [[Semantic Graph Analysis and Relationship Model]]. This feature owns the
optional CLI input, exit behavior, and report/gate handoff.

[[ConventionCheck]] is the authored managed-spec checkpoint for this flow. `ConventionCheckService.run()` accepts one optional `EvidenceRevision`; omission keeps the current
canonical-empty behavior. The CLI loads the optional artifact and passes the resulting revision to
that service without persisting it.

Verification keeps structural resolution separate from execution outcome: `passed` is satisfied,
`failed` is violated, and `skipped` or `unknown` is indeterminate. A missing required verifier or
subject remains violated unless another required participant is ambiguous or stale; that structural
state takes precedence and remains indeterminate. P4.5 durable history retains normalized inputs and
exact pins without changing this evaluator boundary.

Malformed JSON, unsupported runner schema, interrupted/run-exec output, runtime-error suites,
aggregate count mismatch, workspace escape, unresolved `.test-dist` paths, and
source-map/source-byte mismatch are input errors with exit `2`; they are not converted to `unknown`.
The status semantic change bumps the resolver, conformance engine, `binding.verification` rule
contract, and pack compiler identities to `2.0.0` while keeping the evidence contract and gate
evaluator versions.

`--output` must not resolve to the same file as `--evidence`; the CLI rejects that input with exit
`2` before reading or writing either artifact.

## Related

- [[Semantic Graph Analysis and Relationship Model]]
- [[Semantic Graph Spec Governance Roadmap]]
- [[Spec Management System]]
- [[LSP Integration]]
