---
title: IO Dependency
type: relationship
category: data-flow
status: implemented
implementation-progress: 100%
relationships-count: 6705
---

# [[IO Dependency]]

> **Type**: `io-dependency`
> **Category**: Data Flow (Data Space)
> **Status**: ✅ Fully Implemented
> **Detection Method**: Type Inference

## Purpose

Track data flow relationships by matching output types (return types) with input types (parameters). This reveals **how data moves through the system** beyond just import statements.

## Pattern

```typescript
// Symbol A produces data
function fetchUser(): User { /* ... */ }

// Symbol B consumes same type
function displayUser(user: User): void { /* ... */ }

// Creates relationship:
// type: 'io-dependency'
// from: fetchUser (producer)
// to: displayUser (consumer)
// dataType: 'User'
```

## Key Insight

While [[Code Dependency]] shows structural connections (imports), [[IO Dependency]] shows **functional connections** (data flow). A function might not directly import another, but if it produces data that another consumes, there's a data dependency.

## Implementation

### Analyzer

**File**: `src/analyzer/IODependencyAnalyzer.ts`

**Algorithm**:
1. **Extract Producers**: Find all functions with return types
2. **Extract Consumers**: Find all functions with parameter types
3. **Cartesian Product Match**: For each producer-consumer pair, check if output type matches input type
4. **Create Relationship**: If match found, create IO dependency

```typescript
class IODependencyAnalyzer {
  analyze(): UnifiedRelationship[] {
    // 1. Build producer map: returnType → [symbols]
    const producers = this.extractProducers();

    // 2. Build consumer map: paramType → [symbols]
    const consumers = this.extractConsumers();

    // 3. Match types
    const relationships: UnifiedRelationship[] = [];
    for (const [type, producerSymbols] of producers) {
      const consumerSymbols = consumers.get(type);
      if (consumerSymbols) {
        // Create producer → consumer relationships
        for (const producer of producerSymbols) {
          for (const consumer of consumerSymbols) {
            relationships.push(this.createIORelationship(
              producer, consumer, type
            ));
          }
        }
      }
    }

    return relationships;
  }
}
```

### Type Matching Rules

1. **Exact Match**: `User` === `User`
2. **Generic Match**: `Promise<T>` matches if `T` matches
3. **Array Match**: `User[]` matches `User[]`
4. **Union/Intersection**: Partial matching with lower confidence

### Confidence Scoring

```typescript
function calculateConfidence(match: TypeMatch): number {
  if (match.exact) return 1.0;           // Perfect match
  if (match.generic) return 0.9;         // Generic type match
  if (match.arrayElement) return 0.85;   // Array element match
  if (match.union) return 0.7;           // Union type overlap
  return 0.5;                            // Default
}
```

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `type` | `'io-dependency'` | Fixed value |
| `category` | `'data-flow'` | Fixed value |
| `direction` | `'unidirectional'` | Producer → Consumer |
| `strength` | `'medium'` | Inferred, not explicit |
| `confidence` | `0.5 - 1.0` | Based on type match quality |
| `discoveredBy` | `'type-inference'` | Type system analysis |
| `properties.dataType` | `string` | The type being passed |

## Commands

### Analyze

```bash
# Run IO dependency analysis
tsdoc-edge analyze-io src

# This will:
# 1. Load symbol graph from database
# 2. Extract all return types and parameter types
# 3. Match compatible types
# 4. Store relationships in unified_relationships table
```

### Query

```bash
# Find data flow from a symbol
tsdoc-edge deps <symbol-id> --type io-dependency

# Find data flow to a symbol
tsdoc-edge who-uses <symbol-id> --type io-dependency
```

## Relationship to Other Types

### Builds On

- **[[Code Dependency]]**: Helps identify candidate symbols within imported modules

### Enables

- **[[Pipeline]]**: Multiple IO dependencies create pipeline chains
  - If `A → B` and `B → C` (via IO deps), then `A → B → C` is a pipeline

### Compared To

- **[[Code Dependency]]**: Structural (imports)
- **[[IO Dependency]]**: Functional (data flow)
- **[[Calls]]**: Behavioral (execution)

## Statistics

**Current Count**: 6,705 relationships (as of 2025-11-07)

```bash
# Verify count
sqlite3 .tsdoc/symbols.db \
  "SELECT COUNT(*) FROM unified_relationships WHERE type='io-dependency'"

# Breakdown by confidence
sqlite3 .tsdoc/symbols.db \
  "SELECT confidence, COUNT(*) FROM unified_relationships
   WHERE type='io-dependency' GROUP BY confidence"
```

**Distribution**:
- High confidence (0.9-1.0): ~4,200 relationships
- Medium confidence (0.7-0.9): ~1,800 relationships
- Lower confidence (0.5-0.7): ~700 relationships

## Example

### Source Code

```typescript
// src/storage/DatabaseManager.ts
class DatabaseManager {
  getAllSymbols(): Symbol[] {
    // Returns Symbol[]
  }
}

// src/graph/SymbolGraphBuilder.ts
class SymbolGraphBuilder {
  addSymbols(symbols: Symbol[]): void {
    // Accepts Symbol[]
  }
}
```

### Generated Relationship

```json
{
  "id": "io-dependency-method-databasemanager-getallsymbols-method-symbolgraphbuilder-addsymbols",
  "type": "io-dependency",
  "category": "data-flow",
  "from": "method-databasemanager-getallsymbols",
  "to": "method-symbolgraphbuilder-addsymbols",
  "direction": "unidirectional",
  "strength": "medium",
  "confidence": 0.95,
  "discoveredBy": "type-inference",
  "properties": {
    "dataType": "Symbol[]",
    "producerType": "Symbol[]",
    "consumerType": "Symbol[]"
  },
  "description": "DatabaseManager.getAllSymbols produces Symbol[] consumed by SymbolGraphBuilder.addSymbols"
}
```

## Impact Analysis Use Case

IO dependencies are crucial for impact analysis:

```bash
# Find all consumers affected if we change User type
tsdoc-edge who-uses type-user --type io-dependency --recursive

# Output:
# fetchUser() returns User
#   ├─ displayUser(user: User) consumes it
#   ├─ validateUser(user: User) consumes it
#   └─ saveUser(user: User) consumes it
#
# If User type changes, ALL these functions are affected!
```

## Limitations

1. **Type aliases**: May not resolve through complex type aliases
2. **Dynamic types**: `any` and `unknown` are not tracked
3. **Runtime relationships**: Only tracks static type relationships
4. **Generics**: Complex generic constraints may have lower confidence

## Future Enhancements

- [ ] Improve generic type matching
- [ ] Track type transformations (e.g., `User` → `UserDTO`)
- [ ] Detect breaking type changes
- [ ] Visualize data flow diagrams

## Related Checkpoints

- [[Relationship Types]]: Parent index
- [[Pipeline]]: Multi-step data flow built from IO dependencies
- [[Type Dependency]]: Type-level structural dependencies (different from data flow)
- [[Calls]]: Execution-time relationships (complements data flow)

---

**Implementation File**: `src/analyzer/IODependencyAnalyzer.ts`
**Command**: `analyze-io`
**Database Column**: `unified_relationships.type = 'io-dependency'`
**Confidence Range**: 0.5 - 1.0
