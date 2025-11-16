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
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:340
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:341
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:342
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:343
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:66
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:180
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:244
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:315
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:492
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:493
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:494
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:495
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:308
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:309
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:310
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:100
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:390
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:391
- [[CheckLinksCommand]] → /home/user/tsdoc-edge/managed/commands/CheckLinksCommand.md:7
- [[CheckLinksCommand]] → /home/user/tsdoc-edge/managed/commands/CheckLinksCommand.md:41
- [[CheckLinksCommand]] → /home/user/tsdoc-edge/managed/commands/CheckLinksCommand.md:42
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:12
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:54
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:55
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:7
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:100
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:101
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:64
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:193
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:194
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:126
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:434
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:435
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:93
- [[DocumentSymbolParser]]#Section → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:93
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:97
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:97
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:97
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:146
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:147
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:148
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:149
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:150
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:151
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:152
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:153
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:154
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:155
- [[SymbolReferenceGenerator]] → /home/user/tsdoc-edge/managed/doc-symbols/SymbolReferenceGenerator.md:12
- [[SymbolReferenceGenerator]] → /home/user/tsdoc-edge/managed/doc-symbols/SymbolReferenceGenerator.md:32
- [[SymbolReferenceGenerator]] → /home/user/tsdoc-edge/managed/doc-symbols/SymbolReferenceGenerator.md:33
- [[SymbolReferenceResolver]] → /home/user/tsdoc-edge/managed/doc-symbols/SymbolReferenceResolver.md:7
- [[SymbolReferenceResolver]] → /home/user/tsdoc-edge/managed/doc-symbols/SymbolReferenceResolver.md:35
- [[SymbolReferenceResolver]] → /home/user/tsdoc-edge/managed/doc-symbols/SymbolReferenceResolver.md:36
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:96
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:280
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:281
- [[Analyzer Development Guide]] → /home/user/tsdoc-edge/managed/guides/analyzer-development-guide.md:250
- [[TrackableStatistics]] → /home/user/tsdoc-edge/managed/primary-types/TrackableStatistics.md:33
- [[TrackableStatistics]] → /home/user/tsdoc-edge/managed/primary-types/TrackableStatistics.md:147
- [[TrackableStatistics]] → /home/user/tsdoc-edge/managed/primary-types/TrackableStatistics.md:148
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:321
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:322
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:323
- [[InterfaceTypes]] → /home/user/tsdoc-edge/managed/types/InterfaceTypes.md:83
- [[InterfaceTypes]] → /home/user/tsdoc-edge/managed/types/InterfaceTypes.md:97
- [[InterfaceTypes]] → /home/user/tsdoc-edge/managed/types/InterfaceTypes.md:98
- [[RegistryTypes]] → /home/user/tsdoc-edge/managed/types/RegistryTypes.md:97
- [[RegistryTypes]] → /home/user/tsdoc-edge/managed/types/RegistryTypes.md:109
- [[RegistryTypes]] → /home/user/tsdoc-edge/managed/types/RegistryTypes.md:110
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:245
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:246
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:247
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:88
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:126
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:127
- [[Utilities Index]] → /home/user/tsdoc-edge/managed/utilities/index.md:86
- [[Utilities Index]] → /home/user/tsdoc-edge/managed/utilities/index.md:430
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
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:108
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:109
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:110
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:111
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:112
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:113

### Implemented By

- DocReferenceAnalyzer → /home/user/tsdoc-edge/src/analyzer/DocReferenceAnalyzer.ts:49
- DocReferenceAnalyzer (Section) → /home/user/tsdoc-edge/src/analyzer/DocReferenceAnalyzer.ts:49
- AnalyzeDocReferenceCommand → /home/user/tsdoc-edge/src/commands/AnalyzeDocReferenceCommand.ts:19
- TSDocSymbolParser → /home/user/tsdoc-edge/src/doc-symbol/TSDocSymbolParser.ts:17
- Symbol → /home/user/tsdoc-edge/src/types/graph/graph.ts:17

