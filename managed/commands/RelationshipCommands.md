---
title: Relationship Commands
type: reference
category: commands
status: active
canonical: true
---

# [[RelationshipCommands]]

> Commands for querying, analyzing, and visualizing symbol relationships

## Overview

The relationship commands provide tools for exploring and analyzing the relationship graph built from code analysis.

## Query Commands

### [[RelationshipQueryCommand]]

Queries incoming and outgoing unified relationships for a symbol filtered by type, category, and depth.

```bash
tsdoc-edge relationship query <symbol-id> [options]
  --type <type>       Filter by relationship type
  --direction <dir>   'incoming', 'outgoing', or 'both'
  --depth <n>         Traversal depth (default: 1)
```

**Source**: `src/commands/RelationshipQueryCommand.ts`

### [[RelationshipPathCommand]]

Finds shortest and filtered dependency connection paths between two symbols in the relationship graph.

```bash
tsdoc-edge relationship path <from> <to> [options]
  --max-depth <n>     Maximum path length
  --type <type>       Filter by relationship type
```

**Source**: `src/commands/RelationshipPathCommand.ts`

### query-inferred

Query inferred relationships (computed, not stored).

```bash
tsdoc-edge query-inferred <symbol-id> [options]
```

**Source**: `src/commands/QueryInferredCommand.ts`

## Analysis Commands

### [[RelationshipImpactCommand]]

Computes direct and transitive downstream/upstream change impact for a given symbol up to a configurable depth.

```bash
tsdoc-edge relationship impact <symbol-id> [options]
  --depth <n>         Impact traversal depth
  --output <format>   json, table, or mermaid
```

**Source**: `src/commands/RelationshipImpactCommand.ts`

### [[RelationshipMetricsCommand]]

Calculates graph centrality, degree, betweenness, and hub/bridge importance metrics across symbols.

```bash
tsdoc-edge relationship metrics [options]
  --top <n>           Show top N symbols
  --metric <type>     Specific metric to calculate
```

**Source**: `src/commands/RelationshipMetricsCommand.ts`

### [[RelationshipClustersCommand]]

Discovers cohesive architectural clusters and module boundaries within the unified relationship graph.

```bash
tsdoc-edge relationship clusters [options]
  --min-size <n>      Minimum cluster size
  --algorithm <alg>   Clustering algorithm
```

**Source**: `src/commands/RelationshipClustersCommand.ts`

## Validation Commands

### [[RelationshipValidateCommand]]

Validates referential integrity, endpoint existence, and schema consistency of stored relationship records.

```bash
tsdoc-edge relationship validate [options]
  --fix               Auto-fix issues
```

**Source**: `src/commands/RelationshipValidateCommand.ts`

### [[RelationshipCheckCommand]]

Runs a pre-change safety check summarizing high-risk dependents and contract constraints for a target symbol.

```bash
tsdoc-edge relationship check <symbol-id>
```

**Source**: `src/commands/RelationshipCheckCommand.ts`

## Export Commands

### [[RelationshipExportCommand]]

Exports symbol relationship subgraphs to JSON, CSV, DOT, and GraphML interchange formats.

```bash
tsdoc-edge relationship export [options]
  --format <fmt>      json, graphml, dot, or csv
  --output <file>     Output file path
  --filter <type>     Filter by relationship type
```

**Source**: `src/commands/RelationshipExportCommand.ts`

### [[RelationshipVisualizeCommand]]

Renders Mermaid relationship diagrams centered on a target symbol with configurable depth and edge filters.

```bash
tsdoc-edge relationship visualize <symbol-id> [options]
  --depth <n>         Visualization depth
  --type <type>       Filter by relationship type
```

**Source**: `src/commands/RelationshipVisualizeCommand.ts`

## Utility Commands

### [[RelationshipStatsCommand]]

Reports aggregate counts and distributions of stored relationships grouped by type, category, and confidence.

```bash
tsdoc-edge relationship stats [options]
  --by-type           Group by relationship type
```

**Source**: `src/commands/RelationshipStatsCommand.ts`

### [[RelationshipHelpCommand]]

Displays interactive usage guidance and workflow recipes for the relationship analysis CLI command suite.

```bash
tsdoc-edge relationship help
```

**Source**: `src/commands/RelationshipHelpCommand.ts`

## Related

- [[Relationship Types]] - All relationship type definitions
- [[Relationship Analysis Guide]] - How to use relationship analysis
- [[SymbolGraphFeatures]] - Symbol graph system

---

## Backlinks

### Referenced By

- [[CLI Commands]] → managed/CLI-COMMANDS.md:43

### Implemented By

- RelationshipCommands → src/commands/RelationshipQueryCommand.ts:1
- AnalyzeRelationshipsCommand → src/commands/AnalyzeRelationshipsCommand.ts:42
- RelationshipCommand → src/commands/RelationshipCommand.ts:60

