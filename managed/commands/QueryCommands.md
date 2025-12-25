---
title: Query Commands
type: command
category: commands
status: active
canonical: true
---

# [[QueryCommands]]

**Source**: `src/commands/Phase5Commands.ts`, `src/commands/Phase7Commands.ts`

## Overview

Query commands for exploring dependencies, usage, and project statistics.

## Commands

### [[DepsCommand]]

Show dependencies of a symbol.

**Usage**: `tsdoc-edge deps <symbol-name>`

**Source**: `src/commands/Phase5Commands.ts`

**Output**:
- Direct dependencies
- Transitive dependencies
- Dependency tree

### [[WhoUsesCommand]]

Show reverse dependencies (who uses this symbol).

**Usage**: `tsdoc-edge who-uses <symbol-name>`

**Alias**: `used-by`

**Source**: `src/commands/Phase5Commands.ts`

**Output**:
- Direct usages
- Indirect usages
- Usage count

### [[OrphansCommand]]

Find orphaned code (unreachable from entry points).

**Usage**: `tsdoc-edge orphans`

**Source**: `src/commands/Phase5Commands.ts`

**Output**:
- Orphaned files
- Orphaned symbols
- Orphan count

### [[StatsCommand]]

Display project statistics.

**Usage**: `tsdoc-edge stats`

**Source**: `src/commands/Phase7Commands.ts`

**Output**:
- Symbol counts by type
- File counts
- Relationship counts
- Coverage statistics

### [[UndocumentedCommand]]

Find undocumented symbols.

**Usage**: `tsdoc-edge undocumented`

**Source**: `src/commands/Phase7Commands.ts`

### [[UntestedCommand]]

Find untested code.

**Usage**: `tsdoc-edge untested`

**Source**: `src/commands/Phase7Commands.ts`

## Related

- [[Phase Commands]]: Dependencies and usage queries
- [[Phase Commands]]: Statistics and reporting
- [[WorkContextCommand]]: Comprehensive file context
