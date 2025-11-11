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

```typescript
interface SymbolGraph {
  symbols: Map<string, Symbol>;
  relationships: SymbolRelationship[];
  nameIndex: Map<string, string[]>;           // name → symbol IDs
  fileIndex: Map<string, string[]>;           // file → symbol IDs
  adjacencyList: Map<string, string[]>;       // ID → dependencies
  reverseAdjacencyList: Map<string, string[]>; // ID → dependents
}
```

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
- [[SymbolSearchEngine]]: Advanced search
- [[DepthTraverser]]: Graph traversal

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:117
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:172
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:178
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:192
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:92
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:176
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:265
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:266
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:210
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:294
- [[ImportanceClassifier]] → /home/user/tsdoc-edge/managed/analyzers/ImportanceClassifier.md:22
- [[ImportanceClassifier]] → /home/user/tsdoc-edge/managed/analyzers/ImportanceClassifier.md:39
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:256
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:335
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:54
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:408
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:52
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:143
- [[FindRootTypesCommand]] → /home/user/tsdoc-edge/managed/commands/FindRootTypesCommand.md:37
- [[FindRootTypesCommand]] → /home/user/tsdoc-edge/managed/commands/FindRootTypesCommand.md:111
- [[TreeCommand]] → /home/user/tsdoc-edge/managed/commands/TreeCommand.md:121
- [[TreeCommand]] → /home/user/tsdoc-edge/managed/commands/TreeCommand.md:211
- [[UndocumentedCommand]] → /home/user/tsdoc-edge/managed/commands/UndocumentedCommand.md:44
- [[UndocumentedCommand]] → /home/user/tsdoc-edge/managed/commands/UndocumentedCommand.md:155
- [[UntestedCommand]] → /home/user/tsdoc-edge/managed/commands/UntestedCommand.md:49
- [[UntestedCommand]] → /home/user/tsdoc-edge/managed/commands/UntestedCommand.md:175
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:46
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:116
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:160
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:161
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:51
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:58
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:102
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:103
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:189
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:348
- [[QueryCommands]] → /home/user/tsdoc-edge/managed/features/QueryCommands.md:84
- [[QueryCommands]] → /home/user/tsdoc-edge/managed/features/QueryCommands.md:134
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:145
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:167
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:180
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:187
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:222
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:354
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:355
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:356
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:357
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:358
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:85
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:128
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:234
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:235
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:29
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:53
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:66
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:78
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:133
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:142
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:150
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:159
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:170
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:192
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:200
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:317
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:318
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:319
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:320
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:321
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:322
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:323
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:324
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:325
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:326
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:327
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:110
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:300
- [[DepthTraverser]] → /home/user/tsdoc-edge/managed/graph/DepthTraverser.md:102
- [[DepthTraverser]] → /home/user/tsdoc-edge/managed/graph/DepthTraverser.md:134
- [[DepthTraverser]] → /home/user/tsdoc-edge/managed/graph/DepthTraverser.md:167
- [[DepthTraverser]] → /home/user/tsdoc-edge/managed/graph/DepthTraverser.md:168
- [[DepthTraverser]] → /home/user/tsdoc-edge/managed/graph/DepthTraverser.md:169
- [[DepthTraverser]] → /home/user/tsdoc-edge/managed/graph/DepthTraverser.md:170
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:153
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:390
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:73
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:117
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:145
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:184
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:231
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:232
- [[Relationship Standard Format]] → /home/user/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:170
- [[Relationship Standard Format]] → /home/user/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:214
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:38
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:103
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:28
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:132
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:156
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:243
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:244
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:245
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:222
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:305
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:67
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:121
- [[ConnectivityValidator]] → /home/user/tsdoc-edge/managed/utilities/ConnectivityValidator.md:103
- [[ConnectivityValidator]] → /home/user/tsdoc-edge/managed/utilities/ConnectivityValidator.md:121
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:87
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:196
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:197
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:198
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:87
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:118
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:119
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:120
- [[Utilities Index]] → /home/user/tsdoc-edge/managed/utilities/index.md:398

