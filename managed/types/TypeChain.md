# [[TypeChain]]

**Source**: `src/types/domain/type-chain.ts`

## Purpose

Type system for tracking type dependency chains and paths.

## Type Chain Step

Single link in a dependency chain:
```typescript
interface TypeChainStep {
  from: string;              // Source type name
  to: string;                // Target type name
  dependency: InterfaceDependency;
  stepNumber: number;        // 0-indexed
  depth: number;             // Distance from root
}
```

## Type Chain

Complete path from source to target:
```typescript
interface TypeChain {
  source: string;            // Starting type
  target: string;            // Ending type
  steps: TypeChainStep[];    // All steps
  length: number;            // Total steps
  isCircular: boolean;       // Forms a cycle?
}
```

## Example Chain

```typescript
// UserService → Repository → Database
{
  source: "UserService",
  target: "Database",
  steps: [
    {
      from: "UserService",
      to: "Repository",
      dependency: { type: "property", name: "repo" },
      stepNumber: 0,
      depth: 0
    },
    {
      from: "Repository",
      to: "Database",
      dependency: { type: "property", name: "db" },
      stepNumber: 1,
      depth: 1
    }
  ],
  length: 2,
  isCircular: false
}
```

## Circular Chains

When source === target:
```typescript
{
  source: "ModuleA",
  target: "ModuleA",
  steps: [
    { from: "ModuleA", to: "ModuleB", ... },
    { from: "ModuleB", to: "ModuleC", ... },
    { from: "ModuleC", to: "ModuleA", ... }
  ],
  length: 3,
  isCircular: true
}
```

## Chain Analysis

### Chain Length
- Length 1: Direct dependency
- Length 2-3: Reasonable coupling
- Length 4+: Long dependency chain (refactor candidate)

### Chain Depth
- Depth 0: Direct dependencies
- Depth 1+: Transitive dependencies
- Deep chains indicate tight coupling

## Use Cases

### Find Dependency Path
```bash
tsdoc-edge type-chain UserService Database
# Shows all paths from UserService to Database
```

### Detect Circular Types
```bash
tsdoc-edge detect-circular-types
# Finds all circular type chains
```

### Analyze Coupling
```bash
tsdoc-edge analyze-chains
# Shows chain length distribution
# Identifies long chains for refactoring
```

## Symbol Count

2 interfaces

## Related

- [[TypeChainCommand]]: Find type dependency chains
- [[DetectCircularTypesCommand]]: Detect circular deps
- [[AnalyzeChainsCommand]]: Analyze chain patterns

---

## Backlinks

### Referenced By

- [[AnalyzeChainsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeChainsCommand.md:38
- [[DetectCircularTypesCommand]] → /home/user/tsdoc-edge/managed/commands/DetectCircularTypesCommand.md:71
- [[TypeChainCommand]] → /home/user/tsdoc-edge/managed/commands/TypeChainCommand.md:40

