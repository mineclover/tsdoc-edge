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
**Used By**: [[HealthCommand]], [[AnalyzeCommand]]

**Capabilities**:
- Documentation quality analysis
- Test coverage tracking
- Improvement suggestions
- Trend analysis

---

## Supporting Analyzers

### Documentation & Quality

**[[DocumentationAnalyzer]]** (`src/analyzer/DocumentationAnalyzer.ts`)
- TSDoc completeness analysis
- Symbol documentation rate
- Documentation freshness
- Used by: [[CodeHealthChecker]]

**[[TestCoverageAnalyzer]]** (`src/analyzer/TestCoverageAnalyzer.ts`)
- Parse Istanbul/NYC coverage
- Symbol-level coverage
- Untested code detection
- Used by: [[CodeHealthChecker]], TestRelationshipsCommand

**[[Analyzers & Extractors]]** (`src/analyzer/MissingLinkDetector.ts`)
- Detect broken [[Symbol]] references
- Orphan documentation detection
- Link validation
- Used by: [[ValidateDocsCommand]]

---

### Data Flow & Dependencies

**DataFlowAnalyzer** (`src/analyzer/DataFlowAnalyzer.ts`)
- Trace data flow through system
- Identify transformation chains
- Validate data contracts

**DependencyResolver** (`src/analyzer/DependencyResolver.ts`)
- Resolve symbol dependencies
- Transitive dependency analysis
- Dependency graph construction

**DependencyChainAnalyzer** (`src/analyzer/DependencyChainAnalyzer.ts`)
- Multi-step dependency chains
- Pipeline pattern detection
- Chain visualization

**InterfaceDependencyMapper** (`src/analyzer/InterfaceDependencyMapper.ts`)
- Map interface implementations
- Contract validation
- Interface usage analysis

---

### Structural Analysis

**InterfaceAnalyzer** (`src/analyzer/InterfaceAnalyzer.ts`)
- Interface structure analysis
- Implementation detection
- Contract validation

**DomainStructureAnalyzer** (`src/analyzer/DomainStructureAnalyzer.ts`)
- Domain boundary detection
- Module structure analysis
- Architectural patterns

**ImportanceClassifier** (`src/analyzer/ImportanceClassifier.ts`)
- Symbol importance scoring
- API surface identification
- Priority ranking

---

### Testing & Coverage

**[[TestRelationshipAnalyzer]]** (`src/analyzer/TestRelationshipAnalyzer.ts`)
- Test → implementation mapping
- Coverage relationship tracking
- Test gap detection

**IntegrationCoverageCalculator** (`src/analyzer/IntegrationCoverageCalculator.ts`)
- Integration test coverage
- Relationship coverage metrics
- Gap analysis

**CoverageParser** (`src/analyzer/CoverageParser.ts`)
- Parse coverage reports (Istanbul, NYC)
- Multiple format support
- Coverage data extraction

**CoverageSyncAdapter** (`src/analyzer/CoverageSyncAdapter.ts`)
- Sync coverage data with symbol graph
- Coverage relationship creation

**[[Analyzers & Extractors]]** (`src/analyzer/IstanbulCoverageAdapter.ts`)
- Istanbul format adapter
- Coverage data normalization

---

### Development Workflow

**[[Analyzers & Extractors]]** (`src/analyzer/ParallelWorkDetector.ts`)
- Detect parallel work conflicts
- File dependency analysis
- Safe parallel work identification

**PreCommitChecker** (`src/analyzer/PreCommitChecker.ts`)
- Pre-commit validation
- Quality gates
- Breaking change detection

**ReliabilityChecker** (`src/analyzer/ReliabilityChecker.ts`)
- Code reliability metrics
- Error handling analysis
- Resilience scoring

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
# Uses: CodeHealthChecker → DocumentationAnalyzer + TestCoverageAnalyzer

# Coverage analysis
tsdoc-edge test-relationships
# Uses: TestRelationshipAnalyzer + TestCoverageAnalyzer
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
- Commands Index (`managed/COMMANDS.md`) - All 61 commands
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

- TSDoc Edge Documentation → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:188
- TSDoc Edge Documentation → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:220
- Analyzer Status → /Users/junwoobang/workflow/tsdoc-edge/managed/features/analyzer-status.md:283
- Guides & Tutorials → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:208
- Guides & Tutorials → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:365
- [[Relationship Analysis Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/relationship-analysis-guide.md:283
- Quick Start Guide → /Users/junwoobang/workflow/tsdoc-edge/managed/quick-start.md:144
- Quick Start Guide → /Users/junwoobang/workflow/tsdoc-edge/managed/quick-start.md:183
- [[Types Index]] → /Users/junwoobang/workflow/tsdoc-edge/managed/types/index.md:349
- [[Utilities Index]] → /Users/junwoobang/workflow/tsdoc-edge/managed/utilities/index.md:417

