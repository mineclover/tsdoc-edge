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
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:333
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:334
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:335
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:336
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:337
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:255
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:486
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:296
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:297
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:298
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:299
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:300
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:301
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:302
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:303
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:304
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:305
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:306
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:307
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:318
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:319
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:320
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:72
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:73
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:74
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:75
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:76
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:77
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:78
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:79
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:80
- [[TestCoverageAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestCoverageAnalyzer.md:65
- [[TestCoverageAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestCoverageAnalyzer.md:66
- [[TestCoverageAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestCoverageAnalyzer.md:67
- [[TestRelationshipAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestRelationshipAnalyzer.md:50
- [[TestRelationshipAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestRelationshipAnalyzer.md:51
- [[TestRelationshipAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestRelationshipAnalyzer.md:52
- [[TypeDependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TypeDependencyAnalyzer.md:122
- [[TypeDependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TypeDependencyAnalyzer.md:123
- [[TypeDependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TypeDependencyAnalyzer.md:124
- [[TypeDependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TypeDependencyAnalyzer.md:125
- [[TypeDependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TypeDependencyAnalyzer.md:126
- [[TypeDependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TypeDependencyAnalyzer.md:127
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:250
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:386
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:387
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:61
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:62
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:63
- [[AnalyzeChainsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeChainsCommand.md:53
- [[AnalyzeChainsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeChainsCommand.md:54
- [[AnalyzeChainsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeChainsCommand.md:55
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:50
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:51
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:52
- [[AnalyzeTypesCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeTypesCommand.md:47
- [[AnalyzeTypesCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeTypesCommand.md:48
- [[AnalyzeTypesCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeTypesCommand.md:49
- [[AnalyzeTypesCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeTypesCommand.md:50
- [[AnalyzeTypesCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeTypesCommand.md:51
- [[AnalyzeTypesCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeTypesCommand.md:52
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:171
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:172
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:173
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:174
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:175
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:176
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:177
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:178
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:179
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:180
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:181
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:182
- [[DepsCommand]] → /home/user/tsdoc-edge/managed/commands/DepsCommand.md:170
- [[DepsCommand]] → /home/user/tsdoc-edge/managed/commands/DepsCommand.md:171
- [[DetectCircularTypesCommand]] → /home/user/tsdoc-edge/managed/commands/DetectCircularTypesCommand.md:83
- [[DetectCircularTypesCommand]] → /home/user/tsdoc-edge/managed/commands/DetectCircularTypesCommand.md:84
- [[TestRelationshipsCommand]] → /home/user/tsdoc-edge/managed/commands/TestRelationshipsCommand.md:49
- [[TestRelationshipsCommand]] → /home/user/tsdoc-edge/managed/commands/TestRelationshipsCommand.md:50
- [[TestRelationshipsCommand]] → /home/user/tsdoc-edge/managed/commands/TestRelationshipsCommand.md:51
- [[UntestedCommand]] → /home/user/tsdoc-edge/managed/commands/UntestedCommand.md:188
- [[UntestedCommand]] → /home/user/tsdoc-edge/managed/commands/UntestedCommand.md:189
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:178
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:179
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:125
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:126
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:127
- [[Concepts Index]] → /home/user/tsdoc-edge/managed/concepts/index.md:257
- [[Concepts Index]] → /home/user/tsdoc-edge/managed/concepts/index.md:285
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:385
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:386
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:387
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:388
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:389
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:390
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:391
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:392
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:393
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:394
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:395
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:396
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:397
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:398
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:399
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:400
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:401
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:402
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:403
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:404
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:405
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:406
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:407
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:408
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:409
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:410
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:411
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:412
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:413
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:414
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:415
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:416
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:417
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:418
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:419
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:420
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:411
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:412
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:413
- [[Analyzer Status]] → /home/user/tsdoc-edge/managed/features/analyzer-status.md:280
- [[Features Index]] → /home/user/tsdoc-edge/managed/features/index.md:224
- [[Features Index]] → /home/user/tsdoc-edge/managed/features/index.md:248
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:333
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:334
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:335
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:192
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:358
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:545
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:546
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:547
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:548
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:12
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:318
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:419
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:420
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:421
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:422
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:133
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:182
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:255
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:256
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:257
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:258
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:315
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:316
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:317
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:233
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:234
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:235
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:236
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:237
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:238
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:239
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:240
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:241
- [[Workflows Index]] → /home/user/tsdoc-edge/managed/workflows/index.md:198
- [[Workflows Index]] → /home/user/tsdoc-edge/managed/workflows/index.md:211
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:290
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:291
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:292

