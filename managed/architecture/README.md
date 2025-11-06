# TSDoc Edge Architecture Documentation

**Last Updated**: 2025-11-07
**Status**: Active
**Completeness**: 95%

## Overview

This directory contains the comprehensive SSOT (Single Source of Truth) architectural documentation for TSDoc Edge, including system diagrams, relationship explanations, and implementation details.

## Document Index

### 1. System Architecture (`system-architecture-2025-11-07.md`)

**Purpose**: High-level system overview with 6 main diagrams and 3 sequence diagrams

**Contents**:
- System Overview Diagram (4 layers: UI, Core, Storage, Documentation)
- Symbol Extraction System flow
- Graph System operations
- Analysis System components
- Visualization System outputs
- Storage System (SQLite + JSONL hybrid)
- Build, Analysis, and Visualization sequence diagrams

**Key Metrics**:
- 1,438 symbols tracked
- 8,662 relationships (code: 1,902, inheritance: 55, io: 6,705)
- 0 circular dependencies
- Build time: ~2.2s
- Analysis time: <200ms

**Checkpoint**: [[System Architecture]]

### 2. Database and Relationships (`database-relationships-2025-11-07.md`)

**Purpose**: Detailed schema design and 17-type relationship system

**Contents**:
- Hybrid storage model (SQLite + JSONL)
- Complete schema documentation for all 12 tables
- 17 relationship types across 7 categories
- Evidence-based confidence scoring
- Full-text search (FTS5) configuration
- Performance metrics and indexes
- Data flow diagrams (Build and Query paths)
- Extension points for new relationship types

**Key Tables**:
- `symbols`: 1,438 records with type information
- `unified_relationships`: 8,662 relationships with evidence
- `enhanced_docs`: TSDoc extended documentation
- Supporting tables: error_experiences, decision_records, test_mappings, etc.

**Performance**:
- Symbol lookup: <1ms
- Relationship query: <5ms
- Full-text search: <10ms
- Complex joins: <50ms

**Checkpoint**: [[Database Schema]], [[UnifiedRelationships]]

### 3. Analysis and Extraction Systems (`analysis-extraction-systems-2025-11-07.md`)

**Purpose**: Deep dive into symbol extraction pipeline and analysis algorithms

**Contents**:
- ASTSymbolExtractor implementation details
- Type information extraction (declared, inferred, generic, parameters)
- Constant detection (4 patterns)
- Export tracking system (parent inheritance)
- DependencyChainAnalyzer (circular detection, hotspot analysis)
- IODependencyAnalyzer (type matching, pipeline detection)
- Parallel analysis orchestrator
- Key relationships between components
- Performance optimization strategies
- Testing strategy

**Algorithms**:
- **Circular Detection**: DFS with recursion stack (O(V+E))
- **Hotspot Scoring**: `score = incoming*2 + outgoing`
- **Type Matching**: Producer map ∩ Consumer map
- **Confidence Calculation**: Base 0.5 + modifiers (same file, imports, custom types)
- **Pipeline Detection**: Chain finding in I/O dependency graph

**Results**:
- 0 circular dependencies (after top-level filtering)
- 10 critical hotspots (score ≥ 20)
- 7,446 I/O dependencies detected
- 25,809 pipelines found (length 3)

**Checkpoint**: [[ASTSymbolExtractor]], [[IODependencyAnalyzer]], [[DependencyChainAnalyzer]]

## Key Architectural Decisions

### 1. Hybrid Storage Model

**Decision**: Use both SQLite and JSONL

**Rationale**:
- **SQLite**: Fast queries, FTS, complex joins, local performance
- **JSONL**: Git-friendly, diff-able, version controllable, human-readable

**Trade-offs**:
- ✅ Best of both worlds (performance + version control)
- ✅ SQLite can be rebuilt from JSONL (JSONL is source of truth)
- ❌ Dual writes increase complexity
- ❌ Must keep both in sync

### 2. Evidence-Based Relationships

**Decision**: Store confidence scores (0-1) with evidence arrays

**Rationale**:
- **Transparency**: Evidence explains WHY relationship exists
- **Quality Control**: Filter low-confidence relationships
- **Debugging**: Trace back to source code
- **Tuning**: Adjust thresholds without reanalysis

**Example**:
```json
{
  "type": "io-dependency",
  "confidence": 0.9,
  "evidence": [{
    "type": "type-signature",
    "source": "src/services/UserService.ts",
    "lineNumber": 42,
    "snippet": "getUser(): User",
    "confidence": 0.9,
    "context": "Consumed by updateUser(user: User)"
  }]
}
```

