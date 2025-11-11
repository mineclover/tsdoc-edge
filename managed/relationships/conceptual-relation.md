---
title: Conceptual Relation
type: relationship
category: semantic
status: planned
canonical: true
phase: 2
---

# [[Conceptual Relation]]

> **Type**: `conceptual-relation` | **Status**: ⏳ Phase 2 (Not Implemented)

Track semantic relationships where concepts are related in domain model.

## Definition

**Conceptual relation** relationships capture high-level semantic connections between domain concepts, independent of code implementation.

**Pattern**: `Concept A is related to Concept B`

**Key Characteristics**:
- **Domain-level**: Exists at conceptual/business level
- **Implementation-agnostic**: Not tied to specific code structure
- **Documentation-driven**: Often captured in domain docs
- **Semantic**: Meaning-based connection

## Category

**Category**: `semantic`
**Direction**: `undirected` (A — B, conceptual relationship has no code direction)
**Strength**: `weak` (soft semantic connection)

## Examples

### 1. **Domain Model Relationships**
```typescript
/**
 * User and Order are related concepts in e-commerce domain
 * @relatedConcept Order
 * @domainRelation customer-purchase
 */
class User {
  // Users place Orders (conceptual relationship)
}

/**
 * @relatedConcept User
 */
class Order {
  // Orders belong to Users
}
```

### 2. **Business Process Relationships**
```typescript
/**
 * Payment processing relates to Order fulfillment
 * @relatedConcept OrderFulfillment
 * @businessProcess checkout-flow
 */
class PaymentProcessor {
  // Payment and fulfillment are related business concepts
}
```

### 3. **Feature Relationships**
```typescript
/**
 * Authentication relates to Authorization
 * @relatedConcept Authorization
 * @conceptualLink security-model
 */
class Authentication {
  // Auth concepts are semantically related
}
```

### 4. **Cross-Domain Relationships**
```typescript
/**
 * Inventory management relates to Order management
 * @relatedConcept Inventory
 * @crossDomain supply-chain
 */
class OrderManager {
  // Cross-domain conceptual relationship
}
```

## Detection Strategies

### 1. **Explicit Tags**
```typescript
/**
 * @relatedConcept ConceptName
 * @domainRelation relationship-type
 * @semanticLink concept-space
 */
```

### 2. **Domain Documentation**
```markdown
# User Management

Related concepts:
- [[Authentication]]: User identity verification
- [[Authorization]]: User permissions
- [[Profile]]: User data management
```

### 3. **Naming Patterns**
```typescript
// Naming suggests conceptual relationship
class UserService {}
class UserController {}
class UserRepository {}
// All relate to "User" concept
```

### 4. **Shared Terminology**
```typescript
// Classes sharing domain terms
class PaymentGateway {}
class PaymentProcessor {}
class PaymentValidator {}
// All relate to "Payment" concept
```

## Planned Implementation

### Analyzer: `ConceptualRelationAnalyzer`

**Detection Methods**:
1. **Tag-based**: Parse `@relatedConcept`, `@domainRelation` tags
2. **Documentation**: Extract concept links from markdown docs
3. **Naming**: Detect shared terminology in class names
4. **Ontology**: Load domain ontology if provided
5. **NLP**: Natural language processing on documentation

**Confidence Scoring**:
- `1.0`: Explicit `@relatedConcept` tag
- `0.8`: Documented in domain model
- `0.6`: Shared terminology detected
- `0.5`: NLP-based inference
- `0.3`: Weak naming similarity

### Command: `tsdoc-edge analyze-conceptual`

**Usage**:
```bash
# Detect conceptual relationships
tsdoc-edge analyze-conceptual

# Visualize concept map
tsdoc-edge analyze-conceptual --visualize

# Export domain ontology
tsdoc-edge analyze-conceptual --export-ontology

# Find orphaned concepts
tsdoc-edge analyze-conceptual --find-orphans
```

### Storage Schema

```typescript
{
  type: 'conceptual-relation',
  from: 'User',
  to: 'Order',
  direction: 'undirected',
  strength: 'weak',
  category: 'semantic',
  evidence: [{
    type: 'documentation',
    source: 'docs/domain-model.md',
    lineNumber: 42,
    snippet: 'Users place Orders',
    confidence: 0.8
  }],
  properties: {
    domainContext: 'e-commerce',
    relationshipType: 'customer-purchase',
    bidirectional: true,
    conceptSpace: 'transaction-domain'
  }
}
```

