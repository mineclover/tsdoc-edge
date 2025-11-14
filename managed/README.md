---
title: TSDoc Edge Documentation
type: index
category: meta
status: active
canonical: true
entrypoint: true
---

# [[TSDoc Edge Documentation]]

> **SSOT Platform**: Track every symbol, relationship, and dependency in your TypeScript codebase

## Quick Start

**Complete Guide**: [[Quick Start Guide]] (`quick-start.md`) - Get started in 5 minutes

```bash
# 1. Initialize project
tsdoc-edge init

# 2. Extract all symbols and relationships
tsdoc-edge build src

# 3. Get context before modifying a file
tsdoc-edge work-context <file-path>

# 4. Explore dependency graph from documentation
tsdoc-edge explore-entrypoint managed/relationships/index.md --detect-orphans
```

**Next Steps**: [[Guides & Tutorials]] (`guides/index.md`) - Beginner (1h) → Intermediate (2h) → Advanced (4h)

## Core Documentation

### [[Relationship Types]] - Master Index
**Path**: `managed/relationships/index.md`

The single source of truth for all 17 relationship types tracked by TSDoc Edge.

**Current Status**: 10/17 implemented (59%)
- [[Code Dependency]] (`managed/relationships/CODE-DEPENDENCY.md`) - 1,968 relationships
  - Extractor: [[ASTSymbolExtractor]] (`src/analyzer/ASTSymbolExtractor.ts`)
  - Commands: [[BuildCommand]] (`src/commands/BuildCommand.ts`)
- [[IO Dependency]] (`managed/relationships/IO-DEPENDENCY.md`) - 6,705 relationships
  - Analyzer: [[IODependencyAnalyzer]] (`src/analyzer/IODependencyAnalyzer.ts`)
  - Command: [[AnalyzeIOCommand]] (`src/commands/AnalyzeIOCommand.ts`)
- [[Pipeline]] (`managed/relationships/PIPELINE.md`) - 25,809 chains
  - Analyzer: [[IODependencyAnalyzer]] (`src/analyzer/IODependencyAnalyzer.ts`)
  - Command: [[AnalyzeChainsCommand]] (`src/commands/AnalyzeChainsCommand.ts`)
- [[Call Relationships]] (`managed/relationships/CALLS.md`) - 1,511 relationships
  - Analyzer: [[CallGraphAnalyzer]] (`src/analyzer/CallGraphAnalyzer.ts`)
  - Command: [[AnalyzeCallsCommand]] (`src/commands/AnalyzeCallsCommand.ts`)
- [[Inheritance]] (`managed/relationships/INHERITANCE.md`)
  - Extractor: [[ASTSymbolExtractor]] (`src/analyzer/ASTSymbolExtractor.ts`)
  - Storage: [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)
- [[Test Coverage]] (`managed/relationships/TEST-COVERAGE.md`)
  - Analyzer: [[TestCoverageAnalyzer]] (`src/analyzer/TestCoverageAnalyzer.ts`)
  - Command: [[TestRelationshipsCommand]] (`src/commands/TestRelationshipsCommand.ts`)
- And 4 more: [[Type Dependency]], [[Generic Constraint]], [[Interface Implementation]], [[Circular Dependency]]

### [[Commands Index]] - All 64 Commands
**Path**: `managed/COMMANDS.md`

Complete reference organized by category:
- **Core Workflow** (8):
  - [[BuildCommand]] (`src/commands/BuildCommand.ts`) - Extract all symbols
  - [[WorkContextCommand]] (`src/commands/WorkContextCommand.ts`) - Get file context
  - [[ExploreEntrypointCommand]] (`src/commands/ExploreEntrypointCommand.ts`) - Explore from docs
  - [[ParseCommand]] (`src/commands/ParseCommand.ts`) - Parse source files
- **Relationship Analyzers** (4):
  - [[AnalyzeCallsCommand]] (`src/commands/AnalyzeCallsCommand.ts`) - Call graph analysis
  - [[AnalyzeIOCommand]] (`src/commands/AnalyzeIOCommand.ts`) - I/O dependency analysis
  - [[AnalyzeChainsCommand]] (`src/commands/AnalyzeChainsCommand.ts`) - Dependency chains
