---
title: Relationship Types
type: meta-architecture
category: core-design
status: active
canonical: true
entrypoint: true
source-diagram: managed/architecture/diagrams/dependency-meta-structure.mmd
---

# [[Relationship Types]]

> **SSOT**: Master index for all relationship types tracked by TSDoc Edge
> **Source**: [[Dependency Meta-Structure]] (`managed/architecture/diagrams/dependency-meta-structure.mmd`)

## Usage

```bash
# Explore from this entrypoint
tsdoc-edge explore-entrypoint managed/relationships/index.md --detect-orphans

# Explore from diagram
tsdoc-edge explore-entrypoint managed/architecture/diagrams/dependency-meta-structure.mmd
```

## Status: 26/26 Implemented (100%) ✅

**Version**: 2.0
**Last Updated**: 2025-11-11
**Source**: `src/types/relationships/unified.ts`

## 1. Code Space (구조적)

### [[Code Dependency]] ✅ 1,968
- **Pattern**: `import A from B`
- **Impl**: [[ASTSymbolExtractor]] (`src/analyzer/ASTSymbolExtractor.ts:216-246`)
- **Cmd**: [[BuildCommand]] (`src/commands/BuildCommand.ts`)
- **Storage**: [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)
- **Query**: [[DepsCommand]] (`src/commands/DepsCommand.ts`), [[WhoUsesCommand]] (`src/commands/WhoUsesCommand.ts`)
- **Doc**: [CODE-DEPENDENCY.md](./CODE-DEPENDENCY.md)

### [[Inheritance]] ✅ 57
- **Pattern**: `class A extends B`
- **Impl**: [[ASTSymbolExtractor]] (`src/analyzer/ASTSymbolExtractor.ts`)
- **Cmd**: [[BuildCommand]] (`src/commands/BuildCommand.ts`)
- **Storage**: [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)
- **Query**: [[SymbolGraphBuilder]] (`src/graph/SymbolGraphBuilder.ts`) - type-based traversal
- **Doc**: [INHERITANCE.md](./INHERITANCE.md)

### [[Interface Implementation]] ✅
- **Pattern**: `class A implements I`
- **Impl**: [[ASTSymbolExtractor]] (`src/analyzer/ASTSymbolExtractor.ts`)
- **Cmd**: [[BuildCommand]] (`src/commands/BuildCommand.ts`)
- **Storage**: [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)
- **Query**: Find all implementations of an interface
- **Doc**: [INTERFACE-IMPL.md](./INTERFACE-IMPL.md)

## 2. Data Space (데이터 흐름)

### [[IO Dependency]] ✅ 6,705
- **Pattern**: Return type matches param type
- **Impl**: [[IODependencyAnalyzer]] (`src/analyzer/IODependencyAnalyzer.ts`)
- **Cmd**: [[AnalyzeIOCommand]] (`src/commands/AnalyzeIOCommand.ts`)
- **Storage**: [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)
- **Analysis**: [[IODependencyAnalyzer]] (`src/analyzer/IODependencyAnalyzer.ts`) - detects input/output contracts
- **Doc**: [IO-DEPENDENCY.md](./IO-DEPENDENCY.md)

### [[Pipeline]] ✅ 25,809
- **Pattern**: A → B → C → D (3+ steps)
- **Impl**: [[IODependencyAnalyzer]] (`src/analyzer/IODependencyAnalyzer.ts`)
- **Cmd**: [[AnalyzeChainsCommand]] (`src/commands/AnalyzeChainsCommand.ts`)
- **Storage**: [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)
- **Doc**: [PIPELINE.md](./PIPELINE.md)

### [[Event Flow]] ✅
- **Pattern**: `emit()` / `on()`
- **Impl**: [[EventFlowAnalyzer]] (`src/analyzer/EventFlowAnalyzer.ts`)
- **Cmd**: [[AnalyzeEventsCommand]] (`src/commands/AnalyzeEventsCommand.ts`)
- **Storage**: [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)
- **Doc**: [event-flow.md](./event-flow.md)

