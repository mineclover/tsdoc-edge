---
title: IO Dependency
type: relationship
category: data-flow
status: implemented
canonical: true
relationships-count: 6705
---

# [[IO Dependency]]

> **Type**: `io-dependency` | **Status**: ✅ 6,705 relationships

Infer data flow by matching return types with parameter types.

## Implementation Chain

**Analyzer**: [[IODependencyAnalyzer]] (`src/analyzer/IODependencyAnalyzer.ts`)
- Matches return types with parameter types
- Algorithm: Cartesian product of producers × consumers
- Confidence scoring: 0.5-1.0 based on type compatibility

**Command**: AnalyzeIOCommand (`src/commands/AnalyzeIOCommand.ts`)
- Usage: `tsdoc-edge analyze-io`
- Scans all functions for I/O contracts
- Generates data flow graph

**Storage**: DatabaseManager (`src/storage/DatabaseManager.ts`)
- Table: `unified_relationships`
- Type: `io-dependency`
- Metadata: `{ confidence: number, typeMatch: string }`

**Analysis Features**:
- Data flow visualization
- Pipeline detection (chained I/O)
- Contract validation (type compatibility)
- Producer-consumer matching

## Usage Examples

```bash
# Analyze all I/O dependencies
tsdoc-edge analyze-io

# Find data flow for a type
tsdoc-edge deps --type=io ExtractionResult

# Detect pipeline chains
tsdoc-edge analyze-pipeline
```

## Algorithm Details

**Step 1**: Extract all function signatures
- Return types (producers)
- Parameter types (consumers)

**Step 2**: Match types using TypeScript type system
- Exact match: confidence = 1.0
- Structural compatibility: confidence = 0.7-0.9
- Name similarity: confidence = 0.5-0.6

**Step 3**: Filter by confidence threshold (default: 0.7)

## Related

- [[Code Dependency]]: Code structure informs type extraction (prerequisite)
- [[Pipeline]]: I/O deps chain into pipelines (3+ step chains)
- [[Type Dependency]]: Type-level relationships (complementary)
- [[Call Relationships]]: Actual runtime calls (validation)

---

## Backlinks

### Referenced By

- [[Commands Index]] → managed/COMMANDS.md:66
- [[TSDoc Edge Documentation]] → managed/README.md:53
- [[IODependencyAnalyzer]] → managed/analyzers/IODependencyAnalyzer.md:26
- [[Analyzers & Extractors]] → managed/analyzers/index.md:401
- [[AnalyzeIOCommand]] → managed/commands/AnalyzeIOCommand.md:30
- [[AnalyzerCommands]] → managed/commands/AnalyzerCommands.md:50
- [[BuildCommand]] → managed/commands/BuildCommand.md:48
- [[Unified Relationship Taxonomy]] → managed/concepts/unified-relationship-taxonomy.md:501
- [[Build Pipeline Guide]] → managed/guides/build-pipeline-guide.md:279
- [[Guides & Tutorials]] → managed/guides/index.md:47
- [[Relationship Analysis Guide]] → managed/guides/relationship-analysis-guide.md:111
- [[Callback Pattern]] → managed/relationships/callback.md:317
- [[Call Relationships]] → managed/relationships/calls.md:54
- [[Code Dependency]] → managed/relationships/code-dependency.md:55
- [[Integration Verification]] → managed/relationships/integration-verification.md:373
- [[Relationship Standard Format]] → managed/relationships/standard-format.md:499
- [[Temporal Order]] → managed/relationships/temporal-order.md:322

