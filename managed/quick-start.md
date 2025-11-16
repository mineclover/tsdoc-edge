---
title: Quick Start Guide
type: guide
category: getting-started
status: active
canonical: true
---

# [[Quick Start Guide]]

> **Get started with TSDoc Edge in 5 minutes** - Essential commands and workflows

## Installation

```bash
npm install -g tsdoc-edge
# or
npm install --save-dev tsdoc-edge
```

## First Steps

### 1. Initialize Project

```bash
tsdoc-edge init
```

**What it does**:
- Creates `.tsdoc/` directory
- Generates `.tsdoc.config.json`
- Sets up database schema

**Output**:
```
✓ Initialized TSDoc Edge
✓ Created .tsdoc/symbols.db
✓ Created .tsdoc.config.json
```

---

### 2. Build Symbol Graph

```bash
tsdoc-edge build src
```

**What it does**:
- Extracts symbols via [[ASTSymbolExtractor]] (`managed/analyzers/ASTSymbolExtractor.md`)
- Detects relationships via [[Code Dependency]] (`managed/relationships/CODE-DEPENDENCY.md`)
- Stores in [[DatabaseManager]] (`managed/core-components/DatabaseManager.md`)

**Output**:
```
Extracted: 1,511 symbols
Relationships: 1,968 code dependencies
Time: ~2-3 seconds
```

**Learn More**: [[Build Pipeline Guide]] (`managed/guides/build-pipeline-guide.md`)

---

### 3. Analyze Relationships

```bash
# Detect function calls
tsdoc-edge analyze-calls

# Detect data flow
tsdoc-edge analyze-io

# Detect pipeline chains
tsdoc-edge analyze-pipeline
```

**What it does**:
- [[CallGraphAnalyzer]] (`managed/analyzers/CallGraphAnalyzer.md`) - Function call relationships
- [[IODependencyAnalyzer]] (`managed/analyzers/IODependencyAnalyzer.md`) - Data flow analysis
- [[Pipeline]] (`managed/relationships/PIPELINE.md`) - Multi-step processing chains

**Output**:
```
Call relationships: 1,511
I/O dependencies: 6,705
Pipeline chains: 25,809
```

**Learn More**: [[Relationship Analysis Guide]] (`managed/guides/relationship-analysis-guide.md`)

---

### 4. Work Context (Most Important!)

```bash
tsdoc-edge work-context <file-path>
```

**Example**:
```bash
tsdoc-edge work-context src/commands/BuildCommand.ts
```

**Output**:
```
Work Context: BuildCommand.ts

📚 Related Documentation (2):
  • [[CoreWorkflow]]
  • [[Build Pipeline Guide]]

🔗 Dependencies (5):
  ASTSymbolExtractor
  DatabaseManager
  SymbolGraph
  ...

🧪 Tests (1):
  ✅ src/__tests__/commands/BuildCommand.test.ts

⚠️  Used By (3 files):
  CLI
  AnalyzeCallsCommand
  ...
```

**Learn More**: [[Work Context Workflow]] (`managed/workflows/work-context-workflow.md`)

---

## Essential Commands

### Query Symbols

```bash
# Search for a symbol
tsdoc-edge search BuildCommand

# Find dependencies
tsdoc-edge deps BuildCommand

# Find who uses a symbol
tsdoc-edge who-uses DatabaseManager
```

---

### Check Quality

```bash
# Code health report
tsdoc-edge health src

# Project statistics
tsdoc-edge stats

# Find undocumented code
tsdoc-edge undocumented
```

**Learn More**: [[AnalysisFeatures]] (`managed/features/analysis-features.md`)

---

### Documentation Management

```bash
# Index documentation
tsdoc-edge index-docs managed

# Validate documentation
tsdoc-edge validate-docs

# Update backlinks
tsdoc-edge update-backlinks
```

**Learn More**: [[Mermaid Entrypoint Workflow]] (`managed/workflows/mermaid-entrypoint-workflow.md`)

---

## Common Workflows

### Workflow 1: Before Modifying a File

```bash
# Get complete context
tsdoc-edge work-context src/services/UserService.ts

# Output shows:
# 1. Related documentation
# 2. Dependencies
# 3. Tests
# 4. Impact (who uses this)
```

---

### Workflow 2: Understanding System Architecture

```bash
# Start from entrypoint
tsdoc-edge explore-entrypoint managed/README.md

# Output shows:
# - Symbol coverage: 9.2%
# - Documentation traversed: 16 files
# - Orphaned code detection
```

**Learn More**: [[Guides & Tutorials]] (`managed/guides/index.md`)

---

### Workflow 3: Refactoring Safely

```bash
# 1. Check dependencies
tsdoc-edge deps OldSymbol

# 2. Check reverse dependencies
tsdoc-edge who-uses OldSymbol

# 3. Check test coverage
tsdoc-edge health src/path/to/file.ts

# 4. Check circular dependencies
tsdoc-edge detect-circular-types
```

**Learn More**: [[Relationship Analysis Guide]] (`managed/guides/relationship-analysis-guide.md`)

---

## Next Steps

### Beginner (1 hour)
1. **Build**: `tsdoc-edge build src`
2. **Analyze**: `tsdoc-edge analyze-calls && tsdoc-edge analyze-io`
3. **Query**: `tsdoc-edge deps <symbol>`
4. **Context**: `tsdoc-edge work-context <file>`

