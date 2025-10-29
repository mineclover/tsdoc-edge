-- TSDoc Edge SQLite Schema
-- Purpose: Indexing and search optimization for symbol documentation
-- Data source: JSONL files (Git-tracked)

-- Symbols table: Core symbol information
CREATE TABLE IF NOT EXISTS symbols (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- function, class, interface, etc.
    file_path TEXT NOT NULL,
    line INTEGER NOT NULL,
    column INTEGER NOT NULL,
    is_exported BOOLEAN NOT NULL,
    is_public BOOLEAN NOT NULL,
    summary TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version TEXT NOT NULL,
    jsonl_line INTEGER NOT NULL -- Line number in JSONL file for quick lookup
);

-- Full-text search index for symbols
CREATE VIRTUAL TABLE IF NOT EXISTS symbols_fts USING fts5(
    id,
    name,
    summary,
    content='symbols',
    content_rowid='rowid'
);

-- Triggers to keep FTS index in sync
CREATE TRIGGER IF NOT EXISTS symbols_ai AFTER INSERT ON symbols BEGIN
    INSERT INTO symbols_fts(rowid, id, name, summary)
    VALUES (new.rowid, new.id, new.name, new.summary);
END;

CREATE TRIGGER IF NOT EXISTS symbols_ad AFTER DELETE ON symbols BEGIN
    DELETE FROM symbols_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER IF NOT EXISTS symbols_au AFTER UPDATE ON symbols BEGIN
    UPDATE symbols_fts SET
        id = new.id,
        name = new.name,
        summary = new.summary
    WHERE rowid = new.rowid;
END;

-- Enhanced documentation table (Strict Mode)
CREATE TABLE IF NOT EXISTS enhanced_docs (
    symbol_id TEXT PRIMARY KEY,
    problem_solving TEXT NOT NULL, -- JSON string
    functionality TEXT NOT NULL, -- JSON string
    error_experiences TEXT NOT NULL, -- JSON array
    decisions TEXT NOT NULL, -- JSON array
    dependencies TEXT NOT NULL, -- JSON array
    future_plans TEXT NOT NULL, -- JSON array
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version TEXT NOT NULL,
    jsonl_line INTEGER NOT NULL,
    FOREIGN KEY (symbol_id) REFERENCES symbols(id) ON DELETE CASCADE
);

-- Full-text search for enhanced documentation
CREATE VIRTUAL TABLE IF NOT EXISTS enhanced_docs_fts USING fts5(
    symbol_id,
    problem_content,
    functionality_content,
    error_content,
    decision_content,
    content='enhanced_docs',
    content_rowid='rowid'
);

-- Error experiences table (denormalized for querying)
CREATE TABLE IF NOT EXISTS error_experiences (
    id TEXT PRIMARY KEY,
    symbol_id TEXT NOT NULL,
    error_type TEXT NOT NULL,
    message TEXT NOT NULL,
    context TEXT NOT NULL,
    solution TEXT NOT NULL,
    occurred_at TEXT,
    prevention TEXT,
    FOREIGN KEY (symbol_id) REFERENCES symbols(id) ON DELETE CASCADE
);

-- Decision records table (denormalized for querying)
CREATE TABLE IF NOT EXISTS decision_records (
    id TEXT PRIMARY KEY,
    symbol_id TEXT,
    title TEXT NOT NULL,
    decision TEXT NOT NULL,
    rationale TEXT NOT NULL,
    status TEXT NOT NULL,
    date TEXT NOT NULL,
    superseded_by TEXT,
    FOREIGN KEY (symbol_id) REFERENCES symbols(id) ON DELETE SET NULL
);

-- Future plans table (denormalized for querying)
CREATE TABLE IF NOT EXISTS future_plans (
    id TEXT PRIMARY KEY,
    symbol_id TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL,
    status TEXT NOT NULL,
    target_milestone TEXT,
    estimated_effort TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    FOREIGN KEY (symbol_id) REFERENCES symbols(id) ON DELETE SET NULL
);

-- Dependencies table (denormalized for querying)
CREATE TABLE IF NOT EXISTS dependencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol_id TEXT NOT NULL,
    target TEXT NOT NULL,
    type TEXT NOT NULL,
    reason TEXT NOT NULL,
    version TEXT,
    is_optional BOOLEAN DEFAULT 0,
    import_path TEXT,
    FOREIGN KEY (symbol_id) REFERENCES symbols(id) ON DELETE CASCADE
);

-- Test mappings table
CREATE TABLE IF NOT EXISTS test_mappings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol_id TEXT NOT NULL,
    test_file_path TEXT NOT NULL,
    test_name TEXT NOT NULL,
    scenarios TEXT NOT NULL, -- JSON array
    coverage TEXT, -- JSON object
    FOREIGN KEY (symbol_id) REFERENCES symbols(id) ON DELETE CASCADE
);

-- Contracts table
CREATE TABLE IF NOT EXISTS contracts (
    symbol_id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    preconditions TEXT NOT NULL, -- JSON array
    postconditions TEXT NOT NULL, -- JSON array
    invariants TEXT NOT NULL, -- JSON array
    file_path TEXT NOT NULL,
    FOREIGN KEY (symbol_id) REFERENCES symbols(id) ON DELETE CASCADE
);

-- Responsibilities table
CREATE TABLE IF NOT EXISTS responsibilities (
    symbol_id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    should_do TEXT NOT NULL, -- JSON array
    should_not_do TEXT NOT NULL, -- JSON array
    pattern TEXT,
    architecture TEXT,
    FOREIGN KEY (symbol_id) REFERENCES symbols(id) ON DELETE CASCADE
);

-- Indexing rules table (metadata for search optimization)
CREATE TABLE IF NOT EXISTS indexing_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_name TEXT NOT NULL UNIQUE,
    rule_type TEXT NOT NULL, -- fts, btree, hash
    target_table TEXT NOT NULL,
    target_columns TEXT NOT NULL, -- JSON array
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at TEXT NOT NULL,
    description TEXT
);

-- JSONL sync metadata (track sync status)
CREATE TABLE IF NOT EXISTS sync_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT NOT NULL UNIQUE,
    last_sync TEXT NOT NULL,
    total_records INTEGER NOT NULL,
    hash TEXT NOT NULL, -- File content hash for change detection
    status TEXT NOT NULL -- synced, modified, error
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_symbols_name ON symbols(name);
CREATE INDEX IF NOT EXISTS idx_symbols_type ON symbols(type);
CREATE INDEX IF NOT EXISTS idx_symbols_file ON symbols(file_path);
CREATE INDEX IF NOT EXISTS idx_symbols_public ON symbols(is_public);

CREATE INDEX IF NOT EXISTS idx_errors_symbol ON error_experiences(symbol_id);
CREATE INDEX IF NOT EXISTS idx_errors_type ON error_experiences(error_type);

CREATE INDEX IF NOT EXISTS idx_decisions_symbol ON decision_records(symbol_id);
CREATE INDEX IF NOT EXISTS idx_decisions_status ON decision_records(status);

CREATE INDEX IF NOT EXISTS idx_plans_symbol ON future_plans(symbol_id);
CREATE INDEX IF NOT EXISTS idx_plans_status ON future_plans(status);
CREATE INDEX IF NOT EXISTS idx_plans_priority ON future_plans(priority);

CREATE INDEX IF NOT EXISTS idx_dependencies_symbol ON dependencies(symbol_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_target ON dependencies(target);

CREATE INDEX IF NOT EXISTS idx_tests_symbol ON test_mappings(symbol_id);
CREATE INDEX IF NOT EXISTS idx_tests_file ON test_mappings(test_file_path);
