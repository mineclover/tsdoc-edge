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

- TSDoc Edge Documentation → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:180
- TSDoc Edge Documentation → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:235
- TSDoc Edge Documentation → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:241
- [[ASTSymbolExtractor]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:112
- [[ASTSymbolExtractor]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:196
- [[CallGraphAnalyzer]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:210
- ImportanceClassifier → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/ImportanceClassifier.md:22
- [[Analyzers & Extractors]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/index.md:256
- [[BuildCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/BuildCommand.md:52
- [[FindRootTypesCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/FindRootTypesCommand.md:37
- [[TreeCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/TreeCommand.md:121
- [[UndocumentedCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/UndocumentedCommand.md:44
- [[UntestedCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/UntestedCommand.md:49
- [[WhoUsesCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/WhoUsesCommand.md:46
- [[WhoUsesCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/WhoUsesCommand.md:116
- [[WorkContextCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/WorkContextCommand.md:51
- [[WorkContextCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/WorkContextCommand.md:58
- DatabaseManager → /Users/junwoobang/workflow/tsdoc-edge/managed/core-components/DatabaseManager.md:189
- DepthTraverser → /Users/junwoobang/workflow/tsdoc-edge/managed/core-components/DepthTraverser.md:118
- DepthTraverser → /Users/junwoobang/workflow/tsdoc-edge/managed/core-components/DepthTraverser.md:150
- SymbolRegistryManager → /Users/junwoobang/workflow/tsdoc-edge/managed/core-components/SymbolRegistryManager.md:222
- [[QueryCommands]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/QueryCommands.md:84
- [[AnalysisFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/analysis-features.md:145
- [[AnalysisFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/analysis-features.md:167
- [[AnalysisFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/analysis-features.md:180
- [[AnalysisFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/analysis-features.md:187
- [[AnalysisFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/analysis-features.md:222
- [[CoreWorkflow]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/core-workflow.md:85
- [[CoreWorkflow]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/core-workflow.md:128
- [[SymbolGraphFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/symbol-graph.md:29
- [[SymbolGraphFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/symbol-graph.md:53
- [[SymbolGraphFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/symbol-graph.md:66
- [[SymbolGraphFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/symbol-graph.md:78
- [[SymbolGraphFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/symbol-graph.md:133
- [[SymbolGraphFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/symbol-graph.md:142
- [[SymbolGraphFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/symbol-graph.md:150
- [[SymbolGraphFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/symbol-graph.md:159
- [[SymbolGraphFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/symbol-graph.md:170
- [[SymbolGraphFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/symbol-graph.md:192
- [[SymbolGraphFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/symbol-graph.md:200
- [[ValidationFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/validation-features.md:110
- [[Guides & Tutorials]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:227
- ExtractionResult → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/ExtractionResult.md:77
- Quick Start Guide → /Users/junwoobang/workflow/tsdoc-edge/managed/quick-start.md:145
- Quick Start Guide → /Users/junwoobang/workflow/tsdoc-edge/managed/quick-start.md:184
- [[Relationship Standard Format]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:222
- [[Code Dependency]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/code-dependency.md:38
- [[Relationship Types]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/index.md:34
- [[Relationship Types]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/index.md:147
- [[Relationship Types]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/index.md:177
- [[Symbol]] → /Users/junwoobang/workflow/tsdoc-edge/managed/types/Symbol.md:82
- ConnectivityValidator → /Users/junwoobang/workflow/tsdoc-edge/managed/utilities/ConnectivityValidator.md:120
- [[SymbolGraphBuilder]] → /Users/junwoobang/workflow/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:95
- SymbolSearchEngine → /Users/junwoobang/workflow/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:103
- [[Utilities Index]] → /Users/junwoobang/workflow/tsdoc-edge/managed/utilities/index.md:398