### 3. Unified Relationship Model

**Decision**: 17 types in one table vs. separate tables

**Rationale**:
- **Flexibility**: Easy to add new types without schema changes
- **Querying**: Single JOIN for all relationship queries
- **Analytics**: Cross-relationship analysis simplified
- **Consistency**: Same confidence/evidence model across types

**Trade-offs**:
- ✅ Simpler schema
- ✅ Easier to extend
- ✅ Unified query interface
- ❌ Larger table (but indexed well)
- ❌ Some type-specific properties in JSON (less structured)

### 4. Top-Level Symbol Filtering

**Decision**: Only extract module-scope variables, ignore function-local

**Rationale**:
- **Noise Reduction**: 1,153 → 21 variables (-98%)
- **False Positives**: 820 → 0 circular dependencies
- **Meaningful Symbols**: Focus on public API and module constants
- **Performance**: Smaller graph, faster analysis

**Impact**:
- Before: 2,531 symbols (46% variables, 820 circulars)
- After: 1,410 symbols (1.5% variables, 0 circulars)

### 5. Export Tracking with Parent Inheritance

**Decision**: Public methods of exported classes marked as exported

**Rationale**:
- **Public API Discovery**: Identify all user-facing methods
- **Documentation Quality**: Focus docs on exported symbols
- **Breaking Change Detection**: Track public API surface
- **Usage Analytics**: Monitor which APIs are used

**Implementation**:
```typescript
// Track exported parents
if (symbol.isExported) {
  this.exportedClasses.add(symbol.name);
}

// Propagate to children
const isExported = parentIsExported && isPublic;
```

**Results**: 462 exported members correctly identified

## System Statistics

### Current State (2025-11-07)

**Symbols**:
```
Total:         1,438
├─ Functions:    681 (47%)
├─ Classes:      112 (8%)
├─ Interfaces:    87 (6%)
├─ Methods:      527 (37%)
├─ Constants:     10 (0.7%)
└─ Variables:     21 (1.5%)

Public API:      462 exported members
```

**Relationships**:
```
Total:         8,662
├─ Code deps:  1,902 (22%)
├─ Inheritance:   55 (0.6%)
└─ I/O deps:   6,705 (77%)

Pipelines:    25,809 (length 3)
Circular:          0 ✨
```

**Quality Metrics**:
```
Circular Dependencies:  0 (excellent)
Critical Hotspots:     10 (Symbol, CommandResult, BaseCommand, etc.)
Hotspot Score Range:   58-170
Average Confidence:    0.72 (I/O dependencies)
```

**Performance Benchmarks** (Intel i7, SSD, 131 files):
```
Build Time:        2.2s
Analysis Time:    <200ms
Symbol Lookup:     <1ms
Relationship Query: <5ms
FTS Search:        <10ms
Complex Join:      <50ms
```

**Storage**:
```
SQLite DB:      2.4 MB
JSONL Files:    1.8 MB
FTS Index:      0.3 MB
Total:          4.5 MB
```

## Verification Results

### Output Validation (2025-11-07)

**Hotspot Analysis** (Top 10 Critical):
1. **Symbol** (Interface) - In: 83, Out: 4, Score: 170
2. **CommandResult** (Interface) - In: 73, Out: 0, Score: 146
3. **BaseCommand** (Class) - In: 63, Out: 0, Score: 126
4. **colors** (Variable) - In: 55, Out: 0, Score: 110
5. **SymbolRegistryManager** (Class) - In: 38, Out: 5, Score: 81
6. **TSDocEdge** (Class) - In: 0, Out: 77, Score: 77
7. **DatabaseManager** (Class) - In: 37, Out: 3, Score: 77
8. **SymbolGraphBuilder** (Class) - In: 36, Out: 3, Score: 75
9. **ConfigManager** (Class) - In: 34, Out: 3, Score: 71
10. **args** (Variable) - In: 0, Out: 58, Score: 58

**Interpretation**:
- **Symbol interface**: Most heavily used type (83 incoming) - core abstraction
- **CommandResult/BaseCommand**: High incoming (73, 63) - all commands depend on these
- **colors variable**: High incoming (55) - every command uses for output
- **TSDocEdge**: High outgoing (77) - main orchestrator class
- **args variable**: High outgoing (58) - CLI entry point

**I/O Dependencies**:
- Total: 7,446
- High confidence (≥0.8): 0 (all same-file matches would be here)
- Medium confidence (0.5-0.8): 7,446 (100%)
- Low confidence (<0.5): 0

**Pipeline Detection**:
- Total: 25,809 pipelines (length 3)
- Example: `collectSourceFiles → findBarriersForGroup → walkDirectory`
- Data flows correctly mapped through type system

