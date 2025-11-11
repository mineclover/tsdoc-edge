# [[DecisionRecord]]

**Source**: `src/types/tags/enhanced.ts`

## Purpose

Type definition for decision record documentation (Architecture Decision Records).

## Type Definition

```typescript
export interface DecisionRecord {
  id: string;
  title: string;
  decision: string;
  rationale: string;
  alternatives: Array<{
    option: string;
    reason: string;
  }>;
  consequences: string[];
  date: string;
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded';
  supersededBy?: string;
}
```

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

Used in [[EnhancedSymbolDoc]] as Category 4 (15 points):

```typescript
interface EnhancedSymbolDoc {
  decisions?: DecisionRecord[];  // Category 4
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
- [[DependencySpec]] - Category 5
- [[FuturePlan]] - Category 6

---

**Category**: Type Definition
**Status**: Active

---

## Backlinks

### Referenced By

- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:268
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:40
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:54
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:147
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:210
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:211
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:40
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:55
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:63
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:79
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:42
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:56
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:56
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:72

