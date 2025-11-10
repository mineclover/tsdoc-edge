---
title: SymbolRegistryManager
type: storage
category: core
status: active
canonical: true
aliases: [RegistryManager]
---

# [[SymbolRegistryManager]]

> **Manages symbol ID registry** stored in JSONL with hierarchy tracking and dependency management

Also known as: **RegistryManager**

## Purpose

Provides persistent storage and CRUD operations for symbol ID-to-source mappings with automatic hierarchy tracking.

**Problem**: Need persistent mapping between auto-generated IDs ("001", "002") and source code locations, with parent-child relationships and dependency tracking.

**Solution**: JSONL-based registry with automatic qualified name generation, depth calculation, and integrity validation.

**Responsibility**: Manage symbol ID registry stored in JSONL with hierarchy tracking and relationship management.

## Input

### Constructor Parameters

- `registryPath: string` - Path to `registry.jsonl` file
  - **Typical**: `.tsdoc/registry.jsonl`
  - **Constraint**: Must be writable directory
  - **Auto-create**: Creates file if doesn't exist

### register() Parameters

- `sourceRef: SourceRef` - Source location and metadata
  ```typescript
  {
    filePath: string;         // File path
    symbolName: string;       // Symbol name
    type: string;             // 'class' | 'function' | 'interface' | etc.
    memberOf?: string;        // Parent symbol ID (for hierarchy)
    memberType?: 'static' | 'instance' | 'inner';
    qualifiedName?: string;   // Auto-generated if missing
    depth?: number;           // Auto-calculated if missing
  }
  ```

- `tags?: string[]` - Classification tags (e.g., `['model', 'api']`)
- `notes?: string` - Optional developer notes

## Output

### register() Return Value

`string` - Generated or existing symbol ID (e.g., `"001"`, `"002"`)

**Behavior**:
- If symbol already exists → Returns existing ID (idempotent)
- If new symbol → Generates new ID and registers

### findById() Return Value

`SymbolRegistryEntry | undefined`:
```typescript
{
  id: string;              // Symbol ID
  sourceRef: SourceRef;    // Source location (enriched)
  createdAt: string;       // ISO 8601 timestamp
  updatedAt: string;       // ISO 8601 timestamp
  tags?: string[];         // Classification tags
  notes?: string;          // Developer notes
  uses?: DependencyRelation[]; // Outgoing dependencies
}
```

### Enriched SourceRef

Auto-generated fields:
```typescript
{
  qualifiedName: "ClassName#method",  // JSDoc convention
  depth: 1                            // 0=top-level, 1=method, 2+=nested
}
```

## Context

### Dependencies

- `IdGenerator` (`src/utils/IdGenerator.ts`) - Sequential ID generation
- Node.js `fs` module - File I/O
- `SymbolRegistry` types (`src/types/registry.ts`)

### Environment

- Node.js ≥ 16.x
- File system access (read/write)
- UTF-8 encoding support

### Storage Format

**JSONL (JSON Lines)**:
```
{"version":"1.0.0","idGeneratorMode":"sequential","nextSequentialId":"015","totalEntries":14,"lastUpdated":"2025-11-09T..."}
{"id":"001","sourceRef":{...},"createdAt":"...","updatedAt":"..."}
{"id":"002","sourceRef":{...},"createdAt":"...","updatedAt":"..."}
```

**Why JSONL**:
- ✅ Line-by-line parsing (streaming)
- ✅ Git-friendly (line-level diffs)
- ✅ Append-friendly (no full rewrite needed)
- ✅ Human-readable

## Logic

### Algorithm

**Symbol Registration Flow**:

1. **Check Existence**
   ```typescript
   const existing = findBySourceRef(sourceRef);
   if (existing) return existing.id;  // Idempotent
   ```

2. **Generate ID**
   ```typescript
   const id = idGenerator.generate();  // "015"
   ```

3. **Enrich SourceRef**
   - Calculate `depth` from parent hierarchy
   - Generate `qualifiedName` using JSDoc convention
   ```typescript
   depth = memberOf ? 1 + parent.depth : 0
   qualifiedName = parent ? `${parent.qualifiedName}#${name}` : name
   ```

4. **Create Entry**
   ```typescript
   entry = { id, sourceRef: enriched, createdAt, updatedAt, tags, notes }
   ```

5. **Append to Registry**
   ```typescript
   registry.entries.push(entry);
   ```

### Qualified Name Generation

**JSDoc Convention**:
```
ClassName            → top-level class
ClassName#method     → instance method
ClassName.static     → static method
ClassName~inner      → inner function
```

**Separator Rules**:
- `#` - Instance member
- `.` - Static member
- `~` - Inner/private member

