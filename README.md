# TSDoc Edge

**Semantic Convention Governance & SSOT Documentation Connectivity Platform**

TSDoc Edge tracks TypeScript symbols and relationships, binds authored specifications to
code evidence, and checks versioned conventions against an exact canonical graph revision.
The first convention loop covers spec-binding conformance; naming and formatting rules remain
separate from this revision-pinned semantic check.

## Three-tier SSOT

The platform keeps one connected source of truth across three layers: `@microsoft/tsdoc` parses
the 29 standard TSDoc tags, `ttsc` with `@ttsc/graph` and `@ttsc/lint` provides the canonical code
graph and 25 error rules, and `tsdoc-edge` owns 22 irreducible domain tags plus document and
specification connectivity. Run `tsdoc-edge sync [--force] [--dry-run] [--check] [--json]` to
refresh or verify the complete pipeline. Use `symbol query` (or `symbol find-method`) for symbol
lookup, `spec` for SpecGraph lifecycle operations, and `convention` for revision-pinned governance
checks.

## Next-Gen `ttsc-doc` Engine

[`ttsc-doc`](/Users/junwoobang/workflow/ttsc-doc) is the Go-native TypeScript 7 companion and
successor engine (`ttsc@0.35.0`) that unifies `tsdoc-edge` and `ttsc-graph-router`. It keeps the
same checkpoint, backlink, and SpecGraph SSOT while replacing the split stores with a resident
`ttscgraph serve` NDJSON session for sub-millisecond incremental and cached queries.

| Current stack | `ttsc-doc` |
|---|---|
| 362 TypeScript files (297 + 65) | 19 Go files, zero runtime dependencies |
| 4 SQLite/JSON DB/cache stores | 0 disk DBs + 1 resident `ttscgraph serve` session |
| Separate backlink and SpecGraph paths | 100% Backlinks & SpecGraph parity across all 299 `managed/` docs and 55 SpecGraph bindings |

Quick start:

```bash
ttsc-doc sync --check                 # add --dry-run or --json as needed
ttsc-doc wc src/commands/BuildCommand.ts
ttsc-doc dc src/commands/BuildCommand.ts
ttsc-doc trace Type.field Target.field
ttsc-doc route impact src/commands/BuildCommand.ts
ttsc-doc mcp                            # unified STDIO MCP server
```

The MCP server exposes ten unified tools: `inspect_typescript_graph`, `graph_repo_map`,
`graph_related_nodes`, `graph_file_dependencies`, `graph_scope_tree`, `graph_changed_impact`,
`tsdoc_work_context`, `tsdoc_design_context`, `tsdoc_trace_data`, and `tsdoc_sync_check`.
Authoring remains portable: use `# [[Checkpoint]]` H1 headings, `@packageDocumentation`,
line-leading `/**` comments with `@doc [[Checkpoint]]`, and `type: project-spec` documents whose
`spec:<Checkpoint> -> REQ-*` edges and `BIND-*` entries name exact `canonicalNodeId` targets.

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

The `Test Coverage` line in this illustrative output refers to test-to-symbol relationship
coverage. It is not Istanbul line/function/branch execution coverage; see the
[Coverage Metrics Contract](managed/features/coverage-metrics-contract.md).

Now you know exactly what you're touching before making any changes.

---

## Quick Start

