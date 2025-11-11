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
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:252
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:22
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:85
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:258
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:82
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:160
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:247
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:248
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:249
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:250
- [[DependencyChainAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DependencyChainAnalyzer.md:22
- [[DependencyChainAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DependencyChainAnalyzer.md:45
- [[DependencyResolver]] → /home/user/tsdoc-edge/managed/analyzers/DependencyResolver.md:22
- [[DependencyResolver]] → /home/user/tsdoc-edge/managed/analyzers/DependencyResolver.md:45
- [[DomainStructureAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DomainStructureAnalyzer.md:22
- [[DomainStructureAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DomainStructureAnalyzer.md:35
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:251
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:331
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:35
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:125
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:126
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:127
- [[DepsCommand]] → /home/user/tsdoc-edge/managed/commands/DepsCommand.md:148
- [[OrphansCommand]] → /home/user/tsdoc-edge/managed/commands/OrphansCommand.md:170
- [[VisualizeDepsCommand]] → /home/user/tsdoc-edge/managed/commands/VisualizeDepsCommand.md:21
- [[VisualizeDepsCommand]] → /home/user/tsdoc-edge/managed/commands/VisualizeDepsCommand.md:29
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:158
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:314
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:315
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:251
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:301
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:26
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:50
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:57
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:125
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:271
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:378
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:379
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:380
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:381
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:382
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:27
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:295
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:319
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:381
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:382
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:383
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:32
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:228
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:40
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:91
- [[Composition Relationship]] → /home/user/tsdoc-edge/managed/relationships/COMPOSITION.md:112
- [[Composition Relationship]] → /home/user/tsdoc-edge/managed/relationships/COMPOSITION.md:118
- [[Composition Relationship]] → /home/user/tsdoc-edge/managed/relationships/COMPOSITION.md:194
- [[Composition Relationship]] → /home/user/tsdoc-edge/managed/relationships/COMPOSITION.md:195
- [[Inheritance]] → /home/user/tsdoc-edge/managed/relationships/INHERITANCE.md:34
- [[Inheritance]] → /home/user/tsdoc-edge/managed/relationships/INHERITANCE.md:35
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:45
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:46
- [[Enhancement]] → /home/user/tsdoc-edge/managed/relationships/enhancement.md:48
- [[Enhancement]] → /home/user/tsdoc-edge/managed/relationships/enhancement.md:64
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:50
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:103
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:104
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:105
- [[Layer Dependency]] → /home/user/tsdoc-edge/managed/relationships/layer-dependency.md:69
- [[Layer Dependency]] → /home/user/tsdoc-edge/managed/relationships/layer-dependency.md:86
- [[Module Boundary]] → /home/user/tsdoc-edge/managed/relationships/module-boundary.md:96
- [[Module Boundary]] → /home/user/tsdoc-edge/managed/relationships/module-boundary.md:117
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:182
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:183

