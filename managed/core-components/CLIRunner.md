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
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:40
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:41
- [[AnalyzeChainsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeChainsCommand.md:34
- [[AnalyzeChainsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeChainsCommand.md:35
- [[AnalyzeCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCommand.md:39
- [[AnalyzeCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCommand.md:40
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:37
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:38
- [[AnalyzeTestsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeTestsCommand.md:33
- [[AnalyzeTestsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeTestsCommand.md:34
- [[AnalyzeTypesCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeTypesCommand.md:32
- [[AnalyzeTypesCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeTypesCommand.md:33
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:90
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:91
- [[CommandRegistry]] → /home/user/tsdoc-edge/managed/commands/CommandRegistry.md:32
- [[CommandRegistry]] → /home/user/tsdoc-edge/managed/commands/CommandRegistry.md:33
- [[CommandRegistry]] → /home/user/tsdoc-edge/managed/commands/CommandRegistry.md:34
- [[CommandRegistry]] → /home/user/tsdoc-edge/managed/commands/CommandRegistry.md:35
- [[DepsCommand]] → /home/user/tsdoc-edge/managed/commands/DepsCommand.md:138
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:36
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:37
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:56
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:57
- [[IndexDocsCommand]] → /home/user/tsdoc-edge/managed/commands/IndexDocsCommand.md:76
- [[IndexDocsCommand]] → /home/user/tsdoc-edge/managed/commands/IndexDocsCommand.md:77
- [[OrphansCommand]] → /home/user/tsdoc-edge/managed/commands/OrphansCommand.md:161
- [[ParseCommand]] → /home/user/tsdoc-edge/managed/commands/ParseCommand.md:38
- [[ParseCommand]] → /home/user/tsdoc-edge/managed/commands/ParseCommand.md:39
- [[ParseMermaidCommand]] → /home/user/tsdoc-edge/managed/commands/ParseMermaidCommand.md:60
- [[PromoteSymbolCommand]] → /home/user/tsdoc-edge/managed/commands/PromoteSymbolCommand.md:37
- [[PromoteSymbolCommand]] → /home/user/tsdoc-edge/managed/commands/PromoteSymbolCommand.md:38
- [[StatsCommand]] → /home/user/tsdoc-edge/managed/commands/StatsCommand.md:179
- [[TreeCommand]] → /home/user/tsdoc-edge/managed/commands/TreeCommand.md:204
- [[TreeCommand]] → /home/user/tsdoc-edge/managed/commands/TreeCommand.md:205
- [[UndocumentedCommand]] → /home/user/tsdoc-edge/managed/commands/UndocumentedCommand.md:147
- [[UntestedCommand]] → /home/user/tsdoc-edge/managed/commands/UntestedCommand.md:165
- [[UpdateBacklinksCommand]] → /home/user/tsdoc-edge/managed/commands/UpdateBacklinksCommand.md:30
- [[UpdateBacklinksCommand]] → /home/user/tsdoc-edge/managed/commands/UpdateBacklinksCommand.md:31
- [[UpdateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/UpdateSymbolRefsCommand.md:30
- [[UpdateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/UpdateSymbolRefsCommand.md:31
- [[UsageCommand]] → /home/user/tsdoc-edge/managed/commands/UsageCommand.md:30
- [[UsageCommand]] → /home/user/tsdoc-edge/managed/commands/UsageCommand.md:31
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:39
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:40
- [[ValidateDocsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateDocsCommand.md:37
- [[ValidateDocsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateDocsCommand.md:38
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:53
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:54
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:147
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:89
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:90
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:37
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:38
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:39
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:40
- [[TsdocEdgeConfig]] → /home/user/tsdoc-edge/managed/primary-types/TsdocEdgeConfig.md:123
- [[TsdocEdgeConfig]] → /home/user/tsdoc-edge/managed/primary-types/TsdocEdgeConfig.md:124
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:94
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:95
- [[UsageTracker]] → /home/user/tsdoc-edge/managed/utilities/UsageTracker.md:96
- [[UsageTracker]] → /home/user/tsdoc-edge/managed/utilities/UsageTracker.md:97

