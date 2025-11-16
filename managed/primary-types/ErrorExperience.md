# [[ErrorExperience]]

**Source**: `src/types/tags/enhanced.ts`

## Purpose

Type definition for error experience documentation in enhanced symbol documentation.

## Type Definition

See [[ErrorExperience]] implementation in source code.

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

- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:296
- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:297
- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:298
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:42
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:71
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:72
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:73
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:74
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:75
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:39
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:68
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:69
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:70
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:71
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:72
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:146
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:248
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:249
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:250
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:251
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:252
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:253
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:254
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:255
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:62
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:100
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:101
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:102
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:103
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:104
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:41
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:75
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:76
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:77
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:78
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:79
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:55
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:93
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:94
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:95
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:96
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:97

