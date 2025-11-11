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

## Status: 10/17 Implemented (59%)

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

### [[Event Flow]] ❌
- **Pattern**: `emit()` / `on()`
- **Status**: Phase 2

## 3. Behavior Space (동적)

### [[Call Relationships]] ✅ 1,511
- **Pattern**: `foo()` calls `bar()`
- **Impl**: [[CallGraphAnalyzer]] (`src/analyzer/CallGraphAnalyzer.ts`)
- **Cmd**: [[AnalyzeCallsCommand]] (`src/commands/AnalyzeCallsCommand.ts`)
- **Storage**: [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)
- **Analysis**: Call detection via AST analysis (also known as CallRelationshipAnalyzer, CallAnalyzer)
- **Doc**: [CALLS.md](./CALLS.md)

### [[Callback Pattern]] ❌
- **Pattern**: `function(cb: () => void)`
- **Status**: Phase 2

### [[Composition Relationship]] ❌
- **Pattern**: `class A { b: B }`
- **Status**: Phase 2

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

**Phase 1 (10/10 ✅)**: code-dependency, inheritance, interface-impl, io-dependency, pipeline, calls, test-coverage, type-dependency, generic-constraint, circular

**Phase 2 (0/3)**: event-flow, callback, composition

**Phase 3 (0/4)**: doc-reference, enhancement, layer-dependency, module-boundary

## Statistics

**Total**: 36,050+ relationships
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

**Last Updated**: 2025-11-08

---

## Backlinks

### Referenced By

- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:220
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:253
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:254
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:255
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:255
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:251
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:252
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:253
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:254
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:255
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:256
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:257
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:258
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:292
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:293
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:53
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:54
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:55
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:56
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:57
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:58
- [[TestCoverageAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestCoverageAnalyzer.md:52
- [[TestCoverageAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestCoverageAnalyzer.md:53
- [[TestRelationshipAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestRelationshipAnalyzer.md:43
- [[TestRelationshipAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestRelationshipAnalyzer.md:44
- [[TypeDependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TypeDependencyAnalyzer.md:39
- [[TypeDependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TypeDependencyAnalyzer.md:40
- [[TypeDependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TypeDependencyAnalyzer.md:41
- [[TypeDependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TypeDependencyAnalyzer.md:42
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:250
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:332
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:48
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:49
- [[AnalyzeChainsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeChainsCommand.md:44
- [[AnalyzeChainsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeChainsCommand.md:45
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:42
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:43
- [[AnalyzeTypesCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeTypesCommand.md:41
- [[AnalyzeTypesCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeTypesCommand.md:42
- [[AnalyzeTypesCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeTypesCommand.md:43
- [[AnalyzeTypesCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeTypesCommand.md:44
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:128
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:129
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:130
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:131
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:132
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:133
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:134
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:135
- [[DepsCommand]] → /home/user/tsdoc-edge/managed/commands/DepsCommand.md:149
- [[DetectCircularTypesCommand]] → /home/user/tsdoc-edge/managed/commands/DetectCircularTypesCommand.md:74
- [[TestRelationshipsCommand]] → /home/user/tsdoc-edge/managed/commands/TestRelationshipsCommand.md:41
- [[TestRelationshipsCommand]] → /home/user/tsdoc-edge/managed/commands/TestRelationshipsCommand.md:42
- [[UntestedCommand]] → /home/user/tsdoc-edge/managed/commands/UntestedCommand.md:174
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:159
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:100
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:101
- [[Concepts Index]] → /home/user/tsdoc-edge/managed/concepts/index.md:257
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:316
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:317
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:318
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:319
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:320
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:321
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:322
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:323
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:324
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:325
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:326
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:327
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:328
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:329
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:330
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:331
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:332
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:333
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:334
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:335
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:336
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:337
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:352
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:353
- [[Features Index]] → /home/user/tsdoc-edge/managed/features/index.md:224
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:293
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:294
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:118
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:270
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:383
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:384
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:12
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:318
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:384
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:385
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:133
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:182
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:229
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:230
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:298
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:299
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:184
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:185
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:186
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:187
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:188
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:189
- [[Workflows Index]] → /home/user/tsdoc-edge/managed/workflows/index.md:198
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:274
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:275

