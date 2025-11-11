# Rename/Move Commands Design

## Problem Statement

TSDoc Edge 문서 시스템에서 파일을 이동하거나 이름을 변경할 때 다음 문제가 발생:

1. **심볼 참조 깨짐**: `[[Symbol]]` 참조는 유지되지만 파일 경로 변경 시 혼란
2. **Backlinks 불일치**: Backlinks의 파일 경로가 구버전을 가리킴
3. **상대 경로 참조 깨짐**: 문서 내 상대 경로 링크 손상
4. **인덱스 불일치**: index.md의 경로 정보가 오래됨

### Example Scenario

```bash
# 파일 이름 변경
managed/features/core-workflow.md → managed/features/CoreWorkflowFeature.md

# 발생하는 문제들:
# 1. 다른 문서의 backlinks: "→ /managed/features/core-workflow.md" (구경로)
# 2. index.md의 경로: "Path: core-workflow.md" (구경로)
# 3. 상대 링크: "../features/core-workflow.md" (깨짐)
```

## Solution: Two Commands

### 1. RenameCommand

파일 이름을 변경하고 모든 참조를 업데이트.

**Usage**:
```bash
tsdoc-edge rename <old-path> <new-path> [options]

# Examples:
tsdoc-edge rename managed/features/core-workflow.md managed/features/CoreWorkflowFeature.md
tsdoc-edge rename core-workflow.md CoreWorkflowFeature.md  # 짧은 형식
```

**Options**:
- `--dry-run`: Preview changes without applying
- `--symbol=<new-symbol>`: Also rename the H1 symbol
- `--update-refs`: Update all references (default: true)
- `--yes, -y`: Auto-confirm all changes

### 2. MoveCommand

파일을 다른 디렉토리로 이동하고 모든 참조를 업데이트.

**Usage**:
```bash
tsdoc-edge move <source> <dest-dir> [options]

# Examples:
tsdoc-edge move managed/features/core-workflow.md managed/workflows/
tsdoc-edge move core-workflow.md workflows/  # 짧은 형식
```

**Options**:
- `--dry-run`: Preview changes without applying
- `--update-refs`: Update all references (default: true)
- `--yes, -y`: Auto-confirm all changes

## Implementation Details

### Phase 1: Rename Command

#### Step 1: Validate
```typescript
interface RenameValidation {
  oldPath: string;  // Absolute path
  newPath: string;  // Absolute path
  oldExists: boolean;
  newExists: boolean;
  hasH1Symbol: boolean;
  symbolName?: string;
}
```

Checks:
- Old file exists
- New file does NOT exist
- Old file has H1 symbol
- No naming conflicts

#### Step 2: Find All References
```typescript
interface FileReference {
  file: string;          // File containing the reference
  line: number;          // Line number
  type: 'backlink' | 'path' | 'relative';
  oldText: string;       // Text to replace
  newText: string;       // Replacement text
}
```

Scan for:
1. **Backlinks**: `→ /managed/features/core-workflow.md`
2. **Path references**: `Path: core-workflow.md` or `(core-workflow.md)`
3. **Relative paths**: `../features/core-workflow.md`
4. **Symbol references**: Usually preserved (no change needed)

#### Step 3: Preview Changes
```
Preview of changes:

File to rename:
  managed/features/core-workflow.md → managed/features/CoreWorkflowFeature.md

References to update (15 files):
  1. managed/features/index.md:45
     - Path: core-workflow.md
     + Path: CoreWorkflowFeature.md

  2. managed/README.md:98
     - [[Core Workflow]] (core-workflow.md)
     + [[Core Workflow]] (CoreWorkflowFeature.md)

  3. managed/workflows/work-context-workflow.md:123
     - → /managed/features/core-workflow.md
     + → /managed/features/CoreWorkflowFeature.md

Proceed? [y/N]:
```

#### Step 4: Apply Changes
1. Update all references in other files
2. Rename the physical file
3. Update backlinks (run update-backlinks)
4. Validate (run validate-symbol-refs)

### Phase 2: Move Command

Similar to Rename, but handles directory changes:

#### Additional Considerations
```typescript
interface MoveValidation {
  sourcePath: string;      // Absolute source
  destDir: string;         // Absolute destination directory
  destPath: string;        // Final absolute path
  sourceExists: boolean;
  destDirExists: boolean;
  destFileExists: boolean;
  hasH1Symbol: boolean;
  symbolName?: string;
}
```

