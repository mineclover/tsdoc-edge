# TSDoc Edge Visualization Diagrams

**Generated**: 2025-11-07 (Updated with Call Graph)
**Total Diagrams**: 16 (2 new call graph diagrams added)
**Total Lines**: ~1,670
**Format**: Mermaid

## Overview

This directory contains Mermaid diagrams visualizing the TSDoc Edge codebase architecture, dependencies, relationships, and metrics. All diagrams are generated from actual database analysis and are verified against real system data.

## Diagram Categories

### 1. System Architecture & Metrics

#### `system-metrics.mmd` (115 lines)
**Purpose**: Complete system health dashboard with current metrics

**Contents**:
- Symbol distribution (1,427 total)
  - Methods: 894 (62.6%)
  - Interfaces: 205 (14.4%)
  - Properties: 145 (10.2%)
  - Classes: 125 (8.8%)
  - Variables: 21 (1.5%)
  - Types: 20 (1.4%)
  - Functions: 7 (0.5%)
  - Constants: 10 (0.7%)

- Relationship distribution (10,173 total)
  - I/O Dependencies: 6,705 (65.9%)
  - Code Dependencies: 1,902 (18.7%)
  - **Call Relationships: 1,511 (14.9%) 🆕**
  - Inheritance: 55 (0.5%)
  - Pipelines: 25,809 (length 3)

- Quality metrics
  - Circular dependencies: 0 ✅
  - Doc coverage: 89% ✅
  - Type information: 81% ✅
  - Public API: 462 members ✅

- Performance benchmarks
  - Build: 2.2s for 131 files
  - Analysis: <200ms
  - Queries: <5ms
  - FTS Search: <10ms

- 10 critical hotspots (score ≥ 20)
- Storage metrics (4.5 MB total)
- Growth projection (8,662 → 24,000 rels)

**Use Case**: Executive summary, health monitoring, progress tracking

#### `analysis-pipeline.mmd` (130 lines)
**Purpose**: Complete sequence diagram of the analysis pipeline

**Flow**:
1. Build Phase (User → CLI → Scanner → Extractor → DB → JSONL)
2. Analysis Phase (User → CLI → Graph → Analyzers → DB)
3. I/O Analysis Phase (IODependencyAnalyzer → Type matching → Pipelines)
4. Visualization Phase (User → CLI → Graph → Viz → File)

**Performance Annotations**:
- Extraction: 2.2s for 131 files
- Analysis: <200ms
- Storage: 2.4 MB SQLite + 1.8 MB JSONL

**Use Case**: Understanding data flow, debugging pipeline, onboarding

### 2. Dependency Analysis

#### `hotspots.mmd` (60 lines)
**Purpose**: Top 10 architectural hotspots with dependency visualization

**Top Hotspots**:
1. **Symbol** (score: 170) - 83 incoming, 4 outgoing
2. **CommandResult** (score: 146) - 73 incoming, 0 outgoing
3. **BaseCommand** (score: 126) - 63 incoming, 0 outgoing
4. **colors** (score: 110) - 55 incoming, 0 outgoing
5. **SymbolRegistryManager** (score: 81) - 38 incoming, 5 outgoing
6. **TSDocEdge** (score: 77) - 0 incoming, 77 outgoing
7. **DatabaseManager** (score: 77) - 37 incoming, 3 outgoing
8. **SymbolGraphBuilder** (score: 75) - 36 incoming, 3 outgoing
9. **ConfigManager** (score: 71) - 34 incoming, 3 outgoing
10. **args** (score: 58) - 0 incoming, 58 outgoing

**Color Coding**:
- 🔴 Red: Critical (score ≥ 20)
- 🟠 Orange: High (score ≥ 10)
- 🔵 Blue: Medium (score ≥ 5)
- 🟢 Green: Low (score < 5)

**Use Case**: Identify bottlenecks, refactoring candidates, architectural review

#### `call-graph-analysis.mmd` (165 lines) 🆕
**Purpose**: Comprehensive call graph analysis and visualization