**Mermaid Diagrams Generated**:
- ✅ Hotspot diagram: `.tsdoc/diagrams/hotspots.mmd` (61 lines)
- ✅ Color-coded by criticality (red: critical, orange: high, blue: medium, green: low)
- ✅ Shows incoming/outgoing counts and scores

## Key Relationships Explained

### 1. ASTSymbolExtractor → DatabaseManager

**Type**: Producer-Consumer
**Strength**: Strong (confidence: 1.0)

```
ASTSymbolExtractor (Producer)
  ↓ ExtractedSymbol[]
BuildCommand (Orchestrator)
  ↓ INSERT statements
DatabaseManager (Consumer)
  ↓ SQL rows
SQLite + JSONL
```

**Data Transformations**:
1. TypeScript AST → ExtractedSymbol objects (in-memory)
2. ExtractedSymbol → Database row format (JSON.stringify metadata)
3. Database rows → JSONL lines (Git-tracked)

**Critical Fields**:
- `declaredType`: Return type annotation
- `parameterTypes`: Array of `{name, type}` objects
- `isConstant`, `literalValue`, `valueType`: Constant detection

### 2. SymbolGraph → Analyzers

**Type**: Service Provider (read-only)
**Strength**: Strong (confidence: 1.0)

```
SymbolGraph (Service)
  ├─ symbols: Map<id, Symbol>
  └─ adjacencyList: Map<id, id[]>
       ↓ read-only
  ┌────┴────┬─────────────┬─────────────────┐
  ↓         ↓             ↓                 ↓
DependencyChain  IODependency  CodeHealth  Others
Analyzer         Analyzer      Checker     ...
```

**Contract**:
- **Immutability**: Analyzers MUST NOT modify graph
- **Thread-safety**: Multiple analyzers can read concurrently
- **Snapshot semantics**: Graph represents point-in-time state

### 3. Analyzers → Unified Relationships

**Type**: Analysis Result Storage
**Strength**: Medium (confidence varies)

```
Analyzers
  ├─ DependencyChainAnalyzer → circular relationships
  ├─ IODependencyAnalyzer → io-dependency, pipeline
  ├─ InheritanceAnalyzer → inheritance, interface-impl
  └─ (Future) CallGraphAnalyzer → calls, callback
       ↓
UnifiedRelationship[]
       ↓ insertUnifiedRelationship()
DatabaseManager
       ↓
unified_relationships table
```

**Relationship Distribution by Analyzer**:
- Code dependencies: 1,902 (ASTSymbolExtractor - static analysis)
- Inheritance: 55 (InheritanceAnalyzer)
- I/O dependencies: 6,705 (IODependencyAnalyzer - type inference)
- Pipelines: 25,809 (IODependencyAnalyzer - chain detection)

### 4. MermaidGenerator → File System

**Type**: Output Generator
**Strength**: Strong (confidence: 1.0)

```
Analysis Results
       ↓
MermaidGenerator
  ├─ generateDependencyTree()
  ├─ generateHotspotDiagram()
  ├─ generateCircularDiagram()
  ├─ generateClassHierarchy()
  └─ generateModuleDiagram()
       ↓ Mermaid DSL
.tsdoc/diagrams/*.mmd
       ↓ User opens in editor
Rendered Diagram (VS Code, GitHub, etc.)
```

**Generated Formats**:
- `tree-{symbol-id}.mmd`: Dependency tree (DFS, maxDepth=3)
- `hotspots.mmd`: Top 10 bottlenecks with color coding
- `circular-{n}.mmd`: Circular dependency visualization
- `hierarchy-{class-id}.mmd`: Inheritance tree
- `modules.mmd`: File-level dependency map

## Future Work

### Priority 1: Remaining Relationship Types (12 of 17)

Currently implemented: 5/17 types (29%)
- ✅ code-dependency (1,902 relationships)
- ✅ inheritance (55 relationships)
- ✅ io-dependency (6,705 relationships)
- ✅ pipeline (25,809 relationships)
- ✅ circular (0 relationships)

**To Implement**:
1. **calls** - Function invocation (call graph)
2. **callback** - Callback registration patterns
3. **composition** - Object composition relationships
4. **type-dependency** - Type references (type Foo = Bar | Baz)
5. **generic-constraint** - Generic type bounds (<T extends Foo>)
6. **layer-dependency** - Architectural layer violations
7. **module-boundary** - Module import relationships
8. **test-coverage** - Test → Implementation mapping
9. **doc-reference** - Documentation cross-references
10. **enhancement** - Enhanced doc annotations
11. **interface-impl** - Class implements interface
12. **event-flow** - Event emission/handling