- **Query & Analysis** (11):
  - [[DepsCommand]] (`src/commands/DepsCommand.ts`) - Show dependencies
  - [[WhoUsesCommand]] (`src/commands/WhoUsesCommand.ts`) - Show reverse deps
  - [[OrphansCommand]] (`src/commands/OrphansCommand.ts`) - Find orphaned code
  - [[HealthCommand]] (`src/commands/HealthCommand.ts`) - Code health metrics
  - [[StatsCommand]] (`src/commands/StatsCommand.ts`) - Project statistics
- **Documentation Tools** (12):
  - [[IndexDocsCommand]] (`src/commands/IndexDocsCommand.ts`) - Index documentation
  - [[ValidateDocsCommand]] (`src/commands/ValidateDocsCommand.ts`) - Validate docs
  - [[ParseMermaidCommand]] (`src/commands/ParseMermaidCommand.ts`) - Generate from .mmd
  - [[PromoteSymbolCommand]] (`src/commands/PromoteSymbolCommand.ts`) - H2 → H1 promotion
  - [[ValidateSymbolRefsCommand]] (`src/commands/ValidateSymbolRefsCommand.ts`) - Validate [[Symbol]] refs
- **Validation & Detection** (8): See [[ValidationFeatures]] (`managed/features/validation-features.md`)
- **Analysis Tools** (12): See [[AnalysisFeatures]] (`managed/features/analysis-features.md`)

See also: [[AnalysisFeatures]] (`managed/features/analysis-features.md`), [[ValidationFeatures]] (`managed/features/validation-features.md`)

### Guides
**Path**: `managed/guides/`
**Index**: [[Guides & Tutorials]] (`guides/index.md`) - Complete learning path from beginner to advanced

Essential guides for mastering TSDoc Edge:

- [[Build Pipeline Guide]] (`guides/build-pipeline-guide.md`): Complete build workflow (15 min)
  - Process: Source → [[ASTSymbolExtractor]] → [[DatabaseManager]] → Queryable graph
  - Covers: [[CallGraphAnalyzer]], [[IODependencyAnalyzer]], database storage
  - Output: 1,511 symbols, 36,050+ relationships
  - Includes: Performance tips, troubleshooting, best practices

- [[Relationship Analysis Guide]] (`guides/relationship-analysis-guide.md`): Master all 17 relationship types (20 min)
  - Categories: [[Code Dependency]], [[Call Relationships]], [[IO Dependency]], [[Pipeline]], [[Test Coverage]]
  - Workflows: Impact analysis, Refactoring safety, Architecture validation
  - Includes: Query patterns, database queries, multi-dimensional analysis
  - Statistics: 36,050 total relationships across 6 dimensions

**Learning Path**: Beginner (1h) → Intermediate (2h) → Advanced (4h) - See [[Guides & Tutorials]]

### Workflows
**Path**: `managed/workflows/`

- [[Work Context Workflow]] (`work-context-workflow.md`): Primary workflow before modifying files
  - Command: [[WorkContextCommand]] (`src/commands/WorkContextCommand.ts`)
  - Usage: `tsdoc-edge work-context <file-path>`
- [[Mermaid Entrypoint Workflow]] (`mermaid-entrypoint-workflow.md`): Complete workflow for diagram-based documentation
  - Commands: [[ParseMermaidCommand]], [[PromoteSymbolCommand]], [[ExploreEntrypointCommand]]
  - Phases: Design → Generate → Fill → Link → Verify → Explore → Optimize
- **Example**: Mermaid Workflow (`EXAMPLE-MERMAID-WORKFLOW.md`)
  - Real-world example: dependency-meta-structure.mmd
  - Coverage improvement: 14.3% → 95.1%

## Core Components

**Path**: `managed/core-components/`

Foundation components that power the entire system:

- [[DatabaseManager]] (`core-components/DatabaseManager.md`): SQLite + JSONL hybrid storage
  - Source: `src/storage/DatabaseManager.ts`
  - Stores: 1,511 symbols, 36,050+ relationships
  - Performance: O(log n) lookups, FTS5 full-text search
  - Used by: All commands and analyzers

- [[SymbolGraphBuilder]] (`src/graph/SymbolGraphBuilder.ts`): Graph construction
- [[SymbolSearchEngine]] (`src/graph/SymbolSearchEngine.ts`): Search algorithms
- [[SymbolRegistryManager]] (`src/storage/SymbolRegistryManager.ts`): JSONL operations
- [[ConfigManager]] (`src/config/ConfigManager.ts`): Configuration management

