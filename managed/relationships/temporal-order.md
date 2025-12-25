---
title: Temporal Order
type: relationship
category: behavioral
status: active
canonical: true
phase: 2
---

# [[Temporal Order]]

> **Type**: `temporal-order` | **Status**: ✅ Implemented

Track execution order dependencies where A must execute before B.

## Definition

**Temporal order** relationships capture execution sequencing constraints where one operation must complete before another can begin.

**Pattern**: `A must execute before B`

**Examples**:
- Database connection must be established before queries
- User authentication must complete before data access
- File system initialization before file operations
- Schema migration before application start

## Category

**Category**: `behavioral`
**Direction**: `unidirectional` (A → B)
**Strength**: `strong` (explicit ordering constraint)

## Detection Strategies

### 1. **Explicit Annotations**
```typescript
/**
 * @before initialize
 * @after cleanup
 */
async function processData() {
  // ...
}
```

### 2. **Control Flow Analysis**
```typescript
async function startup() {
  await connectDatabase();  // Must happen first
  await loadConfig();       // Depends on database
  await startServer();      // Depends on config
}
```

### 3. **Dependency Injection Order**
```typescript
class Application {
  constructor(
    db: Database,        // Initialized first
    cache: Cache,        // Requires db
    server: Server       // Requires cache
  ) {}
}
```

### 4. **Lifecycle Methods**
```typescript
class Component {
  async beforeMount() {}  // Order: 1
  async mount() {}        // Order: 2
  async afterMount() {}   // Order: 3
}
```

## Implementation

### Analyzer: `TemporalOrderAnalyzer`

**Location**: Source: src/analyzer/TemporalOrderAnalyzer.ts

The TemporalOrderAnalyzer is fully implemented with 5 pattern detection strategies:

#### Pattern 1: Sequential Function Calls

Detects consecutive function calls in a block, including both synchronous and awaited calls.

```typescript
// Detected pattern
async function initialize() {
  await connectDatabase();  // First
  await loadConfig();       // Second (depends on first)
  await startServer();      // Third (depends on second)
}
```

**Confidence**: 0.8 (high confidence for sequential statements)

#### Pattern 2: Constructor Field Initialization

Tracks the initialization order of class fields in constructors.

```typescript
class Application {
  constructor() {
    this.config = loadConfig();      // Order: 1
    this.database = connectDB();     // Order: 2
    this.cache = initCache();        // Order: 3
  }
}
```

**Confidence**: 0.9 (very high confidence for explicit initialization order)

#### Pattern 3: Async/Await Sequences

Specialized detection for async functions with sequential await expressions.

```typescript
async function process() {
  const data = await fetchData();      // First
  const validated = await validate();  // Second
  return await save(validated);        // Third
}
```

**Confidence**: 0.9 (very high confidence for await chains)

#### Pattern 4: Lifecycle Hooks

Detects test framework lifecycle methods (beforeEach, afterEach, setup, teardown) and their execution order.

```typescript
beforeEach(() => {
  initializeTestDB();    // Runs first
  seedTestData();        // Runs second
});

afterEach(() => {
  clearTestData();       // Runs first
  closeTestDB();         // Runs second
});
```

**Confidence**: 0.95 (very high confidence for framework conventions)

#### Pattern 5: Promise Chains

Identifies temporal ordering in `.then()` and `.catch()` promise chains.

```typescript
fetchData()
  .then(processData)    // Depends on fetchData
  .then(saveResult)     // Depends on processData
  .catch(handleError);  // Fallback handler
```

**Confidence**: 0.85 (high confidence for promise chaining)

### Key Implementation Features

1. **Symbol Resolution with nameIndex**:
   - O(1) symbol lookup using graph's nameIndex
   - Fallback to full graph traversal for partial matches
   - Handles qualified names (e.g., `this.method`)

2. **Pattern Detection**:
   - AST traversal with TypeScript compiler API
   - Supports multiple statement types (expression, variable declaration, return)
   - Skips test files and node_modules

3. **Deduplication**:
   - Tracks seen symbol pairs to avoid duplicate relationships
   - Uses set-based deduplication with `from->to` keys

4. **Evidence Collection**:
   - Records file path and line number for each detection
   - Stores pattern type for analysis context
   - Maintains confidence scores based on pattern type

### Usage

```bash
# Run temporal order analysis (automatically included in build)
tsdoc-edge build src

# Analyze specific relationships
tsdoc-edge analyze-temporal-order
```

### Performance

- **Analysis Time**: ~500ms for medium codebases (2,000+ symbols)
- **Memory Usage**: O(n) where n = number of sequential statements
- **Scalability**: Linear with codebase size

### Limitations

1. **Dynamic Execution Order**: Cannot detect runtime-dependent order
2. **Conditional Branches**: If/else branches create ambiguous ordering
3. **Event Handlers**: Event-driven code has implicit ordering not captured
4. **Cross-File Sequences**: Limited to single-file analysis

## Original Design Specification

### Analyzer: `TemporalOrderAnalyzer`