```bash
# Install
npm install -g tsdoc-edge

# Initialize & Build
tsdoc-edge init
tsdoc-edge build src

# Synchronize code symbols, canonical graph, specs, and managed docs in one step
tsdoc-edge sync [--force] [--dry-run] [--check] [--json]

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
| Unified Sync | `sync [--check]` | 1-step SSOT sync for symbols, canonical `@ttsc/graph`, `SpecGraph`, and backlinks |
| Work Context | `wc <file>` | Complete context before file modification |
| Design Context | `dc <file>` | Spec bindings, `@contract`, and `@decision` view |
| Symbol Query | `symbol query <name>` | Code symbol (`@ttsc/graph`) + `[[Symbol]]` checkpoint lookup |
| 3-Tier Data Trace | `symbol trace <target>` / `relationship trace <target> [to]` | Trace Type/Field roles (`DTO.field`), cross-boundary lineage (`SpecGraph`/`@samchon/typespec-evidence`/`oa-sdk`), and AST code slices |
| Relationship Analysis | `relationship stats` | Canonical `@ttsc/graph` + project relationship metrics |
| Impact Analysis | `relationship impact <symbol>` | Change impact assessment |
| Validation | `validate docs` / `validate tsdoc` | Checkpoint SSOT & Microsoft TSDoc syntax validation |
| System Status | `system-status` / `health` | Multi-plane SSOT health, graph, and coverage dashboard |
| Documentation | `docs index managed` | Index `[[Symbol]]` references |
| Convention Check | `convention check --pack <file>` | Check exact spec bindings with policy and suppressions |
| Convention Inputs | `convention inputs list\|read` | Inspect exact evidence, enrichment, and policy pins read-only |
| Find Method | `symbol find-method <name>` | Find methods by name across the symbol graph |
| Specifications | `spec extract` / `spec metrics` | Compile `SpecGraph` revisions and evaluate specification health |
| Canonical Graph | `canonical-graph status\|list\|read\|prune` | Inspect saved ttsc graph revisions read-only or prune historical revisions |
| Spec Graph | `spec graph status\|list\|read` | Inspect saved managed SpecGraph revisions read-only |
| Coverage Report | `coverage-report [list\|read]` | Inspect SSOT `@doc` coverage and persisted source-identified coverage reports |
| Coverage Baseline | `coverage-baseline save\|compare\|list\|read` | Persist, compare, and inspect immutable metric baselines |

---

## Core Concepts

### Symbol Graph
Every function, class, interface is tracked as a node with relationships:
- **code-dependency**: Import/usage relationships
- **io-dependency**: Data flow (parameters, returns)
- **test-coverage**: Test file → implementation relationships
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
tsdoc-edge symbol who-uses <symbol>     # Reverse dependencies
tsdoc-edge relationship impact <id>     # Full impact analysis
```

### Quality Checks
```bash
npm run lint                       # Biome + @ttsc/lint (25 error rules)
tsdoc-edge sync --check            # Read-only SSOT & backlink verification
tsdoc-edge validate tsdoc --strict # Official Microsoft TSDoc AST validation
tsdoc-edge health src              # Code health report
tsdoc-edge docs suggest            # Improvement suggestions
```

### Documentation Management
```bash
tsdoc-edge docs index managed    # Index documents
tsdoc-edge validate docs managed # Validate SSOT
tsdoc-edge docs backlinks        # Update backlinks
```

### Convention Governance

```bash
# Uses the active saved canonical graph revision unless one is pinned
tsdoc-edge convention check \
  --pack <path-to-convention-pack.json> \
  --code-revision <canonical-revision-id> \
  --expected-manifest convention-pack:<sha256> \
  --fail-on error \
  --output .reports/convention.json
```

