# Changelog

All notable changes to TSDoc Edge will be documented in this file.

## [Unreleased]

### Changed - Code Quality Improvements

#### ValidateSymbolRefsCommand
- **Implemented auto-fix for ambiguous references**: `--fix` flag now creates skeleton documents for undefined symbols
- **Added skeleton document generator**: Creates well-structured markdown templates with proper `[[Symbol]]` notation

#### DatabaseManager
- **Improved error handling**: Removed console.error/warn in favor of silent returns with meaningful boolean status
- **Enhanced type safety**: Replaced `as any` patterns with proper type definitions (`ExtendedSymbolFields`, `UnifiedRelationship` property types)
- **Cleaned up spurious JSDoc comments**: Removed auto-generated comments on loop variables and error handlers
- **Added graph data helper methods**: `getAllSymbolRows()`, `getAllDependencyRows()`, `getGraphData()` for type-safe database queries
- **Exported row interfaces**: `SymbolRow`, `DependencyRow`, `UnifiedRelationshipRow` now exported for use in commands

#### ModuleSpecGenerator & Formatter
- **Improved TODO placeholders**: Changed generic "TODO:" messages to actionable "@tag" suggestions
  - `"TODO: Describe..."` → `"Add @problem tag to describe..."`
  - Provides clearer guidance on what TSDoc tags to add

#### LSP Service
- **Added eslint-disable comments**: Explicit `@typescript-eslint/no-explicit-any` annotations for dynamically loaded database
- **Improved code documentation**: Clarified that `any` types are intentional due to dynamic `require()` loading

#### UsageTracker (Analytics)
- **Removed noisy console.warn calls**: Silent failure pattern now uses clean returns without logging
- **Improved error handling comments**: Each catch block now documents why silent failure is appropriate

#### RelationshipStatsCommand
- **Updated relationship type definitions**: Replaced deprecated `conceptual-relation` with new types
- **Expanded type coverage**: Now includes all 30 relationship types across 11 categories (was 19 types across 7 categories)

#### Analyze Commands Refactored (21 commands)
- **AnalyzeTemporalOrderCommand**: Uses `getGraphData()` instead of raw SQL queries
- **AnalyzeCompositionCommand**: Refactored with proper type imports
- **AnalyzeCallsCommand**: Refactored with proper type imports
- **AnalyzeSubstitutionCommand**: Refactored with proper type imports
- **AnalyzeCollaborationCommand**: Refactored with proper type imports
- **AnalyzeFallbackCommand**: Refactored with proper type imports
- **AnalyzeEventsCommand**: Refactored with proper type imports
- **AnalyzeStructuralCommand**: Refactored with proper type imports
- **AnalyzeConstraintsCommand**: Refactored with proper type imports
- **AnalyzeChainsCommand**: Refactored with proper type imports
- **AnalyzeAlternativesCommand**: Refactored with proper type imports
- **AnalyzeBehavioralCommand**: Refactored with proper type imports
- **AnalyzeCallbacksCommand**: Refactored with proper type imports
- **AnalyzeEnhancementCommand**: Refactored with proper type imports
- **AnalyzeIOCommand**: Refactored with proper type imports
- **AnalyzeLayerDependencyCommand**: Refactored with proper type imports
- **AnalyzeTypesCommand**: Refactored with proper type imports
- **AnalyzeTestsCommand**: Refactored with proper type imports
- **AnalyzeDocReferenceCommand**: Refactored with proper type imports
- **AnalyzeFinalCommand**: Refactored with proper type imports
- **AnalyzeAllCommand**: Refactored with proper type imports
- **Common improvements**:
  - Uses imported `SymbolRow` and `DependencyRow` types
  - Uses `SymbolType` and `SymbolRelationship['type']` for proper type casts
  - Replaced `console.error` with `this.printError()` method
  - Replaced `as any[]` with `ReturnType<typeof analyzer.analyze>`
  - Replaced special Unicode characters with ASCII equivalents for portability

