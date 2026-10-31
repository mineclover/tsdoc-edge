---
title: Type Chain Command
type: command
category: commands
status: active
canonical: true
---

# [[TypeChainCommand]]

**Source**: `src/commands/TypeChainCommand.ts`

## Purpose

Trace and display type chains (A → B → C).

## Features

- Type dependency tracing
- Generic constraint following
- Interface extension chains

## Symbol Count

20 symbols (3 classes)

## Related

- TypeChainTracer: Core tracing logic
- [[Type Dependency]]: Type relationships

---

## Backlinks

### Referenced By

- [[DetectCircularTypesCommand]] → managed/commands/DetectCircularTypesCommand.md:79
- [[FindRootTypesCommand]] → managed/commands/FindRootTypesCommand.md:122
- [[DepthTraverser]] → managed/core-components/DepthTraverser.md:276
- [[Dependency Analysis]] → managed/features/DependencyAnalysis.md:158
- [[Impact Analysis]] → managed/features/ImpactAnalysis.md:201
- [[SymbolGraphFeatures]] → managed/features/symbol-graph.md:274
- [[TypeChain]] → managed/types/TypeChain.md:123

### Implemented By

- TypeChainCommand → src/commands/TypeChainCommand.ts:29

