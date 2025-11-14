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
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:338
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:339
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:25
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:85
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:259
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:487
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:488
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:489
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:18
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:81
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:82
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:83
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:84
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:85
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:253
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:388
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:389
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:22
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:53
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:54
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:55
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:56
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:57
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:38
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:183
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:184
- [[Unified Relationship Taxonomy]] → /home/user/tsdoc-edge/managed/concepts/unified-relationship-taxonomy.md:389
- [[Unified Relationship Taxonomy]] → /home/user/tsdoc-edge/managed/concepts/unified-relationship-taxonomy.md:498
- [[Unified Relationship Taxonomy]] → /home/user/tsdoc-edge/managed/concepts/unified-relationship-taxonomy.md:499
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:421
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:422
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:423
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:87
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:253
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:332
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:333
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:334
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:335
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:33
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:59
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:65
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:200
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:361
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:549
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:550
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:551
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:552
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:553
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:554
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:555
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:556
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:557
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:558
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:76
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:294
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:321
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:423
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:424
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:425
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:426
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:427
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:428
- [[Callback Pattern]] → /home/user/tsdoc-edge/managed/relationships/CALLBACK.md:142
- [[Callback Pattern]] → /home/user/tsdoc-edge/managed/relationships/CALLBACK.md:233
- [[Callback Pattern]] → /home/user/tsdoc-edge/managed/relationships/CALLBACK.md:234
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:37
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:124
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:125
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:126
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:127
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:128
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:71
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:72
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:73
- [[Relationship Standard Format]] → /home/user/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:172
- [[Relationship Standard Format]] → /home/user/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:218
- [[Relationship Standard Format]] → /home/user/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:219
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:65
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:66
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:67
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:35
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:139
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:140
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:141
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:142
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:143
- [[Integration Verification]] → /home/user/tsdoc-edge/managed/relationships/integration-verification.md:159
- [[Layer Dependency]] → /home/user/tsdoc-edge/managed/relationships/layer-dependency.md:71
- [[Layer Dependency]] → /home/user/tsdoc-edge/managed/relationships/layer-dependency.md:89
- [[Layer Dependency]] → /home/user/tsdoc-edge/managed/relationships/layer-dependency.md:90
- [[Temporal Order]] → /home/user/tsdoc-edge/managed/relationships/temporal-order.md:184
- [[Temporal Order]] → /home/user/tsdoc-edge/managed/relationships/temporal-order.md:218

