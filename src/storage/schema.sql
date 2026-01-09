-- TSDoc Edge SQLite Schema
-- Purpose: Indexing and search optimization for symbol documentation
-- Data source: JSONL files (Git-tracked)

-- Symbols table: Core symbol information
CREATE TABLE IF NOT EXISTS symbols (
    id TEXT PRIMARY KEY,
    -- Stable identifier system (optional for backwards compatibility)
    uuid TEXT UNIQUE,
    local_path TEXT,
    global_path TEXT,
    scope TEXT,
    -- Core symbol info
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- function, class, interface, constant, variable, etc.
    file_path TEXT NOT NULL,
    line INTEGER NOT NULL,
    column INTEGER NOT NULL,
    is_exported BOOLEAN NOT NULL,
    is_public BOOLEAN NOT NULL,
    summary TEXT,
    -- Type information
    declared_type TEXT, -- Declared type annotation (return type for functions/methods)
    inferred_type TEXT, -- TypeScript inferred type
    generic_params TEXT, -- JSON array of generic parameters
    parameter_types TEXT, -- JSON array of parameter types [{name, type}]
    -- Constant/Value information
    is_constant BOOLEAN DEFAULT 0, -- true for const declarations
    literal_value TEXT, -- Literal value for constants
    value_type TEXT, -- Type of literal value (string, number, boolean, etc.)
    -- Exposure and visibility tracking
    exposure_scope TEXT, -- JSON: {level, boundaries, exportedVia}
    exposure_level TEXT, -- public, package, module, file, private
    export_path TEXT, -- Actual import path (@pkg/module/subpath)
    accessibility TEXT, -- public, protected, private, internal
    visibility_boundaries TEXT, -- JSON: {canBeImportedBy, restrictedTo, reason}
    -- Metadata
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version TEXT NOT NULL,
    jsonl_line INTEGER NOT NULL -- Line number in JSONL file for quick lookup
);

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

-- Dependencies table (denormalized for querying) - Legacy, will migrate to unified_relationships
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

-- Unified relationships table (17 relationship types)
CREATE TABLE IF NOT EXISTS unified_relationships (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,  -- 17 types: code-dependency, inheritance, io-dependency, etc.
    category TEXT NOT NULL,  -- 7 categories: structural, data-flow, behavioral, etc.

    -- Participants (JSON arrays for multi-party relationships)
    from_symbols TEXT NOT NULL,  -- JSON: ["symbol-id"] or ["id1", "id2", ...]
    to_symbols TEXT NOT NULL,    -- JSON: ["symbol-id"] or ["id1", "id2", ...]

    -- Properties
    direction TEXT NOT NULL,  -- unidirectional, bidirectional, undirected
    strength TEXT NOT NULL,   -- strong, medium, weak

    -- Evidence (JSON array)
    evidence TEXT NOT NULL,  -- JSON: [{"type": "code", "source": "file.ts", "lineNumber": 42, "confidence": 1.0}]

    discovered_by TEXT NOT NULL,  -- static-analysis, type-inference, test-analysis, etc.
    confidence REAL NOT NULL,     -- 0-1

    -- Location
    file_path TEXT,
    line INTEGER,

    -- Type-specific properties (JSON)
    properties TEXT,  -- JSON: {"dataType": "User", "producerMethod": "getUser"}

    -- Inheritance-specific fields
    abstraction_from TEXT, -- concrete, abstract, interface, mixin
    abstraction_to TEXT,
    hierarchy_depth INTEGER, -- 0 = direct, 1+ = transitive
    inheritance_chain TEXT, -- JSON array: ["Child", "Parent", "GrandParent"]
    overridden_members TEXT, -- JSON array: ["method1", "method2"]

    -- Metadata
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    description TEXT
);

CREATE INDEX IF NOT EXISTS idx_ur_type ON unified_relationships(type);
CREATE INDEX IF NOT EXISTS idx_ur_category ON unified_relationships(category);
CREATE INDEX IF NOT EXISTS idx_ur_strength ON unified_relationships(strength);
CREATE INDEX IF NOT EXISTS idx_ur_confidence ON unified_relationships(confidence);
CREATE INDEX IF NOT EXISTS idx_ur_from_first ON unified_relationships(json_extract(from_symbols, '$[0]'));
CREATE INDEX IF NOT EXISTS idx_ur_to_first ON unified_relationships(json_extract(to_symbols, '$[0]'));

