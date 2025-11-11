---
title: EnhancedSymbolDoc
type: primary-type
category: documentation
status: active
canonical: true
---

# [[EnhancedSymbolDoc]]

> **6-category enhanced documentation** type for comprehensive symbol documentation

**Type**: Interface (TypeScript)
**Location**: `src/types/tags/enhanced.ts`

## Purpose

Extends basic symbol documentation with structured metadata across 6 categories, enabling strict mode validation and automated quality assessment.

**Problem**: Standard JSDoc provides basic documentation but lacks structured metadata for design decisions, error handling, and future plans.

**Solution**: 6-category system that captures problem solving, functionality, error experiences, decisions, dependencies, and future plans.

**Use Cases**:
- Public API documentation with strict mode compliance
- Incremental documentation (add categories progressively)
- Automated documentation quality assessment
- Design decision tracking (ADRs)

## Type Definition

```typescript
interface EnhancedSymbolDoc extends BaseSymbolDoc {
  // 1. Problem Solving (optional)
  problemSolving?: ProblemSolving;

  // 2. Functionality (optional)
  functionality?: Functionality;

  // 3. Error Experiences (optional)
  errorExperiences?: ErrorExperience[];

  // 4. Decisions (optional)
  decisions?: DecisionRecord[];

  // 5. Dependencies (optional)
  dependencies?: DependencySpec[];

  // 6. Future Plans (optional)
  futurePlans?: FuturePlan[];
}
```

**Base Type**:
```typescript
interface BaseSymbolDoc {
  symbolId: string;      // Symbol identifier
  createdAt: string;     // ISO 8601 timestamp
  updatedAt: string;     // ISO 8601 timestamp
  version: string;       // Documentation version
}
```

## The 6 Categories

### 1. Problem Solving

**Type**: `ProblemSolving`

**Purpose**: Describes what problem this symbol solves

```typescript
interface ProblemSolving {
  description: string;       // Problem description
  context: string;           // Why this problem matters
  targetUseCase?: string;    // Target scenario
  relatedProblem?: string;   // Related or parent problem
}
```

**Example**:
```typescript
{
  description: "Manual symbol extraction from TypeScript is tedious",
  context: "Large codebases need automated tooling for documentation",
  targetUseCase: "Extract all symbols during CI/CD pipeline",
  relatedProblem: "Documentation drift when code changes"
}
```

### 2. Functionality

**Type**: `Functionality`

**Purpose**: Describes what this symbol does

```typescript
interface Functionality {
  mainFeatures: string[];    // Key features
  components: Array<{        // Sub-components
    name: string;
    description: string;
    signature?: string;
  }>;
  io?: {                     // Input/Output spec
    inputs: Array<{ name: string; type: string; description: string }>;
    outputs: Array<{ name: string; type: string; description: string }>;
  };
  examples?: string[];       // Usage examples
}
```

**Example**:
```typescript
{
  mainFeatures: [
    "AST traversal",
    "Symbol extraction",
    "Database storage"
  ],
  components: [
    {
      name: "ASTSymbolExtractor",
      description: "Extracts symbols from TypeScript AST",
      signature: "extractSymbols(sourceFile: SourceFile): Symbol[]"
    },
    {
      name: "DatabaseManager",
      description: "Stores extracted symbols in SQLite",
      signature: "saveSymbols(symbols: Symbol[]): Promise<void>"
    }
  ],
  io: {
    inputs: [
      { name: "sourceDir", type: "string", description: "Source directory path" }
    ],
    outputs: [
      { name: "symbolCount", type: "number", description: "Number of symbols extracted" }
    ]
  },
  examples: [
    "tsdoc-edge build src",
    "tsdoc-edge build --incremental"
  ]
}
```

### 3. Error Experiences

**Type**: `ErrorExperience[]`

**Purpose**: Documents errors encountered and solutions

```typescript
interface ErrorExperience {
  id: string;              // Error identifier
  errorType: string;       // Error classification
  message: string;         // Error message
  context: string;         // How it was encountered
  solution: string;        // How it was resolved
  occurredAt?: string;     // When (ISO 8601)
  prevention?: string;     // How to prevent
}
```

**Example**:
```typescript
[
  {
    id: "ERR-001",
    errorType: "TypeError",
    message: "Cannot read property 'name' of undefined",
    context: "Parsing symbols without checking node type",
    solution: "Added type guards before accessing node properties",
    occurredAt: "2025-11-01T10:30:00Z",
    prevention: "Always use ts.is* type guards before accessing TS nodes"
  },
  {
    id: "ERR-002",
    errorType: "DatabaseError",
    message: "SQLITE_BUSY: database is locked",
    context: "Multiple processes writing to DB simultaneously",
    solution: "Added write-ahead logging (WAL) mode",
    prevention: "Use WAL mode for concurrent access"
  }
]
```

