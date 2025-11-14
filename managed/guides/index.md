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

## Development Guides

Extending TSDoc Edge? These guides show you how:

1. [[CLI Command Development Guide]] (`command-development-guide.md`) - Create new CLI commands
2. [[Analyzer Development Guide]] (`analyzer-development-guide.md`) - Build custom analyzers

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

## Development Guides (Deep Dive)

### [[CLI Command Development Guide]]

**Path**: `managed/guides/command-development-guide.md`

Complete guide to creating new CLI commands for TSDoc Edge.

**What You'll Learn**:
- [[BaseCommand]] pattern (`src/commands/BaseCommand.ts`)
- Command registration in [[CommandRegistry]] (`src/commands/CommandRegistry.ts`)
- Integration with `cli.ts` main entry point
- Testing strategies for commands
- Documentation best practices

**Development Workflow**:
```
1. Create Command Class
   ↓
2. Implement execute() Method
   ↓
3. Register in cli.ts
   ↓
4. Test Command
   ↓
5. Document Command
```

**Code Examples**:
- Simple query command ([[DepsCommand]])
- Analysis command ([[AnalyzeCallsCommand]])
- Documentation command ([[IndexDocsCommand]])
- Complete example: HelloCommand

**Time**: ~30 minutes read
**Prerequisites**: Basic TypeScript, understanding of command pattern
**Output**: Ability to create custom CLI commands

---

### [[Analyzer Development Guide]]

**Path**: `managed/guides/analyzer-development-guide.md`

Complete guide to building custom analyzers for detecting new relationship types.

**What You'll Learn**:
- Analyzer patterns and architecture
- AST-based analysis with TypeScript Compiler API
- Type-based analysis for data flow
- Graph-based analysis for relationships
- Creating [[UnifiedRelationship]] objects

**Analyzer Types**:
1. **Structural**: Detect code structure (imports, inheritance)
2. **Behavioral**: Detect runtime behavior (calls, events)
3. **Type**: Detect type relationships (dependencies, constraints)
4. **Quality**: Detect code health (coverage, complexity)

**Code Examples**:
- AST-based: [[CallGraphAnalyzer]] pattern
- Type-based: [[IODependencyAnalyzer]] pattern
- Graph-based: Dependency chain detection
- Complete example: CompositionAnalyzer

**Best Practices**:
- Performance optimization (Map/Set, single-pass)
- Confidence scoring
- Error handling
- Complete documentation

**Time**: ~45 minutes read
**Prerequisites**: TypeScript, AST concepts, type system understanding
**Output**: Ability to create custom analyzers

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

### Expert / Contributor (8+ hours)

1. **Read**: [[CLI Command Development Guide]] (30 min)
2. **Practice**: Create a simple query command (60 min)
3. **Read**: [[Analyzer Development Guide]] (45 min)
4. **Practice**: Create a simple analyzer (90 min)
5. **Read**: Core source code (`src/commands`, `src/analyzer`) (120 min)
6. **Contribute**: Implement a new feature (120+ min)
7. **Document**: Write specifications for your contribution (60 min)

**Goal**: Contribute new features to TSDoc Edge

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

**Last Updated**: 2025-11-14
**Total Guides**: 4 comprehensive guides + 3 workflows
**Coverage**: Build pipeline, relationship analysis, documentation workflows, development guides (commands & analyzers)

---

## Backlinks

### Referenced By

- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:307
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:308
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:309
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:310
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:311
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:312
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:12
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:74
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:90
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:454
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:455
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:456
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:245
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:246
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:247
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:248
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:249
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:250
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:251
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:252
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:253
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:294
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:295
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:296
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:297
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:298
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:299
- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:276
- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:277
- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:278
- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:279
- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:280
- [[CodeHealthChecker]] → /home/user/tsdoc-edge/managed/analyzers/CodeHealthChecker.md:281
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:57
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:58
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:59
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:60
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:61
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:62
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:368
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:369
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:370
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:371
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:372
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:373
- [[AnalyzeCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCommand.md:56
- [[AnalyzeCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCommand.md:57
- [[AnalyzeCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCommand.md:58
- [[DepsCommand]] → /home/user/tsdoc-edge/managed/commands/DepsCommand.md:166
- [[DepsCommand]] → /home/user/tsdoc-edge/managed/commands/DepsCommand.md:167
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:48
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:49
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:50
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:84
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:85
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:86
- [[ParseMermaidCommand]] → /home/user/tsdoc-edge/managed/commands/ParseMermaidCommand.md:71
- [[ParseMermaidCommand]] → /home/user/tsdoc-edge/managed/commands/ParseMermaidCommand.md:72
- [[PromoteSymbolCommand]] → /home/user/tsdoc-edge/managed/commands/PromoteSymbolCommand.md:46
- [[PromoteSymbolCommand]] → /home/user/tsdoc-edge/managed/commands/PromoteSymbolCommand.md:47
- [[PromoteSymbolCommand]] → /home/user/tsdoc-edge/managed/commands/PromoteSymbolCommand.md:48
- [[StatsCommand]] → /home/user/tsdoc-edge/managed/commands/StatsCommand.md:205
- [[StatsCommand]] → /home/user/tsdoc-edge/managed/commands/StatsCommand.md:206
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:57
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:58
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:59
- [[ValidateDocsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateDocsCommand.md:57
- [[ValidateDocsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateDocsCommand.md:58
- [[ValidateDocsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateDocsCommand.md:59
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:83
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:84
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:85
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:174
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:175
- [[Concepts Index]] → /home/user/tsdoc-edge/managed/concepts/index.md:256
- [[Concepts Index]] → /home/user/tsdoc-edge/managed/concepts/index.md:284
- [[Integration Test Traceability]] → /home/user/tsdoc-edge/managed/concepts/integration-test-traceability.md:190
- [[Integration Test Traceability]] → /home/user/tsdoc-edge/managed/concepts/integration-test-traceability.md:191
- [[Integration Test Traceability]] → /home/user/tsdoc-edge/managed/concepts/integration-test-traceability.md:192
- [[Parallel Work Theory]] → /home/user/tsdoc-edge/managed/concepts/parallel-work-theory.md:285
- [[Parallel Work Theory]] → /home/user/tsdoc-edge/managed/concepts/parallel-work-theory.md:286
- [[Parallel Work Theory]] → /home/user/tsdoc-edge/managed/concepts/parallel-work-theory.md:287
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:353
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:354
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:355
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:356
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:357
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:358
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:359
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:360
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:361
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:388
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:389
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:390
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:391
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:392
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:393
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:394
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:395
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:396
- [[AutoIndexing]] → /home/user/tsdoc-edge/managed/features/auto-indexing.md:217
- [[AutoIndexing]] → /home/user/tsdoc-edge/managed/features/auto-indexing.md:218
- [[AutoIndexing]] → /home/user/tsdoc-edge/managed/features/auto-indexing.md:219
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:262
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:263
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:264
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:265
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:266
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:267
- [[DocumentSymbolSystem]] → /home/user/tsdoc-edge/managed/features/document-symbol-system.md:162
- [[DocumentSymbolSystem]] → /home/user/tsdoc-edge/managed/features/document-symbol-system.md:163
- [[DocumentSymbolSystem]] → /home/user/tsdoc-edge/managed/features/document-symbol-system.md:164
- [[Features Index]] → /home/user/tsdoc-edge/managed/features/index.md:225
- [[Features Index]] → /home/user/tsdoc-edge/managed/features/index.md:246
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:353
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:354
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:355
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:322
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:323
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:324
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:325
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:326
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:327
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:310
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:311
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:312
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:313
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:387
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:388
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:389
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:390
- [[AnalysisReport]] → /home/user/tsdoc-edge/managed/primary-types/AnalysisReport.md:137
- [[AnalysisReport]] → /home/user/tsdoc-edge/managed/primary-types/AnalysisReport.md:138
- [[AnalysisReport]] → /home/user/tsdoc-edge/managed/primary-types/AnalysisReport.md:139
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:124
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:125
- [[ExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/ExtractionResult.md:126
- [[TsdocEdgeConfig]] → /home/user/tsdoc-edge/managed/primary-types/TsdocEdgeConfig.md:134
- [[TsdocEdgeConfig]] → /home/user/tsdoc-edge/managed/primary-types/TsdocEdgeConfig.md:135
- [[TsdocEdgeConfig]] → /home/user/tsdoc-edge/managed/primary-types/TsdocEdgeConfig.md:136
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:108
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:148
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:237
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:238
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:239
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:240
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:83
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:84
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:85
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:86
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:87
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:88
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:89
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:90
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:91
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:92
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:93
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:94
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:95
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:96
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:97
- [[Circular Dependency]] → /home/user/tsdoc-edge/managed/relationships/CIRCULAR.md:29
- [[Circular Dependency]] → /home/user/tsdoc-edge/managed/relationships/CIRCULAR.md:30
- [[Circular Dependency]] → /home/user/tsdoc-edge/managed/relationships/CIRCULAR.md:31
- [[Generic Constraint]] → /home/user/tsdoc-edge/managed/relationships/GENERIC-CONSTRAINT.md:29
- [[Generic Constraint]] → /home/user/tsdoc-edge/managed/relationships/GENERIC-CONSTRAINT.md:30
- [[Generic Constraint]] → /home/user/tsdoc-edge/managed/relationships/GENERIC-CONSTRAINT.md:31
- [[Inheritance]] → /home/user/tsdoc-edge/managed/relationships/INHERITANCE.md:34
- [[Inheritance]] → /home/user/tsdoc-edge/managed/relationships/INHERITANCE.md:35
- [[Inheritance]] → /home/user/tsdoc-edge/managed/relationships/INHERITANCE.md:36
- [[Interface Implementation]] → /home/user/tsdoc-edge/managed/relationships/INTERFACE-IMPL.md:35
- [[Interface Implementation]] → /home/user/tsdoc-edge/managed/relationships/INTERFACE-IMPL.md:36
- [[Interface Implementation]] → /home/user/tsdoc-edge/managed/relationships/INTERFACE-IMPL.md:37
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:41
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:42
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:43
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:44
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:45
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:46
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:47
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:48
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:49
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:50
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:51
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:52
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:57
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:58
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:59
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:60
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:61
- [[Test Coverage]] → /home/user/tsdoc-edge/managed/relationships/TEST-COVERAGE.md:62
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:55
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:56
- [[Type Dependency]] → /home/user/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:57
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:93
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:94
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:95
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:96
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:97
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:98
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:99
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:100
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:101
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:102
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:103
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:104
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:105
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:106
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:107
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:299
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:300
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:301
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:302
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:303
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:304
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:95
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:96
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:97
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:98
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:99
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:100
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:101
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:102
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:103
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:104
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:105
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:106
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:107
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:108
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:109
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:215
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:216
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:217
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:123
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:124
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:125
- [[Workflows Index]] → /home/user/tsdoc-edge/managed/workflows/index.md:197
- [[Workflows Index]] → /home/user/tsdoc-edge/managed/workflows/index.md:210
- [[Mermaid Entrypoint Workflow]] → /home/user/tsdoc-edge/managed/workflows/mermaid-entrypoint-workflow.md:311
- [[Mermaid Entrypoint Workflow]] → /home/user/tsdoc-edge/managed/workflows/mermaid-entrypoint-workflow.md:312
- [[Mermaid Entrypoint Workflow]] → /home/user/tsdoc-edge/managed/workflows/mermaid-entrypoint-workflow.md:313
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:275
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:276
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:277
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:278
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:279
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:280

