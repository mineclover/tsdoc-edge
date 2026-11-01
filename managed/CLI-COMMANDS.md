---
title: CLI Commands
type: reference
category: commands
status: active
canonical: true
---

# [[CLI Commands]]

Complete reference for the canonical **20 top-level TSDoc Edge CLI commands** (10 core workflow/status commands, 7 unified command groups, and 3 revision/coverage contract commands).

## Unified SSOT workflow

Run one pipeline to refresh the symbol database, canonical `@ttsc/graph` revision, managed
checkpoints, SpecGraph, and backlinks:

```bash
tsdoc-edge sync [--force] [--dry-run] [--check] [--json]
```

The three SSOT tiers are `@microsoft/tsdoc` (29 standard tags), `ttsc`/`@ttsc/graph`/`@ttsc/lint`
(canonical graph and 25 error rules), and `tsdoc-edge` (22 irreducible domain tags and connectivity).
Use `symbol query <name>` or `symbol find-method <name>` for symbol lookup, `spec extract` or `spec graph ...`
for SpecGraph lifecycle operations, and `convention check --pack <file>` for revision-pinned governance.

## Top-Level Command Surface (20 Commands)

### 1. Core Workflow & Diagnostics (10)
- [[InitCommand]] (`init`) - Initialize project configuration
- `sync` - Synchronize symbol DB, canonical `@ttsc/graph`, SpecGraph, and backlinks
- [[BuildCommand]] (`build`, `b`) - Build symbol database
- [[WorkContextCommand]] (`work-context`, `wc`) - Show complete context before editing a file
- `design-context` (`dc`) - Show spec bindings, `@contract`, and `@decision` context
- `system-status` (`status`, `ss`) - Show 3-plane SSOT system dashboard
- `stats` (`s`) - Show symbol, TSDoc, and canonical `@ttsc/graph` statistics
- [[HealthCommand]] (`health`, `h`) - Check code health score
- `lint` - Run quality and linting checks
- [[HelpCommand]] (`help`) - Display CLI command tree and help

### 2. Unified Command Groups (7)
- `symbol` (`sym`) - `query`, `deps` ([[DepsCommand]]), `who-uses` ([[WhoUsesCommand]]), `orphans` ([[OrphansCommand]]), `find-method`, `tree`, `core-api`, `undocumented`, `untested` ([[UntestedCommand]]), `parse`, `promote`, `fix`, `rename`
- `relationship` (`rel`, `r`) - [[RelationshipCommands]] (`query`, `impact`, `path`, `clusters`, `metrics`, `validate`, `export`, `stats`, `check`, `visualize` / [[RelationshipVisualizeCommand]], `analyze` / [[AnalyzerCommands]], `type-chain`, `cycles`, `roots`, `help`)
- `docs` (`d`) - `index` ([[IndexDocsCommand]]), `backlinks` ([[UpdateBacklinksCommand]]), `check-links` ([[CheckLinksCommand]]), `update-refs`, `generate`, `validate` ([[ValidateDocsCommand]]), `find-unused`, `move`, `symbols`, `fix`, `suggest` ([[SuggestCommand]]), `todos`, `plans`
- `validate` (`val`, `v`) - `docs` ([[ValidateDocsCommand]]), `tsdoc`, `refs`, `spec`, `connectivity`, `generated`
- `spec` (`sp`) - [[SpecCommands]] (`extract`, `graph`, `metrics`, `validate`, `duplicates`, `status`, `history`, `diff`, `bump`)
- `convention` (`conv`) - `check`, `inputs`, `retention`
- `ontology` (`ont`) - `stats`, `list`

### 3. Revision & Coverage Contracts (3)
- `canonical-graph` - `status`, `list`, `read`, `prune`
- [[CoverageReportCommand]] (`coverage-report`) - Generate or inspect persisted coverage reports (`list`, `read`)
- `coverage-baseline` (`coverage-trend`) - `save`, `compare`, `list`, `read`

## See Also

- [[CommandRegistry]] - Command registration system
- [[BaseCommand]] - Base command class
- [[Commands Index]] - Subcommand reference tables

---

## Backlinks

### Referenced By

- [[Phase Commands]] → managed/commands/PhaseCommands.md:100
- [[UtilityCommands]] → managed/commands/UtilityCommands.md:315
- [[CLI Command Development Guide]] → managed/guides/command-development-guide.md:791
- [[CliCommandSurfaceSpecification]] → managed/specs/domains/cli-command-surface-spec.md:332

### Implemented By

- CheckDuplicatesCommand → src/commands/CheckDuplicatesCommand.ts:73
- CheckLinksCommand → src/commands/CheckLinksCommand.ts:45
- CoreApiCommand → src/commands/CoreApiCommand.ts:43
- FindMethodCommand → src/commands/FindMethodCommand.ts:47
- FindUnusedDocsCommand → src/commands/FindUnusedDocsCommand.ts:44
- GenerateDocsCommand → src/commands/GenerateDocsCommand.ts:27
- HelpCommand → src/commands/HelpCommand.ts:44
- InitCommand → src/commands/InitCommand.ts:27
- OrphansCommand → src/commands/OrphansCommand.ts:47
- ParseCommand → src/commands/ParseCommand.ts:44
- PlansCommand → src/commands/PlansCommand.ts:43
- SpecBumpCommand → src/commands/SpecBumpCommand.ts:44
- SpecDiffCommand → src/commands/SpecDiffCommand.ts:44
- SpecHistoryCommand → src/commands/SpecHistoryCommand.ts:44
- SpecStatusCommand → src/commands/SpecStatusCommand.ts:73
- StatsCommand → src/commands/StatsCommand.ts:40
- SuggestCommand → src/commands/SuggestCommand.ts:25
- TodosCommand → src/commands/TodosCommand.ts:44
- TreeCommand → src/commands/TreeCommand.ts:54
- UndocumentedCommand → src/commands/UndocumentedCommand.ts:46
- UpdateBacklinksCommand → src/commands/UpdateBacklinksCommand.ts:48
- UpdateSymbolRefsCommand → src/commands/UpdateSymbolRefsCommand.ts:47
- ValidateDocsCommand → src/commands/ValidateDocsCommand.ts:46
- ValidateSpecCommand → src/commands/ValidateSpecCommand.ts:26
- DEFAULT_SPEC_GRAPH_DATABASE → src/commands/canonicalReadHelper.ts:31
- CanonicalGraphPlaneSnapshot → src/commands/canonicalReadHelper.ts:42
- SpecGraphPlaneSnapshot → src/commands/canonicalReadHelper.ts:66
- ProjectedCanonicalOntologyEdge → src/commands/canonicalReadHelper.ts:85
- resolveCanonicalGraphDbPath → src/commands/canonicalReadHelper.ts:102
- resolveSpecGraphDbPath → src/commands/canonicalReadHelper.ts:127
- isExternalCanonicalNode → src/commands/canonicalReadHelper.ts:144
- readCanonicalGraphSnapshot → src/commands/canonicalReadHelper.ts:161
- readSpecGraphSnapshot → src/commands/canonicalReadHelper.ts:234
- projectCanonicalEdgeToOntology → src/commands/canonicalReadHelper.ts:280
- registerCliCommands → src/commands/registerCliCommands.ts:45

