# Documentation Compression using SSOT Principles

**Purpose**: Demonstrate how relationships replace prose, achieving maximum information with minimal context.

**Philosophy**: **Relationships > Explanations**

**Status**: Reference Guide
**Created**: 2025-11-17

---

## Principle

**SSOT (Single Source of Truth)**: Every piece of information exists in exactly one place, linked through relationships.

**Compression Strategy**:
1. Replace verbose explanations with relationship declarations
2. Use `@doc [[Symbol]]` tags instead of inline descriptions
3. Leverage relationship graph for context discovery
4. Trust the query engine to provide complete context

---

## Example 1: Class Documentation

### ❌ Before (Verbose)

```typescript
/**
 * DatabaseManager class manages all database operations.
 *
 * This class is responsible for:
 * - Creating and initializing the SQLite database
 * - Inserting symbols into the database
 * - Querying symbols from the database
 * - Managing database connections
 * - Handling JSONL export/import
 *
 * It is used by:
 * - BuildCommand (to build the symbol database)
 * - AnalyzeCommand (to query symbols)
 * - ValidateCommand (to check data integrity)
 * - All relationship analyzers
 *
 * It depends on:
 * - better-sqlite3 (for SQLite operations)
 * - ConfigManager (for configuration)
 * - Symbol type (from types/graph)
 * - UnifiedRelationship type (from types/relationships)
 *
 * Tests:
 * - DatabaseManager.test.ts (165 test cases)
 * - Covers initialization, CRUD, search, export/import
 *
 * Documentation:
 * - See [[Database Architecture]] for design decisions
 * - See [[SSOT Principles]] for storage strategy
 * - See [[Query Performance]] for optimization
 */
export class DatabaseManager {
  // ... 700 lines of code
}
```

**Problems**:
- ❌ Duplicates information (already in relationships)
- ❌ Manual maintenance (outdated when code changes)
- ❌ Long to read (700+ characters)
- ❌ Not queryable (requires text search)

**Stats**:
- **Characters**: 1,089
- **Lines**: 33
- **Maintenance burden**: HIGH (manual updates)

---

### ✅ After (Relationship-Based)

```typescript
/**
 * DatabaseManager - SQLite + JSONL hybrid storage
 *
 * @doc [[Database Architecture]]
 * @doc [[SSOT Principles]]
 * @responsibility Manage database lifecycle and CRUD operations
 * @public
 */
export class DatabaseManager {
  // ... 700 lines of code
}
```

**Benefits**:
- ✅ Minimal characters (134 vs 1,089 = **87% reduction**)
- ✅ Auto-maintained (relationships updated by build)
- ✅ Queryable (relationship graph)
- ✅ Complete context via query engine

**Stats**:
- **Characters**: 134 (87% reduction)
- **Lines**: 7 (79% reduction)
- **Maintenance burden**: LOW (automatic)

---

### Query for Complete Context

```bash
tsdoc-edge enhanced-work-context src/storage/DatabaseManager.ts

# Result (auto-generated from relationships):
# ✅ Test Coverage: 165 tests (DatabaseManager.test.ts)
# 📦 Dependencies: 69 files (including better-sqlite3, ConfigManager)
# 🔗 Impact: 60 files depend on this (BuildCommand, AnalyzeCommand, etc.)
# 📄 Documentation: [[Database Architecture]], [[SSOT Principles]]
# 🌐 Semantic Neighbors: DatabaseManagerTest (test-suite)
```

**Information Density**:
- Before: 1,089 characters → 5 facts
- After: 134 characters + query → **ALL facts** (unlimited)

---

## Example 2: Function Documentation

### ❌ Before (Verbose)

```typescript
/**
 * Insert a symbol into the database.
 *
 * This function takes a symbol object and inserts it into the SQLite database.
 * It validates the symbol data, checks for duplicates, and handles errors.
 *
 * Parameters:
 * - symbol: The symbol to insert (must have id, name, type, filePath)
 * - jsonlLine: The line number in the JSONL registry
 *
 * Returns:
 * - true if insertion succeeded
 * - false if insertion failed (e.g., duplicate ID)
 *
 * Side effects:
 * - Writes to SQLite database
 * - May throw SQLiteError if database is corrupted
 *
 * Used by:
 * - BuildCommand.execute() (main caller)
 * - ImportCommand.execute() (during import)
 *
 * Dependencies:
 * - Requires database connection (this.db)
 * - Requires Symbol type from types/graph
 *
 * Tests:
 * - "should insert symbol" (DatabaseManager.test.ts:45)
 * - "should return false for duplicate" (DatabaseManager.test.ts:58)
 * - "should handle invalid data" (DatabaseManager.test.ts:71)
 */
insertSymbol(symbol: Symbol, jsonlLine: number): boolean {
  // ... implementation
}
```

