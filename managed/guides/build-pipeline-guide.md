---
title: Build Pipeline Guide
type: guide
category: workflow
status: active
canonical: true
---

# [[Build Pipeline Guide]]

> **Complete guide** to the TSDoc Edge build pipeline from source code to queryable symbol graph

Learn how TSDoc Edge extracts symbols, analyzes relationships, and builds a queryable database from your TypeScript codebase.

## Overview

The build pipeline transforms TypeScript source code into a comprehensive symbol graph with relationships:

```
TypeScript Source
  ↓
[[ASTSymbolExtractor]] (extract symbols)
  ↓
Symbol Database
  ↓
[[CallGraphAnalyzer]] (analyze calls)
[[IODependencyAnalyzer]] (analyze data flow)
  ↓
Unified Relationships
  ↓
Queryable Graph
```

## Step 1: Symbol Extraction

**Command**: [[BuildCommand]] (`managed/features/core-workflow.md`)

```bash
tsdoc-edge build src
```

**What Happens**:

1. **File Discovery**
   - Scans directory recursively for `.ts` files
   - Excludes `.d.ts` declaration files
   - Excludes `node_modules`, `dist`, etc.

2. **Symbol Extraction** via [[ASTSymbolExtractor]] (`managed/analyzers/ASTSymbolExtractor.md`)
   - Parses each file with TypeScript Compiler API
   - Extracts: classes, functions, interfaces, types, enums, constants
   - Captures: name, type, location, visibility, types
   - Result: 1,511 symbols from 126 files

3. **Relationship Detection**
   - Import dependencies: `import A from B`
   - Inheritance: `class A extends B`
   - Interface implementation: `class A implements I`
   - Type dependencies: parameter/return types

4. **Storage** via [[DatabaseManager]] (`managed/core-components/DatabaseManager.md`)
   - Writes symbols to SQLite (`.tsdoc/symbols.db`)
   - Creates indexes for fast lookups
   - Exports to JSONL (`.tsdoc/registry.jsonl`)

**Output**:
- Symbols: 1,511 extracted
- Relationships: 1,968 code dependencies
- Time: ~2-3 seconds for full codebase

## Step 2: Call Analysis

**Command**: Part of build or standalone

```bash
tsdoc-edge analyze-calls
```

**What Happens**:

1. **Call Site Detection** via [[CallGraphAnalyzer]] (`managed/analyzers/CallGraphAnalyzer.md`)
   - Scans AST for `ts.CallExpression` nodes
   - Resolves call targets (functions, methods, constructors)
   - Tracks: caller → callee relationships
   - Metadata: call type, location, frequency

2. **Relationship Creation**
   - Type: [[Call Relationships]] (`managed/relationships/CALLS.md`)
   - Stores in `unified_relationships` table
   - Links: function → function calls

**Output**:
- Call relationships: 1,511 detected
- Call graph: Complete function call network

## Step 3: Data Flow Analysis

**Command**: Part of build or standalone

```bash
tsdoc-edge analyze-io
```

**What Happens**:

1. **Producer/Consumer Matching** via [[IODependencyAnalyzer]] (`managed/analyzers/IODependencyAnalyzer.md`)
   - Extract return types (producers)
   - Extract parameter types (consumers)
   - Match: return type == parameter type
   - Confidence scoring: 0.5-1.0

2. **Relationship Creation**
   - Type: [[IO Dependency]] (`managed/relationships/IO-DEPENDENCY.md`)
   - Stores inferred data flow
   - Enables: pipeline detection

**Output**:
- I/O dependencies: 6,705 detected
- Data flow: Complete type flow network

## Step 4: Pipeline Detection

**Command**: Uses I/O dependencies

```bash
tsdoc-edge analyze-pipeline
```

**What Happens**:

1. **Chain Detection**
   - Find A → B → C chains (3+ steps)
   - Type: [[Pipeline]] (`managed/relationships/PIPELINE.md`)
   - Validates: type compatibility

**Output**:
- Pipeline chains: 25,809 detected
- Multi-step flows: Complete processing chains

## Component Integration

### Core Components Used

1. [[ASTSymbolExtractor]] (`managed/analyzers/ASTSymbolExtractor.md`)
   - **Role**: Primary extractor
   - **Input**: TypeScript source files
   - **Output**: ExtractedSymbol[], SymbolRelationship[]

2. [[CallGraphAnalyzer]] (`managed/analyzers/CallGraphAnalyzer.md`)
   - **Role**: Behavioral analysis
   - **Input**: Symbols with AST
   - **Output**: Call relationships

3. [[IODependencyAnalyzer]] (`managed/analyzers/IODependencyAnalyzer.md`)
   - **Role**: Data flow analysis
   - **Input**: Symbols with type info
   - **Output**: I/O dependencies

4. [[DatabaseManager]] (`managed/core-components/DatabaseManager.md`)
   - **Role**: Storage layer
   - **Input**: Symbols, relationships
   - **Output**: Queryable database

### Data Flow

```
Source Files
  ↓ (read)
ASTSymbolExtractor
  ↓ (symbols + relationships)
DatabaseManager.insertSymbol()
  ↓ (persisted)
SQLite Database
  ↓ (query)
CallGraphAnalyzer
IODependencyAnalyzer
  ↓ (relationships)
DatabaseManager.insertRelationship()
  ↓ (persisted)
Unified Relationships Table
  ↓ (export)
JSONL Registry
```

## Build Output

### Database Schema

