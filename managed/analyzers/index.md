---
title: Analyzers & Extractors
type: index
category: core-components
status: active
canonical: true
entrypoint: true
---

# [[Analyzers & Extractors]]

> **SSOT**: Master index for all analyzers and extractors in TSDoc Edge

Core components that power relationship detection, symbol extraction, and quality analysis.

## Overview

**Total Analyzers**: 20+ components
**Categories**: Extraction (1), Behavioral (1), Data Flow (1), Quality (3), Utilities (14+)

## Primary Analyzers

### ASTSymbolExtractor - Symbol Extraction ✅

**Source**: `src/analyzer/ASTSymbolExtractor.ts`
**Doc**: [ASTSymbolExtractor.md](./ASTSymbolExtractor.md)

**Purpose**: Extract all symbols from TypeScript AST
**Output**: 1,511 symbols from 126 files
**Used By**: BuildCommand, [[ParseCommand]]

**Capabilities**:
- Classes, functions, interfaces, types
- Import/export dependencies
- Type information extraction
- Location tracking

---

### [[CallGraphAnalyzer]] - Call Relationships ✅

**Source**: `src/analyzer/CallGraphAnalyzer.ts`
**Doc**: [CallGraphAnalyzer.md](./CallGraphAnalyzer.md)

**Purpose**: Detect function call relationships
**Output**: 1,511 call relationships
**Used By**: AnalyzeCallsCommand

**Capabilities**:
- Direct calls, method calls, constructors
- Call frequency tracking
- Dead code detection
- Call chain analysis

---

### [[IODependencyAnalyzer]] - Data Flow ✅

**Source**: `src/analyzer/IODependencyAnalyzer.ts`
**Doc**: [IODependencyAnalyzer.md](./IODependencyAnalyzer.md)

**Purpose**: Match return types with parameter types
**Output**: 6,705 I/O dependencies
**Used By**: AnalyzeIOCommand, AnalyzeChainsCommand

**Capabilities**:
- Type matching algorithm
- Pipeline detection (3+ steps)
- Confidence scoring (0.5-1.0)
- Data flow visualization

---

### [[CodeHealthChecker]] - Quality Metrics ✅

**Source**: `src/analyzer/CodeHealthChecker.ts`
**Doc**: [CodeHealthChecker.md](./CodeHealthChecker.md)

**Purpose**: Generate health reports with improvement suggestions
**Output**: Health score (0-100) + suggestions
**Used By**: [[HealthCommand]], [[HealthCommand]]

**Capabilities**:
- Documentation quality analysis
- Test coverage tracking
- Improvement suggestions
- Trend analysis

---

## Supporting Analyzers

**[[DocumentationAnalyzer]]** (`src/analyzer/DocumentationAnalyzer.ts`) - TSDoc completeness and documentation freshness analysis used by [[CodeHealthChecker]].

**[[TestCoverageAnalyzer]]** (`src/analyzer/TestCoverageAnalyzer.ts`) - Test-to-implementation mapping and symbol-level coverage analysis under [[Coverage Metrics Contract]].

### [[AlternativesAnalyzer]]

Detects interchangeable implementation (`substitution`) and error-recovery (`fallback`) relationships across symbols.

**Source**: `src/analyzer/AlternativesAnalyzer.ts`

### [[BehavioralAnalyzer]]

Orchestrates behavioral relationship detection across collaboration, composition, and temporal-order patterns.

**Source**: `src/analyzer/BehavioralAnalyzer.ts`

### [[CallbackAnalyzer]]

Detects callback invocation, higher-order function parameter, and Promise/async continuation relationships from TypeScript ASTs.

**Source**: `src/analyzer/CallbackAnalyzer.ts`

### [[CoRequirementAnalyzer]]

Extracts co-requirement relationships from `@requires` tags and paired symbol usage patterns.

**Source**: `src/analyzer/CoRequirementAnalyzer.ts`

### [[CollaborationAnalyzer]]

Identifies mutual collaboration relationships between symbols that coordinate to fulfill a shared workflow.

**Source**: `src/analyzer/CollaborationAnalyzer.ts`

### [[CompositionAnalyzer]]

Detects structural `has-a` composition relationships from class properties, constructor parameters, and member initializers.

**Source**: `src/analyzer/CompositionAnalyzer.ts`

### [[ConstraintAnalyzer]]

Analyzes mutual-exclusion and co-requirement architectural constraints across symbols.

**Source**: `src/analyzer/ConstraintAnalyzer.ts`

### [[CoverageParser]]

Parses Istanbul/NYC `coverage-final.json` reports into normalized line, branch, function, and statement execution metrics.

**Source**: `src/analyzer/CoverageParser.ts`

### [[DependencyChainAnalyzer]]