#### Other Commands Refactored (12 commands)
- **VisualizeDepsCommand**: Uses `getGraphData()` instead of raw SQL queries
- **TestRelationshipsCommand**: Refactored with proper type imports, fixed field name casing
- **ParallelWorkCommand**: Refactored with proper type imports, fixed field name casing
- **CoreApiCommand**: Uses `getGraphData()`, removed local `SymbolRow` and `RelationshipRow` interfaces
- **WhoUsesCommand**: Uses exported `SymbolRow` from DatabaseManager instead of local interface
- **UndocumentedCommand**: Uses `getGraphData()`, removed local `SymbolRow` interface
- **UntestedCommand**: Uses exported `SymbolRow`, uses `SymbolType` for type casts
- **ValidateCommand**: Uses `getGraphData()`, removed local `SymbolRow` and `RelationshipRow` interfaces
- **WithoutContractCommand**: Uses exported `SymbolRow`, uses `SymbolType` for type casts
- **WithoutResponsibilityCommand**: Uses exported `SymbolRow`, uses `SymbolType` for type casts
- **RelationshipExportCommand**: Uses `getAllSymbolRows()` instead of raw SQL with `as any[]` cast
- **OntologyStatsCommand**: Uses `getAllSymbolRows()`, removed dead code referencing non-existent `kind` field
- **DesignContextCommand**: Uses `SymbolRow` type instead of `as any[]`, added proper `SymbolType` casting

#### Relationship Commands Refactored (8 commands)
- **RelationshipQueryCommand**: Uses `UnifiedRelationshipRow` type instead of `as any[]`
- **RelationshipImpactCommand**: Uses `UnifiedRelationshipRow` type instead of `as any[]`
- **RelationshipPathCommand**: Uses `UnifiedRelationshipRow` type instead of `as any[]`
- **RelationshipMetricsCommand**: Uses `UnifiedRelationshipRow` and proper symbol type
- **RelationshipClustersCommand**: Uses `UnifiedRelationshipRow` type instead of `as any[]`
- **RelationshipExportCommand**: Uses `UnifiedRelationshipRow` type instead of `as any[]`
- **RelationshipVisualizeCommand**: Uses `UnifiedRelationshipRow` type instead of `as any[]`
- **RelationshipValidateCommand**: Uses proper typed arrays instead of `as any[]` for all queries

#### Error Handling Improvements
- **AnalyzeTemporalOrderCommand**: Replaced `console.error` with `this.printError()` for consistent output
- **TypeChainCommand**: Replaced `console.error` and `process.exit(1)` with `this.printError()` and `return this.failure()` for proper command result handling
- **ExploreEntrypointCommand**: Added proper type annotation for file path query

#### Resource Management Fixes
- **CoverageReportCommand**: Added missing `db.close()` call to properly release database connection
- **DesignContextCommand**: Added try/finally block with `dbManager.close()` to ensure connection is released
- **DetectDeadCodeCommand**: Added missing `db.close()` call to properly release database connection

#### Exit Code Fixes
- **WithoutResponsibilityCommand**: Fixed incorrect `exitCode: 0` for missing database (now returns failure)
- **WithoutContractCommand**: Fixed incorrect `exitCode: 0` for missing database (now returns failure)
- **UntestedCommand**: Fixed incorrect `exitCode: 0` for missing database (now returns failure)
- Standardized error message format to `"Database not found. Run: tsdoc-edge build src"`

#### Analyzer Type Safety Improvements
- **FinalAnalyzers**: Replaced `as any[]` with proper typed array for pipeline detection query
- **TestCoverageUnifier**: Replaced `as any[]` with proper typed array for test mapping query

#### Other Type Safety Improvements
- **TaskManager**: Added `TaskRow` interface, replaced `as any[]` and `row: any` with proper types
- **LSP Service**: Replaced `as any[]` with proper typed arrays for relationship and symbol queries

## [0.12.1] - 2025-11-25

### Changed - Codebase Optimization 🧹

