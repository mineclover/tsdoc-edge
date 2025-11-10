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

- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:42
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:39
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:146
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:62
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:41
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:55

