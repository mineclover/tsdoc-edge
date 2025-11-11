---
title: Collaboration
type: relationship
category: behavioral
status: planned
canonical: true
phase: 2
---

# [[Collaboration]]

> **Type**: `collaboration` | **Status**: ⏳ Phase 2 (Not Implemented)

Track cooperative relationships where multiple symbols work together to achieve a shared goal.

## Definition

**Collaboration** relationships capture scenarios where two or more components actively cooperate to accomplish a task that neither could complete alone.

**Pattern**: `A collaborates with B to achieve goal C`

**Key Characteristics**:
- **Bidirectional**: Both components actively participate
- **Goal-oriented**: Focused on achieving specific outcome
- **Coordinated**: Components must work in sync
- **Complementary**: Each provides unique capabilities

## Category

**Category**: `behavioral`
**Direction**: `bidirectional` (A ↔ B)
**Strength**: `strong` (tight coupling for collaboration)

## Examples

### 1. **Observer Pattern**
```typescript
class Subject {
  private observers: Observer[] = [];

  notify() {
    // Subject collaborates with Observers
    this.observers.forEach(o => o.update());
  }
}

class Observer {
  update() {
    // Observer collaborates with Subject
  }
}
```

### 2. **Controller-Service Pattern**
```typescript
class UserController {
  constructor(
    private userService: UserService,
    private authService: AuthService
  ) {}

  async getUser(id: string) {
    // Controller collaborates with both services
    await this.authService.checkPermission();
    return this.userService.findById(id);
  }
}
```

### 3. **Strategy Pattern**
```typescript
class Context {
  constructor(private strategy: Strategy) {}

  execute() {
    // Context collaborates with Strategy
    return this.strategy.algorithm();
  }
}
```

### 4. **Event-Driven Collaboration**
```typescript
class EventBus {
  emit(event: Event) {
    // EventBus collaborates with Handlers
  }
}

class Handler {
  handleEvent(event: Event) {
    // Handler collaborates with EventBus
  }
}
```

## Detection Strategies

### 1. **Mutual Dependencies**
```typescript
// A uses B AND B uses A
class A {
  constructor(private b: B) {}
  doSomething() { this.b.help(); }
}

class B {
  process(a: A) { a.callback(); }
}
```

### 2. **Shared Context**
```typescript
class Transaction {
  // Multiple participants share transaction context
  constructor(
    private db: Database,
    private logger: Logger,
    private validator: Validator
  ) {}
}
```

### 3. **Event Pub/Sub**
```typescript
// Publisher and Subscribers collaborate via events
eventBus.on('data-ready', handler);
eventBus.emit('data-ready', data);
```

### 4. **Coordinated Workflow**
```typescript
// Components coordinate through shared workflow
class Orchestrator {
  async workflow() {
    await this.stepA.execute();
    await this.stepB.execute();
    await this.stepC.execute();
  }
}
```

## Planned Implementation

### Analyzer: `CollaborationAnalyzer`

**Detection Methods**:
1. **Bidirectional Calls**: A calls B AND B calls A
2. **Shared State**: Components access same data structure
3. **Event Coupling**: Pub/sub relationships
4. **Interface Contracts**: Explicit collaboration interfaces
5. **Constructor Injection**: Multiple collaborators injected

**Confidence Scoring**:
- `1.0`: Explicit `@collaborates` tag
- `0.9`: Bidirectional calls detected
- `0.8`: Shared state access
- `0.7`: Event pub/sub pattern
- `0.6`: Constructor injection of multiple deps

### Command: `tsdoc-edge analyze-collaboration`

**Usage**:
```bash
# Analyze all collaboration relationships
tsdoc-edge analyze-collaboration

# Find tight coupling
tsdoc-edge analyze-collaboration --detect-coupling

# Visualize collaboration networks
tsdoc-edge analyze-collaboration --graph

# Find collaboration patterns
tsdoc-edge analyze-collaboration --detect-patterns
```

### Storage Schema

```typescript
{
  type: 'collaboration',
  from: ['UserController', 'UserService'],
  to: 'User Management Feature',
  direction: 'bidirectional',
  strength: 'strong',
  category: 'behavioral',
  evidence: [{
    type: 'code',
    source: 'src/controllers/UserController.ts',
    lineNumber: 15,
    snippet: 'constructor(private userService: UserService)',
    confidence: 0.9
  }],
  properties: {
    collaborationType: 'controller-service',
    goal: 'user-management',
    coordinationMechanism: 'dependency-injection',
    bidirectional: true
  }
}
```

