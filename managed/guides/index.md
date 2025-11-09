---
title: Guides & Tutorials
type: index
category: guides
status: active
canonical: true
entrypoint: true
---

# [[Guides & Tutorials]]

> **Complete guides** for common workflows, analysis tasks, and documentation practices

Learn how to effectively use TSDoc Edge for building, analyzing, and documenting your TypeScript codebase.

## Getting Started

New to TSDoc Edge? Start here:

1. [[Build Pipeline Guide]] (`build-pipeline-guide.md`) - Learn the build process
2. [[Relationship Analysis Guide]] (`relationship-analysis-guide.md`) - Understand relationships
3. [[Work Context Workflow]] (`../workflows/work-context-workflow.md`) - Daily workflow

## Build & Extract

### [[Build Pipeline Guide]]

**Path**: `managed/guides/build-pipeline-guide.md`

Complete guide to the TSDoc Edge build pipeline from source code to queryable symbol graph.

**What You'll Learn**:
- Symbol extraction with [[ASTSymbolExtractor]] (`../analyzers/ASTSymbolExtractor.md`)
- Relationship detection ([[Code Dependency]], [[Call Relationships]], [[IO Dependency]])
- Database storage with [[DatabaseManager]] (`../core-components/DatabaseManager.md`)
- Query patterns and optimization

**Pipeline Overview**:
```
TypeScript Source
  ↓
[[ASTSymbolExtractor]]
  ↓
[[DatabaseManager]]
  ↓
[[CallGraphAnalyzer]] + [[IODependencyAnalyzer]]
  ↓
36,050+ Relationships
```

**Time**: ~15 minutes read

**Prerequisites**: Basic TypeScript knowledge

**Output**: Understanding of complete build pipeline

---

## Analyze Relationships

### [[Relationship Analysis Guide]]

**Path**: `managed/guides/relationship-analysis-guide.md`

Comprehensive guide to analyzing all 17 relationship types tracked by TSDoc Edge.

**What You'll Learn**:
- [[Code Dependency]] (`../relationships/CODE-DEPENDENCY.md`) - Import/export analysis
- [[Call Relationships]] (`../relationships/CALLS.md`) - Function call detection
- [[IO Dependency]] (`../relationships/IO-DEPENDENCY.md`) - Data flow analysis
- [[Pipeline]] (`../relationships/PIPELINE.md`) - Multi-step processing chains
- [[Test Coverage]] (`../relationships/TEST-COVERAGE.md`) - Test relationship tracking

**Relationship Categories**:
1. **Code Space**: [[Code Dependency]], [[Inheritance]], [[Interface Implementation]]
2. **Data Space**: [[IO Dependency]], [[Pipeline]]
3. **Behavior Space**: [[Call Relationships]]
4. **Meta Space**: [[Test Coverage]]
5. **Type Space**: [[Type Dependency]], [[Generic Constraint]]
6. **Quality Space**: [[Circular Dependency]]

**Analysis Workflows**:
- Impact analysis (who uses this?)
- Refactoring safety (what depends on this?)
- Architecture validation (circular deps?)

**Time**: ~20 minutes read

**Prerequisites**: Completed build pipeline

**Output**: Mastery of relationship queries

---

## Documentation Workflows

### [[Work Context Workflow]]

**Path**: `managed/workflows/work-context-workflow.md`

Primary workflow for getting complete context before modifying any file.

**Command**: `tsdoc-edge work-context <file-path>`

**What You'll Learn**:
- Pre-modification context gathering
- Understanding file dependencies
- Impact analysis before changes

**Time**: ~5 minutes read

---

### [[Mermaid Entrypoint Workflow]]

**Path**: `managed/workflows/mermaid-entrypoint-workflow.md`

Complete workflow for creating diagram-based documentation.

**What You'll Learn**:
- Designing `.mmd` diagrams
- Generating docs with [[ParseMermaidCommand]]
- Promoting symbols with [[PromoteSymbolCommand]]
- Exploring with [[ExploreEntrypointCommand]]

**Example**: [[EXAMPLE-MERMAID-WORKFLOW]] - Real-world case showing 14.3% → 95.1% coverage

**Time**: ~25 minutes read

---

## Core Concepts

### Relationship Types

**Master Index**: [[Relationship Types]] (`../relationships/index.md`)

Understand all 17 relationship types:
- 10 implemented ✅
- 7 planned for future phases

**Key Relationships**:
- [[Code Dependency]] - 1,968 relationships
- [[IO Dependency]] - 6,705 relationships
- [[Call Relationships]] - 1,511 relationships
- [[Pipeline]] - 25,809 chains

---

### Analyzers & Extractors

**Master Index**: [[Analyzers & Extractors]] (`../analyzers/index.md`)

Understand the 20+ analyzers powering TSDoc Edge:

**Primary Analyzers**:
- [[ASTSymbolExtractor]] (`../analyzers/ASTSymbolExtractor.md`) - Symbol extraction
- [[CallGraphAnalyzer]] (`../analyzers/CallGraphAnalyzer.md`) - Call detection
- [[IODependencyAnalyzer]] (`../analyzers/IODependencyAnalyzer.md`) - Data flow
- [[CodeHealthChecker]] (`../analyzers/CodeHealthChecker.md`) - Quality metrics

---

### Core Components

**Storage**: [[DatabaseManager]] (`../core-components/DatabaseManager.md`)
- SQLite + JSONL hybrid storage
- O(log n) lookups
- FTS5 full-text search