## 3. Behavior Space (동적)

### [[Call Relationships]] ✅ 1,511
- **Pattern**: `foo()` calls `bar()`
- **Impl**: [[CallGraphAnalyzer]] (`src/analyzer/CallGraphAnalyzer.ts`)
- **Cmd**: [[AnalyzeCallsCommand]] (`src/commands/AnalyzeCallsCommand.ts`)
- **Storage**: [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)
- **Analysis**: Call detection via AST analysis (also known as CallRelationshipAnalyzer, CallAnalyzer)
- **Doc**: [CALLS.md](./CALLS.md)

### [[Callback Pattern]] ✅ 7
- **Pattern**: `function(cb: () => void)`
- **Impl**: [[CallbackAnalyzer]] (`src/analyzer/CallbackAnalyzer.ts`)
- **Cmd**: [[AnalyzeCallbacksCommand]] (`src/commands/AnalyzeCallbacksCommand.ts`)
- **Storage**: [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)
- **Doc**: [CALLBACK.md](./CALLBACK.md)

### [[Composition Relationship]] ✅ 108
- **Pattern**: `class A { b: B }`
- **Impl**: [[CompositionAnalyzer]] (`src/analyzer/CompositionAnalyzer.ts`)
- **Cmd**: [[AnalyzeCompositionCommand]] (`src/commands/AnalyzeCompositionCommand.ts`)
- **Storage**: [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)
- **Doc**: [COMPOSITION.md](./COMPOSITION.md)

## 4. Meta Space (인지적)

### [[Test Coverage]] ✅
- **Pattern**: `*.test.ts` → implementation
- **Impl**: [[TestRelationshipAnalyzer]] (`src/analyzer/TestRelationshipAnalyzer.ts`)
- **Cmd**: [[TestRelationshipsCommand]] (`src/commands/TestRelationshipsCommand.ts`)
- **Storage**: [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)
- **Analysis**: [[TestCoverageAnalyzer]] (`src/analyzer/TestCoverageAnalyzer.ts`)
- **Query**: [[UntestedCommand]] (`src/commands/UntestedCommand.ts`) - find untested code
- **Doc**: [TEST-COVERAGE.md](./TEST-COVERAGE.md)

### [[Doc Reference]] ❌
- **Pattern**: `@doc [[Symbol]]`
- **Status**: Phase 3

### [[Enhancement]] ❌
- **Pattern**: `@enhances`
- **Status**: Phase 3

## 5. Type Space (타입)

### [[Type Dependency]] ✅
- **Pattern**: Parameter/return types
- **Impl**: [[TypeDependencyAnalyzer]] (`src/analyzer/TypeDependencyAnalyzer.ts`)
- **Cmd**: [[AnalyzeTypesCommand]] (`src/commands/AnalyzeTypesCommand.ts`)
- **Storage**: [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)
- **Analysis**: Extracts type relationships from signatures
- **Doc**: [TYPE-DEPENDENCY.md](./TYPE-DEPENDENCY.md)

### [[Generic Constraint]] ✅
- **Pattern**: `T extends U`
- **Impl**: [[TypeDependencyAnalyzer]] (`src/analyzer/TypeDependencyAnalyzer.ts`)
- **Cmd**: [[AnalyzeTypesCommand]] (`src/commands/AnalyzeTypesCommand.ts`)
- **Storage**: [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)
- **Analysis**: Detects generic type constraints
- **Doc**: [GENERIC-CONSTRAINT.md](./GENERIC-CONSTRAINT.md)

## 6. Architectural Space (계층)

### [[Layer Dependency]] ❌
- **Pattern**: Controller → Service
- **Status**: Phase 3

### [[Module Boundary]] ❌
- **Pattern**: Cross-package deps
- **Status**: Phase 3

## 7. Quality Space (품질)

