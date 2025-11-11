# [[CommentStateTypes]]

**Source**: `src/types/state/comment.ts`

## Purpose

Type system for comment fold/unfold operations.

## Comment Status

```typescript
type CommentStatus = 'expanded' | 'collapsed';
```

- **expanded**: Full comment visible in code
- **collapsed**: Summary only (detail in markdown)

## Comment Location

Position in source file:
```typescript
interface CommentLocation {
  filePath: string;     // Relative to project root
  line: number;         // Start line (1-based)
  column: number;       // Start column (0-based)
  endLine: number;      // End line (1-based)
}
```

## Comment State

State of a single comment:
```typescript
interface CommentState {
  id: string;              // Unique identifier
  contentHash: string;     // SHA-256 hash
  location: CommentLocation;
  symbol: string;          // Symbol name
  status: CommentStatus;
  fullComment: string;     // Original full text
  collapsedComment: string; // Summary only
  markdownPath?: string;   // External markdown file
  lastModified: string;    // ISO timestamp
}
```

## File Comment State

All comments in a file:
```typescript
interface FileCommentState {
  filePath: string;
  comments: CommentState[];
  isFolded: boolean;       // Any comments folded?
  lastModified: string;
}
```

## State Storage

Persistent storage structure:
```typescript
interface StateStorage {
  version: string;         // Storage format version
  lastUpdated: string;     // ISO timestamp
  files: Record<string, FileCommentState>;
}
```

## Collapse/Expand Options

### Collapse Options

```typescript
interface CollapseOptions {
  exportDir?: string;      // Where to export markdown
  updateSource?: boolean;  // Remove from source?
  preserveMarkers?: boolean; // Add fold markers?
  summaryLength?: number;  // Max summary chars
}
```

### Expand Options

```typescript
interface ExpandOptions {
  restoreDir?: string;     // Where to import from
  validateSource?: boolean; // Check conflicts?
  mergeStrategy?: 'overwrite' | 'keep-source' | 'merge';
}
```

## Export/Import Results

### Export Result

```typescript
interface ExportResult {
  exportedCount: number;
  exportedFiles: string[];
  errors: Error[];
}
```

### Import Result

```typescript
interface ImportResult {
  importedCount: number;
  updatedFiles: string[];
  conflicts: ConflictInfo[];
  errors: Error[];
}
```

## File Status Summary

Quick status check:
```typescript
interface FileStatusSummary {
  filePath: string;
  totalComments: number;
  expandedComments: number;
  collapsedComments: number;
  isFolded: boolean;
  lastModified: string;
}
```

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

- [[CommentExporter]] → /home/user/tsdoc-edge/managed/fold/CommentExporter.md:35
- [[CommentImporter]] → /home/user/tsdoc-edge/managed/fold/CommentImporter.md:35
- [[CommentStateManager]] → /home/user/tsdoc-edge/managed/fold/CommentStateManager.md:35