**Comprehensive cleanup removing 21,326 lines while improving orphan detection accuracy by 93.5%**

#### Code Cleanup
- **Removed 13 unused files** (3,008 lines)
  - 6 unused analyzers (ConceptualRelationAnalyzer, IntegrationVerificationAnalyzer, ModuleBoundaryAnalyzer, MutualExclusionAnalyzer, SSOTCompletenessCalculator, SymbolUsageAnalyzer)
  - 7 legacy scripts (check-types, fix-relationships, health-check, populate-test-mappings, validate-relationships, verify-gephi-format, verify-gephi-sdk-types)

#### Documentation Cleanup
- **Removed 24 unused documentation files** (12,198 lines)
  - Entire `managed/archive/` directory (21 files): historical sessions, UX concepts, improvement summaries
  - 3 dated architecture snapshots (2025-11-07)
  - **Document count**: 281 → 257 (8.5% reduction)
  - **Rebuilt index**: 248 primary definitions, 10,825 references

#### Report Consolidation
- **Removed 19 redundant/temporary files** (6,120 lines)
  - Consolidated 17 improvement reports into single comprehensive summary
  - Removed 2 temporary analysis files
  - **Created**: `CODEBASE_OPTIMIZATION_SUMMARY.md` - unified optimization documentation

#### OrphansCommand Improvements
- **Database-based detection**: Query `unified_relationships` table instead of empty registry `uses` field
- **Class member filtering**: Automatically exclude members of used classes from orphan list
- **Accuracy improvement**: 93.5% reduction in false positives (186 → 16 → 1 true orphan)
- **New options**:
  - `--accurate`: Database-based detection (~50ms, highly accurate)
  - `--fast`: Registry-based detection (~10ms, less accurate)
  - `--include-members`: Include class members in analysis
  - `--classes-only`: Show only orphaned classes

#### Technical Findings
- **TypeScript Type System Limitation**: grep-based searches cannot detect type-level references
  - Type annotations: `function foo(x: MyType)` ✗
  - Return types: `function bar(): Result` ✗
  - Type aliases: `type A = B | C` ✗
  - **Impact**: 99.5% of "orphans" were actually used in type system
  - **Documented**: See `ORPHAN_REMOVAL_FINDINGS.md` for detailed analysis

#### Code Quality Status
- ✅ TypeScript strict mode enabled
- ✅ Zero compilation errors/warnings
- ✅ Production code: 242 files, 73,528 lines
- ✅ Documentation coverage: 76.7% (2,415 symbols)
- ✅ All orphans removed (13 code + 24 docs)

### Fixed
- Broken documentation links in `managed/README.md` and `managed/features/core-features-catalog.md`
- FTS5 document index rebuilt after cleanup

## [0.12.0] - 2025-11-XX

### Added - Relationship Analysis System 🎯

**Complete architectural intelligence platform with 8 commands analyzing 20,150 symbol relationships**

Transform passive relationship data into actionable architectural insights through graph analysis, centrality metrics, and multi-format export capabilities.

#### New Commands (7 analysis + 1 help)

**1. relationship-query** - Symbol Connection Explorer
- Query all relationships for any symbol with filtering
- Group by category (structural, behavioral, semantic, etc.)
- Filter by type, direction (from/to/both)
- Statistics by relationship type
- Example: `tsdoc-edge relationship-query class-buildcommand --category structural`

**2. relationship-impact** - Change Impact Analyzer with Risk Assessment
- BFS traversal through dependency graph up to configurable depth
- Upstream (dependencies) and downstream (dependents) analysis
- Automatic risk assessment: LOW (<5), MEDIUM (5-19), HIGH (20+)
- Path tracking showing how changes propagate
- Category and confidence filtering
- **Real result**: BuildCommand affects 278 symbols downstream (HIGH RISK)
- Example: `tsdoc-edge relationship-impact class-buildcommand --depth 3`

