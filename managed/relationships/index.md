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
- **Impl**: [[InterfaceImplementationAnalyzer]] (`src/analyzer/InterfaceImplementationAnalyzer.ts`)
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
- **Impl**: [[CallRelationshipAnalyzer]] (`src/analyzer/CallRelationshipAnalyzer.ts`)
- **Cmd**: [[AnalyzeCallsCommand]] (`src/commands/AnalyzeCallsCommand.ts`)
- **Storage**: [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)
- **Analysis**: [[CallAnalyzer]] (`src/analyzer/CallAnalyzer.ts`), [[CallGraphAnalyzer]] (`src/analyzer/CallGraphAnalyzer.ts`)
- **Doc**: [CALLS.md](./CALLS.md)

### [[Callback]] ❌
- **Pattern**: `function(cb: () => void)`
- **Status**: Phase 2

### [[Composition]] ❌
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
- [[RegistryManager]] (`src/storage/RegistryManager.ts`): JSONL persistence
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
