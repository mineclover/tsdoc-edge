---
title: Database Manager
type: core-component
category: storage
status: active
canonical: true
source: src/storage/DatabaseManager.ts
---

# [[DatabaseManager]]

> **Component**: Core Storage | **Category**: Data Layer | **Type**: Database Management

Manage SQLite database operations and JSONL synchronization for fast local lookups with Git-friendly version control.

## Purpose

**Problem**: Need fast local symbol lookups while maintaining Git-friendly version control of documentation data
**Solution**: Hybrid storage strategy: SQLite for performance, JSONL for Git compatibility and human readability
**Context**: CLI tools need sub-second query responses, but team collaboration requires mergeable text-based storage

## Implementation

**Source**: `src/storage/DatabaseManager.ts`

**Class**: `DatabaseManager`
- Constructor: `(dbPath?: string, jsonlPath?: string)`
- Dependencies: `better-sqlite3`, [[ConfigManager]]

**Key Methods**:
```typescript
// Schema Management
initSchema(): void

// Symbol CRUD
insertSymbol(symbol: Symbol): void
getSymbol(id: string): Symbol | undefined
getAllSymbols(): Symbol[]
updateSymbol(id: string, updates: Partial<Symbol>): void

// Enhanced Documentation
insertEnhancedDoc(doc: EnhancedSymbolDoc): void
getEnhancedDoc(symbolId: string): EnhancedSymbolDoc | undefined

// Relationships
insertRelationship(relationship: UnifiedRelationship): void
getRelationships(symbolId: string, type?: string): UnifiedRelationship[]

// Full-Text Search
searchSymbols(query: string): Symbol[]
searchDocs(query: string): EnhancedSymbolDoc[]

// JSONL Sync
exportToJSONL(): void
importFromJSONL(): void

// Statistics
getStats(): DatabaseStats
```

## Architecture

### Hybrid Storage Strategy

**SQLite** (`.tsdoc/symbols.db`):
- **Purpose**: Fast queries (O(log n) lookups)
- **Use**: Runtime queries, CLI commands
- **Benefits**: FTS5 full-text search, indexing, transactions

**JSONL** (`.tsdoc/registry.jsonl`):
- **Purpose**: Version control, human readability
- **Use**: Git commits, diffs, merges
- **Benefits**: Line-by-line format, mergeable, inspectable

**Synchronization**:
```
Build → SQLite (write) → JSONL export
Git pull → JSONL → SQLite import
```

### Database Schema

**Symbols Table**:
```sql
CREATE TABLE symbols (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  line INTEGER,
  column INTEGER,
  is_exported INTEGER DEFAULT 0,
  is_public INTEGER DEFAULT 0,
  summary TEXT,
  UNIQUE(name, file_path, line)
);

CREATE INDEX idx_symbols_name ON symbols(name);
CREATE INDEX idx_symbols_file ON symbols(file_path);
CREATE INDEX idx_symbols_type ON symbols(type);
```

**Enhanced Docs Table**:
```sql
CREATE TABLE enhanced_docs (
  symbol_id TEXT PRIMARY KEY,
  problem_solving TEXT,
  functionality TEXT,
  error_experiences TEXT,
  decisions TEXT,
  dependencies TEXT,
  future_plans TEXT,
  created_at TEXT,
  updated_at TEXT,
  version TEXT,
  FOREIGN KEY (symbol_id) REFERENCES symbols(id)
);
```

**Unified Relationships Table**:
```sql
CREATE TABLE unified_relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  type TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_id, target_id, type)
);

CREATE INDEX idx_relationships_source ON unified_relationships(source_id);
CREATE INDEX idx_relationships_target ON unified_relationships(target_id);
CREATE INDEX idx_relationships_type ON unified_relationships(type);
```

**Full-Text Search** (FTS5):
```sql
CREATE VIRTUAL TABLE symbols_fts USING fts5(
  id UNINDEXED,
  name,
  summary,
  content='symbols',
  content_rowid='rowid'
);
```

## Data Structures

**SymbolRow**:
```typescript
interface SymbolRow {
  id: string;
  name: string;
  type: string;              // class | function | interface | etc.
  file_path: string;
  line: number;
  column: number;
  is_exported: number;       // 0 or 1
  is_public: number;         // 0 or 1
  summary: string | null;
}
```

**EnhancedDocRow**:
```typescript
interface EnhancedDocRow {
  symbol_id: string;
  problem_solving: string;   // JSON array
  functionality: string;     // JSON array
  error_experiences: string; // JSON array
  decisions: string;         // JSON array
  dependencies: string;      // JSON array
  future_plans: string;      // JSON array
  created_at: string;
  updated_at: string;
  version: string;
}
```