**3. relationship-path** - Connection Path Finder
- Find all paths between any two symbols using BFS
- Configurable maximum path length (default: 5)
- Shortest-only mode for focused analysis
- Path strength calculation based on length
- Statistics: shortest, longest, average path lengths
- Category distribution across paths
- **Real result**: 2,386 paths from BuildCommand to DatabaseManager
- Example: `tsdoc-edge relationship-path class-a class-b --shortest-only`

**4. relationship-validate** - Data Integrity Guardian
- 4 comprehensive validation checks:
  - Orphaned relationships (references to non-existent symbols) - ERROR level
  - Duplicate relationships (same relationship multiple times) - WARNING level
  - Low confidence (below threshold) - INFO level
  - Bidirectional consistency (missing reverse relationships) - WARNING level
- Auto-fix mode repairs orphaned relationships automatically
- Verbose mode shows detailed issue reporting
- Configurable confidence threshold
- CI/CD ready with exit codes (0 = no errors, 1 = errors found)
- **Real result**: Auto-fixed 91 orphaned relationships, cleaned database to 0 errors
- Example: `tsdoc-edge relationship-validate --fix --verbose`

**5. relationship-export** - Multi-Format Exporter for External Tools
- **5 industry-standard formats**:
  - **JSON** - Structured data with metadata (14.2 MB for 20,150 relationships)
  - **GraphML** - For Gephi, yEd, Cytoscape visualization (XML format)
  - **DOT** - For Graphviz diagram generation (color-coded by category)
  - **CSV** - For Excel/Google Sheets/Pandas analysis
  - **Cypher** - For Neo4j graph database import with indexes
- Filter before export: category, type, confidence threshold
- File output or stdout
- **Integration examples**:
  ```bash
  # Gephi visualization
  tsdoc-edge relationship-export --format graphml --output graph.graphml

  # Neo4j database
  tsdoc-edge relationship-export --format cypher --output import.cypher

  # Architecture diagram
  tsdoc-edge relationship-export --format dot --category structural --output arch.dot
  dot -Tpng arch.dot -o architecture.png
  ```

**6. relationship-clusters** - Architectural Module Discovery
- Greedy modularity optimization for community detection
- Cohesion metrics: Internal edges / (Internal + External edges)
- Identify dominant relationship category per cluster
- Configurable minimum cluster size
- Detailed mode shows all symbols in clusters
- **Cohesion interpretation**:
  - >70%: Strong module boundary (well-defined)
  - 50-70%: Moderate cohesion (acceptable)
  - <50%: Weak boundary (refactoring recommended)
- **Real results**:
  - 13 clusters discovered in codebase
  - Main cluster: 1,533 symbols with 98.7% cohesion (excellent)
  - 5 clusters flagged for refactoring (<50% cohesion)
  - Core command module: 195 symbols, 92.5% cohesion
- Example: `tsdoc-edge relationship-clusters --category structural --detailed`

**7. relationship-metrics** - Graph Centrality & Importance Analysis
- **6 metrics calculated**:
  - **Degree**: Total connections (in + out) - finds hubs
  - **In-Degree**: Symbols depending on this - finds core components
  - **Out-Degree**: Dependencies of this symbol - finds orchestrators
  - **Betweenness**: Frequency on shortest paths - finds bottlenecks
  - **PageRank**: Importance propagation - finds influential symbols
  - **Importance**: Composite score (40% degree + 30% betweenness + 30% PageRank)
- **Architectural pattern detection**:
  - **Critical Hub**: High degree + betweenness → bottleneck requiring careful change management
  - **Core Component**: High in-degree + low out-degree → stability essential, many depend on this
  - **Orchestrator**: High out-degree + low in-degree → coordinates many components
  - **Bridge**: High betweenness → connects different subsystems, critical for information flow
- **Real findings**:
  - 5 critical hubs identified (e.g., SymbolGraphBuilder.getDependents: degree 125, betweenness 0.0212)
  - 85 core components requiring stability (e.g., BaseCommand methods: 60+ dependents each)
  - 254 hub symbols (2x average degree)
  - 183 bridge symbols connecting subsystems
