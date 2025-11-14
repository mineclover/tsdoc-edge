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
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:434
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:435
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:436
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:437
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:438
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:93
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:177
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:226
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:227
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:228
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:229
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:211
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:283
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:284
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:223
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:257
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:359
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:360
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:361
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:362
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:31
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:138
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:409
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:410
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:411
- [[TSDoc Edge System Architecture]] → /home/user/tsdoc-edge/managed/architecture/system-architecture-2025-11-07.md:412
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:53
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:113
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:114
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:115
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:116
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:117
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:118
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:119
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:120
- [[DepsCommand]] → /home/user/tsdoc-edge/managed/commands/DepsCommand.md:151
- [[DepsCommand]] → /home/user/tsdoc-edge/managed/commands/DepsCommand.md:152
- [[DepsCommand]] → /home/user/tsdoc-edge/managed/commands/DepsCommand.md:153
- [[DepsCommand]] → /home/user/tsdoc-edge/managed/commands/DepsCommand.md:154
- [[StatsCommand]] → /home/user/tsdoc-edge/managed/commands/StatsCommand.md:46
- [[StatsCommand]] → /home/user/tsdoc-edge/managed/commands/StatsCommand.md:192
- [[StatsCommand]] → /home/user/tsdoc-edge/managed/commands/StatsCommand.md:193
- [[StatsCommand]] → /home/user/tsdoc-edge/managed/commands/StatsCommand.md:194
- [[StatsCommand]] → /home/user/tsdoc-edge/managed/commands/StatsCommand.md:195
- [[UndocumentedCommand]] → /home/user/tsdoc-edge/managed/commands/UndocumentedCommand.md:43
- [[UndocumentedCommand]] → /home/user/tsdoc-edge/managed/commands/UndocumentedCommand.md:155
- [[UndocumentedCommand]] → /home/user/tsdoc-edge/managed/commands/UndocumentedCommand.md:156
- [[UntestedCommand]] → /home/user/tsdoc-edge/managed/commands/UntestedCommand.md:48
- [[UntestedCommand]] → /home/user/tsdoc-edge/managed/commands/UntestedCommand.md:174
- [[UntestedCommand]] → /home/user/tsdoc-edge/managed/commands/UntestedCommand.md:175
- [[UsedByCommand]] → /home/user/tsdoc-edge/managed/commands/UsedByCommand.md:94
- [[UsedByCommand]] → /home/user/tsdoc-edge/managed/commands/UsedByCommand.md:150
- [[UsedByCommand]] → /home/user/tsdoc-edge/managed/commands/UsedByCommand.md:151
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:45
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:115
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:158
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:159
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:160
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:161
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:162
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:163
- [[WhoUsesCommand]] → /home/user/tsdoc-edge/managed/commands/WhoUsesCommand.md:164
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:50
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:108
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:109
- [[Unified Relationship Taxonomy]] → /home/user/tsdoc-edge/managed/concepts/unified-relationship-taxonomy.md:392
- [[Unified Relationship Taxonomy]] → /home/user/tsdoc-edge/managed/concepts/unified-relationship-taxonomy.md:479
- [[Unified Relationship Taxonomy]] → /home/user/tsdoc-edge/managed/concepts/unified-relationship-taxonomy.md:480
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:47
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:48
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:49
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:50
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:51
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:52
- [[QueryCommands]] → /home/user/tsdoc-edge/managed/features/QueryCommands.md:83
- [[QueryCommands]] → /home/user/tsdoc-edge/managed/features/QueryCommands.md:130
- [[QueryCommands]] → /home/user/tsdoc-edge/managed/features/QueryCommands.md:131
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:152
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:174
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:181
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:195
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:202
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:209
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:216
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:338
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:339
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:340
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:341
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:342
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:343
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:344
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:345
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:346
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:347
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:348
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:349
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:350
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:351
- [[Context Quality Improvements]] → /home/user/tsdoc-edge/managed/features/context-quality-improvements.md:199
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:75
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:86
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:95
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:130
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:136
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:202
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:203
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:204
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:205
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:206
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:207
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:208
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:209
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:210
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:211
- [[Gephi Export]] → /home/user/tsdoc-edge/managed/features/gephi-export.md:13
- [[Gephi Export]] → /home/user/tsdoc-edge/managed/features/gephi-export.md:115
- [[Relationship Path]] → /home/user/tsdoc-edge/managed/features/relationship-path.md:13
- [[Relationship Path]] → /home/user/tsdoc-edge/managed/features/relationship-path.md:125
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:35
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:45
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:124
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:134
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:143
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:160
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:242
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:302
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:303
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:304
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:305
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:306
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:307
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:308
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:309
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:310
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:311
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:312
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:313
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:314
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:315
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:111
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:269
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:270
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:39
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:131
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:248
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:300
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:301
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:302
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:303
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:304
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:305
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:34
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:222
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:372
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:455
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:456
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:457
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:458
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:459
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:460
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:157
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:212
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:213
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:214
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:215
- [[EnhancedSymbolDoc]] → /home/user/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:216
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:33
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:145
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:184
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:219
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:220
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:221
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:222
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:223
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:224
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:20
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:77
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:78
- [[Relationship Standard Format]] → /home/user/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:169
- [[Relationship Standard Format]] → /home/user/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:214
- [[Relationship Standard Format]] → /home/user/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:215
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:19
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:89
- [[Code Dependency]] → /home/user/tsdoc-edge/managed/relationships/code-dependency.md:90
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:23
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:31
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:39
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:49
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:57
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:64
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:73
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:81
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:88
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:97
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:116
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:124
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:144
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:176
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:270
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:271
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:272
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:273
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:274
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:275
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:276
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:277
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:278
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:279
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:280
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:281
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:282
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:283
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:284
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:285
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:286
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:287
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:288
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:289
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:290
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:291
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:20
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:89
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:90
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:220
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:296
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:297
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:298
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:299
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:300
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:301
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:302
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:303
- [[RegistryTypes]] → /home/user/tsdoc-edge/managed/types/RegistryTypes.md:96
- [[RegistryTypes]] → /home/user/tsdoc-edge/managed/types/RegistryTypes.md:105
- [[RegistryTypes]] → /home/user/tsdoc-edge/managed/types/RegistryTypes.md:106
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:108
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:109
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:110
- [[UnifiedRelationships]] → /home/user/tsdoc-edge/managed/types/UnifiedRelationships.md:138
- [[UnifiedRelationships]] → /home/user/tsdoc-edge/managed/types/UnifiedRelationships.md:139
- [[UnifiedRelationships]] → /home/user/tsdoc-edge/managed/types/UnifiedRelationships.md:140
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:145
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:146
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:147
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:108
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:109
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:110

