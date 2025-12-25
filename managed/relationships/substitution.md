---
title: Substitution
type: relationship
category: alternative
status: planned
canonical: true
phase: 2
---

# [[Substitution]]

> **Type**: `substitution` | **Status**: ⏳ Phase 2 (Not Implemented)

Track substitutable implementations where A OR B can be used interchangeably.

## Definition

**Substitution** relationships identify implementations that can replace each other because they satisfy the same interface or contract.

**Pattern**: `A OR B` (same interface, interchangeable)

**Key Characteristics**:
- **Interface Equivalence**: Same public API
- **Behavioral Equivalence**: Same expected behavior
- **Interchangeable**: Can swap without code changes
- **Polymorphic**: Typically via inheritance or interface

## Category

**Category**: `alternative`
**Direction**: `undirected` (A ↔ B, neither is primary)
**Strength**: `medium` (implementation detail, not core dependency)

## Examples

### 1. **Interface Implementations**
```typescript
interface IStorage {
  save(data: any): Promise<void>;
  load(id: string): Promise<any>;
}

// Substitutable implementations
class DatabaseStorage implements IStorage { /**/ }
class FileStorage implements IStorage { /**/ }
class MemoryStorage implements IStorage { /**/ }
// All three can substitute for each other
```

### 2. **Strategy Pattern**
```typescript
interface PaymentStrategy {
  process(amount: number): Promise<boolean>;
}

class CreditCardPayment implements PaymentStrategy { /**/ }
class PayPalPayment implements PaymentStrategy { /**/ }
class CryptoPayment implements PaymentStrategy { /**/ }
// Any payment strategy can substitute another
```

### 3. **Abstract Base Classes**
```typescript
abstract class Logger {
  abstract log(message: string): void;
}

class ConsoleLogger extends Logger { /**/ }
class FileLogger extends Logger { /**/ }
class RemoteLogger extends Logger { /**/ }
// All loggers are substitutable
```

### 4. **Factory Pattern**
```typescript
interface IDatabase {
  query(sql: string): Promise<Result>;
}

class PostgresDatabase implements IDatabase { /**/ }
class MySQLDatabase implements IDatabase { /**/ }
class SQLiteDatabase implements IDatabase { /**/ }
// Database implementations are substitutable
```

## Detection Strategies

### 1. **Interface Implementation**
```typescript
// Detect classes implementing same interface
class A implements IService { /**/ }
class B implements IService { /**/ }
// A and B are substitutable via IService
```

### 2. **Common Base Class**
```typescript
// Detect classes extending same base
class A extends BaseComponent { /**/ }
class B extends BaseComponent { /**/ }
// A and B are substitutable via BaseComponent
```

### 3. **Duck Typing**
```typescript
// Detect classes with identical public API
class A {
  public method(): string { /**/ }
}
class B {
  public method(): string { /**/ }
}
// A and B are structurally substitutable
```

### 4. **Generic Constraints**
```typescript
function process<T extends IProcessor>(processor: T) {
  // Any IProcessor implementation is substitutable
}
```

## Planned Implementation

### Analyzer: `SubstitutionAnalyzer`

**Detection Methods**:
1. **Interface Mapping**: Find all implementations of interfaces
2. **Inheritance Tree**: Detect siblings in class hierarchy
3. **Structural Typing**: Match classes with identical signatures
4. **Generic Constraints**: Track type parameter substitutability
5. **Factory Patterns**: Detect factory-created substitutables

**Confidence Scoring**:
- `1.0`: Explicit interface implementation
- `0.9`: Same abstract base class
- `0.8`: Identical public API (duck typing)
- `0.7`: Generic type constraint
- `0.6`: Structural similarity

### Command: `tsdoc-edge analyze-substitution`

**Usage**:
```bash
# Find all substitutable implementations
tsdoc-edge analyze-substitution

# Find substitutions for specific interface
tsdoc-edge analyze-substitution --interface=IStorage

# Detect Liskov Substitution Principle violations
tsdoc-edge analyze-substitution --validate-LSP

# Find unused substitutions
tsdoc-edge analyze-substitution --find-unused
```

### Storage Schema

```typescript
{
  type: 'substitution',
  from: ['DatabaseStorage', 'FileStorage', 'MemoryStorage'],
  to: 'IStorage',
  direction: 'undirected',
  strength: 'medium',
  category: 'alternative',
  evidence: [{
    type: 'type-signature',
    source: 'src/storage/IStorage.ts',
    lineNumber: 5,
    snippet: 'interface IStorage { save, load }',
    confidence: 1.0
  }],
  properties: {
    interface: 'IStorage',
    substitutableMethods: ['save', 'load'],
    substitutionType: 'interface-implementation',
    lspCompliant: true
  }
}
```

## Use Cases

