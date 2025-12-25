---
title: Command Reference
type: index
category: commands
status: active
canonical: true
---

# [[Command Reference]]

> Complete reference for all 104 TSDoc Edge CLI commands

## Quick Start

```bash
# Initialize project
tsdoc-edge init

# Build symbol database
tsdoc-edge build src

# Check health
tsdoc-edge health src

# Get work context before editing
tsdoc-edge work-context <file>
```

## Command Categories

### Core Workflow (12 commands)

Essential commands for daily usage.

| Command | Description | Documentation |
|---------|-------------|---------------|
| `init` | Initialize configuration | [[InitCommand]] |
| `build` | Build symbol database | [[BuildCommand]] |
| `health` | Check codebase health | [[HealthCommand]] |
| `stats` | Show documentation statistics | [[StatsCommand]] |
| `work-context` | Get context before editing | [[WorkContextCommand]] |
| `design-context` | Show design decisions | [[UtilityCommands]] |
| `context-to-llm` | Generate LLM-friendly context | [[UtilityCommands]] |
| `parse` | Parse and display enhanced docs | [[ParseCommand]] |
| `scan` | Scan for TypeScript files | [[UtilityCommands]] |
| `generate-docs` | Generate markdown docs | [[UtilityCommands]] |
| `validate` | Generate validation report | [[ValidateCommand]] |
| `help` | Show help message | [[HelpCommand]] |

### Relationship Analysis (25 commands)

Commands for extracting and analyzing code relationships.

See: [[AnalyzerCommands]] for full documentation.

| Category | Commands |
|----------|----------|
| Core | `analyze-calls`, `analyze-types`, `analyze-io`, `analyze-tests`, `analyze-chains` |
| Behavioral | `analyze-collaboration`, `analyze-composition`, `analyze-temporal-order`, `analyze-behavioral` |
| Alternative | `analyze-substitution`, `analyze-fallback`, `analyze-alternatives` |
| Constraint | `analyze-constraints`, `analyze-callbacks`, `analyze-events` |
| Other | `analyze-enhancement`, `analyze-layer-dependency`, `analyze-doc-reference`, `analyze-structural`, `analyze-final`, `analyze-all`, `analyze` |

### Relationship Query (12 commands)

Commands for querying and exploring relationships.

See: [[RelationshipCommands]] for full documentation.

- `relationship-query` - Query relationships for a symbol
- `relationship-impact` - Analyze change impact
- `relationship-path` - Find connection paths
- `relationship-validate` - Validate data integrity
- `relationship-export` - Export to JSON/GraphML/DOT/CSV
- `relationship-visualize` - Generate Mermaid diagrams
- `relationship-clusters` - Find architectural clusters
- `relationship-metrics` - Calculate graph metrics
- `relationship-check` - Quick safety check
- `relationship-stats` - Show statistics
- `relationship-help` - Interactive guide
- `query-inferred` - Query inferred relationships

### Symbol Query (14 commands)

Find and explore symbols.

| Command | Description |
|---------|-------------|
| `deps` | Show dependencies | [[DepsCommand]] |
| `used-by` | Show what uses a symbol (registry) | [[UsedByCommand]] |
| `who-uses` | Show who uses a symbol (database) | [[WhoUsesCommand]] |
| `orphans` | Find orphaned symbols | [[OrphansCommand]] |
| `undocumented` | Find undocumented symbols | [[UndocumentedCommand]] |
| `untested` | Find symbols without tests | [[UntestedCommand]] |
| `tree` | Show symbol hierarchy | [[TreeCommand]] |
| `type-chain` | Show type dependency chain | [[TypeChainCommand]] |
| `find-roots` | Find root types | [[FindRootTypesCommand]] |
| `find-method` | Find methods by name | [[UtilityCommands]] |
| `core-api` | Show core API symbols | [[UtilityCommands]] |
| `symbol-query` | Query document symbols | [[SymbolQueryCommand]] |
| `doc-symbols` | List document symbols | [[UtilityCommands]] |
| `visualize` | Generate dependency diagrams | [[VisualizeDepsCommand]] |

### Documentation (16 commands)

Manage documentation.

