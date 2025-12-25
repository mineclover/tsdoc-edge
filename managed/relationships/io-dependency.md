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

- Commands Index → /Users/junwoobang/workflow/tsdoc-edge/managed/COMMANDS.md:72
- TSDoc Edge Documentation → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:27
- TSDoc Edge Documentation → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:108
- TSDoc Edge Documentation → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:313
- [[IODependencyAnalyzer]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:18
- Analyzers & Extractors → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/index.md:253
- AnalyzeIOCommand → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:22
- BuildCommand → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/BuildCommand.md:38
- [[Unified Relationship Taxonomy]] → /Users/junwoobang/workflow/tsdoc-edge/managed/concepts/unified-relationship-taxonomy.md:389
- Build Pipeline Guide → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/build-pipeline-guide.md:87
- Build Pipeline Guide → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/build-pipeline-guide.md:253
- Guides & Tutorials → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:33
- Guides & Tutorials → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:59
- Guides & Tutorials → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:65
- Guides & Tutorials → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:200
- Guides & Tutorials → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:361
- [[Relationship Analysis Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/relationship-analysis-guide.md:76
- [[Relationship Analysis Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/relationship-analysis-guide.md:294
- [[Relationship Analysis Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/relationship-analysis-guide.md:321
- [[Callback Pattern]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/CALLBACK.md:142
- [[Call Relationships]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/CALLS.md:37
- [[Relationship Standard Format]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:224
- [[Code Dependency]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/code-dependency.md:35
- [[Integration Verification]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/integration-verification.md:159
- [[Temporal Order]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/temporal-order.md:184
- [[Temporal Order]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/temporal-order.md:218