### [[Circular Dependency]] ✅ 0
- **Pattern**: A → B → A
- **Impl**: [[DetectCircularTypesCommand]] (`src/commands/DetectCircularTypesCommand.ts`)
- **Cmd**: `tsdoc-edge detect-circular-types`
- **Storage**: [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)
- **Analysis**: [[SymbolGraphBuilder]] (`src/graph/SymbolGraphBuilder.ts`) - cycle detection via DFS
- **Query**: Returns all circular dependency chains
- **Doc**: [CIRCULAR.md](./CIRCULAR.md)

## Roadmap

**Phase 1 (10/10 ✅)**: code-dependency, inheritance, implementation, io-dependency, pipeline, calls, test-coverage, type-dependency, generic-constraint, circular-dependency

**Phase 2 (7/7 ✅)**: event-flow ✅, callback ✅, composition ✅, substitution ✅, fallback ✅, temporal-order ✅, collaboration ✅

**Phase 3 (6/6 ✅)**: doc-reference ✅, enhancement ✅, layer-dependency ✅, module-boundary ✅, mutual-exclusion ✅, co-requirement ✅

**Phase 4 (3/3 ✅)**: conceptual-relation ✅, feature-grouping ✅, integration-verification ✅

**Total Types**: 26 across 10 categories
**Implemented**: 26 (100%) ✅
**Remaining**: 0

## Statistics

**Total**: 38,245+ relationships (108 composition, 7 callback, 0 event-flow, 2080 substitution, 0 fallback, 0 collaboration, 0 temporal-order, 36,050+ others)
**Coverage**: 7.0% symbols, 19.0% files (from explore-entrypoint)

## Validation

```bash
tsdoc-edge validate-symbol-refs managed
sqlite3 .tsdoc/symbols.db "SELECT type, COUNT(*) FROM unified_relationships GROUP BY type"
```

## Related Documentation

**Core Components**:
- [[SymbolGraphBuilder]] (`src/graph/SymbolGraphBuilder.ts`): Central graph data structure
- [[DatabaseManager]] (`src/storage/DatabaseManager.ts`): SQLite storage layer
- [[SymbolRegistryManager]] (`src/storage/SymbolRegistryManager.ts`): JSONL persistence
- [[ASTSymbolExtractor]] (`src/analyzer/ASTSymbolExtractor.ts`): Primary extractor

**Command References**:
- [[Commands Index]] (`managed/COMMANDS.md`): All 61 commands organized by category
- [[BuildCommand]] (`src/commands/BuildCommand.ts`): Extract all symbols and relationships
- [[WorkContextCommand]] (`src/commands/WorkContextCommand.ts`): Get file context with relationships

**Workflows**:
- [[Work Context Workflow]] (`managed/workflows/work-context-workflow.md`): Primary use case
- [[Dependency Meta-Structure]] (`managed/architecture/diagrams/dependency-meta-structure.mmd`): Visual taxonomy

**Analysis Features**:
- [[AnalysisFeatures]] (`managed/features/analysis-features.md`): 12 query & analysis commands
- [[ValidationFeatures]] (`managed/features/validation-features.md`): 8 validation commands

---

**Last Updated**: 2025-11-11

---

## Backlinks

### Referenced By

