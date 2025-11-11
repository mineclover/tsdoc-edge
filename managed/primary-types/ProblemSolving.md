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

- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:290
- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:291
- [[BaseSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/BaseSymbolDoc.md:29
- [[BaseSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/BaseSymbolDoc.md:48
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:40
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:74
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:75
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:76
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:37
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:71
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:72
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:73
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:144
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:246
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:247
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:248
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:249
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:250
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:38
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:72
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:73
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:74
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:61
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:97
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:98
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:99
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:39
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:73
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:74
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:75

