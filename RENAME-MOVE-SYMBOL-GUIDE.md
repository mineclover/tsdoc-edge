# Rename, Move, and Symbol Management Guide

**Complete guide to renaming and moving documentation in TSDoc Edge**

---

## Overview

TSDoc Edge provides three commands for safely managing documentation files and symbols:

1. **`rename`** - Rename a documentation file
2. **`move`** - Move a documentation file to a different directory
3. **`symbol-rename`** - Rename a documentation symbol

All commands automatically update references across your documentation.

---

## Command 1: rename

Rename a documentation file and update all file path references.

### Usage

```bash
tsdoc-edge rename <old-path> <new-path> [options]

Options:
  --dry-run    Preview changes without applying
  --yes        Auto-confirm all changes
```

### What Gets Updated

- ✅ **Backlinks**: `→ /managed/features/file.md`
- ✅ **Path references**: `Path: features/file.md` or `(file.md)`
- ✅ **Markdown links**: `[text](../path/file.md)`
- ✅ **Relative paths**: `../features/file.md`

### Examples

```bash
# Basic rename
tsdoc-edge rename managed/features/old-name.md managed/features/new-name.md

# Shorter form (managed/ assumed)
tsdoc-edge rename features/old-name.md features/new-name.md

# Preview first (recommended)
tsdoc-edge rename old-name.md new-name.md --dry-run

# Auto-confirm for scripts
tsdoc-edge rename old.md new.md --yes
```

### Workflow

1. **Validation**: Checks source exists, destination doesn't
2. **Scan**: Finds all references to the file
3. **Preview**: Shows all references that will be updated
4. **Confirm**: Asks for user approval (unless --yes)
5. **Update**: Updates all references
6. **Rename**: Renames the physical file
7. **Next steps**: Suggests running index-docs and update-backlinks

---

## Command 2: move

Move a documentation file to a different directory and update references.

### Usage

```bash
tsdoc-edge move <source> <destination> [options]

Options:
  --dry-run    Preview changes without applying
  --yes        Auto-confirm all changes
```

### What Gets Updated

Same as `rename` command:
- ✅ Backlinks
- ✅ Path references
- ✅ Markdown links
- ✅ Relative paths

### Examples

```bash
# Move to a directory (keeps filename)
tsdoc-edge move managed/features/file.md managed/workflows/

# Move and rename
tsdoc-edge move features/old.md workflows/new.md

# Preview first
tsdoc-edge move file.md workflows/ --dry-run

# Auto-confirm
tsdoc-edge move file.md workflows/ --yes
```

### Destination Format

```bash
# Ends with / → directory (keeps original filename)
tsdoc-edge move file.md workflows/
# Result: workflows/file.md

# No / → specific file path
tsdoc-edge move file.md workflows/new-name.md
# Result: workflows/new-name.md
```

---

## Command 3: symbol-rename

Rename a documentation symbol and update all `[[Symbol]]` references.

### Usage

```bash
tsdoc-edge symbol-rename <old-symbol> <new-symbol> [options]

Options:
  --dry-run       Preview changes without applying
  --yes, -y       Auto-confirm all changes
  --base-dir=DIR  Base directory (default: managed)
```

### What Gets Updated

- ✅ **H1 primary definitions**: `# [[Symbol]]`
- ✅ **H2 auxiliary definitions**: `## [[Symbol]]`
- ✅ **H3 sub-auxiliary definitions**: `### [[Symbol]]`
- ✅ **Inline references**: `[[Symbol]]`

### Examples

```bash
# Rename a symbol
tsdoc-edge symbol-rename "Old Feature Name" "New Feature Name"

# Preview first
tsdoc-edge symbol-rename "Old Name" "New Name" --dry-run

# Auto-confirm
tsdoc-edge symbol-rename "OldName" "NewName" --yes

# Custom base directory
tsdoc-edge symbol-rename "Symbol" "NewSymbol" --base-dir=docs
```

### Important Notes

- Symbol names are case-sensitive
- Don't include `[[` or `]]` in the arguments
- Maintains SSOT principle (exactly 1 H1 definition)
- Updates ALL occurrences across documentation

---

## Common Workflows

### Scenario 1: Rename file AND symbol

When you want to change both the file name and the symbol name:

```bash
# Step 1: Rename the symbol first
tsdoc-edge symbol-rename "Old Feature" "New Feature" --dry-run
tsdoc-edge symbol-rename "Old Feature" "New Feature"

# Step 2: Rename the file
tsdoc-edge rename features/old-feature.md features/new-feature.md --dry-run
tsdoc-edge rename features/old-feature.md features/new-feature.md

# Step 3: Rebuild indexes
tsdoc-edge index-docs managed
tsdoc-edge update-backlinks
```

### Scenario 2: Reorganize documentation structure

Moving files to better organize your documentation:

```bash
# Move multiple features to workflows directory
tsdoc-edge move features/workflow-a.md workflows/ --yes
tsdoc-edge move features/workflow-b.md workflows/ --yes
tsdoc-edge move features/workflow-c.md workflows/ --yes

# Rebuild indexes
tsdoc-edge index-docs managed
tsdoc-edge update-backlinks
```

### Scenario 3: Rename for clarity

Improving symbol names for better understanding:

