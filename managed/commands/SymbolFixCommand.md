# [[SymbolFixCommand]]

**Source**: `src/commands/SymbolFixCommand.ts`

## Purpose

Automatically detect and fix common symbol reference issues in documentation. Provides safe, automated fixes for typos, duplicates, and formatting problems while requiring confirmation for destructive changes.

## Usage

```bash
tsdoc-edge symbol-fix <docs-dir> [options]
```

### Options

- `--dry-run`: Show what would be fixed without making changes
- `--yes`, `-y`: Auto-confirm fixes (skip confirmation prompt)
- `--type=<type>`: Filter by issue type (typo, duplicate-h1, formatting)

## Examples

```bash
# Preview fixes (safe, no changes)
tsdoc-edge symbol-fix managed --dry-run

# Apply auto-fixable issues
tsdoc-edge symbol-fix managed --yes

# Fix only duplicate H1 issues
tsdoc-edge symbol-fix managed --type=duplicate-h1 --yes
```

## Issue Types

### 1. Duplicate H1 (duplicate-h1)

**Problem**: Multiple primary definitions for the same symbol.

```markdown
# File 1: managed/commands/BuildCommand.md
# [[BuildCommand]]  ← Primary #1

# File 2: managed/COMMANDS.md
# [[BuildCommand]]  ← Primary #2 (DUPLICATE)
```

**Fix**: Convert duplicate H1 to H2 auxiliary definition.

```markdown
# After fix in File 2:
## [[BuildCommand]]  ← Auxiliary (context-specific explanation)
```

**Severity**: `manual` - Requires review to choose which is canonical

**Example**:
```bash
tsdoc-edge symbol-fix managed --type=duplicate-h1 --dry-run
```

### 2. Possible Typos (typo)

**Problem**: Very similar symbol names (Levenshtein distance ≤ 2).

**Examples**:
- `BuildCommand` vs `BuildComand` (edit distance: 1) → typo
- `AnalyzeCommand` vs `AnalyzeIOCommand` (edit distance: 2) → intentional

**Fix Suggestion**: Rename or confirm both are intentional.

**Severity**: `review` - Needs human judgment

**Detection**:
```typescript
const distance = levenshteinDistance(
  normalize(sym1),
  normalize(sym2)
);

if (distance <= 2 && distance > 0) {
  // Flag as potential typo
}
```

**Example**:
```bash
tsdoc-edge symbol-fix managed --type=typo --dry-run
```

### 3. Missing Primary (missing_primary)

**Problem**: Inline reference `[[Symbol]]` but no H1 primary definition exists.

**Fix**: Generate skeleton primary definition.

```markdown
# Generated file: managed/concepts/<symbol-name>.md
# [[SymbolName]]

**Status**: 🚧 Stub (needs documentation)

## Purpose

(To be documented)

## Related

- [[Parent Concept]]
- [[Related Feature]]
```

**Severity**: `auto` - Can be safely automated

**Status**: 🚧 Not yet implemented (planned)

### 4. Orphaned Auxiliary (orphaned-aux)

**Problem**: H2 auxiliary definition without corresponding H1 primary.

```markdown
## [[FeatureName]]  ← Orphaned (no H1 exists)
This feature does X...
```

**Fix Options**:
1. Convert to H1 primary: `# [[FeatureName]]`
2. Convert to inline reference: `[[FeatureName]]`
3. Create H1 in separate file

**Severity**: `manual` - Requires decision

**Status**: 🚧 Not yet implemented (planned)

### 5. Formatting Issues (formatting)

**Problem**: Inconsistent symbol name formatting.

**Examples**:
- Extra spaces: `[[ BuildCommand ]]` → `[[BuildCommand]]`
- Case inconsistency: `[[buildcommand]]` → `[[BuildCommand]]`
- Special characters: `[[Build-Command!]]` → `[[BuildCommand]]`

**Fix**: Normalize to canonical format.

**Severity**: `auto` - Safe to automate

**Status**: 🚧 Not yet implemented (planned)

## Fix Workflow

### Phase 1: Analysis

```typescript
1. Build symbol index
   - Parse all markdown files
   - Extract H1, H2, inline references

2. Detect issues
   - Check for duplicate H1s
   - Calculate edit distances
   - Identify formatting problems

3. Generate fix suggestions
   - Type, severity, location
   - Specific fix actions
```

### Phase 2: Display

```typescript
1. Group by issue type
2. Show top 10 per type
3. Display:
   - Symbol name
   - File:line
   - Issue description
   - Fix suggestion
   - Severity icon (🤖 auto, 👤 manual, 👀 review)
```

