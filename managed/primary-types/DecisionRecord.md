# [[DecisionRecord]]

**Source**: `src/types/tags/enhanced.ts`

## Purpose

Type definition for decision record documentation (Architecture Decision Records).

## Type Definition

See [[DecisionRecord]] implementation in source code.

## Fields

- **id**: Decision identifier
- **title**: Decision title
- **decision**: What was decided
- **rationale**: Why this decision was made
- **alternatives**: Options considered and why rejected
- **consequences**: Consequences of this decision
- **date**: Date of decision
- **status**: proposed | accepted | deprecated | superseded
- **supersededBy**: What superseded this decision (if applicable)

## Usage

Used in [[EnhancedSymbolDoc]] as Category 4 (15 points).

**Property**: `decisions?: DecisionRecord[]`

## Validation

Part of [[StrictModeValidator]] scoring:
- Missing: -12.5 points
- Incomplete: -6.25 points

## Related

- [[EnhancedSymbolDoc]] - Parent type
- [[ProblemSolving]] - Category 1
- [[Functionality]] - Category 2
- [[ErrorExperience]] - Category 3
- [[DependencySpec]] - Category 5
- [[FuturePlan]] - Category 6

---

**Category**: Type Definition
**Status**: Active

---

## Backlinks

### Referenced By

- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:282
- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:283
- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:284
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:40
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:56
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:57
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:58
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:59
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:60
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:147
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:232
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:233
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:234
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:235
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:236
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:237
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:238
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:239
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:40
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:57
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:58
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:59
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:60
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:61
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:63
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:83
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:84
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:85
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:86
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:87
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:42
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:58
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:59
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:60
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:61
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:62
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:56
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:76
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:77
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:78
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:79
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:80