- Example: `tsdoc-edge relationship-metrics --metric betweenness --top 10 --detailed`

**8. relationship-help** - Interactive Guidance System
- **5 help topics**:
  - **main**: Overview with common questions and answers
  - **quick-start**: 2-minute getting started guide
  - **workflows**: 4 common scenarios (before changes, arch review, refactoring, debugging)
  - **commands**: Complete command reference with examples
  - **metrics**: Graph metrics explained (degree, betweenness, PageRank) with architectural patterns
  - **formats**: Export format guide with tool recommendations
- Copy-paste ready examples for immediate use
- Progressive learning path from quick start to deep dive
- Usage: `tsdoc-edge relationship-help [topic]`

#### Documentation

**Complete System Guide** (`docs/relationship-system-guide.md`)
- 400+ lines of comprehensive documentation
- **Command Reference**: All 7 analysis commands with detailed usage
- **4 Workflow Guides**:
  - Before Making Changes (risk assessment and testing strategy)
  - Architecture Review (understanding system structure)
  - Refactoring Planning (safely restructuring code)
  - Understanding Dependencies (debugging unexpected coupling)
- **Integration Tutorials**:
  - Gephi: Network visualization workflow
  - Neo4j: Graph database queries
  - Graphviz: Documentation diagram generation
- **Metrics Deep Dive**: Understanding each metric with use cases
- **Export Format Guide**: When to use each format and with which tools
- **Troubleshooting**: Common issues and solutions
- **Performance Tips**: Optimization strategies
- **Relationship Type Reference**: All 19 types (9 implemented, 47% complete)

**Interactive Help System**
- Context-sensitive help for all commands
- Topic-based learning (5 topics)
- Workflow-driven examples
- Copy-paste ready commands

#### Technical Implementation

**Algorithms**:
- **BFS Traversal**: O(V + E) for path finding and impact analysis
- **Greedy Modularity**: Iterative optimization for community detection
- **PageRank**: Power iteration method (20 iterations, damping 0.85)
- **Betweenness Centrality**: Random sampling (200 sources) for performance
- **Composite Scoring**: Weighted combination of normalized metrics

**Performance Optimizations**:
- Early pruning via category filtering
- Depth limits on graph traversal (default: 3-5)
- Sampling for expensive metrics (betweenness)
- Format-specific serialization strategies
- Configurable result limits

**Data Quality**:
- Comprehensive validation (4 checks)
- Auto-repair capability
- Exit codes for CI/CD
- **Cleaned data**: 20,241 → 20,150 relationships (91 orphans removed)

**Code Quality**:
- ~4,500 lines of new code
- 9 new files (7 commands + 1 help + 1 guide)
- Consistent BaseCommand inheritance
- Type-safe implementations
- Error handling with proper exit codes

#### Current System State

**Coverage**:
- Total Symbols: 1,722
- Total Relationships: 20,150 (cleaned from 20,241)
- Categories Active: 6/7 (structural, data-flow, behavioral, semantic, verification, alternative)
- Implementation Progress: 47% (9/19 relationship types)

**Implemented Relationship Types** (9/19):
- ✅ structural: code-dependency (2,272 relationships)
- ✅ data-flow: io-dependency (8,598 relationships)
- ✅ behavioral: collaboration, composition, temporal-order (1,862 relationships)
- ✅ semantic: feature-grouping (6,578 relationships)
- ✅ verification: integration-verification (825 relationships)
- ✅ alternative: fallback (15 relationships)

**Planned Types** (10/19):
- ❌ structural: inheritance, implementation
- ❌ data-flow: pipeline, event-flow
- ❌ behavioral: calls, callback
- ❌ semantic: conceptual-relation
- ❌ verification: test-coverage
- ❌ alternative: substitution
- ❌ constraint: mutual-exclusion, co-requirement (category not yet active)