## Collaboration Patterns

### 1. **Master-Detail**
```typescript
// Master manages Details
class OrderMaster {
  constructor(private details: OrderDetail[]) {}
}
```

### 2. **Mediator**
```typescript
// Components collaborate through Mediator
class Mediator {
  coordinate(a: ComponentA, b: ComponentB) {}
}
```

### 3. **Chain of Responsibility**
```typescript
// Handlers collaborate in sequence
class Handler {
  constructor(private next?: Handler) {}
}
```

### 4. **Composite**
```typescript
// Parent and Children collaborate
class Composite {
  private children: Component[] = [];
  operation() {
    this.children.forEach(c => c.operation());
  }
}
```

## Use Cases

### 1. **Architecture Analysis**
```bash
# Identify collaboration clusters
tsdoc-edge analyze-collaboration --find-clusters
```

### 2. **Refactoring Planning**
```bash
# Find tightly coupled collaborations
tsdoc-edge analyze-collaboration --tight-coupling
```

### 3. **Pattern Detection**
```bash
# Detect design patterns through collaboration
tsdoc-edge analyze-collaboration --detect-patterns
```

### 4. **Impact Analysis**
```bash
# Understand collaboration impact of changes
tsdoc-edge analyze-collaboration --impact-of UserService
```

## Anti-Patterns

### ❌ **God Object**
```typescript
// BAD: One object collaborates with everything
class GodObject {
  constructor(
    private a: A, private b: B, private c: C,
    private d: D, private e: E, private f: F
  ) {}
}
```

### ❌ **Circular Collaboration**
```typescript
// BAD: A → B → C → A (tight circular coupling)
class A { constructor(private c: C) {} }
class B { constructor(private a: A) {} }
class C { constructor(private b: B) {} }
```

### ❌ **Hidden Collaboration**
```typescript
// BAD: Implicit collaboration via global state
class A { process() { globalState.value++; } }
class B { process() { return globalState.value; } }
```

## Differs From

| Relationship | Difference |
|--------------|------------|
| **Composition** | Composition is structural (has-a), Collaboration is behavioral (works-with) |
| **Calls** | Calls are unidirectional invocations, Collaboration is bidirectional cooperation |
| **Dependency** | Dependency is compile-time import, Collaboration is runtime cooperation |

## Integration with Other Relationships

**Enables**:
- [[Composition]]: Collaborators often composed together
- [[Calls]]: Collaboration implemented via calls
- [[Event Flow]]: Event-driven collaboration
- [[Temporal Order]]: Collaborations may have execution order

**Detected via**:
- [[Code Dependency]]: Imports enable collaboration
- [[Type Dependency]]: Shared types indicate collaboration

## Benefits

1. **Pattern Recognition**: Identify design patterns
2. **Coupling Analysis**: Measure collaboration strength
3. **Refactoring Guidance**: Understand collaboration impact
4. **Architecture Validation**: Verify collaboration boundaries
5. **Documentation**: Make implicit collaboration explicit

## Challenges

1. **Implicit Collaboration**: Hard to detect without explicit markers
2. **Dynamic Collaboration**: Runtime-only collaboration patterns
3. **Transitive Collaboration**: A→B→C collaboration chains
4. **Context-Dependent**: Collaboration may be situational

## Metrics

```typescript
interface CollaborationMetrics {
  collaboratorCount: number;           // How many collaborators
  collaborationStrength: number;       // 0-1 coupling strength
  bidirectionality: boolean;           // Two-way collaboration?
  collaborationPattern: string;        // Detected pattern name
  coordinationMechanism: string;       // How they coordinate
}
```

## Related

- [[Composition]] (`COMPOSITION.md`): Structural relationships
- [[Calls]] (`CALLS.md`): Implementation mechanism
- [[Event Flow]] (`event-flow.md`): Event-driven collaboration
- [[Temporal Order]] (`temporal-order.md`): Execution sequencing
- [[Code Dependency]] (`code-dependency.md`): Static dependencies

## Tags

`#behavioral` `#design-patterns` `#coupling` `#architecture` `#coordination` `#phase-2`

---

**Status**: ⏳ Phase 2 (Planned)
**Priority**: Medium (valuable for architecture analysis)
**Estimated Effort**: 3-4 weeks
**Dependencies**: Call graph, dependency analysis, pattern recognition

---

## Backlinks

### Referenced By

- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md
