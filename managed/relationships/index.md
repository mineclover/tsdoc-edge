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

Master index for all 31 relationship types tracked by TSDoc Edge across 9 categories (Structural, Data Flow, Behavioral, Alternative, Constraint, Semantic, Testing, Type System, Architectural).

> **SSOT**: Master index for all relationship types tracked by TSDoc Edge
> **Source**: Dependency Meta-Structure (`managed/architecture/diagrams/dependency-meta-structure.mmd`)

## Usage

```bash
# Explore from this entrypoint
tsdoc-edge explore-entrypoint managed/relationships/index.md --detect-orphans

# Explore from diagram
tsdoc-edge explore-entrypoint managed/architecture/diagrams/dependency-meta-structure.mmd
```

## Status: 29/31 Implemented (93%) ✅

**Version**: 2.1
**Last Updated**: 2025-11-26
**Source**: `src/types/relationships/unified.ts`

## 1. Code Space (구조적)

### [[Code Dependency]] ✅ 1,968
- **Pattern**: `import A from B`
- **Impl**: ASTSymbolExtractor (`src/analyzer/ASTSymbolExtractor.ts:216-246`)
- **Cmd**: BuildCommand (`src/commands/BuildCommand.ts`)
- **Storage**: DatabaseManager (`src/storage/DatabaseManager.ts`)
- **Query**: DepsCommand (`src/commands/DepsCommand.ts`), WhoUsesCommand (`src/commands/WhoUsesCommand.ts`)
- **Doc**: [code-dependency.md](./code-dependency.md)

### [[Inheritance]] ✅ 57
- **Pattern**: `class A extends B`
- **Impl**: ASTSymbolExtractor (`src/analyzer/ASTSymbolExtractor.ts`)
- **Cmd**: BuildCommand (`src/commands/BuildCommand.ts`)
- **Storage**: DatabaseManager (`src/storage/DatabaseManager.ts`)
- **Query**: SymbolGraphBuilder (`src/graph/SymbolGraphBuilder.ts`) - type-based traversal
- **Doc**: [inheritance.md](./inheritance.md)

### [[Interface Implementation]] ✅
- **Pattern**: `class A implements I`
- **Impl**: ASTSymbolExtractor (`src/analyzer/ASTSymbolExtractor.ts`)
- **Cmd**: BuildCommand (`src/commands/BuildCommand.ts`)
- **Storage**: DatabaseManager (`src/storage/DatabaseManager.ts`)
- **Query**: Find all implementations of an interface
- **Doc**: [interface-impl.md](./interface-impl.md)

## 2. Data Space (데이터 흐름)

### [[IO Dependency]] ✅ 6,705
- **Pattern**: Return type matches param type
- **Impl**: [[IODependencyAnalyzer]] (`src/analyzer/IODependencyAnalyzer.ts`)
- **Cmd**: AnalyzeIOCommand (`src/commands/AnalyzeIOCommand.ts`)
- **Storage**: DatabaseManager (`src/storage/DatabaseManager.ts`)
- **Analysis**: [[IODependencyAnalyzer]] (`src/analyzer/IODependencyAnalyzer.ts`) - detects input/output contracts
- **Doc**: [io-dependency.md](./io-dependency.md)

### [[Pipeline]] ✅ 25,809
- **Pattern**: A → B → C → D (3+ steps)
- **Impl**: [[IODependencyAnalyzer]] (`src/analyzer/IODependencyAnalyzer.ts`)
- **Cmd**: AnalyzeChainsCommand (`src/commands/AnalyzeChainsCommand.ts`)
- **Storage**: DatabaseManager (`src/storage/DatabaseManager.ts`)
- **Doc**: [pipeline.md](./pipeline.md)

### [[Event Flow]] ✅
- **Pattern**: `emit()` / `on()`
- **Impl**: EventFlowAnalyzer (`src/analyzer/EventFlowAnalyzer.ts`)
- **Cmd**: AnalyzeEventsCommand (`src/commands/AnalyzeEventsCommand.ts`)
- **Storage**: DatabaseManager (`src/storage/DatabaseManager.ts`)
- **Doc**: [event-flow.md](./event-flow.md)

