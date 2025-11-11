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

---

## Backlinks

### Referenced By

- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:277
- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:278
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:43
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:58
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:59
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:60
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:148
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:226
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:227
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:228
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:229
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:230
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:41
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:59
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:60
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:61
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:64
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:84
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:85
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:86
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:43
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:60
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:61
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:62
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:57
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:77
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:78
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:79

