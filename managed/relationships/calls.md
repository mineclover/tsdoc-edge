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

**Command**: AnalyzeCallsCommand (`src/commands/AnalyzeCallsCommand.ts`)
- Usage: `tsdoc-edge analyze-calls`
- Scans all symbols for call expressions
- Builds call graph for analysis

**Storage**: DatabaseManager (`src/storage/DatabaseManager.ts`)
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

- [[Commands Index]] → managed/COMMANDS.md:100
- [[TSDoc Edge Documentation]] → managed/README.md:59
- [[CallGraphAnalyzer]] → managed/analyzers/CallGraphAnalyzer.md:413
- [[Analyzers & Extractors]] → managed/analyzers/index.md:400
- [[AnalyzeCallsCommand]] → managed/commands/AnalyzeCallsCommand.md:30
- [[AnalyzerCommands]] → managed/commands/AnalyzerCommands.md:28
- [[BuildCommand]] → managed/commands/BuildCommand.md:46
- [[Phase Commands]] → managed/commands/PhaseCommands.md:72
- [[Unified Relationship Taxonomy]] → managed/concepts/unified-relationship-taxonomy.md:500
- [[Build Pipeline Guide]] → managed/guides/build-pipeline-guide.md:254
- [[Guides & Tutorials]] → managed/guides/index.md:47
- [[Relationship Analysis Guide]] → managed/guides/relationship-analysis-guide.md:170
- [[Callback Pattern]] → managed/relationships/callback.md:307
- [[Collaboration]] → managed/relationships/collaboration.md:307
- [[Composition Relationship]] → managed/relationships/composition.md:216
- [[Event Flow]] → managed/relationships/event-flow.md:111
- [[Feature Grouping]] → managed/relationships/feature-grouping.md:348
- [[Integration Verification]] → managed/relationships/integration-verification.md:370
- [[IO Dependency]] → managed/relationships/io-dependency.md:70
- [[Relationship Standard Format]] → managed/relationships/standard-format.md:498
- [[Temporal Order]] → managed/relationships/temporal-order.md:321