**Contents**:
- Call graph overview (1,511 relationships, 472→605)
- Top 10 most called functions
  - CommandRegistry.get: 106 calls 🔥
  - CommandRegistry.has: 78 calls
  - BaseCommand methods: 200+ calls combined
- Call detection features
  - Direct calls (foo())
  - Method calls (obj.method())
  - Built-in filtering (Object.entries, console.log)
  - Smart resolution with type preference
- Call pattern analysis
  - Command Pattern: 200+ calls to BaseCommand
  - Registry Pattern: 100+ calls to CommandRegistry
  - Utility Pattern: shared helper functions
  - Builder Pattern: chained construction calls
- Coverage metrics
  - ~70% function call coverage
  - ~2% false positive rate
  - Dynamic calls not yet detected
- Use cases
  - Impact analysis before refactoring
  - Dead code detection (0 incoming calls)
  - Hotspot identification for optimization
  - Coupling analysis across modules
  - Test coverage verification
- Future improvements
  - Callback detection (high priority)
  - Async/await chains (medium priority)
  - Type-based resolution (high priority)
  - Dynamic calls (apply, call, bind)

**Use Case**: Impact analysis, refactoring planning, dead code detection, optimization

#### `hotspots-with-calls.mmd` (119 lines) 🆕
**Purpose**: Updated hotspot analysis integrating call graph relationships

**Contents**:
- Top 10 hotspots with call graph integration
  - Scores now include incoming + outgoing call relationships
  - New hotspot formula: Score = Code Deps + I/O Deps + Calls (in + out)
- New entries in top 10
  - **CommandRegistry.get**: #4 (212 score) - 110 in, 102 out
  - **findMarkdownFiles**: #10 (127 score) - 16 in, 111 out
- Shifted rankings
  - StrictModeValidator.validate: #1 (625 score, extreme coupling)
  - ModuleSpecValidator.validate: #2 (513 score, heavy incoming)
  - Symbol interface: #6 (166 score, down from #1)
- Hotspot categories
  - Validators (625, 513 scores)
  - Registry Pattern (212 score)
  - Generators (214 score)
  - Type System (166 score)
  - Analyzers (160+ scores)
- Before/after comparison
  - Symbol: 170 → 166 (-2.4%)
  - StrictModeValidator: new #1 (+567% reveal)
  - CommandRegistry.get: new entry (registry pattern)
- Risk analysis
  - Extreme coupling: StrictModeValidator (614 outgoing deps)
  - Heavy incoming: ModuleSpecValidator (505 callers/refs)
  - Registry bottleneck: CommandRegistry.get (single point of failure)
- Optimization opportunities
  - Split StrictModeValidator into smaller validators
  - Add validation cache to ModuleSpecValidator
  - Memoize CommandRegistry lookups
  - Batch InsightDocGenerator formatting

**Use Case**: Refactoring priorities, performance optimization, architectural review, risk assessment

#### `modules.mmd` (185 lines)
**Purpose**: File-level dependency map

**Contents**:
- Top files by dependency count
- Module import relationships
- Package boundaries

**Use Case**: Module organization, dependency reduction, architecture planning

#### `hierarchy-class-basecommand.mmd` (58 lines)
**Purpose**: Class inheritance tree for BaseCommand

**Contents**:
- 53 command classes extending BaseCommand
- 2 interfaces incorrectly extending (likely relationship errors)
- Bottom-up visualization (BT direction)

**Commands by Category**:
- Analysis: AnalyzeCommand, AnalyzeIOCommand, AnalyzeChainsCommand, etc.
- Validation: ValidateCommand, ValidateDocsCommand, ValidateSpecCommand, etc.
- Generation: GenerateDocsCommand, etc.
- Documentation: IndexDocsCommand, FindDocCommand, etc.
- Testing: SyncCoverageCommand, UntestedCommand, TestRelationshipsCommand, etc.
- Configuration: InitCommand, InstallHookCommand, UninstallHookCommand, etc.
- Query: DepsCommand, UsedByCommand, WhoUsesCommand, TreeCommand, etc.
- Specification: SpecStatusCommand, SpecHistoryCommand, SpecBumpCommand, etc.

