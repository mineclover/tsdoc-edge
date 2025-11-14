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
- README (`../README.md`) - Main documentation hub
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

---

## Backlinks

### Referenced By

- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:298
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:299
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:300
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:301
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:12
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:74
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:90
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:454
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:455
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:456
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:232
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:233
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:234
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:235
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:236
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:237
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:284
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:285
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:286
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:287
- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:263
- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:264
- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:265
- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:266
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:48
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:49
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:50
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:51
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:365
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:366
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:367
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:368
- [[AnalyzeCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCommand.md:47
- [[AnalyzeCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCommand.md:48
- [[DepsCommand]] → /home/user/tsdoc-edge/managed/commands/DepsCommand.md:161
- [[DepsCommand]] → /home/user/tsdoc-edge/managed/commands/DepsCommand.md:162
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:43
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:44
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:66
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:67
- [[ParseMermaidCommand]] → /home/user/tsdoc-edge/managed/commands/ParseMermaidCommand.md:66
- [[ParseMermaidCommand]] → /home/user/tsdoc-edge/managed/commands/ParseMermaidCommand.md:67
- [[PromoteSymbolCommand]] → /home/user/tsdoc-edge/managed/commands/PromoteSymbolCommand.md:40
- [[PromoteSymbolCommand]] → /home/user/tsdoc-edge/managed/commands/PromoteSymbolCommand.md:41
- [[StatsCommand]] → /home/user/tsdoc-edge/managed/commands/StatsCommand.md:192
- [[StatsCommand]] → /home/user/tsdoc-edge/managed/commands/StatsCommand.md:193
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:49
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:50
- [[ValidateDocsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateDocsCommand.md:47
- [[ValidateDocsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateDocsCommand.md:48
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:66
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:67
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:167
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:168
- [[Concepts Index]] → /home/user/tsdoc-edge/managed/concepts/index.md:256
- [[Concepts Index]] → /home/user/tsdoc-edge/managed/concepts/index.md:284
- [[Integration Test Traceability]] → /home/user/tsdoc-edge/managed/concepts/integration-test-traceability.md:185
- [[Integration Test Traceability]] → /home/user/tsdoc-edge/managed/concepts/integration-test-traceability.md:186
- [[Parallel Work Theory]] → /home/user/tsdoc-edge/managed/concepts/parallel-work-theory.md:278
- [[Parallel Work Theory]] → /home/user/tsdoc-edge/managed/concepts/parallel-work-theory.md:279
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:310
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:311
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:312
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:313
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:314
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:315
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:366
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:367
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:368
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:369
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:370
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:371
- [[AutoIndexing]] → /home/user/tsdoc-edge/managed/features/auto-indexing.md:211
- [[AutoIndexing]] → /home/user/tsdoc-edge/managed/features/auto-indexing.md:212
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:247
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:248
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:249
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:250
- [[DocumentSymbolSystem]] → /home/user/tsdoc-edge/managed/features/document-symbol-system.md:153
- [[DocumentSymbolSystem]] → /home/user/tsdoc-edge/managed/features/document-symbol-system.md:154
- [[Features Index]] → /home/user/tsdoc-edge/managed/features/index.md:225
- [[Features Index]] → /home/user/tsdoc-edge/managed/features/index.md:245
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:342
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:343
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:303
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:304
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:305
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:306
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:291
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:292
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:293
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:294
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:368
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:369
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:370
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:371
- [[AnalysisReport]] → /home/user/tsdoc-edge/managed/primary-types/AnalysisReport.md:131
- [[AnalysisReport]] → /home/user/tsdoc-edge/managed/primary-types/AnalysisReport.md:132
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:121
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:122
- [[TsdocEdgeConfig]] → /home/user/tsdoc-edge/managed/primary-types/TsdocEdgeConfig.md:131
- [[TsdocEdgeConfig]] → /home/user/tsdoc-edge/managed/primary-types/TsdocEdgeConfig.md:132
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:108
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:148
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:233
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:234
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:235
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:236
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:73
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:74
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:75
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:76
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:77
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:78
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:79
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:80
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:81
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:82
- [[Circular Dependency]] → /home/user/tsdoc-edge/managed/relationships/CIRCULAR.md:24
- [[Circular Dependency]] → /home/user/tsdoc-edge/managed/relationships/CIRCULAR.md:25
- [[Generic Constraint]] → /home/user/tsdoc-edge/managed/relationships/GENERIC-CONSTRAINT.md:25
- [[Generic Constraint]] → /home/user/tsdoc-edge/managed/relationships/GENERIC-CONSTRAINT.md:26
- [[Inheritance]] → /home/user/tsdoc-edge/managed/relationships/INHERITANCE.md:29
- [[Inheritance]] → /home/user/tsdoc-edge/managed/relationships/INHERITANCE.md:30
- [[Interface Implementation]] → /home/user/tsdoc-edge/managed/relationships/INTERFACE-IMPL.md:30
- [[Interface Implementation]] → /home/user/tsdoc-edge/managed/relationships/INTERFACE-IMPL.md:31
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:34
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:35
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:36
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:37
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:38
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:39
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:40
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:41
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:44
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:45
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:46
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:47
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:44
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:45
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:78
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:79
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:80
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:81
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:82
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:83
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:84
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:85
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:86
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:87
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:288
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:289
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:290
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:291
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:86
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:87
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:88
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:89
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:90
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:91
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:92
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:93
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:94
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:95
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:179
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:180
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:115
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:116
- [[Workflows Index]] → /home/user/tsdoc-edge/managed/workflows/index.md:197
- [[Workflows Index]] → /home/user/tsdoc-edge/managed/workflows/index.md:209
- [[Mermaid Entrypoint Workflow]] → /home/user/tsdoc-edge/managed/workflows/mermaid-entrypoint-workflow.md:310
- [[Mermaid Entrypoint Workflow]] → /home/user/tsdoc-edge/managed/workflows/mermaid-entrypoint-workflow.md:311
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:268
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:269
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:270
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:271

