---
title: Relationship Analysis Guide
type: guide
category: analysis
status: active
canonical: true
---

# [[Relationship Analysis Guide]]

> **Complete guide** to analyzing relationships between symbols in your TypeScript codebase

Learn how to detect, query, and visualize the 17 relationship types tracked by TSDoc Edge.

## Overview

TSDoc Edge tracks **17 relationship types** across 7 dimensions. This guide shows you how to analyze each type effectively.

**Master Index**: [[Relationship Types]] (`managed/relationships/index.md`)

## Relationship Categories

### 1. Code Space (Structural)

#### [[Code Dependency]] - Import/Export Relationships

**What it detects**: `import A from B`

**How to analyze**:
```bash
# Find all dependencies
tsdoc-edge deps BuildCommand

# Find who uses a symbol
tsdoc-edge who-uses DatabaseManager

# Find orphaned files (unreferenced)
tsdoc-edge orphans
```

**Analyzer**: [[ASTSymbolExtractor]] (`managed/analyzers/ASTSymbolExtractor.md`)

**Documentation**: [[Code Dependency]] (`managed/relationships/CODE-DEPENDENCY.md`)

**Use Cases**:
- Understand module boundaries
- Detect circular dependencies
- Find unused code
- Plan refactoring

---

#### [[Inheritance]] - Class Hierarchies

**What it detects**: `class A extends B`

**How to analyze**:
```bash
# Find class hierarchy
tsdoc-edge deps --type=inheritance Command

# Query database
sqlite3 .tsdoc/symbols.db "
  SELECT source_id, target_id
  FROM unified_relationships
  WHERE type='inheritance'
"
```

**Use Cases**:
- Understand class hierarchies
- Find base classes
- Detect inheritance depth

---

#### [[Interface Implementation]] - Contract Implementation

**What it detects**: `class A implements I`

**How to analyze**:
```bash
# Find all implementations of interface
tsdoc-edge who-uses --type=interface-impl ICommand
```

**Use Cases**:
- Find all implementations
- Validate contracts
- Detect missing implementations

---

### 2. Data Space (Data Flow)

#### [[IO Dependency]] - Type Flow

**What it detects**: Return type matches parameter type

**How to analyze**:
```bash
# Analyze I/O dependencies
tsdoc-edge analyze-io

# Find data flow for a type
tsdoc-edge deps --type=io ExtractionResult
```

**Analyzer**: [[IODependencyAnalyzer]] (`managed/analyzers/IODependencyAnalyzer.md`)

**Documentation**: [[IO Dependency]] (`managed/relationships/IO-DEPENDENCY.md`)

**Algorithm**:
1. Build producer map (return types)
2. Build consumer map (parameter types)
3. Match types (Cartesian product)
4. Confidence scoring (0.5-1.0)

**Use Cases**:
- Trace data flow
- Find type transformations
- Validate pipelines
- Detect type mismatches

---

#### [[Pipeline]] - Multi-Step Flows

**What it detects**: A → B → C (3+ steps)

**How to analyze**:
```bash
# Detect pipelines
tsdoc-edge analyze-pipeline

# Find pipeline chains
tsdoc-edge deps --type=pipeline BuildCommand
```

**Statistics**: 25,809 pipeline chains detected

**Use Cases**:
- Understand processing flows
- Optimize data pipelines
- Find bottlenecks
- Document workflows

---

### 3. Behavior Space (Dynamic)

#### [[Call Relationships]] - Function Calls

**What it detects**: `foo()` calls `bar()`

**How to analyze**:
```bash
# Analyze all calls
tsdoc-edge analyze-calls

# Find call chains
tsdoc-edge deps --type=calls BuildCommand

# Detect uncalled functions
tsdoc-edge orphans --type=function
```

**Analyzer**: [[CallGraphAnalyzer]] (`managed/analyzers/CallGraphAnalyzer.md`)

**Documentation**: [[Call Relationships]] (`managed/relationships/CALLS.md`)

**Call Types**:
- Direct calls: `foo()`
- Method calls: `obj.method()`
- Constructors: `new Foo()`

**Use Cases**:
- Find dead code
- Identify hotspots
- Trace execution flow
- Calculate code coverage impact

---

### 4. Meta Space (Cognitive)

