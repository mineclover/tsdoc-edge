---
title: Commands Index
type: reference
category: cli
status: active
canonical: true
---

# [[Commands Index]]

Complete reference of all 61 TSDoc Edge CLI commands organized into 7 categories (Core Workflow, Analyzers, Query, Documentation, Spec, Advanced, Utility).

> **Quick Reference**: All 61 TSDoc Edge commands organized by category

## Core Workflow (6 commands)

Essential commands for daily usage.

### [[BuildCommand]]
```bash
tsdoc-edge build src
```
Extract all symbols and relationships from source code.

**Implementation**: `src/commands/BuildCommand.ts`
**Doc**: [[Code Dependency]], [[Inheritance]]

### [[WorkContextCommand]]
```bash
tsdoc-edge work-context <file-path>
```
Show complete context before modifying a file.

**Implementation**: `src/commands/WorkContextCommand.ts`
**Doc**: `managed/workflows/work-context-workflow.md`

### [[ExploreEntrypointCommand]]
```bash
tsdoc-edge explore-entrypoint <doc-path> [--detect-orphans]
```
Traverse documentation graph, detect orphan code.

**Implementation**: `src/commands/ExploreEntrypointCommand.ts`

### [[ParseMermaidCommand]]
```bash
tsdoc-edge parse-mermaid <file.mmd> [--generate-docs]
```
Parse .mmd diagram and generate H2 reference docs.

**Implementation**: `src/commands/ParseMermaidCommand.ts`

### [[PromoteSymbolCommand]]
```bash
tsdoc-edge promote-symbol <source-file> "<symbol-name>" [target-dir]
```
Promote H2 reference to canonical H1 in separate file.

**Implementation**: `src/commands/PromoteSymbolCommand.ts`

### [[ValidateSymbolRefsCommand]]
```bash
tsdoc-edge validate-symbol-refs <directory>
```
Validate [[Symbol]] consistency and detect duplicates.

**Implementation**: `src/commands/ValidateSymbolRefsCommand.ts`

---

## Relationship Analyzers (6 commands)

Extract and analyze relationship types.

### [[AnalyzeCallsCommand]]
```bash
tsdoc-edge analyze-calls
```
Extract call relationships (foo() calls bar()).

**Doc**: [[Call Relationships]]

### [[AnalyzeChainsCommand]]
```bash
tsdoc-edge analyze-chains
```
Find pipeline chains (3+ steps).

**Doc**: [[Pipeline]]

### [[AnalyzeIOCommand]]
```bash
tsdoc-edge analyze-io
```
Infer I/O dependencies via type matching.

**Doc**: [[IO Dependency]]

### [[AnalyzeTestsCommand]]
```bash
tsdoc-edge analyze-tests
```
Map tests to implementation.

**Doc**: [[Test Coverage]]

### [[AnalyzeTypesCommand]]
```bash
tsdoc-edge analyze-types
```
Extract type dependencies and generic constraints.

**Doc**: [[Type Dependency]], [[Generic Constraint]]

### [[DetectCircularTypesCommand]]
```bash
tsdoc-edge detect-circular-types
```
Detect circular dependencies.

**Doc**: [[Circular Dependency]]

---

## Query & Analysis (11 commands)

Query relationships and analyze code.

- **DepsCommand**: `tsdoc-edge deps <symbol-id>` - Show dependencies
- **WhoUsesCommand**: `tsdoc-edge who-uses <symbol-id>` - Reverse deps
- **UsedByCommand**: `tsdoc-edge used-by <symbol-id>` - What uses this
- **OrphansCommand**: `tsdoc-edge orphans` - Find orphaned code
- **UndocumentedCommand**: `tsdoc-edge undocumented` - Find undocumented symbols
- **UntestedCommand**: `tsdoc-edge untested` - Find untested code
- **TreeCommand**: `tsdoc-edge tree <symbol-id>` - Dependency tree
- **StatsCommand**: `tsdoc-edge stats` - Show statistics
- **HealthCommand**: `tsdoc-edge health` - Code health check
- **VisualizeDepsCommand**: `tsdoc-edge visualize-deps` - Generate visualizations
- **AnalyzeCommand**: `tsdoc-edge analyze` - Run full analysis

---

## Documentation Tools (8 commands)

Manage and validate documentation.