**Symbols Table**: 1,511 rows
```sql
SELECT id, name, type, file_path FROM symbols LIMIT 3;
-- class-buildcommand | BuildCommand | class | src/commands/BuildCommand.ts
-- function-analyze | analyze | function | src/analyzer/...
```

**Unified Relationships Table**: 36,050+ rows
```sql
SELECT type, COUNT(*) FROM unified_relationships GROUP BY type;
-- code-dependency: 1,968
-- io-dependency: 6,705
-- calls: 1,511
-- pipeline: 25,809
-- ...
```

### JSONL Registry

**Format** (`.tsdoc/registry.jsonl`):
```jsonl
{"id":"class-buildcommand","name":"BuildCommand","type":"class",...}
{"id":"class-databasemanager","name":"DatabaseManager","type":"class",...}
```

**Benefits**:
- Line-by-line format (Git-friendly)
- Human-readable
- Easy to diff/merge

## Usage After Build

### Query Symbols

```bash
# Find a symbol
tsdoc-edge search "BuildCommand"

# Get dependencies
tsdoc-edge deps BuildCommand

# Get reverse dependencies
tsdoc-edge who-uses DatabaseManager

# Find orphans
tsdoc-edge orphans
```

### Analyze Quality

```bash
# Code health report
tsdoc-edge health src

# [[Statistics]]
tsdoc-edge stats

# Find undocumented
tsdoc-edge undocumented

# Find untested
tsdoc-edge untested
```

### Work Context

```bash
# Before modifying a file
tsdoc-edge work-context src/commands/BuildCommand.ts
```

## Customization

### Config (`.tsdoc.config.json`)

```json
{
  "sourceRoot": "src",
  "excludePatterns": [
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/node_modules/**"
  ],
  "databasePath": ".tsdoc/symbols.db",
  "jsonlPath": ".tsdoc"
}
```

### Partial Builds

```bash
# Build specific directory
tsdoc-edge build src/commands

# Parse single file
tsdoc-edge parse src/commands/BuildCommand.ts
```

## Performance

**Full Build** (126 files, 1,511 symbols):
- Symbol extraction: ~2 seconds
- Call analysis: ~100ms
- I/O analysis: ~150ms
- Pipeline detection: ~200ms
- **Total**: ~2.5 seconds

**Incremental** (single file):
- Parse + extract: ~10-20ms
- Update database: ~5ms
- **Total**: ~25ms

## Troubleshooting

### Build Fails

**Issue**: "Cannot find module"
**Solution**: Check `tsconfig.json` paths, ensure dependencies installed

**Issue**: "Out of memory"
**Solution**: Build in smaller chunks, increase Node.js memory

### Slow Build

**Issue**: Build takes >10 seconds
**Solution**:
- Exclude test files
- Reduce sourceRoot scope
- Check for circular dependencies

### Missing Relationships

**Issue**: Expected relationships not found
**Solution**:
- Run `tsdoc-edge analyze-calls` after build
- Run `tsdoc-edge analyze-io` for data flow
- Check if symbols are exported

## Best Practices

### 1. Regular Builds
```bash
# After pulling changes
git pull && tsdoc-edge build src

# Before committing
tsdoc-edge build src && tsdoc-edge health src
```

### 2. CI/CD Integration
```yaml
# .github/workflows/tsdoc.yml
- name: Build symbol graph
  run: tsdoc-edge build src

- name: Check health
  run: tsdoc-edge health src

- name: Commit registry
  run: |
    git add .tsdoc/registry.jsonl
    git commit -m "Update symbol registry"
```

### 3. Pre-commit Hook
```bash
# .git/hooks/pre-commit
#!/bin/bash
tsdoc-edge build src
tsdoc-edge validate-docs managed
```

## Related Documentation

**Commands**:
- [[BuildCommand]] (`managed/features/core-workflow.md`)
- [[AnalyzeCallsCommand]] (analyze-calls)
- [[AnalyzeIOCommand]] (analyze-io)

**Analyzers**:
- [[ASTSymbolExtractor]] (`managed/analyzers/ASTSymbolExtractor.md`)
- [[CallGraphAnalyzer]] (`managed/analyzers/CallGraphAnalyzer.md`)
- [[IODependencyAnalyzer]] (`managed/analyzers/IODependencyAnalyzer.md`)

**Core**:
- [[DatabaseManager]] (`managed/core-components/DatabaseManager.md`)

**Relationships**:
- [[Code Dependency]] (`managed/relationships/CODE-DEPENDENCY.md`)
- [[Call Relationships]] (`managed/relationships/CALLS.md`)
- [[IO Dependency]] (`managed/relationships/IO-DEPENDENCY.md`)
- [[Pipeline]] (`managed/relationships/PIPELINE.md`)

**Features**:
- [[CoreWorkflow]] (`managed/features/core-workflow.md`)
- [[AnalysisFeatures]] (`managed/features/analysis-features.md`)

---

**Last Updated**: 2025-11-08
**Guide Type**: Complete workflow from source to queryable graph
**Audience**: Developers using TSDoc Edge build pipeline

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:101
- [[Analyzer Development Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/analyzer-development-guide.md:270
- [[Guides & Tutorials]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:12
- [[Guides & Tutorials]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:292
- [[Relationship Analysis Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/relationship-analysis-guide.md:335
- [[Quick Start Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/quick-start.md:38
- [[Quick Start Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/quick-start.md:128
- [[Quick Start Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/quick-start.md:187