#### [[Test Coverage]] - Test Relationships

**What it detects**: `*.test.ts` → implementation

**How to analyze**:
```bash
# Analyze test coverage
tsdoc-edge test-relationships

# Find untested code
tsdoc-edge untested

# Coverage by file
tsdoc-edge health src/commands
```

**Use Cases**:
- Find untested code
- Improve test coverage
- Validate test completeness
- Track quality metrics

---

### 5. Type Space (Type System)

#### [[Type Dependency]] - Type References

**What it detects**: Parameter/return type dependencies

**How to analyze**:
```bash
# Analyze type dependencies
tsdoc-edge analyze-types

# Find type usage
tsdoc-edge deps --type=type-dependency Symbol
```

**Use Cases**:
- Understand type coupling
- Refactor type hierarchies
- Detect type complexity

---

#### [[Generic Constraint]] - Generic Bounds

**What it detects**: `T extends U`

**How to analyze**:
```bash
# Find generic constraints
tsdoc-edge deps --type=generic-constraint
```

**Use Cases**:
- Understand generic relationships
- Validate type bounds
- Refactor generics

---

### 6. Quality Space (Code Quality)

#### [[Circular Dependency]] - Cycles

**What it detects**: A → B → A

**How to analyze**:
```bash
# Detect circular dependencies
tsdoc-edge detect-circular-types

# Check specific module
tsdoc-edge deps --detect-cycles src/commands
```

**Statistics**: 0 circular dependencies found (✅ clean)

**Use Cases**:
- Prevent circular deps
- Clean up architecture
- Enable tree-shaking
- Improve build times

---

## Multi-Dimensional Analysis

### Combine Multiple Relationship Types

**Example**: Full dependency analysis
```bash
# 1. Code dependencies
tsdoc-edge deps BuildCommand

# 2. Call relationships
tsdoc-edge deps --type=calls BuildCommand

# 3. I/O dependencies
tsdoc-edge deps --type=io BuildCommand

# 4. Test coverage
tsdoc-edge health src/commands/BuildCommand.ts
```

**Visualization**:
```
BuildCommand
  ├─ Code Deps: imports DatabaseManager, ASTSymbolExtractor
  ├─ Calls: execute() → extractor.extract()
  ├─ I/O: execute() → ExtractionResult → ValidateCommand
  └─ Tests: BuildCommand.test.ts (covered)
```

## Query Patterns

### Database Queries

**Find relationships by type**:
```sql
sqlite3 .tsdoc/symbols.db "
  SELECT source_id, target_id, metadata
  FROM unified_relationships
  WHERE type='calls'
  LIMIT 10
"
```

**Relationship statistics**:
```sql
SELECT type, COUNT(*) as count
FROM unified_relationships
GROUP BY type
ORDER BY count DESC;
```

**Find symbols with most dependencies**:
```sql
SELECT source_id, COUNT(*) as dep_count
FROM unified_relationships
WHERE type='code-dependency'
GROUP BY source_id
ORDER BY dep_count DESC
LIMIT 10;
```

## Relationship Analysis Workflows

### Workflow 1: Impact Analysis

**Goal**: Understand impact of changing a symbol

```bash
# 1. Find direct dependencies
tsdoc-edge deps SymbolGraph

# 2. Find reverse dependencies
tsdoc-edge who-uses SymbolGraph

# 3. Find call relationships
tsdoc-edge deps --type=calls SymbolGraph

# 4. Find test coverage
tsdoc-edge health src/graph/SymbolGraph.ts
```

**Result**: Complete impact map

---

### Workflow 2: Refactoring Safety

**Goal**: Ensure safe refactoring

```bash
# 1. Check circular dependencies
tsdoc-edge detect-circular-types

# 2. Find all usages
tsdoc-edge who-uses OldSymbol

# 3. Verify test coverage
tsdoc-edge test-relationships OldSymbol

# 4. Check documentation
tsdoc-edge validate-docs managed
```

**Result**: Safe refactoring checklist

---

### Workflow 3: Architecture Validation

**Goal**: Validate system architecture

```bash
# 1. Check layer dependencies
tsdoc-edge deps --type=code-dependency commands

# 2. Verify no circular deps
tsdoc-edge detect-circular-types

# 3. Check orphaned code
tsdoc-edge orphans

# 4. Validate documentation
tsdoc-edge explore-entrypoint managed/README.md --detect-orphans
```