| Command | Description |
|---------|-------------|
| `index-docs` | Index document symbols | [[IndexDocsCommand]] |
| `validate-docs` | Validate document symbols | [[ValidateDocsCommand]] |
| `validate-generated-docs` | Validate generated docs | [[UtilityCommands]] |
| `validate-symbol-refs` | Validate [[Symbol]] references | [[ValidateSymbolRefsCommand]] |
| `update-backlinks` | Update backlinks in docs | [[UpdateBacklinksCommand]] |
| `update-symbol-refs` | Update code references | [[UpdateSymbolRefsCommand]] |
| `check-links` | Check for broken links | [[CheckLinksCommand]] |
| `find-unused-docs` | Find unused documents | [[UtilityCommands]] |
| `find-doc` | Find document definitions | [[UtilityCommands]] |
| `plans` | Show future plans | [[UtilityCommands]] |
| `todos` | Show TODO items | [[UtilityCommands]] |
| `promote-symbol` | Promote H2 to H1 | [[PromoteSymbolCommand]] |
| `explore-entrypoint` | Traverse doc graph | [[ExploreEntrypointCommand]] |
| `parse-mermaid` | Parse Mermaid diagrams | [[ParseMermaidCommand]] |
| `move` | Move doc and update refs | [[UtilityCommands]] |
| `rename` | Rename doc and update refs | [[UtilityCommands]] |

### Specification (8 commands)

Manage specifications.

See: [[SpecCommands]] for full documentation.

- `validate-spec` - Validate spec completeness
- `spec-status` - Manage spec status
- `spec-history` - Show version history
- `spec-diff` - Compare versions
- `spec-bump` - Bump version
- `check-duplicates` - Check duplicate content
- `suggest` - Generate improvement suggestions
- `improve` - Improve documentation quality

### Code Quality (10 commands)

Analyze code quality.

| Command | Description |
|---------|-------------|
| `detect-dead-code` | Find unused code | [[DetectDeadCodeCommand]] |
| `detect-cycles` | Detect circular dependencies | [[DetectCircularTypesCommand]] |
| `parallel-work` | Detect parallel development zones | [[ParallelWorkCommand]] |
| `without-responsibility` | Find missing @responsibility | [[UtilityCommands]] |
| `without-contract` | Find missing contracts | [[UtilityCommands]] |
| `coverage-report` | Coverage reporting | [[CoverageReportCommand]] |
| `sync-coverage` | Sync Istanbul coverage data | [[UtilityCommands]] |
| `test-relationships` | Analyze test relationships | [[TestRelationshipsCommand]] |
| `test-examples` | Extract test examples | [[UtilityCommands]] |
| `fix` | Auto-fix common issues | [[UtilityCommands]] |

### Ontology (2 commands)

Explore relationship ontology.

| Command | Description |
|---------|-------------|
| `ontology-list` | List nodes/relationships | [[UtilityCommands]] |
| `ontology-stats` | Show ontology statistics | [[UtilityCommands]] |

### Symbol ID (4 commands)

Manage symbol identifiers.

| Command | Description |
|---------|-------------|
| `id` | Manage symbol IDs | [[UtilityCommands]] |
| `id-new` | Generate new symbol ID | [[UtilityCommands]] |
| `symbol-rename` | Rename symbol | [[UtilityCommands]] |
| `symbol-fix` | Fix symbol issues | [[SymbolFixCommand]] |

### Utility (5 commands)

System utilities.

| Command | Description |
|---------|-------------|
| `usage` | View CLI analytics | [[UsageCommand]] |
| `install-hook` | Install pre-commit hook | [[UtilityCommands]] |
| `uninstall-hook` | Uninstall pre-commit hook | [[UtilityCommands]] |
| `rebuild-index` | Rebuild FTS5 indexes | [[UtilityCommands]] |
| `context` | Show context info | [[UtilityCommands]] |

## Getting Help

```bash
# General help
tsdoc-edge help

# Command-specific help
tsdoc-edge <command> --help
```

## Related

- [[CLI Commands]] - Alphabetical command reference
- [[CLI Command Development Guide]] - Create new commands
- [[BaseCommand]] - Command base class
- [[CommandRegistry]] - Command registration

