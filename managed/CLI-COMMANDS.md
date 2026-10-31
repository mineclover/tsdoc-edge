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
- [[UtilityCommands]] → managed/commands/UtilityCommands.md:379
- [[CLI Command Development Guide]] → managed/guides/command-development-guide.md:795

### Implemented By

- CheckDuplicatesCommand (check-duplicates) → src/commands/CheckDuplicatesCommand.ts:68
- CheckLinksCommand (check-links) → src/commands/CheckLinksCommand.ts:40
- CoreApiCommand (core-api) → src/commands/CoreApiCommand.ts:40
- DepsCommand (deps) → src/commands/DepsCommand.ts:42
- FindMethodCommand (find-method) → src/commands/FindMethodCommand.ts:41
- FindUnusedDocsCommand (find-unused-docs) → src/commands/FindUnusedDocsCommand.ts:39
- GenerateDocsCommand (generate-docs) → src/commands/GenerateDocsCommand.ts:18
- InitCommand (init) → src/commands/InitCommand.ts:16
- OrphansCommand (orphans) → src/commands/OrphansCommand.ts:40
- ParseCommand (parse) → src/commands/ParseCommand.ts:39
- PlansCommand (plans) → src/commands/PlansCommand.ts:38
- RebuildIndexCommand (rebuild-index) → src/commands/RebuildIndexCommand.ts:35
- SpecBumpCommand (spec-bump) → src/commands/SpecBumpCommand.ts:39
- SpecDiffCommand (spec-diff) → src/commands/SpecDiffCommand.ts:39
- SpecHistoryCommand (spec-history) → src/commands/SpecHistoryCommand.ts:39
- SpecStatusCommand (spec-status) → src/commands/SpecStatusCommand.ts:68
- StatsCommand (stats) → src/commands/StatsCommand.ts:37
- SuggestCommand (suggest) → src/commands/SuggestCommand.ts:16
- TodosCommand (todos) → src/commands/TodosCommand.ts:38
- TreeCommand (tree) → src/commands/TreeCommand.ts:49
- UndocumentedCommand (undocumented) → src/commands/UndocumentedCommand.ts:41
- UpdateBacklinksCommand (update-backlinks) → src/commands/UpdateBacklinksCommand.ts:43
- UpdateSymbolRefsCommand (update-symbol-refs) → src/commands/UpdateSymbolRefsCommand.ts:42
- ValidateDocsCommand (validate-docs) → src/commands/ValidateDocsCommand.ts:41
- ValidateSpecCommand (validate-spec) → src/commands/ValidateSpecCommand.ts:17
- WhoUsesCommand (who-uses) → src/commands/WhoUsesCommand.ts:40

