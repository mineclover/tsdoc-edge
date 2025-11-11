---
title: Commands Index
type: reference
category: cli
status: active
canonical: true
---

# [[Commands Index]]

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

## Advanced Features (6 commands)

Experimental and advanced analysis.

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

---

## Utility Commands (19 commands)

Setup, validation, and maintenance.

**Setup**:
- InitCommand: `tsdoc-edge init` - Initialize project
- HelpCommand: `tsdoc-edge help` - Show help

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

- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:270
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:245
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:275
- [[Features Index]] → /home/user/tsdoc-edge/managed/features/index.md:223
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:223
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:259
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:307
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:308
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:179
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:203
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:48
- [[Circular Dependency]] → /home/user/tsdoc-edge/managed/relationships/CIRCULAR.md:17
- [[Generic Constraint]] → /home/user/tsdoc-edge/managed/relationships/GENERIC-CONSTRAINT.md:17
- [[Inheritance]] → /home/user/tsdoc-edge/managed/relationships/INHERITANCE.md:17
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:17
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:17
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:17
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:46
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:162
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:184
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:185
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:61
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:77
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:78
- [[Example - Mermaid Workflow]] → /home/user/tsdoc-edge/managed/workflows/EXAMPLE-MERMAID-WORKFLOW.md:193
- [[Example - Mermaid Workflow]] → /home/user/tsdoc-edge/managed/workflows/EXAMPLE-MERMAID-WORKFLOW.md:208
- [[Workflows Index]] → /home/user/tsdoc-edge/managed/workflows/index.md:196
- [[Mermaid Entrypoint Workflow]] → /home/user/tsdoc-edge/managed/workflows/mermaid-entrypoint-workflow.md:299
- [[Mermaid Entrypoint Workflow]] → /home/user/tsdoc-edge/managed/workflows/mermaid-entrypoint-workflow.md:307
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:252

