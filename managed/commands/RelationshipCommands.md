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

### relationship-query

Query relationships for a specific symbol.

```bash
tsdoc-edge relationship-query <symbol-id> [options]
  --type <type>       Filter by relationship type
  --direction <dir>   'incoming', 'outgoing', or 'both'
  --depth <n>         Traversal depth (default: 1)
```

**Source**: `src/commands/RelationshipQueryCommand.ts`

### relationship-path

Find connection paths between two symbols.

```bash
tsdoc-edge relationship-path <from> <to> [options]
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

### relationship-impact

Analyze change impact for a symbol.

```bash
tsdoc-edge relationship-impact <symbol-id> [options]
  --depth <n>         Impact traversal depth
  --output <format>   json, table, or mermaid
```

**Source**: `src/commands/RelationshipImpactCommand.ts`

### relationship-metrics

Calculate graph metrics (centrality, clustering).

```bash
tsdoc-edge relationship-metrics [options]
  --top <n>           Show top N symbols
  --metric <type>     Specific metric to calculate
```

**Source**: `src/commands/RelationshipMetricsCommand.ts`

### relationship-clusters

Find architectural clusters in the codebase.

```bash
tsdoc-edge relationship-clusters [options]
  --min-size <n>      Minimum cluster size
  --algorithm <alg>   Clustering algorithm
```

**Source**: `src/commands/RelationshipClustersCommand.ts`

## Validation Commands

### relationship-validate

Validate data integrity of relationships.

```bash
tsdoc-edge relationship-validate [options]
  --fix               Auto-fix issues
```

**Source**: `src/commands/RelationshipValidateCommand.ts`

### relationship-check

Quick safety check before changes.

```bash
tsdoc-edge relationship-check <symbol-id>
```

**Source**: `src/commands/RelationshipCheckCommand.ts`

## Export Commands

### relationship-export

Export relationships to various formats.

```bash
tsdoc-edge relationship-export [options]
  --format <fmt>      json, graphml, dot, or csv
  --output <file>     Output file path
  --filter <type>     Filter by relationship type
```

**Source**: `src/commands/RelationshipExportCommand.ts`

### relationship-visualize

Generate Mermaid diagrams from relationships.

```bash
tsdoc-edge relationship-visualize <symbol-id> [options]
  --depth <n>         Visualization depth
  --type <type>       Filter by relationship type
```

**Source**: `src/commands/RelationshipVisualizeCommand.ts`

## Utility Commands

### relationship-stats

Show relationship statistics.

```bash
tsdoc-edge relationship-stats [options]
  --by-type           Group by relationship type
```

**Source**: `src/commands/RelationshipStatsCommand.ts`

### relationship-help

Interactive guide for relationship commands.

```bash
tsdoc-edge relationship-help
```

**Source**: `src/commands/RelationshipHelpCommand.ts`

## Related

- [[Relationship Types]] - All relationship type definitions
- [[Relationship Analysis Guide]] - How to use relationship analysis
- [[SymbolGraphFeatures]] - Symbol graph system

