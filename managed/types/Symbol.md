---
title: Symbol
type: type
category: types
status: active
canonical: true
---

# [[Symbol]]

**Source**: `src/types/graph/graph.ts`

## Purpose

Core type representing a code symbol in the symbol graph.

## Symbol Definition

A symbol is any named entity in the codebase:
- Functions
- Classes
- Interfaces
- Types
- Enums
- Variables
- Constants
- Methods
- Properties

## Symbol Structure

See implementation: [[Symbol]]

**Core Properties**:
- `id`: Unique identifier (kebab-case)
- `name`: Symbol name
- `type`: Symbol type (function, class, interface, etc.)
- `filePath`: Source file path
- `line`, `column`: Position in source
- `isExported`: Exported from module?
- `isPublic`: Public API?
- `summary`: TSDoc summary
- `contract`: Contract specification (@contract)
- `responsibility`: Responsibility specification (@responsibility)
- `tests`: Test mappings
- `designDecisions`: Related design docs
- `metadata`: Additional data (coverage, performance, etc.)

## Symbol ID Generation

Convention: kebab-case from file path + symbol name
- `src/graph/SymbolGraph.ts:SymbolGraph` → `symbol-graph`
- `src/commands/BuildCommand.ts:BuildCommand` → `build-command`
- `src/utils/formatters.ts:formatError` → `format-error`

## Symbol Metadata

### Contract Specification
- Input constraints
- Output guarantees
- Pre/post conditions
- Invariants

### Responsibility Specification
- Primary responsibility
- Scope of concern
- Boundaries

### Test Mapping
- Test file paths
- Test descriptions
- Coverage percentage

## Symbol Visibility

### isExported
- `true`: Exported from module
- `false`: Internal to file

### isPublic
- `true`: Part of public API (@public tag)
- `false`: Internal implementation

## Symbol Count

1 interface (Symbol), 9 symbol types

## Related

- [[SymbolGraphBuilder]]: Graph of symbols and relationships
- [[SymbolRegistryManager]]: Symbol storage and indexing
- [[ASTSymbolExtractor]]: Extracts symbols from code

---

## Backlinks

### Referenced By

- [[Commands Index]] → managed/COMMANDS.md:164
- [[TSDoc Edge Documentation]] → managed/README.md:115
- [[ASTSymbolExtractor]] → managed/analyzers/ASTSymbolExtractor.md:124
- [[CheckLinksCommand]] → managed/commands/CheckLinksCommand.md:15
- [[ExploreEntrypointCommand]] → managed/commands/ExploreEntrypointCommand.md:20
- [[ValidateSymbolRefsCommand]] → managed/commands/ValidateSymbolRefsCommand.md:15
- [[Analyzer System]] → managed/core/analyzer-system.md:269
- [[Spec Management System]] → managed/core/spec-management-system.md:183
- [[DatabaseManager]] → managed/core-components/DatabaseManager.md:301
- [[CoreWorkflow]] → managed/features/core-workflow.md:108
- [[Analyzer Development Guide]] → managed/guides/analyzer-development-guide.md:993
- [[Document Symbol Parser]] → managed/parser/DocumentSymbolParser.md:80
- [[TrackableStatistics]] → managed/primary-types/TrackableStatistics.md:41
- [[InterfaceTypes]] → managed/types/InterfaceTypes.md:144
- [[RegistryTypes]] → managed/types/RegistryTypes.md:182
- [[SymbolSearchEngine]] → managed/utilities/SymbolSearchEngine.md:169
- [[Utilities Index]] → managed/utilities/index.md:97
- [[Example - Mermaid Workflow]] → managed/workflows/EXAMPLE-MERMAID-WORKFLOW.md:124

### Implemented By

- Symbol → src/types/graph/graph.ts:43

