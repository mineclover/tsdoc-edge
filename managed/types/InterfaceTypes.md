---
title: Interface Types
type: type
category: types
status: active
canonical: true
---

# [[InterfaceTypes]]

**Source**: `src/types/domain/interface.ts`

## Purpose

Type system for interface analysis and domain-driven design structure.

## Interface Info

See implementation: InterfaceInfo

**Key Properties**:
- `symbol`: Base symbol information
- `properties`: Interface properties
- `methods`: Interface methods
- `extends`: Extended interfaces
- `domain`: Domain classification (user, auth, etc.)
- `domainRole`: DDD role (Entity, Service, Repository, etc.)

## Interface Property

See implementation: InterfaceProperty

**Key Properties**:
- `name`: Property name
- `type`: Property type
- `isOptional`: Optional property flag
- `isReadonly`: Readonly property flag

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

See implementation: InterfaceMethod

**Key Properties**:
- `name`: Method name
- `parameters`: Method parameters
- `returnType`: Return type
- `documentation`: Method documentation

## Domain Role

See implementation: DomainRole

**DDD Classifications**:
- Entity, ValueObject, Service, Repository, Factory
- DTO, Event, Command, Query

## Interface Dependency

See implementation: InterfaceDependency

**Key Properties**:
- `from`: Source interface
- `to`: Target interface
- `type`: Dependency type (extends, property, method-param, method-return)
- `location`: File and line number

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