**Result**: Architecture health report

---

## Analyzers Used

### Primary Analyzers

1. [[ASTSymbolExtractor]] (`managed/analyzers/ASTSymbolExtractor.md`)
   - Extracts: Code dependencies, inheritance, interface impl
   - Coverage: All structural relationships

2. [[CallGraphAnalyzer]] (`managed/analyzers/CallGraphAnalyzer.md`)
   - Extracts: Call relationships
   - Coverage: All function calls

3. [[IODependencyAnalyzer]] (`managed/analyzers/IODependencyAnalyzer.md`)
   - Extracts: I/O dependencies, pipelines
   - Coverage: All data flow relationships

4. [[CodeHealthChecker]] (`managed/analyzers/CodeHealthChecker.md`)
   - Analyzes: Test coverage, documentation quality
   - Coverage: Quality metrics

### Supporting Analyzers

- DataFlowAnalyzer - Advanced data flow
- DependencyResolver - Transitive dependencies
- [[TestCoverageAnalyzer]] - Test relationships
- [[TypeDependencyAnalyzer]] - Type relationships

See: [[Analyzers & Extractors]] (`managed/analyzers/index.md`)

---

## Statistics

**Current System** (as of 2025-11-08):

| Relationship Type | Count | Percentage |
|-------------------|-------|------------|
| [[Pipeline]] | 25,809 | 71.6% |
| [[IO Dependency]] | 6,705 | 18.6% |
| [[Code Dependency]] | 1,968 | 5.5% |
| [[Call Relationships]] | 1,511 | 4.2% |
| [[Inheritance]] | 57 | 0.2% |
| **Total** | **36,050** | **100%** |

---

## Best Practices

### 1. Regular Analysis
```bash
# After major changes
tsdoc-edge build src
tsdoc-edge analyze-calls
tsdoc-edge analyze-io
tsdoc-edge detect-circular-types
```

### 2. Before Refactoring
```bash
# Understand dependencies first
tsdoc-edge deps TargetSymbol
tsdoc-edge who-uses TargetSymbol
tsdoc-edge test-relationships TargetSymbol
```

### 3. Quality Gates
```bash
# CI/CD integration
tsdoc-edge health src --min-score 70
tsdoc-edge detect-circular-types --fail-on-cycles
tsdoc-edge validate-docs managed
```

---

## Related Documentation

**Relationship Types**:
- [[Relationship Types]] (`managed/relationships/index.md`) - Master index
- [[Code Dependency]] (`managed/relationships/CODE-DEPENDENCY.md`)
- [[Call Relationships]] (`managed/relationships/CALLS.md`)
- [[IO Dependency]] (`managed/relationships/IO-DEPENDENCY.md`)
- [[Pipeline]] (`managed/relationships/PIPELINE.md`)
- [[Test Coverage]] (`managed/relationships/test-coverage.md`)
- [[Coverage Metrics Contract]] (`managed/features/coverage-metrics-contract.md`)

**Analyzers**:
- [[ASTSymbolExtractor]] (`managed/analyzers/ASTSymbolExtractor.md`)
- [[CallGraphAnalyzer]] (`managed/analyzers/CallGraphAnalyzer.md`)
- [[IODependencyAnalyzer]] (`managed/analyzers/IODependencyAnalyzer.md`)

**Features**:
- [[AnalysisFeatures]] (`managed/features/analysis-features.md`)
- [[ValidationFeatures]] (`managed/features/validation-features.md`)

**Guides**:
- [[Build Pipeline Guide]] (`managed/guides/build-pipeline-guide.md`)

---

**Last Updated**: 2025-11-08
**Guide Type**: Comprehensive relationship analysis workflows
**Audience**: Developers analyzing codebase relationships

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:107
- [[Analyzer Development Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/analyzer-development-guide.md:271
- [[Guides & Tutorials]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:13
- [[Guides & Tutorials]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:305
- [[Quick Start Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/quick-start.md:54
- [[Quick Start Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/quick-start.md:116
- [[Quick Start Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/quick-start.md:138
- [[Quick Start Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/quick-start.md:188
