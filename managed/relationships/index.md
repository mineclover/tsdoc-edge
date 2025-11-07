---
title: Relationship Types Index
type: index
category: relationships
status: active
entrypoint: true
purpose: Single source of truth for all relationship types in TSDoc Edge
---

# [[Relationship Types]]

> **SSOT Entrypoint**: This document is the single source of truth for all relationship types tracked by TSDoc Edge.
> Use `tsdoc-edge work-context managed/relationships/index.md` to explore the entire relationship system.

## Overview

TSDoc Edge tracks **17 relationship types** across **7 dimensions** to provide a complete understanding of code architecture.

**Implementation Progress**: 10/17 types (59%)

## Relationship Taxonomy

### 1. Code Space (구조적 의존성)

Structural dependencies between code elements.

- **[[Code Dependency]]** - ✅ Implemented (1,968 rels)
  - `import A from B` - Static import/export tracking
  - **Implementation**: `ASTSymbolExtractor.ts:216-246`
  - **Command**: `build`

- **[[Inheritance]]** - ✅ Implemented (57 rels)
  - `class A extends B` - Class and interface inheritance
  - **Implementation**: `ASTSymbolExtractor.ts:286-315, 336-351`
  - **Command**: `build`

- **[[Interface Implementation]]** - ✅ Implemented (0 rels, ready)
  - `class A implements I` - Interface implementation tracking
  - **Implementation**: `ASTSymbolExtractor.ts:301-313`, `BuildCommand.ts:210-216`
  - **Command**: `build`
  - **Note**: No usage in current codebase, but detection is active

### 2. Data Space (데이터 흐름)

Data flow relationships based on type matching.

- **[[IO Dependency]]** - ✅ Implemented (6,705 rels)
  - Type-based data flow: `A's output → B's input`
  - **Implementation**: `IODependencyAnalyzer.ts`
  - **Command**: `analyze-io`

- **[[Pipeline]]** - ✅ Implemented (25,809 chains)
  - Sequential processing chains: `A → B → C → D` (3+ steps)
  - **Implementation**: `IODependencyAnalyzer.ts` (chain detection)
  - **Command**: `analyze-chains`

- **[[Event Flow]]** - ❌ Not Implemented
  - Event-driven relationships: `emit/listen` patterns
  - **Target**: Phase 2

### 3. Behavior Space (동적 관계)

Runtime behavior and execution relationships.

- **[[Calls]]** - ✅ Implemented (1,511 rels)
  - Function call relationships: `foo() calls bar()`
  - **Implementation**: `CallGraphAnalyzer.ts`
  - **Command**: `analyze-calls`

- **[[Callback]]** - ❌ Not Implemented
  - Callback pattern: functions passed as parameters
  - **Target**: Phase 2

- **[[Composition]]** - ❌ Not Implemented
  - Has-a relationships: `Feature = A + B + C`
  - **Target**: Phase 2

### 4. Meta Space (인지적 연결)

Human-understandable semantic connections.

- **[[Doc Reference]]** - ❌ Not Implemented
  - Documentation links: `@doc [[Symbol]]`
  - **Target**: Phase 2

- **[[Test Coverage]]** - ✅ Implemented (analyzer ready)
  - Test-to-implementation mapping: `test→impl`
  - **Implementation**: `TestRelationshipAnalyzer.ts`
  - **Command**: `analyze-tests`
  - **Status**: Analyzer created, needs integration

- **[[Enhancement]]** - ❌ Not Implemented
  - Enhancement relationships: `@enhances OtherSymbol`
  - **Target**: Phase 3

### 5. Type Space (타입 시스템)

TypeScript type-level dependencies.

- **[[Type Dependency]]** - ✅ Implemented (analyzer ready)
  - Type references in signatures: `param: TypeA`, `returns TypeB`
  - **Implementation**: `TypeDependencyAnalyzer.ts`
  - **Command**: `analyze-types`
  - **Status**: Analyzer created, needs integration

- **[[Generic Constraint]]** - ✅ Implemented (analyzer ready)
  - Generic type constraints: `T extends U`
  - **Implementation**: `TypeDependencyAnalyzer.ts:217-234`
  - **Command**: `analyze-types`
  - **Status**: Analyzer created, needs integration

### 6. Architectural Space (계층)

High-level architectural patterns.

- **[[Layer Dependency]]** - ❌ Not Implemented
  - Architectural layer violations: `controller→service`
  - **Target**: Phase 3

- **[[Module Boundary]]** - ❌ Not Implemented
  - Cross-package dependencies tracking
  - **Target**: Phase 3

### 7. Quality Space (품질)

Code quality and anti-patterns.

