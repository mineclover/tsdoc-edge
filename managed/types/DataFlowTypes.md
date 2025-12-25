# DataFlowTypes

**Source**: `src/types/domain/data-flow.ts`

## Purpose

Type system for tracking data flow and transformations through the codebase.

## DTO Pattern

Common DTO naming patterns:

See implementation: DTOPattern

**Values**:
- `suffix-dto`: UserDTO
- `suffix-request`: UserRequest
- `suffix-response`: UserResponse
- `suffix-payload`: UserPayload
- `suffix-input`: CreateUserInput
- `suffix-output`: GetUserOutput
- `suffix-data`: UserData
- `unknown`: Unknown pattern

## DTO Classification

Identifies DTOs by naming pattern:

See implementation: DTOClassification

**Key Properties**:
- `interfaceName`: Interface name
- `pattern`: DTO pattern
- `isDTO`: Is it a DTO?
- `confidence`: Confidence score (0-1)
- `role`: Role - 'input', 'output', or 'transfer' (optional)

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

See implementation: TransformationStep

**Key Properties**:
- `from`: Source type
- `to`: Target type
- `transformer`: Function/method name (optional)
- `dependency`: Interface dependency
- `stepNumber`: Step number in chain

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

See implementation: DataTransformationChain

**Key Properties**:
- `source`: Starting type
- `target`: Ending type
- `steps`: Transformation steps
- `length`: Chain length
- `transformers`: All transformer functions

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

See implementation: TransformationPath

**Key Properties**:
- `from`: Source type
- `to`: Target type
- `paths`: All possible transformation chains
- `shortestPath`: Shortest transformation chain (optional)

## Data Flow Analysis Result

Complete data flow analysis:

See implementation: DataFlowAnalysisResult

**Key Properties**:
- `dtos`: DTO classifications
- `transformations`: Transformation chains
- `orphanedDTOs`: DTOs never used
- `deadTransformations`: Transformers never called

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
