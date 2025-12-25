---
title: SymbolSearchEngine
type: utility
category: utility
status: active
canonical: true
---

# [[SymbolSearchEngine]]

**Source**: `src/graph/SymbolSearchEngine.ts`

## Purpose

Provide fast and flexible symbol search capabilities across the symbol graph.

## Query Interface

### Symbol Query

See implementation: SymbolQuery

**Key Properties**:
- `namePattern`: Regex pattern for symbol names
- `type`: Filter by symbol types (function, class, etc.)
- `filePath`: File path pattern
- `isPublic`: Public API only?
- `hasDoc`: Documented symbols only?
- `hasTests`: Tested symbols only?
- `hasContract`: Has @contract tag?
- `hasResponsibility`: Has @responsibility tag?
- `dependencies`: Must depend on these symbols
- `dependents`: Must be used by these symbols

### Query Result

See implementation: SymbolQueryResult

**Key Properties**:
- `symbols`: Matching symbols array
- `count`: Total number of matches
- `executionTime`: Query execution time (ms)

## Search Strategies

### Filter Chaining

Uses native Array.filter performance:
- **Rationale**: Simpler than SQL-like query builder
- **Benefits**: No query parsing, easy to extend
- **Performance**: Scales linearly with filter count

### Regex Pattern Matching

Case-insensitive by default:
```typescript
namePattern: 'user.*service'
// Matches: UserService, userService, User_Service
```

## Common Queries

### Find by Name Pattern
```typescript
const result = engine.search({
  namePattern: 'User.*'
});
// Finds: UserService, UserRepository, UserDTO
```

### Find Undocumented Symbols
```typescript
const undocumented = engine.findUndocumented();
// Symbols without TSDoc comments
```

### Find Untested Symbols
```typescript
const untested = engine.findUntested();
// Symbols without test coverage
```

### Find Missing Contracts
```typescript
const noContract = engine.findMissingContract();
// Public APIs without @contract tag
```

### Find by Dependencies
```typescript
const result = engine.search({
  dependencies: ['user-repository']
});
// Symbols that depend on UserRepository
```

### Find by Dependents
```typescript
const result = engine.search({
  dependents: ['logger']
});
// Symbols that use Logger
```

## Specialized Finders

### Orphaned Symbols
```typescript
const orphans = engine.findOrphans();
// Symbols with no dependents (dead code candidates)
```

### Public API Symbols
```typescript
const publicApi = engine.search({
  isPublic: true
});
```

### Entry Points
```typescript
const entryPoints = engine.findEntryPoints();
// Commands, exports, main functions
```

## Performance Tracking

Each query measures execution time:
```typescript
const result = engine.search(query);
console.log(`Query took ${result.executionTime}ms`);
console.log(`Found ${result.count} symbols`);
```

## Complex Queries

### High-priority Undocumented
```typescript
const critical = engine.search({
  isPublic: true,
  hasDoc: false,
  type: ['class', 'interface', 'function']
});
```

### Untested Public APIs
```typescript
const risky = engine.search({
  isPublic: true,
  hasTests: false
});
```

### Dead Code Detection
```typescript
const dead = engine.search({
  dependents: [],
  isPublic: false
});
```

## Symbol Count

1 class

## Related

- [[SymbolGraphBuilder]]: Builds searchable graph
- [[Symbol]]: Symbol type definition
- FindMethodCommand: CLI symbol search

---

## Backlinks

### Referenced By

- TSDoc Edge Documentation → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:181
- TSDoc Edge Documentation → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:242
- [[UndocumentedCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/UndocumentedCommand.md:45
- [[UndocumentedCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/UndocumentedCommand.md:118
- DatabaseManager → /Users/junwoobang/workflow/tsdoc-edge/managed/core-components/DatabaseManager.md:190
- DepthTraverser → /Users/junwoobang/workflow/tsdoc-edge/managed/core-components/DepthTraverser.md:119
- DepthTraverser → /Users/junwoobang/workflow/tsdoc-edge/managed/core-components/DepthTraverser.md:153
- [[SymbolGraphFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/symbol-graph.md:58
- [[ValidationFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/validation-features.md:110
- [[Guides & Tutorials]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:231
- ConnectivityValidator → /Users/junwoobang/workflow/tsdoc-edge/managed/utilities/ConnectivityValidator.md:121
- [[SymbolGraphBuilder]] → /Users/junwoobang/workflow/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:96
- [[Utilities Index]] → /Users/junwoobang/workflow/tsdoc-edge/managed/utilities/index.md:402