```bash
# Preview the change
tsdoc-edge symbol-rename "Core Feature" "Core Workflow Feature" --dry-run

# Review the preview output
# If looks good, apply it
tsdoc-edge symbol-rename "Core Feature" "Core Workflow Feature"
```

---

## Safety Features

All three commands include safety mechanisms:

### 1. Validation

- ✅ Source file/symbol must exist
- ✅ Destination file must NOT exist (for rename/move)
- ✅ Directories must exist

### 2. Preview Mode (--dry-run)

```bash
# Always safe to run - shows what WOULD happen
tsdoc-edge rename old.md new.md --dry-run
tsdoc-edge move file.md dir/ --dry-run
tsdoc-edge symbol-rename "Old" "New" --dry-run
```

**Output shows**:
- Files/symbols that will be changed
- All references that will be updated
- Line numbers and context

### 3. Confirmation Prompt

Unless `--yes` is used, all commands ask for confirmation:

```
Found 15 references
Preview:
  1. README.md:45
     - [[Old Symbol]]
     + [[New Symbol]]
  ...

Proceed? [y/N]:
```

### 4. Rollback

If an error occurs during the operation, the command attempts to rollback changes automatically.

---

## Best Practices

### 1. Always Preview First

```bash
# Good practice - check before applying
tsdoc-edge rename old.md new.md --dry-run
# Review output
tsdoc-edge rename old.md new.md
```

### 2. Rebuild Indexes After

```bash
# After rename/move operations
tsdoc-edge index-docs managed
tsdoc-edge update-backlinks
```

### 3. Commit Changes

```bash
# Good practice for tracking changes
git add -A
git commit -m "refactor: rename Feature X to Feature Y"
```

### 4. Use Symbol Rename for Symbols Only

- **File rename**: Use `rename` command
- **Symbol name**: Use `symbol-rename` command
- **Both**: Do symbol first, then file

### 5. Test in Dry-Run Mode

For complex reorganizations:

```bash
# Test all moves first
for file in features/*.md; do
  tsdoc-edge move "$file" workflows/ --dry-run
done

# If everything looks good, apply
for file in features/*.md; do
  tsdoc-edge move "$file" workflows/ --yes
done
```

---

## Reference Types

### File Path References (rename/move)

| Type | Example | Updated By |
|------|---------|------------|
| Backlink | `→ /managed/features/file.md` | ✅ |
| Path | `Path: features/file.md` | ✅ |
| Path (inline) | `(file.md)` or `` `file.md` `` | ✅ |
| Markdown link | `[text](../path/file.md)` | ✅ |
| Relative path | `../features/file.md` | ✅ |

### Symbol References (symbol-rename)

| Type | Example | Updated By |
|------|---------|------------|
| H1 primary | `# [[Symbol]]` | ✅ |
| H2 auxiliary | `## [[Symbol]]` | ✅ |
| H3 sub-auxiliary | `### [[Symbol]]` | ✅ |
| Inline | `[[Symbol]]` | ✅ |

---

## Troubleshooting

### Issue: "Source file does not exist"

**Cause**: File path is incorrect or relative to wrong directory

**Solution**:
```bash
# Use full path from project root
tsdoc-edge rename managed/features/file.md managed/features/new.md

# Or use absolute paths
tsdoc-edge rename /path/to/managed/features/file.md /path/to/managed/features/new.md
```

### Issue: "Destination already exists"

**Cause**: Target file already exists

**Solution**:
```bash
# Check if file exists
ls managed/features/new.md

# Remove or rename existing file first
rm managed/features/new.md
# Or use different name
tsdoc-edge rename old.md new-v2.md
```

### Issue: References not updated

**Cause**: References might be in excluded files or use non-standard format

**Solution**:
```bash
# Manually search for remaining references
grep -r "old-file-name" managed/
grep -r "Old Symbol Name" managed/

# Update manually if needed
```

### Issue: Symbol has multiple H1 definitions

**Cause**: SSOT principle violation

**Solution**:
```bash
# Find all H1 definitions
grep -r "# \[\[Symbol Name\]\]" managed/

# Keep only one as primary (H1)
# Convert others to auxiliary (H2) or remove
```

---

## Implementation Details

### Commands

- **RenameCommand**: `src/commands/RenameCommand.ts`
- **MoveCommand**: `src/commands/MoveCommand.ts`
- **SymbolRenameCommand**: `src/commands/SymbolRenameCommand.ts`

### Utilities

- **ReferenceUpdater**: `src/utilities/ReferenceUpdater.ts` (file path references)
- **SymbolReferenceUpdater**: `src/utilities/SymbolReferenceUpdater.ts` (symbol references)

### Files Modified

```
rename/move commands:
  - All .md files with file path references

symbol-rename command:
  - All .md files with [[Symbol]] references
```

---

## Quick Reference

```bash
# Rename file
tsdoc-edge rename old.md new.md [--dry-run] [--yes]

# Move file
tsdoc-edge move file.md dir/ [--dry-run] [--yes]

# Rename symbol
tsdoc-edge symbol-rename "Old" "New" [--dry-run] [--yes]

# Get help
tsdoc-edge rename --help
tsdoc-edge move --help
tsdoc-edge symbol-rename --help
```

---

**Last Updated**: 2025-11-25
**Version**: 0.12.1
