# [[FuturePlan]]

**Source**: `src/types/tags/enhanced.ts`

## Purpose

Type definition for future plan documentation in enhanced symbol documentation.

## Type Definition

See [[FuturePlan]] implementation in source code.

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

Used in [[EnhancedSymbolDoc]] as Category 6 (15 points).

**Property**: `futurePlans?: FuturePlan[]`

## Validation

Part of [[StrictModeValidator]] scoring:
- Missing: -12.5 points
- Incomplete: -6.25 points

## Related

- [[EnhancedSymbolDoc]] - Parent type
- [[ProblemSolving]] - Category 1
- [[Functionality]] - Category 2
- [[ErrorExperience]] - Category 3
- [[DecisionRecord]] - Category 4
- [[DependencySpec]] - Category 5

---

**Category**: Type Definition
**Status**: Active

---

## Backlinks

### Referenced By

- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:302
- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:303
- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:304
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:44
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:81
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:82
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:83
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:84
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:85
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:41
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:78
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:79
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:80
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:81
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:82
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:149
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:264
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:265
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:266
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:267
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:268
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:269
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:270
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:271
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:42
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:79
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:80
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:81
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:82
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:83
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:65
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:105
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:106
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:107
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:108
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:109
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:58
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:103
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:104
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:105
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:106
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:107