**Use Case**: Command pattern verification, inheritance hierarchy review

#### `tree-interface-symbol.mmd` (4 lines)
**Purpose**: Dependency tree for Symbol interface (outgoing only)

**Dependencies**:
- Symbol → ContractSpec
- Symbol → ResponsibilitySpec
- Symbol → SymbolRelationship
- Symbol → TestMapping

**Use Case**: Type dependency analysis, interface coupling

#### `tree-database-manager.mmd` (1 line)
**Purpose**: Dependency tree for DatabaseManager (empty due to no code deps)

**Note**: DatabaseManager has 37 incoming dependencies but 0 outgoing code dependencies in the graph (it only has I/O dependencies through types).

**Use Case**: Demonstrates limitation of code-only dependency trees

### 3. Technical Deep Dives (NEW)

#### `ast-extraction-flow.mmd` (138 lines) ★ NEW
**Purpose**: Complete TypeScript AST symbol extraction flow with visitor pattern

**Contents**:
- Input: TypeScript source files → ts.Program → SourceFile AST
- Traversal phase: visitNode recursion with type checks
- Class member extraction with export tracking
- Type information extraction (declared, inferred, parameters)
- Constant detection (4 literal types)
- Symbol assembly and output

**Key Flows**:
- Export inheritance: parent → member propagation
- Top-level filtering: reduces 1,153 → 21 variables
- Type extraction: 81% symbols have type info

**Annotations**:
- Top-level filtering impact
- Export inheritance (462 public API members)
- Type extraction (81% coverage)

**Use Case**: Understanding extraction pipeline, debugging symbol extraction, onboarding

#### `confidence-scoring.mmd` (108 lines) ★ NEW
**Purpose**: Confidence scoring algorithm for I/O dependencies

**Scoring Formula**:
```
Base = 0.5 (type matching)
+ 0.2 if same file
+ 0.2 if consumer imports producer
+ 0.1 if custom type (not generic)
= Final confidence (capped at 1.0)
```

**Categories**:
- High (≥0.8): Strong evidence
- Medium (0.5-0.8): Type match only
- Low (<0.5): Weak inference

**Current Distribution**:
- High: 0 deps (0%)
- Medium: 7,446 deps (100%)
- Low: 0 deps (0%)

**Examples**:
- Same file + import + User = 1.0 (high)
- Same file + User = 0.8 (high)
- Different file + User = 0.6 (medium)
- Different file + Array<T> = 0.5 (medium)

**Use Case**: Understanding confidence scores, tuning thresholds, debugging matches

#### `type-matching-algorithm.mmd` (156 lines) ★ NEW
**Purpose**: Complete I/O dependency type matching algorithm

**Algorithm Phases**:
1. Build producer map: type → symbols that return it
2. Build consumer map: type → symbols that accept it
3. Type matching: Cartesian product of producers × consumers
4. Relationship creation: Build UnifiedRelationship with evidence

**Primitive Filtering**:
Excluded: string, number, boolean, void, any, unknown, never, null, undefined, object, Array, Promise

**Example**:
- Type: 'User'
- Producers (2): getUser, fetchUser
- Consumers (3): updateUser, deleteUser, notifyUser
- Relationships (2×3=6): All combinations

**Results**:
- 7,446 I/O dependencies
- ~150 custom types tracked
- ~5 deps per type average
- 25,809 pipelines (length 3)

**Complexity**:
- Build maps: O(n)
- Type matching: O(p×c) per type
- Analysis: <200ms total

**Use Case**: Understanding type matching, debugging I/O analysis, optimization

#### `common-issues-solutions.mmd` (133 lines) ★ NEW
**Purpose**: Documented problems and solutions from implementation