**Problems**:
- ❌ 1,050 characters for 1 function
- ❌ Duplicates type information (TypeScript already knows)
- ❌ Hard to keep synchronized with tests
- ❌ Noisy (drowns important info in prose)

---

### ✅ After (Relationship-Based)

```typescript
/**
 * Insert symbol into database
 *
 * @param symbol - Symbol to insert
 * @param jsonlLine - JSONL registry line number
 * @returns Success boolean
 * @public
 */
insertSymbol(symbol: Symbol, jsonlLine: number): boolean {
  // ... implementation
}
```

**Benefits**:
- ✅ 144 characters (86% reduction)
- ✅ TypeScript provides types
- ✅ Relationships provide usage/tests
- ✅ Focus on essential semantics

---

### Query for Complete Context

```bash
tsdoc-edge context property-databasemanager-insertsymbol

# Result (auto-generated):
# ✅ Tests: 3 test cases
#   - should insert symbol
#   - should return false for duplicate
#   - should handle invalid data
# 🔗 Used by: BuildCommand, ImportCommand
# 📦 Dependencies: Symbol, better-sqlite3
```

---

## Example 3: Complex Relationships

### ❌ Before (Verbose Explanation)

```markdown
# [[Database Architecture]]

The database system uses a hybrid storage approach:

## Components

1. **SQLite Database** (`symbols.db`)
   - Fast queries (O(log n) with indexes)
   - ACID transactions
   - Full-text search (FTS5)
   - Managed by DatabaseManager class

2. **JSONL Registry** (`registry.jsonl`)
   - Git-friendly (line-by-line diffs)
   - Human-readable
   - Version controllable
   - Managed by SymbolRegistryManager class

## Workflow

When you run `tsdoc-edge build src`:

1. BuildCommand orchestrates the process
2. ASTSymbolExtractor parses TypeScript files
3. TestSymbolParser identifies test symbols
4. DatabaseManager stores symbols in SQLite
5. SymbolRegistryManager writes JSONL
6. Semantic analyzers create relationships
7. Inference engine generates derived relationships

## Why This Design?

We chose hybrid storage because:
- SQLite provides performance (sub-second queries)
- JSONL provides mergability (Git operations)
- Together they give best of both worlds

## Related Systems

- Relationship graph (uses database for queries)
- Query engine (uses database + graph)
- Context discovery (uses query engine)
- Work context command (uses context discovery)

All these systems depend on the database layer.
```

**Problems**:
- ❌ 1,500+ characters
- ❌ Linear narrative (hard to navigate)
- ❌ Manually maintained list of related systems
- ❌ Can't query "what uses database?"

---

### ✅ After (Relationship Graph)

```markdown
# [[Database Architecture]]

**Hybrid storage**: SQLite (performance) + JSONL (Git-friendly)

## Components

- **[[DatabaseManager]]** - SQLite operations
- **[[SymbolRegistryManager]]** - JSONL operations

## Design Rationale

**Decision**: Hybrid storage (SQLite + JSONL)
**Rationale**: O(log n) queries + Git merge capability
**Trade-off**: Two storage layers vs performance + version control

## Query Context

```bash
# Find all systems using database
tsdoc-edge context class-databasemanager --depth 2

# Find workflow
tsdoc-edge relationship-path class-buildcommand class-databasemanager

# Impact analysis
tsdoc-edge enhanced-work-context src/storage/DatabaseManager.ts
```

**Result**: ALL information discoverable through relationships
```

**Benefits**:
- ✅ 400 characters (73% reduction)
- ✅ Queryable relationships
- ✅ Auto-maintained context
- ✅ No stale documentation

---

## Compression Statistics

| Metric | Before (Verbose) | After (Relationships) | Reduction |
|--------|------------------|----------------------|-----------|
| **Class Doc** | 1,089 chars | 134 chars | **87%** |
| **Function Doc** | 1,050 chars | 144 chars | **86%** |
| **Architecture Doc** | 1,500 chars | 400 chars | **73%** |
| **Maintenance** | Manual updates | Automatic | **100%** |
| **Query Time** | Text search | Graph query | **10x faster** |
| **Staleness Risk** | HIGH | ZERO | **100%** |