Traces multi-hop dependency chains and sequential data-transformation pipelines across symbols.

**Source**: `src/analyzer/DependencyChainAnalyzer.ts`

### [[EnhancedWorkContextAnalyzer]]

Aggregates upstream/downstream dependencies, related documents, contracts, and test coverage into unified file work contexts.

**Source**: `src/analyzer/EnhancedWorkContextAnalyzer.ts`

### [[EnhancementAnalyzer]]

Extracts capability extension relationships declared via `@enhances` TSDoc tags.

**Source**: `src/analyzer/EnhancementAnalyzer.ts`

### [[EntryPointContextAggregator]]

Collects transitive code, document, and relationship context reachable from a file, symbol, or checkpoint entry point.

**Source**: `src/analyzer/EntryPointContextAggregator.ts`

### [[EventFlowAnalyzer]]

Detects asynchronous event emission and subscription (`event-flow`) relationships across EventEmitter and listener patterns.

**Source**: `src/analyzer/EventFlowAnalyzer.ts`

### [[ExplicitSemanticRelationAnalyzer]]

Extracts explicit non-AST semantic relationships declared with `@relatedTo` TSDoc tags.

**Source**: `src/analyzer/ExplicitSemanticRelationAnalyzer.ts`

### [[FallbackAnalyzer]]

Detects error-recovery, retry, and default-value `fallback` relationships in control-flow and catch blocks.

**Source**: `src/analyzer/FallbackAnalyzer.ts`

### [[FeatureGroupingAnalyzer]]

Groups symbols into cohesive domain feature boundaries using `@feature` tags, directory layout, and naming clusters.

**Source**: `src/analyzer/FeatureGroupingAnalyzer.ts`

### [[ImportAnalyzer]]

Extracts module and symbol `code-dependency` edges from TypeScript `import` and re-export declarations.

**Source**: `src/analyzer/ImportAnalyzer.ts`

### [[ImportanceClassifier]]

Scores and classifies symbol architectural importance from graph centrality, export visibility, and dependent counts.

**Source**: `src/analyzer/ImportanceClassifier.ts`

### [[IntegrationCoverageCalculator]]

Computes relationship-level integration test verification coverage across connected symbol pairs.

**Source**: `src/analyzer/IntegrationCoverageCalculator.ts`

### [[IntegrationVerificationAnalyzer]]

Identifies integration tests that exercise multi-symbol interactions and cross-module contracts.

**Source**: `src/analyzer/IntegrationVerificationAnalyzer.ts`

### [[InterfaceAnalyzer]]

Extracts TypeScript interface declarations, member signatures, and structural implementation contracts.

**Source**: `src/analyzer/InterfaceAnalyzer.ts`

### [[InterfaceDependencyMapper]]

Maps dependencies between interfaces and the concrete classes or consumers coupled to them.

**Source**: `src/analyzer/InterfaceDependencyMapper.ts`

### [[LayerDependencyAnalyzer]]

Validates architectural layer dependencies and flags upward or cross-layer dependency violations.

**Source**: `src/analyzer/LayerDependencyAnalyzer.ts`

### [[MissingLinkDetector]]

Detects broken `[[Checkpoint]]` references, orphaned documentation links, and unresolved code-symbol pointers.

**Source**: `src/analyzer/MissingLinkDetector.ts`

### [[NamingPatternRelationAnalyzer]]

Infers domain relationships between symbols sharing stem and role naming conventions.

**Source**: `src/analyzer/NamingPatternRelationAnalyzer.ts`

### [[ParallelWorkDetector]]

Partitions files and symbols into disjoint dependency subgraphs that can be modified safely in parallel.

**Source**: `src/analyzer/ParallelWorkDetector.ts`

### [[PreCommitChecker]]

Evaluates staged TypeScript and Markdown files against TSDoc completeness and connectivity thresholds before Git commits.

**Source**: `src/analyzer/PreCommitChecker.ts`

### [[RelationshipInferenceEngine]]

Derives transitive and rule-based inferred relationships over the unified symbol relationship graph.

**Source**: `src/analyzer/RelationshipInferenceEngine.ts`

### [[StatsHistoryManager]]

Persists and queries historical snapshots of symbol, documentation, and relationship metrics over time.

**Source**: `src/analyzer/StatsHistoryManager.ts`

### [[SubstitutionAnalyzer]]

Detects interchangeable implementations that satisfy a common interface or base class contract.

**Source**: `src/analyzer/SubstitutionAnalyzer.ts`

### [[TemporalOrderAnalyzer]]

Detects required execution-order (`temporal-order`) sequences across initialization, execution, and teardown methods.

**Source**: `src/analyzer/TemporalOrderAnalyzer.ts`

### [[TestCoverageUnifier]]

