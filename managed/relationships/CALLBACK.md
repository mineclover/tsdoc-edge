---
title: Callback Pattern
type: relationship
category: behavioral
status: planned
canonical: true
priority: medium
---

# [[Callback Pattern]]

> **Type**: `callback` | **Status**: =� Planned for v2.0

Track callback-based control flow where functions are passed as parameters and invoked later.

## Concept

**Callback Pattern** represents inversion of control where caller provides a function to be executed by the callee at a specific time.

**Examples**:
```typescript
// Simple callback
function fetchData(url: string, onSuccess: (data: any) => void) {
  // ... fetch logic
  onSuccess(data);  // � Callback invoked
}

fetchData('/api/users', (data) => {
  console.log(data);  // � Callback implementation
});

// Event handler callback
button.addEventListener('click', () => {
  console.log('Clicked!');  // � Event callback
});

// Higher-order function callback
[1, 2, 3].map(x => x * 2);  // � Array method callback
```

**Key Characteristics**:
- **Inversion of Control**: Callee decides when to invoke
- **Async Pattern**: Common in asynchronous operations
- **Decoupling**: Caller and callee don't need direct dependency

## Detection Strategy

### Function Parameter Analysis

```typescript
function processUsers(
  users: User[],
  onEach: (user: User) => void,    // � Callback parameter detected
  onComplete?: () => void           // � Optional callback
) {
  users.forEach(onEach);
  onComplete?.();
}
```

**Detection Rules**:
1. Parameter with function type signature
2. Parameter invoked within function body
3. Common callback names: `callback`, `onSuccess`, `onError`, `handler`

### Event Listener Pattern

```typescript
class EventEmitter {
  on(event: string, listener: (...args: any[]) => void) {  // � Event callback
    this.listeners.push(listener);
  }

  emit(event: string, ...args: any[]) {
    this.listeners.forEach(listener => listener(...args));  // � Callback invocation
  }
}
```

**Indicators**:
- Methods named `on`, `addEventListener`, `subscribe`
- Event-driven architecture
- Observer/Publisher-Subscriber pattern

### Promise/Async Callbacks

```typescript
// Promise callbacks
fetch('/api/data')
  .then(response => response.json())      // � Success callback
  .catch(error => console.error(error));  // � Error callback

// Async iteration callback
async function processItems(items: Item[], process: (item: Item) => Promise<void>) {
  for (const item of items) {
    await process(item);  // � Async callback invocation
  }
}
```

## Callback Patterns to Detect

### 1. Node.js Error-First Callbacks

```typescript
function readFile(path: string, callback: (err: Error | null, data: string) => void) {
  // callback(err, data)
}
```

### 2. Event Handlers

```typescript
element.addEventListener('click', (event: MouseEvent) => { ... });
```

### 3. Array Methods

```typescript
array.map(callback)
array.filter(callback)
array.forEach(callback)
array.reduce(callback)
```

### 4. Higher-Order Functions

```typescript
function retry<T>(fn: () => Promise<T>, onRetry: () => void): Promise<T> {
  return fn().catch(() => {
    onRetry();
    return retry(fn, onRetry);
  });
}
```

## Planned Implementation

### Phase 1: Parameter Detection (v2.0)

**Analyzer**: `CallbackAnalyzer` (planned)
- Scan function parameters for function types
- Track callback invocations within function body
- Detect common callback patterns

**Storage**:
```sql
INSERT INTO unified_relationships (
  from_symbol,
  to_symbol,
  type,
  metadata
) VALUES (
  'fetchData',
  'onSuccess',
  'callback',
  '{"parameterName":"onSuccess","pattern":"success-callback","async":true}'
);
```

### Phase 2: Control Flow Analysis (v2.1)

**Features**:
- Callback invocation timing analysis
- Sync vs async callback detection
- Callback chain tracking (callback hell detection)

**Example Analysis**:
```typescript
// Callback hell detection
getData((data1) => {
  processData(data1, (data2) => {
    saveData(data2, (result) => {  // � Nesting depth: 3 (warning!)
      console.log(result);
    });
  });
});
```

### Phase 3: Migration Suggestions (v2.2)

**Refactoring Hints**:
```bash
# Detect callback hell candidates for Promise migration
tsdoc-edge detect-callback-hell

# Output: Functions with >3 nested callbacks
# Suggestion: Convert to async/await
```

## Use Cases

### 1. Async Pattern Detection

```bash
# Find all callback-based async operations
tsdoc-edge deps --type=callback --pattern=async

# Identify: Functions that should migrate to Promises
```

### 2. Event Flow Mapping

```bash
# Trace event handler callbacks
tsdoc-edge analyze-callbacks --event-flow

# Output: Complete event propagation chains
```

### 3. Testing Coverage