## 3. Behavior Space (동적)

### [[Call Relationships]] ✅ 1,511
- **Pattern**: `foo()` calls `bar()`
- **Impl**: [[CallGraphAnalyzer]] (`src/analyzer/CallGraphAnalyzer.ts`)
- **Cmd**: AnalyzeCallsCommand (`src/commands/AnalyzeCallsCommand.ts`)
- **Storage**: DatabaseManager (`src/storage/DatabaseManager.ts`)
- **Analysis**: Call detection via AST analysis (also known as CallRelationshipAnalyzer, CallAnalyzer)
- **Doc**: [calls.md](./calls.md)

### [[Callback Pattern]] ✅ 7
- **Pattern**: `function(cb: () => void)`
- **Impl**: CallbackAnalyzer (`src/analyzer/CallbackAnalyzer.ts`)
- **Cmd**: AnalyzeCallbacksCommand (`src/commands/AnalyzeCallbacksCommand.ts`)
- **Storage**: DatabaseManager (`src/storage/DatabaseManager.ts`)
- **Doc**: [callback.md](./callback.md)

### [[Composition Relationship]] ✅ 108
- **Pattern**: `class A { b: B }`
- **Impl**: CompositionAnalyzer (`src/analyzer/CompositionAnalyzer.ts`)
- **Cmd**: AnalyzeCompositionCommand (`src/commands/AnalyzeCompositionCommand.ts`)
- **Storage**: DatabaseManager (`src/storage/DatabaseManager.ts`)
- **Doc**: [composition.md](./composition.md)

## 4. Meta Space (인지적)

### [[Test Coverage]] ✅
- **Pattern**: `*.test.ts` → implementation
- **Impl**: [[TestRelationshipAnalyzer]] (`src/analyzer/TestRelationshipAnalyzer.ts`)
- **Cmd**: TestRelationshipsCommand (`src/commands/TestRelationshipsCommand.ts`)
- **Storage**: DatabaseManager (`src/storage/DatabaseManager.ts`)
- **Analysis**: [[TestCoverageAnalyzer]] (`src/analyzer/TestCoverageAnalyzer.ts`)
- **Query**: UntestedCommand (`src/commands/UntestedCommand.ts`) - find untested code
- **Doc**: [test-coverage.md](./test-coverage.md)

### [[Doc Reference]] ❌
- **Pattern**: `@doc [[Symbol]]`
- **Status**: Phase 3

### Enhancement ❌
- **Pattern**: `@enhances`
- **Status**: Phase 3 (planned)

## 5. Type Space (타입)

### [[Type Dependency]] ✅
- **Pattern**: Parameter/return types
- **Impl**: [[TypeDependencyAnalyzer]] (`src/analyzer/TypeDependencyAnalyzer.ts`)
- **Cmd**: AnalyzeTypesCommand (`src/commands/AnalyzeTypesCommand.ts`)
- **Storage**: DatabaseManager (`src/storage/DatabaseManager.ts`)
- **Analysis**: Extracts type relationships from signatures
- **Doc**: [type-dependency.md](./type-dependency.md)

### [[Generic Constraint]] ✅
- **Pattern**: `T extends U`
- **Impl**: [[TypeDependencyAnalyzer]] (`src/analyzer/TypeDependencyAnalyzer.ts`)
- **Cmd**: AnalyzeTypesCommand (`src/commands/AnalyzeTypesCommand.ts`)
- **Storage**: DatabaseManager (`src/storage/DatabaseManager.ts`)
- **Analysis**: Detects generic type constraints
- **Doc**: [generic-constraint.md](./generic-constraint.md)

## 6. Architectural Space (계층)

### Layer Dependency ❌
- **Pattern**: Controller → Service
- **Status**: Phase 3 (planned)

### Module Boundary ❌
- **Pattern**: Cross-package deps
- **Status**: Phase 3 (planned)

## 7. Quality Space (품질)