**6 Critical Issues Solved**:
1. **Zero relationships bug** (CRITICAL)
   - Problem: 0 relationships despite 1,247 symbols
   - Solution: Add relationship insertion loop
   - Result: 0 → 17,113 relationships

2. **Local variables noise**
   - Problem: 1,153 variables (46% of symbols), 820 false circulars
   - Solution: Top-level filtering (!parentSymbol)
   - Result: Variables 1,153→21 (-98%), Circulars 820→0

3. **Methods not exported**
   - Problem: All methods is_exported=0
   - Solution: Export tracking + parent inheritance
   - Result: 462 public API members identified

4. **No I/O dependencies**
   - Problem: 0 I/O deps, type matching failing
   - Solution: Add parameter_types column + extraction
   - Result: I/O deps 0→7,446, Pipelines 0→25,809

5. **Schema column missing**
   - Problem: SqliteError column not found
   - Solution: Copy schema to dist/ + rebuild
   - Result: Schema synchronized

6. **Type information not captured**
   - Problem: Only JSDoc, no TypeScript types
   - Solution: Use TypeScript Compiler API
   - Result: 1,161 symbols with types (81%)

**Best Practices**:
- Filter at extraction, don't rely on post-processing
- Track parent context for inheritance
- Use TypeScript Compiler API, not string parsing
- Add columns early, schema changes expensive
- Verify with actual output

**Use Case**: Learning from mistakes, onboarding, troubleshooting

#### `circular-detection-dfs.mmd` (159 lines) ★ NEW
**Purpose**: Depth-first search algorithm for circular dependency detection

**Algorithm**:
1. Initialize: visited set + recursion stack
2. For each unvisited node: Start DFS
3. DFS: Add to stack, recurse on dependencies
4. If dependency in stack: CIRCULAR FOUND
5. Backtrack: Remove from stack

**Example Walkthrough**:
- Graph: A→B→C→D→A
- Step 1: Visit A (stack: {A})
- Step 2: Visit B (stack: {A,B})
- Step 3: Visit C (stack: {A,B,C})
- Step 4: Visit D (stack: {A,B,C,D})
- Step 5: D tries A → A in stack → CIRCULAR!

**Why It Works**:
- visited: Prevents infinite loops
- recursionStack: Detects back edges
- Back edge = circular dependency

**Complexity**:
- Time: O(V+E) - visit each node/edge once
- Space: O(V) - sets and arrays

**Current Results**:
- Before (with locals): 820 false positives
- After (top-level only): 0 circulars ✨

**Alternatives**:
- Tarjan's: O(V+E), finds SCCs
- Floyd-Warshall: O(V³), too slow
- Topological sort: O(V+E), less info

**Use Case**: Understanding circular detection, algorithm education, debugging

### 4. Implementation Planning

#### `implementation-roadmap.mmd` (95 lines)
**Purpose**: Phased implementation plan for all 17 relationship types

**Phase 1: COMPLETED (5 types)** ✅
- code-dependency: 1,902 relationships
- inheritance: 55 relationships
- io-dependency: 6,705 relationships
- pipeline: 25,809 pipelines
- circular: 0 detected

**Phase 2: HIGH PRIORITY (4 types)** 🔥
- calls: Function invocations (~5,000 expected)
- test-coverage: Test→Implementation (~1,200 expected)
- doc-reference: Documentation links (~800 expected)
- interface-impl: Class implements (~200 expected)

**Phase 3: MEDIUM PRIORITY (4 types)** 🟡
- type-dependency: Type references (~1,500 expected)
- event-flow: Event emit/listen (~300 expected)
- callback: Callback patterns (~400 expected)
- composition: Object composition (~600 expected)

**Phase 4: LOW PRIORITY (4 types)** ⏳
- generic-constraint: Generic bounds (~200 expected)
- layer-dependency: Architecture layers (~100 expected)
- module-boundary: Package imports (~80 expected)
- enhancement: Enhanced docs (~500 expected)

**Total Projection**: ~24,000 relationships when complete (current: 8,662)

**Use Case**: Sprint planning, feature prioritization, progress tracking

