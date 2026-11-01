---
title: Commands Index
type: reference
category: cli
status: active
canonical: true
codeImplementation: not-applicable
---

# [[Commands Index]]

Reference for the canonical **20 top-level TSDoc Edge CLI commands** and their unified subcommands.

## Quick Start

```bash
# Initialize project
tsdoc-edge init

# One-step SSOT synchronization (use --check in CI)
tsdoc-edge sync [--force] [--dry-run] [--check] [--json]

# Get work context and design context before editing
tsdoc-edge wc <file-path> --llm
tsdoc-edge dc <file-path>

# Unified code + [[Symbol]] lookup and method search
tsdoc-edge symbol query <name>
tsdoc-edge symbol find-method <name>

# Check a revision-pinned spec-binding convention pack
tsdoc-edge convention check --pack managed/conventions/tsdoc-edge-core.json

# Compile and inspect the specification graph
tsdoc-edge spec extract
tsdoc-edge spec graph status
```

## Three-Tier SSOT Architecture

`@microsoft/tsdoc` supplies the 29 standard TSDoc tags; `ttsc`, `@ttsc/graph`, and `@ttsc/lint`
own the canonical graph and its 25 error rules; `tsdoc-edge` owns 22 irreducible domain tags and
the document/specification connectivity layer. The `sync` pipeline refreshes all connected planes,
while `symbol`, `relationship`, `docs`, `validate`, `spec`, `convention`, and `ontology` organize
domain operations without top-level command clutter.

---

## 1. Core Workflow & Diagnostics (10 Top-Level Commands)

| Command | Aliases | Description |
|---------|---------|-------------|
| `init` | - | Initialize TSDoc Edge configuration |
| `sync` | - | Sync symbol DB, canonical `@ttsc/graph`, SpecGraph, and backlinks |
| `build` | `b` | Build symbol database from TypeScript source |
| `work-context` | `wc` | Get complete context before editing a file |
| `design-context` | `dc` | Show normative spec bindings, `@contract`, and `@decision` records |
| `system-status` | `status`, `ss` | Show 3-plane SSOT system dashboard and health score |
| `stats` | `s` | Show documentation, symbol, and canonical `@ttsc/graph` statistics |
| `health` | `h` | Check codebase health score |
| `lint` | - | Run code quality, documentation, and lint checks |
| `help` | - | Show CLI command tree and help (maintained by [[HelpCommand]]) |

---

## 2. Unified Command Groups (7 Top-Level Commands)

### `symbol` (`sym`) — 13 Subcommands

| Subcommand | Description |
|------------|-------------|
| `symbol query <name\|lookup\|search\|stats>` | Query code symbols (`@ttsc/graph`) and defined `[[Symbol]]` checkpoints with fail-closed homonym provenance |
| `symbol deps <symbol>` | Show dependencies of a symbol |
| `symbol who-uses <symbol>` | Show reverse dependencies of a symbol |
| `symbol orphans` | Find symbols without dependents |
| `symbol find-method <name>` | Find methods by name across the symbol graph |
| `symbol tree` | Show symbol hierarchy tree |
| `symbol core-api` | Show exported core API symbols |
| `symbol undocumented` | Find undocumented symbols |
| `symbol untested` | Find symbols without test coverage ([[UntestedCommand]], [[Test Coverage]]) |
| `symbol parse <file>` | Parse and display enhanced TSDoc comments |
| `symbol promote <symbol>` | Promote auxiliary heading to canonical H1 checkpoint |
| `symbol fix` | Fix `[[Symbol]]` reference issues |
| `symbol rename <old> <new>` | Rename `[[Symbol]]` across docs and code |

### `relationship` (`rel`, `r`) — 15 Subcommands

| Subcommand | Description |
|------------|-------------|
| `relationship query <id>` | Query relationships for a symbol |
| `relationship impact <id>` | Analyze upstream/downstream change impact |
| `relationship path <from> <to>` | Find shortest dependency path between symbols |
| `relationship clusters` | Discover architectural clusters |
| `relationship metrics` | Calculate importance/centrality metrics |
| `relationship validate` | Validate relationship graph integrity |
| `relationship export` | Export graph to JSON/GraphML/DOT/CSV/Cypher |
| `relationship stats` | Show canonical `@ttsc/graph` and project relationship statistics |
| `relationship check <id>` | Run quick pre-edit relationship safety check |
| `relationship visualize <id>` | Generate Mermaid relationship diagrams |
| `relationship analyze [type]` | Run relationship analyzers ([[Call Relationships]], [[Type Dependency]], [[IO Dependency]], [[Pipeline]], [[Collaboration]], [[Composition Relationship]], [[Temporal Order]], [[Substitution]], [[Fallback]], [[Co-Requirement]], [[Mutual Exclusion]], [[Callback Pattern]], [[Event Flow]]) |
| `relationship type-chain <type>` | Show type dependency chain |
| `relationship cycles` | Detect circular dependencies |
| `relationship roots` | Find root types |
| `relationship help` | Interactive relationship analysis guide |

