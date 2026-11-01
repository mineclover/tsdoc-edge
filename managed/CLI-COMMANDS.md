---
title: CLI Commands
type: reference
category: commands
status: active
canonical: true
---

# [[CLI Commands]]

Complete reference for all TSDoc Edge CLI commands.

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
- DepsCommand (deps) → src/commands/DepsCommand.ts:38
- FindMethodCommand (find-method) → src/commands/FindMethodCommand.ts:37
- FindUnusedDocsCommand (find-unused-docs) → src/commands/FindUnusedDocsCommand.ts:35
- GenerateDocsCommand (generate-docs) → src/commands/GenerateDocsCommand.ts:18
- InitCommand (init) → src/commands/InitCommand.ts:18
- OrphansCommand (orphans) → src/commands/OrphansCommand.ts:36
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
- WhoUsesCommand (who-uses) → src/commands/WhoUsesCommand.ts:36

