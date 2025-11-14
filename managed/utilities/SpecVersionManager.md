# [[SpecVersionManager]]

**Source**: `src/spec/SpecVersionManager.ts`

## Purpose

Track specification document versions, compare changes, and manage semantic versioning.

## Version Tracking

Uses git history to track specification versions:
- Extract commit history for spec file
- Parse version tags from frontmatter
- Build chronological version timeline

## Version History Entry

```typescript
{
  version: "2.1.0",
  date: "2025-11-09",
  commit: "abc123",
  message: "Add work-context integration",
  author: "developer@example.com"
}
```

## Semantic Versioning

### Bump Types

- **major**: Breaking changes (1.0.0 → 2.0.0)
- **minor**: New features (1.0.0 → 1.1.0)
- **patch**: Bug fixes (1.0.0 → 1.0.1)

### Automatic Detection

Analyzes git diff to suggest bump type:
- Removed sections → major
- New sections → minor
- Content updates → patch

## Version Comparison

```typescript
const diff = manager.compareVersions(
  'managed/features/work-context.md',
  '1.0.0',
  '2.0.0'
);

console.log(diff.changes.added);     // New sections
console.log(diff.changes.removed);   // Removed sections
console.log(diff.changes.modified);  // Updated sections
console.log(diff.summary);           // Human-readable summary
```

## Frontmatter Management

Updates version in frontmatter:
```yaml
---
version: 2.1.0
previousVersion: 2.0.0
lastBump: minor
bumpDate: 2025-11-09
---
```

## Usage

```bash
# View version history
tsdoc-edge spec-history managed/features/work-context.md

# Compare versions
tsdoc-edge spec-diff managed/features/work-context.md 1.0.0 2.0.0

# Bump version
tsdoc-edge spec-bump managed/features/work-context.md --minor
```

## Symbol Count

1 class, 2 interfaces, 1 type

## Related

- [[SpecStatusManager]]: Manages spec lifecycle
- (Planned: SpecHistoryCommand for viewing version history)
- (Planned: SpecDiffCommand for comparing versions)
- (Planned: SpecBumpCommand for bumping versions)

---

## Backlinks

### Referenced By

- [[SpecStatusManager]] → /home/user/tsdoc-edge/managed/utilities/SpecStatusManager.md:67
- [[SpecStatusManager]] → /home/user/tsdoc-edge/managed/utilities/SpecStatusManager.md:81
- [[SpecStatusManager]] → /home/user/tsdoc-edge/managed/utilities/SpecStatusManager.md:82
- [[SpecStatusManager]] → /home/user/tsdoc-edge/managed/utilities/SpecStatusManager.md:83
- [[SpecStatusManager]] → /home/user/tsdoc-edge/managed/utilities/SpecStatusManager.md:84

