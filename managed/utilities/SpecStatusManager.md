# SpecStatusManager

**Source**: `src/spec/SpecStatusManager.ts`

## Purpose

Manage specification document status workflow and lifecycle.

## Status Lifecycle

```
draft → review → approved → active
  ↓       ↓         ↓          ↓
archived ←──────────────── deprecated
```

### Status Definitions

- **draft**: Initial state, work in progress
- **review**: Ready for peer review
- **approved**: Reviewed and approved
- **active**: Currently in use, canonical reference
- **deprecated**: Replaced by newer version
- **archived**: No longer relevant

## Transition Rules

### Allowed Transitions

- **draft** → review, archived
- **review** → draft, approved, archived
- **approved** → review, active
- **active** → deprecated
- **deprecated** → archived, active (rollback)
- **archived** → (none, terminal state)

### Completeness Requirements

- **draft**: 0% (no requirement)
- **review**: 50% minimum
- **approved**: 80% minimum
- **active**: 80% minimum
- **deprecated**: 0% (no requirement)
- **archived**: 0% (no requirement)

## Validation

Before status transition, validates:
- Current status allows target status
- Completeness score meets requirement
- Required sections present
- No blocking validation errors

## Usage

```typescript
const manager = new SpecStatusManager();
const transition = manager.validateTransition(
  'managed/features/work-context.md',
  'active'
);

if (transition.allowed) {
  manager.applyTransition(filePath, transition);
}
```

## Frontmatter Integration

Updates markdown frontmatter:
```yaml
---
status: active
lastUpdated: 2025-11-09
completeness: 85%
---
```

## Symbol Count

1 class

## Related

- [[SpecCompletenessValidator]]: Validates completeness
- (Planned: SpecStatusCommand for CLI status management)
- SpecVersionManager: Version history tracking

---

## Backlinks

### Referenced By

- SpecTypes → /Users/junwoobang/workflow/tsdoc-edge/managed/types/SpecTypes.md:190
- [[SpecCompletenessValidator]] → /Users/junwoobang/workflow/tsdoc-edge/managed/utilities/SpecCompletenessValidator.md:62
- SpecVersionManager → /Users/junwoobang/workflow/tsdoc-edge/managed/utilities/SpecVersionManager.md:54
- [[UnusedDocumentDetector]] → /Users/junwoobang/workflow/tsdoc-edge/managed/utilities/UnusedDocumentDetector.md:79