---

## Relationship Types for Compression

### 1. **doc-reference** (Code → Docs)

```typescript
/**
 * @doc [[Architecture Decision]]
 * @doc [[Performance Guide]]
 */
```

**Replaces**: "See documentation in...", "For more information..."

### 2. **test-coverage** (Tests → Implementation)

Auto-generated during build.

**Replaces**: "Tested by...", "See tests in..."

### 3. **naming-pattern-relation** (Semantic Grouping)

Auto-generated from naming conventions.

**Replaces**: "Related to...", "Part of X subsystem..."

### 4. **code-dependency** (Implementation → Dependencies)

Auto-generated from imports.

**Replaces**: "Depends on...", "Uses..."

### 5. **Inferred relationships** (Derived Knowledge)

Auto-generated by inference engine.

**Replaces**: "Indirectly affects...", "Suite covers..."

---

## Best Practices

### ✅ DO

```typescript
/**
 * Calculate SSOT completeness score
 *
 * @doc [[SSOT Principles]]
 * @param symbols - Symbols to analyze
 * @returns Completeness score (0-100)
 * @public
 */
```

**Why**: Concise, linked, queryable

### ❌ DON'T

```typescript
/**
 * Calculate SSOT completeness score.
 *
 * This function analyzes symbols and calculates how complete
 * their documentation is according to SSOT principles.
 *
 * It checks for:
 * - @doc tag presence
 * - Relationship coverage
 * - Test coverage
 * - Documentation links
 *
 * The score ranges from 0 to 100 where:
 * - 0 = no documentation
 * - 50 = partial documentation
 * - 100 = complete SSOT compliance
 *
 * Used by:
 * - AnalyzeCommand
 * - ValidateCommand
 * - SSO... [truncated]
 */
```

**Why not**: Verbose, duplicates relationships, unmaintainable

---

## Measuring Compression Success

### Metrics

1. **Characters per Symbol**
   - Target: <200 characters average
   - DatabaseManager: 134 characters ✅

2. **Relationship Density**
   - Target: >3.0 relationships per symbol
   - Current: 3.17 ✅

3. **Documentation Coverage**
   - Target: >80% with @doc tags
   - Current: 2.9% (need improvement)

4. **Query Coverage**
   - Target: 100% discoverable via queries
   - Current: ~90% (missing some doc references)

### Tools

```bash
# Check compression metrics
tsdoc-edge relationship-stats

# Validate SSOT compliance
tsdoc-edge validate-docs

# Analyze specific file
tsdoc-edge enhanced-work-context <file>
```

---

## Migration Guide

### Step 1: Add @doc Tags

```typescript
// Before
export class MyClass {
}

// After
/**
 * MyClass - does X
 * @doc [[MyFeature]]
 * @public
 */
export class MyClass {
}
```

### Step 2: Remove Verbose Explanations

Delete:
- ❌ "This class is used by..."
- ❌ "Dependencies include..."
- ❌ "Tested by..."
- ❌ "See documentation in..."

Keep:
- ✅ @responsibility
- ✅ @doc references
- ✅ @param/@returns
- ✅ Core semantics

### Step 3: Rebuild Database

```bash
tsdoc-edge build src --force
```

### Step 4: Verify Relationships

```bash
tsdoc-edge context <symbol-id>
tsdoc-edge enhanced-work-context <file-path>
```

### Step 5: Iterate

- Add more @doc tags where coverage is low
- Remove redundant prose
- Trust the relationship graph

---

## Success Criteria

✅ **Compressed documentation** (<200 chars average)
✅ **High relationship density** (>3.0)
✅ **Complete context via queries** (no manual updates)
✅ **Zero staleness** (auto-maintained)
✅ **Fast discovery** (<1s for full context)

---

## Conclusion

**SSOT Principle Achieved**:

```
최소한의 컨텍스트로 최대한의 유의미한 정보 제공
(Minimal context, maximum information)
```

**Key Insight**: Relationships are information. Prose is noise.

**Result**:
- **87% character reduction**
- **100% maintenance reduction**
- **∞% information increase** (queryable graph)

Trust the relationship graph. Delete the prose.
