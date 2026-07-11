# TSDoc Edge

**Semantic Convention Governance & SSOT Documentation Connectivity Platform**

TSDoc Edge tracks TypeScript symbols and relationships, binds authored specifications to
code evidence, and checks versioned conventions against an exact canonical graph revision.
The first convention loop covers spec-binding conformance; naming and formatting rules remain
separate from this revision-pinned semantic check.

---

## Why TSDoc Edge?

### The Problem

When modifying code in a large TypeScript project, you face these questions:

- "What will break if I change this function?"
- "Where is this type used?"
- "Is there documentation I should update?"
- "Are there tests covering this code?"

Finding answers requires jumping between files, grepping through code, and hoping you didn't miss anything.

### The Solution

**One command before any code change:**

```bash
tsdoc-edge wc src/services/UserService.ts
```

**Output:**
```
Work Context: UserService.ts

📊 Summary
  Symbols: 12 | Relationships: 85 | Test Coverage: 85%

📦 This file depends on:
  → DatabaseManager, Logger, AuthService

🔗 Files that depend on this:
  ← UserController, AdminPanel, UserTests (8 files)

📚 Related Documentation:
  → managed/features/user-management.md

💡 Recommendations:
  • High impact file - review changes carefully
  • 2 test files cover this code
```

Now you know exactly what you're touching before making any changes.

---

## Quick Start

```bash
# Install
npm install -g tsdoc-edge

# Initialize & Build
tsdoc-edge init
tsdoc-edge build src

# Get context before modifying any file (most important!)
tsdoc-edge work-context src/path/to/file.ts
```

The `work-context` command provides everything you need before modifying code:
- Related documentation
- Dependencies and dependents
- Test coverage
- Impact analysis

---

## Key Features

| Feature | Command | Description |
|---------|---------|-------------|
| Work Context | `wc <file>` | Complete context before file modification |
| Relationship Analysis | `relationship stats` | 13 relationship types, 10 categories |
| Impact Analysis | `relationship impact <symbol>` | Change impact assessment |
| Quality Check | `lint` | Code health, docs, tests, relationships |
| Documentation | `index-docs managed` | Index `[[Symbol]]` references |
| Convention Check | `convention check --pack <file>` | Check exact spec bindings with policy and suppressions |

---

## Core Concepts

### Symbol Graph
Every function, class, interface is tracked as a node with relationships:
- **code-dependency**: Import/usage relationships
- **io-dependency**: Data flow (parameters, returns)
- **test-coverage**: Test file relationships
- **calls**: Function call graph

### Document Symbols
Use `[[SymbolName]]` in markdown to create bidirectional links:
```markdown
# [[UserService]]
This service uses [[DatabaseManager]] for storage.
```

---

## Common Workflows

### Before Modifying Code
```bash
tsdoc-edge wc src/services/UserService.ts
```

### Refactoring Safely
```bash
tsdoc-edge relationship query <symbol>  # Dependencies
tsdoc-edge who-uses <symbol>            # Reverse dependencies
tsdoc-edge relationship impact <id>     # Full impact analysis
```

### Quality Checks
```bash
tsdoc-edge lint                  # All checks
tsdoc-edge health src            # Code health report
tsdoc-edge suggest               # Improvement suggestions
```

### Documentation Management
```bash
tsdoc-edge index-docs managed    # Index documents
tsdoc-edge validate-docs         # Validate SSOT
tsdoc-edge update-backlinks      # Update backlinks
```

### Convention Governance

```bash
# Uses the active saved canonical graph revision unless one is pinned
tsdoc-edge convention check \
  --pack managed/conventions/core.json \
  --code-revision <canonical-revision-id> \
  --expected-manifest convention-pack:<sha256> \
  --fail-on error \
  --output .reports/convention.json
```

The result pins the code, spec, policy, rule-set, evidence, binding-resolution, and report
identities. Exit code `1` means an unsuppressed finding reached the selected threshold; input or
revision errors use exit code `2`. Omit `--code-revision` for the current active pointer; supply it
with `--expected-manifest` for a replayable CI/release input pair. See
[Convention Pack Check](managed/features/convention-pack-check.md).

---

## Configuration

Create `.tsdoc.config.json`:

```json
{
  "project": {
    "name": "my-project",
    "srcDirs": ["src"]
  },
  "paths": {
    "databasePath": ".tsdoc.db"
  },
  "documentManagement": {
    "managedDirs": ["managed"]
  }
}
```

---

## Learning Path

```
1. Quick Start (5 min)     → managed/quick-start.md
   ↓
2. Usage Scenarios         → managed/guides/usage-scenarios.md
   ↓
3. Commands Reference      → managed/COMMANDS.md
   ↓
4. Advanced: LSP/IDE       → managed/features/lsp-integration.md
```

## Documentation

| Document | Description |
|----------|-------------|
| [Quick Start](managed/quick-start.md) | 5-minute setup guide |
| [Usage Scenarios](managed/guides/usage-scenarios.md) | Real-world workflows |
| [Commands Index](managed/COMMANDS.md) | CLI command reference |
| [Relationship Guide](managed/guides/relationship-analysis-guide.md) | Dependency analysis |
| [LSP Integration](managed/features/lsp-integration.md) | IDE integration |
| [Convention Pack Check](managed/features/convention-pack-check.md) | Revision-pinned spec-binding governance loop |