**Read**: [[Build Pipeline Guide]] (`managed/guides/build-pipeline-guide.md`)

---

### Intermediate (2 hours)
1. Understand [[Relationship Types]] (`managed/relationships/index.md`)
2. Use [[AnalysisFeatures]] (`managed/features/analysis-features.md`)
3. Learn [[ValidationFeatures]] (`managed/features/validation-features.md`)
4. Master [[Work Context Workflow]] (`managed/workflows/work-context-workflow.md`)

**Read**: [[Relationship Analysis Guide]] (`managed/guides/relationship-analysis-guide.md`)

---

### Advanced (4 hours)
1. Create diagram-based docs with [[Mermaid Entrypoint Workflow]] (`managed/workflows/mermaid-entrypoint-workflow.md`)
2. Understand all [[Analyzers & Extractors]] (`managed/analyzers/index.md`)
3. Master core components: [[DatabaseManager]], [[SymbolGraphBuilder]]
4. Integrate with CI/CD

**Read**: [[Guides & Tutorials]] (`managed/guides/index.md`)

---

## Configuration

**File**: `.tsdoc.config.json`

```json
{
  "sourceRoot": "src",
  "excludePatterns": [
    "**/*.test.ts",
    "**/node_modules/**"
  ],
  "databasePath": ".tsdoc/symbols.db",
  "jsonlPath": ".tsdoc"
}
```

**Learn More**: [[TsdocEdgeConfig]] (`managed/primary-types/TsdocEdgeConfig.md`)

---

## Troubleshooting

### Build fails
```bash
# Check TypeScript config
cat tsconfig.json

# Install dependencies
npm install
```

### Low coverage
```bash
# Check for orphan code
tsdoc-edge explore-entrypoint managed/README.md --detect-orphans

# Review orphan report
cat ORPHAN-DOCS-REPORT.md
```

### Missing relationships
```bash
# Re-run analyzers
tsdoc-edge analyze-calls
tsdoc-edge analyze-io
tsdoc-edge analyze-pipeline
```

---

## Help & Documentation

**Full Documentation**: README (`managed/README.md`)

**Commands**: [[Commands Index]] (`managed/COMMANDS.md`) - All 61 commands

**Core Concepts**:
- [[Relationship Types]] (`managed/relationships/index.md`) - 17 types
- [[Analyzers & Extractors]] (`managed/analyzers/index.md`) - 20+ analyzers
- Core components: [[DatabaseManager]], [[SymbolGraphBuilder]], [[ConfigManager]]

**Guides**:
- [[Build Pipeline Guide]] (`managed/guides/build-pipeline-guide.md`)
- [[Relationship Analysis Guide]] (`managed/guides/relationship-analysis-guide.md`)
- [[Work Context Workflow]] (`managed/workflows/work-context-workflow.md`)

---

**Last Updated**: 2025-11-08
**Estimated Time**: 5 minutes to first results
**Difficulty**: Beginner-friendly

---

## Backlinks

### Referenced By

- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:314
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:315
- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:316
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:8
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:463
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:272
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:273
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:274
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:306
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:307
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:308
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:69
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:70
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:71
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:376
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:377
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:378
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:379
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:380
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:381
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:61
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:62
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:63
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:367
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:368
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:369
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:370
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:371
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:372
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:373
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:374
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:375
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:405
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:406
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:407
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:408
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:409
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:410
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:330
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:331
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:332
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:316
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:317
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:318
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:319
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:320
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:321
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:497
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:498
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:499
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:500
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:501
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:502
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:391
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:392
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:393
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:394
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:395
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:396
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:397
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:398
- [[TsdocEdgeConfig]] → /home/user/tsdoc-edge/managed/primary-types/TsdocEdgeConfig.md:137
- [[TsdocEdgeConfig]] → /home/user/tsdoc-edge/managed/primary-types/TsdocEdgeConfig.md:138
- [[TsdocEdgeConfig]] → /home/user/tsdoc-edge/managed/primary-types/TsdocEdgeConfig.md:139
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:57
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:58
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:59
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:114
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:115
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:116
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:309
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:310
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:311
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:312
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:313
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:314
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:221
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:222
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:223
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:224
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:225
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:226
- [[Mermaid Entrypoint Workflow]] → /home/user/tsdoc-edge/managed/workflows/mermaid-entrypoint-workflow.md:314
- [[Mermaid Entrypoint Workflow]] → /home/user/tsdoc-edge/managed/workflows/mermaid-entrypoint-workflow.md:315
- [[Mermaid Entrypoint Workflow]] → /home/user/tsdoc-edge/managed/workflows/mermaid-entrypoint-workflow.md:316
- [[Mermaid Entrypoint Workflow]] → /home/user/tsdoc-edge/managed/workflows/mermaid-entrypoint-workflow.md:317
- [[Mermaid Entrypoint Workflow]] → /home/user/tsdoc-edge/managed/workflows/mermaid-entrypoint-workflow.md:318
- [[Mermaid Entrypoint Workflow]] → /home/user/tsdoc-edge/managed/workflows/mermaid-entrypoint-workflow.md:319
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:281
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:282
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:283
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:284
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:285
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:286
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:287
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:288
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:289

