# [[DependencySpec]]

**Source**: `src/types/tags/enhanced.ts`

## Purpose

Type definition for enhanced dependency specification in symbol documentation.

## Type Definition

```typescript
export interface DependencySpec {
  target: string;
  type: 'module' | 'file' | 'symbol' | 'external';
  reason: string;
  version?: string;
  isOptional?: boolean;
  importPath?: string;
}
```

## Fields

- **target**: Dependency target (module, file, symbol)
- **type**: module | file | symbol | external
- **reason**: Why this dependency exists
- **version**: Version requirement for external dependencies (optional)
- **isOptional**: Is this dependency optional? (optional)
- **importPath**: Import path (optional)

## Usage

Used in [[EnhancedSymbolDoc]] as Category 5 (15 points):

```typescript
interface EnhancedSymbolDoc {
  dependencies?: DependencySpec[];  // Category 5
  // ...
}
```

## Validation

Part of [[StrictModeValidator]] scoring:
- Missing: -12.5 points
- Incomplete: -6.25 points

## Related

- [[EnhancedSymbolDoc]] - Parent type
- [[ProblemSolving]] - Category 1
- [[Functionality]] - Category 2
- [[ErrorExperience]] - Category 3
- [[DecisionRecord]] - Category 4
- [[FuturePlan]] - Category 6

---

**Category**: Type Definition
**Status**: Active
