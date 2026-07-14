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

## Compiler toolchain

Repository builds, type checks, and watch mode use `ttsc@0.18.4` with the native
TypeScript `7.0.2` stable compiler:

```bash
npm run ttsc:version
npm run typecheck
npm run build
npm run dev
```

`npm run build` removes `dist/` before compiling so deleted TS5 analyzers cannot
survive as stale JavaScript or declaration files in the published package.

`scripts/run-ttsc.cjs` resolves the platform package installed by the
`typescript-native` alias and passes its absolute binary path to `ttsc`. This
keeps the build compiler independent from the `typescript` 5.x package still
used by the legacy Compiler API analyzers and `ts-node`.
Optional dependencies must remain enabled during `npm install`, because both
`ttsc` and `typescript-native` obtain their platform binaries through optional
packages.

`tsconfig.ttsc.json` uses Node16 module semantics required by the TS7 compiler.
The old `build:legacy`, `typecheck:legacy`, and `dev:legacy` scripts have been
removed after the stable TS7 lane passed build, CLI, LSP, and test gates. The
`typescript` 5.x package remains a runtime dependency while syntax/document
analyzers and the unsaved-buffer LSP path still use the Compiler API.

Tests use the same TS7 authority through a separate deterministic lane:

```bash
npm run test:typecheck # source/test/setup no-emit gate
npm run test:compile   # emit .test-dist and copy runtime assets
npm run test:run       # validate manifest, then execute emitted JavaScript
npm test               # run all three gates in order
npm run test:watch     # serial compile/test rerun on source changes
```

`ts-jest` is not part of this pipeline. `babel-jest` receives emitted JavaScript only and
preserves Jest mock hoisting; external source maps restore stack traces and coverage to
`src/*.ts`. Standalone `test:run` rejects missing, stale, or modified `.test-dist` output using
the compile completion manifest. The conservative watch coordinator uses one-shot compile/test
cycles and does not depend on persistent compiler output-directory watcher semantics.

## Canonical graph analysis

`src/graph-analysis/` indexes one immutable `CanonicalProjectGraph` and exposes
unambiguous `dependencies` (outgoing), `dependents` (incoming), change impact,
degree metrics, raw-kind summaries, and relationship projection. Unknown edge
kinds stay in the canonical graph and are not guessed into the legacy ontology.

The first migrated analyzer is `--type=structural`. This is TSDoc Edge's local
structural relationship projection over compiler-resolved `accesses`,
`instantiates`, `extends`, and `implements` facts. It no longer creates a
TypeScript 5 program and rescans heritage clauses:

```bash
export TSDOC_EDGE_GRAPH_ROUTER_MODULE=/path/to/ttsc-graph-router/dist/artifact-source.js
tsdoc-edge relationship analyze --type=structural
```

The default router config is `ttsc-graph-router.config.json`, and the default
repo id is the current directory name. Override them with `--router-config` and
`--router-repo`. The module path is explicit until the private graph-router
package has an installable distribution contract.

The graph-router boundary is pinned to raw artifact contract `1.0.0`. The adapter
validates its saved-file/raw capability record and complete producer, router,
cache, project, and tsconfig provenance before `ProjectIndexer` accepts the dump.
Actual compiler version remains unreported (`null`); the TypeScript 7.0 value is
a compatibility target, not fabricated compiler provenance. When the router
advertises `diagnosticsCollected`, numeric compiler codes, source ranges, origin,
and related node ids are normalized into the versioned diagnostics contract and
stored in the canonical repository's separate diagnostics plane. Invalid shapes
fail closed at the adapter boundary.

`GraphRepository` now stores each complete canonical
`path#qualifiedName:kind` node/edge revision in `.tsdoc/canonical-graph.db`.
Revision, nodes, edges, aliases, diagnostics, and the active pointer change in one SQLite transaction;
rollback preserves the old graph, and rename/delete removes stale nodes and
incident edges together. These tables are separate from legacy symbols and
relationships. Structural ontology projections therefore remain read-only with
respect to the legacy DB, while the source canonical snapshot is persisted.
`--type=all` requires a router module instead of silently skipping this plane.

