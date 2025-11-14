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
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:325
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:326
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:25
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:85
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:259
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:487
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:488
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:489
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:18
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:66
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:67
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:68
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:69
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:253
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:381
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:382
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:22
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:45
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:46
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:47
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:48
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:38
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:145
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:146
- [[Unified Relationship Taxonomy]] → /home/user/tsdoc-edge/managed/concepts/unified-relationship-taxonomy.md:389
- [[Unified Relationship Taxonomy]] → /home/user/tsdoc-edge/managed/concepts/unified-relationship-taxonomy.md:492
- [[Unified Relationship Taxonomy]] → /home/user/tsdoc-edge/managed/concepts/unified-relationship-taxonomy.md:493
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:354
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:355
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:87
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:253
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:308
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:309
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:26
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:52
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:58
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:126
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:273
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:446
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:447
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:448
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:449
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:450
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:451
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:452
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:453
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:454
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:455
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:76
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:294
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:321
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:392
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:393
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:394
- [[Callback Pattern]] → /home/user/tsdoc-edge/managed/relationships/CALLBACK.md:142
- [[Callback Pattern]] → /home/user/tsdoc-edge/managed/relationships/CALLBACK.md:229
- [[Callback Pattern]] → /home/user/tsdoc-edge/managed/relationships/CALLBACK.md:230
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:37
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:105
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:106
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:107
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:108
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:56
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:57
- [[Relationship Standard Format]] → /home/user/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:172
- [[Relationship Standard Format]] → /home/user/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:216
- [[Relationship Standard Format]] → /home/user/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:217
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:50
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:51
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:35
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:108
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:109
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:110
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:111
- [[Integration Verification]] → /home/user/tsdoc-edge/managed/relationships/integration-verification.md:159
- [[Layer Dependency]] → /home/user/tsdoc-edge/managed/relationships/layer-dependency.md:71
- [[Layer Dependency]] → /home/user/tsdoc-edge/managed/relationships/layer-dependency.md:88
- [[Temporal Order]] → /home/user/tsdoc-edge/managed/relationships/temporal-order.md:184
- [[Temporal Order]] → /home/user/tsdoc-edge/managed/relationships/temporal-order.md:218

