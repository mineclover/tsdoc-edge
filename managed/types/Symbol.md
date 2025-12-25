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

- [[Commands Index]] → /Users/junwoobang/workflow/tsdoc-edge/managed/COMMANDS.md:46
- [[Commands Index]] → /Users/junwoobang/workflow/tsdoc-edge/managed/COMMANDS.md:117
- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:87
- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:243
- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:298
- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:364
- [[ASTSymbolExtractor]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:67
- [[Analyzers & Extractors]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/index.md:100
- [[CheckLinksCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/CheckLinksCommand.md:7
- [[ExploreEntrypointCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:12
- [[ValidateSymbolRefsCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:7
- [[Analyzer System]] → /Users/junwoobang/workflow/tsdoc-edge/managed/core/analyzer-system.md:154
- [[Spec Management System]] → /Users/junwoobang/workflow/tsdoc-edge/managed/core/spec-management-system.md:97
- [[CLI Runner]] → /Users/junwoobang/workflow/tsdoc-edge/managed/core-components/CLIRunner.md:64
- [[DatabaseManager]] → /Users/junwoobang/workflow/tsdoc-edge/managed/core-components/DatabaseManager.md:126
- [[DocumentSymbolParser]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/DocumentSymbolParser.md:102
- [[DocumentSymbolParser]]#Section → /Users/junwoobang/workflow/tsdoc-edge/managed/features/DocumentSymbolParser.md:102
- [[DocumentSymbolParser]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/DocumentSymbolParser.md:106
- [[DocumentSymbolParser]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/DocumentSymbolParser.md:106
- [[DocumentSymbolParser]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/DocumentSymbolParser.md:106
- SymbolReferenceGenerator → /Users/junwoobang/workflow/tsdoc-edge/managed/features/SymbolReferenceGenerator.md:12
- SymbolReferenceResolver → /Users/junwoobang/workflow/tsdoc-edge/managed/features/SymbolReferenceResolver.md:7
- [[CoreWorkflow]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/core-workflow.md:96
- [[Analyzer Development Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/analyzer-development-guide.md:262
- [[Document Symbol Parser]] → /Users/junwoobang/workflow/tsdoc-edge/managed/parser/DocumentSymbolParser.md:62
- TrackableStatistics → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/TrackableStatistics.md:33
- InterfaceTypes → /Users/junwoobang/workflow/tsdoc-edge/managed/types/InterfaceTypes.md:108
- RegistryTypes → /Users/junwoobang/workflow/tsdoc-edge/managed/types/RegistryTypes.md:123
- [[Symbol]] → /Users/junwoobang/workflow/tsdoc-edge/managed/types/Symbol.md:24
- SymbolSearchEngine → /Users/junwoobang/workflow/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:104
- [[Utilities Index]] → /Users/junwoobang/workflow/tsdoc-edge/managed/utilities/index.md:86
- [[Example - Mermaid Workflow]] → /Users/junwoobang/workflow/tsdoc-edge/managed/workflows/EXAMPLE-MERMAID-WORKFLOW.md:50

### Implemented By

- DocReferenceAnalyzer → /Users/junwoobang/workflow/tsdoc-edge/src/analyzer/DocReferenceAnalyzer.ts:49
- DocReferenceAnalyzer (Section) → /Users/junwoobang/workflow/tsdoc-edge/src/analyzer/DocReferenceAnalyzer.ts:49
- AnalyzeDocReferenceCommand → /Users/junwoobang/workflow/tsdoc-edge/src/commands/AnalyzeDocReferenceCommand.ts:21
- TSDocSymbolParser → /Users/junwoobang/workflow/tsdoc-edge/src/doc-symbol/TSDocSymbolParser.ts:17
- Symbol → /Users/junwoobang/workflow/tsdoc-edge/src/types/graph/graph.ts:44

