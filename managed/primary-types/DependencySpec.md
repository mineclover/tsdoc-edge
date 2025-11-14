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

- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:282
- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:283
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:43
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:59
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:60
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:61
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:62
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:148
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:233
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:234
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:235
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:236
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:237
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:238
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:41
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:61
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:62
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:63
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:64
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:64
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:86
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:87
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:88
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:89
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:43
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:62
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:63
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:64
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:65
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:57
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:79
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:80
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:81
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:82