- **IndexDocsCommand**: `tsdoc-edge index-docs <dir>` - Index managed docs
- **UpdateBacklinksCommand**: `tsdoc-edge update-backlinks` - Update [[Symbol]] backlinks
- **UpdateSymbolRefsCommand**: `tsdoc-edge update-symbol-refs` - Update references
- **ValidateDocsCommand**: `tsdoc-edge validate-docs` - Validate doc quality
- **FindDocCommand**: `tsdoc-edge find-doc <query>` - Search documentation
- **FindUnusedDocsCommand**: `tsdoc-edge find-unused-docs` - Find unused docs
- **GenerateDocsCommand**: `tsdoc-edge generate-docs` - Generate documentation
- **CheckLinksCommand**: `tsdoc-edge check-links` - Check broken links

---

## Spec Management (5 commands)

Track specification completion.

- **SpecStatusCommand**: `tsdoc-edge spec-status` - Show spec completion
- **SpecHistoryCommand**: `tsdoc-edge spec-history <symbol>` - Show history
- **SpecDiffCommand**: `tsdoc-edge spec-diff <v1> <v2>` - Diff versions
- **SpecBumpCommand**: `tsdoc-edge spec-bump <symbol>` - Bump version
- **ValidateSpecCommand**: `tsdoc-edge validate-spec` - Validate quality

---

## Advanced Features (9 commands)

Experimental, advanced analysis, and graph visualization.

### [[ParallelWorkCommand]]
```bash
tsdoc-edge parallel-work [--working "M1,M2"]
```
Analyze parallel development safety.

**Concept**: `managed/concepts/parallel-work-theory.md`

### [[TestRelationshipsCommand]]
```bash
tsdoc-edge test-relationships
```
Analyze integration test coverage of relationships.

**Concept**: `managed/concepts/integration-test-traceability.md`

### TypeChainCommand
```bash
tsdoc-edge type-chain <symbol>
```
Show type transformation chains.

### FindRootTypesCommand
```bash
tsdoc-edge find-root-types
```
Find root types in type hierarchy.

### SyncCoverageCommand
```bash
tsdoc-edge sync-coverage
```
Sync test coverage data.

### CheckDuplicatesCommand
```bash
tsdoc-edge check-duplicates
```
Find duplicate symbols.

### RelationshipExportCommand
```bash
tsdoc-edge relationship-export --format <format> --output <file>
```
Export relationships to various formats (JSON, GraphML, DOT, CSV, Cypher, Gephi).

**Formats**:
- `gephi`: Gephi Lite SDK format (interactive web visualization)
- `graphml`: GraphML format (Gephi, yEd, Cytoscape)
- `dot`: Graphviz DOT format
- `json`: JSON format (programmatic processing)
- `csv`: CSV format (spreadsheet analysis)
- `cypher`: Neo4j Cypher statements

**Options**:
- `--category <cat>`: Filter by category
- `--type <type>`: Filter by relationship type
- `--min-confidence <n>`: Minimum confidence level (0-1)
- `--layout <layout>`: Layout algorithm (circle, grid, random)

**Examples**:
```bash
# Export to Gephi Lite
tsdoc-edge relationship-export --format gephi --output graph.json

# Filtered export
tsdoc-edge relationship-export --format gephi --category structural --type code-dependency
```

**Implementation**: `src/commands/RelationshipExportCommand.ts`
**Doc**: Gephi Export

### RelationshipVisualizeCommand
```bash
tsdoc-edge relationship-visualize <symbol-id> [--format mermaid|dot]
```
Generate Mermaid/DOT diagrams of relationships around a symbol.

**Options**:
- `--format <format>`: Output format (mermaid, dot)
- `--depth <n>`: Maximum traversal depth (default: 2)
- `--type <types>`: Filter by relationship types
- `--category <cats>`: Filter by categories
- `--output <file>`: Save to file

**Examples**:
```bash
# Mermaid flowchart
tsdoc-edge relationship-visualize class-databasemanager --format mermaid

# GraphViz DOT with filters
tsdoc-edge relationship-visualize class-buildcommand --format dot --type composition,calls
```

**Implementation**: `src/commands/RelationshipVisualizeCommand.ts`

### RelationshipPathCommand
```bash
tsdoc-edge relationship-path <from-symbol> <to-symbol>
```
Find connection paths between two symbols (optimized BFS).

**Options**:
- `--max-length <n>`: Maximum path length (default: 5)
- `--limit <n>`: Maximum paths to show (default: 10)
- `--category <cat>`: Filter by category
- `--shortest-only`: Show only shortest paths

