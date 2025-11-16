# [[CLI Runner]]

**Source**: `src/cli.ts`

## Purpose

Main entry point for the TSDoc Edge command-line interface.

## Architecture

**Pattern**: Command Registry Pattern
**Design**: Modular command architecture with separate command classes

### Before (Monolithic)
- Single 5,728-line file with all logic
- Hard to maintain and extend
- Tight coupling between commands

### After (Modular)
- Command pattern with separate classes
- Each command in its own file
- [[CommandRegistry]] for registration and lookup
- Easy to add new commands

## Main Function

```typescript
async function main(): Promise<void>
```

### Execution Flow

1. **Parse Arguments**: Extract command name and args from `process.argv`
2. **Config Loading**: Check for `--config=` flag and initialize [[ConfigManager]]
3. **Command Registration**: Register all 67 available commands
4. **Command Lookup**: Find command in [[CommandRegistry]]
5. **Command Execution**: Execute command with args
6. **Usage Tracking**: Record execution metrics via [[UsageTracker]]
7. **Exit**: Return appropriate exit code (0 = success, 1 = error)

## Command Registry

Total: **67 commands** registered

### Core Workflow (9)
- [[BuildCommand]]: Extract all symbols
- [[ParseCommand]]: Parse source files
- [[WorkContextCommand]]: Get file context
- [[ExploreEntrypointCommand]]: Explore from docs
- [[ValidateCommand]]: Validate project
- [[AnalyzeCommand]]: Analyze codebase
- [[HealthCommand]]: Code health check

### Relationship Analyzers (6)
- [[AnalyzeCallsCommand]]: Call graph analysis
- [[AnalyzeIOCommand]]: I/O dependency analysis
- [[AnalyzeChainsCommand]]: Dependency chains
- [[AnalyzeTestsCommand]]: Test coverage
- [[AnalyzeTypesCommand]]: Type dependencies

### Documentation Tools (12)
- [[IndexDocsCommand]]: Index documentation
- [[ValidateDocsCommand]]: Validate docs
- [[ParseMermaidCommand]]: Generate from .mmd
- [[PromoteSymbolCommand]]: H2 → H1 promotion
- [[ValidateSymbolRefsCommand]]: Validate [[Symbol]] refs
- [[UpdateBacklinksCommand]]: Update backlinks
- [[UpdateSymbolRefsCommand]]: Update references

### Query & Analysis (11)
- [[DepsCommand]]: Show dependencies
- [[WhoUsesCommand]]: Show reverse dependencies
- [[OrphansCommand]]: Find orphaned code
- [[UndocumentedCommand]]: Find undocumented symbols
- [[UntestedCommand]]: Find untested code
- [[StatsCommand]]: Project statistics
- [[TreeCommand]]: Dependency tree

### Other (29)
See complete list in source code

## Usage Tracking

Records all command executions to `.tsdoc/usage.jsonl`:

```typescript
interface CommandUsageEvent {
  command: string;
  args: string[];
  timestamp: string;
  duration: number; // milliseconds
  success: boolean;
  error?: string;
  cwd: string;
  nodeVersion: string;
  version: string;
}
```

**Used by**:
- [[UsageCommand]]: Display usage statistics
- Analytics and performance monitoring

## Error Handling

- Unknown command → Show available commands + exit 1
- Command execution error → Log error + exit 1
- Fatal error in main → Log fatal error + exit 1

## Configuration

**Config Flag**: `--config=path/to/config.json`

Loads custom [[TsdocEdgeConfig]] via [[ConfigManager]].

## Entry Point

```bash
#!/usr/bin/env node
```

Executable via:
- `npx tsdoc-edge <command>`
- `node dist/cli.js <command>`
- Direct execution after `npm link`

## Performance

- **Startup time**: ~100ms (command loading + registration)
- **Command execution**: Varies by command (100ms - 10s)
- **Usage tracking**: <1ms (append to JSONL)

## Symbol Count

