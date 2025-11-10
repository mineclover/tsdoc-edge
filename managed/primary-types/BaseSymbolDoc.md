# [[BaseSymbolDoc]]

**Source**: `src/types/tags/enhanced.ts`

## Purpose

Base type for symbol documentation with core metadata fields.

## Type Definition

```typescript
export interface BaseSymbolDoc {
  symbolId: string;
  createdAt: string;
  updatedAt: string;
  version: string;
}
```

## Fields

- **symbolId**: Symbol identifier
- **createdAt**: When documentation was created
- **updatedAt**: Last update timestamp
- **version**: Documentation version

## Usage

Extended by [[EnhancedSymbolDoc]]:

```typescript
export interface EnhancedSymbolDoc extends BaseSymbolDoc {
  problemSolving?: ProblemSolving;
  functionality?: Functionality;
  errorExperiences?: ErrorExperience[];
  decisions?: DecisionRecord[];
  dependencies?: DependencySpec[];
  futurePlans?: FuturePlan[];
}
```

## Related

- [[EnhancedSymbolDoc]] - Extends this base type
- [[ProblemSolving]] - Category 1
- [[Functionality]] - Category 2

---

**Category**: Type Definition
**Status**: Active

---

## Backlinks

### Referenced By

- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:143