### 1. **Dependency Injection**
```bash
# Find injectable substitutions
tsdoc-edge analyze-substitution --injectable
```

### 2. **Testing Strategy**
```bash
# Find mockable dependencies
tsdoc-edge analyze-substitution --mockable
```

### 3. **Refactoring Analysis**
```bash
# Safe to replace A with B?
tsdoc-edge analyze-substitution --can-replace DatabaseStorage MemoryStorage
```

### 4. **Plugin Systems**
```bash
# Find plugin substitutions
tsdoc-edge analyze-substitution --type=plugin
```

## Substitution Principles

### ✅ **Liskov Substitution Principle (LSP)**
```typescript
// GOOD: Subtype can substitute supertype
class Rectangle {
  setWidth(w: number) {}
  setHeight(h: number) {}
  getArea(): number { /**/ }
}

class Square extends Rectangle {
  // ✅ LSP preserved: Square IS-A Rectangle
  setWidth(w: number) { super.setWidth(w); super.setHeight(w); }
}
```

### ❌ **LSP Violation**
```typescript
// BAD: Subtype violates supertype contract
class Bird {
  fly() { /* all birds can fly */ }
}

class Penguin extends Bird {
  fly() { throw new Error("Penguins can't fly!"); }
  // ❌ LSP violated: Penguin breaks Bird contract
}
```

## Substitution Types

### 1. **Perfect Substitution**
- Identical interface
- Identical behavior
- Identical performance characteristics
- Example: `HashMap` ↔ `TreeMap` (both implement `Map`)

### 2. **Behavioral Substitution**
- Same interface
- Equivalent behavior (different implementation)
- Different performance trade-offs
- Example: `BubbleSort` ↔ `QuickSort`

### 3. **Structural Substitution**
- Same method signatures
- Possibly different behavior
- Duck typing compatibility
- Example: Two unrelated classes with same API

### 4. **Generic Substitution**
- Type parameters allow substitution
- Constrained by generic bounds
- Example: `Array<T>` where T can be substituted

## Integration with Other Relationships

**Enables**:
- [[Fallback]]: Substitution enables fallback strategies
- Alternative: Substitution provides alternatives
- Polymorphism: Runtime substitution via polymorphism

**Requires**:
- [[Interface Implementation]]: Interface defines contract
- [[Inheritance]]: Base classes enable substitution
- [[Type Dependency]]: Shared types enable substitution

## Benefits

1. **Flexibility**: Easy to swap implementations
2. **Testability**: Mock substitutions for testing
3. **Extensibility**: Add new substitutions without changing code
4. **Decoupling**: Depend on abstraction, not concrete implementation
5. **Configuration**: Runtime selection of implementation

## Validation Rules

### 1. **Interface Compliance**
```typescript
// All substitutions must implement full interface
interface IService {
  method1(): void;
  method2(): void;
}

// ❌ Incomplete implementation
class PartialService implements IService {
  method1() {} // method2 missing!
}
```

### 2. **Behavioral Consistency**
```typescript
// Substitutions should have consistent behavior
// ✅ Both throw same errors
// ✅ Both return same types
// ✅ Both have same side effects
```

### 3. **Signature Compatibility**
```typescript
// Method signatures must be compatible
interface IProcessor {
  process(data: string): Promise<number>;
}

// ❌ Incompatible signature
class BadProcessor implements IProcessor {
  process(data: number): number { /**/ }
  // Wrong parameter type, wrong return type
}
```

## Metrics

```typescript
interface SubstitutionMetrics {
  substitutionSetSize: number;        // How many substitutable implementations
  interfaceCompliance: number;        // 0-1 compliance score
  lspCompliance: boolean;             // Liskov Substitution Principle
  usageCount: number;                 // How often each substitution used
  testCoverage: number;               // Test coverage of substitutions
}
```

## Related

- [[Fallback]] (`fallback.md`): Substitution with error handling
- [[Interface Implementation]] (`INTERFACE-IMPL.md`): Enables substitution
- [[Inheritance]] (`INHERITANCE.md`): Base class substitution
- [[Type Dependency]] (`TYPE-DEPENDENCY.md`): Type-based substitution
- [[Composition Relationship]] (`COMPOSITION.md`): Composition over substitution

## Tags

`#alternative` `#polymorphism` `#interface` `#LSP` `#substitutability` `#phase-2`

---

**Status**: ⏳ Phase 2 (Planned)
**Priority**: Medium (important for architecture flexibility)
**Estimated Effort**: 2-3 weeks
**Dependencies**: Type system analysis, interface detection, inheritance tracking

---

## Backlinks

### Referenced By

- [[Fallback]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/fallback.md:106
- [[Mutual Exclusion]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/mutual-exclusion.md:106
- [[Mutual Exclusion]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/mutual-exclusion.md:123

