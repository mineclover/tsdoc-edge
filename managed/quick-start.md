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

- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:238
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:8
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:219
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:273
- [[IODependencyAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/IODependencyAnalyzer.md:40
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:322
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:323
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:40
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:262
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:263
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:264
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:321
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:322
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:270
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:275
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:276
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:277
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:345
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:346
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:351
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:352
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:353
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:354
- [[TsdocEdgeConfig]] → /home/user/tsdoc-edge/managed/primary-types/TsdocEdgeConfig.md:123
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:30
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:67
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:227
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:228
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:138
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:139
- [[Mermaid Entrypoint Workflow]] → /home/user/tsdoc-edge/managed/workflows/mermaid-entrypoint-workflow.md:309
- [[Mermaid Entrypoint Workflow]] → /home/user/tsdoc-edge/managed/workflows/mermaid-entrypoint-workflow.md:310
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:261
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:262
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:263