1 main function, 18 local variables

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:191
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:433
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:48
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:49
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:50
- [[AnalyzeChainsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeChainsCommand.md:38
- [[AnalyzeChainsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeChainsCommand.md:39
- [[AnalyzeChainsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeChainsCommand.md:40
- [[AnalyzeCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCommand.md:47
- [[AnalyzeCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCommand.md:48
- [[AnalyzeCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCommand.md:49
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:42
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:43
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:44
- [[AnalyzeTestsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeTestsCommand.md:35
- [[AnalyzeTestsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeTestsCommand.md:36
- [[AnalyzeTestsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeTestsCommand.md:37
- [[AnalyzeTypesCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeTypesCommand.md:33
- [[AnalyzeTypesCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeTypesCommand.md:34
- [[AnalyzeTypesCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeTypesCommand.md:35
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:110
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:111
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:112
- [[CommandRegistry]] → /home/user/tsdoc-edge/managed/commands/CommandRegistry.md:34
- [[CommandRegistry]] → /home/user/tsdoc-edge/managed/commands/CommandRegistry.md:35
- [[CommandRegistry]] → /home/user/tsdoc-edge/managed/commands/CommandRegistry.md:36
- [[CommandRegistry]] → /home/user/tsdoc-edge/managed/commands/CommandRegistry.md:37
- [[CommandRegistry]] → /home/user/tsdoc-edge/managed/commands/CommandRegistry.md:38
- [[CommandRegistry]] → /home/user/tsdoc-edge/managed/commands/CommandRegistry.md:39
- [[DepsCommand]] → /home/user/tsdoc-edge/managed/commands/DepsCommand.md:149
- [[DepsCommand]] → /home/user/tsdoc-edge/managed/commands/DepsCommand.md:150
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:40
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:41
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:42
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:75
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:76
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:77
- [[IndexDocsCommand]] → /home/user/tsdoc-edge/managed/commands/IndexDocsCommand.md:82
- [[IndexDocsCommand]] → /home/user/tsdoc-edge/managed/commands/IndexDocsCommand.md:83
- [[IndexDocsCommand]] → /home/user/tsdoc-edge/managed/commands/IndexDocsCommand.md:84
- [[OrphansCommand]] → /home/user/tsdoc-edge/managed/commands/OrphansCommand.md:169
- [[OrphansCommand]] → /home/user/tsdoc-edge/managed/commands/OrphansCommand.md:170
- [[ParseCommand]] → /home/user/tsdoc-edge/managed/commands/ParseCommand.md:45
- [[ParseCommand]] → /home/user/tsdoc-edge/managed/commands/ParseCommand.md:46
- [[ParseCommand]] → /home/user/tsdoc-edge/managed/commands/ParseCommand.md:47
- [[ParseMermaidCommand]] → /home/user/tsdoc-edge/managed/commands/ParseMermaidCommand.md:66
- [[ParseMermaidCommand]] → /home/user/tsdoc-edge/managed/commands/ParseMermaidCommand.md:67
- [[PromoteSymbolCommand]] → /home/user/tsdoc-edge/managed/commands/PromoteSymbolCommand.md:43
- [[PromoteSymbolCommand]] → /home/user/tsdoc-edge/managed/commands/PromoteSymbolCommand.md:44
- [[PromoteSymbolCommand]] → /home/user/tsdoc-edge/managed/commands/PromoteSymbolCommand.md:45
- [[StatsCommand]] → /home/user/tsdoc-edge/managed/commands/StatsCommand.md:190
- [[StatsCommand]] → /home/user/tsdoc-edge/managed/commands/StatsCommand.md:191
- [[TreeCommand]] → /home/user/tsdoc-edge/managed/commands/TreeCommand.md:206
- [[TreeCommand]] → /home/user/tsdoc-edge/managed/commands/TreeCommand.md:207
- [[TreeCommand]] → /home/user/tsdoc-edge/managed/commands/TreeCommand.md:208
- [[UndocumentedCommand]] → /home/user/tsdoc-edge/managed/commands/UndocumentedCommand.md:153
- [[UndocumentedCommand]] → /home/user/tsdoc-edge/managed/commands/UndocumentedCommand.md:154
- [[UntestedCommand]] → /home/user/tsdoc-edge/managed/commands/UntestedCommand.md:172
- [[UntestedCommand]] → /home/user/tsdoc-edge/managed/commands/UntestedCommand.md:173
- [[UpdateBacklinksCommand]] → /home/user/tsdoc-edge/managed/commands/UpdateBacklinksCommand.md:33
- [[UpdateBacklinksCommand]] → /home/user/tsdoc-edge/managed/commands/UpdateBacklinksCommand.md:34
- [[UpdateBacklinksCommand]] → /home/user/tsdoc-edge/managed/commands/UpdateBacklinksCommand.md:35
- [[UpdateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/UpdateSymbolRefsCommand.md:32
- [[UpdateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/UpdateSymbolRefsCommand.md:33
- [[UpdateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/UpdateSymbolRefsCommand.md:34
- [[UsageCommand]] → /home/user/tsdoc-edge/managed/commands/UsageCommand.md:30
- [[UsageCommand]] → /home/user/tsdoc-edge/managed/commands/UsageCommand.md:31
- [[UsageCommand]] → /home/user/tsdoc-edge/managed/commands/UsageCommand.md:32
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:46
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:47
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:48
- [[ValidateDocsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateDocsCommand.md:43
- [[ValidateDocsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateDocsCommand.md:44
- [[ValidateDocsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateDocsCommand.md:45
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:67
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:68
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:69
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:156
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:157
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:105
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:106
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:107
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:41
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:42
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:43
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:44
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:45
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:46
- [[TsdocEdgeConfig]] → /home/user/tsdoc-edge/managed/primary-types/TsdocEdgeConfig.md:131
- [[TsdocEdgeConfig]] → /home/user/tsdoc-edge/managed/primary-types/TsdocEdgeConfig.md:132
- [[TsdocEdgeConfig]] → /home/user/tsdoc-edge/managed/primary-types/TsdocEdgeConfig.md:133
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:105
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:106
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:107
- [[UsageTracker]] → /home/user/tsdoc-edge/managed/utilities/UsageTracker.md:99
- [[UsageTracker]] → /home/user/tsdoc-edge/managed/utilities/UsageTracker.md:100
- [[UsageTracker]] → /home/user/tsdoc-edge/managed/utilities/UsageTracker.md:101