## Conceptual Relationship Types

### 1. **Domain Aggregation**
- Concepts that form a domain aggregate
- Example: `Order` → `OrderLine`, `Payment`, `Shipping`

### 2. **Cross-Domain Bridge**
- Concepts connecting different domains
- Example: `User` bridges authentication and shopping domains

### 3. **Hierarchical Concepts**
- Parent-child concept relationships
- Example: `Vehicle` → `Car`, `Truck`, `Motorcycle`

### 4. **Workflow Sequence**
- Concepts in business process
- Example: `Browse` → `AddToCart` → `Checkout` → `Payment`

## Use Cases

### 1. **Domain Modeling**
```bash
# Visualize domain concept map
tsdoc-edge analyze-conceptual --domain=e-commerce
```

### 2. **Documentation Generation**
```bash
# Generate domain glossary
tsdoc-edge analyze-conceptual --generate-glossary
```

### 3. **Knowledge Graph**
```bash
# Build knowledge graph of concepts
tsdoc-edge analyze-conceptual --build-graph
```

### 4. **Concept Discovery**
```bash
# Find missing domain concepts
tsdoc-edge analyze-conceptual --find-gaps
```

## Benefits

1. **Domain Understanding**: Explicit domain model
2. **Onboarding**: Help new developers understand domain
3. **Documentation**: Auto-generate domain glossaries
4. **Refactoring**: Understand impact at domain level
5. **Communication**: Shared vocabulary with business

## Differs From

| Relationship | Difference |
|--------------|------------|
| **Code Dependency** | Code dependency is implementation, Conceptual is domain model |
| **Feature Grouping** | Feature grouping is functionality, Conceptual is business concept |
| **Composition** | Composition is code structure, Conceptual is semantic meaning |

## Integration with Other Relationships

**Complements**:
- [[Feature Grouping]]: Features implement concepts
- [[Doc Reference]]: Documents explain concepts
- [[Enhancement]]: Enhancements improve concepts

**Enables**:
- Domain-Driven Design (DDD)
- Ubiquitous language
- Business-developer alignment

## Example: E-Commerce Domain

```markdown
# E-Commerce Conceptual Model

## Core Concepts

### [[User]]
- Related: [[Authentication]], [[Profile]], [[Order]]
- Domain: customer-management
- Role: Primary actor in shopping process

### [[Product]]
- Related: [[Inventory]], [[Catalog]], [[Cart]]
- Domain: product-management
- Role: Item for sale

### [[Order]]
- Related: [[User]], [[Product]], [[Payment]], [[Shipping]]
- Domain: transaction-management
- Role: Purchase transaction

### [[Payment]]
- Related: [[Order]], [[User]], [[PaymentGateway]]
- Domain: financial-transactions
- Role: Money transfer
```

## Validation

```typescript
// ✅ Good conceptual relationship
/**
 * @relatedConcept Order
 * @domainContext e-commerce
 */
class Customer {
  // Clear domain relationship documented
}

// ❌ Missing conceptual documentation
class CustomerHandler {
  // What concepts does this relate to?
  // What domain context?
}
```

## Metrics

```typescript
interface ConceptualMetrics {
  totalConcepts: number;           // Unique domain concepts
  relationshipDensity: number;     // Avg relationships per concept
  domainCoverage: number;          // % of code mapped to concepts
  orphanedConcepts: number;        // Concepts with no relationships
  crossDomainLinks: number;        // Inter-domain connections
}
```

## Related

- [[Feature Grouping]] (`feature-grouping.md`): Feature-level grouping
- [[Doc Reference]] (`doc-reference.md`): Documentation connections
- [[Enhancement]] (`enhancement.md`): Concept improvements
- [[Composition]] (`COMPOSITION.md`): Implementation structure

## Tags

`#semantic` `#domain-model` `#concepts` `#business-logic` `#DDD` `#phase-2`

---

**Status**: ⏳ Phase 2 (Planned)
**Priority**: Medium (important for domain understanding)
**Estimated Effort**: 2-3 weeks
**Dependencies**: Documentation parsing, NLP (optional), ontology support

---

## Backlinks

### Referenced By

- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md
