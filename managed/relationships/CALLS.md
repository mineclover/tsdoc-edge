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

- [[CLI Commands]] → /Users/junwoobang/workflow/tsdoc-edge/managed/CLI-COMMANDS.md:24
- [[Commands Index]] → /Users/junwoobang/workflow/tsdoc-edge/managed/COMMANDS.md:60
- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:33
- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:108
- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:314
- [[CallGraphAnalyzer]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:209
- [[Analyzers & Extractors]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/index.md:252
- [[AnalyzeCallsCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:22
- [[BuildCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/BuildCommand.md:36
- [[Unified Relationship Taxonomy]] → /Users/junwoobang/workflow/tsdoc-edge/managed/concepts/unified-relationship-taxonomy.md:388
- [[Build Pipeline Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/build-pipeline-guide.md:64
- [[Build Pipeline Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/build-pipeline-guide.md:252
- [[Guides & Tutorials]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:33
- [[Guides & Tutorials]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:58
- [[Guides & Tutorials]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:66
- [[Guides & Tutorials]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:201
- [[Guides & Tutorials]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:360
- [[Relationship Analysis Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/relationship-analysis-guide.md:120
- [[Relationship Analysis Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/relationship-analysis-guide.md:296
- [[Relationship Analysis Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/relationship-analysis-guide.md:320
- [[Callback Pattern]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/CALLBACK.md:132
- [[Callback Pattern]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/CALLBACK.md:139
- [[Composition Relationship]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/COMPOSITION.md:113
- [[Relationship Standard Format]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:223
- [[Event Flow]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/event-flow.md:53
- [[IO Dependency]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/io-dependency.md:53
- [[Temporal Order]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/temporal-order.md:183
- [[Temporal Order]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/temporal-order.md:216