## Analyzers & Extractors

**Path**: `managed/analyzers/`
**Index**: [[Analyzers & Extractors]] (`analyzers/index.md`) - Master index for all 20+ analyzers

Core analyzers that power relationship detection and symbol extraction:

### Primary Analyzers

- [[ASTSymbolExtractor]] (`analyzers/ASTSymbolExtractor.md`): Symbol extraction from TypeScript AST
  - Source: `src/analyzer/ASTSymbolExtractor.ts`
  - Output: 1,511 symbols from 126 files
  - Capabilities: Classes, functions, interfaces, types, constants
  - Used by: [[BuildCommand]], [[ParseCommand]]

- [[CallGraphAnalyzer]] (`analyzers/CallGraphAnalyzer.md`): Function call relationship detection
  - Source: `src/analyzer/CallGraphAnalyzer.ts`
  - Output: 1,511 call relationships
  - Capabilities: Call expressions, dead code detection, hotspots
  - Used by: [[AnalyzeCallsCommand]]

- [[IODependencyAnalyzer]] (`analyzers/IODependencyAnalyzer.md`): Data flow analysis
  - Source: `src/analyzer/IODependencyAnalyzer.ts`
  - Output: 6,705 I/O dependencies
  - Capabilities: Type matching, pipeline detection, confidence scoring
  - Used by: [[AnalyzeIOCommand]]

- [[CodeHealthChecker]] (`analyzers/CodeHealthChecker.md`): Quality metrics and health reports
  - Source: `src/analyzer/CodeHealthChecker.ts`
  - Output: Health score (0-100) + improvement suggestions
  - Capabilities: Doc quality + test coverage analysis
  - Used by: [[HealthCommand]], [[AnalyzeCommand]]

### Supporting Analyzers (20+ components)

See [[Analyzers & Extractors]] (`analyzers/index.md`) for complete list including:
- [[MissingLinkDetector]], [[DataFlowAnalyzer]], [[DependencyResolver]]
- [[DependencyChainAnalyzer]], [[InterfaceAnalyzer]], [[DomainStructureAnalyzer]]
- [[ImportanceClassifier]], [[ParallelWorkDetector]], [[PreCommitChecker]]
- [[ReliabilityChecker]]

## Feature Documentation

### Analysis & Extraction
**Path**: `managed/features/`

- [[CoreWorkflow]] (`features/core-workflow.md`): Core pipeline from parsing to docs
  - Commands: [[BuildCommand]] (`src/commands/BuildCommand.ts`), [[ParseCommand]] (`src/commands/ParseCommand.ts`)
  - Uses: [[ASTSymbolExtractor]] (`analyzers/ASTSymbolExtractor.md`), [[TSDocParser]] (`src/parser/TSDocParser.ts`)
- [[AnalysisFeatures]] (`features/analysis-features.md`): 12 query & analysis commands (4.2% coverage, 25 files)
  - Core: [[SymbolGraphBuilder]] (`src/graph/SymbolGraphBuilder.ts`), [[DependencyResolver]] (`src/analyzer/DependencyResolver.ts`)
  - Analyzers: [[CodeHealthChecker]] (`analyzers/CodeHealthChecker.md`)
- [[ValidationFeatures]] (`features/validation-features.md`): 8 validation commands (1.9% coverage, 20 files)
  - Core: [[ConnectivityValidator]] (`src/validator/ConnectivityValidator.ts`), [[ConventionValidator]] (`src/validator/ConventionValidator.ts`)
  - Commands: [[ValidateCommand]], [[ValidateDocsCommand]], [[ValidateSymbolRefsCommand]]
- [[SymbolGraphFeatures]] (`features/symbol-graph.md`): Graph-based symbol tracking (3.9% coverage, 24 files)
  - Implementation: [[SymbolGraphBuilder]] (`src/graph/SymbolGraphBuilder.ts`)
  - Uses: [[SymbolSearchEngine]] (`src/graph/SymbolSearchEngine.ts`), [[DepthTraverser]] (`src/graph/DepthTraverser.ts`)
