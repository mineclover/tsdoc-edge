---
title: Future Plan
type: type
category: primary-types
status: active
canonical: true
---

# FuturePlan

**Source**: `src/types/tags/enhanced.ts`

## Purpose

Type definition for future plan documentation in enhanced symbol documentation.

## Type Definition

See FuturePlan implementation in source code.

## Fields

- **id**: Plan identifier (e.g., PLAN-001)
- **title**: Plan title
- **description**: What needs to be implemented
- **priority**: high | medium | low (optional)
- **status**: planned | in-progress | completed | cancelled
- **targetSymbol**: Target symbol where feature will be added (optional)
- **estimatedEffort**: Estimated effort (optional)
- **dependencies**: Dependencies required before implementation (optional)

## Usage

Used in EnhancedSymbolDoc as Category 6 (15 points).

**Property**: `futurePlans?: FuturePlan[]`

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
- DependencySpec - Category 5

---

**Category**: Type Definition
**Status**: Active

---

## Backlinks

### Referenced By

- DecisionRecord → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/DecisionRecord.md:44
- DependencySpec → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/DependencySpec.md:41
- EnhancedSymbolDoc → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:78
- EnhancedSymbolDoc → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:136
- ErrorExperience → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/ErrorExperience.md:42
- [[Functionality]] → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/Functionality.md:65
- FuturePlan → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/FuturePlan.md:11
- ProblemSolving → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/ProblemSolving.md:58
- EnhancedTagTypes → /Users/junwoobang/workflow/tsdoc-edge/managed/types/EnhancedTagTypes.md:105