**Examples**:
```typescript
register({ filePath: 'User.ts', symbolName: 'User', type: 'class' })
// → id: "001", qualifiedName: "User", depth: 0

register({
  filePath: 'User.ts',
  symbolName: 'save',
  type: 'method',
  memberOf: '001',
  memberType: 'instance'
})
// → id: "002", qualifiedName: "User#save", depth: 1

register({
  filePath: 'User.ts',
  symbolName: 'fromJSON',
  type: 'method',
  memberOf: '001',
  memberType: 'static'
})
// → id: "003", qualifiedName: "User.fromJSON", depth: 1
```

### Hierarchy Tracking

**Parent-Child Relationships**:
```
001: User (depth 0)
  ├─ 002: User#save (depth 1)
  ├─ 003: User.fromJSON (depth 1)
  └─ 004: User#validate (depth 1)
       └─ 005: User#validate~checkEmail (depth 2)
```

**APIs**:
- `getChildren(parentId)` - Direct children
- `getDescendants(parentId)` - All descendants (recursive)
- `buildHierarchy()` - Full tree structure

### Dependency Management

**Add Dependency**:
```typescript
addDependency(
  fromId: "002",          // User#save
  toId: "006",            // Database
  reason: "persists user",
  type: "runtime"
)
```

**Query Dependencies**:
```typescript
getDependencies("002")    // → What User#save uses
getUsedBy("006")          // → Who uses Database
getDependencyGraph()      // → Full adjacency list
detectDependencyCycles()  // → Circular dependencies
```

### Performance

- **register()**: O(n) where n = registry size (linear search for duplicates)
- **findById()**: O(n) linear search
- **save()**: O(n) full write
- **load()**: O(n) line-by-line parsing
- **Typical**: ~1ms for 1,000 entries

**Optimization**: For large registries (10,000+ symbols), consider:
- In-memory index (Map<id, entry>)
- Binary search on sorted IDs
- Lazy loading with pagination

## Effect

### Side Effects

**File System**:
- **save()**: Writes `registry.jsonl` (overwrites)
- **register()**: Modifies in-memory registry (call `save()` to persist)

**State Changes**:
- In-memory `registry.entries` array mutated
- `IdGenerator` state updated

### I/O Operations

- **Read**: `load()` reads JSONL file on construction
- **Write**: `save()` writes full JSONL file
- **Console**: None

### Persistence

**Manual save required**:
```typescript
const manager = new SymbolRegistryManager('.tsdoc/registry.jsonl');

manager.register({ filePath: 'User.ts', symbolName: 'User', type: 'class' });
manager.register({ filePath: 'Post.ts', symbolName: 'Post', type: 'class' });

manager.save();  // 💾 Persist to disk
```

## Scope

### Public API

```typescript
class SymbolRegistryManager {
  // Registration
  register(sourceRef: SourceRef, tags?: string[], notes?: string): string;
  updateSourceRef(id: string, newSourceRef: SourceRef): boolean;
  delete(id: string): boolean;

  // Lookup
  findById(id: string): SymbolRegistryEntry | undefined;
  findBySourceRef(sourceRef: SourceRef, includeType?: boolean): SymbolRegistryEntry | undefined;
  findByQualifiedName(qualifiedName: string): SymbolRegistryEntry | undefined;
  findByNamePattern(pattern: string | RegExp): SymbolRegistryEntry[];

  // Queries
  getAll(): SymbolRegistryEntry[];
  getByFile(filePath: string): SymbolRegistryEntry[];
  getByTag(tag: string): SymbolRegistryEntry[];

  // Hierarchy
  getChildren(parentId: string): SymbolRegistryEntry[];
  getDescendants(parentId: string): SymbolRegistryEntry[];
  buildHierarchy(): Array<SymbolRegistryEntry & { children?: SymbolRegistryEntry[] }>;

  // Dependencies
  addDependency(fromId: string, toId: string, reason: string, type?: 'runtime' | 'type-only' | 'dev'): boolean;
  getDependencies(id: string): DependencyRelation[];
  getUsedBy(id: string): Array<{ fromId: string; reason: string; type?: string }>;
  getDependencyGraph(): Map<string, string[]>;
  detectDependencyCycles(): string[][];

  // Analysis
  findOrphans(): string[];
  findDuplicateQualifiedNames(): Array<{ qualifiedName: string; entries: SymbolRegistryEntry[] }>;
  detectMoved(symbolName: string, type?: string): SymbolRegistryEntry[];
  detectPotentialRenames(filePath: string, type: string): SymbolRegistryEntry[];

  // Integrity
  validateIntegrity(): { isValid: boolean; errors: string[]; warnings: string[] };

  // Statistics
  getStats(): {
    totalEntries: number;
    fileCount: number;
    tagCount: number;
    totalDependencies: number;
    orphanCount: number;
    duplicateQualifiedNames: number;
  };

  // Persistence
  save(): void;

  // Search
  search(query: string): SymbolRegistryEntry[];
}
```

### Private Methods

```typescript
private load(): SymbolRegistry;
private enrichSourceRef(sourceRef: SourceRef): SourceRef;
private calculateDepth(sourceRef: SourceRef): number;
private generateQualifiedName(sourceRef: SourceRef): string;
```

