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
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:224
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:225
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:226
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:227
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:228
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:229
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:230
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:231
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:80
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:81
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:82
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:73
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:74
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:75