**Architectural Insights Discovered**:
- **5 critical hubs**: Require careful change management
  - Example: SymbolGraphBuilder.getDependents (degree 125, betweenness 0.0212)
- **85 core components**: Require stability guarantees
  - Example: BaseCommand.executeWithErrorHandling (63 dependents)
- **254 hub symbols**: 2x average degree (high connectivity)
- **183 bridge symbols**: Connect different subsystems
- **Main cluster**: 1,533 symbols with 98.7% cohesion (excellent modularity)
- **Refactoring candidates**: 5 clusters with <50% cohesion

#### Use Cases & Workflows

**1. Before Making Changes** (Risk Assessment)
```bash
# Step 1: Check if symbol is critical
tsdoc-edge relationship-metrics --top 20

# Step 2: Analyze impact
tsdoc-edge relationship-impact <symbol-id>

# Step 3: Understand connections
tsdoc-edge relationship-query <symbol-id>

# Decision:
# - HIGH RISK: Feature flag, extensive testing, staged rollout
# - MEDIUM RISK: Integration tests, thorough code review
# - LOW RISK: Standard testing
```

**2. Architecture Review** (Understanding Structure)
```bash
# Step 1: Discover modules
tsdoc-edge relationship-clusters

# Step 2: Identify bottlenecks
tsdoc-edge relationship-metrics --metric betweenness --top 15

# Step 3: Check structural relationships
tsdoc-edge relationship-clusters --category structural

# Step 4: Export for team discussion
tsdoc-edge relationship-export --format graphml --output review.graphml
```

**3. Refactoring Planning** (Safe Restructuring)
```bash
# Step 1: Find what moves together
tsdoc-edge relationship-clusters --min-size 5

# Step 2: Check connections
tsdoc-edge relationship-query <symbol-id>

# Step 3: Assess moving impact
tsdoc-edge relationship-impact <symbol-id>

# Step 4: Verify connection paths
tsdoc-edge relationship-path <old-location> <new-location>
```

**4. Debugging Dependencies** (Understanding Coupling)
```bash
# Find how symbols are connected
tsdoc-edge relationship-path <symbol-a> <symbol-b>

# Show shortest path only
tsdoc-edge relationship-path <symbol-a> <symbol-b> --shortest-only

# Understand why coupling exists
tsdoc-edge relationship-query <symbol-a> --category structural
```

#### Integration Capabilities

**Visualization Tools**:
- **Gephi**: GraphML export → ForceAtlas 2 layout → modularity analysis
- **yEd**: GraphML export → automatic layout → hierarchical diagrams
- **Cytoscape**: GraphML export → biological-style networks

**Graph Databases**:
- **Neo4j**: Cypher import → complex pattern matching → path queries
  ```cypher
  MATCH (s:Symbol)-[r:RELATES]->(t:Symbol) RETURN s,r,t LIMIT 100
  MATCH (s:Symbol)-[*]->(s) RETURN s  // Find cycles
  ```

**Diagram Generation**:
- **Graphviz**: DOT export → PNG/SVG generation → documentation
- Color-coded by category
- Bidirectional arrow styling

**Data Analysis**:
- **Excel/Sheets**: CSV export → pivot tables → trend analysis
- **Python/Pandas**: JSON export → data science workflows
- **Custom Tools**: JSON export → programmatic analysis

#### Breaking Changes

None. All new functionality, fully backward compatible.

#### Migration Guide

Not applicable - new feature addition.

#### Future Enhancements

**Planned Features**:
- Additional relationship types (10 remaining, targeting 100% coverage)
- Real-time impact analysis during editing (LSP integration)
- Architectural drift detection (compare snapshots over time)
- AI-powered refactoring suggestions based on graph metrics
- Team-specific workflow templates
- Performance improvements for very large codebases (10,000+ symbols)

**Current Limitations**:
- Betweenness calculation samples 200 paths (trade-off for performance)
- Path finding limited to depth 5 by default (configurable)
- Clustering algorithm may take time on very large graphs
- Export formats don't preserve all metadata (format-specific)

