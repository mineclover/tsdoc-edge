# [[ProblemSolving]]

**Source**: `src/types/tags/enhanced.ts`

## Purpose

Type definition for problem-solving documentation in the enhanced symbol documentation system.

## Type Definition

```typescript
export interface ProblemSolving {
  description: string;
  context: string;
  targetUseCase?: string;
  relatedProblem?: string;
}
```

## Fields

### description
- **Type**: `string`
- **Required**: Yes
- **Purpose**: Problem description

### context
- **Type**: `string`
- **Required**: Yes
- **Purpose**: What problem does this code solve?

### targetUseCase
- **Type**: `string`
- **Required**: No
- **Purpose**: Target use case or scenario

### relatedProblem
- **Type**: `string`
- **Required**: No
- **Purpose**: Related problem or parent problem

## Usage

Used in [[EnhancedSymbolDoc]] as Category 1 (20 points):

```typescript
interface EnhancedSymbolDoc {
  problemSolving?: ProblemSolving;  // Category 1
  // ...
}
```

## Example

```typescript
const problemSolving: ProblemSolving = {
  description: "Developers need to understand all dependencies before modifying code",
  context: "Without knowing what code depends on a function, changes can break downstream code",
  targetUseCase: "Pre-modification impact analysis",
  relatedProblem: "Refactoring risk assessment"
};
```

## Validation

Part of [[StrictModeValidator]] scoring:
- Missing: -16.7 points
- Incomplete: -8.3 points

## Related

- [[EnhancedSymbolDoc]] - Parent type using this
- [[Functionality]] - Category 2 type
- [[ErrorExperience]] - Category 3 type
- [[DecisionRecord]] - Category 4 type
- [[DependencySpec]] - Category 5 type
- [[FuturePlan]] - Category 6 type

---

**Category**: Type Definition
**Status**: Active

---

## Backlinks

### Referenced By

- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:296
- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:297
- [[BaseSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/BaseSymbolDoc.md:29
- [[BaseSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/BaseSymbolDoc.md:51
- [[BaseSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/BaseSymbolDoc.md:52
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:40
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:81
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:82
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:83
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:84
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:37
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:78
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:79
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:80
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:81
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:144
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:257
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:258
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:259
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:260
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:261
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:262
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:38
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:79
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:80
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:81
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:82
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:61
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:104
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:105
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:106
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:107
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:39
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:80
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:81
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:82
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:83