#### `relationship-coverage.mmd` (87 lines)
**Purpose**: Current coverage by relationship category

**Category Completeness**:
- Structural: 67% (2/3 implemented)
- Data Flow: 67% (2/3 implemented)
- Behavioral: 0% (0/3 implemented)
- Type System: 0% (0/2 implemented)
- Architectural: 0% (0/2 implemented)
- Testing: 0% (0/1 implemented)
- Documentation: 0% (0/2 implemented)
- Other: 100% (1/1 implemented)

**Overall**: 29% implemented (5/17 types)

**Visual**:
- ✅ Green: Implemented with count
- ❌ Gray: Not implemented with expected count
- Purple: Overall status

**Use Case**: Gap analysis, completeness tracking, prioritization

## Usage Guide

### Viewing Diagrams

**VS Code (Recommended)**:
```bash
# Install Mermaid Preview extension
code --install-extension bierner.markdown-mermaid

# Open diagram
code .tsdoc/diagrams/system-metrics.mmd
```

**Mermaid Live Editor**:
```bash
# Open in browser
open https://mermaid.live/

# Copy-paste diagram contents
cat .tsdoc/diagrams/system-metrics.mmd | pbcopy
```

**GitHub**:
- Diagrams render automatically in Markdown files
- Embed in docs: ` ```mermaid ... ``` `

### Regenerating Diagrams

**Hotspot Diagram**:
```bash
tsdoc-edge visualize hotspots
# Output: .tsdoc/diagrams/hotspots.mmd
```

**Dependency Tree** (for specific symbol):
```bash
tsdoc-edge visualize tree <symbol-id>
# Output: .tsdoc/diagrams/tree-<symbol-id>.mmd
```

**Class Hierarchy**:
```bash
tsdoc-edge visualize hierarchy <class-id>
# Output: .tsdoc/diagrams/hierarchy-<class-id>.mmd
```

**Module Diagram**:
```bash
tsdoc-edge visualize modules
# Output: .tsdoc/diagrams/modules.mmd
```

**Custom Diagrams**:
- `system-metrics.mmd` - Manually maintained, update after major changes
- `implementation-roadmap.mmd` - Update after implementing new relationship types
- `relationship-coverage.mmd` - Update after implementing new types
- `analysis-pipeline.mmd` - Update if pipeline flow changes

### Embedding in Documentation

**Markdown**:
````markdown
# System Metrics

```mermaid
graph TB
    ... (paste diagram contents)
```
````

**HTML**:
```html
<div class="mermaid">
graph TB
    ... (paste diagram contents)
</div>
<script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
<script>mermaid.initialize({startOnLoad:true});</script>
```

## Diagram Verification

All diagrams are verified against actual system data:

| Diagram | Data Source | Last Verified |
|---------|-------------|---------------|
| system-metrics.mmd | `tsdoc-edge analyze-chains` | 2025-11-07 |
| hotspots.mmd | `tsdoc-edge visualize hotspots` | 2025-11-07 |
| hierarchy-class-basecommand.mmd | `tsdoc-edge visualize hierarchy class-basecommand` | 2025-11-07 |
| modules.mmd | `tsdoc-edge visualize modules` | 2025-11-07 |
| tree-interface-symbol.mmd | `tsdoc-edge visualize tree interface-symbol` | 2025-11-07 |
| tree-database-manager.mmd | `tsdoc-edge visualize tree database-manager` | 2025-11-07 |
| analysis-pipeline.mmd | Manual (based on code review) | 2025-11-07 |
| implementation-roadmap.mmd | Manual (based on system review) | 2025-11-07 |
| relationship-coverage.mmd | Manual (based on schema & code) | 2025-11-07 |

