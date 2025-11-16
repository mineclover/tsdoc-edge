---
title: Feature Grouping
type: relationship
category: semantic
status: planned
canonical: true
phase: 2
---

# [[Feature Grouping]]

> **Type**: `feature-grouping` | **Status**: ⏳ Phase 2 (Not Implemented)

Track feature-level grouping where components belong to same feature.

## Definition

**Feature grouping** relationships identify components that work together to deliver a specific user-facing feature or capability.

**Pattern**: `A, B, C belong to Feature X`

**Key Characteristics**:
- **Cohesive**: Components serve unified purpose
- **User-facing**: Delivers specific user value
- **Multi-layer**: Spans multiple architectural layers
- **Bounded**: Clear feature boundary

## Category

**Category**: `semantic`
**Direction**: `undirected` (components are peers within feature)
**Strength**: `medium` (semantic grouping, not structural)

## Examples

### 1. **Authentication Feature**
```typescript
/**
 * @feature Authentication
 * @featureRole entry-point
 */
class AuthController {
  // Part of Authentication feature
}

/**
 * @feature Authentication
 * @featureRole business-logic
 */
class AuthService {
  // Part of Authentication feature
}

/**
 * @feature Authentication
 * @featureRole data-access
 */
class UserRepository {
  // Part of Authentication feature
}
```

### 2. **Shopping Cart Feature**
```typescript
/**
 * @feature ShoppingCart
 */
class CartController {}

/**
 * @feature ShoppingCart
 */
class CartService {}

/**
 * @feature ShoppingCart
 */
class CartItemRepository {}

/**
 * @feature ShoppingCart
 */
class CartUI {}
// All components belong to ShoppingCart feature
```

### 3. **File Upload Feature**
```typescript
/**
 * @feature FileUpload
 * @featureComponents UploadController, StorageService, FileValidator
 */
class FileUploadFeature {
  // Feature aggregate
}
```

### 4. **Search Feature**
```typescript
/**
 * @feature Search
 * @featureLayer presentation
 */
class SearchBar {}

/**
 * @feature Search
 * @featureLayer business
 */
class SearchEngine {}

/**
 * @feature Search
 * @featureLayer infrastructure
 */
class SearchIndexer {}
```

## Detection Strategies

### 1. **Explicit Tags**
```typescript
/**
 * @feature FeatureName
 * @featureRole role-in-feature
 * @featureLayer architectural-layer
 */
```

### 2. **Directory Structure**
```
features/
  authentication/
    AuthController.ts    // Grouped by directory
    AuthService.ts
    AuthRepository.ts
```

### 3. **Naming Conventions**
```typescript
// Prefix-based grouping
class CartController {}
class CartService {}
class CartRepository {}
// All prefixed with "Cart"
```

### 4. **Feature Configuration**
```typescript
// features.config.ts
export const features = {
  authentication: [
    'AuthController',
    'AuthService',
    'UserRepository'
  ]
};
```

## Planned Implementation

### Analyzer: `FeatureGroupingAnalyzer`

**Detection Methods**:
1. **Tag-based**: Parse `@feature`, `@featureRole` tags
2. **Directory**: Detect feature-based folder structure
3. **Naming**: Find components with shared prefixes
4. **Config**: Load feature definitions from config
5. **Documentation**: Extract from feature docs

**Confidence Scoring**:
- `1.0`: Explicit `@feature` tag
- `0.9`: Grouped in feature directory
- `0.7`: Shared naming prefix
- `0.6`: Documented in feature spec
- `0.5`: Inferred from call patterns

### Command: `tsdoc-edge analyze-features`

**Usage**:
```bash
# Detect feature groupings
tsdoc-edge analyze-features

# List all features
tsdoc-edge analyze-features --list

# Show feature composition
tsdoc-edge analyze-features --show=Authentication

# Find orphaned components
tsdoc-edge analyze-features --find-orphans

# Validate feature boundaries
tsdoc-edge analyze-features --validate-boundaries
```

### Storage Schema

```typescript
{
  type: 'feature-grouping',
  from: ['AuthController', 'AuthService', 'UserRepository'],
  to: 'Authentication Feature',
  direction: 'undirected',
  strength: 'medium',
  category: 'semantic',
  evidence: [{
    type: 'documentation',
    source: 'src/features/auth/AuthController.ts',
    lineNumber: 5,
    snippet: '@feature Authentication',
    confidence: 1.0
  }],
  properties: {
    featureName: 'Authentication',
    componentCount: 3,
    layers: ['controller', 'service', 'repository'],
    entryPoint: 'AuthController',
    userFacing: true
  }
}
```

## Feature Grouping Patterns

### 1. **Vertical Slice**
```typescript
// Feature owns full stack
Feature: UserProfile
  - ProfileController  (presentation)
  - ProfileService     (business)
  - ProfileRepository  (data)
  - ProfileUI          (view)
```

### 2. **Horizontal Layer**
```typescript
// Feature spans one layer
Feature: DataValidation
  - EmailValidator
  - PhoneValidator
  - AddressValidator
  (All in validation layer)
```

### 3. **Cross-Cutting Concern**
```typescript
// Feature spans multiple features
Feature: Logging
  - AuthLogger    (in authentication)
  - CartLogger    (in shopping cart)
  - OrderLogger   (in order management)
```

### 4. **Microfeature**
```typescript
// Small, focused feature
Feature: EmailNotification
  - EmailService
  - EmailTemplate
```

## Use Cases

### 1. **Feature Mapping**
```bash
# Map codebase to features
tsdoc-edge analyze-features --map-all
```

