---
title: Call Relationships
type: relationship
category: behavioral
status: implemented
canonical: true
relationships-count: 1511
---

# [[Call Relationships]]

> **Type**: `calls` | **Status**: ✅ 1,511 relationships

Track function call relationships (`foo()` calls `bar()`).

## Implementation Chain

**Analyzer**: [[CallGraphAnalyzer]] (`src/analyzer/CallGraphAnalyzer.ts`)
- Analyzes function call expressions in AST
- Detects: Direct calls, method calls, constructor calls
- Also known as: CallRelationshipAnalyzer, CallAnalyzer

**Command**: [[AnalyzeCallsCommand]] (`src/commands/AnalyzeCallsCommand.ts`)
- Usage: `tsdoc-edge analyze-calls`
- Scans all symbols for call expressions
- Builds call graph for analysis

**Storage**: [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)
- Table: `unified_relationships`
- Type: `calls`
- Metadata: Call context, location

**Analysis Features**:
- Call graph construction
- Dead code detection (uncalled functions)
- Call chain analysis (A → B → C)
- Hotspot identification (most-called functions)

## Usage Examples

```bash
# Analyze all call relationships
tsdoc-edge analyze-calls

# Find call chains
tsdoc-edge deps --type=calls BuildCommand

# Detect unused functions
tsdoc-edge orphans --type=function
```

## Related

- [[IO Dependency]]: Validates data flow through calls (complementary)
- [[Test Coverage]]: Tests validate call paths (quality metric)
- [[Pipeline]]: Multi-step call chains (3+ hops)
- [[Code Dependency]]: Import dependencies enable calls

---

## Backlinks

### Referenced By

- [[CLI Commands]] → /home/user/tsdoc-edge/managed/CLI-COMMANDS.md:22
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:58
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:317
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:318
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:31
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:85
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:260
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:464
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:465
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:466
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:209
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:311
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:312
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:313
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:314
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:315
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:252
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:382
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:383
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:22
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:56
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:57
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:58
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:59
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:60
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:36
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:154
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:155
- [[Unified Relationship Taxonomy]] → /home/user/tsdoc-edge/managed/concepts/unified-relationship-taxonomy.md:388
- [[Unified Relationship Taxonomy]] → /home/user/tsdoc-edge/managed/concepts/unified-relationship-taxonomy.md:486
- [[Unified Relationship Taxonomy]] → /home/user/tsdoc-edge/managed/concepts/unified-relationship-taxonomy.md:487
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:376
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:377
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:378
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:64
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:252
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:322
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:323
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:324
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:325
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:33
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:58
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:66
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:201
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:360
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:503
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:504
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:505
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:506
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:507
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:508
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:509
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:510
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:511
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:512
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:120
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:296
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:320
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:399
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:400
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:401
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:402
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:403
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:404
- [[Callback Pattern]] → /home/user/tsdoc-edge/managed/relationships/CALLBACK.md:132
- [[Callback Pattern]] → /home/user/tsdoc-edge/managed/relationships/CALLBACK.md:139
- [[Callback Pattern]] → /home/user/tsdoc-edge/managed/relationships/CALLBACK.md:219
- [[Callback Pattern]] → /home/user/tsdoc-edge/managed/relationships/CALLBACK.md:220
- [[Callback Pattern]] → /home/user/tsdoc-edge/managed/relationships/CALLBACK.md:221
- [[Callback Pattern]] → /home/user/tsdoc-edge/managed/relationships/CALLBACK.md:222
- [[Composition Relationship]] → /home/user/tsdoc-edge/managed/relationships/COMPOSITION.md:113
- [[Composition Relationship]] → /home/user/tsdoc-edge/managed/relationships/COMPOSITION.md:191
- [[Composition Relationship]] → /home/user/tsdoc-edge/managed/relationships/COMPOSITION.md:192
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:66
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:67
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:68
- [[Relationship Standard Format]] → /home/user/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:171
- [[Relationship Standard Format]] → /home/user/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:216
- [[Relationship Standard Format]] → /home/user/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:217
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:65
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:66
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:67
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:117
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:118
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:119
- [[Event Flow]] → /home/user/tsdoc-edge/managed/relationships/event-flow.md:53
- [[Event Flow]] → /home/user/tsdoc-edge/managed/relationships/event-flow.md:73
- [[Event Flow]] → /home/user/tsdoc-edge/managed/relationships/event-flow.md:74
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:53
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:119
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:120
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:121
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:122
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:123
- [[Temporal Order]] → /home/user/tsdoc-edge/managed/relationships/temporal-order.md:183
- [[Temporal Order]] → /home/user/tsdoc-edge/managed/relationships/temporal-order.md:216