### [[Circular Dependency]] ✅ 0
- **Pattern**: A → B → A
- **Impl**: DetectCircularTypesCommand (`src/commands/DetectCircularTypesCommand.ts`)
- **Cmd**: `tsdoc-edge detect-circular-types`
- **Storage**: DatabaseManager (`src/storage/DatabaseManager.ts`)
- **Analysis**: SymbolGraphBuilder (`src/graph/SymbolGraphBuilder.ts`) - cycle detection via DFS
- **Query**: Returns all circular dependency chains
- **Doc**: [circular.md](./circular.md)

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

## All Relationship Documents

| Category | Document |
|----------|----------|
| Structural | [code-dependency.md](./code-dependency.md), [inheritance.md](./inheritance.md), [interface-impl.md](./interface-impl.md) |
| Data Flow | [io-dependency.md](./io-dependency.md), [pipeline.md](./pipeline.md), [event-flow.md](./event-flow.md) |
| Behavioral | [calls.md](./calls.md), [callback.md](./callback.md), [composition.md](./composition.md) |
| Alternative | [substitution.md](./substitution.md), [fallback.md](./fallback.md) |
| Constraint | [temporal-order.md](./temporal-order.md), [mutual-exclusion.md](./mutual-exclusion.md), [co-requirement.md](./co-requirement.md) |
| Semantic | [collaboration.md](./collaboration.md), [conceptual-relation.md](./conceptual-relation.md), [feature-grouping.md](./feature-grouping.md) |
| Testing | [test-coverage.md](./test-coverage.md), [integration-verification.md](./integration-verification.md) |
| Type System | [type-dependency.md](./type-dependency.md), [generic-constraint.md](./generic-constraint.md) |
| Quality | [circular.md](./circular.md) |
| Reference | [doc-reference.md](./doc-reference.md), [standard-format.md](./standard-format.md) |

## Related Documentation

**Core Components**:
- SymbolGraphBuilder (`src/graph/SymbolGraphBuilder.ts`): Central graph data structure
- DatabaseManager (`src/storage/DatabaseManager.ts`): SQLite storage layer
- SymbolRegistryManager (`src/storage/SymbolRegistryManager.ts`): JSONL persistence
- ASTSymbolExtractor (`src/analyzer/ASTSymbolExtractor.ts`): Primary extractor

**Command References**:
- Commands Index (`managed/COMMANDS.md`): All 81 commands organized by category
- BuildCommand (`src/commands/BuildCommand.ts`): Extract all symbols and relationships
- WorkContextCommand (`src/commands/WorkContextCommand.ts`): Get file context with relationships

**Workflows**:
- [[Work Context Workflow]] (`managed/workflows/work-context-workflow.md`): Primary use case
- Dependency Meta-Structure (`managed/architecture/diagrams/dependency-meta-structure.mmd`): Visual taxonomy

**Analysis Features**:
- AnalysisFeatures (`managed/features/analysis-features.md`): 12 query & analysis commands
- ValidationFeatures (`managed/features/validation-features.md`): 8 validation commands

---

**Last Updated**: 2025-11-11

---

## Backlinks

### Referenced By

- CLI Commands → /Users/junwoobang/workflow/tsdoc-edge/managed/CLI-COMMANDS.md:292
- Commands Index → /Users/junwoobang/workflow/tsdoc-edge/managed/COMMANDS.md:281
- TSDoc Edge Documentation → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:309
- Analyzers & Extractors → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/index.md:250
- Concepts Index → /Users/junwoobang/workflow/tsdoc-edge/managed/concepts/index.md:257
- Analyzer Status → /Users/junwoobang/workflow/tsdoc-edge/managed/features/analyzer-status.md:282
- Features Index → /Users/junwoobang/workflow/tsdoc-edge/managed/features/index.md:224
- Guides & Tutorials → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:192
- Guides & Tutorials → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:358
- [[Relationship Analysis Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/relationship-analysis-guide.md:12
- [[Relationship Analysis Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/relationship-analysis-guide.md:318
- Quick Start Guide → /Users/junwoobang/workflow/tsdoc-edge/managed/quick-start.md:133
- Quick Start Guide → /Users/junwoobang/workflow/tsdoc-edge/managed/quick-start.md:182
- Workflows Index → /Users/junwoobang/workflow/tsdoc-edge/managed/workflows/index.md:198

