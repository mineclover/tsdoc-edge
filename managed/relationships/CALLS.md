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
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:305
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:306
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:31
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:85
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:260
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:464
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:465
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:466
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:209
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:298
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:299
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:300
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:301
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:252
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:375
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:376
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:22
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:47
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:48
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:49
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:50
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:36
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:123
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:124
- [[Unified Relationship Taxonomy]] → /home/user/tsdoc-edge/managed/concepts/unified-relationship-taxonomy.md:388
- [[Unified Relationship Taxonomy]] → /home/user/tsdoc-edge/managed/concepts/unified-relationship-taxonomy.md:482
- [[Unified Relationship Taxonomy]] → /home/user/tsdoc-edge/managed/concepts/unified-relationship-taxonomy.md:483
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:326
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:327
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:64
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:252
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:303
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:304
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:26
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:51
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:59
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:127
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:272
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:400
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:401
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:402
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:403
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:404
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:405
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:406
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:407
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:408
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:409
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:120
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:296
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:320
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:380
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:381
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:382
- [[Callback Pattern]] → /home/user/tsdoc-edge/managed/relationships/CALLBACK.md:132
- [[Callback Pattern]] → /home/user/tsdoc-edge/managed/relationships/CALLBACK.md:139
- [[Callback Pattern]] → /home/user/tsdoc-edge/managed/relationships/CALLBACK.md:217
- [[Callback Pattern]] → /home/user/tsdoc-edge/managed/relationships/CALLBACK.md:218
- [[Callback Pattern]] → /home/user/tsdoc-edge/managed/relationships/CALLBACK.md:219
- [[Callback Pattern]] → /home/user/tsdoc-edge/managed/relationships/CALLBACK.md:220
- [[Composition Relationship]] → /home/user/tsdoc-edge/managed/relationships/COMPOSITION.md:113
- [[Composition Relationship]] → /home/user/tsdoc-edge/managed/relationships/COMPOSITION.md:190
- [[Composition Relationship]] → /home/user/tsdoc-edge/managed/relationships/COMPOSITION.md:191
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:52
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:53
- [[Relationship Standard Format]] → /home/user/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:171
- [[Relationship Standard Format]] → /home/user/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:214
- [[Relationship Standard Format]] → /home/user/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:215
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:50
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:51
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:96
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:97
- [[Event Flow]] → /home/user/tsdoc-edge/managed/relationships/event-flow.md:53
- [[Event Flow]] → /home/user/tsdoc-edge/managed/relationships/event-flow.md:72
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:53
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:104
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:105
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:106
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:107
- [[Temporal Order]] → /home/user/tsdoc-edge/managed/relationships/temporal-order.md:183
- [[Temporal Order]] → /home/user/tsdoc-edge/managed/relationships/temporal-order.md:216

