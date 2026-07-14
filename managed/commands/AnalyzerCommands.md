---
title: Analyzer Commands
type: reference
category: commands
status: active
canonical: true
---

# [[AnalyzerCommands]]

> Commands for running relationship and code analyzers

## Overview

Analyzer commands extract relationships from source code and populate the relationship database.

## Core Analyzers

### analyze-calls

Analyze function call relationships.

```bash
tsdoc-edge analyze-calls [path] [options]
```

**Source**: `src/commands/AnalyzeCallsCommand.ts`
**Relationship**: [[Call Relationships]]

### analyze-types

Analyze type dependencies.

```bash
tsdoc-edge analyze-types [path] [options]
```

**Source**: `src/commands/AnalyzeTypesCommand.ts`
**Relationship**: [[Type Dependency]]

### analyze-io

Analyze I/O data flow dependencies.

```bash
tsdoc-edge analyze-io [path] [options]
```

**Source**: `src/commands/AnalyzeIOCommand.ts`
**Relationship**: [[IO Dependency]]

### test-relationships

Analyze test coverage relationships.

```bash
tsdoc-edge test-relationships [path] [options]
```

**Source**: `src/commands/TestRelationshipsCommand.ts`
**Relationship**: [[Test Coverage]]

### analyze-chains

Analyze dependency chains.

```bash
tsdoc-edge analyze-chains [path] [options]
```

**Source**: `src/commands/AnalyzeChainsCommand.ts`
**Relationship**: [[Pipeline]]

## Behavioral Analyzers

### analyze-collaboration

Analyze mutual dependencies between symbols.

```bash
tsdoc-edge analyze-collaboration [path]
```

**Source**: `src/commands/AnalyzeCollaborationCommand.ts`
**Relationship**: [[Collaboration]]

### analyze-composition

Analyze has-a patterns.

```bash
tsdoc-edge analyze-composition [path]
```

**Source**: `src/commands/AnalyzeCompositionCommand.ts`
**Relationship**: [[Composition Relationship]]

### analyze-temporal-order

Analyze execution sequence dependencies.

```bash
tsdoc-edge analyze-temporal-order [path]
```

**Source**: `src/commands/AnalyzeTemporalOrderCommand.ts`
**Relationship**: [[Temporal Order]]

### analyze-behavioral

Run all behavioral analyzers.

```bash
tsdoc-edge analyze-behavioral [path]
```

**Source**: `src/commands/AnalyzeBehavioralCommand.ts`

## Alternative Analyzers

### analyze-substitution

Analyze interchangeable implementations.

```bash
tsdoc-edge analyze-substitution [path]
```

**Source**: `src/commands/AnalyzeSubstitutionCommand.ts`
**Relationship**: [[Substitution]]

### analyze-fallback

Analyze error recovery patterns.

```bash
tsdoc-edge analyze-fallback [path]
```

**Source**: `src/commands/AnalyzeFallbackCommand.ts`
**Relationship**: [[Fallback]]

### analyze-alternatives

Run all alternative analyzers.

```bash
tsdoc-edge analyze-alternatives [path]
```

**Source**: `src/commands/AnalyzeAlternativesCommand.ts`

## Constraint Analyzers

### analyze-constraints

Analyze co-requirements and mutual exclusion.

```bash
tsdoc-edge analyze-constraints [path]
```

**Source**: `src/commands/AnalyzeConstraintsCommand.ts`
**Relationships**: [[Co-Requirement]], [[Mutual Exclusion]]

### analyze-callbacks

Analyze callback patterns.

```bash
tsdoc-edge analyze-callbacks [path]
```

**Source**: `src/commands/AnalyzeCallbacksCommand.ts`
**Relationship**: [[Callback Pattern]]

### analyze-events

Analyze event flow patterns.

```bash
tsdoc-edge analyze-events [path]
```

**Source**: `src/commands/AnalyzeEventsCommand.ts`
**Relationship**: [[Event Flow]]

## Other Analyzers

### analyze-enhancement

Analyze @enhances tag relationships.

```bash
tsdoc-edge analyze-enhancement [path]
```

**Source**: `src/commands/AnalyzeEnhancementCommand.ts`

### analyze-layer-dependency

Analyze architectural layer dependencies.

```bash
tsdoc-edge analyze-layer-dependency [path]
```

**Source**: `src/commands/AnalyzeLayerDependencyCommand.ts`

### analyze-doc-reference

Analyze Code-Doc connections via @doc tags.

```bash
tsdoc-edge analyze-doc-reference [path]
```

**Source**: `src/commands/AnalyzeDocReferenceCommand.ts`
**Relationship**: [[Doc Reference]]

### analyze-structural

Run structural analyzers (implementation + test coverage).

```bash
tsdoc-edge analyze-structural [path]
```

**Source**: `src/commands/AnalyzeStructuralCommand.ts`

### analyze-final

Run final analyzers (pipeline + feature-grouping).

```bash
tsdoc-edge analyze-final [path]
```

**Source**: `src/commands/AnalyzeFinalCommand.ts`

### analyze-all

Run all relationship analyzers.

```bash
tsdoc-edge analyze-all [path] [options]
  --parallel          Run analyzers in parallel
```

**Source**: `src/commands/AnalyzeAllCommand.ts`

## Related

- [[Analyzers & Extractors]] - Analyzer implementations
- [[Relationship Types]] - Relationship definitions
- [[Relationship Analysis Guide]] - Usage guide