## Functionality

### 1. Schema Management
- Automatic table creation on first run
- Index creation for fast lookups
- FTS5 setup for full-text search
- Schema migrations (future)

### 2. CRUD Operations
**Insert**:
```typescript
db.insertSymbol({
  id: 'class-buildcommand',
  name: 'BuildCommand',
  type: 'class',
  filePath: 'src/commands/BuildCommand.ts',
  lineNumber: 15
});
```

**Query**:
```typescript
const symbol = db.getSymbol('class-buildcommand');
const all = db.getAllSymbols();
const byFile = db.getSymbolsByFile('src/commands/BuildCommand.ts');
```

**Update**:
```typescript
db.updateSymbol('class-buildcommand', {
  summary: 'Updated summary'
});
```

### 3. Full-Text Search
**Symbol Search**:
```typescript
const results = db.searchSymbols('buildcommand');
// Returns: Symbols matching query
```

**Documentation Search**:
```typescript
const docs = db.searchDocs('extract symbols');
// Returns: Enhanced docs containing phrase
```

### 4. JSONL Synchronization
**Export** (After build):
```typescript
db.exportToJSONL();
// Writes to .tsdoc/registry.jsonl
```

**Import** (After git pull):
```typescript
db.importFromJSONL();
// Reads from .tsdoc/registry.jsonl
```

**Format**:
```jsonl
{"id":"class-buildcommand","name":"BuildCommand","type":"class",...}
{"id":"function-analyze","name":"analyze","type":"function",...}
```

### 5. Statistics Tracking
```typescript
const stats = db.getStats();
// {
//   totalSymbols: 1511,
//   byType: { class: 120, function: 850, ... },
//   totalRelationships: 36050,
//   byRelType: { 'code-dependency': 1968, ... }
// }
```

## Usage

**Initialization**:
```typescript
import { DatabaseManager } from './storage/DatabaseManager';

const db = new DatabaseManager();
// Auto-creates .tsdoc/symbols.db with schema
```

**Via Commands**:
```bash
# Build populates database
tsdoc-edge build src

# Commands query database
tsdoc-edge deps BuildCommand
tsdoc-edge who-uses DatabaseManager
tsdoc-edge search "symbol extraction"

# Export to JSONL
tsdoc-edge export-registry

# Import from JSONL
tsdoc-edge import-registry
```

## Integration

**Used By** (All Commands):
- [[BuildCommand]] - Stores extracted symbols
- [[DepsCommand]] - Queries dependencies
- [[WhoUsesCommand]] - Queries reverse dependencies
- [[StatsCommand]] - Database statistics
- All analyzers - Store relationships
- (Planned: Full-text search command)

**Uses**:
- `better-sqlite3` - Synchronous SQLite driver
- [[ConfigManager]] (`src/config/ConfigManager.ts`) - Configuration paths
- [[SymbolRegistryManager]] (`src/storage/SymbolRegistryManager.ts`) - JSONL operations

**Stores**:
- [[Symbol]] (`src/types/graph.ts`) - All symbols
- [[EnhancedSymbolDoc]] (`src/types/tags.ts`) - Documentation
- [[UnifiedRelationships]] (`src/types/relationships.ts`) - All relationships

## Performance

**Query Performance**:
- Symbol lookup by ID: O(log n) with B-tree index
- Symbol lookup by name: O(log n) with index
- Full-text search: O(n) with FTS5 optimization
- Relationship query: O(log n) with composite index

**Typical Operations**:
- Insert 1,511 symbols: ~100ms
- Query single symbol: <1ms
- Full-text search: ~10-50ms
- Export to JSONL: ~50ms
- Import from JSONL: ~100ms

**Storage Size**:
- SQLite DB: ~2-5 MB (1,511 symbols)
- JSONL: ~1-3 MB (line-oriented)
- Total: ~3-8 MB for full codebase

## Design Decisions

**Decision**: Use SQLite + JSONL hybrid instead of pure JSON or pure SQL
**Rationale**:
- SQLite provides O(log n) lookups and FTS5 search
- JSONL enables Git diff/merge and human inspection
**Consequences**:
- ✅ Best of both worlds (performance + version control)
- ⚠️ Two storage layers to maintain
- ⚠️ Sync overhead on export/import

**Decision**: Synchronous SQLite (better-sqlite3) instead of async
**Rationale**: CLI tools benefit from synchronous execution, simpler code
**Consequences**:
- ✅ Simpler code flow
- ✅ Better performance for CLI workloads
- ⚠️ Blocks event loop (not suitable for web servers)

## Limitations

**Current**:
- No schema migrations
- No transactions exposed to callers
- No query optimization hints
- Single database file (no sharding)

