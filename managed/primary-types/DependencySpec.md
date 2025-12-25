---
title: Dependency Spec
type: type
category: primary-types
status: active
canonical: true
---

# DependencySpec

**Source**: `src/types/tags/enhanced.ts`

## Purpose

Type definition for enhanced dependency specification in symbol documentation.

## Type Definition

See DependencySpec implementation in source code.

## Fields

- **target**: Dependency target (module, file, symbol)
- **type**: module | file | symbol | external
- **reason**: Why this dependency exists
- **version**: Version requirement for external dependencies (optional)
- **isOptional**: Is this dependency optional? (optional)
- **importPath**: Import path (optional)

## Usage

Used in EnhancedSymbolDoc as Category 5 (15 points).

**Property**: `dependencies?: DependencySpec[]`

## Validation

Part of StrictModeValidator scoring:
- Missing: -12.5 points
- Incomplete: -6.25 points

## Related

- EnhancedSymbolDoc - Parent type
- ProblemSolving - Category 1
- [[Functionality]] - Category 2
- ErrorExperience - Category 3
- DecisionRecord - Category 4
- FuturePlan - Category 6

---

**Category**: Type Definition
**Status**: Active

---

## Backlinks

### Referenced By

- DecisionRecord → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/DecisionRecord.md:43
- DependencySpec → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/DependencySpec.md:11
- EnhancedSymbolDoc → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:69
- EnhancedSymbolDoc → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:135
- ErrorExperience → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/ErrorExperience.md:41
- [[Functionality]] → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/Functionality.md:64
- FuturePlan → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/FuturePlan.md:43
- ProblemSolving → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/ProblemSolving.md:57
- EnhancedTagTypes → /Users/junwoobang/workflow/tsdoc-edge/managed/types/EnhancedTagTypes.md:91
- ModuleSpecTypes → /Users/junwoobang/workflow/tsdoc-edge/managed/types/ModuleSpecTypes.md:114

