/**
 * SQLite database manager for TSDoc Edge
 * @packageDocumentation
 * @responsibility Manage SQLite database operations and JSONL synchronization
 * @architecture Data Layer - Database Management
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import { ConfigManager } from '../config/ConfigManager';
import type { Symbol } from '../types/graph';
import type { EnhancedSymbolDoc } from '../types/tags';
import type { UnifiedRelationship } from '../types/relationships/unified';

// SQLite row types
/**
 * SymbolRow interface
 * @public
 */
interface SymbolRow {
  id: string;
  name: string;
  type: string;
  file_path: string;
  line: number;
  column: number;
  is_exported: number;
  is_public: number;
  summary: string | null;
}

/**
 * EnhancedDocRow interface
 * @public
 */
interface EnhancedDocRow {
  symbol_id: string;
  problem_solving: string;
  functionality: string;
  error_experiences: string;
  decisions: string;
  dependencies: string;
  future_plans: string;
  created_at: string;
  updated_at: string;
  version: string;
}

/**
 * Database manager for symbol and documentation storage
 *
 * @id 002
 * @public
 * @responsibility Manage SQLite database operations and JSONL synchronization
 * @contract Manage database lifecycle and provide CRUD operations
 * @precondition Database file path must be valid
 * @postcondition Database is initialized with schema
 * @testScenario Database initialization with schema
 * @testScenario Symbol insertion and retrieval
 * @testScenario Enhanced documentation storage
 * @testScenario Full-text search
 * @testScenario JSONL export and import
 * @testScenario Statistics tracking
 *
 * @problem Need fast local symbol lookups while maintaining Git-friendly version control of documentation data
 * @solves Hybrid storage strategy: SQLite for performance, JSONL for Git compatibility and human readability
 * @context CLI tools need sub-second query responses, but team collaboration requires mergeable text-based storage
 *
 * @functionality
 * - Schema management: Automatic table creation with indexes for fast lookups
 * - CRUD operations: Insert, update, retrieve symbols and enhanced docs
 * - Full-text search: SQLite FTS5 for fast documentation search
 * - JSONL sync: Bidirectional export/import for version control
 * - Statistics tracking: Query execution metrics and database statistics
 * - Coverage integration: Store and retrieve test coverage data
 *
 * @decision Use SQLite + JSONL hybrid instead of pure JSON or pure SQL
 * @rationale SQLite provides O(log n) lookups and FTS5 search, JSONL enables Git diff/merge and human inspection
 * @consequences Two storage layers to maintain, but gains both performance and version control benefits
 *
 * @depends better-sqlite3, ConfigManager
 * @depType external, internal
 * @depReason High-performance synchronous SQLite driver, configuration paths
 * @requires ConfigManager
 */
export class DatabaseManager {
  /**
   * db property
   * @public
   */
  public readonly db: Database.Database;
  private dbPath: string;
  private jsonlPath: string;

