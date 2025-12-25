# DepthTraverser

**Source**: `src/graph/DepthTraverser.ts`

## Purpose

Traverse symbol dependency graphs in depth-first order to analyze deep dependency chains and detect circular dependencies.

## Responsibility

Perform depth-first traversal of symbol relationships to explore complete dependency trees and chains.

## Traversal Algorithm

### Depth-First Search (DFS)

```typescript
1. Start at root symbol
2. Visit symbol (mark as visited)
3. For each dependency:
   a. If not visited: recursively traverse
   b. If visiting: circular dependency detected
   c. If visited: skip (already processed)
4. Mark as fully processed
5. Continue to next unvisited dependency
```

### Circular Dependency Detection

```typescript
States:
- NOT_VISITED: Symbol not yet seen
- VISITING: Currently in traversal stack
- VISITED: Fully processed

Circular Detection:
if (state === VISITING) {
  // Found circular dependency!
  // Current path from root to this symbol forms a cycle
}
```

## Features

### 1. Complete Dependency Chains

Finds full chains from root to leaves:

```typescript
Root
├── DepA
│   ├── DepB
│   │   └── DepC (leaf)
│   └── DepD (leaf)
└── DepE (leaf)
```

Returns all paths:
- `Root → DepA → DepB → DepC`
- `Root → DepA → DepD`
- `Root → DepE`

### 2. Maximum Depth Tracking

Tracks deepest dependency level:

```typescript
Root (depth: 0)
└── A (depth: 1)
    └── B (depth: 2)
        └── C (depth: 3)  ← Max depth
```

### 3. Cycle Detection

Identifies circular dependencies:

```typescript
A → B → C → A
↑___________|
   Circular!
```

### 4. Path Recording

Records complete path to each node:

```typescript
{
  symbol: "DepC",
  depth: 3,
  path: ["Root", "DepA", "DepB", "DepC"],
  isCircular: false
}
```

## API

### Main Traversal

```typescript
traverse(
  rootSymbol: string,
  getDependencies: (symbol: string) => string[]
): TraversalResult
```

### Result Structure

See implementation: TraversalResult

**TraversalResult**:
- `visited`: Set<string> - All visited symbols
- `maxDepth`: number - Maximum depth reached
- `cycles`: CircularDependency[] - Circular dependencies found
- `chains`: DependencyChain[] - All complete chains
- `symbolDepths`: Map<string, number> - Depth of each symbol

**CircularDependency**:
- `cycle`: string[] - Symbols forming the cycle
- `entryPoint`: string - Where cycle was detected

**DependencyChain**:
- `path`: string[] - Complete path from root to leaf
- `depth`: number - Chain length
- `leaf`: string - Terminal symbol

## Usage

### Basic Traversal

```typescript
import { DepthTraverser } from './graph/DepthTraverser';
import { DatabaseManager } from './storage/DatabaseManager';

const traverser = new DepthTraverser();
const db = new DatabaseManager();

// Define dependency getter
const getDeps = (symbol: string) => {
  return db.getSymbolDependencies(symbol);
};

// Traverse from root
const result = traverser.traverse('BuildCommand', getDeps);

console.log(`Max depth: ${result.maxDepth}`);
console.log(`Visited symbols: ${result.visited.size}`);
console.log(`Cycles found: ${result.cycles.length}`);
console.log(`Complete chains: ${result.chains.length}`);
```

### Find Deep Dependencies

```typescript
const result = traverser.traverse('RootSymbol', getDeps);

// Find deepest dependencies
const deepDeps = Array.from(result.symbolDepths.entries())
  .filter(([_, depth]) => depth >= 5)
  .sort((a, b) => b[1] - a[1]);

console.log('Deep dependencies (>= 5 levels):');
deepDeps.forEach(([symbol, depth]) => {
  console.log(`  ${symbol}: depth ${depth}`);
});
```

### Detect Circular Dependencies

```typescript
const result = traverser.traverse('RootSymbol', getDeps);

if (result.cycles.length > 0) {
  console.log('⚠️  Circular dependencies detected:');

  result.cycles.forEach((cycle, i) => {
    console.log(`\n${i + 1}. Cycle detected at ${cycle.entryPoint}:`);
    console.log(`   ${cycle.cycle.join(' → ')} → ${cycle.cycle[0]}`);
  });
}
```

### Analyze Dependency Chains