Unifies static test-to-symbol AST links with runtime coverage reports into `test-coverage` relationships.

**Source**: `src/analyzer/TestCoverageUnifier.ts`

### [[TestExampleExtractor]]

Extracts executable usage examples from unit and integration test cases for symbol documentation.

**Source**: `src/analyzer/TestExampleExtractor.ts`

### [[TestRelationshipExtractor]]

Extracts test suites, test cases, `@testScenario` mappings, and tested-symbol edges from test files.

**Source**: `src/analyzer/TestRelationshipExtractor.ts`

### [[TrackableStatsCollector]]

Collects normalized codebase health, documentation rate, and relationship density metrics for longitudinal tracking.

**Source**: `src/analyzer/TrackableStatsCollector.ts`

---

## Usage Patterns

### 1. Build-Time Analysis

```bash
# Extract symbols
tsdoc-edge build src
# Uses: ASTSymbolExtractor

# Analyze relationships
tsdoc-edge analyze-calls
# Uses: CallGraphAnalyzer

tsdoc-edge analyze-io
# Uses: IODependencyAnalyzer
```

### 2. Quality Checks

```bash
# Health report
tsdoc-edge health src
# Uses: CodeHealthChecker → DocumentationAnalyzer + file-based test presence signal

# Coverage analysis
tsdoc-edge test-relationships
# Uses: TestRelationshipsCommand + TestCoverageAnalyzer
```

### 3. Validation

```bash
# Validate docs
tsdoc-edge validate-docs managed
# Uses: MissingLinkDetector

# Detect orphans
tsdoc-edge orphans
# Uses: DependencyResolver
```

---

## Integration Map

```
Commands
  ↓
Analyzers (this index)
  ↓
Core Components (SymbolGraph, DatabaseManager)
  ↓
Storage (SQLite + JSONL)
```

**Entry Points**:
- BuildCommand → ASTSymbolExtractor
- AnalyzeCallsCommand → [[CallGraphAnalyzer]]
- AnalyzeIOCommand → [[IODependencyAnalyzer]]
- [[HealthCommand]] → [[CodeHealthChecker]]

**Storage**:
- All analyzers use DatabaseManager (`src/storage/DatabaseManager.ts`)
- Relationships stored in `unified_relationships` table

---

## Statistics

**System-wide** (as of 2025-11-08):
- **Total Symbols**: 1,511
- **Total Files**: 126
- **Relationships**: 36,050+
  - Code Dependencies: 1,968
  - I/O Dependencies: 6,705
  - Call Relationships: 1,511
  - Pipeline Chains: 25,809
  - Inheritance: 57

---

## Related

**Commands**:
- Commands Index (`managed/COMMANDS.md`) - All 67 commands
- BuildCommand (`src/commands/BuildCommand.ts`)
- [[HealthCommand]] (`src/commands/HealthCommand.ts`)

**Relationships**:
- [[Relationship Types]] (`managed/relationships/index.md`) - All 17 types
- [[Code Dependency]] (`managed/relationships/CODE-DEPENDENCY.md`)
- [[Call Relationships]] (`managed/relationships/CALLS.md`)
- [[IO Dependency]] (`managed/relationships/IO-DEPENDENCY.md`)

**Core**:
- SymbolGraphBuilder (`src/graph/SymbolGraphBuilder.ts`)
- DatabaseManager (`src/storage/DatabaseManager.ts`)

**Features**:
- AnalysisFeatures (`managed/features/analysis-features.md`)
- ValidationFeatures (`managed/features/validation-features.md`)

---

**Last Updated**: 2025-11-08
**Total Analyzers**: 20+ components
**Coverage**: Powers all relationship detection and quality analysis

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → managed/README.md:176
- [[Code Generation]] → managed/code-generation/index.md:45
- [[AnalyzerCommands]] → managed/commands/AnalyzerCommands.md:255
- [[Phase Commands]] → managed/commands/PhaseCommands.md:86
- [[Core Systems]] → managed/core/index.md:50
- [[Analyzer Status]] → managed/features/analyzer-status.md:306
- [[ValidationFeatures]] → managed/features/validation-features.md:258
- [[Guides & Tutorials]] → managed/guides/index.md:242
- [[Relationship Analysis Guide]] → managed/guides/relationship-analysis-guide.md:430
- [[Parser Components]] → managed/parser/index.md:118
- [[Quick Start Guide]] → managed/quick-start.md:261
- [[Types Index]] → managed/types/index.md:368
- [[TSDoc Edge User Guide]] → managed/user-guide.md:282
- [[Utilities Index]] → managed/utilities/index.md:427

### Implemented By

- Analyzers & Extractors → src/analyzer/ASTSymbolExtractor.ts:1

