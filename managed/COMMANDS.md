---
title: Commands Index
type: reference
category: cli
status: active
canonical: true
codeImplementation: not-applicable
---

# [[Commands Index]]

Reference for the main TSDoc Edge CLI commands and command groups.

## Quick Start

```bash
# Initialize project
tsdoc-edge init

# Build symbol database
tsdoc-edge build src

# Check health
tsdoc-edge health src

# Get work context before editing
tsdoc-edge work-context <file-path>

# Check a revision-pinned spec-binding convention pack
tsdoc-edge convention check --pack managed/conventions/tsdoc-edge-core.json
```

---

## Core Workflow (12 commands)

Essential commands for daily usage.

| Command | Description |
|---------|-------------|
| `init` | Initialize TSDoc Edge configuration |
| `build` | Build symbol database from source |
| `health` | Check codebase health score |
| `stats` | Show documentation statistics |
| `work-context` | Get context before editing a file |
| `design-context` | Show design decisions for a file |
| `context-to-llm` | Generate LLM-friendly context |
| `parse` | Parse and display enhanced docs |
| `scan` | Scan directory for TypeScript files |
| `generate-docs` | Generate markdown documentation |
| `validate` | Generate validation report |
| `help` | Show help message |

The `help` command is implemented and maintained by [[HelpCommand]].

---

## Relationship Analysis (25 commands)

### Core Analyzers

| Command | Description | Relationship Type |
|---------|-------------|-------------------|
| `analyze-calls` | Function call relationships | [[Call Relationships]] |
| `analyze-types` | Type dependencies | [[Type Dependency]] |
| `analyze-io` | I/O data flow | [[IO Dependency]] |
| [[AnalyzeTestsCommand]] (`analyze-tests`) | Test coverage | [[Test Coverage]] |
| `analyze-chains` | Dependency chains | [[Pipeline]] |

### Behavioral Analyzers

| Command | Description | Relationship Type |
|---------|-------------|-------------------|
| `analyze-collaboration` | Mutual dependencies | [[Collaboration]] |
| `analyze-composition` | Has-a patterns | [[Composition Relationship]] |
| `analyze-temporal-order` | Execution sequence | [[Temporal Order]] |
| `analyze-behavioral` | All behavioral patterns | - |

### Alternative Analyzers

| Command | Description | Relationship Type |
|---------|-------------|-------------------|
| `analyze-substitution` | Interchangeable implementations | [[Substitution]] |
| `analyze-fallback` | Error recovery patterns | [[Fallback]] |
| `analyze-alternatives` | All alternative patterns | - |

### Constraint Analyzers

| Command | Description | Relationship Type |
|---------|-------------|-------------------|
| `analyze-constraints` | Co-requirements, mutual exclusion | [[Co-Requirement]], [[Mutual Exclusion]] |
| `analyze-callbacks` | Callback patterns | [[Callback Pattern]] |
| `analyze-events` | Event flow patterns | [[Event Flow]] |

### Other Analyzers

| Command | Description |
|---------|-------------|
| `analyze-enhancement` | @enhances tag relationships |
| `analyze-layer-dependency` | Architectural layer analysis |
| `analyze-doc-reference` | Code ↔ Doc via @doc tags |
| `analyze-structural` | Implementation + test coverage |
| `analyze-final` | Pipeline + feature-grouping |
| `analyze-all` | Run all analyzers |
| `analyze` | General code health analysis |

---

## Relationship Query (12 commands)

Query and explore relationships.

| Command | Description |
|---------|-------------|
| `relationship-query` | Query relationships for a symbol |
| `relationship-impact` | Analyze change impact |
| `relationship-path` | Find connection paths |
| `relationship-validate` | Validate data integrity |
| `relationship-export` | Export to JSON/GraphML/DOT/CSV |
| `relationship-visualize` | Generate Mermaid diagrams |
| `relationship-clusters` | Find architectural clusters |
| `relationship-metrics` | Calculate graph metrics |
| `relationship-check` | Quick safety check |
| `relationship-stats` | Show statistics |
| `relationship-help` | Interactive guide |
| `query-inferred` | Query inferred relationships |

---

## Symbol Query (14 commands)

Find and explore symbols.

| Command | Description |
|---------|-------------|
| `deps` | Show dependencies of a symbol |
| `used-by` | Show what uses a symbol (registry) |
| `who-uses` | Show who uses a symbol (database) |
| `orphans` | Find orphaned symbols |
| `undocumented` | Find undocumented symbols |
| `untested` | Find symbols without tests |
| `tree` | Show symbol hierarchy |
| `type-chain` | Show type dependency chain |
| `find-roots` | Find root types |
| `find-method` | Find methods by name |
| `core-api` | Show core API symbols |
| `symbol-query` | Query document symbols |
| `doc-symbols` | List document symbols |
| `visualize` | Generate dependency diagrams |

---

## Documentation (16 commands)

Manage documentation.

The legacy utility command grouping is documented in [[UtilityCommands]].

