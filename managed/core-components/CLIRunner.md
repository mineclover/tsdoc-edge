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
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:34
- [[AnalyzeChainsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeChainsCommand.md:31
- [[AnalyzeCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCommand.md:33
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:32
- [[AnalyzeTestsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeTestsCommand.md:32
- [[AnalyzeTypesCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeTypesCommand.md:31
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:73
- [[CommandRegistry]] → /home/user/tsdoc-edge/managed/commands/CommandRegistry.md:30
- [[CommandRegistry]] → /home/user/tsdoc-edge/managed/commands/CommandRegistry.md:31
- [[DepsCommand]] → /home/user/tsdoc-edge/managed/commands/DepsCommand.md:133
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:33
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:41
- [[IndexDocsCommand]] → /home/user/tsdoc-edge/managed/commands/IndexDocsCommand.md:71
- [[OrphansCommand]] → /home/user/tsdoc-edge/managed/commands/OrphansCommand.md:155
- [[ParseCommand]] → /home/user/tsdoc-edge/managed/commands/ParseCommand.md:32
- [[ParseMermaidCommand]] → /home/user/tsdoc-edge/managed/commands/ParseMermaidCommand.md:56
- [[PromoteSymbolCommand]] → /home/user/tsdoc-edge/managed/commands/PromoteSymbolCommand.md:32
- [[StatsCommand]] → /home/user/tsdoc-edge/managed/commands/StatsCommand.md:167
- [[TreeCommand]] → /home/user/tsdoc-edge/managed/commands/TreeCommand.md:203
- [[UndocumentedCommand]] → /home/user/tsdoc-edge/managed/commands/UndocumentedCommand.md:142
- [[UntestedCommand]] → /home/user/tsdoc-edge/managed/commands/UntestedCommand.md:159
- [[UpdateBacklinksCommand]] → /home/user/tsdoc-edge/managed/commands/UpdateBacklinksCommand.md:29
- [[UpdateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/UpdateSymbolRefsCommand.md:30
- [[UsageCommand]] → /home/user/tsdoc-edge/managed/commands/UsageCommand.md:30
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:34
- [[ValidateDocsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateDocsCommand.md:32
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:40
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:143
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:76
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:33
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:34
- [[TsdocEdgeConfig]] → /home/user/tsdoc-edge/managed/primary-types/TsdocEdgeConfig.md:121
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:84
- [[UsageTracker]] → /home/user/tsdoc-edge/managed/utilities/UsageTracker.md:95