---

## [0.12.0] - 2025-01-06

### Added - Type Chain Analysis System 🔥

**New Features:**
- **TypeChainTracer**: Complete type dependency chain analysis and visualization
  - `findChain()`: Find paths between two types with multiple path support
  - `buildDependencyTree()`: Build complete dependency trees from root types
  - `findRootTypes()`: Identify entry point types (no incoming dependencies)
  - `findLeafTypes()`: Identify leaf types (no outgoing dependencies)
  - `detectCircularDependencies()`: Detect and report circular type dependencies
  - Filter options: maxDepth, includeExternal, dependencyTypes, dataFlow, includePrimitives

**New CLI Commands:**
1. `type-chain <source> [target] [options]`
   - Visualize type dependency chains between types
   - Show complete dependency trees with `--tree` flag
   - Filter by depth, external types, primitives
   - Display relationship types (composition, extends, parameter, return)

2. `find-roots [options]`
   - Find root types (architectural entry points)
   - Display dependency counts for each root
   - Identify leaf types (terminal types)

3. `detect-cycles [options]`
   - Detect all circular type dependencies
   - Provide refactoring recommendations
   - Help identify architectural issues

**Best Practices:**
- Promotes explicit type reuse over implicit field duplication
- Encourages composition over duplication
- Provides architectural insights through type relationships

**Type Definitions:**
- Added `src/types/domain/type-chain.ts` with complete type chain types:
  - `TypeChain`, `TypeChainStep`, `TypeDependencyNode`
  - `TypeChainAnalysisResult`, `TypeChainOptions`

**Test Coverage:**
- 85 comprehensive tests (100% passing)
- Tests for all public methods
- Tests for all filter options
- Edge cases: cycles, deep chains, large graphs

**Documentation:**
- Updated README with Type Chain Tracer section
- Usage examples for all three commands
- Best practices for type architecture

### Improved

**Test Coverage Enhancement:**
- Total tests: 1,926 (from 1,453)
- Test suites: 85 (from 74)
- Coverage: 60% file coverage (from 31%)
- Health score: B (72/100, from C 62/100)

**New Test Suites:**
- `TypeChainTracer.test.ts`: 85 tests
- `CodeHealthChecker.test.ts`: 48 tests
- `TestCoverageAnalyzer.test.ts`: 46 tests
- `CoverageSyncAdapter.test.ts`: 40 tests
- `CoverageParser.test.ts`: 35 tests
- `DomainStructureAnalyzer.test.ts`: 27 tests
- `StatsHistoryManager.test.ts`: 35 tests
- `TrackableStatsCollector.test.ts`: 35 tests
- `Phase4Commands.test.ts`: 45 tests
- `Phase5Commands.test.ts`: 47 tests
- `Phase6Commands.test.ts`: 60 tests

**Bug Fixes:**
- Fixed `TestCoverageAnalyzer` path matching for `src/module/File.ts` → `src/__tests__/module/File.test.ts` pattern
- Fixed cycle detection algorithm in TypeChainTracer (string comparison bug)
- Fixed BaseCommand abstract method implementations in all command classes
- Fixed Jest configuration to exclude `src/types/` from test detection

### Performance

- Type chain analysis: O(V + E) graph traversal
- Cycle detection: Optimized DFS with memoization
- Handles 100+ type graphs efficiently

### API Changes

**New Exports:**
```typescript
export { TypeChainTracer } from './analyzer/TypeChainTracer';
export * from './types/domain/type-chain';
```

**New Commands:**
- `type-chain`: TypeChainCommand
- `find-roots`: FindRootTypesCommand
- `detect-cycles`: DetectCircularTypesCommand

---

## [0.11.1] - 2025-01-05

### Added - Separated Design/Implementation Scoring 🔥