```bash
# Find untested callback paths
tsdoc-edge coverage --callbacks

# Ensures all callback branches tested
```

### 4. Callback Hell Detection

```bash
# Find deeply nested callbacks
tsdoc-edge detect-callback-hell --threshold=3

# Output: Functions with >3 nesting levels
# Recommendation: Refactor to async/await or Promises
```

## Detection Algorithm

**Pseudocode**:
```
For each function F:
  For each parameter P in F:
    If P.type is function signature:
      For each statement S in F.body:
        If S invokes P:
          � Callback relationship detected
          Metadata: {
            parameterName: P.name,
            invocationCount: count(P in F.body),
            isAsync: detectAsync(S),
            nestingDepth: calculateDepth(S)
          }
```

**Complexity**: O(n�m�k) where n=functions, m=params, k=statements

## Callback Anti-Patterns

### 1. Callback Hell (Pyramid of Doom)

```typescript
// L Bad: Deeply nested callbacks
getData((data) => {
  validate(data, (valid) => {
    save(valid, (result) => {
      notify(result, () => {
        cleanup();
      });
    });
  });
});

//  Good: Promises or async/await
async function process() {
  const data = await getData();
  const valid = await validate(data);
  const result = await save(valid);
  await notify(result);
  cleanup();
}
```

### 2. Error Handling Inconsistency

```typescript
// L Bad: Inconsistent error handling
function fetchUser(id: string, callback: (data: User) => void) {
  // What about errors?
}

//  Good: Error-first callback pattern
function fetchUser(id: string, callback: (err: Error | null, data?: User) => void) {
  // ...
}
```

### 3. Callback Not Invoked

```typescript
// L Bad: Missing callback invocation path
function process(data: Data, onDone: () => void) {
  if (data.valid) {
    // ... process
    onDone();  // 
  }
  // L Missing onDone() in else branch
}
```

## Comparison with Other Relationships

| Relationship | Pattern | Example |
|--------------|---------|---------|
| [[Call Relationships]] | Direct call | `foo()` calls `bar()` |
| **Callback Pattern** | Indirect call | `foo(bar)` invokes `bar` later |
| [[Event Flow]] | Publish-subscribe | `emitter.emit('event')` � handlers |
| [[Pipeline]] | Sequential processing | `A � B � C` data flow |

## Related

- [[Call Relationships]]: Callbacks create call relationships
- [[Event Flow]]: Event handlers are specialized callbacks
- [[Pipeline]]: Callback chains can form pipelines
- [[IO Dependency]]: Async callbacks handle I/O results

## Benefits

### 1. Async Pattern Migration

**Before Analysis**:
```typescript
// Callback-based code scattered across codebase
function oldCode(callback) { ... }
```

**After Analysis**:
```bash
tsdoc-edge analyze-callbacks --migration-candidates

# Output: 47 functions using callbacks
# Recommendation: Migrate to Promises (23 candidates)
```

### 2. Testing Completeness

**Scenario**: Ensure all callback paths tested
```bash
tsdoc-edge coverage --callback-branches

# Output: 12/15 callback branches covered (80%)
# Missing: error callbacks in UserService
```

### 3. Performance Analysis

**Scenario**: Detect callback overhead
```bash
tsdoc-edge analyze --callback-depth

# Output: AverageDepth: 2.3, Max: 7 (in PaymentProcessor)
# Warning: Deep nesting impacts readability & performance
```

## Implementation Roadmap

### v2.0 (Q2 2025)
-  Basic parameter detection
-  Callback invocation tracking
-  Storage in unified_relationships

### v2.1 (Q3 2025)
- � Nesting depth analysis
- � Async pattern detection
- � Callback hell warnings

### v2.2 (Q4 2025)
- � Migration suggestions (callback � Promise)
- � Event flow integration
- � Error handling validation

## Status

**Current**: Design/Planning
**Priority**: Medium (common pattern, but lower priority than composition)
**Complexity**: Medium-High (requires control flow analysis)
**Estimated Effort**: 3-4 weeks

## References

- **You Don't Know JS** (Kyle Simpson): Async & Performance chapter
- **JavaScript: The Good Parts** (Crockford): Callbacks and closures
- **Node.js Design Patterns** (Casciaro): Callback patterns and anti-patterns

---

**Common Callback Names**:
- `callback`, `cb`
- `onSuccess`, `onError`, `onComplete`
- `handler`, `listener`
- `done`, `next`
- `then`, `catch`, `finally`

**Tracking**: See [[Unified Relationship Taxonomy]] for complete relationship catalog

---

## Backlinks

### Referenced By

- [[CallGraphAnalyzer]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:204
- [[Unified Relationship Taxonomy]] → /Users/junwoobang/workflow/tsdoc-edge/managed/concepts/unified-relationship-taxonomy.md:391
- [[Event Flow]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/event-flow.md:51

