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

- BaseSymbolDoc → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/BaseSymbolDoc.md:34
- DecisionRecord → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/DecisionRecord.md:41
- DependencySpec → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/DependencySpec.md:38
- EnhancedSymbolDoc → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:42
- EnhancedSymbolDoc → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:132
- ErrorExperience → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/ErrorExperience.md:39
- [[Functionality]] → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/Functionality.md:11
- FuturePlan → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/FuturePlan.md:40
- ProblemSolving → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/ProblemSolving.md:54
- EnhancedTagTypes → /Users/junwoobang/workflow/tsdoc-edge/managed/types/EnhancedTagTypes.md:29
- EnhancedTagTypes → /Users/junwoobang/workflow/tsdoc-edge/managed/types/EnhancedTagTypes.md:39
- EnhancedTagTypes → /Users/junwoobang/workflow/tsdoc-edge/managed/types/EnhancedTagTypes.md:44