### Priority 2: Type Complexity Analyzer

Calculate type complexity metrics:
- McCabe complexity for types
- Generic nesting depth
- Union/intersection member count
- Recursive type detection

### Priority 3: Automated Insight Generator

Analyze relationship patterns and generate insights:
- "DatabaseManager is a critical hotspot (score: 77)"
- "IODependencyAnalyzer has complex parameter types (complexity: 8)"
- "No circular dependencies detected - excellent architecture! ✨"

## Usage

### Viewing Architecture

**Read documentation**:
```bash
# System overview
cat managed/architecture/system-architecture-2025-11-07.md

# Database schema
cat managed/architecture/database-relationships-2025-11-07.md

# Analysis systems
cat managed/architecture/analysis-extraction-systems-2025-11-07.md
```

**Generate diagrams**:
```bash
# Hotspot analysis
tsdoc-edge visualize hotspots

# Dependency tree for specific symbol
tsdoc-edge visualize tree database-manager

# Class hierarchy
tsdoc-edge visualize hierarchy BaseCommand

# Module dependencies
tsdoc-edge visualize modules
```

**View generated diagrams**:
```bash
# Open in VS Code (with Mermaid plugin)
code .tsdoc/diagrams/hotspots.mmd

# Open in browser (with Mermaid Live Editor)
open https://mermaid.live/
# Paste contents of .mmd file
```

### Running Analysis

**Full analysis suite**:
```bash
# Build symbol database
tsdoc-edge build src

# Analyze dependency chains
tsdoc-edge analyze-chains

# Analyze I/O dependencies
tsdoc-edge analyze-io

# Code health check
tsdoc-edge health src
```

**Query database**:
```bash
# Open SQLite shell
sqlite3 .tsdoc/symbols.db

# Find critical hotspots
SELECT name, type, file_path
FROM symbols
WHERE id IN (
  SELECT json_extract(from_symbols, '$[0]')
  FROM unified_relationships
  GROUP BY json_extract(from_symbols, '$[0]')
  HAVING COUNT(*) > 20
);

# Find high-confidence I/O dependencies
SELECT
  json_extract(properties, '$.producerMethod') as producer,
  json_extract(properties, '$.consumerMethod') as consumer,
  json_extract(properties, '$.dataType') as data_type,
  confidence
FROM unified_relationships
WHERE type = 'io-dependency'
  AND confidence > 0.8
ORDER BY confidence DESC;
```

## Maintenance

### Updating Architecture Docs

**When to update**:
- New analyzer implemented → Update analysis-extraction-systems.md
- Schema change → Update database-relationships.md
- New subsystem added → Update system-architecture.md
- Performance metrics changed → Update all metrics sections

**How to update**:
1. Modify relevant `.md` file
2. Update Mermaid diagrams if structure changed
3. Regenerate actual diagrams: `tsdoc-edge visualize <type>`
4. Verify outputs match documentation
5. Update "Last Updated" date
6. Run `tsdoc-edge validate-docs managed/architecture/`

### Versioning Strategy

Architecture docs follow `YYYY-MM-DD` suffix:
- `system-architecture-2025-11-07.md` (current)
- `system-architecture-2025-11-15.md` (future major change)

**When to version**:
- Major architectural changes (new subsystem, schema redesign)
- Significant performance improvements
- Breaking changes to public API

**What NOT to version**:
- Minor metric updates (update in place)
- Typo fixes (update in place)
- Clarifications (update in place)

## References

**Code Symbols**:
- [^ASTSymbolExtractor]: `src/analyzer/ASTSymbolExtractor.ts:23`
- [^DatabaseManager]: `src/storage/DatabaseManager.ts:15`
- [^IODependencyAnalyzer]: `src/analyzer/IODependencyAnalyzer.ts:28`
- [^DependencyChainAnalyzer]: `src/analyzer/DependencyChainAnalyzer.ts:18`
- [^MermaidGenerator]: `src/visualization/MermaidGenerator.ts:18`
- [^BuildCommand]: `src/commands/BuildCommand.ts:12`
- [^SymbolGraphBuilder]: `src/graph/SymbolGraphBuilder.ts:15`

**Related Documents**:
- `../../README.md` - Project overview
- `../../CLAUDE.md` - Development guidelines
- `../reviews/system-review-2025-11-06.md` - Implementation priorities

---

*This is the central index for TSDoc Edge architectural documentation.*
*For questions or updates, see: [TSDoc Edge GitHub](https://github.com/yourusername/tsdoc-edge)*