### 4. Decisions

**Type**: `DecisionRecord[]`

**Purpose**: Records architectural decisions (ADRs)

```typescript
interface DecisionRecord {
  id: string;                // Decision ID (e.g., "ADR-001")
  title: string;             // Decision title
  decision: string;          // What was decided
  rationale: string;         // Why
  alternatives: Array<{      // Other options considered
    option: string;
    reason: string;          // Why rejected
  }>;
  consequences: string[];    // Implications
  date: string;              // When decided (ISO 8601)
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded';
  supersededBy?: string;     // If replaced
}
```

**Example**:
```typescript
[
  {
    id: "ADR-001",
    title: "Use TypeScript Compiler API for AST",
    decision: "Use TypeScript Compiler API instead of regex parsing",
    rationale: "More reliable, handles all TypeScript syntax correctly",
    alternatives: [
      {
        option: "Regex-based parsing",
        reason: "Too fragile, doesn't handle complex syntax"
      },
      {
        option: "Babel parser",
        reason: "Doesn't preserve TypeScript type information"
      }
    ],
    consequences: [
      "Requires TypeScript as peer dependency",
      "Increases bundle size by ~2MB",
      "100% accuracy for TypeScript code"
    ],
    date: "2025-10-15T00:00:00Z",
    status: "accepted"
  }
]
```

### 5. Dependencies

**Type**: `DependencySpec[]`

**Purpose**: Lists dependencies and their reasons

```typescript
interface DependencySpec {
  target: string;                           // Dependency name
  type: 'module' | 'file' | 'symbol' | 'external';
  reason: string;                           // Why needed
  version?: string;                         // Version requirement
  isOptional?: boolean;                     // Is optional
  importPath?: string;                      // Import path
}
```

**Example**:
```typescript
[
  {
    target: "typescript",
    type: "external",
    reason: "AST parsing and type checking",
    version: ">=4.5.0",
    isOptional: false,
    importPath: "typescript"
  },
  {
    target: "better-sqlite3",
    type: "external",
    reason: "Synchronous SQLite database operations",
    version: ">=8.0.0",
    isOptional: false
  },
  {
    target: "DatabaseManager",
    type: "symbol",
    reason: "Symbol storage and retrieval",
    importPath: "../storage/DatabaseManager"
  }
]
```

### 6. Future Plans

**Type**: `FuturePlan[]`

**Purpose**: Documents planned improvements (TODOs)

```typescript
interface FuturePlan {
  id: string;                    // Plan ID (e.g., "PLAN-001")
  title: string;                 // Plan title
  description: string;           // Detailed description
  priority?: 'high' | 'medium' | 'low';
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled';
  targetSymbol?: string;         // Where to add
  targetMethod?: string;         // Method name to add
  targetType?: 'method' | 'function' | 'property' | 'class';
  implementedBy?: string;        // Symbol ID when completed
  targetMilestone?: string;      // Target version
  estimatedEffort?: string;      // Effort estimate
  blockedBy?: string[];          // Dependencies
  relatedIssues?: string[];      // Issue tracker IDs
  createdAt: string;             // ISO 8601
  completedAt?: string;          // ISO 8601
}
```

**Example**:
```typescript
[
  {
    id: "PLAN-001",
    title: "Add incremental build support",
    description: "Only re-extract symbols from changed files",
    priority: "high",
    status: "planned",
    targetSymbol: "BuildCommand",
    targetMethod: "buildIncremental",
    targetType: "method",
    targetMilestone: "v2.0",
    estimatedEffort: "3 days",
    blockedBy: ["PLAN-005"],
    relatedIssues: ["#123", "#145"],
    createdAt: "2025-11-01T00:00:00Z"
  },
  {
    id: "PLAN-002",
    title: "Support .d.ts files",
    description: "Extract symbols from compiled declaration files",
    priority: "medium",
    status: "in-progress",
    targetMilestone: "v2.1",
    estimatedEffort: "2 days",
    createdAt: "2025-11-05T00:00:00Z"
  }
]
```

## Completeness Levels

**Minimal** (Basic):
- `symbolId`, `createdAt`, `updatedAt`, `version`
- No categories

**Partial** (Incremental):
- 1-5 categories present
- Suitable for internal APIs

**Full** (Strict Mode):
- All 6 categories present
- Required for public APIs
- Compliance score e 90%

## Strict Mode Compliance

**For Public APIs**:
-  **Required**: Problem Solving, Functionality
-  **Required**: Error Experiences (at least 1)
-  **Required**: Decisions (at least 1)
-  **Required**: Dependencies
-  **Required**: Future Plans

