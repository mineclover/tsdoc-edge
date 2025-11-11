# [[FuturePlan]]

**Source**: `src/types/tags/enhanced.ts`

## Purpose

Type definition for future plan documentation in enhanced symbol documentation.

## Type Definition

```typescript
export interface FuturePlan {
  id: string;
  title: string;
  description: string;
  priority?: 'high' | 'medium' | 'low';
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled';
  targetSymbol?: string;
  estimatedEffort?: string;
  dependencies?: string[];
}
```

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

Used in [[EnhancedSymbolDoc]] as Category 6 (15 points):

```typescript
interface EnhancedSymbolDoc {
  futurePlans?: FuturePlan[];  // Category 6
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
- [[ErrorExperience]] - Category 3
- [[DecisionRecord]] - Category 4
- [[DependencySpec]] - Category 5

---

**Category**: Type Definition
**Status**: Active

---

## Backlinks

### Referenced By

- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:288
- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:289
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:44
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:71
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:72
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:73
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:41
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:68
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:69
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:70
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:149
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:241
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:242
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:243
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:244
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:245
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:42
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:69
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:70
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:71
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:65
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:94
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:95
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:96
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:58
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:90
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:91
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:92