**Specification Validation Enhancement:**
- Split spec completeness into two independent scores:
  - **Design Score** (0-100): Structure, scenarios, concept references
    - Can achieve 100% without any code
    - Supports design-first workflow
  - **Implementation Score** (0-100): Code references, examples
    - Measures code connectivity
    - Validates implementation completeness

**Score Calculation:**
```typescript
designScore =
  structure × 0.5 +           // 문서 구조 (50%)
  scenarios × 0.3 +           // 사용 시나리오 (30%)
  conceptReferences × 0.2     // [[Symbol]] 참조 (20%)

implementationScore =
  codeReferences × 0.7 +      // [^sym-XXX] 참조 (70%)
  examples × 0.3              // 코드 예시 (30%)
```

**Updated CLI Output:**
- `validate-spec` now shows both scores separately
- Color-coded score display (green/yellow/red)
- Clear breakdown of design vs implementation metrics

---

## [0.11.0] - 2025-01-04

### Added - Module Specification System

**7-Part Module Specification Framework:**
1. Purpose: Problem and existence reason
2. Input: Parameters, constraints, preconditions
3. Output: Return values, success/failure cases
4. Context: Dependencies, environment, requirements
5. Logic: Algorithm, internal operations
6. Effect: Side effects, external I/O
7. Scope: Public interface, exposed state

**New Commands:**
- `generate-docs`: Generate 7-part specifications for modules
- `validate-spec`: Validate specification completeness (0-100 score)
- `check-duplicates`: Detect duplicate content across specs
- `spec-status`: Manage specification lifecycle (draft/review/approved/active)
- `spec-history`: Track specification version history
- `spec-diff`: Compare specification versions
- `spec-bump`: Bump specification versions
- `find-unused-docs`: Detect unused/stale documents

---

## [0.10.0] - 2025-01-03

### Added - Enhanced Documentation System

**6-Category Documentation System:**
1. Problem Solving: What problem does this solve?
2. Functionality: What does this do?
3. Error Experiences: Known errors and solutions
4. Decisions: Architectural Decision Records (ADRs)
5. Dependencies: Why dependencies exist
6. Future Plans: Planned improvements (TODO tracking)

**New Commands:**
- `parse`: Extract enhanced docs from TSDoc comments
- `sync-coverage`: Sync Istanbul coverage to symbol metadata

**New Tags:**
- `@problem`, `@solves`, `@context`, `@functionality`
- `@errorExp`, `@decision`, `@rationale`, `@consequences`
- `@dependency`, `@plan`

---

## [0.9.0] - 2025-01-02

### Added - Command Modularization

**Complete CLI Refactoring:**
- Converted 45 commands to modular Command Pattern
- Each command in separate file with BaseCommand inheritance
- CommandRegistry for centralized command management
- Consistent error handling and output formatting

---

## [0.8.0] - 2025-01-01

### Added - Comprehensive CLI Tools

**45 CLI Commands:**
- Build, analyze, validate, health check
- Symbol exploration (deps, used-by, tree)
- Issue detection (orphans, undocumented, untested)
- Document management (index-docs, validate-docs, update-backlinks)
- Git integration (install-hook, pre-commit)

---

## [0.5.0] - 2024-12-30

### Added - Document Symbol System

**Wiki-Style Symbol References:**
- `[[SymbolName]]` for concept references
- `[^sym-XXX]` for code symbol footnotes
- Automatic backlink generation
- SSOT validation

---

## [0.4.0] - 2024-12-29

### Added - Configuration System

- `.tsdoc.config.json` support
- `init` command for project setup
- Customizable paths and validation rules

---

## [0.3.0] - 2024-12-28

### Added - Database Storage

- SQLite for fast symbol queries
- JSONL for Git-friendly versioning
- Hybrid storage strategy

---

## [0.2.0] - 2024-12-27

### Added - Enhanced Tags

- Custom TSDoc tags
- Contract specifications
- Responsibility tracking
- Test mapping

---

## [0.1.0] - 2024-12-26

### Added - Initial Release

- TSDoc parsing
- Convention validation
- Basic CLI commands
- Symbol registry
