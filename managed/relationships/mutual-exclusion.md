---
title: Mutual Exclusion
type: relationship
category: constraint
status: planned
canonical: true
phase: 3
---

# [[Mutual Exclusion]]

> **Type**: `mutual-exclusion` | **Status**: 📋 Phase 3 (Not Implemented)

Track mutual exclusion constraints where A and B cannot coexist.

## Definition

**Mutual exclusion** relationships identify symbols that cannot be active simultaneously due to conflicts or architectural constraints.

**Pattern**: `A and B cannot coexist`

**Key Characteristics**:
- **Incompatibility**: Cannot both be present
- **Conflict**: Resource, architectural, or logical conflict
- **Exclusive**: Only one can be active at a time
- **Enforcement**: May be compile-time or runtime

## Category

**Category**: `constraint`
**Direction**: `bidirectional` (A ⊥ B)
**Strength**: `strong` (hard constraint)

## Examples

### 1. **Feature Flags**
```typescript
/**
 * @excludes NewCheckoutFlow
 */
class LegacyCheckoutFlow {
  // Cannot use both checkout flows simultaneously
}

class NewCheckoutFlow {
  // Mutually exclusive with LegacyCheckoutFlow
}
```

### 2. **Platform-Specific Implementations**
```typescript
/**
 * @platform windows
 * @excludes MacFileSystem, LinuxFileSystem
 */
class WindowsFileSystem {
  // Only one platform implementation active
}
```

### 3. **Conflicting Dependencies**
```typescript
/**
 * @conflicts webpack@5
 */
class WebpackV4Plugin {
  // Cannot use with webpack v5
}
```

### 4. **Singleton Pattern**
```typescript
/**
 * @singleton
 * @excludes OtherDatabaseConnection
 */
class DatabaseConnection {
  // Only one database connection allowed
}
```

## Detection Strategies

### 1. **Explicit Tags**
```typescript
/**
 * @excludes OtherImplementation
 * @mutuallyExclusive FeatureB
 * @conflicts Module@2.x
 */
```

### 2. **Conditional Compilation**
```typescript
#if FEATURE_A
  // Implementation A
#elif FEATURE_B
  // Implementation B (mutually exclusive with A)
#endif
```

### 3. **Package Dependencies**
```json
{
  "peerDependencies": {
    "react": "^17.0.0"  // Excludes react@16
  }
}
```

### 4. **Environment Variables**
```typescript
if (process.env.USE_NEW_API) {
  // New API (excludes old API)
} else {
  // Old API
}
```

## Planned Implementation

### Command: `tsdoc-edge analyze-mutual-exclusion`

**Usage**:
```bash
# Detect mutual exclusion constraints
tsdoc-edge analyze-mutual-exclusion

# Validate no conflicts exist
tsdoc-edge analyze-mutual-exclusion --validate

# Find violated exclusions
tsdoc-edge analyze-mutual-exclusion --find-violations
```

### Storage Schema

```typescript
{
  type: 'mutual-exclusion',
  from: 'LegacyCheckoutFlow',
  to: 'NewCheckoutFlow',
  direction: 'bidirectional',
  strength: 'strong',
  category: 'constraint',
  properties: {
    conflictType: 'feature-flag',
    enforcedAt: 'runtime',
    violationImpact: 'critical'
  }
}
```

## Exclusion Types

### 1. **Feature Exclusion**
- Feature flags that are mutually exclusive
- Only one feature variant can be active

### 2. **Platform Exclusion**
- Platform-specific implementations
- OS/environment-specific code

### 3. **Version Exclusion**
- Different versions of same library
- Incompatible dependency versions

### 4. **Resource Exclusion**
- Singleton resources
- Exclusive access requirements

## Use Cases

### 1. **Conflict Detection**
```bash
# Find conflicting feature flags
tsdoc-edge analyze-mutual-exclusion --type=feature-flag
```

### 2. **Dependency Validation**
```bash
# Validate no conflicting dependencies
tsdoc-edge analyze-mutual-exclusion --validate-deps
```

### 3. **Migration Planning**
```bash
# Ensure clean migration between exclusive features
tsdoc-edge analyze-mutual-exclusion --migration-check
```

## Violation Examples

### ❌ **Both Features Active**
```typescript
// BAD: Both mutually exclusive features imported
import { LegacyCheckoutFlow } from './legacy';
import { NewCheckoutFlow } from './new';

// This violates mutual exclusion!
```

### ✅ **Conditional Usage**
```typescript
// GOOD: Only one feature active
const CheckoutFlow = useNewFeature
  ? NewCheckoutFlow
  : LegacyCheckoutFlow;
```

## Integration with Other Relationships

**Complements**:
- [[Co-Requirement]]: Opposite constraint (must coexist)
- [[Substitution]]: Substitutable implementations are often exclusive
- [[Feature Grouping]]: Feature sets may have exclusions

## Benefits

1. **Conflict Prevention**: Prevent incompatible combinations
2. **Architecture Validation**: Enforce architectural constraints
3. **Migration Safety**: Ensure clean feature transitions
4. **Resource Management**: Prevent resource conflicts

## Validation Rules

```typescript
// Rule: If A and B are mutually exclusive
//       Then: A.active && B.active === false

const violations = detectMutualExclusionViolations();
if (violations.length > 0) {
  throw new Error('Mutual exclusion violated!');
}
```

## Related

- [[Co-Requirement]] (`co-requirement.md`): Opposite constraint
- [[Substitution]] (`substitution.md`): Alternative implementations
- [[Feature Grouping]]: Feature dependencies

## Tags

`#constraint` `#conflict` `#exclusion` `#feature-flags` `#phase-3`

---

**Status**: 📋 Phase 3 (Planned)
**Priority**: Medium (important for feature management)
**Estimated Effort**: 2 weeks

---

## Backlinks

### Referenced By

- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md