**Future Enhancements**:
- Schema migration framework
- Transaction API
- Query builder
- Performance profiling
- Multiple database support

## Related

**Storage**:
- [[SymbolRegistryManager]] (`src/storage/SymbolRegistryManager.ts`) - JSONL operations

**Core**:
- [[SymbolGraphBuilder]] (`src/graph/SymbolGraphBuilder.ts`) - Graph construction
- [[SymbolSearchEngine]] (`src/graph/SymbolSearchEngine.ts`) - Search

**Commands**:
- [[BuildCommand]] (`src/commands/BuildCommand.ts`) - Populates DB
- [[DepsCommand]] (`src/commands/DepsCommand.ts`) - Queries DB
- (Planned: SearchCommand for full-text search)

**Analyzers**:
- All analyzers store relationships in DB

---

**Last Updated**: 2025-11-08
**Responsibility**: Manage SQLite database operations and JSONL synchronization
**Status**: ✅ Active - Stores 1,511 symbols and 36,050+ relationships

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:36
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:79
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:111
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:192
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:197
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:93
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:177
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:210
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:211
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:211
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:272
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:223
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:257
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:317
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:318
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:31
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:138
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:398
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:399
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:53
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:92
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:93
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:94
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:95
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:96
- [[DepsCommand]] → /home/user/tsdoc-edge/managed/commands/DepsCommand.md:139
- [[DepsCommand]] → /home/user/tsdoc-edge/managed/commands/DepsCommand.md:140
- [[StatsCommand]] → /home/user/tsdoc-edge/managed/commands/StatsCommand.md:46
- [[StatsCommand]] → /home/user/tsdoc-edge/managed/commands/StatsCommand.md:180
- [[StatsCommand]] → /home/user/tsdoc-edge/managed/commands/StatsCommand.md:181
- [[UndocumentedCommand]] → /home/user/tsdoc-edge/managed/commands/UndocumentedCommand.md:43
- [[UndocumentedCommand]] → /home/user/tsdoc-edge/managed/commands/UndocumentedCommand.md:148
- [[UntestedCommand]] → /home/user/tsdoc-edge/managed/commands/UntestedCommand.md:48
- [[UntestedCommand]] → /home/user/tsdoc-edge/managed/commands/UntestedCommand.md:166
- [[UsedByCommand]] → /home/user/tsdoc-edge/managed/commands/UsedByCommand.md:94
- [[UsedByCommand]] → /home/user/tsdoc-edge/managed/commands/UsedByCommand.md:143
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:45
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:115
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:148
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:149
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:150
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:151
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:50
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:91
- [[Unified Relationship Taxonomy]] → /home/user/tsdoc-edge/managed/concepts/unified-relationship-taxonomy.md:392
- [[Unified Relationship Taxonomy]] → /home/user/tsdoc-edge/managed/concepts/unified-relationship-taxonomy.md:476
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:41
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:42
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:43
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:44
- [[QueryCommands]] → /home/user/tsdoc-edge/managed/features/QueryCommands.md:83
- [[QueryCommands]] → /home/user/tsdoc-edge/managed/features/QueryCommands.md:129
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:152
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:174
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:181
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:195
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:202
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:209
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:216
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:305
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:306
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:307
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:308
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:309
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:310
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:311
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:75
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:86
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:95
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:130
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:136
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:183
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:184
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:185
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:186
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:187
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:35
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:45
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:124
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:134
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:143
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:160
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:242
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:281
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:282
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:283
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:284
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:285
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:286
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:287
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:111
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:250
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:39
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:131
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:248
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:286
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:287
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:288
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:27
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:148
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:284
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:337
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:338
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:339
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:157
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:209
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:210
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:211
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:33
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:145
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:184
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:211
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:212
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:213
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:20
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:65
- [[Relationship Standard Format]] → /home/user/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:169
- [[Relationship Standard Format]] → /home/user/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:211
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:19
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:72
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:19
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:27
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:35
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:45
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:53
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:66
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:84
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:103
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:111
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:131
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:157
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:218
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:219
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:220
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:221
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:222
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:223
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:224
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:225
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:226
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:227
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:228
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:20
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:78
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:220
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:286
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:287
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:288
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:289
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:290
- [[RegistryTypes]] → /home/user/tsdoc-edge/managed/types/RegistryTypes.md:96
- [[RegistryTypes]] → /home/user/tsdoc-edge/managed/types/RegistryTypes.md:105
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:96
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:97
- [[UnifiedRelationships]] → /home/user/tsdoc-edge/managed/types/UnifiedRelationships.md:133
- [[UnifiedRelationships]] → /home/user/tsdoc-edge/managed/types/UnifiedRelationships.md:134
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:126
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:127
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:103
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:104

