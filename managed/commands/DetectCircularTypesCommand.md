---
title: Detect Circular Types Command
type: command
category: commands
status: active
canonical: true
---

# [[DetectCircularTypesCommand]]

Detect circular type dependencies in TypeScript code.

**Source**: `src/commands/TypeChainCommand.ts`

## Purpose

Identify circular dependencies in TypeScript type system, helping prevent type resolution issues and improve code structure.

## Command

```bash
tsdoc-edge detect-cycles [options]
```

## Options

- `--include-external`: Include external types from node_modules

## Functionality

Analyzes TypeScript types to detect:
- Direct circular dependencies (A � B � A)
- Indirect circular dependencies (A � B � C � A)
- Self-referential types
- Type composition cycles

## Output

```
Circular Dependency Detection

Statistics:
  - Total Types: 450
  - Composites: 180 (40.0%)
  - Complete: 250 (55.6%)
  - Circular Dependencies: 5

Detected Cycles:

1. Type: UserData
   Cycle: UserData � OrderData � CustomerData � UserData
   Length: 3

2. Type: ConfigOptions
   Cycle: ConfigOptions � AdvancedOptions � ConfigOptions
   Length: 2

Total: 5 circular dependencies found
```

## Use Cases

1. **Refactoring**: Identify problematic type structures
2. **Code Review**: Verify type dependency health
3. **CI/CD**: Fail builds on circular dependencies
4. **Architecture**: Maintain clean type boundaries

## Algorithm

Uses DFS (Depth-First Search) to detect cycles:
1. Build type dependency graph
2. Traverse graph from each type
3. Track visited nodes and recursion stack
4. Detect back edges (cycles)
5. Report cycle paths

## Related

- [[TypeChainCommand]]: Trace type dependency chains
- [[FindRootTypesCommand]]: Find root types in hierarchy
- [[TypeDependencyAnalyzer]]: Type analysis engine

---

**Category**: Command
**Status**: Active

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → managed/README.md:99
- [[FindRootTypesCommand]] → managed/commands/FindRootTypesCommand.md:123
- [[Dependency Analysis]] → managed/features/DependencyAnalysis.md:159
- [[SymbolGraphFeatures]] → managed/features/symbol-graph.md:282
- [[ValidationFeatures]] → managed/features/validation-features.md:278
- [[TypeChain]] → managed/types/TypeChain.md:124
- [[MermaidGenerator]] → managed/utilities/MermaidGenerator.md:135

### Implemented By

- DetectCircularTypesCommand → src/commands/TypeChainCommand.ts:1