- **[[Circular Dependency]]** - ✅ Implemented (0 detected)
  - Circular import detection: `A→B→A`
  - **Implementation**: Dependency graph analysis
  - **Command**: `analyze`

## Implementation Files

### Core Analyzers

- **`src/analyzer/ASTSymbolExtractor.ts`**
  - Extracts: [[Code Dependency]], [[Inheritance]], [[Interface Implementation]]
  - Method: AST parsing via TypeScript Compiler API

- **`src/analyzer/IODependencyAnalyzer.ts`**
  - Extracts: [[IO Dependency]], [[Pipeline]]
  - Method: Type signature matching (Cartesian product)

- **`src/analyzer/CallGraphAnalyzer.ts`**
  - Extracts: [[Calls]]
  - Method: AST traversal for `ts.isCallExpression`

- **`src/analyzer/TestRelationshipAnalyzer.ts`**
  - Extracts: [[Test Coverage]]
  - Method: Test file import analysis

- **`src/analyzer/TypeDependencyAnalyzer.ts`**
  - Extracts: [[Type Dependency]], [[Generic Constraint]]
  - Method: Type node traversal and extraction

### Commands

- **`src/commands/BuildCommand.ts`** - Initial build with structural relationships
- **`src/commands/AnalyzeCallsCommand.ts`** - Call graph analysis
- **`src/commands/AnalyzeTestsCommand.ts`** - Test coverage analysis
- **`src/commands/AnalyzeTypesCommand.ts`** - Type dependency analysis
- **`src/commands/AnalyzeChainsCommand.ts`** - Pipeline chain detection
- **`src/commands/AnalyzeIOCommand.ts`** - IO dependency detection

## Database Schema

All relationships are stored in the unified schema:

```sql
CREATE TABLE unified_relationships (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,              -- Relationship type
    category TEXT NOT NULL,          -- Category (structural, behavioral, etc.)
    from_symbols TEXT NOT NULL,      -- JSON array of source symbols
    to_symbols TEXT NOT NULL,        -- JSON array of target symbols
    direction TEXT NOT NULL,         -- unidirectional, bidirectional, undirected
    strength TEXT NOT NULL,          -- strong, medium, weak
    evidence TEXT NOT NULL,          -- JSON array of evidence
    discovered_by TEXT NOT NULL,     -- static-analysis, type-inference, etc.
    confidence REAL NOT NULL,        -- 0.0 - 1.0
    file_path TEXT,
    line INTEGER,
    properties TEXT,                 -- JSON for type-specific properties
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

**Schema Location**: `src/storage/schema.sql`
**Manager**: `src/storage/DatabaseManager.ts`

## Usage: Entrypoint-Based Exploration

### 1. Explore Relationship System

```bash
# Start from this index to explore all relationship types
tsdoc-edge work-context managed/relationships/index.md

# Navigate to specific relationship type documentation
# Follow [[Symbol]] links to understand implementation details
```

### 2. Find Implementation for a Relationship Type

```bash
# Example: Find where [[Code Dependency]] is implemented
tsdoc-edge work-context managed/relationships/code-dependency.md

# This will show:
# - Implementation files (ASTSymbolExtractor.ts:216-246)
# - Related commands (BuildCommand)
# - Dependency chain to other relationships
```

### 3. Orphan Code Detection (Planned)

```bash
# Find code not reachable from any entrypoint
tsdoc-edge detect-orphans --entrypoint managed/relationships/index.md

# This will:
# - Start from [[Relationship Types]] checkpoint
# - Traverse all [[Symbol]] references
# - Identify files not referenced in the documentation graph
```

## Next Steps

### Phase 2 (Immediate)
- [ ] Implement [[Callback]] detection
- [ ] Implement [[Event Flow]] tracking
- [ ] Integrate [[Test Coverage]] analyzer into build
- [ ] Integrate [[Type Dependency]] analyzer into build

### Phase 3 (Future)
- [ ] Implement [[Layer Dependency]] validation
- [ ] Implement [[Module Boundary]] tracking
- [ ] Implement [[Doc Reference]] parsing
- [ ] Implement [[Enhancement]] tag support

## Related Documentation

- [[Dependency Meta-Structure]]: `managed/architecture/diagrams/dependency-meta-structure.mmd`
- [[Work Context Workflow]]: `managed/workflows/work-context-workflow.md`
- [[System Architecture]]: Main architecture documentation

## Verification

```bash
# Check current relationship counts
sqlite3 .tsdoc/symbols.db "SELECT type, COUNT(*) FROM unified_relationships GROUP BY type"

# Expected output (as of 2025-11-07):
# io-dependency|6705
# code-dependency|1968
# calls|1511
# inheritance|57
```

---

**Last Updated**: 2025-11-07
**Maintainer**: TSDoc Edge Core Team
**Status**: Active SSOT Document
