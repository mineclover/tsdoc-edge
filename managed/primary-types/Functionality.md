# [[Functionality]]

**Source**: `src/types/tags/enhanced.ts`

## Purpose

Type definition for functionality documentation in the enhanced symbol documentation system.

## Type Definition

```typescript
export interface Functionality {
  mainFeatures: string[];
  components: Array<{
    name: string;
    description: string;
    signature?: string;
  }>;
  io?: {
    inputs: Array<{ name: string; type: string; description: string }>;
    outputs: Array<{ name: string; type: string; description: string }>;
  };
  examples?: string[];
}
```

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

Used in [[EnhancedSymbolDoc]] as Category 2 (20 points):

```typescript
interface EnhancedSymbolDoc {
  functionality?: Functionality;  // Category 2
  // ...
}
```

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

Part of [[StrictModeValidator]] scoring:
- Missing: -16.7 points
- Incomplete: -8.3 points

## Related

- [[EnhancedSymbolDoc]] - Parent type using this
- [[ProblemSolving]] - Category 1 type
- [[ErrorExperience]] - Category 3 type
- [[DecisionRecord]] - Category 4 type
- [[DependencySpec]] - Category 5 type
- [[FuturePlan]] - Category 6 type

---

**Category**: Type Definition
**Status**: Active

---

## Backlinks

### Referenced By

- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:273
- [[BaseSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/BaseSymbolDoc.md:30
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:41
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:60
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:38
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:57
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:145
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:216
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:217
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:39
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:58
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:40
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:60
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:54
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:76

