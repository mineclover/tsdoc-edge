---
title: Query Commands
type: command
category: commands
status: active
canonical: true
---

# [[QueryCommands]]

**Source**: `src/commands/SymbolUnifiedCommand.ts`, `src/commands/SymbolQueryCommand.ts`

## Overview

Query commands for exploring dependencies, usage, and project statistics (dispatched via `tsdoc-edge symbol` and `tsdoc-edge stats`).

## Commands

### [[DepsCommand]]

Show dependencies of a symbol.

**Usage**: `tsdoc-edge symbol deps <symbol-name>`

**Source**: `src/commands/DepsCommand.ts`

**Output**:
- Direct dependencies
- Transitive dependencies
- Dependency tree

### [[WhoUsesCommand]]

Show reverse dependencies (who uses this symbol).

**Usage**: `tsdoc-edge symbol who-uses <symbol-name>`

**Source**: `src/commands/WhoUsesCommand.ts`

**Output**:
- Direct usages
- Indirect usages
- Usage count

### [[OrphansCommand]]

Find orphaned code (unreachable from entry points).

**Usage**: `tsdoc-edge symbol orphans`

**Source**: `src/commands/OrphansCommand.ts`

**Output**:
- Orphaned files
- Orphaned symbols
- Orphan count

### [[StatsCommand]]

Display project statistics.

**Usage**: `tsdoc-edge stats`

**Source**: `src/commands/StatsCommand.ts`

**Output**:
- Symbol counts by type
- File counts
- Relationship counts
- Coverage statistics

### [[UndocumentedCommand]]

Find undocumented symbols.

**Usage**: `tsdoc-edge symbol undocumented`

**Source**: `src/commands/UndocumentedCommand.ts`

### [[UntestedCommand]]

Find untested code.

**Usage**: `tsdoc-edge symbol untested`

**Source**: `src/commands/UntestedCommand.ts`

### [[DocSymbolsCommand]]

Lists all registered primary and auxiliary `[[Symbol]]` checkpoints and reference counts across managed documentation.

**Usage**: `tsdoc-edge docs symbols [path]`

**Source**: `src/commands/DocSymbolsCommand.ts`

### [[FindMethodCommand]]

Searches the indexed codebase for methods and functions matching a simple or qualified symbol name.

**Usage**: `tsdoc-edge symbol find-method <name>`

**Source**: `src/commands/FindMethodCommand.ts`

### [[FindUnusedDocsCommand]]

Identifies managed Markdown documents that have zero incoming document references or code `@doc` bindings.

**Usage**: `tsdoc-edge docs find-unused [path]`

**Source**: `src/commands/FindUnusedDocsCommand.ts`

### [[OntologyListCommand]]

Lists symbol and relationship instances matching specific relationship ontology categories and predicates.

**Usage**: `tsdoc-edge ontology list [options]`

**Source**: `src/commands/OntologyListCommand.ts`

### [[OntologyStatsCommand]]

Displays summary statistics and coverage across the 11 categories of the unified relationship ontology.

**Usage**: `tsdoc-edge ontology stats`

**Source**: `src/commands/OntologyStatsCommand.ts`

### [[RelationshipQueryEngine]]

Provides programmatic traversal, pathfinding, filtering, and subgraph querying over `UnifiedRelationship` stores.

**Source**: `src/query/RelationshipQueryEngine.ts`

## Related

- [[Phase Commands]]: Dependencies and usage queries
- [[Phase Commands]]: Statistics and reporting
- [[WorkContextCommand]]: Comprehensive file context

---

## Backlinks

### Referenced By

- [[Dependency Analysis]] → managed/features/DependencyAnalysis.md:246
- [[Impact Analysis]] → managed/features/ImpactAnalysis.md:291
- [[Features Index]] → managed/features/index.md:311

### Implemented By

- QueryCommands → src/commands/SymbolUnifiedCommand.ts:1

