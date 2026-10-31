---
title: Tag Dead Code Command
type: command
category: commands
status: active
canonical: true
---

# [[TagDeadCodeCommand]]

**Source**: `src/commands/TagDeadCodeCommand.ts`

## Purpose

Annotate unused/dead code in source files with `@deprecated` and `@deadcode` TSDoc tags.

## Usage

```bash
# Preview tagging in dry-run mode
tsdoc-edge tag-dead-code src/analyzer --dry-run

# Apply dead code tags to source files
tsdoc-edge tag-dead-code src/analyzer

# Filter by symbol type
tsdoc-edge tag-dead-code src/analyzer --type interface

# Untag dead code symbols
tsdoc-edge tag-dead-code src/analyzer --untag
```

## Options

- `--dry-run`: Preview tagging actions without modifying files
- `--untag`: Remove dead code tags instead of adding them
- `--confidence=LEVEL`: Filter by confidence (`high`, `medium`, `low`, `all`, default: `high`)
- `--type=TYPE`: Filter by symbol type (`function`, `class`, `interface`, `type`, `constant`, `variable`)
- `--reason=TEXT`: Custom reason to attach to generated tags

## Related

- [[DetectDeadCodeCommand]]: Detection and exploration of dead code
- [[Dead Code Detection]]: Dead code detection feature guide

---

## Backlinks

### Referenced By

- [[DetectDeadCodeCommand]] → managed/commands/DetectDeadCodeCommand.md:92
- [[Dead Code Detection]] → managed/features/DeadCodeDetection.md:106

### Implemented By

- TagDeadCodeCommand → src/commands/TagDeadCodeCommand.ts:18