- [[DocumentSymbolSystem]] (`features/document-symbol-system.md`): [[Symbol]] reference system
  - Parser: [[DocumentSymbolRegistry]] (`src/doc-symbol/DocumentSymbolRegistry.ts`)
  - Extractor: [[MermaidSymbolExtractor]] (`src/doc-symbol/MermaidSymbolExtractor.ts`)
- [[AutoIndexing]] (`features/auto-indexing.md`): Automatic doc indexing
  - Command: [[IndexDocsCommand]] (`src/commands/IndexDocsCommand.ts`)
  - Uses: [[BacklinkGenerator]] (`src/doc-symbol/BacklinkGenerator.ts`)

### Architecture
**Path**: `managed/architecture/`

- **System Architecture** (`system-architecture-2025-11-07.md`): Overall design
  - CLI: [[CLI Runner]] (`src/cli.ts`), [[CommandRegistry]] (`src/commands/CommandRegistry.ts`)
  - Core: [[SymbolGraphBuilder]] (`src/graph/SymbolGraphBuilder.ts`), [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)
- **Analysis & Extraction** (`analysis-extraction-systems-2025-11-07.md`): Analyzers
  - Extractors: [[ASTSymbolExtractor]] (`src/analyzer/ASTSymbolExtractor.ts`)
  - Analyzers: [[IODependencyAnalyzer]] (`src/analyzer/IODependencyAnalyzer.ts`), [[CallGraphAnalyzer]] (`src/analyzer/CallGraphAnalyzer.ts`)
- **Database Schema** (`database-relationships-2025-11-07.md`): Storage design
  - SQLite: [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)
  - JSONL: [[SymbolRegistryManager]] (`src/storage/SymbolRegistryManager.ts`)
- [[Dependency Meta-Structure]] (`diagrams/dependency-meta-structure.mmd`): Visual taxonomy
  - Shows all 17 relationship types across 4 dimensions
  - Entry point for relationship exploration

### Concepts
**Path**: `managed/concepts/`

- [[Integration Test Traceability]] (`integration-test-traceability.md`): Track test coverage of relationships
  - Command: [[TestRelationshipsCommand]] (`src/commands/TestRelationshipsCommand.ts`)
  - Analyzer: [[TestCoverageAnalyzer]] (`src/analyzer/TestCoverageAnalyzer.ts`)
- [[Parallel Work Theory]] (`parallel-work-theory.md`): Safe parallel development analysis
  - Command: [[ParallelWorkCommand]] (`src/commands/ParallelWorkCommand.ts`)

## Primary Types
**Path**: `managed/primary-types/`

Core TypeScript interfaces used across the system:
- [[AnalysisReport]] (`primary-types/AnalysisReport.md`): Analysis result format
  - Used by: [[HealthCommand]] (`src/commands/HealthCommand.ts`), [[AnalyzeCommand]] (`src/commands/AnalyzeCommand.ts`)
  - Generated by: [[CodeHealthChecker]] (`analyzers/CodeHealthChecker.md`)
- [[ExtractionResult]] (`primary-types/ExtractionResult.md`): Build output format
  - Used by: [[BuildCommand]] (`src/commands/BuildCommand.ts`)
  - Generated by: [[ASTSymbolExtractor]] (`analyzers/ASTSymbolExtractor.md`)
- [[TrackableStatistics]] (`primary-types/TrackableStatistics.md`): Metrics tracking
  - Used by: [[StatsCommand]] (`src/commands/StatsCommand.ts`)
- [[TsdocEdgeConfig]] (`primary-types/TsdocEdgeConfig.md`): Configuration schema
  - Used by: [[ConfigManager]] (`src/config/ConfigManager.ts`)

## Navigation

### By Use Case

**Before Modifying Code**:
1. [[WorkContextCommand]] (`src/commands/WorkContextCommand.ts`) - Get complete context
2. [[DepsCommand]] (`src/commands/DepsCommand.ts`) - Check dependencies
3. [[WhoUsesCommand]] (`src/commands/WhoUsesCommand.ts`) - Check reverse dependencies

**After Writing Code**:
1. [[BuildCommand]] (`src/commands/BuildCommand.ts`) - Extract symbols
2. [[ValidateCommand]] (`src/commands/ValidateCommand.ts`) - Validate project
3. [[HealthCommand]] (`src/commands/HealthCommand.ts`) - Check code health