- [[CLI Commands]] → /home/user/tsdoc-edge/managed/CLI-COMMANDS.md:290
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:279
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:321
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:322
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:323
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:324
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:255
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:486
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:274
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:275
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:276
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:277
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:278
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:279
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:280
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:281
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:304
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:305
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:60
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:61
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:62
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:63
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:64
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:65
- [[TestCoverageAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestCoverageAnalyzer.md:55
- [[TestCoverageAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestCoverageAnalyzer.md:56
- [[TestRelationshipAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestRelationshipAnalyzer.md:45
- [[TestRelationshipAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestRelationshipAnalyzer.md:46
- [[TypeDependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TypeDependencyAnalyzer.md:117
- [[TypeDependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TypeDependencyAnalyzer.md:118
- [[TypeDependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TypeDependencyAnalyzer.md:119
- [[TypeDependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TypeDependencyAnalyzer.md:120
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:250
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:379
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:380
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:51
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:52
- [[AnalyzeChainsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeChainsCommand.md:45
- [[AnalyzeChainsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeChainsCommand.md:46
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:43
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:44
- [[AnalyzeTypesCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeTypesCommand.md:42
- [[AnalyzeTypesCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeTypesCommand.md:43
- [[AnalyzeTypesCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeTypesCommand.md:44
- [[AnalyzeTypesCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeTypesCommand.md:45
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:137
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:138
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:139
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:140
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:141
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:142
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:143
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:144
- [[DepsCommand]] → /home/user/tsdoc-edge/managed/commands/DepsCommand.md:165
- [[DepsCommand]] → /home/user/tsdoc-edge/managed/commands/DepsCommand.md:166
- [[DetectCircularTypesCommand]] → /home/user/tsdoc-edge/managed/commands/DetectCircularTypesCommand.md:79
- [[DetectCircularTypesCommand]] → /home/user/tsdoc-edge/managed/commands/DetectCircularTypesCommand.md:80
- [[TestRelationshipsCommand]] → /home/user/tsdoc-edge/managed/commands/TestRelationshipsCommand.md:44
- [[TestRelationshipsCommand]] → /home/user/tsdoc-edge/managed/commands/TestRelationshipsCommand.md:45
- [[UntestedCommand]] → /home/user/tsdoc-edge/managed/commands/UntestedCommand.md:181
- [[UntestedCommand]] → /home/user/tsdoc-edge/managed/commands/UntestedCommand.md:182
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:171
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:172
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:106
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:107
- [[Concepts Index]] → /home/user/tsdoc-edge/managed/concepts/index.md:257
- [[Concepts Index]] → /home/user/tsdoc-edge/managed/concepts/index.md:285
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:332
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:333
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:334
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:335
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:336
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:337
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:338
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:339
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:340
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:341
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:342
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:343
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:344
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:345
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:346
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:347
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:348
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:349
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:350
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:351
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:352
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:353
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:382
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:383
- [[Analyzer Status]] → /home/user/tsdoc-edge/managed/features/analyzer-status.md:280
- [[Features Index]] → /home/user/tsdoc-edge/managed/features/index.md:224
- [[Features Index]] → /home/user/tsdoc-edge/managed/features/index.md:247
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:311
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:312
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:118
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:270
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:442
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:443
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:444
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:445
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:12
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:318
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:390
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:391
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:133
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:182
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:247
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:248
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:249
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:250
- [[Co-Requirement]] → /home/user/tsdoc-edge/managed/relationships/co-requirement.md:169
- [[Collaboration]] → /home/user/tsdoc-edge/managed/relationships/collaboration.md:184
- [[Conceptual Relation]] → /home/user/tsdoc-edge/managed/relationships/conceptual-relation.md:177
- [[Fallback]] → /home/user/tsdoc-edge/managed/relationships/fallback.md:126
- [[Feature Grouping]] → /home/user/tsdoc-edge/managed/relationships/feature-grouping.md:195
- [[Integration Verification]] → /home/user/tsdoc-edge/managed/relationships/integration-verification.md:207
- [[Mutual Exclusion]] → /home/user/tsdoc-edge/managed/relationships/mutual-exclusion.md:142
- [[Substitution]] → /home/user/tsdoc-edge/managed/relationships/substitution.md:188
- [[Temporal Order]] → /home/user/tsdoc-edge/managed/relationships/temporal-order.md:239
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:308
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:309
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:191
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:192
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:193
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:194
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:195
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:196
- [[Workflows Index]] → /home/user/tsdoc-edge/managed/workflows/index.md:198
- [[Workflows Index]] → /home/user/tsdoc-edge/managed/workflows/index.md:210
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:278
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:279

