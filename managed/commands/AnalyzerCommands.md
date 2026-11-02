---
title: Analyzer Commands
type: reference
category: commands
status: active
canonical: true
---

# [[AnalyzerCommands]]

**Source**: `src/commands/AnalyzeRelationshipsCommand.ts`

> Commands for running relationship and code analyzers via `tsdoc-edge relationship analyze` (`src/commands/RelationshipCommand.ts`)

## Overview

Analyzer commands extract relationships from source code and populate the relationship database through the unified `AnalyzeRelationshipsCommand` dispatcher.

## Core Analyzers

### analyze-calls

Analyze function call relationships.

```bash
tsdoc-edge relationship analyze --type=calls [options]
```

**Source**: `src/commands/AnalyzeRelationshipsCommand.ts`
**Relationship**: [[Call Relationships]]

### analyze-types

Analyze type dependencies.

```bash
tsdoc-edge relationship analyze --type=types [options]
```

**Source**: `src/commands/AnalyzeRelationshipsCommand.ts`
**Relationship**: [[Type Dependency]]

### analyze-io

Analyze I/O data flow dependencies.

```bash
tsdoc-edge relationship analyze --type=io [options]
```

**Source**: `src/commands/AnalyzeRelationshipsCommand.ts`
**Relationship**: [[IO Dependency]]

### test-relationships

Analyze test coverage relationships.

```bash
tsdoc-edge relationship analyze --type=tests [options]
```

**Source**: `src/commands/AnalyzeRelationshipsCommand.ts`
**Relationship**: [[Test Coverage]]

### analyze-chains

Analyze dependency chains.

```bash
tsdoc-edge relationship analyze --type=chains [options]
```

**Source**: `src/commands/AnalyzeRelationshipsCommand.ts`
**Relationship**: [[Pipeline]]

## Behavioral Analyzers

### analyze-collaboration

Analyze mutual dependencies between symbols.

```bash
tsdoc-edge relationship analyze --type=collaboration [options]
```

**Source**: `src/commands/AnalyzeRelationshipsCommand.ts`
**Relationship**: [[Collaboration]]

### analyze-composition

Analyze has-a patterns.

```bash
tsdoc-edge relationship analyze --type=composition [options]
```

**Source**: `src/commands/AnalyzeRelationshipsCommand.ts`
**Relationship**: [[Composition Relationship]]

### analyze-temporal-order

Analyze execution sequence dependencies.

```bash
tsdoc-edge relationship analyze --type=temporal-order [options]
```

**Source**: `src/commands/AnalyzeRelationshipsCommand.ts`
**Relationship**: [[Temporal Order]]

### analyze-behavioral

Run all behavioral analyzers.

```bash
tsdoc-edge relationship analyze --type=behavioral [options]
```

**Source**: `src/commands/AnalyzeRelationshipsCommand.ts`

## Alternative Analyzers

### analyze-substitution

Analyze interchangeable implementations.

```bash
tsdoc-edge relationship analyze --type=substitution [options]
```

**Source**: `src/commands/AnalyzeRelationshipsCommand.ts`
**Relationship**: [[Substitution]]

### analyze-fallback

Analyze error recovery patterns.

```bash
tsdoc-edge relationship analyze --type=fallback [options]
```

**Source**: `src/commands/AnalyzeRelationshipsCommand.ts`
**Relationship**: [[Fallback]]

### analyze-alternatives

Run all alternative analyzers.

```bash
tsdoc-edge relationship analyze --type=alternatives [options]
```

**Source**: `src/commands/AnalyzeRelationshipsCommand.ts`

## Constraint Analyzers

### analyze-constraints

Analyze co-requirements and mutual exclusion.

```bash
tsdoc-edge relationship analyze --type=constraints [options]
```

**Source**: `src/commands/AnalyzeRelationshipsCommand.ts`
**Relationships**: [[Co-Requirement]], [[Mutual Exclusion]]

### analyze-callbacks

Analyze callback patterns.

```bash
tsdoc-edge relationship analyze --type=callbacks [options]
```

**Source**: `src/commands/AnalyzeRelationshipsCommand.ts`
**Relationship**: [[Callback Pattern]]

### analyze-events

Analyze event flow patterns.

```bash
tsdoc-edge relationship analyze --type=events [options]
```

**Source**: `src/commands/AnalyzeRelationshipsCommand.ts`
**Relationship**: [[Event Flow]]

## Other Analyzers

### analyze-enhancement

Analyze @enhances tag relationships.

```bash
tsdoc-edge relationship analyze --type=enhancement [options]
```

**Source**: `src/commands/AnalyzeRelationshipsCommand.ts`

### analyze-layer-dependency

Analyze architectural layer dependencies.

```bash
tsdoc-edge relationship analyze --type=layer-dependency [options]
```

**Source**: `src/commands/AnalyzeRelationshipsCommand.ts`

### analyze-doc-reference

Analyze Code-Doc connections via @doc tags.

```bash
tsdoc-edge relationship analyze --type=doc-reference [options]
```

**Source**: `src/commands/AnalyzeRelationshipsCommand.ts`
**Relationship**: [[Doc Reference]]

### analyze-structural

Run structural analyzers (implementation + test coverage).

```bash
tsdoc-edge relationship analyze --type=structural [options]
```

**Source**: `src/commands/AnalyzeRelationshipsCommand.ts`

### analyze-final

Run final analyzers (pipeline + feature-grouping / module-boundary).

```bash
tsdoc-edge relationship analyze --type=module-boundary [options]
```

**Source**: `src/commands/AnalyzeRelationshipsCommand.ts`

### analyze-all

Run all relationship analyzers.

```bash
tsdoc-edge relationship analyze --type=all [options]
```

**Source**: `src/commands/AnalyzeRelationshipsCommand.ts`

## Related

- [[Analyzers & Extractors]] - Analyzer implementations
- [[Relationship Types]] - Relationship definitions
- [[Relationship Analysis Guide]] - Usage guide

---

## Backlinks

### Referenced By

- [[CLI Commands]] → managed/CLI-COMMANDS.md:43

### Implemented By

- AnalyzerCommands → src/commands/AnalyzeRelationshipsCommand.ts:1

