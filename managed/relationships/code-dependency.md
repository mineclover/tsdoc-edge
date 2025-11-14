---
title: Code Dependency
type: relationship
category: structural
status: implemented
canonical: true
relationships-count: 1968
---

# [[Code Dependency]]

> **Type**: `code-dependency` | **Status**: ✅ 1,968 relationships

Track explicit import/export dependencies (`import A from B`).

## Implementation Chain

**Extractor**: [[ASTSymbolExtractor]] (`src/analyzer/ASTSymbolExtractor.ts:216-246`)
- Parses TypeScript AST to extract import statements
- Detects: `import`, `require()`, `export from`
- Stores source → target relationships

**Command**: [[BuildCommand]] (`src/commands/BuildCommand.ts`)
- Usage: `tsdoc-edge build <directory>`
- Triggers: Symbol extraction → dependency analysis → storage

**Storage**: [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)
- Table: `unified_relationships`
- Type: `code-dependency`
- Schema: `(source_id, target_id, type, metadata)`

**Query Commands**:
- [[DepsCommand]] (`src/commands/DepsCommand.ts`) - Show dependencies of a symbol
- [[WhoUsesCommand]] (`src/commands/WhoUsesCommand.ts`) - Show reverse dependencies
- [[OrphansCommand]] (`src/commands/OrphansCommand.ts`) - Find unreferenced files

## Usage Examples

```bash
# Extract all code dependencies
tsdoc-edge build src

# Query dependencies of a file
tsdoc-edge deps src/commands/BuildCommand.ts

# Find who uses a symbol
tsdoc-edge who-uses DatabaseManager

# Detect orphaned files
tsdoc-edge orphans
```

## Related

- [[IO Dependency]]: Inferred from code structure (complementary)
- [[Inheritance]]: Often co-occurs with imports (extends/implements)
- [[Type Dependency]]: Type-level dependencies (parameters, returns)
- [[SymbolGraphBuilder]] (`src/graph/SymbolGraph.ts`): Graph traversal for dependency chains

---

## Backlinks

### Referenced By

- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:15
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:319
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:320
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:22
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:85
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:258
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:483
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:484
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:485
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:82
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:160
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:268
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:269
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:270
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:271
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:272
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:273
- [[DependencyChainAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DependencyChainAnalyzer.md:22
- [[DependencyChainAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DependencyChainAnalyzer.md:46
- [[DependencyChainAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DependencyChainAnalyzer.md:47
- [[DependencyResolver]] → /home/user/tsdoc-edge/managed/analyzers/DependencyResolver.md:22
- [[DependencyResolver]] → /home/user/tsdoc-edge/managed/analyzers/DependencyResolver.md:47
- [[DependencyResolver]] → /home/user/tsdoc-edge/managed/analyzers/DependencyResolver.md:48
- [[DomainStructureAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DomainStructureAnalyzer.md:22
- [[DomainStructureAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DomainStructureAnalyzer.md:35
- [[DomainStructureAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DomainStructureAnalyzer.md:36
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:251
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:377
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:378
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:35
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:133
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:134
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:135
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:136
- [[DepsCommand]] → /home/user/tsdoc-edge/managed/commands/DepsCommand.md:163
- [[DepsCommand]] → /home/user/tsdoc-edge/managed/commands/DepsCommand.md:164
- [[OrphansCommand]] → /home/user/tsdoc-edge/managed/commands/OrphansCommand.md:179
- [[OrphansCommand]] → /home/user/tsdoc-edge/managed/commands/OrphansCommand.md:180
- [[VisualizeDepsCommand]] → /home/user/tsdoc-edge/managed/commands/VisualizeDepsCommand.md:21
- [[VisualizeDepsCommand]] → /home/user/tsdoc-edge/managed/commands/VisualizeDepsCommand.md:29
- [[VisualizeDepsCommand]] → /home/user/tsdoc-edge/managed/commands/VisualizeDepsCommand.md:30
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:169
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:170
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:330
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:331
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:251
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:307
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:26
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:50
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:57
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:125
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:271
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:432
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:433
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:434
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:435
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:436
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:437
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:438
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:439
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:440
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:441
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:27
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:295
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:319
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:387
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:388
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:389
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:32
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:245
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:246
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:40
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:101
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:102
- [[Composition Relationship]] → /home/user/tsdoc-edge/managed/relationships/COMPOSITION.md:112
- [[Composition Relationship]] → /home/user/tsdoc-edge/managed/relationships/COMPOSITION.md:118
- [[Composition Relationship]] → /home/user/tsdoc-edge/managed/relationships/COMPOSITION.md:200
- [[Composition Relationship]] → /home/user/tsdoc-edge/managed/relationships/COMPOSITION.md:201
- [[Composition Relationship]] → /home/user/tsdoc-edge/managed/relationships/COMPOSITION.md:202
- [[Composition Relationship]] → /home/user/tsdoc-edge/managed/relationships/COMPOSITION.md:203
- [[Inheritance]] → /home/user/tsdoc-edge/managed/relationships/INHERITANCE.md:37
- [[Inheritance]] → /home/user/tsdoc-edge/managed/relationships/INHERITANCE.md:38
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:48
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:49
- [[Co-Requirement]] → /home/user/tsdoc-edge/managed/relationships/co-requirement.md:117
- [[Co-Requirement]] → /home/user/tsdoc-edge/managed/relationships/co-requirement.md:150
- [[Collaboration]] → /home/user/tsdoc-edge/managed/relationships/collaboration.md:137
- [[Collaboration]] → /home/user/tsdoc-edge/managed/relationships/collaboration.md:165
- [[Enhancement]] → /home/user/tsdoc-edge/managed/relationships/enhancement.md:48
- [[Enhancement]] → /home/user/tsdoc-edge/managed/relationships/enhancement.md:64
- [[Feature Grouping]] → /home/user/tsdoc-edge/managed/relationships/feature-grouping.md:142
- [[Integration Verification]] → /home/user/tsdoc-edge/managed/relationships/integration-verification.md:157
- [[Integration Verification]] → /home/user/tsdoc-edge/managed/relationships/integration-verification.md:187
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:50
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:114
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:115
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:116
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:117
- [[Layer Dependency]] → /home/user/tsdoc-edge/managed/relationships/layer-dependency.md:69
- [[Layer Dependency]] → /home/user/tsdoc-edge/managed/relationships/layer-dependency.md:87
- [[Module Boundary]] → /home/user/tsdoc-edge/managed/relationships/module-boundary.md:96
- [[Module Boundary]] → /home/user/tsdoc-edge/managed/relationships/module-boundary.md:117
- [[Temporal Order]] → /home/user/tsdoc-edge/managed/relationships/temporal-order.md:189
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:189
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:190

