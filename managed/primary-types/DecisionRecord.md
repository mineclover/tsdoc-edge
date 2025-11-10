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