#### Relative Path Updates
When moving files, relative paths change:
```typescript
// Before: managed/features/core-workflow.md
// Link: ../relationships/index.md

// After: managed/workflows/core-workflow.md
// Link needs update: ../relationships/index.md → ../relationships/index.md (same depth)

// But if depth changes:
// After: managed/workflows/sub/core-workflow.md
// Link needs update: ../relationships/index.md → ../../relationships/index.md
```

### Common Utilities

Both commands share utilities:

```typescript
class ReferenceUpdater {
  /**
   * Find all references to a file path
   */
  findReferences(oldPath: string): FileReference[] {
    // Scan all .md files
    // Find backlinks
    // Find path references
    // Find relative links
  }

  /**
   * Update a single reference
   */
  updateReference(ref: FileReference): void {
    // Read file
    // Replace text at line
    // Write file
  }

  /**
   * Calculate new relative path after move
   */
  calculateRelativePath(
    fromFile: string,
    oldTarget: string,
    newTarget: string
  ): string {
    // Calculate relative path adjustment
  }
}

class FileRenamer {
  /**
   * Safely rename a file
   */
  rename(oldPath: string, newPath: string): void {
    // Check locks
    // Rename file
    // Update git (if in repo)
  }
}

class FileValidator {
  /**
   * Validate rename operation
   */
  validateRename(old: string, new: string): RenameValidation {
    // File existence checks
    // Symbol checks
    // Conflict checks
  }

  /**
   * Validate move operation
   */
  validateMove(source: string, dest: string): MoveValidation {
    // Similar to validateRename
  }
}
```

## Safety Mechanisms

### 1. Dry-run Mode
Always show preview before making changes:
```bash
tsdoc-edge rename old.md new.md --dry-run
```

### 2. Confirmation Prompt
Require user confirmation unless `--yes` flag:
```
15 files will be updated. Proceed? [y/N]:
```

### 3. Backup
Optional backup before changes:
```bash
tsdoc-edge rename old.md new.md --backup
# Creates: old.md.backup
```

### 4. Validation
After changes, run validation:
```bash
# Automatically run:
tsdoc-edge validate-symbol-refs managed
```

### 5. Rollback
If validation fails, offer rollback:
```
❌ Validation failed after rename!
Found 5 broken references.

Rollback changes? [y/N]:
```

## Testing Strategy

### Unit Tests
```typescript
describe('RenameCommand', () => {
  it('should find all backlink references', () => {});
  it('should find all path references', () => {});
  it('should update relative paths correctly', () => {});
  it('should handle symbol name conflicts', () => {});
  it('should rollback on validation failure', () => {});
});

describe('MoveCommand', () => {
  it('should calculate new relative paths', () => {});
  it('should update references across directories', () => {});
  it('should handle nested directory moves', () => {});
});
```

### Integration Tests
```typescript
describe('rename integration', () => {
  it('should rename file and update all references', async () => {
    // 1. Create test file with references
    // 2. Run rename command
    // 3. Verify file renamed
    // 4. Verify all references updated
    // 5. Verify validation passes
  });
});
```

## Implementation Plan

### Phase 1: Core Utilities (2-3 hours)
- [ ] FileValidator class
- [ ] ReferenceUpdater class
- [ ] FileRenamer class
- [ ] Unit tests

### Phase 2: RenameCommand (3-4 hours)
- [ ] RenameCommand class
- [ ] CLI interface
- [ ] Dry-run support
- [ ] Confirmation prompts
- [ ] Integration tests

### Phase 3: MoveCommand (2-3 hours)
- [ ] MoveCommand class
- [ ] Relative path calculation
- [ ] CLI interface
- [ ] Integration tests

### Phase 4: Safety & Polish (2-3 hours)
- [ ] Backup mechanism
- [ ] Rollback support
- [ ] Better error messages
- [ ] Documentation

**Total Estimate**: 9-13 hours

## Success Criteria

✅ Can rename file and update all references
✅ Can move file to different directory
✅ Backlinks remain valid after rename/move
✅ Relative paths update correctly
✅ Validation passes after operation
✅ Dry-run mode works correctly
✅ Rollback works on failure
✅ Zero broken references after operation

## Future Enhancements

### Batch Operations
```bash
tsdoc-edge rename --batch rename-map.json
```

### Symbol Rename
```bash
tsdoc-edge rename old.md new.md --rename-symbol "New Symbol Name"
```

### Git Integration
```bash
tsdoc-edge move file.md new-dir/ --git
# Uses: git mv instead of fs.rename
```

### Interactive Mode
```bash
tsdoc-edge rename old.md --interactive
# Prompts for new name
# Shows preview
# Confirms each change
```
