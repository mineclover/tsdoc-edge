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

See implementation: `src/types/graph/graph.ts:101` (SymbolGraph interface)

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
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:317
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:318
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:319
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:320
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:210
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:321
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:322
- [[ImportanceClassifier]] → /home/user/tsdoc-edge/managed/analyzers/ImportanceClassifier.md:22
- [[ImportanceClassifier]] → /home/user/tsdoc-edge/managed/analyzers/ImportanceClassifier.md:44
- [[ImportanceClassifier]] → /home/user/tsdoc-edge/managed/analyzers/ImportanceClassifier.md:45
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:256
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:393
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:394
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:54
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:429
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:430
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:52
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:194
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:195
- [[FindRootTypesCommand]] → /home/user/tsdoc-edge/managed/commands/FindRootTypesCommand.md:37
- [[FindRootTypesCommand]] → /home/user/tsdoc-edge/managed/commands/FindRootTypesCommand.md:117
- [[FindRootTypesCommand]] → /home/user/tsdoc-edge/managed/commands/FindRootTypesCommand.md:118
- [[TreeCommand]] → /home/user/tsdoc-edge/managed/commands/TreeCommand.md:121
- [[TreeCommand]] → /home/user/tsdoc-edge/managed/commands/TreeCommand.md:217
- [[TreeCommand]] → /home/user/tsdoc-edge/managed/commands/TreeCommand.md:218
- [[UndocumentedCommand]] → /home/user/tsdoc-edge/managed/commands/UndocumentedCommand.md:44
- [[UndocumentedCommand]] → /home/user/tsdoc-edge/managed/commands/UndocumentedCommand.md:167
- [[UndocumentedCommand]] → /home/user/tsdoc-edge/managed/commands/UndocumentedCommand.md:168
- [[UntestedCommand]] → /home/user/tsdoc-edge/managed/commands/UntestedCommand.md:49
- [[UntestedCommand]] → /home/user/tsdoc-edge/managed/commands/UntestedCommand.md:190
- [[UntestedCommand]] → /home/user/tsdoc-edge/managed/commands/UntestedCommand.md:191
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:46
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:116
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:180
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:181
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:182
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:183
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:51
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:58
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:128
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:129
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:130
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:131
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:189
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:438
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:439
- [[QueryCommands]] → /home/user/tsdoc-edge/managed/features/QueryCommands.md:84
- [[QueryCommands]] → /home/user/tsdoc-edge/managed/features/QueryCommands.md:140
- [[QueryCommands]] → /home/user/tsdoc-edge/managed/features/QueryCommands.md:141
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:145
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:167
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:180
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:187
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:222
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:414
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:415
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:416
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:417
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:418
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:419
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:420
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:421
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:422
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:423
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:85
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:128
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:284
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:285
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:286
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:287
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
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:370
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:371
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:372
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:373
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:374
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:375
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:376
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:377
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:378
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:379
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:380
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:381
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:110
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:346
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:347
- [[DepthTraverser]] → /home/user/tsdoc-edge/managed/graph/DepthTraverser.md:102
- [[DepthTraverser]] → /home/user/tsdoc-edge/managed/graph/DepthTraverser.md:134
- [[DepthTraverser]] → /home/user/tsdoc-edge/managed/graph/DepthTraverser.md:177
- [[DepthTraverser]] → /home/user/tsdoc-edge/managed/graph/DepthTraverser.md:178
- [[DepthTraverser]] → /home/user/tsdoc-edge/managed/graph/DepthTraverser.md:179
- [[DepthTraverser]] → /home/user/tsdoc-edge/managed/graph/DepthTraverser.md:180
- [[DepthTraverser]] → /home/user/tsdoc-edge/managed/graph/DepthTraverser.md:181
- [[DepthTraverser]] → /home/user/tsdoc-edge/managed/graph/DepthTraverser.md:182
- [[DepthTraverser]] → /home/user/tsdoc-edge/managed/graph/DepthTraverser.md:183
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:227
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:559
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:560
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:73
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:127
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:128
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:145
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:184
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:259
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:260
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:261
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:262
- [[Relationship Standard Format]] → /home/user/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:170
- [[Relationship Standard Format]] → /home/user/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:220
- [[Relationship Standard Format]] → /home/user/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:221
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:38
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:149
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:150
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:32
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:145
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:175
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:326
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:327
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:328
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:329
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:330
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:331
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:222
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:326
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:327
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:67
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:146
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:147
- [[ConnectivityValidator]] → /home/user/tsdoc-edge/managed/utilities/ConnectivityValidator.md:103
- [[ConnectivityValidator]] → /home/user/tsdoc-edge/managed/utilities/ConnectivityValidator.md:126
- [[ConnectivityValidator]] → /home/user/tsdoc-edge/managed/utilities/ConnectivityValidator.md:127
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:87
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:251
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:252
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:253
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:254
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:255
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:87
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:131
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:132
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:133
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:134
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:135
- [[Utilities Index]] → /home/user/tsdoc-edge/managed/utilities/index.md:398
- [[Utilities Index]] → /home/user/tsdoc-edge/managed/utilities/index.md:436