**Validation**:
- Use [[StrictModeValidator]] to check compliance
- Generates compliance score (0-100)
- Lists missing/incomplete categories

## Usage

### 1. Manual Creation

```typescript
const doc: EnhancedSymbolDoc = {
  symbolId: "BuildCommand",
  createdAt: "2025-11-09T00:00:00Z",
  updatedAt: "2025-11-09T12:00:00Z",
  version: "1.0.0",

  problemSolving: {
    description: "Manual symbol extraction is tedious",
    context: "Large codebases need automation"
  },

  functionality: {
    mainFeatures: ["AST traversal", "Symbol extraction"],
    components: [
      {
        name: "ASTSymbolExtractor",
        description: "Extracts symbols from AST"
      }
    ]
  },

  // ... other categories
};
```

### 2. Automated Extraction

```typescript
import { EnhancedDocExtractor } from './parser/EnhancedDocExtractor';

const extractor = new EnhancedDocExtractor();
const results = extractor.extractFromFile('src/foo.ts', sourceCode);

results.forEach(({ doc, completeness }) => {
  console.log(`${doc.symbolId}: ${completeness}% complete`);
});
```

### 3. Validation

```typescript
import { StrictModeValidator } from './validator/StrictModeValidator';

const validator = new StrictModeValidator();
const result = validator.validate(doc, true); // true = public API

if (!result.isCompliant) {
  console.error(`Missing categories: ${result.missingCategories.join(', ')}`);
  console.error(`Compliance score: ${result.complianceScore}/100`);
}
```

## Related Types

- [[BaseSymbolDoc]] - Base documentation interface
- [[ProblemSolving]] - Category 1 type
- [[Functionality]] - Category 2 type
- [[ErrorExperience]] - Category 3 type
- [[DecisionRecord]] - Category 4 type
- [[DependencySpec]] - Category 5 type
- [[FuturePlan]] - Category 6 type
- [[StrictModeValidation]] - Validation result type

## Related Components

- [[EnhancedDocExtractor]] (`../parser/EnhancedDocExtractor.md`) - Extracts from source code
- [[StrictModeValidator]] (`../analyzers/StrictModeValidator.md`) - Validates compliance
- [[EnhancedMarkdownGenerator]] - Generates markdown from EnhancedSymbolDoc
- [[DatabaseManager]] (`../core-components/DatabaseManager.md`) - Stores enhanced docs

## Comparison: EnhancedSymbolDoc vs Standard JSDoc

| Aspect | EnhancedSymbolDoc | Standard JSDoc |
|--------|------------------|----------------|
| **Structure** | 6 structured categories | Free-form tags |
| **Validation** | Automated compliance checking | Manual review |
| **Problem Context** | Required field | Not captured |
| **Decisions** | Structured ADRs | Comments only |
| **Error Tracking** | Structured records | Not tracked |
| **Future Plans** | Trackable TODOs | Unstructured |
| **Completeness** | Measurable (0-100%) | Subjective |
| **Machine Readable** | Yes (JSON) | Limited |

## Example: Complete Documentation