| Command | Description |
|---------|-------------|
| `index-docs` | Index document symbols |
| `validate-docs` | Validate document symbols |
| `validate-generated-docs` | Validate generated docs |
| `validate-symbol-refs` | Validate [[Symbol]] references |
| `update-backlinks` | Update backlinks in docs |
| `update-symbol-refs` | Update code references |
| `check-links` | Check for broken links |
| `find-unused-docs` | Find unused documents |
| `find-doc` | Find document definitions |
| `plans` | Show future plans |
| `todos` | Show TODO items |
| `promote-symbol` | Promote H2 to H1 |
| `explore-entrypoint` | Traverse doc graph |
| `parse-mermaid` | Parse Mermaid diagrams |
| `move` | Move doc and update refs |
| `rename` | Rename doc and update refs |

---

## Specification (10 commands)

Manage specifications.

The specification lifecycle command grouping is documented in [[SpecCommands]].

| Command | Description |
|---------|-------------|
| `validate-spec` | Validate spec completeness |
| `spec-status` | Manage spec status |
| `spec-history` | Show version history |
| `spec-diff` | Compare versions |
| `spec-bump` | Bump version |
| `spec extract` | Compile authored managed specs into a saved SpecGraph revision |
| `spec graph status\|list\|read` | Inspect saved managed SpecGraph revisions read-only |
| `check-duplicates` | Check duplicate content |
| `suggest` | Generate improvement suggestions |
| `improve` | Improve documentation quality |

---

## Convention Governance

Apply authored spec-binding conventions to an exact saved canonical graph revision.

| Command | Description |
|---------|-------------|
| `convention check --pack <file>` | Compile a convention pack, resolve exact bindings, apply suppressions, and emit a pinned report/exit code |
| `convention inputs <list\|read>` | Read-only inspection of exact evidence, enrichment, and policy revision pins |
| `convention retention <list\|pin\|unpin\|gc>` | Inspect exact retained histories, protect them with pins, or tombstone unpinned records before a cutoff |

Use `--code-revision <id>` to replay a retained canonical revision (the active revision is the
default), and `--expected-manifest <id>` to enforce the independently approved pack lock in CI.

See [[Convention Pack Check]] for the source contract, limits, and CI exit semantics.

## Canonical Graph Operations

| Command | Description |
|---------|-------------|
| `canonical-graph status` | Show the active ttsc revision and retained count read-only |
| `canonical-graph list` | List retained revision metadata and provenance read-only |
| `canonical-graph read` | Read one exact retained graph revision by ID |

The default database is `.tsdoc/canonical-graph.db`; use `--graph-db` to override it and
`--json` for automation. These commands never create or update the active pointer.

Retention GC requires an explicit RFC3339 `--before` cutoff. `--dry-run` opens the history database
read-only; pinned records are visible in the candidate projection and are never tombstoned. A
tombstone keeps the history ID, workspace/check identity, payload digest, reason and timestamp, but
removes the retained payload. Exact replay then fails closed instead of falling back to another
history record.

---

## Code Quality (11 commands)

Analyze code quality.

| Command | Description |
|---------|-------------|
| `detect-dead-code` | Find unused code |
| `detect-cycles` | Detect circular dependencies |
| `parallel-work` | Detect parallel development zones |
| `without-responsibility` | Find missing @responsibility |
| `without-contract` | Find missing contracts |
| `coverage-report [list\|read]` | Generate or inspect persisted coverage reports |
| `sync-coverage` | Sync Istanbul coverage data |
| `coverage-baseline save\|compare\|list\|read` | Save, compare, and inspect immutable coverage baselines |
| `test-relationships` | Analyze test relationships |
| `test-examples` | Extract test examples |
| `fix` | Auto-fix common issues |

---

## Ontology (2 commands)

Explore relationship ontology.

| Command | Description |
|---------|-------------|
| `ontology-list` | List nodes/relationships |
| `ontology-stats` | Show ontology statistics |

---

## Symbol ID (3 commands)

Manage symbol identifiers.

| Command | Description |
|---------|-------------|
| `id` | Manage symbol IDs |
| `id-new` | Generate new symbol ID |
| `symbol-rename` | Rename symbol |
| `symbol-fix` | Fix symbol issues |

---

## Utility (5 commands)

System utilities.

| Command | Description |
|---------|-------------|
| `usage` | View CLI analytics |
| `install-hook` | Install pre-commit hook |
| `uninstall-hook` | Uninstall pre-commit hook |
| `rebuild-index` | Rebuild FTS5 indexes |
| `context` | Show context info |

---

## Command Details

### Phase Commands

See [[Phase Commands]] for grouped commands by development phase:
- Phase 4: Type analysis
- Phase 5: Test coverage
- Phase 6: Code health
- Phase 7: Data flow
- Phase 8: SSOT validation
- Phase 10: System management

### Relationship Types

See [[Relationship Types]] for all 25 relationship type definitions.

---

## See Also

- [[CLI Command Development Guide]] - How to create new commands
- [[Quick Start Guide]] - Getting started tutorial
- [[Work Context Workflow]] - work-context command guide
