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

- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:299
- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:300
- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:301
- [[BaseSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/BaseSymbolDoc.md:30
- [[BaseSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/BaseSymbolDoc.md:50
- [[BaseSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/BaseSymbolDoc.md:51
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:41
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:76
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:77
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:78
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:79
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:80
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:38
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:73
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:74
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:75
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:76
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:77
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:145
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:256
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:257
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:258
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:259
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:260
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:261
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:262
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:263
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:39
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:74
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:75
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:76
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:77
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:78
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:40
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:80
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:81
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:82
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:83
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:84
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:54
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:98
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:99
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:100
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:101
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:102