```typescript
{
  "symbolId": "BuildCommand",
  "createdAt": "2025-10-01T00:00:00Z",
  "updatedAt": "2025-11-09T12:00:00Z",
  "version": "1.2.0",

  "problemSolving": {
    "description": "Manual symbol extraction from TypeScript is tedious and error-prone",
    "context": "Large codebases (1000+ files) need automated extraction for documentation",
    "targetUseCase": "Extract all symbols during CI/CD pipeline for documentation generation",
    "relatedProblem": "Documentation drift when code changes"
  },

  "functionality": {
    "mainFeatures": [
      "Recursive directory traversal",
      "TypeScript AST parsing",
      "Symbol extraction",
      "Database persistence",
      "Relationship detection"
    ],
    "components": [
      {
        "name": "ASTSymbolExtractor",
        "description": "Extracts symbols from TypeScript AST using Compiler API",
        "signature": "extractSymbols(sourceFile: SourceFile): Symbol[]"
      },
      {
        "name": "DatabaseManager",
        "description": "Persists symbols and relationships to SQLite",
        "signature": "saveSymbols(symbols: Symbol[]): Promise<void>"
      }
    ],
    "io": {
      "inputs": [
        { "name": "sourceDir", "type": "string", "description": "Root directory to scan" },
        { "name": "options", "type": "BuildOptions", "description": "Build configuration" }
      ],
      "outputs": [
        { "name": "symbolCount", "type": "number", "description": "Total symbols extracted" },
        { "name": "relationshipCount", "type": "number", "description": "Total relationships detected" }
      ]
    },
    "examples": [
      "tsdoc-edge build src",
      "tsdoc-edge build src --incremental",
      "tsdoc-edge build . --exclude node_modules"
    ]
  },

  "errorExperiences": [
    {
      "id": "ERR-001",
      "errorType": "TypeError",
      "message": "Cannot read property 'name' of undefined",
      "context": "Accessing symbol name without checking if node is a declaration",
      "solution": "Added type guards: if (ts.isClassDeclaration(node)) before access",
      "occurredAt": "2025-10-15T10:30:00Z",
      "prevention": "Always use TypeScript is* type guards before accessing node properties"
    }
  ],

  "decisions": [
    {
      "id": "ADR-001",
      "title": "Use TypeScript Compiler API instead of regex",
      "decision": "Use TypeScript Compiler API for AST parsing",
      "rationale": "Regex parsing is fragile and doesn't handle complex TypeScript syntax",
      "alternatives": [
        {
          "option": "Regex-based parsing",
          "reason": "Too fragile for complex TypeScript features like decorators, generics"
        },
        {
          "option": "Babel parser",
          "reason": "Doesn't preserve TypeScript type information needed for relationships"
        }
      ],
      "consequences": [
        "Requires TypeScript as peer dependency",
        "Increases bundle size by ~2MB",
        "100% accuracy for all TypeScript syntax"
      ],
      "date": "2025-10-01T00:00:00Z",
      "status": "accepted"
    }
  ],

  "dependencies": [
    {
      "target": "typescript",
      "type": "external",
      "reason": "AST parsing, type checking, and symbol resolution",
      "version": ">=4.5.0",
      "isOptional": false,
      "importPath": "typescript"
    },
    {
      "target": "DatabaseManager",
      "type": "symbol",
      "reason": "Symbol and relationship persistence",
      "importPath": "../storage/DatabaseManager"
    }
  ],

  "futurePlans": [
    {
      "id": "PLAN-001",
      "title": "Add incremental build support",
      "description": "Only re-extract symbols from changed files to improve build performance",
      "priority": "high",
      "status": "planned",
      "targetSymbol": "BuildCommand",
      "targetMethod": "buildIncremental",
      "targetType": "method",
      "targetMilestone": "v2.0",
      "estimatedEffort": "3 days",
      "relatedIssues": ["#123"],
      "createdAt": "2025-11-01T00:00:00Z"
    }
  ]
}
```

## Validation Example

```typescript
const validator = new StrictModeValidator();
const result = validator.validate(doc, true);

console.log(validator.generateReport(result));

// Output:
// # Strict Mode Validation Report
//
// **Symbol**: BuildCommand
// **Compliance Score**: 100.00/100
// **Status**:  COMPLIANT
//
// ##  All Requirements Met
// This symbol meets all strict mode requirements.
```

## Source

**Location**: `src/types/tags/enhanced.ts:317-353`

**Related Files**:
- `src/types/tags/base.ts` - BaseSymbolDoc
- `src/types/tags/index.ts` - Type exports

## Status

**Current**: Active, production-ready
**Version**: v1.0
**Coverage**: All 6 categories fully specified

---

**Last Updated**: 2025-11-09
**Compliance Framework**: 6-category enhanced documentation system

---

## Backlinks

### Referenced By

- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:240
- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:270
- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:271
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:127
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:245
- [[EnhancedMarkdownGenerator]] → /home/user/tsdoc-edge/managed/generator/EnhancedMarkdownGenerator.md:31
- [[EnhancedDocExtractor]] → /home/user/tsdoc-edge/managed/parser/EnhancedDocExtractor.md:207
- [[EnhancedDocExtractor]] → /home/user/tsdoc-edge/managed/parser/EnhancedDocExtractor.md:255
- [[BaseSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/BaseSymbolDoc.md:22
- [[BaseSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/BaseSymbolDoc.md:28
- [[BaseSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/BaseSymbolDoc.md:43
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:27
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:39
- [[DecisionRecord]] → /home/user/tsdoc-edge/managed/primary-types/DecisionRecord.md:58
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:24
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:36
- [[DependencySpec]] → /home/user/tsdoc-edge/managed/primary-types/DependencySpec.md:55
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:25
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:37
- [[ErrorExperience]] → /home/user/tsdoc-edge/managed/primary-types/ErrorExperience.md:57
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:44
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:60
- [[Functionality]] → /home/user/tsdoc-edge/managed/primary-types/Functionality.md:81
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:26
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:38
- [[FuturePlan]] → /home/user/tsdoc-edge/managed/primary-types/FuturePlan.md:58
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:37
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:53
- [[ProblemSolving]] → /home/user/tsdoc-edge/managed/primary-types/ProblemSolving.md:74

