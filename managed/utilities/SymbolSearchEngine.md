# [[SymbolSearchEngine]]

**Source**: `src/graph/SymbolSearchEngine.ts`

## Purpose

Provide fast and flexible symbol search capabilities across the symbol graph.

## Query Interface

### Symbol Query

Multi-criteria search:
```typescript
interface SymbolQuery {
  namePattern?: string;      // Regex pattern
  type?: SymbolType[];       // Symbol types
  filePath?: string;         // File path pattern
  isPublic?: boolean;        // Public API only?
  hasDoc?: boolean;          // Documented?
  hasTests?: boolean;        // Tested?
  hasContract?: boolean;     // Has @contract?
  hasResponsibility?: boolean; // Has @responsibility?
  dependencies?: string[];   // Depends on these
  dependents?: string[];     // Used by these
}
```

### Query Result

```typescript
interface SymbolQueryResult {
  symbols: Symbol[];
  count: number;
  executionTime: number;     // Milliseconds
}
```

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
- [[FindMethodCommand]]: CLI symbol search

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:118
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:179
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:502
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:503
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:55
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:431
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:432
- [[UndocumentedCommand]] → /home/user/tsdoc-edge/managed/commands/UndocumentedCommand.md:45
- [[UndocumentedCommand]] → /home/user/tsdoc-edge/managed/commands/UndocumentedCommand.md:118
- [[UndocumentedCommand]] → /home/user/tsdoc-edge/managed/commands/UndocumentedCommand.md:169
- [[UndocumentedCommand]] → /home/user/tsdoc-edge/managed/commands/UndocumentedCommand.md:170
- [[UndocumentedCommand]] → /home/user/tsdoc-edge/managed/commands/UndocumentedCommand.md:171
- [[UndocumentedCommand]] → /home/user/tsdoc-edge/managed/commands/UndocumentedCommand.md:172
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:190
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:440
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:441
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:58
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:382
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:383
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:110
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:348
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:349
- [[DepthTraverser]] → /home/user/tsdoc-edge/managed/graph/DepthTraverser.md:103
- [[DepthTraverser]] → /home/user/tsdoc-edge/managed/graph/DepthTraverser.md:137
- [[DepthTraverser]] → /home/user/tsdoc-edge/managed/graph/DepthTraverser.md:184
- [[DepthTraverser]] → /home/user/tsdoc-edge/managed/graph/DepthTraverser.md:185
- [[DepthTraverser]] → /home/user/tsdoc-edge/managed/graph/DepthTraverser.md:186
- [[DepthTraverser]] → /home/user/tsdoc-edge/managed/graph/DepthTraverser.md:187
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:231
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:561
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:562
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:148
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:149
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:150
- [[ConnectivityValidator]] → /home/user/tsdoc-edge/managed/utilities/ConnectivityValidator.md:104
- [[ConnectivityValidator]] → /home/user/tsdoc-edge/managed/utilities/ConnectivityValidator.md:128
- [[ConnectivityValidator]] → /home/user/tsdoc-edge/managed/utilities/ConnectivityValidator.md:129
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:88
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:256
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:257
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:258
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:259
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:260
- [[Utilities Index]] → /home/user/tsdoc-edge/managed/utilities/index.md:402
- [[Utilities Index]] → /home/user/tsdoc-edge/managed/utilities/index.md:437

