# [[ProblemSolving]]

**Source**: `src/types/tags/enhanced.ts`

## Purpose

Type definition for problem-solving documentation in the enhanced symbol documentation system.

## Type Definition

See [[ProblemSolving]] implementation in source code.

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

- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:305
- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:306
- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:307
- [[BaseSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/BaseSymbolDoc.md:29
- [[BaseSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/BaseSymbolDoc.md:52
- [[BaseSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/BaseSymbolDoc.md:53
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:40
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:86
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:87
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:88
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:89
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:90
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:37
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:83
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:84
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:85
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:86
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:87
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:144
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:272
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:273
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:274
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:275
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:276
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:277
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:278
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:279
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:38
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:84
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:85
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:86
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:87
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:88
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:61
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:110
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:111
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:112
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:113
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:114
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:39
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:85
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:86
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:87
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:88
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:89

