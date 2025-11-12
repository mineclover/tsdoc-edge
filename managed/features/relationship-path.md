# [[Relationship Path]]

## Purpose

Find connection paths between any two symbols in the codebase through relationship traversal.

Enables **dependency analysis**, **impact assessment**, and **architectural understanding** by revealing how symbols are connected through chains of relationships.

## Context

- **입력**: 두 개의 심볼 ID (from_symbol, to_symbol)
- **출력**: 연결 경로 목록 (최단 경로 우선)
- **의존성**: [[DatabaseManager]], unified_relationships 테이블
- **구현**: Source: src/commands/RelationshipPathCommand.ts
- **관련 명령어**: [[Commands Index]]

## Features

### 1. Optimized Path Finding

**Performance Improvement**: 30+ seconds → ~250ms

**Optimization Strategy**:
1. **Adjacency List Pre-building**: Query all relationships once (166ms)
2. **Memory-Safe BFS**: Breadth-first search with iteration limits
3. **Early Termination**: Stop on first path for shortest-only mode
4. **Deduplication**: Track visited nodes to prevent cycles

### 2. Search Options

| Option | Description | Default |
|--------|-------------|---------|
| `--max-length <n>` | Maximum path length | 5 |
| `--limit <n>` | Maximum paths to return | 10 |
| `--category <cat>` | Filter by category | all |
| `--shortest-only` | Show only shortest paths | false |

### 3. Path Information

Each path includes:
- **Length**: Number of hops between symbols
- **Relationships**: Type and category of each edge
- **Symbol Chain**: Full sequence of symbols in path
- **Evidence**: Confidence scores for each relationship

## Usage

### Basic Usage

```bash
# Find any paths between two symbols
tsdoc-edge relationship-path class-buildcommand class-databasemanager

# Find shortest paths only
tsdoc-edge relationship-path class-buildcommand class-databasemanager --shortest-only

# Limit path length
tsdoc-edge relationship-path class-buildcommand class-databasemanager --max-length 3

# Filter by category
tsdoc-edge relationship-path class-buildcommand class-databasemanager --category structural
```

### Use Cases

#### 1. Dependency Impact Analysis

```bash
# "If I change Symbol A, what symbols might be affected?"
tsdoc-edge relationship-path class-a class-z --limit 20
```

#### 2. Shortest Dependency Chain

```bash
# "What's the most direct connection between A and B?"
tsdoc-edge relationship-path interface-config class-server --shortest-only
```

#### 3. Architectural Understanding

```bash
# "How do frontend components connect to backend services?"
tsdoc-edge relationship-path component-userprofile service-authservice
```

#### 4. Refactoring Safety

```bash
# "What's the blast radius if I refactor this module?"
tsdoc-edge relationship-path module-auth module-payments --max-length 4
```

## Implementation

### Core Algorithm: Memory-Safe BFS

**File**: src/commands/RelationshipPathCommand.ts:227-347

#### Step 1: Build Adjacency List

```typescript
private buildAdjacencyList(
  dbManager: DatabaseManager,
  category?: string
): Map<string, GraphEdge[]> {
  // Query ALL relationships once (no per-iteration queries)
  const sql = 'SELECT from_symbols, to_symbols, type, category FROM unified_relationships';
  const relationships = dbManager.db.prepare(sql).all();

  // Build in-memory graph structure
  const adjacency = new Map<string, GraphEdge[]>();
  for (const rel of relationships) {
    const fromSymbols = JSON.parse(rel.from_symbols);
    const toSymbols = JSON.parse(rel.to_symbols);

    for (const from of fromSymbols) {
      if (!adjacency.has(from)) {
        adjacency.set(from, []);
      }
      for (const to of toSymbols) {
        adjacency.get(from)!.push({
          to,
          type: rel.type,
          category: rel.category,
        });
      }
    }
  }

  return adjacency;
}
```

**Performance**: ~166ms for 2,210 nodes

#### Step 2: BFS with Safety Limits

```typescript
private findPaths(
  adjacency: Map<string, GraphEdge[]>,
  start: string,
  end: string,
  maxLength: number,
  maxPaths: number
): Path[] {
  const queue: QueueItem[] = [{ symbol: start, path: [], depth: 0 }];
  const allPaths: Path[] = [];
  const visited = new Set<string>();

  // Safety limits
  const maxIterations = 50000;
  let iterations = 0;

  while (queue.length > 0 && iterations < maxIterations && allPaths.length < maxPaths) {
    iterations++;

    const item = queue.shift()!;

    // Found target
    if (item.symbol === end) {
      allPaths.push({ steps: item.path, length: item.depth });
      continue;
    }

    // Max depth reached
    if (item.depth >= maxLength) continue;

    // Explore neighbors
    const edges = adjacency.get(item.symbol) || [];
    for (const edge of edges) {
      if (!visited.has(edge.to)) {
        queue.push({
          symbol: edge.to,
          path: [...item.path, { from: item.symbol, to: edge.to, type: edge.type }],
          depth: item.depth + 1
        });
      }
    }

    visited.add(item.symbol);
  }

  return allPaths;
}
```