---

## Project Structure

```
src/
├── analyzer/      # Code analysis (health, coverage)
├── commands/      # CLI command groups and adapters
├── convention/    # Convention pack compilation and conformance orchestration
├── doc-symbol/    # [[Symbol]] system
├── graph/         # Symbol graph
├── graph-analysis/# Canonical @ttsc/graph queries and projections
├── indexer/       # graph-router adapter + canonical graph assembly
├── lsp/           # LSP server
├── parser/        # TSDoc parsing
├── storage/       # SQLite + JSONL
└── types/         # Type definitions
```

---

## Development

```bash
npm run ttsc:version # Verify ttsc + native TypeScript toolchain
npm run typecheck    # Type-check with ttsc / TypeScript 7
npm run build        # Compile with ttsc
npm run dev          # ttsc watch mode
npm test             # TS7 typecheck + AOT compile + JavaScript-only Jest
npm run test:watch   # Safe serial TS7 compile/test watch loop
```

The build compiler and runtime parser are intentionally separated during the
TypeScript 7 migration. `ttsc` uses the stable `typescript-native` 7.0.2 toolchain,
while the `typescript` 5.x dependency remains the legacy Compiler API used by
syntax/document analyzers and the unsaved-buffer LSP path. Tests are compiled by
TS7 into `.test-dist` before Jest executes JavaScript; `ts-jest` has been removed. The old
`build:legacy`, `typecheck:legacy`, and `dev:legacy` lanes have been removed;
TS5 is a runtime compatibility dependency, not a second build compiler.

The repository test wiring is complete, while the release runtime matrix is still being
qualified. Node 22 with an ABI-matched native dependency has passed the full suite repeatedly;
macOS Node 24/V8 13.6 still shows an intermittent Jest GC crash. See
`managed/workflows/ts7-test-compilation-lane.md` for the exact boundary and remaining gate.

Compiler-resolved structural analysis now uses the canonical graph:

```bash
export TSDOC_EDGE_GRAPH_ROUTER_MODULE=/path/to/ttsc-graph-router/dist/artifact-source.js
tsdoc-edge build src --canonical-graph \
  --graph-workspace=my-workspace \
  --graph-namespace=ttsc:my-workspace
tsdoc-edge relationship analyze --type=structural
```

Build refresh is explicitly opt-in through `--canonical-graph` (or
`TSDOC_EDGE_CANONICAL_GRAPH=1`); setting the router module alone is only
configuration and does not change a normal legacy-enrichment build.

The saved graph provenance always includes a convention/spec workspace and graph
namespace. `--graph-workspace=<id>` and `--graph-namespace=<id>` override
`TSDOC_EDGE_GRAPH_WORKSPACE` and `TSDOC_EDGE_GRAPH_NAMESPACE`. If neither form is
set, the workspace defaults to the router repo ID and the namespace defaults to
`ttsc:<router repo ID>`; the repo ID itself defaults to the project directory name.
Set the same environment values for the LSP so its saved-file refresh addresses the
same canonical graph identity as Build:

```bash
export TSDOC_EDGE_GRAPH_WORKSPACE=my-workspace
export TSDOC_EDGE_GRAPH_NAMESPACE=ttsc:my-workspace
```

`ttsc-graph-router.config.json` routes the current repository. The analysis
reads the router's raw `@ttsc/graph` artifact with `refresh: true`; it does not
assume a separate `.ttsc/graph.json` file. Artifact contract `1.0.0`, raw/saved-file
capabilities, producer/router provenance, and the exact `@ttsc/graph` binary
version are checked before indexing. The complete node/edge snapshot,
collision-safe legacy aliases, and diagnostics plane are atomically replaced in
`.tsdoc/canonical-graph.db`; canonical IDs are never mixed into the legacy symbol
tables. Existing schema-v1 canonical databases remain readable and are promoted
transactionally on the next refresh.

Build, structural analysis, and LSP saved-file refresh share the same
`ProjectIndexer -> GraphRepository` boundary. LSP reads canonical impact,
dependency, symbol, hover, and code-lens data from that revision. Unsaved buffers
still use the TS5 syntax parser, but remain an in-memory canonical `GraphDelta` and
never write SQLite. Matched symbol identities preserve saved topology; new or
renamed symbol edges become authoritative after the next saved-file refresh.
Saved-file refreshes are single-flight/coalesced, and a
Build-created canonical DB is opened read-only when no router module is configured.
Set the same `TSDOC_EDGE_GRAPH_ROUTER_MODULE` when starting the LSP to enable
saved-file whole-project refreshes.

---

## Statistics

| Metric | Value |
|--------|-------|
| CLI Commands | See `tsdoc-edge help --all` |
| Symbols | 6,726 |
| Relationships | 38,704 |
| Relationship Types | 13/28 (46%) |
| Test Suites | 190 |
| Tests | 2,761 |
| Build Time | 11s |

---

## License

MIT
