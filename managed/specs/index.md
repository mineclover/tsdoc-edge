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

### 3. Domain Specification Catalog (3 Independent Specs + Bridge Contract)

The authored specification root separates upstream standards (`@microsoft/tsdoc` and `ttsc`) from `tsdoc-edge`'s product governance plane so that overlapping responsibilities retain a single canonical SSOT:

| Domain | Canonical Spec | Independent Ownership Scope |
| --- | --- | --- |
| **1. `tsdoc` 독립 스펙** | [[TSDocStandardSpecification]] | `@microsoft/tsdoc` v0 comment grammar (`/** ... */`), 29 standard tags (`block`/`inline`/`modifier`), prose escape rules (`{` `}` `<` `>` `@`), `tsdoc.json` extension schema, `DocComment` / `DocNode` AST reader ([^TSDocParser]) & 46 parser message IDs |
| **2. `ttsc` 독립 스펙** | [[TtscPlatformSpecification]] | `ttsc@0.34.3` + `tsgo 7.0.2` compiler/check/fix/prepare/cache CLI, `ttscserver` LSP, `@ttsc/lint@0.34.3` Go `rule` SPI (`ProjectInputRule`, `HintRule`, `GraphRule`, `FixReporter`) & `typescript/*` · `jsdoc/*` rules, `@ttsc/graph` (`graph-router` `1.1.0`) raw compiler facts |
| **3. `tsdoc-edge` 독립 스펙** | [[TsdocEdgePlatformSpecification]] | SSOT `[[Checkpoint]]` flattening & backlinks, 22 irreducible domain extension tags (7-aspect Module Spec, Contract/ADR, non-AST Semantic Relationships), 6-plane revision-pinned governance kernel (`Code`, `Spec`, `Evidence`, `Enrichment`, `Policy`, `Overlay`), `work-context` / `design-context` / `convention` / `tsdoc-edge-lsp` / MCP |
| **교차 연동 계약** | [[CrossSpecIntegrationContract]] | Single-owner matrix across 8 architectural dimensions, Bridge 1 (`tools/ttsc-tsdoc` Go contributor + `@microsoft/tsdoc` parity oracle), Bridge 2 (`@ttsc/graph` → `ProviderSnapshotNormalizer` → `ProjectIndexer` C2 capability matrix), and Bridge 3 (`canonical-tag-bridge.ts` + `edge-semantics.ts` unified projection) |
| **컨벤션 수직 슬라이스** | [[ConventionCheck]] | P4.4 managed `tsdoc-spec` extraction and canonical implementation binding proof |

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
tsdoc-edge spec-metrics --dir managed/specs --detail
tsdoc-edge convention check --pack managed/conventions/tsdoc-edge-core-policy.json --graph-db .tsdoc/canonical-graph.db --json
```

## CLI 명령어 (CLI Commands)

- `tsdoc-edge spec extract`: Compile `managed/specs/**/*.md` `tsdoc-spec` blocks into `.tsdoc/spec-graph.db`.
- `tsdoc-edge spec graph status`: Inspect active `SpecGraphRevision` metadata.
- `tsdoc-edge spec-metrics --dir managed/specs --detail`: Measure completeness, lifecycle ratio, 7-aspect coverage, and code-footnote integrity.
- `tsdoc-edge convention check`: Evaluate compiled bindings and naming/TSDoc policies against the active `@ttsc/graph` revision.

## 가이드 (Guidelines)

1. **Explicit `tsdoc-spec` Fence Only**: Requirements, edges, and canonical node bindings in `type: project-spec` files are parsed exclusively from the single `tsdoc-spec` JSON fence (`ManagedSpecExtractor@1.0.0`). Duplicate IDs or malformed selectors fail closed.
2. **Standard-First Boundary Discipline**: Before proposing any custom TSDoc tag or bespoke parser, check [[TSDocStandardSpecification]] (`@microsoft/tsdoc` 29 standard tags) and [[TtscPlatformSpecification]] (`@ttsc/graph` compiler facts) first; only non-AST product semantics belong in `tsdoc.json`.

## 관련 기능 (Related Concepts)

- [[TSDocStandardSpecification]]
- [[TtscPlatformSpecification]]
- [[TsdocEdgePlatformSpecification]]
- [[CrossSpecIntegrationContract]]
- [[ConventionCheck]]
- [[Semantic Graph Spec Governance Roadmap]]
- [[Semantic Graph Analysis and Relationship Model]]
- [[Spec Management System]]
- [[SpecCommands]]
- [[Convention Pack Check]]

---

## Backlinks

### Referenced By

- [[ConventionCheck]] → managed/specs/conventions/convention-check.md:69
- [[CrossSpecIntegrationContract]] → managed/specs/domains/cross-spec-integration-contract.md:183
- [[TsdocEdgePlatformSpecification]] → managed/specs/domains/tsdoc-edge-platform-spec.md:189
- [[TSDocStandardSpecification]] → managed/specs/domains/tsdoc-standard-spec.md:155
- [[TtscPlatformSpecification]] → managed/specs/domains/ttsc-platform-spec.md:158
- [[Semantic Graph Spec Governance Roadmap]] → managed/workflows/semantic-graph-spec-governance-roadmap.md:37

### Implemented By

- AuthoredProjectSpecifications → src/spec-graph/ManagedSpecExtractor.ts:1

