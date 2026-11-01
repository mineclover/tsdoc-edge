---
title: CLI Commands
type: reference
category: commands
status: active
canonical: true
---

# [[CLI Commands]]

Complete reference for all TSDoc Edge CLI commands.

## Unified SSOT workflow

Run one pipeline to refresh the symbol database, canonical `@ttsc/graph` revision, managed
checkpoints, SpecGraph, and backlinks:

```bash
tsdoc-edge sync [--force] [--dry-run] [--check] [--json]
```

The three SSOT tiers are `@microsoft/tsdoc` (29 standard tags), `ttsc`/`@ttsc/graph`/`@ttsc/lint`
(canonical graph and 25 error rules), and `tsdoc-edge` (22 irreducible domain tags and connectivity).
Use `find-method <name>` for method lookup, `spec extract` or `spec graph ...` for SpecGraph
lifecycle operations, and `convention check --pack <file>` for revision-pinned governance.

## Command Categories

### Build & Analysis
- [[BuildCommand]] - Build symbol database
- [[AnalyzeCommand]] - Analyze code health
- [[HealthCommand]] - Check code health

### Documentation
- [[SuggestCommand]] - Generate improvement suggestions
- [[IndexDocsCommand]] - Index document symbols
- [[UpdateBacklinksCommand]] - Update backlinks
- [[CheckLinksCommand]] - Check broken links
- [[ValidateDocsCommand]] - Validate documentation

### Symbol Operations
- [[DepsCommand]] - Show dependencies
- [[WhoUsesCommand]] - Show symbol usage
- [[OrphansCommand]] - Find orphaned symbols

### Relationships
- [[RelationshipCommands]] - Unified relationship analysis
- [[AnalyzerCommands]] - Analyze relationships
- [[VisualizeDepsCommand]] - Generate diagrams

### Workflow
- [[WorkContextCommand]] - Show file context
- [[InitCommand]] - Initialize configuration
- `sync [--force] [--dry-run] [--check] [--json]` - Run the complete SSOT synchronization pipeline
- `find-method <name>` - Find methods by name
- `spec extract` / `spec graph ...` - Build or inspect managed specifications
- `convention check --pack <file>` - Check exact convention bindings

## See Also

- [[CommandRegistry]] - Command registration system
- [[BaseCommand]] - Base command class

---

## Backlinks

### Referenced By

- [[Phase Commands]] → managed/commands/PhaseCommands.md:100
- [[UtilityCommands]] → managed/commands/UtilityCommands.md:439
- [[CLI Command Development Guide]] → managed/guides/command-development-guide.md:791

### Implemented By

- CheckDuplicatesCommand (check-duplicates) → src/commands/CheckDuplicatesCommand.ts:64
- CheckLinksCommand (check-links) → src/commands/CheckLinksCommand.ts:36
- CoreApiCommand (core-api) → src/commands/CoreApiCommand.ts:36
- FindMethodCommand (find-method) → src/commands/FindMethodCommand.ts:38
- FindUnusedDocsCommand (find-unused-docs) → src/commands/FindUnusedDocsCommand.ts:35
- GenerateDocsCommand (generate-docs) → src/commands/GenerateDocsCommand.ts:18
- InitCommand (init) → src/commands/InitCommand.ts:18
- OrphansCommand (orphans) → src/commands/OrphansCommand.ts:38
- ParseCommand (parse) → src/commands/ParseCommand.ts:35
- PlansCommand (plans) → src/commands/PlansCommand.ts:34
- RebuildIndexCommand (rebuild-index) → src/commands/RebuildIndexCommand.ts:31
- SpecBumpCommand (spec-bump) → src/commands/SpecBumpCommand.ts:35
- SpecDiffCommand (spec-diff) → src/commands/SpecDiffCommand.ts:35
- SpecHistoryCommand (spec-history) → src/commands/SpecHistoryCommand.ts:35
- SpecStatusCommand (spec-status) → src/commands/SpecStatusCommand.ts:64
- StatsCommand (stats) → src/commands/StatsCommand.ts:33
- SuggestCommand (suggest) → src/commands/SuggestCommand.ts:16
- TodosCommand (todos) → src/commands/TodosCommand.ts:35
- TreeCommand (tree) → src/commands/TreeCommand.ts:45
- UndocumentedCommand (undocumented) → src/commands/UndocumentedCommand.ts:37
- UpdateBacklinksCommand (update-backlinks) → src/commands/UpdateBacklinksCommand.ts:39
- UpdateSymbolRefsCommand (update-symbol-refs) → src/commands/UpdateSymbolRefsCommand.ts:38
- ValidateDocsCommand (validate-docs) → src/commands/ValidateDocsCommand.ts:37
- ValidateSpecCommand (validate-spec) → src/commands/ValidateSpecCommand.ts:17