The result pins the code, spec, policy, rule-set, evidence, binding-resolution, and report
identities. Exit code `1` means an unsuppressed finding reached the selected threshold; input or
revision errors use exit code `2`. Omit `--code-revision` for the current active pointer; supply it
with `--expected-manifest` for a replayable CI/release input pair. See the source-checkout
[Convention Pack Check](https://github.com/junwoobang/tsdoc-edge/blob/master/managed/features/convention-pack-check.md).

To run the source-checkout end-to-end minimum implementation-binding PoC against the real
graph-router, including exact replay and the `0/1/2` exit canaries:

```bash
npm run poc:convention
```

To apply explicit upstream `ttsc graph-lint` rules to the same convention gate:

```bash
export TSDOC_EDGE_GRAPH_LINT_MODULE=/path/to/ttsc-graph-router/dist/index.js
tsdoc-edge convention check \
  --pack managed/conventions/tsdoc-edge-core.json \
  --graph-lint-rules managed/conventions/tsdoc-edge-graph-lint.json \
  --fail-on error
npm run poc:graph-lint
```

The configured module must be the graph-router package root, which exports
`buildGraphLintRules`; `artifact-source` is the raw graph artifact adapter and does not provide
the lint evaluator. Graph-lint findings are projected into the convention report and gate without
duplicating the upstream traversal algorithm.

This command requires the built sibling `ttsc-graph-router` by default, falls back to the legacy
`ttsc-ex/packages/ttsc-graph-router` layout, or accepts an explicit
`TSDOC_EDGE_GRAPH_ROUTER_MODULE`. The proof command and its authored convention pack are repository
development assets; the current npm package does not publish `scripts/` or `managed/`. Naming and
TSDoc tag evaluators, durable convention check history, immutable analysis input revisions, and
LSP conformance diagnostics/CodeActions are integrated on the same revision-pinned contract.

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
| [Commands Index](managed/COMMANDS.md) | 20 canonical top-level CLI commands & unified groups |
| [Authored Project Specifications](managed/specs/index.md) | Normative `SpecGraph` specifications (8 domain/convention specs, 55 bindings) |
| [3-Tier Data Trace](managed/features/data-lineage-and-trace.md) | Type/Field roles, cross-boundary lineage (`SpecGraph`/`@samchon/typespec-evidence`/`oa-sdk`), and AST slicing |
| [Relationship Guide](managed/guides/relationship-analysis-guide.md) | Dependency analysis |
| [LSP Integration](managed/features/lsp-integration.md) | Real-time IDE integration & overlay graph |
| [MCP Integration](managed/features/mcp-integration.md) | 10-tool Model Context Protocol server specification |
| [Convention Pack Check](managed/features/convention-pack-check.md) | Revision-pinned spec-binding governance loop |

---

## Package & Module Topic Map

### 1. Workspace Packages

| Package / Path | Topic & Responsibility | Primary Surface |
|----------------|------------------------|-----------------|
| **`tsdoc-edge` (Root)** | Core SSOT documentation connectivity, canonical `@ttsc/graph` & `SpecGraph` governance kernel, 3-tier data tracing, CLI, and LSP server | `tsdoc-edge` CLI (`20` top-level commands), `tsdoc-edge-lsp`, programmatic SDK (`src/index.ts`) |
| **`tsdoc-edge-mcp-server` (`mcp-server/`)** | Read-only Model Context Protocol (MCP) server exposing `.tsdoc.db`, `.tsdoc/canonical-graph.db`, and `.tsdoc/spec-graph.db` to AI agents | `10` MCP tools (`tsdoc_search_symbols`, `tsdoc_get_work_context`, `tsdoc_get_design_context`, `tsdoc_get_impact`, `tsdoc_get_spec_bindings`, `tsdoc_trace_data`, etc.) |
| **`tools/ttsc-tsdoc` (`tools/ttsc-tsdoc/`)** | Native Go `ttsc` lint rule contributor plugin enforcing TSDoc syntax and domain tag rules at compile time | `@ttsc/lint` (`tsdoc/*` rules integrated into the `25`-rule zero-finding gate) |

### 2. Core `src/` Subsystems by Topic (`26` Directories · `297` Files)

```
src/
├── cli.ts              # Zero-side-effect CLI bootstrap & top-level command dispatcher
├── index.ts            # Public programmatic SDK facade (TSDocEdge, parsers, graph, context generators)
│
├── [1. Parsing & TSDoc AST Plane]
│   ├── parser/         # Unified @microsoft/tsdoc AST reader (TsdocCommentReader, TSDocParser, ModuleSpecTagParser, EnhancedDocExtractor)
│   └── types/          # Core domain contracts (tags/ 22 custom tags & canonical-tag-bridge, graph/, domain/, spec/, analysis/)
│
├── [2. Canonical Code Graph & Indexing Plane]
│   ├── provider/       # SemanticGraphProvider SPI, TtscSemanticGraphProvider, Snapshot & Delta normalizers
│   ├── indexer/        # ProjectIndexer, TtscGraphRouterArtifactAdapter, CanonicalGraphCoordinator, collision-safe alias mapping
│   ├── graph/          # Enrichment symbol graph builder (SymbolGraphBuilder, SymbolSearchEngine, DepthTraverser)
│   ├── graph-analysis/ # Canonical @ttsc/graph queries (CanonicalGraphIndex, GraphAnalysisService) & 3-tier DataTraceService
│   └── query/          # Multi-hop relationship traversal query engine (RelationshipQueryEngine)
│
├── [3. Normative SpecGraph & Convention Governance Plane]
│   ├── spec-graph/     # Executable `tsdoc-spec` extractor (ManagedSpecExtractor), ExactBindingResolver, ConformanceEngine
│   ├── semantic-graph/ # Cross-plane EffectiveAnalysisService & immutable AnalysisInputRevision pinning
│   ├── convention/     # ConventionPackCompiler, ConventionCheckService, Naming/TSDoc/ttsc-graph-lint evaluators & gate
│   └── spec/           # SpecCompletenessValidator, SpecMetricsAggregator, SpecStatusManager, UnusedDocumentDetector
│
├── [4. Checkpoint [[Symbol]] & Documentation Connectivity Plane]
│   ├── doc-symbol/     # [[Symbol]] checkpoint registry (DocumentSymbolRegistry), BacklinkGenerator, SymbolReferenceResolver
│   ├── linking/        # Bidirectional code ↔ doc linker (DocCodeLinker) & LinkValidator
│   ├── validator/      # ConnectivityValidator, ConventionValidator, StrictModeValidator, GeneratedDocsValidator
│   └── fixer/          # Automated TSDoc tag & checkpoint fixer (DocumentationFixer)
│
├── [5. Dynamic Context Generation, Analyzer & Output Plane]
│   ├── generator/      # Dynamic LLM/XML work-context generators (LLMsTextGenerator, XMLContextGenerator)
│   ├── analyzer/       # 52 domain/AST/test/type/interface/health analyzers (EnhancedWorkContextAnalyzer, TypeChainTracer, etc.)
│   ├── metrics/        # CanonicalCoverageProjection, CoverageMetricContract, Baseline & Gate evaluation
│   ├── analytics/      # CLI command & symbol usage telemetry tracker (UsageTracker)
│   └── output/         # Structured JSON/XML/Human output builders and schema validators
│
├── [6. Persistence, IDE Surface & CLI Commands]
│   ├── storage/        # 5 content-addressed SQLite revision stores (GraphRepository, SpecGraphRepository, etc.) + DatabaseManager
│   ├── lsp/            # Real-time LSP server, TsdocEdgeService, IncrementalBuilder & 6th-plane Unsaved OverlayGraphView
│   ├── commands/       # 20 canonical top-level CLI commands & 7 unified command routers (wc, dc, sync, symbol, relationship, etc.)
│   ├── config/         # .tsdoc.config.json lifecycle manager (ConfigManager)
│   ├── utilities/      # Symbol & file reference refactoring updaters (SymbolReferenceUpdater, FileReferenceUpdater)
│   └── utils/          # Deterministic kebab-case IdGenerator & ConfigLoader
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

Node 24 is the declared package and CI baseline, while its release runtime matrix is still being
qualified. macOS Node 24/V8 13.6 still shows an intermittent Jest GC crash, so this declaration
does not make the release gate passed. See
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

Operators can inspect the saved graph without loading the router or opening a writer:

```bash
tsdoc-edge canonical-graph status --graph-db .tsdoc/canonical-graph.db --json
tsdoc-edge canonical-graph list --graph-db .tsdoc/canonical-graph.db --json
tsdoc-edge canonical-graph read --graph-db .tsdoc/canonical-graph.db --revision-id <revision-id> --json
tsdoc-edge canonical-graph prune --graph-db .tsdoc/canonical-graph.db --keep 2 --vacuum --json
```

`status`, `list`, and `read` expose the active marker, retained revision metadata, provenance,
and exact graph payload while keeping the SQLite database read-only; `prune` reclaims older
historical revisions while always preserving the active revision.

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
| CLI Commands | 20 canonical top-level (`tsdoc-edge help --tree`) |
| Canonical `@ttsc/graph` | 8,349 internal (8,613 total) nodes / 16,870 internal (20,995 total) edges |
| Normative `SpecGraph` | 8 `project-spec` docs · 63 nodes · 55 bindings (`55/55` satisfied) |
| Enrichment Symbol DB | 8,601 symbols (`100%` file `@doc` coverage across 297 `src/` + 6 `mcp-server/src/` files · `80.0%` effective symbol coverage) |
| Managed Checkpoints & Links | 299/299 `With [[Symbol]]` (`100%`) · 1,995 checked links (`0` broken) · `0` unused docs |
| `@ttsc/lint` | 25 error rules (`0` findings) |
| Health Scores | `90/100 (A)` system-status · `89/100 (A)` spec metrics · `93/100 (A+)` core modules |
| Test Suites | 225 suites (2,939 tests) + 10/10 MCP integration checks |

---

## License

MIT
