---
title: TypeDependencyAnalyzer
type: analyzer
category: core-components
status: active
canonical: true
---

# [[TypeDependencyAnalyzer]]

**Source**: `src/analyzer/TypeDependencyAnalyzer.ts`

## Purpose

타입 간 의존성 분석 - TypeScript 타입 시스템을 통한 의존성 추적.

## Detects

### Type Dependency Patterns

1. **Parameter Type Dependencies** (parameter)
   - Function/method parameter types
   - Constructor parameter types
   - Callback parameter types

2. **Return Type Dependencies** (return-type)
   - Function return types
   - Method return types
   - Getter return types

3. **Property Type Dependencies** (property)
   - Class property types
   - Interface property types
   - Object literal property types

4. **Type Alias Dependencies** (type-alias)
   - Type alias references
   - Utility type usage
   - Mapped type dependencies

5. **Generic Type Parameters** (generic)
   - Generic type constraints
   - Generic instantiations
   - Conditional type dependencies

## Implementation

### Core Features

#### 1. Symbol Resolution with nameIndex

**Performance Optimization**: O(1) symbol lookup instead of O(n) iteration

```typescript
private findSymbolByName(symbolName: string): { id: string; name: string } | undefined {
  // First try exact name match using nameIndex (O(1))
  if (this.graph.nameIndex && this.graph.nameIndex.has(symbolName)) {
    const symbolIds = this.graph.nameIndex.get(symbolName);
    if (symbolIds && symbolIds.length > 0) {
      const symbolId = symbolIds[0];
      const symbol = this.graph.symbols.get(symbolId);
      if (symbol) {
        return { id: symbolId, name: symbol.name };
      }
    }
  }

  // Fallback: search through all symbols for partial match
  for (const [symbolId, symbol] of this.graph.symbols.entries()) {
    if (symbol.name === symbolName || symbol.name.endsWith(`.${symbolName}`)) {
      return { id: symbolId, name: symbol.name };
    }
  }

  return undefined;
}
```

**Key Fix (2025-11)**: Changed from `Object.entries(this.graph.symbols)` to `this.graph.symbols.entries()` to properly iterate Map.

#### 2. TypeScript AST Traversal

**Patterns Detected**:

```typescript
// Pattern 1: Parameter type
function process(data: DataType) {}
// Creates: function-process → type-datatype (parameter)

// Pattern 2: Return type
function fetch(): Promise<User> {}
// Creates: function-fetch → interface-user (return-type)

// Pattern 3: Property type
class Service {
  private config: Config;
  // Creates: class-service → interface-config (property)
}

// Pattern 4: Generic constraint
function sort<T extends Comparable>(items: T[]) {}
// Creates: function-sort → interface-comparable (generic-constraint)
```

#### 3. Confidence Scoring

| Pattern | Confidence | Rationale |
|---------|-----------|-----------|
| Parameter type | 1.0 | Explicit type annotation |
| Return type | 1.0 | Explicit type annotation |
| Property type | 1.0 | Explicit type annotation |
| Inferred type | 0.8 | TypeScript inference |
| Generic constraint | 0.95 | Explicit constraint |

### Results

**Current Performance** (TSDoc Edge codebase):
- **Total Relationships**: 2,132
- **Parameter Dependencies**: 868 (40.7%)
- **Return Type Dependencies**: 960 (45.0%)
- **Property Dependencies**: 304 (14.3%)
- **Analysis Time**: ~800ms

### Bug Fixes

#### Fix #1: Map Iteration (2025-11)

**Problem**: `Object.entries()` doesn't properly iterate ES6 Maps in TypeScript

```typescript
// ❌ WRONG - doesn't work with Map
for (const [symbolId, symbol] of Object.entries(this.graph.symbols)) {
  // Never executes - Object.entries() returns empty array for Map
}

// ✅ CORRECT - proper Map iteration
for (const [symbolId, symbol] of this.graph.symbols.entries()) {
  // Works correctly
}
```

**Impact**: Before fix, `findSymbolByName()` always returned undefined, causing 0 type dependencies to be detected.

**Result**: After fix, 2,132 relationships successfully generated.

## Related

- [[Type Dependency]]: 관계 타입 정의
- TypeChainTracer: 타입 체인 추적
- [[Generic Constraint]]: 제네릭 제약 관계

---

## Backlinks

### Referenced By

- DetectCircularTypesCommand → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/DetectCircularTypesCommand.md:51
- [[FindRootTypesCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/FindRootTypesCommand.md:36
- [[FindRootTypesCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/FindRootTypesCommand.md:83
- Analyzer Status → /Users/junwoobang/workflow/tsdoc-edge/managed/features/analyzer-status.md:90
- Analyzer Status → /Users/junwoobang/workflow/tsdoc-edge/managed/features/analyzer-status.md:281
- [[SymbolGraphFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/symbol-graph.md:158
- [[Relationship Analysis Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/relationship-analysis-guide.md:281
- [[Generic Constraint]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/GENERIC-CONSTRAINT.md:8
- [[Type Dependency]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/TYPE-DEPENDENCY.md:8
- [[Relationship Types]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/index.md:116
- [[Relationship Types]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/index.md:124
