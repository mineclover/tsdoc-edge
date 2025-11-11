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

- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:284
- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:285
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:42
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:65
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:66
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:67
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:39
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:62
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:63
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:64
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:146
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:231
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:232
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:233
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:234
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:235
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:62
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:91
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:92
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:93
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:41
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:67
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:68
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:69
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:55
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:84
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:85
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:86

