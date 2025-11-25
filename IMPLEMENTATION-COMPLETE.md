# Rename/Move Commands - Implementation Complete ✅

**Status**: ✅ Implemented in v0.12.1  
**Date**: 2025-11-25

## Summary

Successfully implemented `rename` and `move` commands for TSDoc Edge documentation management with automatic reference updates.

## Features Implemented

### 1. RenameCommand (`src/commands/RenameCommand.ts`)
Renames a documentation file and updates all references.

**Usage**:
```bash
tsdoc-edge rename <old-path> <new-path> [options]

Options:
  --dry-run    Preview changes without applying
  --yes        Auto-confirm all changes

Examples:
  tsdoc-edge rename managed/features/old.md managed/features/new.md
  tsdoc-edge rename old.md new.md --dry-run
```

### 2. MoveCommand (`src/commands/MoveCommand.ts`)
Moves a documentation file to a different directory and updates all references.

**Usage**:
```bash
tsdoc-edge move <source> <destination> [options]

Options:
  --dry-run    Preview changes without applying
  --yes        Auto-confirm all changes

Examples:
  tsdoc-edge move managed/features/file.md managed/workflows/
  tsdoc-edge move file.md workflows/ --dry-run
```

### 3. ReferenceUpdater (`src/utilities/ReferenceUpdater.ts`)
Utility class to find and update file path references in documentation.

**Supported Reference Types**:
- **Backlinks**: `→ /managed/features/file.md`
- **Path references**: `Path: features/file.md` or `(file.md)` or `` `file.md` ``
- **Markdown links**: `[text](../path/file.md)`
- **Relative paths**: `../features/file.md`

## Technical Implementation

### ReferenceUpdater Algorithm

1. **Find References**:
   - Scan all markdown files in `managed/` directory
   - Match patterns: backlinks, paths, markdown links, relative paths
   - Store file, line number, type, and context

2. **Update References**:
   - Calculate new paths based on reference type
   - Group by file for efficient updates
   - Replace old text with new text
   - Handle relative path calculations

3. **Path Resolution**:
   - Absolute paths
   - Relative to managed/ directory
   - Basename matching
   - Relative path resolution

### Safety Features

✅ **Validation**: Check source exists, destination doesn't exist  
✅ **Preview**: Show all references before applying changes  
✅ **Dry-run**: Test mode without making changes  
✅ **Rollback**: Restore original state on error  
✅ **Confirmation**: Require user approval (unless --yes)

## Integration

Commands are registered in `src/cli.ts`:
```typescript
registry.register(new RenameCommand());
registry.register(new MoveCommand());
```

Exported from `src/commands/index.ts`:
```typescript
export { RenameCommand } from './RenameCommand';
export { MoveCommand } from './MoveCommand';
```

## Use Cases

### Scenario 1: Rename for Clarity
```bash
# Before: managed/features/core-workflow.md
# After: managed/features/CoreWorkflowFeature.md
tsdoc-edge rename managed/features/core-workflow.md managed/features/CoreWorkflowFeature.md
```

**Updates**:
- All backlinks: `→ /managed/features/core-workflow.md`
- Path references in README.md
- Markdown links from other documents

### Scenario 2: Reorganize Structure
```bash
# Move feature docs to workflows directory
tsdoc-edge move managed/features/workflow-doc.md managed/workflows/
```

**Updates**:
- Backlinks across all documentation
- Relative paths in related documents
- Index references

### Scenario 3: Batch Preview
```bash
# Check impact before applying
tsdoc-edge rename old-name.md new-name.md --dry-run
```

**Output**:
```
Preview:
  File to rename:
    - /path/to/old-name.md
    + /path/to/new-name.md

  References (5):
    1. managed/README.md:45
       - [[Symbol]] (old-name.md)
       + [[Symbol]] (new-name.md)
```

## Testing

Build successful:
```bash
npm run build  # ✅ No errors
node dist/cli.js rename --help  # ✅ Shows usage
node dist/cli.js move --help    # ✅ Shows usage
```

## Future Enhancements

See `DESIGN-RENAME-MOVE.md` for planned features:
- [ ] Batch operations (rename multiple files)
- [ ] Symbol rename (update H1 header)
- [ ] Git integration (use `git mv`)
- [ ] Interactive mode (prompt for each change)
- [ ] Backup mechanism (create .backup files)

## Related Documentation

- **Design Document**: `DESIGN-RENAME-MOVE.md` - Full design specification
- **User Guide**: Run `tsdoc-edge rename --help` or `tsdoc-edge move --help`
- **Code**: `src/commands/{Rename,Move}Command.ts`, `src/utilities/ReferenceUpdater.ts`

---

**Implementation Time**: ~2 hours  
**Lines of Code**: ~600 lines (RenameCommand + MoveCommand + ReferenceUpdater)  
**Commands Added**: 2  
**Utilities Added**: 1
