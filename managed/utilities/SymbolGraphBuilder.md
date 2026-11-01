---
title: SymbolGraphBuilder
type: utility
category: utility
status: active
canonical: true
---

# [[SymbolGraphBuilder]]

**Source**: `src/graph/SymbolGraphBuilder.ts`

## Purpose

Build and maintain a graph of all symbols and their relationships.

## Graph Structure

### Adjacency List Representation

Uses adjacency lists instead of matrix:
- **Rationale**: Sparse graphs (most symbols independent)
- **Benefits**: O(1) edge lookup, O(V+E) space
- **Use case**: Efficient DFS/BFS traversal

### Graph Components

See implementation: SymbolGraph

**Structure**:
- `symbols`: Map<string, Symbol> - All symbols indexed by ID
- `relationships`: SymbolRelationship[] - All relationships
- `nameIndex`: Map<string, string[]> - name → symbol IDs
- `fileIndex`: Map<string, string[]> - file → symbol IDs
- `adjacencyList`: Map<string, string[]> - ID → dependencies
- `reverseAdjacencyList`: Map<string, string[]> - ID → dependents

## Core Operations

### Add Symbol
```typescript
builder.addSymbol(symbol);
// Indexes by ID, name, and file path
// Updates all indices automatically
```

### Add Relationship
```typescript
builder.addRelationship(relationship);
// Updates adjacency lists (bidirectional)
// Tracks relationship metadata
```

### Search by Name
```typescript
const symbols = builder.findByName('UserService');
// Returns all symbols matching name
// Uses name index for O(1) lookup
```

### Search by File
```typescript
const symbols = builder.findByFile('src/services/UserService.ts');
// Returns all symbols in file
// Uses file index for O(1) lookup
```

## Indexing Strategy

### Name Index
- Key: Symbol name
- Value: Array of symbol IDs
- Handles name collisions

### File Index
- Key: File path
- Value: Array of symbol IDs
- One-to-many relationship

### Adjacency Lists

**Forward (dependencies)**:
```
UserService → [UserRepository, Logger, Config]
```

**Reverse (dependents)**:
```
UserRepository ← [UserService, AdminService]
```

## Graph Analysis

### Find Dependencies
```typescript
const deps = builder.getDependencies(symbolId);
// Direct dependencies only
```

### Find Dependents
```typescript
const dependents = builder.getDependents(symbolId);
// Who depends on this symbol?
```

### Circular Detection
```typescript
const cycles = builder.detectCircularDeps();
// Returns all circular dependency cycles
```

### Graph Statistics
```typescript
const stats = builder.getStatistics();
// {
//   totalSymbols: 1592,
//   totalRelationships: 4521,
//   avgDepsPerSymbol: 2.84,
//   maxDepth: 8
// }
```

## Use Cases

### Build Initial Graph
```typescript
const builder = new SymbolGraphBuilder();
for (const symbol of symbols) {
  builder.addSymbol(symbol);
}
for (const rel of relationships) {
  builder.addRelationship(rel);
}
const graph = builder.build();
```

### Dependency Analysis
```typescript
const deps = builder.getDependencies('user-service');
const transitiveDeps = builder.getTransitiveDeps('user-service');
```

### Impact Analysis
```typescript
const impacted = builder.getDependents('user-repository');
// Who would be affected by changes to UserRepository?
```

## Symbol Count

1 class

## Related

- [[SymbolGraphBuilder]]: Graph type definition
- SymbolSearchEngine: Advanced search
- DepthTraverser: Graph traversal

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → managed/README.md:229
- [[BuildCommand]] → managed/commands/BuildCommand.md:89
- [[FindRootTypesCommand]] → managed/commands/FindRootTypesCommand.md:73
- [[TreeCommand]] → managed/commands/TreeCommand.md:294
- [[UndocumentedCommand]] → managed/commands/UndocumentedCommand.md:74
- [[UntestedCommand]] → managed/commands/UntestedCommand.md:77
- [[WhoUsesCommand]] → managed/commands/WhoUsesCommand.md:72
- [[WorkContextCommand]] → managed/commands/WorkContextCommand.md:61
- [[DatabaseManager]] → managed/core-components/DatabaseManager.md:364
- [[DepthTraverser]] → managed/core-components/DepthTraverser.md:277
- [[SymbolRegistryManager]] → managed/core-components/SymbolRegistryManager.md:474
- [[Feature Showcase]] → managed/examples/feature-showcase.md:82
- [[AnalysisFeatures]] → managed/features/analysis-features.md:244
- [[CoreWorkflow]] → managed/features/core-workflow.md:97
- [[SymbolGraphFeatures]] → managed/features/symbol-graph.md:63
- [[ValidationFeatures]] → managed/features/validation-features.md:235
- [[Guides & Tutorials]] → managed/guides/index.md:261
- [[ExtractionResult]] → managed/primary-types/ExtractionResult.md:105
- [[Quick Start Guide]] → managed/quick-start.md:262
- [[Symbol]] → managed/types/Symbol.md:90
- [[ConnectivityValidator]] → managed/utilities/ConnectivityValidator.md:172
- [[SymbolSearchEngine]] → managed/utilities/SymbolSearchEngine.md:168
- [[Utilities Index]] → managed/utilities/index.md:429

### Implemented By

- SymbolGraphBuilder → src/graph/SymbolGraphBuilder.ts:1