**Graph**: [[SymbolGraphBuilder]]
- Symbol graph construction
- Relationship indexing

**Search**: [[SymbolSearchEngine]]
- Fast symbol lookup
- Full-text search

---

## Feature Documentation

### Analysis Features

**Path**: `../features/analysis-features.md`

**Commands Covered**:
- [[HealthCommand]] - Code health reports
- [[AnalyzeCommand]] - Comprehensive analysis
- [[StatsCommand]] - Project statistics
- [[DepsCommand]] - Dependency queries
- [[WhoUsesCommand]] - Reverse dependency queries

See: [[AnalysisFeatures]] (`../features/analysis-features.md`)

---

### Validation Features

**Path**: `../features/validation-features.md`

**Commands Covered**:
- [[ValidateCommand]] - Project validation
- [[ValidateDocsCommand]] - Documentation validation
- [[ValidateSymbolRefsCommand]] - Symbol reference validation

See: [[ValidationFeatures]] (`../features/validation-features.md`)

---

## Quick Reference

### Common Commands

**Build & Extract**:
```bash
tsdoc-edge build src
tsdoc-edge parse <file>
```

**Analyze Relationships**:
```bash
tsdoc-edge analyze-calls
tsdoc-edge analyze-io
tsdoc-edge analyze-pipeline
```

**Query**:
```bash
tsdoc-edge deps <symbol>
tsdoc-edge who-uses <symbol>
tsdoc-edge search <query>
```

**Quality**:
```bash
tsdoc-edge health <path>
tsdoc-edge validate
tsdoc-edge detect-circular-types
```

**Documentation**:
```bash
tsdoc-edge work-context <file>
tsdoc-edge explore-entrypoint <doc>
tsdoc-edge parse-mermaid <diagram>
```

---

## Learning Path

### Beginner (1 hour)

1. **Read**: [[Build Pipeline Guide]] (15 min)
2. **Practice**: `tsdoc-edge build src` (5 min)
3. **Read**: [[Work Context Workflow]] (5 min)
4. **Practice**: `tsdoc-edge work-context <file>` (5 min)
5. **Read**: [[CoreWorkflow]] (`../features/core-workflow.md`) (15 min)
6. **Explore**: Commands from [[Commands Index]] (`../COMMANDS.md`) (15 min)

**Goal**: Understand basic build and query workflow

---

### Intermediate (2 hours)

1. **Read**: [[Relationship Analysis Guide]] (20 min)
2. **Practice**: Analyze all relationship types (20 min)
3. **Read**: [[AnalysisFeatures]] (15 min)
4. **Practice**: Run health, stats, deps commands (15 min)
5. **Read**: Analyzer documentation (30 min)
6. **Explore**: Database queries (20 min)

**Goal**: Master relationship analysis and queries

---

### Advanced (4 hours)

1. **Read**: [[Mermaid Entrypoint Workflow]] (25 min)
2. **Practice**: Create diagram-based docs (45 min)
3. **Read**: All relationship type docs (60 min)
4. **Read**: All analyzer docs (60 min)
5. **Practice**: Custom analysis workflows (30 min)
6. **Integrate**: CI/CD setup (20 min)

**Goal**: Full mastery of TSDoc Edge capabilities

---

## Related Documentation

**Core**:
- [[README]] (`../README.md`) - Main documentation hub
- [[Commands Index]] (`../COMMANDS.md`) - All 61 commands

**Features**:
- [[CoreWorkflow]] (`../features/core-workflow.md`)
- [[AnalysisFeatures]] (`../features/analysis-features.md`)
- [[ValidationFeatures]] (`../features/validation-features.md`)
- [[SymbolGraphFeatures]] (`../features/symbol-graph.md`)
- [[DocumentSymbolSystem]] (`../features/document-symbol-system.md`)
- [[AutoIndexing]] (`../features/auto-indexing.md`)

**Relationships**:
- [[Relationship Types]] (`../relationships/index.md`)
- [[Code Dependency]] (`../relationships/CODE-DEPENDENCY.md`)
- [[Call Relationships]] (`../relationships/CALLS.md`)
- [[IO Dependency]] (`../relationships/IO-DEPENDENCY.md`)
- [[Pipeline]] (`../relationships/PIPELINE.md`)

**Analyzers**:
- [[Analyzers & Extractors]] (`../analyzers/index.md`)
- [[ASTSymbolExtractor]] (`../analyzers/ASTSymbolExtractor.md`)
- [[CallGraphAnalyzer]] (`../analyzers/CallGraphAnalyzer.md`)
- [[IODependencyAnalyzer]] (`../analyzers/IODependencyAnalyzer.md`)
- [[CodeHealthChecker]] (`../analyzers/CodeHealthChecker.md`)

**Core Components**:
- [[DatabaseManager]] (`../core-components/DatabaseManager.md`)

**Concepts**:
- [[Integration Test Traceability]] (`../concepts/integration-test-traceability.md`)
- [[Parallel Work Theory]] (`../concepts/parallel-work-theory.md`)

**Types**:
- [[TsdocEdgeConfig]] (`../primary-types/TsdocEdgeConfig.md`)
- [[ExtractionResult]] (`../primary-types/ExtractionResult.md`)
- [[AnalysisReport]] (`../primary-types/AnalysisReport.md`)

---

**Last Updated**: 2025-11-08
**Total Guides**: 2 comprehensive guides + 3 workflows
**Coverage**: Build pipeline, relationship analysis, documentation workflows
