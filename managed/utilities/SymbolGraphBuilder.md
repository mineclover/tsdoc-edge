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
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:498
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:499
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:500
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:501
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:92
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:176
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:288
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:289
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:290
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:291
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:210
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:306
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:307
- [[ImportanceClassifier]] → /home/user/tsdoc-edge/managed/analyzers/ImportanceClassifier.md:22
- [[ImportanceClassifier]] → /home/user/tsdoc-edge/managed/analyzers/ImportanceClassifier.md:39
- [[ImportanceClassifier]] → /home/user/tsdoc-edge/managed/analyzers/ImportanceClassifier.md:40
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:256
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:386
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:387
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:54
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:428
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:429
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:52
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:153
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:154
- [[FindRootTypesCommand]] → /home/user/tsdoc-edge/managed/commands/FindRootTypesCommand.md:37
- [[FindRootTypesCommand]] → /home/user/tsdoc-edge/managed/commands/FindRootTypesCommand.md:111
- [[TreeCommand]] → /home/user/tsdoc-edge/managed/commands/TreeCommand.md:121
- [[TreeCommand]] → /home/user/tsdoc-edge/managed/commands/TreeCommand.md:213
- [[TreeCommand]] → /home/user/tsdoc-edge/managed/commands/TreeCommand.md:214
- [[UndocumentedCommand]] → /home/user/tsdoc-edge/managed/commands/UndocumentedCommand.md:44
- [[UndocumentedCommand]] → /home/user/tsdoc-edge/managed/commands/UndocumentedCommand.md:161
- [[UntestedCommand]] → /home/user/tsdoc-edge/managed/commands/UntestedCommand.md:49
- [[UntestedCommand]] → /home/user/tsdoc-edge/managed/commands/UntestedCommand.md:183
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:46
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:116
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:173
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:174
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:51
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:58
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:108
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:109
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:110
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:111
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:189
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:368
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:369
- [[QueryCommands]] → /home/user/tsdoc-edge/managed/features/QueryCommands.md:84
- [[QueryCommands]] → /home/user/tsdoc-edge/managed/features/QueryCommands.md:136
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:145
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:167
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:180
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:187
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:222
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:384
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:385
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:386
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:387
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:388
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:389
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:390
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:391
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:392
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:393
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:85
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:128
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:267
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:268
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:269
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:270
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
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:348
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:349
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:350
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:351
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:352
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:353
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:354
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:355
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:356
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:357
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:358
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:359
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:360
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:361
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:362
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:363
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:364
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:365
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:366
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:367
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:368
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:369
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:110
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:323
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:324
- [[DepthTraverser]] → /home/user/tsdoc-edge/managed/graph/DepthTraverser.md:102
- [[DepthTraverser]] → /home/user/tsdoc-edge/managed/graph/DepthTraverser.md:134
- [[DepthTraverser]] → /home/user/tsdoc-edge/managed/graph/DepthTraverser.md:171
- [[DepthTraverser]] → /home/user/tsdoc-edge/managed/graph/DepthTraverser.md:172
- [[DepthTraverser]] → /home/user/tsdoc-edge/managed/graph/DepthTraverser.md:173
- [[DepthTraverser]] → /home/user/tsdoc-edge/managed/graph/DepthTraverser.md:174
- [[DepthTraverser]] → /home/user/tsdoc-edge/managed/graph/DepthTraverser.md:175
- [[DepthTraverser]] → /home/user/tsdoc-edge/managed/graph/DepthTraverser.md:176
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:153
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:456
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:457
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:73
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:123
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:124
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:145
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:184
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:251
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:252
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:253
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:254
- [[Relationship Standard Format]] → /home/user/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:170
- [[Relationship Standard Format]] → /home/user/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:218
- [[Relationship Standard Format]] → /home/user/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:219
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:38
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:116
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:117
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:32
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:145
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:175
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:302
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:303
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:304
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:305
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:306
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:307
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:222
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:316
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:317
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:67
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:123
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:124
- [[ConnectivityValidator]] → /home/user/tsdoc-edge/managed/utilities/ConnectivityValidator.md:103
- [[ConnectivityValidator]] → /home/user/tsdoc-edge/managed/utilities/ConnectivityValidator.md:122
- [[ConnectivityValidator]] → /home/user/tsdoc-edge/managed/utilities/ConnectivityValidator.md:123
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:87
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:203
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:204
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:205
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:206
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:87
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:121
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:122
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:123
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:124
- [[Utilities Index]] → /home/user/tsdoc-edge/managed/utilities/index.md:398

