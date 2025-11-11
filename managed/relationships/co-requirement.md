---
title: Co-Requirement
type: relationship
category: constraint
status: planned
canonical: true
phase: 3
---

# [[Co-Requirement]]

> **Type**: `co-requirement` | **Status**: 📋 Phase 3 (Not Implemented)

Track co-requirement constraints where A requires B to be present.

## Definition

**Co-requirement** relationships identify symbols that must coexist because they are functionally dependent on each other.

**Pattern**: `A requires B to be present`

**Key Characteristics**:
- **Mandatory Pairing**: Both must be active simultaneously
- **Functional Dependency**: A cannot function without B
- **Bundled**: Often deployed/enabled together
- **Validation**: Can be compile-time or runtime check

## Category

**Category**: `constraint`
**Direction**: `unidirectional` (A → B, A requires B) or `bidirectional` (A ⟷ B, mutual requirement)
**Strength**: `strong` (hard constraint)

## Examples

### 1. **Feature Dependencies**
```typescript
/**
 * @requires PaymentGateway
 */
class CheckoutFlow {
  // Checkout requires payment gateway to be enabled
  constructor(private gateway: PaymentGateway) {}
}
```

### 2. **Plugin Dependencies**
```typescript
/**
 * @requires CorePlugin
 * @requires DatabasePlugin
 */
class AnalyticsPlugin {
  // Analytics requires both core and database
}
```

### 3. **Service Coordination**
```typescript
/**
 * @requires AuthService
 * @requires LoggingService
 */
class UserManagementService {
  // User management requires both auth and logging
  constructor(
    private auth: AuthService,
    private logger: LoggingService
  ) {}
}
```

### 4. **Configuration Bundles**
```typescript
/**
 * @requires REDIS_HOST
 * @requires REDIS_PORT
 * @requires REDIS_PASSWORD
 */
class RedisConfig {
  // All three env vars must be present
  static validate() {
    if (!process.env.REDIS_HOST ||
        !process.env.REDIS_PORT ||
        !process.env.REDIS_PASSWORD) {
      throw new Error('Missing required Redis configuration');
    }
  }
}
```

## Detection Strategies

### 1. **Explicit Tags**
```typescript
/**
 * @requires ServiceA
 * @requiresAll ServiceB, ServiceC
 * @corequisite FeatureD
 */
```

### 2. **Constructor Dependencies**
```typescript
class Service {
  constructor(
    private required1: RequiredService,  // Co-requirement detected
    private required2: AnotherRequired
  ) {}
}
```

### 3. **Import Analysis**
```typescript
// If A always imports B together
import { FeatureA } from './featureA';
import { FeatureB } from './featureB';  // Co-required with A
```

### 4. **Validation Logic**
```typescript
function validateSetup() {
  if (hasFeatureA() && !hasFeatureB()) {
    throw new Error('Feature A requires Feature B');
  }
}
```

## Planned Implementation

### Command: `tsdoc-edge analyze-co-requirement`

**Usage**:
```bash
# Detect co-requirement constraints
tsdoc-edge analyze-co-requirement

# Validate all co-requirements are satisfied
tsdoc-edge analyze-co-requirement --validate

# Find missing co-requirements
tsdoc-edge analyze-co-requirement --find-missing
```

### Storage Schema

```typescript
{
  type: 'co-requirement',
  from: 'CheckoutFlow',
  to: 'PaymentGateway',
  direction: 'unidirectional',
  strength: 'strong',
  category: 'constraint',
  properties: {
    requirementType: 'functional-dependency',
    enforcedAt: 'runtime',
    validationMethod: 'constructor-injection',
    optional: false
  }
}
```

## Co-Requirement Types

### 1. **Functional Co-Requirement**
- Feature A cannot work without Feature B
- Strong runtime dependency
- Example: `PaymentProcessor` requires `PaymentGateway`

### 2. **Configuration Co-Requirement**
- Config A requires Config B to be set
- Validation at startup
- Example: `DATABASE_SSL=true` requires `DATABASE_CERT_PATH`