### Phase 3: Apply Fixes

```typescript
1. Filter to auto-fixable (severity === 'auto')
2. Confirm with user (unless --yes)
3. Apply fixes:
   - Read file
   - Modify line
   - Write back
   - Report success/failure
```

## Safety Features

### Dry-Run Mode

```bash
tsdoc-edge symbol-fix managed --dry-run
```

- No files modified
- Shows what would be fixed
- Safe to run anytime

### Confirmation Required

```bash
tsdoc-edge symbol-fix managed
# Prompt: This will modify your files. Use --yes to confirm.
```

- Manual confirmation by default
- Prevents accidental changes
- Use `--yes` to skip

### Validation Before Fix

```typescript
// Before modifying file
if (lines[lineNum - 1]?.includes(`# [[${symbolName}]]`)) {
  // Safe to modify
} else {
  throw new Error(`Line mismatch: expected H1 at line ${lineNum}`);
}
```

### Atomic Operations

- Each fix is independent
- Failures don't affect other fixes
- Clear success/failure reporting

## Implementation

### Architecture

```
SymbolFixCommand
├── Analysis Phase
│   ├── buildIndex(): Parse all documents
│   └── detectIssues(): Find fixable problems
├── Display Phase
│   └── displaySuggestions(): Group and format output
└── Fix Phase
    ├── applyFixes(): Execute auto-fixes
    └── Individual fix functions:
        ├── convertH1ToH2()
        ├── normalizeFormatting()
        └── createSkeletonDoc()
```

### Similarity Detection

```typescript
// Normalize for comparison
function normalizeSymbolName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// Calculate edit distance
function levenshteinDistance(a: string, b: string): number {
  // Dynamic programming algorithm
  // O(m * n) time complexity
}
```

### Fix Functions

```typescript
// Convert H1 to H2
convertH1ToH2(filePath, line, symbolName) {
  const lines = readFileSync(filePath, 'utf-8').split('\n');
  lines[line - 1] = lines[line - 1].replace(/^#\s+/, '## ');
  writeFileSync(filePath, lines.join('\n'));
}
```

## Current Limitations

### Not Yet Implemented

1. **Missing Primary Generation**: Stub creation for undefined symbols
2. **Orphaned Auxiliary Fixes**: Conversion to H1 or inline
3. **Formatting Normalization**: Automatic name cleanup
4. **Batch Rename**: Change all references when renaming symbol

### Manual Review Required

- Typo vs intentional similarity
- Which H1 to keep as canonical
- Whether to merge or keep separate symbols

## Integration

### Workflow Integration

```bash
# 1. Validate and identify issues
tsdoc-edge validate-symbol-refs managed

# 2. Preview auto-fixes
tsdoc-edge symbol-fix managed --dry-run

# 3. Apply fixes
tsdoc-edge symbol-fix managed --yes

# 4. Re-validate
tsdoc-edge validate-symbol-refs managed
```

### Depends On

- [[DocumentSymbolParser]]: Symbol extraction
- [[SymbolQueryCommand]]: Similar symbol detection
- [[BaseCommand]]: CLI infrastructure

### Used By

- Manual documentation maintenance
- CI/CD pre-commit hooks (dry-run mode)
- Automated cleanup workflows

## Examples

### Fix Duplicate H1s

```bash
# Step 1: Find duplicates
tsdoc-edge validate-symbol-refs managed 2>&1 | grep "duplicate"

# Step 2: Preview fix
tsdoc-edge symbol-fix managed --type=duplicate-h1 --dry-run

# Step 3: Review which should be canonical
# (Manually check files)

# Step 4: Apply fix
tsdoc-edge symbol-fix managed --type=duplicate-h1 --yes
```

### Review Potential Typos

```bash
# Step 1: Find typos
tsdoc-edge symbol-fix managed --type=typo --dry-run

# Step 2: For each flagged symbol
tsdoc-edge symbol-query managed info "Symbol1"
tsdoc-edge symbol-query managed info "Symbol2"

# Step 3: If typo, rename manually
# If intentional, ignore
```

## Testing

```bash
# Unit tests
npm test src/commands/SymbolFixCommand.test.ts

# Integration tests
./scripts/test-symbol-fix.sh

# Manual testing (safe)
tsdoc-edge symbol-fix managed --dry-run
```

## See Also

- [[Symbol Reference System]]: Reference conventions (H1/H2/inline)
- [[SymbolQueryCommand]]: Symbol exploration and search
- [[ValidateSymbolRefsCommand]]: Symbol validation
- [[SELF-IMPROVEMENT-PROCESS]]: Overall improvement workflow
