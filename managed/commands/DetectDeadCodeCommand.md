---
title: Detect Dead Code Command
type: command
category: commands
status: active
canonical: true
---

# [[DetectDeadCodeCommand]]

**Source**: `src/commands/DetectDeadCodeCommand.ts`

## Purpose

Detect and tag unused code (dead code) by analyzing call graphs, dependency relationships, and intra-file references.

## Detection Strategy

Uses multi-signal metrics to identify dead code:
- **Incoming calls**: Symbols never called by other code
- **Incoming dependencies**: Symbols never imported or referenced
- **Intra-file reference count**: Identifies symbols never referenced even inside their declaring file
- **True application entry points**: Excludes `src/index.ts`, `src/cli.ts`, `src/lsp/server.ts`, `mcp-server/src/index.ts`, and CLI command classes

## Confidence Levels

### High Confidence (Safe to Delete / Tag)
- 0 incoming calls AND 0 incoming dependencies
- Intra-file reference count $\le 1$ (only declaration itself)
- Not an entry point or test file
- Completely isolated from codebase

### Medium Confidence (Unused Export / Review Required)
- 0 external incoming calls or dependencies
- Exported from declaring module, but never imported by any other module
- Review before deletion or remove export keyword

### Low Confidence (Test Only)
- Only used in test files
- May be extracted to test utilities or test fixtures

## Self-Tagging & Exploration Capabilities

TSDoc Edge provides automated self-tagging with `@deprecated` and `@deadcode`:
- **Automated annotation**: Inserts or appends `@deprecated` and `@deadcode` TSDoc tags directly above symbol declarations
- **Dry-run verification**: Previews all tagging or untagging actions without modifying files
- **Tag search & audit**: Discovers all symbols already tagged across the repository
- **Reversal**: Cleans up tags via `--untag` when code is revived

## Usage

```bash
# Explore high-confidence dead code
tsdoc-edge detect-dead-code

# Explore scoped to a specific directory or file
tsdoc-edge detect-dead-code src/analyzer --type interface

# Search already tagged dead code symbols
tsdoc-edge detect-dead-code --tagged

# Preview tagging dead code in dry-run mode
tsdoc-edge detect-dead-code src/analyzer --tag --dry-run

# Automatically tag dead code in source files
tsdoc-edge detect-dead-code src/analyzer --tag

# Remove dead code tags
tsdoc-edge detect-dead-code src/analyzer --untag

# Output structured JSON
tsdoc-edge detect-dead-code --json
```

## Options

- `--all`: Show all dead code candidates (including low confidence)
- `--high`: Show only high confidence candidates (default)
- `--medium`: Show medium and high confidence candidates
- `--confidence=LEVEL`: Filter by confidence (`high`, `medium`, `low`, `all`)
- `--path=PATH`: Filter candidates by file or directory path
- `--type=TYPE`: Filter by symbol type (`function`, `class`, `interface`, `type`, `constant`, `variable`)
- `--tagged`: Search and list symbols already tagged with `@deadcode` or `@deprecated`
- `--tag`, `--apply-tag`: Automatically annotate dead code in source files
- `--dry-run`: Preview tagging actions without modifying files
- `--untag`: Remove dead code tags
- `--json`: Output results in JSON format
- `--summary`: Show aggregated breakdown of dead code candidates

## Related

- [[TagDeadCodeCommand]]: Dedicated command for tagging dead code
- [[OrphansCommand]]: Finds unreferenced symbols
- [[CoverageReportCommand]]: Identifies undocumented code
- [[AnalyzeCallsCommand]]: Call graph analysis
- [[AnalyzeTypesCommand]]: Type dependency analysis

---

## Backlinks

### Referenced By

- [[CoverageReportCommand]] → managed/commands/CoverageReportCommand.md:270
- [[OrphansCommand]] → managed/commands/OrphansCommand.md:181
- [[TagDeadCodeCommand]] → managed/commands/TagDeadCodeCommand.md:43
- [[Dead Code Detection]] → managed/features/DeadCodeDetection.md:105
- [[DataFlowTypes]] → managed/types/DataFlowTypes.md:174

### Implemented By

- DetectDeadCodeCommand → src/commands/DetectDeadCodeCommand.ts:42

