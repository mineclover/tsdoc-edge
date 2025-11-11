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

- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:239
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:240
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:241
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:242
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:12
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:74
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:90
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:221
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:222
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:223
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:224
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:225
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:226
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:278
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:279
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:280
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:281
- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:249
- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:250
- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:251
- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:252
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:44
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:45
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:46
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:47
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:321
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:322
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:323
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:324
- [[AnalyzeCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCommand.md:45
- [[AnalyzeCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCommand.md:46
- [[DepsCommand]] → /home/user/tsdoc-edge/managed/commands/DepsCommand.md:147
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:41
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:42
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:62
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:63
- [[ParseMermaidCommand]] → /home/user/tsdoc-edge/managed/commands/ParseMermaidCommand.md:63
- [[PromoteSymbolCommand]] → /home/user/tsdoc-edge/managed/commands/PromoteSymbolCommand.md:39
- [[PromoteSymbolCommand]] → /home/user/tsdoc-edge/managed/commands/PromoteSymbolCommand.md:40
- [[StatsCommand]] → /home/user/tsdoc-edge/managed/commands/StatsCommand.md:187
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:46
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:47
- [[ValidateDocsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateDocsCommand.md:46
- [[ValidateDocsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateDocsCommand.md:47
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:63
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:64
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:157
- [[Concepts Index]] → /home/user/tsdoc-edge/managed/concepts/index.md:256
- [[Integration Test Traceability]] → /home/user/tsdoc-edge/managed/concepts/integration-test-traceability.md:181
- [[Integration Test Traceability]] → /home/user/tsdoc-edge/managed/concepts/integration-test-traceability.md:182
- [[Parallel Work Theory]] → /home/user/tsdoc-edge/managed/concepts/parallel-work-theory.md:274
- [[Parallel Work Theory]] → /home/user/tsdoc-edge/managed/concepts/parallel-work-theory.md:275
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:295
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:296
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:297
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:298
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:299
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:300
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:337
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:338
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:339
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:340
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:341
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:342
- [[AutoIndexing]] → /home/user/tsdoc-edge/managed/features/auto-indexing.md:204
- [[AutoIndexing]] → /home/user/tsdoc-edge/managed/features/auto-indexing.md:205
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:222
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:223
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:224
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:225
- [[DocumentSymbolSystem]] → /home/user/tsdoc-edge/managed/features/document-symbol-system.md:149
- [[DocumentSymbolSystem]] → /home/user/tsdoc-edge/managed/features/document-symbol-system.md:150
- [[Features Index]] → /home/user/tsdoc-edge/managed/features/index.md:225
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:313
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:314
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:286
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:287
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:288
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:289
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:291
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:292
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:368
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:369
- [[AnalysisReport]] → /home/user/tsdoc-edge/managed/primary-types/AnalysisReport.md:124
- [[AnalysisReport]] → /home/user/tsdoc-edge/managed/primary-types/AnalysisReport.md:125
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:115
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:116
- [[TsdocEdgeConfig]] → /home/user/tsdoc-edge/managed/primary-types/TsdocEdgeConfig.md:125
- [[TsdocEdgeConfig]] → /home/user/tsdoc-edge/managed/primary-types/TsdocEdgeConfig.md:126
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:108
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:148
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:220
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:221
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:68
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:69
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:70
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:71
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:72
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:73
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:74
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:75
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:76
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:77
- [[Circular Dependency]] → /home/user/tsdoc-edge/managed/relationships/CIRCULAR.md:24
- [[Circular Dependency]] → /home/user/tsdoc-edge/managed/relationships/CIRCULAR.md:25
- [[Generic Constraint]] → /home/user/tsdoc-edge/managed/relationships/GENERIC-CONSTRAINT.md:23
- [[Generic Constraint]] → /home/user/tsdoc-edge/managed/relationships/GENERIC-CONSTRAINT.md:24
- [[Inheritance]] → /home/user/tsdoc-edge/managed/relationships/INHERITANCE.md:27
- [[Inheritance]] → /home/user/tsdoc-edge/managed/relationships/INHERITANCE.md:28
- [[Interface Implementation]] → /home/user/tsdoc-edge/managed/relationships/INTERFACE-IMPL.md:28
- [[Interface Implementation]] → /home/user/tsdoc-edge/managed/relationships/INTERFACE-IMPL.md:29
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:31
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:32
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:33
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:34
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:35
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:36
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:37
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:38
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:42
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:43
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:44
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:45
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:41
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:42
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:74
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:75
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:76
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:77
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:78
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:79
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:80
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:81
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:82
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:83
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:232
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:233
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:234
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:235
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:81
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:82
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:83
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:84
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:85
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:86
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:87
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:88
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:89
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:90
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:172
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:173
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:113
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:114
- [[Workflows Index]] → /home/user/tsdoc-edge/managed/workflows/index.md:197
- [[Mermaid Entrypoint Workflow]] → /home/user/tsdoc-edge/managed/workflows/mermaid-entrypoint-workflow.md:309
- [[Mermaid Entrypoint Workflow]] → /home/user/tsdoc-edge/managed/workflows/mermaid-entrypoint-workflow.md:310
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:264
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:265
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:266
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:267

