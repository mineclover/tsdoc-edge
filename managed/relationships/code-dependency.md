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

- [[Commands Index]] → /Users/junwoobang/workflow/tsdoc-edge/managed/COMMANDS.md:17
- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:24
- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:108
- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:312
- [[ASTSymbolExtractor]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:102
- [[ASTSymbolExtractor]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:180
- DependencyChainAnalyzer → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/DependencyChainAnalyzer.md:22
- DependencyResolver → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/DependencyResolver.md:22
- DomainStructureAnalyzer → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/DomainStructureAnalyzer.md:22
- [[Analyzers & Extractors]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/index.md:251
- [[BuildCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/BuildCommand.md:35
- [[VisualizeDepsCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/VisualizeDepsCommand.md:21
- [[Build Pipeline Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/build-pipeline-guide.md:251
- [[Guides & Tutorials]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:33
- [[Guides & Tutorials]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:57
- [[Guides & Tutorials]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:64
- [[Guides & Tutorials]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:199
- [[Guides & Tutorials]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:359
- [[Relationship Analysis Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/relationship-analysis-guide.md:27
- [[Relationship Analysis Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/relationship-analysis-guide.md:295
- [[Relationship Analysis Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/relationship-analysis-guide.md:319
- [[Quick Start Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/quick-start.md:32
- [[Call Relationships]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/CALLS.md:40
- [[Composition Relationship]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/COMPOSITION.md:112
- [[Composition Relationship]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/COMPOSITION.md:118
- [[Co-Requirement]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/co-requirement.md:117
- [[Co-Requirement]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/co-requirement.md:150
- [[Collaboration]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/collaboration.md:137
- [[Collaboration]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/collaboration.md:165
- [[Feature Grouping]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/feature-grouping.md:142
- [[Integration Verification]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/integration-verification.md:157
- [[Integration Verification]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/integration-verification.md:187
- [[IO Dependency]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/io-dependency.md:50
- [[Temporal Order]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/temporal-order.md:189

