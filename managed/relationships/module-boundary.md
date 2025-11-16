# [[Module Boundary]]

Module encapsulation and boundary tracking.

**Type**: `module-boundary` | **Category**: Organizational | **Status**: Planned

## Purpose

Track and enforce module boundaries, ensuring proper encapsulation and preventing tight coupling between modules.

## Concept

### Module Boundary Definition

A **module** is a cohesive unit of code with:
- **Public API**: Exported symbols (public interface)
- **Private Implementation**: Internal symbols (hidden details)
- **Boundary**: The separation between public and private

```
Module: user-management
┌──────────────────────────────┐
│ Public API (Boundary)        │
│  ├─ UserService (exported)   │
│  └─ User (exported)          │
├──────────────────────────────┤
│ Private Implementation       │
│  ├─ UserRepository (private) │
│  └─ UserValidator (private)  │
└──────────────────────────────┘
```

**Boundary Rule**: External modules can only depend on public API, not private implementation.

## Examples

### Valid Module Usage
```typescript
// Module A: Public API
// src/modules/user/index.ts
export { UserService } from './UserService';
export { User } from './User';
// UserRepository NOT exported (private)

// Module B: Consuming Module A
// src/modules/order/OrderService.ts
import { UserService } from '../user';  // ✅ Uses public API
```

### Boundary Violations
```typescript
// ❌ Direct import of private implementation
// src/modules/order/OrderService.ts
import { UserRepository } from '../user/UserRepository';  // VIOLATION!
// Should use UserService (public API) instead
```

## Detection Strategy

### Boundary Identification

**Method 1: Index File Pattern**
```typescript
// Each module has index.ts that defines public API
// src/modules/auth/index.ts
export { AuthService } from './AuthService';
export type { User, Session } from './types';
// Internal files not exported = private
```

**Method 2: Annotation-based**
```typescript
/**
 * @public
 * @module auth
 */
export class AuthService { ... }

/**
 * @internal
 * @module auth
 */
class TokenValidator { ... }  // Not exported
```

### Violation Detection

```typescript
// Algorithm
for each import I:
  targetModule = detectModule(I.target)
  if targetModule != sourceModule:
    if !isExportedInModuleIndex(I.target, targetModule):
      ← Module Boundary Violation
```

## Configuration

**.tsdoc.config.json**:
```json
{
  "modules": {
    "pattern": "src/modules/*",
    "indexFile": "index.ts",
    "enforcePublicApi": true
  },
  "boundaries": {
    "allowCrossModulePrivate": false,
    "warnOnMissingIndex": true
  }
}
```

## Metadata

```json
{
  "sourceModule": "order",
  "targetModule": "user",
  "importedSymbol": "UserRepository",
  "isPublicApi": false,
  "isViolation": true,
  "suggestion": "Use UserService instead"
}
```

## Use Cases

### 1. Enforce Encapsulation
```bash
# Check for boundary violations
tsdoc-edge validate-boundaries

# Output:
# ❌ 3 module boundary violations
#   order/OrderService imports user/UserRepository (private)
#   payment/PaymentProcessor imports user/internal/UserCache (private)
```

### 2. Refactoring Guidance
```bash
# Find tightly coupled modules
tsdoc-edge analyze-boundaries --coupling

# Output:
# Module coupling:
#   user ↔ auth: 15 cross-boundary dependencies (warning!)
#   order ↔ payment: 3 dependencies (ok)
```

### 3. Module Independence Scoring
```typescript
// Calculate module independence score
Independence = PublicAPIDependencies / TotalDependencies

// user module: 8/10 = 0.8 (good)
// auth module: 3/15 = 0.2 (bad - too many private accesses)
```

## Boundary Patterns

### Pattern 1: Facade (Recommended)
```typescript
// Public API: Clean facade
// src/modules/user/index.ts
export { UserService } from './UserService';

// UserService acts as facade for internal components
// src/modules/user/UserService.ts
import { UserRepository } from './internal/UserRepository';
import { UserValidator } from './internal/UserValidator';

export class UserService {
  // Facade methods
}
```

### Pattern 2: Barrel Exports
```typescript
// index.ts aggregates multiple exports
export * from './services';
export * from './types';
export { UserFactory } from './factories/UserFactory';
// Internal components not exported
```

### Pattern 3: API Contracts
```typescript
// Define explicit API contract
// src/modules/user/contracts.ts
export interface IUserService { ... }
export type UserDTO = { ... };

// Implementation is internal
// src/modules/user/internal/UserServiceImpl.ts
class UserServiceImpl implements IUserService { ... }
```

## Benefits

1. **Loose Coupling**: Modules interact through well-defined APIs
2. **Refactorability**: Internal changes don't affect external modules
3. **Testability**: Mock public API interfaces
4. **Onboarding**: Clear module boundaries help understanding

## Violations to Detect

| Violation Type | Example | Severity |
|----------------|---------|----------|
| **Private Import** | Import private class | Error |
| **Circular Module Dep** | A imports B, B imports A | Warning |
| **Deep Reach** | Import nested internal file | Error |
| **Missing Index** | Module has no index.ts | Warning |

## Related

- [[Layer Dependency]]: Orthogonal to layers (modules can exist in same layer)
- [[Code Dependency]]: Module boundaries constrain code dependencies
- [[Composition Relationship]]: Modules use composition for internal structure

---

**Status**: Design/Planning
**Priority**: High (critical for scalable architecture)
**Complexity**: Medium (requires module detection + validation)

**Implementation Roadmap**:
- v2.0: Basic boundary detection
- v2.1: Violation reporting
- v2.2: Auto-fix suggestions

---

## Backlinks

### Referenced By

- [[Composition Relationship]] → /home/user/tsdoc-edge/managed/relationships/COMPOSITION.md:209
- [[Composition Relationship]] → /home/user/tsdoc-edge/managed/relationships/COMPOSITION.md:210
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:146
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:147
- [[Feature Grouping]] → /home/user/tsdoc-edge/managed/relationships/feature-grouping.md:174
- [[Layer Dependency]] → /home/user/tsdoc-edge/managed/relationships/layer-dependency.md:70
- [[Layer Dependency]] → /home/user/tsdoc-edge/managed/relationships/layer-dependency.md:91
- [[Layer Dependency]] → /home/user/tsdoc-edge/managed/relationships/layer-dependency.md:92
- [[Layer Dependency]] → /home/user/tsdoc-edge/managed/relationships/layer-dependency.md:93
- [[Layer Dependency]] → /home/user/tsdoc-edge/managed/relationships/layer-dependency.md:94

