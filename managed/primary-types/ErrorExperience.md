# [[ErrorExperience]]

**Source**: `src/types/tags/enhanced.ts`

## Purpose

Type definition for error experience documentation in enhanced symbol documentation.

## Type Definition

```typescript
export interface ErrorExperience {
  id: string;
  errorType: string;
  message: string;
  context: string;
  solution: string;
  occurredAt?: string;
  prevention?: string;
}
```

## Fields

- **id**: Error identifier
- **errorType**: Error type or name
- **message**: Error message
- **context**: How the error was encountered
- **solution**: Solution applied
- **occurredAt**: When this error occurred (optional)
- **prevention**: Prevention measures (optional)

## Usage

Used in [[EnhancedSymbolDoc]] as Category 3 (15 points):

```typescript
interface EnhancedSymbolDoc {
  errorExperiences?: ErrorExperience[];  // Category 3
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
- [[DecisionRecord]] - Category 4
- [[DependencySpec]] - Category 5
- [[FuturePlan]] - Category 6

---

**Category**: Type Definition
**Status**: Active

---

## Backlinks

### Referenced By

- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:290
- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:291
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:42
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:69
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:70
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:71
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:72
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:39
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:66
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:67
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:68
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:69
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:146
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:239
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:240
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:241
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:242
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:243
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:244
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:62
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:96
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:97
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:98
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:99
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:41
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:72
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:73
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:74
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:75
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:55
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:89
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:90
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:91
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:92