`BuildCommand` performs the same canonical refresh before its legacy per-file
hash short-circuit only when `--canonical-graph` (or
`TSDOC_EDGE_CANONICAL_GRAPH=1`) explicitly enables it. The router module and
config variables are parameters, not implicit activation switches, so an LSP
environment cannot silently change ordinary Build behavior:

```bash
tsdoc-edge build src --canonical-graph \
  --router-module=/path/to/ttsc-graph-router/dist/artifact-source.js
```

Use `--canonical-only` for a graph-only CI/PoC refresh that must not open or mutate the legacy
symbol database or registry:

```bash
tsdoc-edge build src --canonical-graph --canonical-only \
  --router-module=/path/to/ttsc-graph-router/dist/artifact-source.js
```

The packed external saved CLI/CI pilot is available as a repeatable release-style canary:

```bash
npm run poc:ttsc-core
```

이미 현재 `dist`를 빌드한 상태라면 `npm run verify:ttsc-external-pilot`만 실행해도 된다.

It installs fresh `tsdoc-edge` and graph-router tarballs into two temporary consumers, then proves
that each consumer can build the saved canonical graph, run canonical structural analysis, produce
canonical-only `work-context`, extract a managed spec binding, load source-mapped Jest evidence,
load TSDoc enrichment, pass a revision-pinned convention check, and reproduce the same result
through the packed `dist/index` public library API without creating or mutating the legacy symbol
database. This closes the packed public-library POC. CI/release qualification also checks out and
builds the `ttsc-ex` graph provider before running the same packed canary; the actual Node/OS matrix
result remains a release gate.

The CI/release checkout uses the private provider's immutable ref. Configure a fine-grained
read-only token for `mineclover/ttsc-ex` as the `TTSC_EX_READ_TOKEN` repository secret before
running the external qualification workflow; the default `tsdoc-edge` `GITHUB_TOKEN` cannot read
another private repository.

The self-repository CLI/library parity pilot is available after a canonical graph has been built:

```bash
npm run verify:ttsc-library-self
```

It uses `managed/conventions/tsdoc-edge-core.json` and the active `.tsdoc/canonical-graph.db`,
then confirms that the CLI and the public library API produce identical check/gate identities
without mutating the graph, registry, or legacy symbol databases.

The runner-level preflight for the remaining release matrix is:

```bash
npm run verify:runtime-contract
```

It checks the declared Node 24 engine, a real `better-sqlite3` native query, and the packed file
set. The cross-OS/worker-mode matrix still must pass in CI before stable release.

The first read-only legacy differential slice is available as a versioned fixture:

```bash
npm run verify:work-context-differential
```

It restores one legacy Build database and one canonical graph in a temporary workspace, compares
`work-context` in legacy-only and compiler-only modes, runs the legacy AST parity adapter, and
verifies that both database planes and the registry remain byte-for-byte unchanged. This is
intentionally a narrow C1 baseline; compiler-only output does not claim to reproduce legacy
documentation/test enrichment, and broader capability ownership remains a later C2 gate.

The legacy symbol/document/test enrichment remains available during migration,
but the redundant second `InheritanceAnalyzer` pass has been removed. Canonical
topology and legacy enrichment are separate data planes rather than mixed IDs.

## Overview

> 코드 그래프 생성과 저장의 canonical 경로는
> `graph-router -> [[ProjectIndexer]] -> GraphRepository`다. 아래
> `ASTSymbolExtractor -> DatabaseManager` 흐름은 문서·테스트·endpoint·block
> enrichment를 유지하는 legacy data plane이며 canonical IDs와 섞지 않는다.

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
   - Writes symbols to configured SQLite (`.tsdoc.db` by default)
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
  "databasePath": ".tsdoc.db",
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
