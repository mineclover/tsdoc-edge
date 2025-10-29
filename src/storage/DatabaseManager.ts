/**
 * SQLite database manager for TSDoc Edge
 * @packageDocumentation
 * @responsibility Manage SQLite database operations and JSONL synchronization
 * @architecture Data Layer - Database Management
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { Symbol } from '../types/graph';
import { EnhancedSymbolDoc } from '../types/enhanced-tags';
import { ConfigManager } from '../config/ConfigManager';

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
 */
export class DatabaseManager {
  private db: Database.Database;
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
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO symbols (
        id, name, type, file_path, line, column,
        is_exported, is_public, summary,
        created_at, updated_at, version, jsonl_line
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        new Date().toISOString(),
        new Date().toISOString(),
        '1.0.0',
        jsonlLine
      );
      return true;
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
    } catch (error) {
      console.error('Failed to insert enhanced doc:', error);
      return false;
    }
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
    const row = stmt.get(id) as any;

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      type: row.type,
      filePath: row.file_path,
      line: row.line,
      column: row.column,
      isExported: row.is_exported === 1,
      isPublic: row.is_public === 1,
      summary: row.summary,
      tests: [], // Need to fetch from test_mappings
      designDecisions: [], // Need to fetch from decision_records
    };
  }

  /**
   * Get enhanced documentation for a symbol
   * @param symbolId - Symbol ID
   * @returns Enhanced documentation or null
   */
  getEnhancedDoc(symbolId: string): EnhancedSymbolDoc | null {
    const stmt = this.db.prepare('SELECT * FROM enhanced_docs WHERE symbol_id = ?');
    const row = stmt.get(symbolId) as any;

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
    for (const symbol of symbols) {
      const record = {
        type: 'symbol',
        data: symbol,
      };
      lines.push(JSON.stringify(record));
    }

    // Export enhanced docs
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
      } catch (error) {
        mismatches.push(`Error parsing line ${i}: ${error}`);
      }
    }

    const stats = this.getStatistics();
    if (stats.totalSymbols !== symbolCount) {
      mismatches.push(`Symbol count mismatch: DB=${stats.totalSymbols}, JSONL=${symbolCount}`);
    }
    if (stats.totalEnhancedDocs !== docCount) {
      mismatches.push(`Enhanced doc count mismatch: DB=${stats.totalEnhancedDocs}, JSONL=${docCount}`);
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
   * Close database connection
   * @postcondition Database connection is closed
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
