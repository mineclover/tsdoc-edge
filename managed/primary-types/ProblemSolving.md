---
title: Problem Solving
type: type
category: primary-types
status: active
canonical: true
---

# [[ProblemSolving]]

**Source**: `src/types/tags/enhanced.ts`

## Purpose

Type definition for problem-solving documentation in the enhanced symbol documentation system.

## Type Definition

See ProblemSolving implementation in source code.

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

Used in EnhancedSymbolDoc as Category 1 (20 points).

**Property**: `problemSolving?: ProblemSolving`

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

Part of StrictModeValidator scoring:
- Missing: -16.7 points
- Incomplete: -8.3 points

## Related

- EnhancedSymbolDoc - Parent type using this
- [[Functionality]] - Category 2 type
- ErrorExperience - Category 3 type
- DecisionRecord - Category 4 type
- DependencySpec - Category 5 type
- FuturePlan - Category 6 type

---

**Category**: Type Definition
**Status**: Active

---

## Backlinks

### Referenced By

- BaseSymbolDoc → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/BaseSymbolDoc.md:33
- DecisionRecord → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/DecisionRecord.md:40
- DependencySpec → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/DependencySpec.md:37
- EnhancedSymbolDoc → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:33
- EnhancedSymbolDoc → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:131
- ErrorExperience → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/ErrorExperience.md:38
- [[Functionality]] → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/Functionality.md:61
- FuturePlan → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/FuturePlan.md:39
- ProblemSolving → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/ProblemSolving.md:11
- EnhancedTagTypes → /Users/junwoobang/workflow/tsdoc-edge/managed/types/EnhancedTagTypes.md:13