-- Relationship symbols join table for fast O(1) lookups
-- Replaces expensive LIKE '%symbolId%' queries with indexed JOIN
CREATE TABLE IF NOT EXISTS relationship_symbols (
    relationship_id TEXT NOT NULL,
    symbol_id TEXT NOT NULL,
    role TEXT NOT NULL,  -- 'from' or 'to'
    PRIMARY KEY (relationship_id, symbol_id, role),
    FOREIGN KEY (relationship_id) REFERENCES unified_relationships(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rs_symbol ON relationship_symbols(symbol_id);
CREATE INDEX IF NOT EXISTS idx_rs_symbol_role ON relationship_symbols(symbol_id, role);

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
CREATE INDEX IF NOT EXISTS idx_symbols_uuid ON symbols(uuid);
CREATE INDEX IF NOT EXISTS idx_symbols_local_path ON symbols(local_path);
CREATE INDEX IF NOT EXISTS idx_symbols_global_path ON symbols(global_path);
CREATE INDEX IF NOT EXISTS idx_symbols_scope ON symbols(scope);
CREATE INDEX IF NOT EXISTS idx_symbols_exposure ON symbols(exposure_level);
CREATE INDEX IF NOT EXISTS idx_symbols_accessibility ON symbols(accessibility);

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

-- Tasks table for project management
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,
    priority TEXT NOT NULL,
    type TEXT NOT NULL,
    assigned_to TEXT,
    symbol_id TEXT,
    file_path TEXT,
    line INTEGER,
    estimated_hours REAL,
    actual_hours REAL,
    due_date TEXT,
    parent_id TEXT,
    dependencies TEXT,  -- JSON array
    tags TEXT,          -- JSON array
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_symbol ON tasks(symbol_id);
CREATE INDEX IF NOT EXISTS idx_tasks_file ON tasks(file_path);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);

-- HTTP Endpoints table (for API route tracking)
CREATE TABLE IF NOT EXISTS endpoints (
    id TEXT PRIMARY KEY,
    method TEXT NOT NULL, -- GET, POST, PUT, DELETE, PATCH
    path TEXT NOT NULL, -- /api/users/:id
    path_params TEXT, -- JSON array: ["id"]
    query_params TEXT, -- JSON array: ["limit", "offset"]
    handler_symbol_id TEXT, -- Handler function symbol ID
    controller_symbol_id TEXT, -- Controller class symbol ID (if applicable)
    request_type TEXT, -- DTO type for request body
    response_type TEXT, -- DTO type for response
    scope TEXT NOT NULL, -- public, internal, private, admin
    middlewares TEXT, -- JSON array of middleware symbol IDs
    file_path TEXT NOT NULL,
    line INTEGER,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (handler_symbol_id) REFERENCES symbols(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_endpoints_path ON endpoints(path);
CREATE INDEX IF NOT EXISTS idx_endpoints_method ON endpoints(method);
CREATE INDEX IF NOT EXISTS idx_endpoints_scope ON endpoints(scope);
CREATE INDEX IF NOT EXISTS idx_endpoints_handler ON endpoints(handler_symbol_id);

-- Code Blocks table (for block-level chunking)
CREATE TABLE IF NOT EXISTS code_blocks (
    id TEXT PRIMARY KEY,
    symbol_id TEXT NOT NULL, -- Parent symbol ID
    type TEXT NOT NULL, -- validation, transformation, query, mutation, etc.
    start_line INTEGER NOT NULL,
    end_line INTEGER NOT NULL,
    purpose TEXT, -- Description of what this block does
    dependencies TEXT, -- JSON array of symbol IDs used in this block
    side_effects TEXT, -- JSON array: [{type, target, description}]
    scope TEXT, -- local, closure, module
    complexity INTEGER, -- Cyclomatic complexity (optional)
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (symbol_id) REFERENCES symbols(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_blocks_symbol ON code_blocks(symbol_id);
CREATE INDEX IF NOT EXISTS idx_blocks_type ON code_blocks(type);
CREATE INDEX IF NOT EXISTS idx_blocks_lines ON code_blocks(start_line, end_line);
