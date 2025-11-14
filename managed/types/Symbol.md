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
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:327
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:328
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:329
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:330
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:66
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:180
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:244
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:315
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:492
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:493
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:494
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:495
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:282
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:283
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:100
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:383
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:384
- [[CheckLinksCommand]] → /home/user/tsdoc-edge/managed/commands/CheckLinksCommand.md:7
- [[CheckLinksCommand]] → /home/user/tsdoc-edge/managed/commands/CheckLinksCommand.md:37
- [[CheckLinksCommand]] → /home/user/tsdoc-edge/managed/commands/CheckLinksCommand.md:38
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:12
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:47
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:48
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:7
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:78
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:79
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:64
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:185
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:186
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:126
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:364
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:365
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:93
- [[DocumentSymbolParser]]#Section → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:93
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:97
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:97
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:97
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:133
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:134
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:135
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:136
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:137
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:138
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:139
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:140
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:141
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:142
- [[SymbolReferenceGenerator]] → /home/user/tsdoc-edge/managed/doc-symbols/SymbolReferenceGenerator.md:12
- [[SymbolReferenceGenerator]] → /home/user/tsdoc-edge/managed/doc-symbols/SymbolReferenceGenerator.md:32
- [[SymbolReferenceGenerator]] → /home/user/tsdoc-edge/managed/doc-symbols/SymbolReferenceGenerator.md:33
- [[SymbolReferenceResolver]] → /home/user/tsdoc-edge/managed/doc-symbols/SymbolReferenceResolver.md:7
- [[SymbolReferenceResolver]] → /home/user/tsdoc-edge/managed/doc-symbols/SymbolReferenceResolver.md:35
- [[SymbolReferenceResolver]] → /home/user/tsdoc-edge/managed/doc-symbols/SymbolReferenceResolver.md:36
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:96
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:263
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:264
- [[TrackableStatistics]] → /home/user/tsdoc-edge/managed/primary-types/TrackableStatistics.md:33
- [[TrackableStatistics]] → /home/user/tsdoc-edge/managed/primary-types/TrackableStatistics.md:140
- [[TrackableStatistics]] → /home/user/tsdoc-edge/managed/primary-types/TrackableStatistics.md:141
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:312
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:313
- [[InterfaceTypes]] → /home/user/tsdoc-edge/managed/types/InterfaceTypes.md:83
- [[InterfaceTypes]] → /home/user/tsdoc-edge/managed/types/InterfaceTypes.md:96
- [[InterfaceTypes]] → /home/user/tsdoc-edge/managed/types/InterfaceTypes.md:97
- [[RegistryTypes]] → /home/user/tsdoc-edge/managed/types/RegistryTypes.md:97
- [[RegistryTypes]] → /home/user/tsdoc-edge/managed/types/RegistryTypes.md:109
- [[RegistryTypes]] → /home/user/tsdoc-edge/managed/types/RegistryTypes.md:110
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:199
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:200
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:88
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:117
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:118
- [[Utilities Index]] → /home/user/tsdoc-edge/managed/utilities/index.md:86
- [[Example - Mermaid Workflow]] → /home/user/tsdoc-edge/managed/workflows/EXAMPLE-MERMAID-WORKFLOW.md:48
- [[Example - Mermaid Workflow]] → /home/user/tsdoc-edge/managed/workflows/EXAMPLE-MERMAID-WORKFLOW.md:210
- [[Example - Mermaid Workflow]] → /home/user/tsdoc-edge/managed/workflows/EXAMPLE-MERMAID-WORKFLOW.md:211
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
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:82
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:83
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:84
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:85
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:86
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:87
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:88
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:89
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:90
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:91
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:92
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:93
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:94
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:95
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:96
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:97
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:98
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:99
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:100
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:101
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:102
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:103
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:104
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:105
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:106
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:107

### Implemented By

- DocReferenceAnalyzer → /home/user/tsdoc-edge/src/analyzer/DocReferenceAnalyzer.ts:49
- DocReferenceAnalyzer (Section) → /home/user/tsdoc-edge/src/analyzer/DocReferenceAnalyzer.ts:49
- AnalyzeDocReferenceCommand → /home/user/tsdoc-edge/src/commands/AnalyzeDocReferenceCommand.ts:19
- TSDocSymbolParser → /home/user/tsdoc-edge/src/doc-symbol/TSDocSymbolParser.ts:17
- Symbol → /home/user/tsdoc-edge/src/types/graph/graph.ts:17

