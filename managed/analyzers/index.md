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

### [[ASTSymbolExtractor]] - Symbol Extraction ✅

**Source**: `src/analyzer/ASTSymbolExtractor.ts`
**Doc**: [ASTSymbolExtractor.md](./ASTSymbolExtractor.md)

**Purpose**: Extract all symbols from TypeScript AST
**Output**: 1,511 symbols from 126 files
**Used By**: [[BuildCommand]], [[ParseCommand]]

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
**Used By**: [[AnalyzeCallsCommand]]

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
**Used By**: [[AnalyzeIOCommand]], [[AnalyzeChainsCommand]]

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
- Used by: [[CodeHealthChecker]], [[TestRelationshipsCommand]]

**[[MissingLinkDetector]]** (`src/analyzer/MissingLinkDetector.ts`)
- Detect broken [[Symbol]] references
- Orphan documentation detection
- Link validation
- Used by: [[ValidateDocsCommand]]

---

### Data Flow & Dependencies

**[[DataFlowAnalyzer]]** (`src/analyzer/DataFlowAnalyzer.ts`)
- Trace data flow through system
- Identify transformation chains
- Validate data contracts

**[[DependencyResolver]]** (`src/analyzer/DependencyResolver.ts`)
- Resolve symbol dependencies
- Transitive dependency analysis
- Dependency graph construction

**[[DependencyChainAnalyzer]]** (`src/analyzer/DependencyChainAnalyzer.ts`)
- Multi-step dependency chains
- Pipeline pattern detection
- Chain visualization

**[[InterfaceDependencyMapper]]** (`src/analyzer/InterfaceDependencyMapper.ts`)
- Map interface implementations
- Contract validation
- Interface usage analysis

---

### Structural Analysis

**[[InterfaceAnalyzer]]** (`src/analyzer/InterfaceAnalyzer.ts`)
- Interface structure analysis
- Implementation detection
- Contract validation

**[[DomainStructureAnalyzer]]** (`src/analyzer/DomainStructureAnalyzer.ts`)
- Domain boundary detection
- Module structure analysis
- Architectural patterns

**[[ImportanceClassifier]]** (`src/analyzer/ImportanceClassifier.ts`)
- Symbol importance scoring
- API surface identification
- Priority ranking

---

### Testing & Coverage

**[[TestRelationshipAnalyzer]]** (`src/analyzer/TestRelationshipAnalyzer.ts`)
- Test → implementation mapping
- Coverage relationship tracking
- Test gap detection

**[[IntegrationCoverageCalculator]]** (`src/analyzer/IntegrationCoverageCalculator.ts`)
- Integration test coverage
- Relationship coverage metrics
- Gap analysis

**[[CoverageParser]]** (`src/analyzer/CoverageParser.ts`)
- Parse coverage reports (Istanbul, NYC)
- Multiple format support
- Coverage data extraction

**[[CoverageSyncAdapter]]** (`src/analyzer/CoverageSyncAdapter.ts`)
- Sync coverage data with symbol graph
- Coverage relationship creation

**[[IstanbulCoverageAdapter]]** (`src/analyzer/IstanbulCoverageAdapter.ts`)
- Istanbul format adapter
- Coverage data normalization

---

### Development Workflow

**[[ParallelWorkDetector]]** (`src/analyzer/ParallelWorkDetector.ts`)
- Detect parallel work conflicts
- File dependency analysis
- Safe parallel work identification

**[[PreCommitChecker]]** (`src/analyzer/PreCommitChecker.ts`)
- Pre-commit validation
- Quality gates
- Breaking change detection

**[[ReliabilityChecker]]** (`src/analyzer/ReliabilityChecker.ts`)
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
- [[BuildCommand]] → [[ASTSymbolExtractor]]
- [[AnalyzeCallsCommand]] → [[CallGraphAnalyzer]]
- [[AnalyzeIOCommand]] → [[IODependencyAnalyzer]]
- [[HealthCommand]] → [[CodeHealthChecker]]

