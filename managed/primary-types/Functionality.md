---
title: Functionality
type: type
category: primary-types
status: active
canonical: true
---

# [[Functionality]]

**Source**: `src/types/tags/enhanced.ts`

## Purpose

Type definition for functionality documentation in the enhanced symbol documentation system.

## Type Definition

See [[Functionality]] implementation in source code.

## Fields

### mainFeatures
- **Type**: `string[]`
- **Required**: Yes
- **Purpose**: Main features provided by this symbol

### components
- **Type**: `Array<Component>`
- **Required**: Yes
- **Purpose**: Components or sub-functions
- **Component Fields**:
  - `name`: Component name
  - `description`: What it does
  - `signature`: Function signature (optional)

### io
- **Type**: `IOSpec`
- **Required**: No
- **Purpose**: Input/Output specification
- **Fields**:
  - `inputs`: Array of input specifications
  - `outputs`: Array of output specifications

### examples
- **Type**: `string[]`
- **Required**: No
- **Purpose**: Usage examples

## Usage

Used in EnhancedSymbolDoc as Category 2 (20 points).

**Property**: `functionality?: Functionality`

## Example

```typescript
const functionality: Functionality = {
  mainFeatures: [
    "Dependency tracking",
    "Reverse dependency lookup",
    "Impact analysis"
  ],
  components: [
    {
      name: "getDependencies",
      description: "Get all dependencies of a symbol",
      signature: "(symbolId: string) => string[]"
    },
    {
      name: "getReverseDependencies",
      description: "Get all symbols that depend on this symbol",
      signature: "(symbolId: string) => string[]"
    }
  ],
  io: {
    inputs: [
      { name: "symbolId", type: "string", description: "Symbol identifier" }
    ],
    outputs: [
      { name: "dependencies", type: "string[]", description: "List of dependency IDs" }
    ]
  },
  examples: [
    "getDependencies('user-service')",
    "getReverseDependencies('database-manager')"
  ]
};
```

## Validation

Part of StrictModeValidator scoring:
- Missing: -16.7 points
- Incomplete: -8.3 points

## Related

- EnhancedSymbolDoc - Parent type using this
- ProblemSolving - Category 1 type
- ErrorExperience - Category 3 type
- DecisionRecord - Category 4 type
- DependencySpec - Category 5 type
- FuturePlan - Category 6 type

---

**Category**: Type Definition
**Status**: Active

---

## Backlinks

### Referenced By

- [[BaseSymbolDoc]] → managed/primary-types/BaseSymbolDoc.md:42
- [[DecisionRecord]] → managed/primary-types/DecisionRecord.md:49
- [[DependencySpec]] → managed/primary-types/DependencySpec.md:46
- [[EnhancedSymbolDoc]] → managed/primary-types/EnhancedSymbolDoc.md:57
- [[ErrorExperience]] → managed/primary-types/ErrorExperience.md:47
- [[FuturePlan]] → managed/primary-types/FuturePlan.md:48
- [[ProblemSolving]] → managed/primary-types/ProblemSolving.md:69
- [[EnhancedTagTypes]] → managed/types/EnhancedTagTypes.md:44

### Implemented By

- Functionality → src/types/tags/enhanced.ts:1