### API Stability

- **Stable**: All public methods (production-ready)
- **Deprecated**: None
- **Planned**: Indexing for O(1) lookups, caching

## Use Cases

### 1. Symbol Registration During Build

```typescript
const manager = new SymbolRegistryManager('.tsdoc/registry.jsonl');

// Extract symbols from TypeScript
const symbols = extractSymbols('src/**/*.ts');

for (const symbol of symbols) {
  const id = manager.register({
    filePath: symbol.filePath,
    symbolName: symbol.name,
    type: symbol.kind,
    memberOf: symbol.parentId,
    memberType: symbol.memberType
  }, symbol.tags);

  console.log(`Registered ${symbol.name} → ${id}`);
}

manager.save();  // Persist to disk
```

### 2. Dependency Tracking

```typescript
// Track code dependencies
manager.addDependency(
  "002",                    // User#save
  "015",                    // Database
  "persists user to DB",
  "runtime"
);

// Query reverse dependencies
const whoUsesDB = manager.getUsedBy("015");
console.log(`Database is used by ${whoUsesDB.length} symbols`);
```

### 3. Circular Dependency Detection

```typescript
const cycles = manager.detectDependencyCycles();

if (cycles.length > 0) {
  console.error(`Found ${cycles.length} circular dependencies:`);
  cycles.forEach(cycle => {
    console.error(`  ${cycle.join(' → ')}`);
  });
}
```

### 4. Orphan Detection

```typescript
const orphans = manager.findOrphans();

if (orphans.length > 0) {
  console.warn(`Found ${orphans.length} orphaned symbols (unused, no dependencies):`);
  orphans.forEach(id => {
    const entry = manager.findById(id);
    console.warn(`  ${entry.sourceRef.qualifiedName} (${entry.sourceRef.filePath})`);
  });
}
```

### 5. Integrity Validation

```typescript
const validation = manager.validateIntegrity();

if (!validation.isValid) {
  console.error('❌ Registry has errors:');
  validation.errors.forEach(err => console.error(`  - ${err}`));
}

if (validation.warnings.length > 0) {
  console.warn('⚠️  Registry has warnings:');
  validation.warnings.forEach(warn => console.warn(`  - ${warn}`));
}
```

## Registry File Format

### Metadata Line (Line 1)

```json
{
  "version": "1.0.0",
  "idGeneratorMode": "sequential",
  "nextSequentialId": "015",
  "totalEntries": 14,
  "lastUpdated": "2025-11-09T12:34:56.789Z"
}
```

### Entry Lines (Lines 2+)

```json
{
  "id": "001",
  "sourceRef": {
    "filePath": "src/commands/BuildCommand.ts",
    "symbolName": "BuildCommand",
    "type": "class",
    "qualifiedName": "BuildCommand",
    "depth": 0
  },
  "createdAt": "2025-11-08T10:00:00.000Z",
  "updatedAt": "2025-11-09T12:00:00.000Z",
  "tags": ["command", "core"],
  "notes": "Primary build command",
  "uses": [
    {
      "targetId": "012",
      "reason": "extracts symbols from source",
      "type": "runtime"
    }
  ]
}
```

## Related

- [[DatabaseManager]] (`../core-components/DatabaseManager.md`) - SQLite storage for symbols
- [[IdGenerator]] - Sequential ID generation
- [[SymbolGraphBuilder]] - In-memory symbol graph
- [[BuildCommand]] - Primary consumer of registry
- [[Enhanced Database Schema]] - Extended schema with relationships

## Comparison: SymbolRegistryManager vs DatabaseManager

| Aspect | SymbolRegistryManager | DatabaseManager |
|--------|----------------------|-----------------|
| **Storage** | JSONL file | SQLite database |
| **Format** | JSON Lines | SQL tables |
| **Queries** | Linear search | Indexed SQL |
| **Relationships** | Dependency arrays | Foreign keys |
| **Performance** | O(n) | O(log n) |
| **Git-friendly** | ✅ Line diffs | ❌ Binary |
| **Size limit** | ~10K symbols | Millions |
| **Use case** | Small projects | Large projects |

**Recommendation**: Use SymbolRegistryManager for prototyping and small projects. Migrate to DatabaseManager for production and large codebases.

## Source

**Location**: `src/storage/SymbolRegistryManager.ts`

**Tests**: `src/__tests__/SymbolRegistryManager.test.ts`, `src/__tests__/storage/SymbolRegistryManager.test.ts`

## Management

Features:
- Registry serialization
- Version control friendly
- Incremental updates

## Symbol Count

34 symbols (largest utility file)

## Status

**Current**: Active, production-ready
**Performance**: Suitable for <10K symbols
**Version**: v1.0

---

**Last Updated**: 2025-11-09
**Symbol Count**: 14 (in this project's registry)
**Registry Path**: `.tsdoc/registry.jsonl`
