# [[DependencySpec]]

**Source**: `src/types/tags/enhanced.ts`

## Purpose

Type definition for enhanced dependency specification in symbol documentation.

## Type Definition

See [[DependencySpec]] implementation in source code.

## Fields

- **target**: Dependency target (module, file, symbol)
- **type**: module | file | symbol | external
- **reason**: Why this dependency exists
- **version**: Version requirement for external dependencies (optional)
- **isOptional**: Is this dependency optional? (optional)
- **importPath**: Import path (optional)

## Usage

Used in [[EnhancedSymbolDoc]] as Category 5 (15 points).

**Property**: `dependencies?: DependencySpec[]`

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
- [[FuturePlan]] - Category 6

---

**Category**: Type Definition
**Status**: Active

---

## Backlinks

### Referenced By

- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:285
- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:286
- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:287
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:43
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:59
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:60
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:61
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:62
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:63
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:148
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:240
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:241
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:242
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:243
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:244
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:245
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:246
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:247
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:41
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:62
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:63
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:64
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:65
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:66
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:64
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:88
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:89
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:90
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:91
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:92
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:43
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:63
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:64
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:65
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:66
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:67
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:57
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:81
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:82
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:83
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:84
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:85

