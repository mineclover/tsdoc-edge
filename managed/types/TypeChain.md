# [[TypeChain]]

**Source**: `src/types/domain/type-chain.ts`

## Purpose

Type system for tracking type dependency chains and paths.

## Type Chain Step

See implementation: [[TypeChainStep]]

**Single link in a dependency chain**:
- `from`: Source type name
- `to`: Target type name
- `dependency`: InterfaceDependency relationship
- `stepNumber`: Position in chain (0-indexed)
- `depth`: Distance from root

## Type Chain

See implementation: [[TypeChain]]

**Complete path from source to target**:
- `source`: Starting type
- `target`: Ending type
- `steps`: TypeChainStep[] - All steps in the chain
- `length`: Total number of steps
- `isCircular`: Whether the chain forms a cycle

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

- [[AnalyzeChainsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeChainsCommand.md:59
- [[AnalyzeChainsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeChainsCommand.md:60
- [[AnalyzeChainsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeChainsCommand.md:61
- [[DetectCircularTypesCommand]] → /home/user/tsdoc-edge/managed/commands/DetectCircularTypesCommand.md:85
- [[DetectCircularTypesCommand]] → /home/user/tsdoc-edge/managed/commands/DetectCircularTypesCommand.md:86
- [[TypeChainCommand]] → /home/user/tsdoc-edge/managed/commands/TypeChainCommand.md:53
- [[TypeChainCommand]] → /home/user/tsdoc-edge/managed/commands/TypeChainCommand.md:54
- [[TypeChainCommand]] → /home/user/tsdoc-edge/managed/commands/TypeChainCommand.md:55