**Storage**:
- All analyzers use [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)
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
- [[Commands Index]] (`managed/COMMANDS.md`) - All 61 commands
- [[BuildCommand]] (`src/commands/BuildCommand.ts`)
- [[HealthCommand]] (`src/commands/HealthCommand.ts`)

**Relationships**:
- [[Relationship Types]] (`managed/relationships/index.md`) - All 17 types
- [[Code Dependency]] (`managed/relationships/CODE-DEPENDENCY.md`)
- [[Call Relationships]] (`managed/relationships/CALLS.md`)
- [[IO Dependency]] (`managed/relationships/IO-DEPENDENCY.md`)

**Core**:
- [[SymbolGraphBuilder]] (`src/graph/SymbolGraphBuilder.ts`)
- [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)

**Features**:
- [[AnalysisFeatures]] (`managed/features/analysis-features.md`)
- [[ValidationFeatures]] (`managed/features/validation-features.md`)

---

**Last Updated**: 2025-11-08
**Total Analyzers**: 20+ components
**Coverage**: Powers all relationship detection and quality analysis

---

## Backlinks

### Referenced By

- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:235
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:125
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:157
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:193
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:258
- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:221
- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:222
- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:223
- [[CoverageParser]] → /home/user/tsdoc-edge/managed/analyzers/CoverageParser.md:32
- [[CoverageSyncAdapter]] → /home/user/tsdoc-edge/managed/analyzers/CoverageSyncAdapter.md:30
- [[DataFlowAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DataFlowAnalyzer.md:29
- [[DependencyChainAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DependencyChainAnalyzer.md:32
- [[DependencyResolver]] → /home/user/tsdoc-edge/managed/analyzers/DependencyResolver.md:32
- [[DocumentationAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DocumentationAnalyzer.md:145
- [[DomainStructureAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DomainStructureAnalyzer.md:30
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:28
- [[ImportanceClassifier]] → /home/user/tsdoc-edge/managed/analyzers/ImportanceClassifier.md:30
- [[IntegrationCoverageCalculator]] → /home/user/tsdoc-edge/managed/analyzers/IntegrationCoverageCalculator.md:30
- [[InterfaceAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/InterfaceAnalyzer.md:29
- [[InterfaceDependencyMapper]] → /home/user/tsdoc-edge/managed/analyzers/InterfaceDependencyMapper.md:32
- [[IstanbulCoverageAdapter]] → /home/user/tsdoc-edge/managed/analyzers/IstanbulCoverageAdapter.md:33
- [[MissingLinkDetector]] → /home/user/tsdoc-edge/managed/analyzers/MissingLinkDetector.md:30
- [[ParallelWorkDetector]] → /home/user/tsdoc-edge/managed/analyzers/ParallelWorkDetector.md:32
- [[PreCommitChecker]] → /home/user/tsdoc-edge/managed/analyzers/PreCommitChecker.md:30
- [[ReliabilityChecker]] → /home/user/tsdoc-edge/managed/analyzers/ReliabilityChecker.md:29
- [[TestCoverageAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestCoverageAnalyzer.md:36
- [[TestRelationshipAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestRelationshipAnalyzer.md:32
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:31
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:32
- [[AnalyzeChainsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeChainsCommand.md:30
- [[AnalyzeCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCommand.md:31
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:30
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:31
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:65
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:66
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:67
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:30
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:31
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:32
- [[ParseCommand]] → /home/user/tsdoc-edge/managed/commands/ParseCommand.md:31
- [[TestRelationshipsCommand]] → /home/user/tsdoc-edge/managed/commands/TestRelationshipsCommand.md:31
- [[ValidateDocsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateDocsCommand.md:29
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:215
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:216
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:283
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:232
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:134
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:277
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:318
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:319
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:283
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:144
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:183
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:207
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:208
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:51
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:53
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:198
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:64
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:80
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:101

