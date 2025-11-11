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

- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:58
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:245
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:31
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:85
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:260
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:209
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:288
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:289
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:290
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:252
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:330
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:22
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:45
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:46
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:47
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:36
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:118
- [[Unified Relationship Taxonomy]] → /home/user/tsdoc-edge/managed/concepts/unified-relationship-taxonomy.md:388
- [[Unified Relationship Taxonomy]] → /home/user/tsdoc-edge/managed/concepts/unified-relationship-taxonomy.md:480
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:310
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:311
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:64
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:252
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:297
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:298
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:26
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:51
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:59
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:127
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:272
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:362
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:363
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:364
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:365
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:366
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:120
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:296
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:320
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:374
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:375
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:376
- [[Callback Pattern]] → /home/user/tsdoc-edge/managed/relationships/CALLBACK.md:132
- [[Callback Pattern]] → /home/user/tsdoc-edge/managed/relationships/CALLBACK.md:139
- [[Callback Pattern]] → /home/user/tsdoc-edge/managed/relationships/CALLBACK.md:216
- [[Callback Pattern]] → /home/user/tsdoc-edge/managed/relationships/CALLBACK.md:217
- [[Composition Relationship]] → /home/user/tsdoc-edge/managed/relationships/COMPOSITION.md:113
- [[Composition Relationship]] → /home/user/tsdoc-edge/managed/relationships/COMPOSITION.md:189
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:47
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:48
- [[Relationship Standard Format]] → /home/user/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:171
- [[Relationship Standard Format]] → /home/user/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:212
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:47
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:48
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:89
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:90
- [[Event Flow]] → /home/user/tsdoc-edge/managed/relationships/event-flow.md:53
- [[Event Flow]] → /home/user/tsdoc-edge/managed/relationships/event-flow.md:70
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:53
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:96
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:97
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:98