### 3. **Service Co-Requirement**
- Service A requires Service B to be running
- Often bidirectional (mutual dependency)
- Example: `LoadBalancer` requires `HealthChecker`

### 4. **Plugin Co-Requirement**
- Plugin A requires Plugin B to be installed
- Package manager enforces this
- Example: `@typescript-eslint/eslint-plugin` requires `eslint`

## Use Cases

### 1. **Validation**
```bash
# Ensure all co-requirements are satisfied
tsdoc-edge analyze-co-requirement --validate-all
```

### 2. **Dependency Planning**
```bash
# Show dependency tree for feature
tsdoc-edge analyze-co-requirement --show-tree=CheckoutFlow
```

### 3. **Missing Detection**
```bash
# Find features with unsatisfied co-requirements
tsdoc-edge analyze-co-requirement --find-missing
```

## Violation Examples

### ❌ **Missing Co-Requirement**
```typescript
// BAD: CheckoutFlow instantiated without PaymentGateway
const checkout = new CheckoutFlow();
// Error: PaymentGateway required but not provided!
```

### ✅ **Satisfied Co-Requirement**
```typescript
// GOOD: All co-requirements satisfied
const gateway = new PaymentGateway(config);
const checkout = new CheckoutFlow(gateway);
```

### ❌ **Incomplete Configuration**
```typescript
// BAD: Partial configuration
process.env.REDIS_HOST = 'localhost';
// Missing: REDIS_PORT, REDIS_PASSWORD
const redis = new RedisClient();  // Will fail!
```

### ✅ **Complete Configuration**
```typescript
// GOOD: All required config present
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_PASSWORD = 'secret';
const redis = new RedisClient();  // Success
```

## Integration with Other Relationships

**Complements**:
- [[Mutual Exclusion]]: Opposite constraint (cannot coexist)
- [[Composition]]: Co-requirements often implemented via composition
- [[Code Dependency]]: Imports indicate co-requirements

**Opposite of**:
- [[Mutual Exclusion]]: Co-requirement = must coexist, Mutual Exclusion = cannot coexist

## Benefits

1. **Validation**: Detect missing dependencies early
2. **Documentation**: Make requirements explicit
3. **Deployment Planning**: Understand what must be deployed together
4. **Configuration Management**: Validate configuration completeness
5. **Refactoring Safety**: Understand coupling before changes

## Validation Rules

```typescript
// Rule: If A requires B
//       Then: A.present => B.present

function validateCoRequirement(a: Symbol, b: Symbol): boolean {
  if (isPresent(a) && !isPresent(b)) {
    throw new Error(`${a} requires ${b} but ${b} is not present`);
  }
  return true;
}
```

## Differs From

| Relationship | Difference |
|--------------|------------|
| **Composition** | Composition is structural (has-a), Co-requirement is constraint (needs) |
| **Dependency** | Dependency is code import, Co-requirement is runtime constraint |
| **Mutual Exclusion** | Mutual Exclusion forbids coexistence, Co-requirement requires it |

## Metrics

```typescript
interface CoRequirementMetrics {
  requiredCount: number;              // How many co-requirements
  satisfactionRate: number;           // 0-1, how many satisfied
  violationCount: number;             // How many violations detected
  enforcementLevel: 'compile' | 'runtime' | 'manual';
}
```

## Related

- [[Mutual Exclusion]] (`mutual-exclusion.md`): Opposite constraint
- [[Composition]] (`COMPOSITION.md`): Implementation mechanism
- [[Code Dependency]] (`code-dependency.md`): Static dependencies
- [[Feature Grouping]]: Related feature sets

## Tags

`#constraint` `#dependency` `#validation` `#bundling` `#phase-3`

---

**Status**: 📋 Phase 3 (Planned)
**Priority**: Medium (important for validation)
**Estimated Effort**: 2 weeks

---

## Backlinks

### Referenced By

- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md
