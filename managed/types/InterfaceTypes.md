# [[InterfaceTypes]]

**Source**: `src/types/domain/interface.ts`

## Purpose

Type system for interface analysis and domain-driven design structure.

## Interface Info

Complete interface metadata:
```typescript
interface InterfaceInfo {
  symbol: Symbol;               // Base symbol info
  properties: InterfaceProperty[];
  methods: InterfaceMethod[];
  extends: string[];            // Extended interfaces
  typeParameters: string[];     // Generic params
  domain?: string;              // Domain (user, auth, etc.)
  domainRole?: DomainRole;      // DDD role
}
```

## Interface Property

Property definition:
```typescript
interface InterfaceProperty {
  name: string;
  type: string;
  isOptional: boolean;
  isReadonly: boolean;
  documentation?: string;
}
```

### Example Property

```typescript
{
  name: 'userId',
  type: 'string',
  isOptional: false,
  isReadonly: true,
  documentation: 'Unique user identifier'
}
```

## Interface Method

Method signature:
```typescript
interface InterfaceMethod {
  name: string;
  parameters: MethodParameter[];
  returnType: string;
  documentation?: string;
}
```

## Domain Role

DDD pattern classification:
```typescript
type DomainRole =
  | 'Entity'          // Domain entity
  | 'ValueObject'     // Immutable value
  | 'Service'         // Domain service
  | 'Repository'      // Data access
  | 'Factory'         // Object creation
  | 'DTO'             // Data transfer
  | 'Event'           // Domain event
  | 'Command'         // Command pattern
  | 'Query'           // Query pattern
  | 'Unknown';
```

## Interface Dependency

Relationship between interfaces:
```typescript
interface InterfaceDependency {
  from: string;              // Source interface
  to: string;                // Target interface
  type: 'extends' | 'property' | 'method-param' | 'method-return';
  location: {
    file: string;
    line: number;
  };
}
```

### Dependency Types

- **extends**: `interface A extends B`
- **property**: `interface A { prop: B }`
- **method-param**: `method(param: B)`
- **method-return**: `method(): B`

## Domain Classification

Automatic domain inference:

### By File Path
- `src/user/*.ts` → domain: "user"
- `src/auth/*.ts` → domain: "auth"
- `src/payment/*.ts` → domain: "payment"

### By Naming Convention
- `*Service` → domainRole: "Service"
- `*Repository` → domainRole: "Repository"
- `*DTO` → domainRole: "DTO"
- `*Event` → domainRole: "Event"

## Example Analysis

```typescript
{
  symbol: { id: 'user-service', name: 'UserService', ... },
  properties: [
    { name: 'userRepo', type: 'UserRepository', ... }
  ],
  methods: [
    { name: 'createUser', parameters: [...], returnType: 'User' }
  ],
  extends: ['BaseService'],
  typeParameters: [],
  domain: 'user',
  domainRole: 'Service'
}
```

## Use Cases

### Domain Analysis
```bash
tsdoc-edge analyze src
# Shows domain structure and roles
```

### Interface Dependencies
```bash
tsdoc-edge deps UserService
# Shows interface dependency graph
```

### DDD Validation
- Entities should not depend on DTOs
- Services orchestrate repositories
- Value objects are immutable

## Symbol Count

4 interfaces, 1 type

## Related

- [[Symbol]]: Base symbol type
- [[AnalyzeCommand]]: Domain analysis
- [[DepsCommand]]: Dependency analysis

---

## Backlinks

### Referenced By

- [[AnalyzeCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCommand.md:57
- [[AnalyzeCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCommand.md:58
- [[DepsCommand]] → /home/user/tsdoc-edge/managed/commands/DepsCommand.md:169
- [[DepsCommand]] → /home/user/tsdoc-edge/managed/commands/DepsCommand.md:170
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:119
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:120

