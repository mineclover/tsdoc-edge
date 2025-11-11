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

**Command**: [[AnalyzeIOCommand]] (`src/commands/AnalyzeIOCommand.ts`)
- Usage: `tsdoc-edge analyze-io`
- Scans all functions for I/O contracts
- Generates data flow graph

**Storage**: [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)
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

- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:70
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:18
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:37
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:253
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:22
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:35
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:38
- [[Unified Relationship Taxonomy]] → /home/user/tsdoc-edge/managed/concepts/unified-relationship-taxonomy.md:389
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:263
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:87
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:253
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:26
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:52
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:58
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:126
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:273
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:76
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:294
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:321
- [[Callback Pattern]] → /home/user/tsdoc-edge/managed/relationships/CALLBACK.md:142
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:37
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:63
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:29
- [[Relationship Standard Format]] → /home/user/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:172
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:30
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:35
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:64
- [[Layer Dependency]] → /home/user/tsdoc-edge/managed/relationships/layer-dependency.md:71

