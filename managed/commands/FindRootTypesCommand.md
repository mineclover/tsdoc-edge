# [[FindRootTypesCommand]]

Find root types (types with no incoming dependencies).

**Source**: `src/commands/TypeChainCommand.ts`

## Purpose

Identify root types in the TypeScript type system - types that have no incoming dependencies (no other types depend on them).

## Responsibility

- Analyze type dependency graph
- Find types with zero incoming dependencies
- Find leaf types (zero outgoing dependencies)
- Display statistics and hierarchy insights

## Input

### Command Syntax
```bash
tsdoc-edge find-roots [options]
```

### Options
- `--include-external`: Include external types from node_modules

### Examples
```bash
# Find root types in project
tsdoc-edge find-roots

# Include external types
tsdoc-edge find-roots --include-external
```

## Output

```
═══════════════════════════════════════════════════════════════════
Root Types Analysis
═══════════════════════════════════════════════════════════════════

Statistics:
  - Total Types: 450
  - Composites: 180 (40.0%)
  - Complete: 250 (55.6%)
  - No Circular Dependencies
  - Average Dependencies: 2.3

Root Types (10 found):
  • PrimitiveType → src/types/primitives.ts:15
  • ConfigBase → src/config/base.ts:22
  • ErrorCode → src/errors/codes.ts:8

Leaf Types (15 found):
  • ComplexViewModel → src/views/complex.ts:45
  • FinalOutput → src/output/final.ts:10
```

## Context

### Dependencies
- **[[TypeDependencyAnalyzer]]**: Type graph analysis
- **[[SymbolGraphBuilder]]**: Graph construction
- **[[BaseCommand]]**: Command infrastructure

### Root vs Leaf Types

| Type | Description | Significance |
|------|-------------|--------------|
| **Root** | No incoming deps | Base types, primitives, foundational interfaces |
| **Leaf** | No outgoing deps | Final outputs, terminal types, concrete implementations |

## Logic

### Algorithm
1. **Graph Construction**: Build type dependency graph
2. **Dependency Counting**:
   - Count incoming edges for each type
   - Count outgoing edges for each type
3. **Root Detection**: Types with `incomingCount === 0`
4. **Leaf Detection**: Types with `outgoingCount === 0`
5. **Statistics**: Calculate coverage and percentages

### Implementation
```typescript
const rootTypes = tracer.findRootTypes(options);
const leafTypes = tracer.findLeafTypes(options);
```

## Effects

### Side Effects
- None (read-only analysis)

### Performance
- O(V + E) where V = types, E = dependencies
- Graph traversal with edge counting

## Scope

### Public Interface
```bash
tsdoc-edge find-roots [--include-external]
```

### Exit Codes
- `0`: Success (found roots/leaves or none exist)
- `1`: Error (graph build failure)

## Related

- [[TypeChainCommand]]: Trace type dependency chains
- [[DetectCircularTypesCommand]]: Detect type cycles
- [[TypeDependencyAnalyzer]]: Type analysis engine

## Use Cases

### 1. Architecture Analysis
```bash
# Identify foundational types
tsdoc-edge find-roots

# Root types should be stable, well-designed
# High root count may indicate fragmentation
```

### 2. Refactoring Planning
- Root types are entry points - changes impact entire system
- Leaf types are safe to modify - minimal ripple effects

### 3. Type System Health
- Too many roots: Possible fragmentation
- Too many leaves: Possible dead ends or missing abstractions

---

## Backlinks

### Referenced By

- [[TypeDependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TypeDependencyAnalyzer.md:103
- [[TypeDependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TypeDependencyAnalyzer.md:104
- [[TypeDependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TypeDependencyAnalyzer.md:105
- [[TypeDependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TypeDependencyAnalyzer.md:106
- [[BaseCommand]] → /home/user/tsdoc-edge/managed/commands/BaseCommand.md:58
- [[BaseCommand]] → /home/user/tsdoc-edge/managed/commands/BaseCommand.md:59
- [[DetectCircularTypesCommand]] → /home/user/tsdoc-edge/managed/commands/DetectCircularTypesCommand.md:50
- [[DetectCircularTypesCommand]] → /home/user/tsdoc-edge/managed/commands/DetectCircularTypesCommand.md:68
- [[DetectCircularTypesCommand]] → /home/user/tsdoc-edge/managed/commands/DetectCircularTypesCommand.md:69
- [[DetectCircularTypesCommand]] → /home/user/tsdoc-edge/managed/commands/DetectCircularTypesCommand.md:70
- [[DetectCircularTypesCommand]] → /home/user/tsdoc-edge/managed/commands/DetectCircularTypesCommand.md:71
- [[TypeChainCommand]] → /home/user/tsdoc-edge/managed/commands/TypeChainCommand.md:34
- [[TypeChainCommand]] → /home/user/tsdoc-edge/managed/commands/TypeChainCommand.md:35
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:126
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:127

