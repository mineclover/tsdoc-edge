# [[CommentStateTypes]]

**Source**: `src/types/state/comment.ts`

## Purpose

Type system for comment fold/unfold operations.

## Comment Status

See implementation: [[CommentStatus]]

**Values**:
- **expanded**: Full comment visible in code
- **collapsed**: Summary only (detail in markdown)

## Comment Location

Position in source file:

See implementation: [[CommentLocation]]

**Key Properties**:
- `filePath`: Relative to project root
- `line`: Start line (1-based)
- `column`: Start column (0-based)
- `endLine`: End line (1-based)

## Comment State

State of a single comment:

See implementation: [[CommentState]]

**Key Properties**:
- `id`: Unique identifier
- `contentHash`: SHA-256 hash
- `location`: Comment location
- `symbol`: Symbol name
- `status`: Comment status (expanded/collapsed)
- `fullComment`: Original full text
- `collapsedComment`: Summary only
- `markdownPath`: External markdown file (optional)
- `lastModified`: ISO timestamp

## File Comment State

All comments in a file:

See implementation: [[FileCommentState]]

**Key Properties**:
- `filePath`: File path
- `comments`: Comment states
- `isFolded`: Any comments folded?
- `lastModified`: ISO timestamp

## State Storage

Persistent storage structure:

See implementation: [[StateStorage]]

**Key Properties**:
- `version`: Storage format version
- `lastUpdated`: ISO timestamp
- `files`: File comment states map

## Collapse/Expand Options

### Collapse Options

See implementation: [[CollapseOptions]]

**Key Properties**:
- `exportDir`: Where to export markdown (optional)
- `updateSource`: Remove from source? (optional)
- `preserveMarkers`: Add fold markers? (optional)
- `summaryLength`: Max summary chars (optional)

### Expand Options

See implementation: [[ExpandOptions]]

**Key Properties**:
- `restoreDir`: Where to import from (optional)
- `validateSource`: Check conflicts? (optional)
- `mergeStrategy`: Merge strategy - 'overwrite', 'keep-source', or 'merge'

## Export/Import Results

### Export Result

See implementation: [[ExportResult]]

**Key Properties**:
- `exportedCount`: Number of exported comments
- `exportedFiles`: List of exported files
- `errors`: Export errors

### Import Result

See implementation: [[ImportResult]]

**Key Properties**:
- `importedCount`: Number of imported comments
- `updatedFiles`: List of updated files
- `conflicts`: Conflict information
- `errors`: Import errors

## File Status Summary

Quick status check:

See implementation: [[FileStatusSummary]]

**Key Properties**:
- `filePath`: File path
- `totalComments`: Total number of comments
- `expandedComments`: Number of expanded comments
- `collapsedComments`: Number of collapsed comments
- `isFolded`: Any comments folded?
- `lastModified`: ISO timestamp

## Content Hashing

SHA-256 hash of comment content:
- Detects changes
- Prevents stale restores
- Validates integrity

```typescript
contentHash = sha256(fullComment);
```

## Fold/Unfold Workflow

### Fold (Collapse)

1. Parse TSDoc comments
2. Extract full content
3. Generate summary
4. Create markdown file
5. Update source with summary
6. Save state

### Unfold (Expand)

1. Load state
2. Read markdown file
3. Validate hash
4. Replace summary with full content
5. Update source
6. Clear state

## Use Cases

### Code Review
- Fold comments to focus on logic
- Review code without documentation clutter

### Documentation Work
- Expand comments to markdown
- Edit all docs in one place
- Collapse back when done

### Refactoring
- Preserve docs separately
- Refactor code independently
- Restore docs after

## Symbol Count

1 type, 7 interfaces

## Related

- [[CommentStateManager]]: Manages state
- [[CommentExporter]]: Exports to markdown
- [[CommentImporter]]: Imports from markdown

---

## Backlinks

### Referenced By

- [[CommentExporter]] → /home/user/tsdoc-edge/managed/fold/CommentExporter.md:41
- [[CommentExporter]] → /home/user/tsdoc-edge/managed/fold/CommentExporter.md:42
- [[CommentExporter]] → /home/user/tsdoc-edge/managed/fold/CommentExporter.md:43
- [[CommentImporter]] → /home/user/tsdoc-edge/managed/fold/CommentImporter.md:41
- [[CommentImporter]] → /home/user/tsdoc-edge/managed/fold/CommentImporter.md:42
- [[CommentImporter]] → /home/user/tsdoc-edge/managed/fold/CommentImporter.md:43
- [[CommentStateManager]] → /home/user/tsdoc-edge/managed/fold/CommentStateManager.md:41
- [[CommentStateManager]] → /home/user/tsdoc-edge/managed/fold/CommentStateManager.md:42
- [[CommentStateManager]] → /home/user/tsdoc-edge/managed/fold/CommentStateManager.md:43

