---
title: CLI Commands Reference
type: reference
category: cli
status: active
canonical: true
---

# [[CLI Commands]]

Alphabetical reference of all 104 TSDoc Edge CLI commands.

> See [[Commands Index]] for commands organized by category.

## A

| Command | Description |
|---------|-------------|
| `analyze` | Analyze code health for a directory |
| `analyze-all` | Run all relationship analyzers |
| `analyze-alternatives` | Analyze substitution and fallback patterns |
| `analyze-behavioral` | Analyze collaboration, composition, temporal-order |
| `analyze-callbacks` | Analyze callback patterns |
| `analyze-calls` | Analyze function call relationships |
| `analyze-chains` | Analyze dependency chains |
| `analyze-collaboration` | Analyze mutual dependencies |
| `analyze-composition` | Analyze has-a patterns |
| `analyze-constraints` | Analyze co-requirements and mutual exclusion |
| `analyze-doc-reference` | Analyze Code ↔ Doc via @doc tags |
| `analyze-enhancement` | Analyze @enhances tag relationships |
| `analyze-events` | Analyze event flow patterns |
| `analyze-fallback` | Analyze error recovery patterns |
| `analyze-final` | Analyze pipeline and feature-grouping |
| `analyze-io` | Analyze I/O data flow dependencies |
| `analyze-layer-dependency` | Analyze architectural layers |
| `analyze-structural` | Analyze implementation + test coverage |
| `analyze-substitution` | Analyze interchangeable implementations |
| `analyze-temporal-order` | Analyze execution sequence |
| `analyze-tests` | Analyze test coverage relationships |
| `analyze-types` | Analyze type dependencies |

## B-C

| Command | Description |
|---------|-------------|
| `build` | Build symbol database from source |
| `check-duplicates` | Check for duplicate content |
| `check-links` | Check for broken links |
| `context` | Show context info |
| `context-to-llm` | Generate LLM-friendly context |
| `core-api` | Show core API symbols |
| `coverage-report` | Coverage reporting |

## D

| Command | Description |
|---------|-------------|
| `deps` | Show dependencies of a symbol |
| `design-context` | Show design decisions for a file |
| `detect-cycles` | Detect circular dependencies |
| `detect-dead-code` | Find unused code |
| `doc-symbols` | List document symbols |

## E-F

| Command | Description |
|---------|-------------|
| `explore-entrypoint` | Traverse doc graph from entrypoint |
| `find-doc` | Find document definitions |
| `find-method` | Find methods by name |
| `find-roots` | Find root types |
| `find-unused-docs` | Find unused documents |
| `fix` | Auto-fix common issues |

## G-H

| Command | Description |
|---------|-------------|
| `generate-docs` | Generate markdown documentation |
| `health` | Check codebase health score |
| `help` | Show help message |

## I

| Command | Description |
|---------|-------------|
| `id` | Manage symbol IDs |
| `id-new` | Generate new symbol ID |
| `improve` | Improve documentation quality |
| `index-docs` | Index document symbols |
| `init` | Initialize TSDoc Edge configuration |
| `install-hook` | Install pre-commit hook |

## M-O

| Command | Description |
|---------|-------------|
| `move` | Move doc and update references |
| `ontology-list` | List ontology nodes/relationships |
| `ontology-stats` | Show ontology statistics |
| `orphans` | Find orphaned symbols |

## P

| Command | Description |
|---------|-------------|
| `parallel-work` | Detect parallel development zones |
| `parse` | Parse and display enhanced docs |
| `parse-mermaid` | Parse Mermaid diagrams |
| `plans` | Show future plans |
| `promote-symbol` | Promote H2 to H1 |

## Q

| Command | Description |
|---------|-------------|
| `query-inferred` | Query inferred relationships |

## R

| Command | Description |
|---------|-------------|
| `rebuild-index` | Rebuild FTS5 indexes |
| `relationship-check` | Quick safety check |
| `relationship-clusters` | Find architectural clusters |
| `relationship-export` | Export relationships |
| `relationship-help` | Interactive guide |
| `relationship-impact` | Analyze change impact |
| `relationship-metrics` | Calculate graph metrics |
| `relationship-path` | Find connection paths |
| `relationship-query` | Query relationships for a symbol |
| `relationship-stats` | Show relationship statistics |
| `relationship-validate` | Validate data integrity |
| `relationship-visualize` | Generate Mermaid diagrams |
| `rename` | Rename doc and update references |

## S

| Command | Description |
|---------|-------------|
| `scan` | Scan directory for TypeScript files |
| `spec-bump` | Bump specification version |
| `spec-diff` | Compare specification versions |
| `spec-history` | Show version history |
| `spec-status` | Manage specification status |
| `stats` | Show documentation statistics |
| `suggest` | Generate improvement suggestions |
| `symbol-fix` | Fix symbol issues |
| `symbol-query` | Query document symbols |
| `symbol-rename` | Rename symbol |
| `sync-coverage` | Sync Istanbul coverage data |

## T

| Command | Description |
|---------|-------------|
| `test-examples` | Extract test examples |
| `test-relationships` | Analyze test relationships |
| `todos` | Show TODO items |
| `tree` | Show symbol hierarchy |
| `type-chain` | Show type dependency chain |

## U

| Command | Description |
|---------|-------------|
| `undocumented` | Find undocumented symbols |
| `uninstall-hook` | Uninstall pre-commit hook |
| `untested` | Find symbols without tests |
| `update-backlinks` | Update backlinks in docs |
| `update-symbol-refs` | Update code references |
| `usage` | View CLI analytics |
| `used-by` | Show what uses a symbol (registry) |

## V

| Command | Description |
|---------|-------------|
| `validate` | Generate validation report |
| `validate-docs` | Validate document symbols |
| `validate-generated-docs` | Validate generated docs |
| `validate-spec` | Validate spec completeness |
| `validate-symbol-refs` | Validate [[Symbol]] references |
| `visualize` | Generate dependency diagrams |

## W

| Command | Description |
|---------|-------------|
| `who-uses` | Show who uses a symbol (database) |
| `without-contract` | Find missing contracts |
| `without-responsibility` | Find missing @responsibility |
| `work-context` | Get context before editing a file |

---

## Getting Help

```bash
# General help
tsdoc-edge help

# Command-specific help
tsdoc-edge <command> --help
```

## See Also

- [[Commands Index]] - Commands by category
- [[Quick Start Guide]] - Getting started
- [[CLI Command Development Guide]] - Create new commands