```typescript
const result = traverser.traverse('RootSymbol', getDeps);

// Find longest chains
const longestChains = result.chains
  .sort((a, b) => b.depth - a.depth)
  .slice(0, 10);

console.log('Top 10 longest dependency chains:');
longestChains.forEach((chain, i) => {
  console.log(`\n${i + 1}. Depth ${chain.depth}:`);
  console.log(`   ${chain.path.join(' → ')}`);
});
```

## Implementation Details

### State Management

```typescript
enum VisitState {
  NOT_VISITED = 0,
  VISITING = 1,    // In current DFS stack
  VISITED = 2      // Fully processed
}

const visitState = new Map<string, VisitState>();
const currentPath: string[] = [];
```

### Cycle Detection

```typescript
function visit(symbol: string, depth: number) {
  if (visitState.get(symbol) === VisitState.VISITING) {
    // Found cycle!
    const cycleStart = currentPath.indexOf(symbol);
    const cycle = currentPath.slice(cycleStart);
    cycles.push({ cycle, entryPoint: symbol });
    return;
  }

  if (visitState.get(symbol) === VisitState.VISITED) {
    return; // Already processed
  }

  visitState.set(symbol, VisitState.VISITING);
  currentPath.push(symbol);

  // Recurse to dependencies
  const deps = getDependencies(symbol);
  for (const dep of deps) {
    visit(dep, depth + 1);
  }

  currentPath.pop();
  visitState.set(symbol, VisitState.VISITED);
}
```

### Depth Tracking

```typescript
function visit(symbol: string, depth: number) {
  // Track maximum depth
  maxDepth = Math.max(maxDepth, depth);

  // Record depth for this symbol
  const existingDepth = symbolDepths.get(symbol);
  if (existingDepth === undefined || depth < existingDepth) {
    symbolDepths.set(symbol, depth);
  }

  // ... rest of traversal
}
```

## Integration

### Used By

- [[AnalyzeChainsCommand]]: Analyzes dependency chains
- [[TypeChainCommand]]: Type dependency traversal
- [[SymbolGraphBuilder]]: Graph construction
- SymbolSearchEngine: Path finding

### Depends On

- Symbol graph data structure
- Dependency relationship data

## Performance

### Time Complexity

- **Best case**: O(V + E) where V = vertices, E = edges
- **Worst case**: O(V + E) (visits each node and edge once)
- **Cycle detection**: O(1) per edge (state check)

### Space Complexity

- O(V) for visit state map
- O(D) for recursion stack (D = max depth)
- O(V) for result storage

### Optimization

```typescript
// Early termination on max depth
if (depth > MAX_DEPTH) {
  return; // Stop traversing deeper
}

// Skip already visited with shorter path
if (symbolDepths.has(symbol) &&
    symbolDepths.get(symbol)! <= depth) {
  return; // Already found shorter path
}
```

## Testing

```typescript
describe('DepthTraverser', () => {
  it('detects circular dependencies', () => {
    const getDeps = (s: string) => {
      if (s === 'A') return ['B'];
      if (s === 'B') return ['C'];
      if (s === 'C') return ['A']; // Circular!
      return [];
    };

    const result = traverser.traverse('A', getDeps);
    expect(result.cycles.length).toBe(1);
    expect(result.cycles[0].cycle).toEqual(['A', 'B', 'C']);
  });

  it('tracks maximum depth', () => {
    const getDeps = (s: string) => {
      if (s === 'A') return ['B'];
      if (s === 'B') return ['C'];
      if (s === 'C') return ['D'];
      return [];
    };

    const result = traverser.traverse('A', getDeps);
    expect(result.maxDepth).toBe(3);
  });

  it('finds all complete chains', () => {
    const getDeps = (s: string) => {
      if (s === 'Root') return ['A', 'B'];
      if (s === 'A') return ['C'];
      return [];
    };

    const result = traverser.traverse('Root', getDeps);
    expect(result.chains.length).toBe(2);
    // ['Root', 'A', 'C'] and ['Root', 'B']
  });
});
```

## Related

- [[SymbolGraphBuilder]]: Builds graphs for traversal
- [[AnalyzeChainsCommand]]: Uses traverser for chain analysis
- [[TypeChainCommand]]: Type-specific traversal
- SymbolSearchEngine: Graph search algorithms

## See Also

- Depth-first search (DFS) algorithm
- Circular dependency detection
- Graph traversal patterns
- Dependency analysis techniques

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:242
- [[TreeCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/TreeCommand.md:122
- [[SymbolGraphFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/symbol-graph.md:71
- [[SymbolGraphFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/symbol-graph.md:169
- [[SymbolGraphFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/symbol-graph.md:191
- [[SymbolGraphBuilder]] → /Users/junwoobang/workflow/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:97

