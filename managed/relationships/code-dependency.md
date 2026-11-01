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

**Extractor**: ASTSymbolExtractor (`src/analyzer/ASTSymbolExtractor.ts:216-246`)
- Parses TypeScript AST to extract import statements
- Detects: `import`, `require()`, `export from`
- Stores source → target relationships

**Command**: BuildCommand (`src/commands/BuildCommand.ts`)
- Usage: `tsdoc-edge build <directory>`
- Triggers: Symbol extraction → dependency analysis → storage

**Storage**: DatabaseManager (`src/storage/DatabaseManager.ts`)
- Table: `unified_relationships`
- Type: `code-dependency`
- Schema: `(source_id, target_id, type, metadata)`

**Query Commands**:
- DepsCommand (`src/commands/DepsCommand.ts`) - Show dependencies of a symbol
- WhoUsesCommand (`src/commands/WhoUsesCommand.ts`) - Show reverse dependencies
- OrphansCommand (`src/commands/OrphansCommand.ts`) - Find unreferenced files

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
- SymbolGraphBuilder (`src/graph/SymbolGraph.ts`): Graph traversal for dependency chains

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → managed/README.md:50
- [[ASTSymbolExtractor]] → managed/analyzers/ASTSymbolExtractor.md:174
- [[Analyzers & Extractors]] → managed/analyzers/index.md:399
- [[BuildCommand]] → managed/commands/BuildCommand.md:45
- [[Build Pipeline Guide]] → managed/guides/build-pipeline-guide.md:543
- [[Guides & Tutorials]] → managed/guides/index.md:47
- [[Relationship Analysis Guide]] → managed/guides/relationship-analysis-guide.md:43
- [[Quick Start Guide]] → managed/quick-start.md:52
- [[Call Relationships]] → managed/relationships/calls.md:57
- [[Co-Requirement]] → managed/relationships/co-requirement.md:244
- [[Collaboration]] → managed/relationships/collaboration.md:312
- [[Composition Relationship]] → managed/relationships/composition.md:215
- [[Feature Grouping]] → managed/relationships/feature-grouping.md:347
- [[Integration Verification]] → managed/relationships/integration-verification.md:371
- [[IO Dependency]] → managed/relationships/io-dependency.md:67
- [[Temporal Order]] → managed/relationships/temporal-order.md:327

