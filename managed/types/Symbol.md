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

```typescript
interface Symbol {
  id: string;              // Unique identifier (kebab-case)
  name: string;            // Symbol name
  type: SymbolType;        // Symbol type
  filePath: string;        // Source file path
  line: number;            // Line number
  column: number;          // Column number
  isExported: boolean;     // Exported from module?
  isPublic: boolean;       // Public API?
  summary?: string;        // TSDoc summary
  contract?: ContractSpec; // @contract spec
  responsibility?: ResponsibilitySpec; // @responsibility
  tests: TestMapping[];    // Test coverage
  designDecisions: string[]; // Related design docs
  tags: string[];          // TSDoc tags
  metadata: Record<string, unknown>; // Additional data
}
```

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

- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:44
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:115
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:250
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:251
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:66
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:180
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:244
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:315
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:233
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:100
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:328
- [[CheckLinksCommand]] → /home/user/tsdoc-edge/managed/commands/CheckLinksCommand.md:7
- [[CheckLinksCommand]] → /home/user/tsdoc-edge/managed/commands/CheckLinksCommand.md:33
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:12
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:38
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:7
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:52
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:64
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:152
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:126
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:284
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:93
- [[DocumentSymbolParser]]#Section → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:93
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:97
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:97
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:97
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:120
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:121
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:122
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:123
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:124
- [[SymbolReferenceGenerator]] → /home/user/tsdoc-edge/managed/doc-symbols/SymbolReferenceGenerator.md:12
- [[SymbolReferenceGenerator]] → /home/user/tsdoc-edge/managed/doc-symbols/SymbolReferenceGenerator.md:31
- [[SymbolReferenceResolver]] → /home/user/tsdoc-edge/managed/doc-symbols/SymbolReferenceResolver.md:7
- [[SymbolReferenceResolver]] → /home/user/tsdoc-edge/managed/doc-symbols/SymbolReferenceResolver.md:33
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:96
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:215
- [[TrackableStatistics]] → /home/user/tsdoc-edge/managed/primary-types/TrackableStatistics.md:33
- [[TrackableStatistics]] → /home/user/tsdoc-edge/managed/primary-types/TrackableStatistics.md:127
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:293
- [[InterfaceTypes]] → /home/user/tsdoc-edge/managed/types/InterfaceTypes.md:83
- [[InterfaceTypes]] → /home/user/tsdoc-edge/managed/types/InterfaceTypes.md:94
- [[RegistryTypes]] → /home/user/tsdoc-edge/managed/types/RegistryTypes.md:97
- [[RegistryTypes]] → /home/user/tsdoc-edge/managed/types/RegistryTypes.md:107
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:146
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:88
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:106
- [[Example - Mermaid Workflow]] → /home/user/tsdoc-edge/managed/workflows/EXAMPLE-MERMAID-WORKFLOW.md:48
- [[Example - Mermaid Workflow]] → /home/user/tsdoc-edge/managed/workflows/EXAMPLE-MERMAID-WORKFLOW.md:209
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:41
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:41
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:41
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:41
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:41
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:41
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:41
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:41
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:41
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:41
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:41
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:41
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:41
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:75
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:76
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:77
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:78
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:79
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:80
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:81
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:82
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:83
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:84
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:85
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:86
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:87

### Implemented By

- TSDocSymbolParser → /home/user/tsdoc-edge/src/doc-symbol/TSDocSymbolParser.ts:17