  /**
   * Create a new DatabaseManager
   * @param dbPath - Path to SQLite database file (optional, defaults to config)
   * @param jsonlPath - Path to JSONL data directory (optional, defaults to config)
   * @contract Initialize database with schema
   */
  constructor(dbPath?: string, jsonlPath?: string) {
    // Use provided paths or get from config
    if (dbPath && jsonlPath) {
      this.dbPath = dbPath;
      this.jsonlPath = jsonlPath;
    } else {
      const configManager = ConfigManager.getInstance();
      const config = configManager.get();
      this.dbPath = configManager.resolvePath(config.paths.databasePath);
      this.jsonlPath = configManager.resolvePath(config.paths.jsonlDir);
    }

    // Ensure directories exist
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    if (!fs.existsSync(this.jsonlPath)) {
      fs.mkdirSync(this.jsonlPath, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.initializeSchema();
  }

  /**
   * Initialize database schema
   * @precondition Database connection is established
   * @postcondition All tables and indexes are created
   */
  private initializeSchema(): void {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Execute the entire schema at once
    // SQLite can handle multiple statements in a single exec() call
    try {
      this.db.exec(schema);
      /**
       * error
       * @public
       */
    } catch (error) {
      // If the schema is already initialized, ignore the error
      // This happens when opening an existing database
      console.warn('Schema initialization warning:', error);
    }
  }

  /**
   * Insert a symbol into the database
   * @param symbol - Symbol to insert
   * @param jsonlLine - Line number in JSONL file
   * @returns True if successful
   * @precondition Symbol ID must be unique
   * @postcondition Symbol is indexed and searchable
   */
  insertSymbol(symbol: Symbol, jsonlLine: number): boolean {
    const symbolAny = symbol as any; // ExtractedSymbol may have additional fields

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO symbols (
        id, name, type, file_path, line, column,
        is_exported, is_public, summary,
        declared_type, inferred_type, generic_params, parameter_types,
        is_constant, literal_value, value_type,
        created_at, updated_at, version, jsonl_line
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(
        symbol.id,
        symbol.name,
        symbol.type,
        symbol.filePath,
        symbol.line,
        symbol.column,
        symbol.isExported ? 1 : 0,
        symbol.isPublic ? 1 : 0,
        symbol.summary || null,
        symbolAny.declaredType || null,
        symbolAny.inferredType || null,
        symbolAny.genericParams ? JSON.stringify(symbolAny.genericParams) : null,
        symbolAny.parameterTypes ? JSON.stringify(symbolAny.parameterTypes) : null,
        symbolAny.isConstant ? 1 : 0,
        symbolAny.literalValue || null,
        symbolAny.valueType || null,
        new Date().toISOString(),
        new Date().toISOString(),
        '1.0.0',
        jsonlLine
      );
      return true;
      /**
       * error
       * @public
       */
    } catch (error) {
      console.error('Failed to insert symbol:', error);
      return false;
    }
  }

  /**
   * Insert enhanced documentation
   * @param doc - Enhanced documentation
   * @param jsonlLine - Line number in JSONL file
   * @returns True if successful
   * @precondition Symbol must exist
   * @postcondition Documentation is stored and indexed
   */
  insertEnhancedDoc(doc: EnhancedSymbolDoc, jsonlLine: number): boolean {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO enhanced_docs (
        symbol_id, problem_solving, functionality,
        error_experiences, decisions, dependencies, future_plans,
        created_at, updated_at, version, jsonl_line
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(
        doc.symbolId,
        JSON.stringify(doc.problemSolving),
        JSON.stringify(doc.functionality),
        JSON.stringify(doc.errorExperiences),
        JSON.stringify(doc.decisions),
        JSON.stringify(doc.dependencies),
        JSON.stringify(doc.futurePlans),
        doc.createdAt,
        doc.updatedAt,
        doc.version,
        jsonlLine
      );
      return true;
      /**
       * error
       * @public
       */
    } catch (error) {
      console.error('Failed to insert enhanced doc:', error);
      return false;
    }
  }

  /**
   * Insert a dependency relationship between symbols
   * @param dependency - Dependency information
   * @returns True if successful
   */
  insertDependency(dependency: {
    symbolId: string;
    target: string;
    type: string;
    reason: string;
    version?: string;
    isOptional?: boolean;
    importPath?: string;
  }): boolean {
    const stmt = this.db.prepare(`
      INSERT INTO dependencies (
        symbol_id, target, type, reason, version, is_optional, import_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(
        dependency.symbolId,
        dependency.target,
        dependency.type,
        dependency.reason,
        dependency.version || null,
        dependency.isOptional ? 1 : 0,
        dependency.importPath || null
      );
      return true;
    } catch (error) {
      console.error('Failed to insert dependency:', error);
      return false;
    }
  }

  /**
   * Get dependencies for a symbol
   * @param symbolId - Symbol ID
   * @returns Array of dependency target symbol IDs
   */
  getDependencies(symbolId: string): string[] {
    const stmt = this.db.prepare('SELECT target FROM dependencies WHERE symbol_id = ?');
    const results = stmt.all(symbolId) as Array<{ target: string }>;
    return results.map((r) => r.target);
  }

  /**
   * Get symbols that depend on a given symbol
   * @param symbolId - Symbol ID
   * @returns Array of dependent symbol IDs
   */
  getDependents(symbolId: string): string[] {
    const stmt = this.db.prepare('SELECT symbol_id FROM dependencies WHERE target = ?');
    const results = stmt.all(symbolId) as Array<{ symbol_id: string }>;
    return results.map((r) => r.symbol_id);
  }

  /**
   * Search symbols by text query (full-text search)
   * @param query - Search query
   * @returns Array of matching symbol IDs
   * @contract Use FTS5 for efficient text search
   */
  searchSymbols(query: string): string[] {
    const stmt = this.db.prepare(`
      SELECT id FROM symbols_fts
      WHERE symbols_fts MATCH ?
      ORDER BY rank
    `);

    const results = stmt.all(query) as Array<{ id: string }>;
    return results.map((r) => r.id);
  }

  /**
   * Get symbol by ID
   * @param id - Symbol ID
   * @returns Symbol data or null
   */
  getSymbol(id: string): Symbol | null {
    const stmt = this.db.prepare('SELECT * FROM symbols WHERE id = ?');
    const row = stmt.get(id) as SymbolRow | undefined;

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      type: row.type as Symbol['type'],
      filePath: row.file_path,
      line: row.line,
      column: row.column,
      isExported: row.is_exported === 1,
      isPublic: row.is_public === 1,
      summary: row.summary ?? undefined,
      tests: [], // Need to fetch from test_mappings
      designDecisions: [], // Need to fetch from decision_records
    };
  }

  /**
   * Get all symbols from database
   * @returns Array of all symbols
   */
  getAllSymbols(): Symbol[] {
    const stmt = this.db.prepare('SELECT * FROM symbols');
    const rows = stmt.all() as SymbolRow[];

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type as Symbol['type'],
      filePath: row.file_path,
      line: row.line,
      column: row.column,
      isExported: row.is_exported === 1,
      isPublic: row.is_public === 1,
      summary: row.summary ?? undefined,
      tests: [],
      designDecisions: [],
    }));
  }

  /**
   * Get enhanced documentation for a symbol
   * @param symbolId - Symbol ID
   * @returns Enhanced documentation or null
   */
  getEnhancedDoc(symbolId: string): EnhancedSymbolDoc | null {
    const stmt = this.db.prepare('SELECT * FROM enhanced_docs WHERE symbol_id = ?');
    const row = stmt.get(symbolId) as EnhancedDocRow | undefined;

    if (!row) return null;

    return {
      symbolId: row.symbol_id,
      problemSolving: JSON.parse(row.problem_solving),
      functionality: JSON.parse(row.functionality),
      errorExperiences: JSON.parse(row.error_experiences),
      decisions: JSON.parse(row.decisions),
      dependencies: JSON.parse(row.dependencies),
      futurePlans: JSON.parse(row.future_plans),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      version: row.version,
    };
  }

  /**
   * Export all data to JSONL format
   * @returns Path to exported JSONL file
   * @contract Export data in Git-friendly JSONL format
   * @postcondition One JSON object per line
   */
  exportToJSONL(): string {
    // Ensure directory exists
    if (!fs.existsSync(this.jsonlPath)) {
      fs.mkdirSync(this.jsonlPath, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportPath = path.join(this.jsonlPath, `export-${timestamp}.jsonl`);

    const symbols = this.db.prepare('SELECT * FROM symbols').all();
    const enhancedDocs = this.db.prepare('SELECT * FROM enhanced_docs').all();

    const lines: string[] = [];

    // Export symbols
    /**
     * symbol
     * @public
     */
    for (const symbol of symbols) {
      const record = {
        type: 'symbol',
        data: symbol,
      };
      lines.push(JSON.stringify(record));
    }

    // Export enhanced docs
    /**
     * doc
     * @public
     */
    for (const doc of enhancedDocs) {
      const record = {
        type: 'enhanced_doc',
        data: doc,
      };
      lines.push(JSON.stringify(record));
    }

    // Write synchronously
    fs.writeFileSync(exportPath, lines.join('\n') + (lines.length > 0 ? '\n' : ''));

    return exportPath;
  }

  /**
   * Import data from JSONL file
   * @param filePath - Path to JSONL file
   * @returns Number of records imported
   * @contract Parse JSONL and populate database
   * @precondition File must be valid JSONL format
   * @postcondition Database is updated with imported data
   */
  importFromJSONL(filePath: string): number {
    if (!fs.existsSync(filePath)) {
      throw new Error(`JSONL file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim().length > 0);

    let count = 0;

    /**
     * i
     * @public
     */
    for (let i = 0; i < lines.length; i++) {
      try {
        const record = JSON.parse(lines[i]);

        if (record.type === 'symbol') {
          const symbol: Symbol = {
            id: record.data.id,
            name: record.data.name,
            type: record.data.type,
            filePath: record.data.file_path,
            line: record.data.line,
            column: record.data.column,
            isExported: record.data.is_exported === 1,
            isPublic: record.data.is_public === 1,
            summary: record.data.summary,
            tests: [],
            designDecisions: [],
          };

          this.insertSymbol(symbol, i);
          count++;
        } else if (record.type === 'enhanced_doc') {
          const doc: EnhancedSymbolDoc = {
            symbolId: record.data.symbol_id,
            problemSolving: JSON.parse(record.data.problem_solving),
            functionality: JSON.parse(record.data.functionality),
            errorExperiences: JSON.parse(record.data.error_experiences),
            decisions: JSON.parse(record.data.decisions),
            dependencies: JSON.parse(record.data.dependencies),
            futurePlans: JSON.parse(record.data.future_plans),
            createdAt: record.data.created_at,
            updatedAt: record.data.updated_at,
            version: record.data.version,
          };

          this.insertEnhancedDoc(doc, i);
          count++;
        }
        /**
         * error
         * @public
         */
      } catch (error) {
        console.error(`Error parsing line ${i}:`, error);
      }
    }

    return count;
  }

  /**
   * Verify imported data integrity
   * @param filePath - Path to JSONL file
   * @returns Verification result with mismatches
   * @contract Compare JSONL file with database records
   */
  verifyImport(filePath: string): {
    success: boolean;
    totalRecords: number;
    verifiedSymbols: number;
    verifiedDocs: number;
    mismatches: string[];
  } {
    if (!fs.existsSync(filePath)) {
      throw new Error(`JSONL file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim().length > 0);

    let symbolCount = 0;
    let docCount = 0;
    const mismatches: string[] = [];

    /**
     * i
     * @public
     */
    for (let i = 0; i < lines.length; i++) {
      try {
        const record = JSON.parse(lines[i]);

        if (record.type === 'symbol') {
          const dbSymbol = this.getSymbol(record.data.id);
          if (!dbSymbol) {
            mismatches.push(`Symbol not found in DB: ${record.data.id}`);
          } else if (dbSymbol.name !== record.data.name) {
            mismatches.push(`Symbol name mismatch: ${record.data.id}`);
          }
          symbolCount++;
        } else if (record.type === 'enhanced_doc') {
          const dbDoc = this.getEnhancedDoc(record.data.symbol_id);
          if (!dbDoc) {
            mismatches.push(`Enhanced doc not found in DB: ${record.data.symbol_id}`);
          }
          docCount++;
        }
        /**
         * error
         * @public
         */
      } catch (error) {
        mismatches.push(`Error parsing line ${i}: ${error}`);
      }
    }

    const stats = this.getStatistics();
    if (stats.totalSymbols !== symbolCount) {
      mismatches.push(`Symbol count mismatch: DB=${stats.totalSymbols}, JSONL=${symbolCount}`);
    }
    if (stats.totalEnhancedDocs !== docCount) {
      mismatches.push(
        `Enhanced doc count mismatch: DB=${stats.totalEnhancedDocs}, JSONL=${docCount}`
      );
    }

    return {
      success: mismatches.length === 0,
      totalRecords: lines.length,
      verifiedSymbols: symbolCount,
      verifiedDocs: docCount,
      mismatches,
    };
  }

  /**
   * Insert a unified relationship
   * @param relationship - Unified relationship to insert
   * @returns True if successful
   */
  insertUnifiedRelationship(relationship: {
    id: string;
    type: string;
    category: string;
    fromSymbols: string[];
    toSymbols: string[];
    direction: string;
    strength: string;
    evidence: Array<{ type: string; source: string; lineNumber?: number; confidence: number }>;
    discoveredBy: string;
    confidence: number;
    filePath?: string;
    line?: number;
    properties?: Record<string, any>;
    description?: string;
  }): boolean {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO unified_relationships (
        id, type, category,
        from_symbols, to_symbols,
        direction, strength,
        evidence, discovered_by, confidence,
        file_path, line, properties,
        created_at, updated_at, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(
        relationship.id,
        relationship.type,
        relationship.category,
        JSON.stringify(relationship.fromSymbols),
        JSON.stringify(relationship.toSymbols),
        relationship.direction,
        relationship.strength,
        JSON.stringify(relationship.evidence),
        relationship.discoveredBy,
        relationship.confidence,
        relationship.filePath || null,
        relationship.line || null,
        relationship.properties ? JSON.stringify(relationship.properties) : null,
        new Date().toISOString(),
        new Date().toISOString(),
        relationship.description || null
      );
      return true;
    } catch (error) {
      console.error('Failed to insert unified relationship:', error);
      return false;
    }
  }

  /**
   * Get all unified relationships from database
   * @returns Array of UnifiedRelationship objects
   * @public
   */
  getAllUnifiedRelationships(): UnifiedRelationship[] {
    const stmt = this.db.prepare(`
      SELECT * FROM unified_relationships
    `);

    const rows = stmt.all() as Array<{
      id: string;
      type: string;
      category: string;
      from_symbols: string;
      to_symbols: string;
      direction: string;
      strength: string;
      evidence: string;
      discovered_by: string;
      confidence: number;
      file_path: string | null;
      line: number | null;
      properties: string | null;
      created_at: string;
      updated_at: string;
      description: string | null;
    }>;

    return rows.map(row => ({
      id: row.id,
      type: row.type as any,
      category: row.category as any,
      from: JSON.parse(row.from_symbols),
      to: JSON.parse(row.to_symbols),
      direction: row.direction as any,
      strength: row.strength as any,
      evidence: JSON.parse(row.evidence),
      discoveredBy: row.discovered_by as any,
      confidence: row.confidence,
      filePath: row.file_path || undefined,
      line: row.line || undefined,
      properties: row.properties ? JSON.parse(row.properties) : {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      description: row.description || undefined,
    }));
  }

  /**
   * Rebuild FTS5 indexes to fix corruption or sync issues
   * @returns Rebuild statistics
   * @contract Rebuild all FTS5 virtual tables from their content tables
   * @postcondition FTS5 indexes are synchronized with main tables
   */
  rebuildFTS5Index(): { symbolsFts: number; enhancedDocsFts: number } {
    // Rebuild symbols_fts index
    this.db.prepare("INSERT INTO symbols_fts(symbols_fts) VALUES('rebuild')").run();
    const symbolsCount = this.db.prepare('SELECT COUNT(*) as count FROM symbols_fts').get() as { count: number };

    // Rebuild enhanced_docs_fts index if it has data
    let enhancedDocsCount = 0;
    try {
      this.db.prepare("INSERT INTO enhanced_docs_fts(enhanced_docs_fts) VALUES('rebuild')").run();
      const result = this.db.prepare('SELECT COUNT(*) as count FROM enhanced_docs_fts').get() as { count: number };
      enhancedDocsCount = result.count;
    } catch (error) {
      // Skip if table is empty or doesn't exist
    }

    return {
      symbolsFts: symbolsCount.count,
      enhancedDocsFts: enhancedDocsCount,
    };
  }

  /**
   * Close database connection
   * @postcondition Database connection is closed
   * @returns void - No return value
   */
  close(): void {
    this.db.close();
  }

  /**
   * Get database statistics
   * @returns Statistics object
   */
  getStatistics(): {
    totalSymbols: number;
    totalEnhancedDocs: number;
    dbSize: number;
  } {
    const symbolCount = this.db.prepare('SELECT COUNT(*) as count FROM symbols').get() as {
      count: number;
    };

    const docCount = this.db.prepare('SELECT COUNT(*) as count FROM enhanced_docs').get() as {
      count: number;
    };

    const stats = fs.statSync(this.dbPath);

    return {
      totalSymbols: symbolCount.count,
      totalEnhancedDocs: docCount.count,
      dbSize: stats.size,
    };
  }
}