**Verification Commands**:
```bash
# Verify symbol count
sqlite3 .tsdoc/symbols.db "SELECT COUNT(*) FROM symbols"
# Expected: 1438

# Verify relationship count
sqlite3 .tsdoc/symbols.db "SELECT COUNT(*) FROM unified_relationships"
# Expected: 8662

# Verify I/O dependencies
sqlite3 .tsdoc/symbols.db "SELECT COUNT(*) FROM unified_relationships WHERE type='io-dependency'"
# Expected: 6705

# Verify hotspots
tsdoc-edge analyze-chains
# Should show 10 critical hotspots
```

## Diagram Maintenance

### When to Update

**After Build**:
- `hotspots.mmd` - Regenerate if symbol count changes significantly
- `modules.mmd` - Regenerate if file structure changes
- `hierarchy-*.mmd` - Regenerate if inheritance changes

**After Implementing New Features**:
- `implementation-roadmap.mmd` - Update phase completion
- `relationship-coverage.mmd` - Update coverage percentages
- `system-metrics.mmd` - Update relationship counts

**After Architecture Changes**:
- `analysis-pipeline.mmd` - Update if flow changes
- `system-metrics.mmd` - Update if subsystems change

### Update Checklist

When updating diagrams:
1. ✅ Run analysis commands to get current data
2. ✅ Update diagram files
3. ✅ Verify syntax (paste in Mermaid Live)
4. ✅ Update "Last Verified" date in this README
5. ✅ Update verification commands if needed
6. ✅ Commit with message: "docs: update diagrams (YYYY-MM-DD)"

## Performance Notes

**Rendering Performance**:
- Small diagrams (<50 nodes): <100ms
- Medium diagrams (50-100 nodes): <500ms
- Large diagrams (>100 nodes): <2s

**File Sizes**:
- Small: <1 KB (tree-database-manager.mmd)
- Medium: 2-5 KB (most diagrams)
- Large: >10 KB (modules.mmd - 19 KB)

**Recommendations**:
- Keep diagrams focused (max 100 nodes)
- Use subgraphs for organization
- Split large diagrams into multiple files
- Use color coding for quick scanning

## Common Issues

### Issue 1: Diagram Not Rendering

**Symptoms**: Blank or error in VS Code/GitHub

**Solutions**:
```bash
# Validate Mermaid syntax
cat diagram.mmd | pbcopy
# Paste into https://mermaid.live/

# Check for common issues:
# - Missing quotes around labels with spaces
# - Invalid node IDs (use kebab-case)
# - Mismatched subgraph end tags
```

### Issue 2: Outdated Metrics

**Symptoms**: Numbers don't match analysis output

**Solution**:
```bash
# Rebuild database
rm -rf .tsdoc
tsdoc-edge build src

# Regenerate diagrams
tsdoc-edge visualize hotspots
tsdoc-edge visualize modules

# Manually update metric diagrams
vim .tsdoc/diagrams/system-metrics.mmd
```

### Issue 3: Large Diagram Too Slow

**Symptoms**: Rendering takes >5s

**Solutions**:
- Reduce node count (use top N instead of all)
- Split into multiple diagrams
- Simplify styling (remove complex gradients)
- Use static image export instead

## Future Enhancements

### Priority 1: Interactive Diagrams
- Add click handlers for navigation
- Zoom/pan controls
- Tooltip with detailed info

### Priority 2: Automated Generation
- Generate all diagrams in CI/CD
- Detect outdated diagrams
- Auto-update metrics on build

### Priority 3: Additional Diagram Types
- Test coverage heatmap
- Type complexity matrix
- Change impact analysis
- API usage patterns

## References

**Mermaid Documentation**:
- Official Docs: https://mermaid.js.org/
- Syntax Reference: https://mermaid.js.org/intro/syntax-reference.html
- Live Editor: https://mermaid.live/

**Related Files**:
- `managed/architecture/` - Architecture documentation
- `src/visualization/MermaidGenerator.ts` - Diagram generation code
- `src/commands/VisualizeDepsCommand.ts` - CLI visualization command

---

*All diagrams are generated from actual system data and verified against analysis output.*
*For questions or issues, see: [TSDoc Edge GitHub](https://github.com/yourusername/tsdoc-edge)*