**Detection Methods**:
1. **Tag-based**: Parse `@before`, `@after`, `@order` tags
2. **Control-flow**: Analyze `async`/`await` sequences
3. **Constructor**: Track initialization order in DI
4. **Lifecycle**: Detect framework lifecycle methods

**Confidence Scoring**:
- `1.0`: Explicit `@before`/`@after` tags
- `0.9`: Sequential `await` in same function
- `0.8`: Constructor parameter order
- `0.7`: Lifecycle method conventions
- `0.6`: Inferred from call order

### Command: `tsdoc-edge analyze-temporal-order`

**Usage**:
```bash
# Analyze temporal order relationships
tsdoc-edge analyze-temporal-order

# Detect initialization order violations
tsdoc-edge analyze-temporal-order --detect-violations

# Export temporal graph
tsdoc-edge analyze-temporal-order --export=mermaid
```

### Storage Schema

```typescript
{
  type: 'temporal-order',
  from: 'connectDatabase',
  to: 'loadConfig',
  direction: 'unidirectional',
  strength: 'strong',
  category: 'behavioral',
  evidence: [{
    type: 'code',
    source: 'src/startup.ts',
    lineNumber: 15,
    snippet: 'await connectDatabase(); await loadConfig();',
    confidence: 0.9
  }],
  properties: {
    orderType: 'sequential-async',
    critical: true,
    violationImpact: 'runtime-error'
  }
}
```

## Use Cases

### 1. **Startup Sequence Validation**
```bash
# Verify application initialization order
tsdoc-edge analyze-temporal-order --validate-startup
```

### 2. **Race Condition Detection**
```bash
# Find operations that may execute out of order
tsdoc-edge analyze-temporal-order --detect-races
```

### 3. **Dependency Graph**
```bash
# Visualize execution order dependencies
tsdoc-edge analyze-temporal-order --graph
```

### 4. **Migration Planning**
```bash
# Ensure database migrations run in correct order
tsdoc-edge analyze-temporal-order --type=migration
```

## Violation Examples

### ❌ **Order Violation**
```typescript
// BAD: Config loaded before database connection
await loadConfig();        // Requires database
await connectDatabase();   // Too late!
```

### ✅ **Correct Order**
```typescript
// GOOD: Database connected first
await connectDatabase();   // First
await loadConfig();        // Then config
```

### ❌ **Race Condition**
```typescript
// BAD: Parallel execution without coordination
Promise.all([
  connectDatabase(),  // May complete in any order
  loadConfig()        // Depends on database!
]);
```

### ✅ **Coordinated Execution**
```typescript
// GOOD: Sequential execution
await connectDatabase();
await loadConfig();
```

## Integration with Other Relationships

**Complements**:
- [[Call Relationships]]: Calls may imply temporal order
- [[IO Dependency]]: Data flow often implies temporal sequence
- [[Pipeline]]: Pipelines enforce temporal order
- [[Composition Relationship]]: Component initialization order

**Differs from**:
- [[Code Dependency]]: Imports are static, not temporal
- [[Call Relationships]]: Calls happen at runtime, may not be ordered

## Benefits

1. **Startup Validation**: Ensure correct initialization sequence
2. **Race Detection**: Find potential race conditions
3. **Migration Safety**: Validate migration order
4. **Documentation**: Make execution order explicit
5. **Refactoring Safety**: Preserve critical ordering during changes

## Challenges

1. **Dynamic Order**: Runtime order may vary
2. **Conditional Execution**: If/else complicates analysis
3. **Async Complexity**: Promise chains hard to analyze
4. **Framework Magic**: Framework-controlled order is implicit

## Future Enhancements

1. **Runtime Validation**: Monitor actual execution order
2. **Order Enforcement**: Auto-generate ordering code
3. **Visual Timeline**: Timeline visualization of execution
4. **Performance Impact**: Analyze ordering bottlenecks

## Related

- [[Call Relationships]] (`CALLS.md`): Function invocations
- [[Pipeline]] (`PIPELINE.md`): Multi-step data flow
- [[IO Dependency]] (`io-dependency.md`): Data dependencies
- [[Composition Relationship]] (`COMPOSITION.md`): Component relationships
- [[Collaboration]] (`collaboration.md`): Cooperative behavior

## Tags

`#behavioral` `#execution-order` `#async` `#initialization` `#sequence` `#phase-2`

---

**Status**: ✅ Implemented (Phase 2 Complete)
**Priority**: High (critical for startup validation)
**Actual Effort**: 1 week
**Implementation**: Source: src/analyzer/TemporalOrderAnalyzer.ts

---

## Backlinks

### Referenced By

- Analyzer Status → /Users/junwoobang/workflow/tsdoc-edge/managed/features/analyzer-status.md:45
- Analyzer Status → /Users/junwoobang/workflow/tsdoc-edge/managed/features/analyzer-status.md:280
- [[Collaboration]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/collaboration.md:134
- [[Collaboration]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/collaboration.md:164