**Performance**: ~250ms for typical searches

### Memory Safety

**Problem**: Large graphs can cause OOM (Out of Memory)

**Solution**: Hard limits on search space
- Maximum 100 paths returned
- Maximum 50,000 iterations
- Maximum depth configurable (default: 5)

**Result**: Predictable memory usage, no crashes

## Performance

### Benchmarks

**Test Environment**: TSDoc Edge codebase (2,213 nodes)

| Metric | Value |
|--------|-------|
| Graph build time | 166ms |
| Typical search time | ~250ms |
| Max memory usage | ~50MB |
| Scalability | O(V + E) |

### Performance Comparison

| Implementation | Time | Result |
|----------------|------|--------|
| Original (per-query SQL) | 30+ seconds | Timeout |
| Optimized (adjacency list) | ~250ms | ✅ Success |

**Speedup**: **~120x faster**

## Related Features

- **Export Command**: Source: src/commands/RelationshipExportCommand.ts (Gephi export)
- **Visualize Command**: Source: src/commands/RelationshipVisualizeCommand.ts (Mermaid/DOT)
- [[DatabaseManager]]: 데이터베이스 관리
- [[UnifiedRelationship]]: 관계 데이터 모델

## Decisions

### Why BFS over DFS?

1. **Shortest Paths First**: BFS finds shortest paths before longer ones
2. **Predictable**: BFS explores level-by-level, easier to limit depth
3. **Memory Pattern**: Queue-based, easier to implement limits

### Why Adjacency List?

1. **O(1) Neighbor Lookup**: No database query per node
2. **Memory Efficient**: Only stores edges, not full graph matrix
3. **Cache Friendly**: Sequential memory access patterns

### Why Hard Limits?

1. **Stability**: Prevents OOM crashes on large graphs
2. **Predictability**: Consistent performance across codebases
3. **User Control**: Configurable limits via CLI options

## Traps

### ⚠️ Circular Dependencies

**Problem**: Cycles in relationships can cause infinite loops

**Solution**: Track visited nodes to prevent revisiting
```typescript
const visited = new Set<string>();
if (!visited.has(edge.to)) {
  queue.push(/* ... */);
}
visited.add(item.symbol);
```

### ⚠️ Large Result Sets

**Problem**: Some symbol pairs may have hundreds of paths

**Solution**: Use `--limit` to cap results
```bash
# Only show first 5 paths
tsdoc-edge relationship-path A B --limit 5
```

### ⚠️ Deep Paths

**Problem**: Deep paths (>10 hops) may not be meaningful

**Solution**: Use `--max-length` to focus on direct connections
```bash
# Only show paths with 3 or fewer hops
tsdoc-edge relationship-path A B --max-length 3
```

## Future Enhancements

1. **Bidirectional BFS**: Search from both ends simultaneously (2x faster)
2. **Weighted Paths**: Consider relationship confidence scores
3. **Path Ranking**: Rank paths by architectural significance
4. **Interactive Mode**: Step through paths interactively
5. **Visualization**: Generate path diagrams (Mermaid/DOT)
6. **Multi-Target**: Find paths to multiple targets at once

## Examples

### Example 1: Simple Path

```bash
$ tsdoc-edge relationship-path class-buildcommand class-databasemanager --shortest-only

Found 1 path from class-buildcommand to class-databasemanager:

Path 1 (length: 2):
  class-buildcommand
    --[composition]-->
  class-symbolgraphbuilder
    --[composition]-->
  class-databasemanager
```

### Example 2: Multiple Paths

```bash
$ tsdoc-edge relationship-path interface-config class-server --limit 3

Found 3 paths from interface-config to class-server:

Path 1 (length: 2):
  interface-config
    --[type-dependency]-->
  class-configloader
    --[calls]-->
  class-server

Path 2 (length: 3):
  interface-config
    --[type-dependency]-->
  class-application
    --[composition]-->
  class-servicemanager
    --[calls]-->
  class-server

Path 3 (length: 3):
  interface-config
    --[type-dependency]-->
  class-configvalidator
    --[calls]-->
  class-logger
    --[calls]-->
  class-server
```

## Links

- [[Commands Index]] - Full command reference
- [[Gephi Export]] - Graph visualization
- [[UnifiedRelationship]] - Relationship data model