### `docs` (`d`) — 13 Subcommands

Document utilities are also detailed in [[UtilityCommands]].

| Subcommand | Description |
|------------|-------------|
| `docs index [dir]` | Index `[[Symbol]]` checkpoints and references from markdown |
| `docs backlinks [dir]` | Update bidirectional `## Backlinks` sections |
| `docs check-links [dir]` | Check for broken markdown and `[[Symbol]]` links |
| `docs update-refs` | Update code symbol references |
| `docs generate [src]` | Generate markdown documentation |
| `docs validate [dir]` | Validate documentation integrity |
| `docs find-unused [dir]` | Find unreferenced documentation files |
| `docs move <from> <to>` | Move documentation file and update references |
| `docs symbols` | List defined `[[Symbol]]` project concepts |
| `docs fix [src]` | Automatically fix common TSDoc issues |
| `docs suggest` | Generate documentation improvement suggestions |
| `docs todos` | List `@privateRemarks` TODO items |
| `docs plans` | List planned future items from documentation |

### `validate` (`val`, `v`) — 6 Subcommands

| Subcommand | Description |
|------------|-------------|
| `validate docs [dir]` | Validate `[[Symbol]]` checkpoints, references, and backlinks |
| `validate tsdoc [dir]` | Validate TSDoc syntax against `tsdoc.json` (`--strict` supported) |
| `validate refs` | Validate code-to-doc `@doc` symbol references |
| `validate spec [dir]` | Validate specification completeness |
| `validate connectivity` | Check symbol graph connectivity |
| `validate generated` | Validate generated documentation |

### `spec` (`sp`) — 9 Subcommands

Specification lifecycle operations are detailed in [[SpecCommands]].

| Subcommand | Description |
|------------|-------------|
| `spec extract` | Compile authored managed specs into a saved SpecGraph revision |
| `spec graph <status\|list\|read>` | Inspect saved managed SpecGraph revisions read-only |
| `spec metrics` | Display specification quality and traceability metrics |
| `spec validate [dir]` | Validate specification structure and metadata |
| `spec duplicates [dir]` | Check duplicate content across specifications |
| `spec status` | Manage specification lifecycle status |
| `spec history <file>` | Show specification version history |
| `spec diff <v1> <v2> <file>` | Compare specification versions |
| `spec bump <file>` | Bump specification semantic version |

### `convention` (`conv`) — 3 Subcommands

See [[Convention Pack Check]] for the full contract and CI exit semantics.

| Subcommand | Description |
|------------|-------------|
| `convention check --pack <file>` | Compile a convention pack, resolve exact bindings, apply suppressions, and emit a pinned report/exit code |
| `convention inputs <list\|read>` | Read-only inspection of exact evidence, enrichment, and policy revision pins |
| `convention retention <list\|pin\|unpin\|gc>` | Inspect retained histories, protect them with pins, or tombstone unpinned records before an RFC3339 `--before` cutoff |

### `ontology` (`ont`) — 2 Subcommands

| Subcommand | Description |
|------------|-------------|
| `ontology stats` | Show canonical `@ttsc/graph` and project ontology statistics |
| `ontology list` | List ontology node types and relationship categories |

---

## 3. Revision & Coverage Contracts (3 Top-Level Commands)

| Command | Aliases | Description |
|---------|---------|-------------|
| `canonical-graph <status\|list\|read\|prune>` | - | Inspect active/retained `ttsc` canonical graph revisions read-only or prune historical revisions (`--keep <n> --vacuum`) |
| `coverage-report [list\|read]` | - | Generate or inspect persisted source-identified coverage reports |
| `coverage-baseline <save\|compare\|list\|read>` | `coverage-trend` | Persist, compare, and inspect immutable coverage baselines |

---

## Command Details & Architecture References

- [[Phase Commands]] - Historical phase grouping overview
- [[Relationship Types]] - Full relationship type taxonomy
- [[CLI Command Development Guide]] - How to extend unified command groups
- [[Quick Start Guide]] - Getting started tutorial
- [[Work Context Workflow]] - `work-context` (`wc`) and `design-context` (`dc`) workflow guide

---

## Backlinks

### Referenced By

- [[CLI Commands]] → managed/CLI-COMMANDS.md:59
- [[TSDoc Edge Documentation]] → managed/README.md:177
- [[UtilityCommands]] → managed/commands/UtilityCommands.md:324
- [[Guides & Tutorials]] → managed/guides/index.md:350
- [[Usage Scenarios]] → managed/guides/usage-scenarios.md:511
- [[Primary Types Index]] → managed/primary-types/index.md:451
- [[Quick Start Guide]] → managed/quick-start.md:323
- [[TSDoc Edge User Guide]] → managed/user-guide.md:28
- [[Example - Mermaid Workflow]] → managed/workflows/EXAMPLE-MERMAID-WORKFLOW.md:369
- [[Workflows Index]] → managed/workflows/index.md:285
- [[Mermaid Entrypoint Workflow]] → managed/workflows/mermaid-entrypoint-workflow.md:630

