# [[Layer Dependency]]

Architectural layer dependency tracking and validation.

**Type**: `layer-dependency` | **Category**: Organizational | **Status**: Planned

## Purpose

Track and validate dependencies between architectural layers, ensuring clean architecture principles are followed.

## Concept

### Typical Layer Architecture

```
┌─────────────────────┐
│   Presentation      │  ← UI, Controllers, Views
├─────────────────────┤
│   Application       │  ← Use Cases, Services
├─────────────────────┤
│   Domain            │  ← Business Logic, Entities
├─────────────────────┤
│   Infrastructure    │  ← Database, External APIs
└─────────────────────┘
```

**Dependency Rules**:
- Presentation → Application → Domain
- Infrastructure → Domain
- **VIOLATION**: Domain → Infrastructure ❌
- **VIOLATION**: Domain → Presentation ❌

## Examples

### Valid Layer Dependencies
```typescript
// ✅ Presentation → Application
// src/controllers/UserController.ts
import { UserService } from '../services/UserService';  // OK

// ✅ Application → Domain
// src/services/UserService.ts
import { User } from '../domain/User';  // OK

// ✅ Infrastructure → Domain
// src/repositories/UserRepository.ts
import { User } from '../domain/User';  // OK
```

### Layer Violations
```typescript
// ❌ Domain → Infrastructure
// src/domain/User.ts
import { Database } from '../infrastructure/Database';  // VIOLATION!

// ❌ Domain → Presentation
// src/domain/Order.ts
import { OrderController } from '../controllers/OrderController';  // VIOLATION!
```

## Detection Strategy

### Layer Classification

**Directory-based**:
```
src/
├── controllers/     → Presentation Layer
├── services/        → Application Layer
├── domain/          → Domain Layer
├── repositories/    → Infrastructure Layer
└── utils/           → Shared/Cross-cutting
```

**Annotation-based**:
```typescript
/**
 * @layer presentation
 */
export class UserController { ... }

/**
 * @layer domain
 */
export class User { ... }
```

### Violation Detection

```typescript
// Analyze imports
for each symbol S:
  sourceLayer = detectLayer(S.filePath)
  for each import I in S:
    targetLayer = detectLayer(I.targetPath)
    if !isValidLayerDependency(sourceLayer, targetLayer):
      ← Layer Violation detected
```

## Configuration

**.tsdoc.config.json**:
```json
{
  "layers": {
    "presentation": ["src/controllers/**", "src/views/**"],
    "application": ["src/services/**", "src/use-cases/**"],
    "domain": ["src/domain/**", "src/entities/**"],
    "infrastructure": ["src/repositories/**", "src/adapters/**"]
  },
  "rules": {
    "presentation": ["application"],
    "application": ["domain"],
    "infrastructure": ["domain"],
    "domain": []
  }
}
```

## Metadata

```json
{
  "sourceLayer": "domain",
  "targetLayer": "infrastructure",
  "isViolation": true,
  "rule": "domain cannot depend on infrastructure",
  "severity": "error"
}
```

## Use Cases

1. **Architecture Validation**: Enforce clean architecture
2. **Refactoring Guidance**: Identify misplaced dependencies
3. **CI/CD Gates**: Fail builds on layer violations
4. **Onboarding**: Visualize layer boundaries for new developers

**Commands**:
```bash
# Validate layer dependencies
tsdoc-edge validate-layers

# Show layer violations
tsdoc-edge validate-layers --violations-only

# Generate layer diagram
tsdoc-edge visualize-layers
```

**Example Output**:
```
Layer Dependency Violations

❌ Domain → Infrastructure (3 violations)
  1. User.ts imports Database.ts
     Solution: Use repository interface in domain

❌ Domain → Presentation (1 violation)
  1. Order.ts imports OrderController.ts
     Solution: Use events or remove reference

Total: 4 layer violations
```

## Related

- [[Code Dependency]]: Layer dependencies are code dependencies with constraints
- [[Module Boundary]]: Related to module encapsulation
- [[IO Dependency]]: Infrastructure layer handles I/O

---

**Status**: Design/Planning
**Priority**: High (architecture enforcement)
**Complexity**: Medium (requires layer configuration + validation)

---

## Backlinks

### Referenced By

- [[Composition Relationship]] → /home/user/tsdoc-edge/managed/relationships/COMPOSITION.md:120
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:76
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:88
- [[Module Boundary]] → /home/user/tsdoc-edge/managed/relationships/module-boundary.md:95
- [[Module Boundary]] → /home/user/tsdoc-edge/managed/relationships/module-boundary.md:116