**Creating Documentation**:
1. [[ParseMermaidCommand]] (`src/commands/ParseMermaidCommand.ts`) - Generate docs from .mmd
2. [[PromoteSymbolCommand]] (`src/commands/PromoteSymbolCommand.ts`) - Promote H2 to canonical H1
3. [[ValidateSymbolRefsCommand]] (`src/commands/ValidateSymbolRefsCommand.ts`) - Validate [[Symbol]] refs

**Finding Issues**:
1. [[OrphansCommand]] (`src/commands/OrphansCommand.ts`) - Find orphaned code
2. [[UndocumentedCommand]] (`src/commands/UndocumentedCommand.ts`) - Find undocumented symbols
3. [[UntestedCommand]] (`src/commands/UntestedCommand.ts`) - Find untested code
4. [[DetectCircularTypesCommand]] (`src/commands/DetectCircularTypesCommand.ts`) - Detect circular deps

### By Topic

**Relationships**:
- [[Relationship Types]] (`relationships/index.md`): All 17 types (SSOT) - 9.9% coverage
- [[Dependency Meta-Structure]] (`architecture/diagrams/dependency-meta-structure.mmd`): Visual taxonomy
- Implemented (10/17):
  - [[Code Dependency]] (`relationships/CODE-DEPENDENCY.md`) - 1,968 relationships
  - [[IO Dependency]] (`relationships/IO-DEPENDENCY.md`) - 6,705 relationships
  - [[Call Relationships]] (`relationships/CALLS.md`) - 1,511 relationships
  - [[Pipeline]] (`relationships/PIPELINE.md`) - 25,809 chains
  - [[Test Coverage]] (`relationships/TEST-COVERAGE.md`)
  - [[Type Dependency]] (`relationships/TYPE-DEPENDENCY.md`)
  - [[Generic Constraint]] (`relationships/GENERIC-CONSTRAINT.md`)
  - [[Inheritance]] (`relationships/INHERITANCE.md`) - 57 relationships
  - [[Interface Implementation]] (`relationships/INTERFACE-IMPL.md`)
  - [[Circular Dependency]] (`relationships/CIRCULAR.md`) - 0 found

**Commands**:
- [[Commands Index]]: All 61 commands organized
- Individual docs: [[BuildCommand]], [[WorkContextCommand]], etc.

**Workflows**:
- [[Work Context Workflow]]: Primary workflow
- Symbol promotion: H2 → H1 workflow
- Documentation generation: .mmd → docs

## Statistics

**Current Coverage** (from explore-entrypoint):
- **Symbols Discovered**: 100 / 1,511 (6.6%)
- **Files Discovered**: 18 / 126 (14.3%)
- **Documentation Files**: 32 active
- **Total Relationships**: 36,050+

**Recent Improvements**:
- Cleaned 47 → 32 docs (32% reduction)
- Compressed relationship docs (96% less content)
- Created command index
- Verified all primary-types usage

See `IMPROVEMENT-SUMMARY.md` for details.

## Validation

```bash
# Validate all [[Symbol]] references
tsdoc-edge validate-symbol-refs managed

# Check relationship counts
sqlite3 .tsdoc/symbols.db "SELECT type, COUNT(*) FROM unified_relationships GROUP BY type"

# Detect orphan code from docs
tsdoc-edge explore-entrypoint managed/README.md --detect-orphans
```

## Resources

**Reports**:
- `ORPHAN-DOCS-REPORT.md` - Orphan documentation analysis
- `IMPROVEMENT-SUMMARY.md` - Recent cleanup & improvements
- `CLEANUP-SUMMARY.md` - Documentation cleanup details

**Archives**:
- `managed/archive/history/` - Historical sessions & reviews
- `managed/archive/concepts/` - Design principles
- `managed/archive/workflows/` - Design workflows

## Contributing

To add documentation:
1. Use [[ParseMermaidCommand]] to generate from diagrams
2. Fill in TODO sections with implementation details
3. Add [[Symbol]] references to link docs
4. Promote to canonical with [[PromoteSymbolCommand]]
5. Validate with [[ValidateSymbolRefsCommand]]

---

**Project**: TSDoc Edge - SSOT Documentation & Relationship Platform
**Version**: 0.12.0
**Last Updated**: 2025-11-08

---

## Backlinks

### Referenced By

- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:294
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:191
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:192
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:193
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:194
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:195
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:196
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:197
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:256
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:257
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:258
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:259
- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:211
- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:212
- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:213
- [[DataFlowAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DataFlowAnalyzer.md:28
- [[DependencyChainAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DependencyChainAnalyzer.md:31
- [[DependencyResolver]] → /home/user/tsdoc-edge/managed/analyzers/DependencyResolver.md:31
- [[DependencyResolver]] → /home/user/tsdoc-edge/managed/analyzers/DependencyResolver.md:32
- [[DomainStructureAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DomainStructureAnalyzer.md:30
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:27
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:28
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:29
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:30
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:31
- [[ImportanceClassifier]] → /home/user/tsdoc-edge/managed/analyzers/ImportanceClassifier.md:30
- [[InterfaceAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/InterfaceAnalyzer.md:28
- [[MissingLinkDetector]] → /home/user/tsdoc-edge/managed/analyzers/MissingLinkDetector.md:30
- [[ParallelWorkDetector]] → /home/user/tsdoc-edge/managed/analyzers/ParallelWorkDetector.md:32
- [[PreCommitChecker]] → /home/user/tsdoc-edge/managed/analyzers/PreCommitChecker.md:30
- [[ReliabilityChecker]] → /home/user/tsdoc-edge/managed/analyzers/ReliabilityChecker.md:29
- [[TestCoverageAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestCoverageAnalyzer.md:31
- [[TestCoverageAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestCoverageAnalyzer.md:32
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:277
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:278
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:30
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:31
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:32
- [[AnalyzeChainsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeChainsCommand.md:29
- [[AnalyzeChainsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeChainsCommand.md:30
- [[AnalyzeCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCommand.md:27
- [[AnalyzeCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCommand.md:28
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:30
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:31
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:32
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:62
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:63
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:64
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:65
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:66
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:67
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:68
- [[CommandRegistry]] → /home/user/tsdoc-edge/managed/commands/CommandRegistry.md:29
- [[DepsCommand]] → /home/user/tsdoc-edge/managed/commands/DepsCommand.md:127
- [[DepsCommand]] → /home/user/tsdoc-edge/managed/commands/DepsCommand.md:128
- [[DetectCircularTypesCommand]] → /home/user/tsdoc-edge/managed/commands/DetectCircularTypesCommand.md:64
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:31
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:32
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:26
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:27
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:28
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:29
- [[IndexDocsCommand]] → /home/user/tsdoc-edge/managed/commands/IndexDocsCommand.md:67
- [[IndexDocsCommand]] → /home/user/tsdoc-edge/managed/commands/IndexDocsCommand.md:68
- [[OrphansCommand]] → /home/user/tsdoc-edge/managed/commands/OrphansCommand.md:152
- [[OrphansCommand]] → /home/user/tsdoc-edge/managed/commands/OrphansCommand.md:153
- [[ParallelWorkCommand]] → /home/user/tsdoc-edge/managed/commands/ParallelWorkCommand.md:30
- [[ParseCommand]] → /home/user/tsdoc-edge/managed/commands/ParseCommand.md:29
- [[ParseCommand]] → /home/user/tsdoc-edge/managed/commands/ParseCommand.md:30
- [[ParseCommand]] → /home/user/tsdoc-edge/managed/commands/ParseCommand.md:31
- [[ParseMermaidCommand]] → /home/user/tsdoc-edge/managed/commands/ParseMermaidCommand.md:54
- [[ParseMermaidCommand]] → /home/user/tsdoc-edge/managed/commands/ParseMermaidCommand.md:55
- [[ParseMermaidCommand]] → /home/user/tsdoc-edge/managed/commands/ParseMermaidCommand.md:56
- [[ParseMermaidCommand]] → /home/user/tsdoc-edge/managed/commands/ParseMermaidCommand.md:57
- [[PromoteSymbolCommand]] → /home/user/tsdoc-edge/managed/commands/PromoteSymbolCommand.md:30
- [[PromoteSymbolCommand]] → /home/user/tsdoc-edge/managed/commands/PromoteSymbolCommand.md:31
- [[PromoteSymbolCommand]] → /home/user/tsdoc-edge/managed/commands/PromoteSymbolCommand.md:32
- [[PromoteSymbolCommand]] → /home/user/tsdoc-edge/managed/commands/PromoteSymbolCommand.md:33
- [[StatsCommand]] → /home/user/tsdoc-edge/managed/commands/StatsCommand.md:167
- [[StatsCommand]] → /home/user/tsdoc-edge/managed/commands/StatsCommand.md:168
- [[TestRelationshipsCommand]] → /home/user/tsdoc-edge/managed/commands/TestRelationshipsCommand.md:30
- [[TestRelationshipsCommand]] → /home/user/tsdoc-edge/managed/commands/TestRelationshipsCommand.md:31
- [[UndocumentedCommand]] → /home/user/tsdoc-edge/managed/commands/UndocumentedCommand.md:141
- [[UntestedCommand]] → /home/user/tsdoc-edge/managed/commands/UntestedCommand.md:158
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:29
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:30
- [[ValidateDocsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateDocsCommand.md:29
- [[ValidateDocsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateDocsCommand.md:30
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:30
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:31
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:32
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:33
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:138
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:139
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:66
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:67
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:68
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:69
- [[Integration Test Traceability]] → /home/user/tsdoc-edge/managed/concepts/integration-test-traceability.md:170
- [[Parallel Work Theory]] → /home/user/tsdoc-edge/managed/concepts/parallel-work-theory.md:260
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:31
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:32
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:127
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:212
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:213
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:214
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:215
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:216
- [[BacklinkGenerator]] → /home/user/tsdoc-edge/managed/doc-symbols/BacklinkGenerator.md:31
- [[DocumentSymbolRegistry]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolRegistry.md:163
- [[MermaidSymbolExtractor]] → /home/user/tsdoc-edge/managed/doc-symbols/MermaidSymbolExtractor.md:31
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:266
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:267
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:268
- [[AutoIndexing]] → /home/user/tsdoc-edge/managed/features/auto-indexing.md:180
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:159
- [[DocumentSymbolSystem]] → /home/user/tsdoc-edge/managed/features/document-symbol-system.md:120
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:259
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:226
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:227
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:228
- [[DepthTraverser]] → /home/user/tsdoc-edge/managed/graph/DepthTraverser.md:152
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:272
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:311
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:312
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:313
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:349
- [[TSDocParser]] → /home/user/tsdoc-edge/managed/parser/TSDocParser.md:31
- [[AnalysisReport]] → /home/user/tsdoc-edge/managed/primary-types/AnalysisReport.md:106
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:104
- [[TrackableStatistics]] → /home/user/tsdoc-edge/managed/primary-types/TrackableStatistics.md:117
- [[TsdocEdgeConfig]] → /home/user/tsdoc-edge/managed/primary-types/TsdocEdgeConfig.md:114
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:205
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:50
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:51
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:52
- [[Circular Dependency]] → /home/user/tsdoc-edge/managed/relationships/CIRCULAR.md:19
- [[Circular Dependency]] → /home/user/tsdoc-edge/managed/relationships/CIRCULAR.md:20
- [[Generic Constraint]] → /home/user/tsdoc-edge/managed/relationships/GENERIC-CONSTRAINT.md:19
- [[Generic Constraint]] → /home/user/tsdoc-edge/managed/relationships/GENERIC-CONSTRAINT.md:20
- [[Inheritance]] → /home/user/tsdoc-edge/managed/relationships/INHERITANCE.md:19
- [[Inheritance]] → /home/user/tsdoc-edge/managed/relationships/INHERITANCE.md:20
- [[Interface Implementation]] → /home/user/tsdoc-edge/managed/relationships/INTERFACE-IMPL.md:18
- [[Interface Implementation]] → /home/user/tsdoc-edge/managed/relationships/INTERFACE-IMPL.md:19
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:19
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:20
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:21
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:19
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:20
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:21
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:19
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:20
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:48
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:49
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:50
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:207
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:63
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:64
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:65
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:276
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:277
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:81
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:82
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:83
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:84
- [[ConnectivityValidator]] → /home/user/tsdoc-edge/managed/utilities/ConnectivityValidator.md:113
- [[ConventionValidator]] → /home/user/tsdoc-edge/managed/utilities/ConventionValidator.md:184
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:97
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:98
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:99
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:100
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:97
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:98
- [[Mermaid Entrypoint Workflow]] → /home/user/tsdoc-edge/managed/workflows/mermaid-entrypoint-workflow.md:309
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:254
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:255