**Performance**:
- Graph build: ~160ms (2,213 nodes)
- Path search: ~250ms

**Examples**:
```bash
# Find paths
tsdoc-edge relationship-path class-buildcommand class-databasemanager

# Shortest paths only
tsdoc-edge relationship-path class-buildcommand class-databasemanager --shortest-only --max-length 3
```

**Implementation**: `src/commands/RelationshipPathCommand.ts`

### [[Phase Commands]]
SSOT validation and completeness checking commands.
- Completeness calculation
- Missing link detection
- Reliability verification

**Implementation**: `src/commands/Phase8Commands.ts`

### Phase4Commands
Type analysis and interface dependency features. See [[Phase Commands]].
- Interface dependency mapping
- Type chain analysis
- Generic constraint tracking

**Implementation**: `src/commands/Phase4Commands.ts`

---

## Utility Commands (19 commands)

Setup, validation, and maintenance.

**Setup**:
- InitCommand: `tsdoc-edge init` - Initialize project
- [[HelpCommand]]: `tsdoc-edge help` - Show help

**Validation**:
- ValidateCommand: `tsdoc-edge validate` - Validate entire project

**Code Search**:
- FindMethodCommand: `tsdoc-edge find-method <name>` - Find methods
- ScanCommand: `tsdoc-edge scan` - Scan codebase
- CoreApiCommand: `tsdoc-edge core-api` - Show core API
- ParseCommand: `tsdoc-edge parse <file>` - Parse source

**Symbol Management**:
- IdCommand: `tsdoc-edge id <symbol>` - Get symbol ID
- IdNewCommand: `tsdoc-edge id-new <name>` - Generate new ID

**Planning**:
- PlansCommand: `tsdoc-edge plans` - Show implementation plans
- TodosCommand: `tsdoc-edge todos` - Show TODOs

**Code Quality**:
- SuggestCommand: `tsdoc-edge suggest` - Suggest improvements
- ImproveCommand: `tsdoc-edge improve` - Improve code
- FixCommand: `tsdoc-edge fix` - Fix issues
- WithoutContractCommand: `tsdoc-edge without-contract` - Missing contracts
- WithoutResponsibilityCommand: `tsdoc-edge without-responsibility` - Missing @responsibility

**Git Integration**:
- InstallHookCommand: `tsdoc-edge install-hook` - Install git hooks
- UninstallHookCommand: `tsdoc-edge uninstall-hook` - Remove hooks

**Analytics**:
- UsageCommand: `tsdoc-edge usage` - Show usage stats

---

## Command Categories Summary

```
Core Workflow:        6 commands  (10%)
Relationship Analyzers: 6 commands  (10%)
Query & Analysis:    11 commands  (18%)
Documentation:        8 commands  (13%)
Spec Management:      5 commands   (8%)
Advanced:             6 commands  (10%)
Utility:             19 commands  (31%)
────────────────────────────────────
Total:               61 commands
```

---

## Related Documentation

- [[Relationship Types]]: SSOT for all 17 relationship types
- [[Work Context Workflow]]: Primary usage workflow
- `managed/features/`: Feature-specific documentation
- `ORPHAN-DOCS-REPORT.md`: Documentation cleanup report

---

**Last Updated**: 2025-11-08

---

## Backlinks

### Referenced By

- [[CLI Commands]] → /Users/junwoobang/workflow/tsdoc-edge/managed/CLI-COMMANDS.md:12
- [[CLI Commands]] → /Users/junwoobang/workflow/tsdoc-edge/managed/CLI-COMMANDS.md:289
- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:324
- [[Analyzers & Extractors]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/index.md:245
- [[Analyzer Status]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/analyzer-status.md:279
- [[Codebase Health Report]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/codebase-health-report.md:345
- [[Features Index]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/index.md:223
- [[Guides & Tutorials]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:297
- [[Guides & Tutorials]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:347
- [[Primary Types Index]] → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/index.md:404
- [[Quick Start Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/quick-start.md:179
- [[Relationship Types]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/index.md:183
- [[Example - Mermaid Workflow]] → /Users/junwoobang/workflow/tsdoc-edge/managed/workflows/EXAMPLE-MERMAID-WORKFLOW.md:195
- [[Workflows Index]] → /Users/junwoobang/workflow/tsdoc-edge/managed/workflows/index.md:196
- [[Mermaid Entrypoint Workflow]] → /Users/junwoobang/workflow/tsdoc-edge/managed/workflows/mermaid-entrypoint-workflow.md:301

