# [[DataFlowTypes]]

**Source**: `src/types/domain/data-flow.ts`

## Purpose

Type system for tracking data flow and transformations through the codebase.

## DTO Pattern

Common DTO naming patterns:
```typescript
type DTOPattern =
  | 'suffix-dto'       // UserDTO
  | 'suffix-request'   // UserRequest
  | 'suffix-response'  // UserResponse
  | 'suffix-payload'   // UserPayload
  | 'suffix-input'     // CreateUserInput
  | 'suffix-output'    // GetUserOutput
  | 'suffix-data'      // UserData
  | 'unknown';
```

## DTO Classification

Identifies DTOs by naming pattern:
```typescript
interface DTOClassification {
  interfaceName: string;
  pattern: DTOPattern;
  isDTO: boolean;
  confidence: number;    // 0-1
  role?: 'input' | 'output' | 'transfer';
}
```

### DTO Roles

- **input**: Request/Input DTOs (API → System)
- **output**: Response/Output DTOs (System → API)
- **transfer**: Internal transfer objects

### Example Classification

```typescript
{
  interfaceName: 'CreateUserRequest',
  pattern: 'suffix-request',
  isDTO: true,
  confidence: 0.95,
  role: 'input'
}
```

## Transformation Step

Single step in a data transformation chain:
```typescript
interface TransformationStep {
  from: string;          // Source type
  to: string;            // Target type
  transformer?: string;  // Function/method name
  dependency: InterfaceDependency;
  stepNumber: number;
}
```

### Example Transformation

```typescript
{
  from: 'CreateUserRequest',
  to: 'User',
  transformer: 'toEntity',
  dependency: { type: 'property', name: 'user' },
  stepNumber: 0
}
```

## Data Transformation Chain

Complete transformation path:
```typescript
interface DataTransformationChain {
  source: string;              // Starting type
  target: string;              // Ending type
  steps: TransformationStep[];
  length: number;
  transformers: string[];      // All transformer functions
}
```

### Example Chain

```
CreateUserRequest → CreateUserInput → User → UserDTO
```

```typescript
{
  source: 'CreateUserRequest',
  target: 'UserDTO',
  steps: [
    { from: 'CreateUserRequest', to: 'CreateUserInput', transformer: 'validate' },
    { from: 'CreateUserInput', to: 'User', transformer: 'toEntity' },
    { from: 'User', to: 'UserDTO', transformer: 'toDTO' }
  ],
  length: 3,
  transformers: ['validate', 'toEntity', 'toDTO']
}
```

## Transformation Path

Path between two types:
```typescript
interface TransformationPath {
  from: string;
  to: string;
  paths: DataTransformationChain[];
  shortestPath?: DataTransformationChain;
}
```

## Data Flow Analysis Result

Complete data flow analysis:
```typescript
interface DataFlowAnalysisResult {
  dtos: DTOClassification[];
  transformations: DataTransformationChain[];
  orphanedDTOs: string[];      // DTOs never used
  deadTransformations: string[]; // Transformers never called
}
```

## Use Cases

### Identify DTOs
```bash
tsdoc-edge analyze-io
# Finds all DTOs by naming pattern
```

### Track Transformations
```bash
tsdoc-edge analyze-chains
# Shows transformation chains
```

### Find Dead Code
```bash
tsdoc-edge detect-dead-code
# Includes orphaned DTOs and transformers
```

## Symbol Count

1 type, 5 interfaces

## Related

- [[AnalyzeIOCommand]]: IO analysis
- [[AnalyzeChainsCommand]]: Transformation chains
- [[DetectDeadCodeCommand]]: Dead code detection

---

## Backlinks

### Referenced By

- [[AnalyzeChainsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeChainsCommand.md:36
- [[AnalyzeIOCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeIOCommand.md:36
- [[DetectDeadCodeCommand]] → /home/user/tsdoc-edge/managed/commands/DetectDeadCodeCommand.md:72

