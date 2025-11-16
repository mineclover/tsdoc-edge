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
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:331
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:332
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:22
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:85
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:258
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:483
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:484
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:485
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:82
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:160
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:289
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:290
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:291
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:292
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:293
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:294
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:295
- [[DependencyChainAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DependencyChainAnalyzer.md:22
- [[DependencyChainAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DependencyChainAnalyzer.md:53
- [[DependencyChainAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DependencyChainAnalyzer.md:54
- [[DependencyResolver]] → /home/user/tsdoc-edge/managed/analyzers/DependencyResolver.md:22
- [[DependencyResolver]] → /home/user/tsdoc-edge/managed/analyzers/DependencyResolver.md:54
- [[DependencyResolver]] → /home/user/tsdoc-edge/managed/analyzers/DependencyResolver.md:55
- [[DomainStructureAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DomainStructureAnalyzer.md:22
- [[DomainStructureAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DomainStructureAnalyzer.md:38
- [[DomainStructureAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DomainStructureAnalyzer.md:39
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:251
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:384
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:385
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:35
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:166
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:167
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:168
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:169
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:170
- [[DepsCommand]] → /home/user/tsdoc-edge/managed/commands/DepsCommand.md:168
- [[DepsCommand]] → /home/user/tsdoc-edge/managed/commands/DepsCommand.md:169
- [[OrphansCommand]] → /home/user/tsdoc-edge/managed/commands/OrphansCommand.md:185
- [[OrphansCommand]] → /home/user/tsdoc-edge/managed/commands/OrphansCommand.md:186
- [[VisualizeDepsCommand]] → /home/user/tsdoc-edge/managed/commands/VisualizeDepsCommand.md:21
- [[VisualizeDepsCommand]] → /home/user/tsdoc-edge/managed/commands/VisualizeDepsCommand.md:29
- [[VisualizeDepsCommand]] → /home/user/tsdoc-edge/managed/commands/VisualizeDepsCommand.md:30
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:176
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:177
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:382
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:383
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:384
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:251
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:330
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:331
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:33
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:57
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:64
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:199
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:359
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:535
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:536
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:537
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:538
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:539
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:540
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:541
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:542
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:543
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:544
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:27
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:295
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:319
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:413
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:414
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:415
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:416
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:417
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:418
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:32
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:253
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:254
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:40
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:120
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:121
- [[Composition Relationship]] → /home/user/tsdoc-edge/managed/relationships/COMPOSITION.md:112
- [[Composition Relationship]] → /home/user/tsdoc-edge/managed/relationships/COMPOSITION.md:118
- [[Composition Relationship]] → /home/user/tsdoc-edge/managed/relationships/COMPOSITION.md:201
- [[Composition Relationship]] → /home/user/tsdoc-edge/managed/relationships/COMPOSITION.md:202
- [[Composition Relationship]] → /home/user/tsdoc-edge/managed/relationships/COMPOSITION.md:203
- [[Composition Relationship]] → /home/user/tsdoc-edge/managed/relationships/COMPOSITION.md:204
- [[Inheritance]] → /home/user/tsdoc-edge/managed/relationships/INHERITANCE.md:45
- [[Inheritance]] → /home/user/tsdoc-edge/managed/relationships/INHERITANCE.md:46
- [[Inheritance]] → /home/user/tsdoc-edge/managed/relationships/INHERITANCE.md:47
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:61
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:62
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:63
- [[Co-Requirement]] → /home/user/tsdoc-edge/managed/relationships/co-requirement.md:117
- [[Co-Requirement]] → /home/user/tsdoc-edge/managed/relationships/co-requirement.md:150
- [[Collaboration]] → /home/user/tsdoc-edge/managed/relationships/collaboration.md:137
- [[Collaboration]] → /home/user/tsdoc-edge/managed/relationships/collaboration.md:165
- [[Enhancement]] → /home/user/tsdoc-edge/managed/relationships/enhancement.md:48
- [[Enhancement]] → /home/user/tsdoc-edge/managed/relationships/enhancement.md:66
- [[Enhancement]] → /home/user/tsdoc-edge/managed/relationships/enhancement.md:67
- [[Feature Grouping]] → /home/user/tsdoc-edge/managed/relationships/feature-grouping.md:142
- [[Integration Verification]] → /home/user/tsdoc-edge/managed/relationships/integration-verification.md:157
- [[Integration Verification]] → /home/user/tsdoc-edge/managed/relationships/integration-verification.md:187
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:50
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:131
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:132
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:133
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:134
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:135
- [[Layer Dependency]] → /home/user/tsdoc-edge/managed/relationships/layer-dependency.md:69
- [[Layer Dependency]] → /home/user/tsdoc-edge/managed/relationships/layer-dependency.md:87
- [[Layer Dependency]] → /home/user/tsdoc-edge/managed/relationships/layer-dependency.md:88
- [[Module Boundary]] → /home/user/tsdoc-edge/managed/relationships/module-boundary.md:96
- [[Module Boundary]] → /home/user/tsdoc-edge/managed/relationships/module-boundary.md:118
- [[Module Boundary]] → /home/user/tsdoc-edge/managed/relationships/module-boundary.md:119
- [[Temporal Order]] → /home/user/tsdoc-edge/managed/relationships/temporal-order.md:189
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:230
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:231
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:232

