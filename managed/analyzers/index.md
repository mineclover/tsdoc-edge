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

- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:295
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:296
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:125
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:157
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:364
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:365
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:202
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:203
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:264
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:265
- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:234
- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:235
- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:236
- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:237
- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:238
- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:239
- [[CoverageParser]] → /home/user/tsdoc-edge/managed/analyzers/CoverageParser.md:34
- [[CoverageParser]] → /home/user/tsdoc-edge/managed/analyzers/CoverageParser.md:35
- [[CoverageSyncAdapter]] → /home/user/tsdoc-edge/managed/analyzers/CoverageSyncAdapter.md:31
- [[CoverageSyncAdapter]] → /home/user/tsdoc-edge/managed/analyzers/CoverageSyncAdapter.md:32
- [[DataFlowAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DataFlowAnalyzer.md:31
- [[DataFlowAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DataFlowAnalyzer.md:32
- [[DependencyChainAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DependencyChainAnalyzer.md:34
- [[DependencyChainAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DependencyChainAnalyzer.md:35
- [[DependencyResolver]] → /home/user/tsdoc-edge/managed/analyzers/DependencyResolver.md:35
- [[DependencyResolver]] → /home/user/tsdoc-edge/managed/analyzers/DependencyResolver.md:36
- [[DocumentationAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DocumentationAnalyzer.md:151
- [[DocumentationAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DocumentationAnalyzer.md:152
- [[DomainStructureAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DomainStructureAnalyzer.md:31
- [[DomainStructureAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DomainStructureAnalyzer.md:32
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:34
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:35
- [[ImportanceClassifier]] → /home/user/tsdoc-edge/managed/analyzers/ImportanceClassifier.md:31
- [[ImportanceClassifier]] → /home/user/tsdoc-edge/managed/analyzers/ImportanceClassifier.md:32
- [[IntegrationCoverageCalculator]] → /home/user/tsdoc-edge/managed/analyzers/IntegrationCoverageCalculator.md:30
- [[IntegrationCoverageCalculator]] → /home/user/tsdoc-edge/managed/analyzers/IntegrationCoverageCalculator.md:31
- [[InterfaceAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/InterfaceAnalyzer.md:31
- [[InterfaceAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/InterfaceAnalyzer.md:32
- [[InterfaceDependencyMapper]] → /home/user/tsdoc-edge/managed/analyzers/InterfaceDependencyMapper.md:33
- [[InterfaceDependencyMapper]] → /home/user/tsdoc-edge/managed/analyzers/InterfaceDependencyMapper.md:34
- [[IstanbulCoverageAdapter]] → /home/user/tsdoc-edge/managed/analyzers/IstanbulCoverageAdapter.md:35
- [[IstanbulCoverageAdapter]] → /home/user/tsdoc-edge/managed/analyzers/IstanbulCoverageAdapter.md:36
- [[MissingLinkDetector]] → /home/user/tsdoc-edge/managed/analyzers/MissingLinkDetector.md:31
- [[MissingLinkDetector]] → /home/user/tsdoc-edge/managed/analyzers/MissingLinkDetector.md:32
- [[ParallelWorkDetector]] → /home/user/tsdoc-edge/managed/analyzers/ParallelWorkDetector.md:33
- [[ParallelWorkDetector]] → /home/user/tsdoc-edge/managed/analyzers/ParallelWorkDetector.md:34
- [[PreCommitChecker]] → /home/user/tsdoc-edge/managed/analyzers/PreCommitChecker.md:31
- [[PreCommitChecker]] → /home/user/tsdoc-edge/managed/analyzers/PreCommitChecker.md:32
- [[ReliabilityChecker]] → /home/user/tsdoc-edge/managed/analyzers/ReliabilityChecker.md:30
- [[ReliabilityChecker]] → /home/user/tsdoc-edge/managed/analyzers/ReliabilityChecker.md:31
- [[TestCoverageAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestCoverageAnalyzer.md:43
- [[TestCoverageAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestCoverageAnalyzer.md:44
- [[TestRelationshipAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestRelationshipAnalyzer.md:33
- [[TestRelationshipAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/TestRelationshipAnalyzer.md:34
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:35
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:36
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:37
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:38
- [[AnalyzeChainsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeChainsCommand.md:33
- [[AnalyzeChainsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeChainsCommand.md:34
- [[AnalyzeCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCommand.md:37
- [[AnalyzeCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCommand.md:38
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:33
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:34
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:35
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:36
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:75
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:76
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:77
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:78
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:79
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:80
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:38
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:39
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:40
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:41
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:42
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:43
- [[ParseCommand]] → /home/user/tsdoc-edge/managed/commands/ParseCommand.md:36
- [[ParseCommand]] → /home/user/tsdoc-edge/managed/commands/ParseCommand.md:37
- [[TestRelationshipsCommand]] → /home/user/tsdoc-edge/managed/commands/TestRelationshipsCommand.md:34
- [[TestRelationshipsCommand]] → /home/user/tsdoc-edge/managed/commands/TestRelationshipsCommand.md:35
- [[ValidateDocsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateDocsCommand.md:31
- [[ValidateDocsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateDocsCommand.md:32
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:223
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:224
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:225
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:226
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:303
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:304
- [[Analyzer Status]] → /home/user/tsdoc-edge/managed/features/analyzer-status.md:281
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:241
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:242
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:134
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:277
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:332
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:333
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:334
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:335
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:283
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:364
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:144
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:183
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:212
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:213
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:214
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:215
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:57
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:58
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:63
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:64
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:232
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:233
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:70
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:71
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:87
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:88
- [[Types Index]] → /home/user/tsdoc-edge/managed/types/index.md:349
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:109
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:110
- [[Utilities Index]] → /home/user/tsdoc-edge/managed/utilities/index.md:417