### 2. **Impact Analysis**
```bash
# What features are affected by this change?
tsdoc-edge analyze-features --impact-of UserService
```

### 3. **Feature Metrics**
```bash
# Feature size and complexity
tsdoc-edge analyze-features --metrics
```

### 4. **Boundary Validation**
```bash
# Check for cross-feature dependencies
tsdoc-edge analyze-features --validate-boundaries
```

## Benefits

1. **Organization**: Clear feature boundaries
2. **Onboarding**: Understand system by features
3. **Team Structure**: Align teams with features
4. **Deployment**: Enable feature flags
5. **Maintenance**: Isolate feature changes

## Anti-Patterns

### ❌ **God Feature**
```typescript
// BAD: Feature too large
@feature CoreSystem
// 200+ components in one "feature"
```

### ❌ **Orphaned Components**
```typescript
// BAD: No feature assignment
class RandomUtility {
  // Which feature does this belong to?
}
```

### ❌ **Cross-Feature Coupling**
```typescript
// BAD: Direct dependency between features
@feature ShoppingCart
class CartService {
  constructor(private authService: AuthService) {}
  // Should use shared interface, not direct coupling
}
```

### ✅ **Good Feature Boundary**
```typescript
// GOOD: Clear feature with defined interface
@feature ShoppingCart
@featureInterface IAuthProvider
class CartService {
  constructor(private auth: IAuthProvider) {}
  // Depends on interface, not other feature
}
```

## Differs From

| Relationship | Difference |
|--------------|------------|
| **Conceptual Relation** | Conceptual is domain model, Feature is implementation grouping |
| **Composition** | Composition is code structure, Feature is functional grouping |
| **Module Boundary** | Module is technical, Feature is user-facing |

## Integration with Other Relationships

**Contains**:
- [[Code Dependency]]: Components in feature have dependencies
- [[Calls]]: Components call each other within feature
- [[Composition]]: Feature composed of components

**Enables**:
- Feature toggles
- Team ownership
- Modular deployment
- Progressive enhancement

## Feature Metrics

```typescript
interface FeatureMetrics {
  name: string;                    // Feature name
  componentCount: number;          // Components in feature
  lineCount: number;               // Total lines of code
  complexity: number;              // Cyclomatic complexity
  testCoverage: number;            // Test coverage %
  dependencies: string[];          // External dependencies
  layerDistribution: {             // Components per layer
    presentation: number;
    business: number;
    data: number;
  };
  cohesion: number;                // 0-1, internal cohesion
  coupling: number;                // 0-1, external coupling
}
```

## Feature Documentation

```markdown
# Feature: Shopping Cart

**Purpose**: Allow users to collect items before checkout

**Components**:
- [[CartController]]: HTTP endpoints
- [[CartService]]: Business logic
- [[CartRepository]]: Data persistence
- [[CartUI]]: User interface

**Dependencies**:
- [[Product Catalog]]: Product information
- [[Authentication]]: User identification
- [[Inventory]]: Stock availability

**Entry Points**:
- `POST /cart/add`
- `GET /cart`
- `DELETE /cart/:itemId`

**Feature Flags**:
- `ENABLE_CART_RECOMMENDATIONS`
- `ENABLE_CART_PERSISTENCE`
```

## Validation Rules

### 1. **Single Feature Ownership**
```typescript
// ❌ Component belongs to multiple features
@feature Authentication
@feature UserManagement
class UserService {}  // Ambiguous ownership
```

### 2. **Complete Feature**
```typescript
// ✅ Feature has all necessary layers
Feature: PaymentProcessing
  ✓ Controller (entry point)
  ✓ Service (business logic)
  ✓ Repository (data access)
  ✓ Tests (verification)
```

### 3. **Bounded Dependencies**
```typescript
// ✅ Feature dependencies are explicit
@feature Checkout
@dependsOn Authentication, ShoppingCart, Payment
class CheckoutFeature {}
```

## Related

- [[Conceptual Relation]] (`conceptual-relation.md`): Domain-level relationships
- [[Module Boundary]] (`module-boundary.md`): Technical boundaries
- [[Composition]] (`COMPOSITION.md`): Component composition
- [[Enhancement]] (`enhancement.md`): Feature enhancements

## Tags

`#semantic` `#features` `#organization` `#architecture` `#boundaries` `#phase-2`

---

**Status**: ⏳ Phase 2 (Planned)
**Priority**: High (critical for organization)
**Estimated Effort**: 2-3 weeks
**Dependencies**: Documentation parsing, directory analysis, naming conventions

---

## Backlinks

### Referenced By

- [[Co-Requirement]] → /home/user/tsdoc-edge/managed/relationships/co-requirement.md:151
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:136
- [[Conceptual Relation]] → /home/user/tsdoc-edge/managed/relationships/conceptual-relation.md:132
- [[Conceptual Relation]] → /home/user/tsdoc-edge/managed/relationships/conceptual-relation.md:155
- [[Conceptual Relation]] → /home/user/tsdoc-edge/managed/relationships/conceptual-relation.md:177
- [[Enhancement]] → /home/user/tsdoc-edge/managed/relationships/enhancement.md:70
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:319
- [[Module Boundary]] → /home/user/tsdoc-edge/managed/relationships/module-boundary.md:120
- [[Mutual Exclusion]] → /home/user/tsdoc-edge/managed/relationships/mutual-exclusion.md:107
- [[Mutual Exclusion]] → /home/user/tsdoc-edge/managed/relationships/mutual-exclusion.md:124

