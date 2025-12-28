/**
 * SQLite database manager for TSDoc Edge using Drizzle ORM
 * @packageDocumentation
 * @responsibility Manage SQLite database operations and JSONL synchronization
 * @architecture Data Layer - Database Management
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq, like, or, and, desc, asc, sql, ne, inArray, gte, lte, count } from 'drizzle-orm';
import { ConfigManager } from '../config/ConfigManager';
import type { Symbol } from '../types/graph';
import type { EnhancedSymbolDoc } from '../types/tags';
import type { UnifiedRelationship } from '../types/relationships/unified';
import * as schema from './schema';

/**
 * Extended symbol type that may include additional AST-extracted fields
 */
interface ExtendedSymbolFields {
  declaredType?: string;
  inferredType?: string;
  genericParams?: string[];
  parameterTypes?: Array<{ name: string; type?: string }>;
  isConstant?: boolean;
  literalValue?: string;
  valueType?: string;
}

// SQLite row types (for backwards compatibility)
/**
 * SymbolRow interface
 * @doc [[DatabaseManager]]
 * @public
 */
export interface SymbolRow {
  id: string;
  name: string;
  type: string;
  file_path: string;
  line: number;
  column: number;
  is_exported: number;
  is_public: number;
  summary: string | null;
  declared_type?: string | null;
  inferred_type?: string | null;
  generic_params?: string | null;
  parameter_types?: string | null;
}

/**
 * DependencyRow interface for database queries
 * @public
 */
export interface DependencyRow {
  symbol_id: string;
  target: string;
  type: string;
  reason: string;
  version: string | null;
  is_optional: number;
  import_path: string | null;
}

/**
 * UnifiedRelationshipRow interface for raw database queries
 * @public
 */
export interface UnifiedRelationshipRow {
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
}

/**
 * Database manager for symbol and documentation storage
 * Uses Drizzle ORM for type-safe database operations
 *
 * @public
 */
export class DatabaseManager {
  /**
   * db property
   * @public
   */
  public readonly db: Database.Database;
  private drizzleDb: ReturnType<typeof drizzle>;
  private dbPath: string;
  private jsonlPath: string;

  /**
   * Create a new DatabaseManager
   * @param dbPath - Path to SQLite database file (optional, defaults to config)
   * @param jsonlPath - Path to JSONL data directory (optional, defaults to config)
   */
  constructor(dbPath?: string, jsonlPath?: string) {
    if (dbPath && jsonlPath) {
      this.dbPath = dbPath;
      this.jsonlPath = jsonlPath;
    } else {
      const configManager = ConfigManager.getInstance();
      const config = configManager.get();
      this.dbPath = configManager.resolvePath(config.paths.databasePath);
      this.jsonlPath = configManager.resolvePath(config.paths.jsonlDir);
    }

    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    if (!fs.existsSync(this.jsonlPath)) {
      fs.mkdirSync(this.jsonlPath, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.drizzleDb = drizzle(this.db, { schema });
    this.initializeSchema();
  }

  /**
   * Run a function within a transaction
   * @param fn - Function to execute within transaction
   * @returns Result of the function
   */
  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  /**
   * Batch insert unified relationships
   * @param relationships - Array of relationship objects to insert
   * @returns Number of successfully inserted relationships
   */
  batchInsertUnifiedRelationships(relationships: Array<{
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
    properties?: Record<string, unknown>;
    description?: string;
  }>): number {
    if (relationships.length === 0) return 0;

    let inserted = 0;
    const now = new Date().toISOString();

    const insertAll = this.db.transaction(() => {
      for (const rel of relationships) {
        try {
          this.drizzleDb.insert(schema.unifiedRelationships)
            .values({
              id: rel.id,
              type: rel.type,
              category: rel.category,
              fromSymbols: JSON.stringify(rel.fromSymbols),
              toSymbols: JSON.stringify(rel.toSymbols),
              direction: rel.direction,
              strength: rel.strength,
              evidence: JSON.stringify(rel.evidence),
              discoveredBy: rel.discoveredBy,
              confidence: rel.confidence,
              filePath: rel.filePath ?? null,
              line: rel.line ?? null,
              properties: rel.properties ? JSON.stringify(rel.properties) : null,
              createdAt: now,
              updatedAt: now,
              description: rel.description ?? null,
            })
            .onConflictDoUpdate({
              target: schema.unifiedRelationships.id,
              set: {
                type: rel.type,
                category: rel.category,
                fromSymbols: JSON.stringify(rel.fromSymbols),
                toSymbols: JSON.stringify(rel.toSymbols),
                direction: rel.direction,
                strength: rel.strength,
                evidence: JSON.stringify(rel.evidence),
                discoveredBy: rel.discoveredBy,
                confidence: rel.confidence,
                filePath: rel.filePath ?? null,
                line: rel.line ?? null,
                properties: rel.properties ? JSON.stringify(rel.properties) : null,
                updatedAt: now,
                description: rel.description ?? null,
              },
            })
            .run();
          inserted++;
        } catch {
          // Skip failed inserts
        }
      }
    });

    insertAll();
    return inserted;
  }

  private initializeSchema(): void {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    // Split schema into individual statements and execute via Drizzle
    // Remove SQL comments and split by semicolon
    const cleanedSql = schemaSql
      .split('\n')
      .map(line => line.replace(/--.*$/, '').trim())
      .join('\n');

    const statements = cleanedSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      try {
        this.drizzleDb.run(sql.raw(statement));
      } catch {
        // Statement already executed or table exists
      }
    }
  }

  /**
   * Insert a symbol into the database
   * @param symbol - Symbol object with optional extended fields
   * @param jsonlLine - Line number in JSONL file for sync tracking
   * @returns True if insert succeeded
   */
  insertSymbol(symbol: Symbol & Partial<ExtendedSymbolFields>, jsonlLine: number): boolean {
    try {
      this.drizzleDb.insert(schema.symbols)
        .values({
          id: symbol.id,
          name: symbol.name,
          type: symbol.type,
          filePath: symbol.filePath,
          line: symbol.line,
          column: symbol.column,
          isExported: symbol.isExported,
          isPublic: symbol.isPublic,
          summary: symbol.summary ?? null,
          declaredType: symbol.declaredType ?? null,
          inferredType: symbol.inferredType ?? null,
          genericParams: symbol.genericParams ? JSON.stringify(symbol.genericParams) : null,
          parameterTypes: symbol.parameterTypes ? JSON.stringify(symbol.parameterTypes) : null,
          isConstant: symbol.isConstant ?? false,
          literalValue: symbol.literalValue ?? null,
          valueType: symbol.valueType ?? null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: '1.0.0',
          jsonlLine,
        })
        .onConflictDoUpdate({
          target: schema.symbols.id,
          set: {
            name: symbol.name,
            type: symbol.type,
            filePath: symbol.filePath,
            line: symbol.line,
            column: symbol.column,
            isExported: symbol.isExported,
            isPublic: symbol.isPublic,
            summary: symbol.summary ?? null,
            declaredType: symbol.declaredType ?? null,
            inferredType: symbol.inferredType ?? null,
            genericParams: symbol.genericParams ? JSON.stringify(symbol.genericParams) : null,
            parameterTypes: symbol.parameterTypes ? JSON.stringify(symbol.parameterTypes) : null,
            isConstant: symbol.isConstant ?? false,
            literalValue: symbol.literalValue ?? null,
            valueType: symbol.valueType ?? null,
            updatedAt: new Date().toISOString(),
            jsonlLine,
          },
        })
        .run();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Insert enhanced documentation
   * @param doc - Enhanced symbol documentation object
   * @param jsonlLine - Line number in JSONL file for sync tracking
   * @returns True if insert succeeded
   */
  insertEnhancedDoc(doc: EnhancedSymbolDoc, jsonlLine: number): boolean {
    try {
      this.drizzleDb.insert(schema.enhancedDocs)
        .values({
          symbolId: doc.symbolId,
          problemSolving: JSON.stringify(doc.problemSolving),
          functionality: JSON.stringify(doc.functionality),
          errorExperiences: JSON.stringify(doc.errorExperiences),
          decisions: JSON.stringify(doc.decisions),
          dependencies: JSON.stringify(doc.dependencies),
          futurePlans: JSON.stringify(doc.futurePlans),
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          version: doc.version,
          jsonlLine,
        })
        .onConflictDoUpdate({
          target: schema.enhancedDocs.symbolId,
          set: {
            problemSolving: JSON.stringify(doc.problemSolving),
            functionality: JSON.stringify(doc.functionality),
            errorExperiences: JSON.stringify(doc.errorExperiences),
            decisions: JSON.stringify(doc.decisions),
            dependencies: JSON.stringify(doc.dependencies),
            futurePlans: JSON.stringify(doc.futurePlans),
            updatedAt: doc.updatedAt,
            version: doc.version,
            jsonlLine,
          },
        })
        .run();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Insert a dependency relationship
   * @param dependency - Dependency relationship object
   * @returns True if insert succeeded
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
    try {
      this.drizzleDb.insert(schema.dependencies)
        .values({
          symbolId: dependency.symbolId,
          target: dependency.target,
          type: dependency.type,
          reason: dependency.reason,
          version: dependency.version ?? null,
          isOptional: dependency.isOptional ?? false,
          importPath: dependency.importPath ?? null,
        })
        .run();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get dependencies for a symbol
   * @param symbolId - ID of the symbol
   * @returns Array of dependency target IDs
   */
  getDependencies(symbolId: string): string[] {
    const results = this.drizzleDb
      .select({ target: schema.dependencies.target })
      .from(schema.dependencies)
      .where(eq(schema.dependencies.symbolId, symbolId))
      .all();
    return results.map((r) => r.target);
  }

  /**
   * Get symbols that depend on a given symbol
   * @param symbolId - ID of the target symbol
   * @returns Array of dependent symbol IDs
   */
  getDependents(symbolId: string): string[] {
    const results = this.drizzleDb
      .select({ symbolId: schema.dependencies.symbolId })
      .from(schema.dependencies)
      .where(eq(schema.dependencies.target, symbolId))
      .all();
    return results.map((r) => r.symbolId);
  }

  /**
   * Search symbols by text query
   * @param query - Search query (searches name and summary)
   * @returns Array of matching symbol IDs
   */
  searchSymbols(query: string): string[] {
    const pattern = `%${query}%`;
    const results = this.drizzleDb
      .select({ id: schema.symbols.id })
      .from(schema.symbols)
      .where(or(
        like(schema.symbols.name, pattern),
        like(schema.symbols.summary, pattern)
      ))
      .orderBy(asc(schema.symbols.name))
      .all();
    return results.map((r) => r.id);
  }

  /**
   * Get symbol by ID
   * @param id - Symbol ID
   * @returns Symbol object or null if not found
   */
  getSymbol(id: string): Symbol | null {
    const row = this.drizzleDb
      .select()
      .from(schema.symbols)
      .where(eq(schema.symbols.id, id))
      .get();

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      type: row.type as Symbol['type'],
      filePath: row.filePath,
      line: row.line,
      column: row.column,
      isExported: row.isExported ?? false,
      isPublic: row.isPublic ?? false,
      summary: row.summary ?? undefined,
      tests: [],
      designDecisions: [],
    };
  }

  /**
   * Get all symbols in a file
   * @param filePath - Path to the source file
   * @returns Array of symbols in the file
   */
  getSymbolsByFile(filePath: string): Symbol[] {
    const rows = this.drizzleDb
      .select()
      .from(schema.symbols)
      .where(eq(schema.symbols.filePath, filePath))
      .all();

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type as Symbol['type'],
      filePath: row.filePath,
      line: row.line,
      column: row.column,
      isExported: row.isExported ?? false,
      isPublic: row.isPublic ?? false,
      summary: row.summary ?? undefined,
      tests: [],
      designDecisions: [],
    }));
  }

  /**
   * Get all symbols
   */
  getAllSymbols(): Symbol[] {
    const rows = this.drizzleDb.select().from(schema.symbols).all();

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type as Symbol['type'],
      filePath: row.filePath,
      line: row.line,
      column: row.column,
      isExported: row.isExported ?? false,
      isPublic: row.isPublic ?? false,
      summary: row.summary ?? undefined,
      tests: [],
      designDecisions: [],
    }));
  }

  /**
   * Get enhanced documentation for a symbol
   * @param symbolId - ID of the symbol
   * @returns Enhanced documentation or null if not found
   */
  getEnhancedDoc(symbolId: string): EnhancedSymbolDoc | null {
    const row = this.drizzleDb
      .select()
      .from(schema.enhancedDocs)
      .where(eq(schema.enhancedDocs.symbolId, symbolId))
      .get();

    if (!row) return null;

    return {
      symbolId: row.symbolId,
      problemSolving: JSON.parse(row.problemSolving),
      functionality: JSON.parse(row.functionality),
      errorExperiences: JSON.parse(row.errorExperiences),
      decisions: JSON.parse(row.decisions),
      dependencies: JSON.parse(row.dependencies),
      futurePlans: JSON.parse(row.futurePlans),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      version: row.version,
    };
  }

  /**
   * Export all data to JSONL format
   */
  exportToJSONL(): string {
    if (!fs.existsSync(this.jsonlPath)) {
      fs.mkdirSync(this.jsonlPath, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportPath = path.join(this.jsonlPath, `export-${timestamp}.jsonl`);

    const symbolRows = this.drizzleDb.select().from(schema.symbols).all();
    const enhancedDocRows = this.drizzleDb.select().from(schema.enhancedDocs).all();

    const lines: string[] = [];

    for (const symbol of symbolRows) {
      lines.push(JSON.stringify({ type: 'symbol', data: symbol }));
    }

    for (const doc of enhancedDocRows) {
      lines.push(JSON.stringify({ type: 'enhanced_doc', data: doc }));
    }

    fs.writeFileSync(exportPath, lines.join('\n') + (lines.length > 0 ? '\n' : ''));
    return exportPath;
  }

  /**
   * Import data from JSONL file
   * @param filePath - Path to JSONL file
   * @returns Number of imported records
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
            filePath: record.data.file_path || record.data.filePath,
            line: record.data.line,
            column: record.data.column,
            isExported: record.data.is_exported === 1 || record.data.isExported,
            isPublic: record.data.is_public === 1 || record.data.isPublic,
            summary: record.data.summary,
            tests: [],
            designDecisions: [],
          };

          this.insertSymbol(symbol, i);
          count++;
        } else if (record.type === 'enhanced_doc') {
          const doc: EnhancedSymbolDoc = {
            symbolId: record.data.symbol_id || record.data.symbolId,
            problemSolving: typeof record.data.problem_solving === 'string'
              ? JSON.parse(record.data.problem_solving)
              : record.data.problemSolving,
            functionality: typeof record.data.functionality === 'string'
              ? JSON.parse(record.data.functionality)
              : record.data.functionality,
            errorExperiences: typeof record.data.error_experiences === 'string'
              ? JSON.parse(record.data.error_experiences)
              : record.data.errorExperiences,
            decisions: typeof record.data.decisions === 'string'
              ? JSON.parse(record.data.decisions)
              : record.data.decisions,
            dependencies: typeof record.data.dependencies === 'string'
              ? JSON.parse(record.data.dependencies)
              : record.data.dependencies,
            futurePlans: typeof record.data.future_plans === 'string'
              ? JSON.parse(record.data.future_plans)
              : record.data.futurePlans,
            createdAt: record.data.created_at || record.data.createdAt,
            updatedAt: record.data.updated_at || record.data.updatedAt,
            version: record.data.version,
          };

          this.insertEnhancedDoc(doc, i);
          count++;
        }
      } catch {
        continue;
      }
    }

    return count;
  }

  /**
   * Verify imported data integrity
   * @param filePath - Path to JSONL file to verify against
   * @returns Verification result with counts and mismatches
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
          const dbDoc = this.getEnhancedDoc(record.data.symbol_id || record.data.symbolId);
          if (!dbDoc) {
            mismatches.push(`Enhanced doc not found in DB: ${record.data.symbol_id || record.data.symbolId}`);
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
   * Insert a unified relationship
   * @param relationship - Relationship object to insert
   * @returns True if insert succeeded
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
    properties?: Record<string, unknown>;
    description?: string;
  }): boolean {
    try {
      const now = new Date().toISOString();
      this.drizzleDb.insert(schema.unifiedRelationships)
        .values({
          id: relationship.id,
          type: relationship.type,
          category: relationship.category,
          fromSymbols: JSON.stringify(relationship.fromSymbols),
          toSymbols: JSON.stringify(relationship.toSymbols),
          direction: relationship.direction,
          strength: relationship.strength,
          evidence: JSON.stringify(relationship.evidence),
          discoveredBy: relationship.discoveredBy,
          confidence: relationship.confidence,
          filePath: relationship.filePath ?? null,
          line: relationship.line ?? null,
          properties: relationship.properties ? JSON.stringify(relationship.properties) : null,
          createdAt: now,
          updatedAt: now,
          description: relationship.description ?? null,
        })
        .onConflictDoUpdate({
          target: schema.unifiedRelationships.id,
          set: {
            type: relationship.type,
            category: relationship.category,
            fromSymbols: JSON.stringify(relationship.fromSymbols),
            toSymbols: JSON.stringify(relationship.toSymbols),
            direction: relationship.direction,
            strength: relationship.strength,
            evidence: JSON.stringify(relationship.evidence),
            discoveredBy: relationship.discoveredBy,
            confidence: relationship.confidence,
            filePath: relationship.filePath ?? null,
            line: relationship.line ?? null,
            properties: relationship.properties ? JSON.stringify(relationship.properties) : null,
            updatedAt: now,
            description: relationship.description ?? null,
          },
        })
        .run();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all unified relationships
   */
  getAllUnifiedRelationships(): UnifiedRelationship[] {
    const rows = this.drizzleDb.select().from(schema.unifiedRelationships).all();

    return rows.map((row) => ({
      id: row.id,
      type: row.type as UnifiedRelationship['type'],
      category: row.category as UnifiedRelationship['category'],
      from: JSON.parse(row.fromSymbols) as string | string[],
      to: JSON.parse(row.toSymbols) as string | string[],
      direction: row.direction as UnifiedRelationship['direction'],
      strength: row.strength as UnifiedRelationship['strength'],
      evidence: JSON.parse(row.evidence) as UnifiedRelationship['evidence'],
      discoveredBy: row.discoveredBy as UnifiedRelationship['discoveredBy'],
      confidence: row.confidence,
      filePath: row.filePath ?? undefined,
      line: row.line ?? undefined,
      properties: row.properties ? JSON.parse(row.properties) : {},
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      description: row.description ?? undefined,
    }));
  }

  /**
   * Get unified relationships by symbol
   * @param symbolId - ID of the symbol
   * @returns Array of relationships involving the symbol
   */
  getUnifiedRelationshipsBySymbol(symbolId: string): UnifiedRelationship[] {
    const pattern = `%"${symbolId}"%`;
    const rows = this.drizzleDb
      .select()
      .from(schema.unifiedRelationships)
      .where(
        or(
          like(schema.unifiedRelationships.fromSymbols, pattern),
          like(schema.unifiedRelationships.toSymbols, pattern)
        )
      )
      .all();

    return rows.map((row) => ({
      id: row.id,
      type: row.type as UnifiedRelationship['type'],
      category: row.category as UnifiedRelationship['category'],
      from: JSON.parse(row.fromSymbols) as string | string[],
      to: JSON.parse(row.toSymbols) as string | string[],
      direction: row.direction as UnifiedRelationship['direction'],
      strength: row.strength as UnifiedRelationship['strength'],
      evidence: JSON.parse(row.evidence) as UnifiedRelationship['evidence'],
      discoveredBy: row.discoveredBy as UnifiedRelationship['discoveredBy'],
      confidence: row.confidence,
      filePath: row.filePath ?? undefined,
      line: row.line ?? undefined,
      properties: row.properties ? JSON.parse(row.properties) : {},
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      description: row.description ?? undefined,
    }));
  }

  /**
   * Rebuild search indexes (returns symbol counts for compatibility)
   * @deprecated FTS5 has been removed. This method now returns symbol counts using standard queries.
   */
  rebuildFTS5Index(): { symbolsFts: number; enhancedDocsFts: number } {
    // FTS5 removed - return counts from regular tables
    const symbolsResult = this.drizzleDb
      .select({ count: count() })
      .from(schema.symbols)
      .get();

    const enhancedDocsResult = this.drizzleDb
      .select({ count: count() })
      .from(schema.enhancedDocs)
      .get();

    return {
      symbolsFts: symbolsResult?.count || 0,
      enhancedDocsFts: enhancedDocsResult?.count || 0,
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Get database statistics
   */
  getStatistics(): {
    totalSymbols: number;
    totalEnhancedDocs: number;
    dbSize: number;
  } {
    const symbolResult = this.drizzleDb
      .select({ count: sql<number>`count(*)` })
      .from(schema.symbols)
      .get();

    const docResult = this.drizzleDb
      .select({ count: sql<number>`count(*)` })
      .from(schema.enhancedDocs)
      .get();

    const stats = fs.statSync(this.dbPath);

    return {
      totalSymbols: symbolResult?.count ?? 0,
      totalEnhancedDocs: docResult?.count ?? 0,
      dbSize: stats.size,
    };
  }

  /**
   * Get all symbol rows for graph building
   */
  getAllSymbolRows(): SymbolRow[] {
    const rows = this.drizzleDb.select().from(schema.symbols).all();

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      file_path: row.filePath,
      line: row.line,
      column: row.column,
      is_exported: row.isExported ? 1 : 0,
      is_public: row.isPublic ? 1 : 0,
      summary: row.summary,
      declared_type: row.declaredType,
      inferred_type: row.inferredType,
      generic_params: row.genericParams,
      parameter_types: row.parameterTypes,
    }));
  }

  /**
   * Get all dependency rows for graph building
   */
  getAllDependencyRows(): DependencyRow[] {
    const rows = this.drizzleDb.select().from(schema.dependencies).all();

    return rows.map((row) => ({
      symbol_id: row.symbolId,
      target: row.target,
      type: row.type,
      reason: row.reason,
      version: row.version,
      is_optional: row.isOptional ? 1 : 0,
      import_path: row.importPath,
    }));
  }

  /**
   * Get symbols and dependencies for graph building
   */
  getGraphData(): { symbols: SymbolRow[]; dependencies: DependencyRow[] } {
    return {
      symbols: this.getAllSymbolRows(),
      dependencies: this.getAllDependencyRows(),
    };
  }

  // ========== Sync Metadata Methods ==========

  /**
   * Get sync metadata hash for a file
   * @param filePath - Path to the file
   * @returns Hash string or null if not found
   */
  getSyncMetadataHash(filePath: string): string | null {
    const row = this.drizzleDb
      .select({ hash: schema.syncMetadata.hash })
      .from(schema.syncMetadata)
      .where(eq(schema.syncMetadata.filePath, filePath))
      .get();
    return row?.hash ?? null;
  }

  /**
   * Upsert sync metadata for a file
   * @param filePath - Path to the file
   * @param hash - Content hash
   * @param status - Sync status (default: 'synced')
   */
  upsertSyncMetadata(filePath: string, hash: string, status: string = 'synced'): void {
    const now = new Date().toISOString();
    this.drizzleDb.insert(schema.syncMetadata)
      .values({
        filePath,
        lastSync: now,
        totalRecords: 1,
        hash,
        status,
      })
      .onConflictDoUpdate({
        target: schema.syncMetadata.filePath,
        set: {
          lastSync: now,
          hash,
          status,
        },
      })
      .run();
  }

  // ========== Symbol Query Methods ==========

  /**
   * Count symbols with optional filters
   * @param options - Filter options (type, filePath, isPublic)
   * @returns Number of matching symbols
   */
  countSymbols(options?: { type?: string; filePath?: string; isPublic?: boolean }): number {
    let query = this.drizzleDb.select({ count: sql<number>`count(*)` }).from(schema.symbols);

    if (options?.type) {
      query = query.where(eq(schema.symbols.type, options.type)) as typeof query;
    }
    if (options?.filePath) {
      query = query.where(eq(schema.symbols.filePath, options.filePath)) as typeof query;
    }
    if (options?.isPublic !== undefined) {
      query = query.where(eq(schema.symbols.isPublic, options.isPublic)) as typeof query;
    }

    return query.get()?.count ?? 0;
  }

  /**
   * Count symbols grouped by type
   */
  countSymbolsByType(): Array<{ type: string; count: number }> {
    return this.drizzleDb
      .select({
        type: schema.symbols.type,
        count: sql<number>`count(*)`,
      })
      .from(schema.symbols)
      .groupBy(schema.symbols.type)
      .orderBy(desc(sql`count(*)`))
      .all();
  }

  /**
   * Get all symbol IDs
   */
  getAllSymbolIds(): string[] {
    const rows = this.drizzleDb
      .select({ id: schema.symbols.id })
      .from(schema.symbols)
      .all();
    return rows.map((r) => r.id);
  }

  /**
   * Get distinct file paths
   */
  getDistinctFilePaths(): string[] {
    const rows = this.drizzleDb
      .selectDistinct({ filePath: schema.symbols.filePath })
      .from(schema.symbols)
      .all();
    return rows.map((r) => r.filePath);
  }

  /**
   * Get symbols with filters and pagination
   * @param options - Query options including filters, pagination, and sorting
   * @returns Array of matching symbol rows
   */
  querySymbols(options: {
    type?: string;
    filePath?: string;
    isPublic?: boolean;
    isExported?: boolean;
    namePattern?: string;
    limit?: number;
    offset?: number;
    orderBy?: 'name' | 'type' | 'filePath';
    orderDir?: 'asc' | 'desc';
  }): SymbolRow[] {
    const conditions = [];

    if (options.type) {
      conditions.push(eq(schema.symbols.type, options.type));
    }
    if (options.filePath) {
      conditions.push(eq(schema.symbols.filePath, options.filePath));
    }
    if (options.isPublic !== undefined) {
      conditions.push(eq(schema.symbols.isPublic, options.isPublic));
    }
    if (options.isExported !== undefined) {
      conditions.push(eq(schema.symbols.isExported, options.isExported));
    }
    if (options.namePattern) {
      conditions.push(like(schema.symbols.name, options.namePattern));
    }

    let query = this.drizzleDb.select().from(schema.symbols);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    // Order
    const orderColumn = options.orderBy === 'type' ? schema.symbols.type
      : options.orderBy === 'filePath' ? schema.symbols.filePath
      : schema.symbols.name;
    const orderFn = options.orderDir === 'desc' ? desc : asc;
    query = query.orderBy(orderFn(orderColumn)) as typeof query;

    // Pagination
    if (options.limit) {
      query = query.limit(options.limit) as typeof query;
    }
    if (options.offset) {
      query = query.offset(options.offset) as typeof query;
    }

    const rows = query.all();
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      file_path: row.filePath,
      line: row.line,
      column: row.column,
      is_exported: row.isExported ? 1 : 0,
      is_public: row.isPublic ? 1 : 0,
      summary: row.summary,
      declared_type: row.declaredType,
      inferred_type: row.inferredType,
      generic_params: row.genericParams,
      parameter_types: row.parameterTypes,
    }));
  }

  /**
   * Get symbols by a list of IDs
   * @param ids - Array of symbol IDs
   * @returns Array of matching symbol rows
   */
  getSymbolsByIds(ids: string[]): SymbolRow[] {
    if (ids.length === 0) return [];

    const rows = this.drizzleDb
      .select()
      .from(schema.symbols)
      .where(inArray(schema.symbols.id, ids))
      .all();

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      file_path: row.filePath,
      line: row.line,
      column: row.column,
      is_exported: row.isExported ? 1 : 0,
      is_public: row.isPublic ? 1 : 0,
      summary: row.summary,
      declared_type: row.declaredType,
      inferred_type: row.inferredType,
      generic_params: row.genericParams,
      parameter_types: row.parameterTypes,
    }));
  }

  /**
   * Get symbol at a specific file path and line (for hover info)
   * Returns the symbol defined at or before the given line
   * @param filePathPattern - File path pattern (supports LIKE wildcards)
   * @param line - Line number
   * @returns Symbol row or null if not found
   */
  getSymbolAtLine(filePathPattern: string, line: number): SymbolRow | null {
    const row = this.drizzleDb
      .select()
      .from(schema.symbols)
      .where(and(
        like(schema.symbols.filePath, filePathPattern),
        lte(schema.symbols.line, line)
      ))
      .orderBy(desc(schema.symbols.line))
      .limit(1)
      .get();

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      type: row.type,
      file_path: row.filePath,
      line: row.line,
      column: row.column,
      is_exported: row.isExported ? 1 : 0,
      is_public: row.isPublic ? 1 : 0,
      summary: row.summary,
      declared_type: row.declaredType,
      inferred_type: row.inferredType,
      generic_params: row.genericParams,
      parameter_types: row.parameterTypes,
    };
  }

  /**
   * Count relationships where symbol is in from_symbols (downstream)
   * @param symbolId - ID of the symbol
   * @returns Number of downstream relationships
   */
  countDownstreamRelationships(symbolId: string): number {
    const pattern = `%"${symbolId}"%`;
    const result = this.drizzleDb
      .select({ count: count() })
      .from(schema.unifiedRelationships)
      .where(like(schema.unifiedRelationships.fromSymbols, pattern))
      .get();
    return result?.count || 0;
  }

  /**
   * Count relationships where symbol is in to_symbols (upstream)
   * @param symbolId - ID of the symbol
   * @returns Number of upstream relationships
   */
  countUpstreamRelationships(symbolId: string): number {
    const pattern = `%"${symbolId}"%`;
    const result = this.drizzleDb
      .select({ count: count() })
      .from(schema.unifiedRelationships)
      .where(like(schema.unifiedRelationships.toSymbols, pattern))
      .get();
    return result?.count || 0;
  }

  /**
   * Get relationship type counts for a symbol
   * @param symbolId - ID of the symbol
   * @param limit - Maximum number of types to return (default: 5)
   * @returns Array of type/count pairs
   */
  getRelationshipTypeCounts(symbolId: string, limit: number = 5): Array<{ type: string; count: number }> {
    const pattern = `%"${symbolId}"%`;
    const rows = this.drizzleDb
      .select({
        type: schema.unifiedRelationships.type,
        count: count(),
      })
      .from(schema.unifiedRelationships)
      .where(or(
        like(schema.unifiedRelationships.fromSymbols, pattern),
        like(schema.unifiedRelationships.toSymbols, pattern)
      ))
      .groupBy(schema.unifiedRelationships.type)
      .orderBy(desc(count()))
      .limit(limit)
      .all();
    return rows;
  }

  /**
   * Search symbols by name pattern
   * @param query - Search query (supports partial match)
   * @param limit - Maximum number of results (default: 50)
   * @returns Array of matching symbol rows
   */
  searchSymbolsByName(query: string, limit: number = 50): SymbolRow[] {
    const pattern = `%${query}%`;
    const rows = this.drizzleDb
      .select()
      .from(schema.symbols)
      .where(like(schema.symbols.name, pattern))
      .orderBy(asc(schema.symbols.name))
      .limit(limit)
      .all();

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      file_path: row.filePath,
      line: row.line,
      column: row.column,
      is_exported: row.isExported ? 1 : 0,
      is_public: row.isPublic ? 1 : 0,
      summary: row.summary,
      declared_type: row.declaredType,
      inferred_type: row.inferredType,
      generic_params: row.genericParams,
      parameter_types: row.parameterTypes,
    }));
  }

  /**
   * Find symbol by name (exact match first, then case-insensitive, then partial)
   * @param name - Symbol name to search for
   * @returns Matching symbol row or null
   */
  findSymbolByName(name: string): SymbolRow | null {
    // Exact match
    let row = this.drizzleDb
      .select()
      .from(schema.symbols)
      .where(eq(schema.symbols.name, name))
      .limit(1)
      .get();

    // Case-insensitive match
    if (!row) {
      row = this.drizzleDb
        .select()
        .from(schema.symbols)
        .where(sql`LOWER(${schema.symbols.name}) = ${name.toLowerCase()}`)
        .limit(1)
        .get();
    }

    // Partial match (order by shortest name first)
    if (!row) {
      row = this.drizzleDb
        .select()
        .from(schema.symbols)
        .where(like(schema.symbols.name, `%${name}%`))
        .orderBy(sql`LENGTH(${schema.symbols.name})`)
        .limit(1)
        .get();
    }

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      type: row.type,
      file_path: row.filePath,
      line: row.line,
      column: row.column,
      is_exported: row.isExported ? 1 : 0,
      is_public: row.isPublic ? 1 : 0,
      summary: row.summary,
      declared_type: row.declaredType,
      inferred_type: row.inferredType,
      generic_params: row.genericParams,
      parameter_types: row.parameterTypes,
    };
  }

  /**
   * Get relationships for a symbol with limit
   * @param symbolId - ID of the symbol
   * @param limit - Maximum number of relationships to return
   * @returns Array of relationship summaries
   */
  getRelationshipsForSymbol(symbolId: string, limit: number): Array<{
    fromSymbols: string;
    toSymbols: string;
    type: string;
  }> {
    const pattern = `%"${symbolId}"%`;
    const rows = this.drizzleDb
      .select({
        fromSymbols: schema.unifiedRelationships.fromSymbols,
        toSymbols: schema.unifiedRelationships.toSymbols,
        type: schema.unifiedRelationships.type,
      })
      .from(schema.unifiedRelationships)
      .where(or(
        like(schema.unifiedRelationships.fromSymbols, pattern),
        like(schema.unifiedRelationships.toSymbols, pattern)
      ))
      .limit(limit)
      .all();

    return rows;
  }

  // ========== Relationship Query Methods ==========

  /**
   * Count all relationships
   */
  countRelationships(): number {
    return this.drizzleDb
      .select({ count: sql<number>`count(*)` })
      .from(schema.unifiedRelationships)
      .get()?.count ?? 0;
  }

  /**
   * Count relationships grouped by category
   */
  countRelationshipsByCategory(): Array<{ category: string; count: number }> {
    return this.drizzleDb
      .select({
        category: schema.unifiedRelationships.category,
        count: sql<number>`count(*)`,
      })
      .from(schema.unifiedRelationships)
      .groupBy(schema.unifiedRelationships.category)
      .orderBy(desc(sql`count(*)`))
      .all();
  }

  /**
   * Count relationships grouped by type
   */
  countRelationshipsByType(): Array<{ type: string; count: number }> {
    return this.drizzleDb
      .select({
        type: schema.unifiedRelationships.type,
        count: sql<number>`count(*)`,
      })
      .from(schema.unifiedRelationships)
      .groupBy(schema.unifiedRelationships.type)
      .orderBy(desc(sql`count(*)`))
      .all();
  }

  /**
   * Query relationships with filters
   * @param options - Filter options (type, category, strength, minConfidence, symbolId, pagination)
   * @returns Array of matching relationships
   */
  queryRelationships(options: {
    type?: string;
    category?: string;
    strength?: string;
    minConfidence?: number;
    symbolId?: string;
    limit?: number;
    offset?: number;
  }): UnifiedRelationship[] {
    const conditions = [];

    if (options.type) {
      conditions.push(eq(schema.unifiedRelationships.type, options.type));
    }
    if (options.category) {
      conditions.push(eq(schema.unifiedRelationships.category, options.category));
    }
    if (options.strength) {
      conditions.push(eq(schema.unifiedRelationships.strength, options.strength));
    }
    if (options.minConfidence !== undefined) {
      conditions.push(gte(schema.unifiedRelationships.confidence, options.minConfidence));
    }
    if (options.symbolId) {
      const pattern = `%"${options.symbolId}"%`;
      conditions.push(or(
        like(schema.unifiedRelationships.fromSymbols, pattern),
        like(schema.unifiedRelationships.toSymbols, pattern)
      ));
    }

    let query = this.drizzleDb.select().from(schema.unifiedRelationships);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    if (options.limit) {
      query = query.limit(options.limit) as typeof query;
    }
    if (options.offset) {
      query = query.offset(options.offset) as typeof query;
    }

    const rows = query.all();
    return rows.map((row) => ({
      id: row.id,
      type: row.type as UnifiedRelationship['type'],
      category: row.category as UnifiedRelationship['category'],
      from: JSON.parse(row.fromSymbols) as string | string[],
      to: JSON.parse(row.toSymbols) as string | string[],
      direction: row.direction as UnifiedRelationship['direction'],
      strength: row.strength as UnifiedRelationship['strength'],
      evidence: JSON.parse(row.evidence) as UnifiedRelationship['evidence'],
      discoveredBy: row.discoveredBy as UnifiedRelationship['discoveredBy'],
      confidence: row.confidence,
      filePath: row.filePath ?? undefined,
      line: row.line ?? undefined,
      properties: row.properties ? JSON.parse(row.properties) : {},
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      description: row.description ?? undefined,
    }));
  }

  /**
   * Get raw relationship rows (for backwards compatibility)
   */
  getAllUnifiedRelationshipRows(): UnifiedRelationshipRow[] {
    const rows = this.drizzleDb.select().from(schema.unifiedRelationships).all();
    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      category: row.category,
      from_symbols: row.fromSymbols,
      to_symbols: row.toSymbols,
      direction: row.direction,
      strength: row.strength,
      evidence: row.evidence,
      discovered_by: row.discoveredBy,
      confidence: row.confidence,
      file_path: row.filePath,
      line: row.line,
      properties: row.properties,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
      description: row.description,
    }));
  }

  /**
   * Delete a relationship by ID
   * @param id - Relationship ID
   * @returns True if deleted successfully
   */
  deleteRelationship(id: string): boolean {
    try {
      this.drizzleDb
        .delete(schema.unifiedRelationships)
        .where(eq(schema.unifiedRelationships.id, id))
        .run();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear all relationships
   */
  clearAllRelationships(): number {
    const count = this.countRelationships();
    this.drizzleDb.delete(schema.unifiedRelationships).run();
    return count;
  }

  // ========== Test Mapping Methods ==========

  /**
   * Get test mappings for a symbol
   * @param symbolId - ID of the symbol
   * @returns Array of test mapping objects
   */
  getTestMappings(symbolId: string): Array<{
    testFilePath: string;
    testName: string;
    scenarios: string[];
    coverage: Record<string, unknown> | null;
  }> {
    const rows = this.drizzleDb
      .select()
      .from(schema.testMappings)
      .where(eq(schema.testMappings.symbolId, symbolId))
      .all();

    return rows.map((row) => ({
      testFilePath: row.testFilePath,
      testName: row.testName,
      scenarios: JSON.parse(row.scenarios),
      coverage: row.coverage ? JSON.parse(row.coverage) : null,
    }));
  }

  /**
   * Insert a test mapping
   * @param mapping - Test mapping object
   * @returns True if inserted successfully
   */
  insertTestMapping(mapping: {
    symbolId: string;
    testFilePath: string;
    testName: string;
    scenarios: string[];
    coverage?: Record<string, unknown>;
  }): boolean {
    try {
      this.drizzleDb.insert(schema.testMappings)
        .values({
          symbolId: mapping.symbolId,
          testFilePath: mapping.testFilePath,
          testName: mapping.testName,
          scenarios: JSON.stringify(mapping.scenarios),
          coverage: mapping.coverage ? JSON.stringify(mapping.coverage) : null,
        })
        .run();
      return true;
    } catch {
      return false;
    }
  }

  // ========== Contract Methods ==========

  /**
   * Get contract for a symbol
   * @param symbolId - ID of the symbol
   * @returns Contract object or null if not found
   */
  getContract(symbolId: string): {
    description: string;
    preconditions: string[];
    postconditions: string[];
    invariants: string[];
    filePath: string;
  } | null {
    const row = this.drizzleDb
      .select()
      .from(schema.contracts)
      .where(eq(schema.contracts.symbolId, symbolId))
      .get();

    if (!row) return null;

    return {
      description: row.description,
      preconditions: JSON.parse(row.preconditions),
      postconditions: JSON.parse(row.postconditions),
      invariants: JSON.parse(row.invariants),
      filePath: row.filePath,
    };
  }

  /**
   * Get all contracts
   */
  getAllContracts(): Array<{
    symbolId: string;
    description: string;
    preconditions: string[];
    postconditions: string[];
    invariants: string[];
    filePath: string;
  }> {
    const rows = this.drizzleDb.select().from(schema.contracts).all();
    return rows.map((row) => ({
      symbolId: row.symbolId,
      description: row.description,
      preconditions: JSON.parse(row.preconditions),
      postconditions: JSON.parse(row.postconditions),
      invariants: JSON.parse(row.invariants),
      filePath: row.filePath,
    }));
  }

  // ========== Decision Record Methods ==========

  /**
   * Get decision records for a symbol
   * @param symbolId - ID of the symbol
   * @returns Array of decision record objects
   */
  getDecisionRecords(symbolId: string): Array<{
    id: string;
    title: string;
    decision: string;
    rationale: string;
    status: string;
    date: string;
    supersededBy: string | null;
  }> {
    const rows = this.drizzleDb
      .select()
      .from(schema.decisionRecords)
      .where(eq(schema.decisionRecords.symbolId, symbolId))
      .all();

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      decision: row.decision,
      rationale: row.rationale,
      status: row.status,
      date: row.date,
      supersededBy: row.supersededBy,
    }));
  }

  /**
   * Get all decision records
   */
  getAllDecisionRecords(): Array<{
    id: string;
    symbolId: string | null;
    title: string;
    decision: string;
    rationale: string;
    status: string;
    date: string;
    supersededBy: string | null;
  }> {
    const rows = this.drizzleDb.select().from(schema.decisionRecords).all();
    return rows.map((row) => ({
      id: row.id,
      symbolId: row.symbolId,
      title: row.title,
      decision: row.decision,
      rationale: row.rationale,
      status: row.status,
      date: row.date,
      supersededBy: row.supersededBy,
    }));
  }

  // ========== Error Experience Methods ==========

  /**
   * Get error experiences for a symbol
   * @param symbolId - ID of the symbol
   * @returns Array of error experience objects
   */
  getErrorExperiences(symbolId: string): Array<{
    id: string;
    errorType: string;
    message: string;
    context: string;
    solution: string;
    occurredAt: string | null;
    prevention: string | null;
  }> {
    const rows = this.drizzleDb
      .select()
      .from(schema.errorExperiences)
      .where(eq(schema.errorExperiences.symbolId, symbolId))
      .all();

    return rows.map((row) => ({
      id: row.id,
      errorType: row.errorType,
      message: row.message,
      context: row.context,
      solution: row.solution,
      occurredAt: row.occurredAt,
      prevention: row.prevention,
    }));
  }

  /**
   * Get all error experiences
   */
  getAllErrorExperiences(): Array<{
    id: string;
    symbolId: string;
    errorType: string;
    message: string;
    context: string;
    solution: string;
    occurredAt: string | null;
    prevention: string | null;
  }> {
    const rows = this.drizzleDb.select().from(schema.errorExperiences).all();
    return rows.map((row) => ({
      id: row.id,
      symbolId: row.symbolId,
      errorType: row.errorType,
      message: row.message,
      context: row.context,
      solution: row.solution,
      occurredAt: row.occurredAt,
      prevention: row.prevention,
    }));
  }

  /**
   * Get all test mappings
   */
  getAllTestMappings(): Array<{
    symbolId: string;
    testFilePath: string;
    testName: string;
    scenarios: string[];
    coverage: Record<string, unknown> | null;
  }> {
    const rows = this.drizzleDb.select().from(schema.testMappings).all();
    return rows.map((row) => ({
      symbolId: row.symbolId,
      testFilePath: row.testFilePath,
      testName: row.testName,
      scenarios: JSON.parse(row.scenarios),
      coverage: row.coverage ? JSON.parse(row.coverage) : null,
    }));
  }

  /**
   * Get all enhanced docs with future plans
   */
  getAllEnhancedDocsWithPlans(): Array<{
    symbolId: string;
    futurePlans: string;
  }> {
    const rows = this.drizzleDb
      .select({
        symbolId: schema.enhancedDocs.symbolId,
        futurePlans: schema.enhancedDocs.futurePlans,
      })
      .from(schema.enhancedDocs)
      .all();

    return rows;
  }

  // ========== Future Plans Methods ==========

  /**
   * Query future plans with filters
   * @param options - Filter options (symbolId, status, priority, limit)
   * @returns Array of future plan objects
   */
  queryFuturePlans(options?: {
    symbolId?: string;
    status?: string;
    priority?: string;
    limit?: number;
  }): Array<{
    id: string;
    symbolId: string | null;
    title: string;
    description: string;
    priority: string;
    status: string;
    targetMilestone: string | null;
    estimatedEffort: string | null;
    createdAt: string;
    completedAt: string | null;
  }> {
    const conditions = [];

    if (options?.symbolId) {
      conditions.push(eq(schema.futurePlans.symbolId, options.symbolId));
    }
    if (options?.status) {
      conditions.push(eq(schema.futurePlans.status, options.status));
    }
    if (options?.priority) {
      conditions.push(eq(schema.futurePlans.priority, options.priority));
    }

    let query = this.drizzleDb.select().from(schema.futurePlans);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    query = query.orderBy(desc(schema.futurePlans.createdAt)) as typeof query;

    if (options?.limit) {
      query = query.limit(options.limit) as typeof query;
    }

    return query.all().map((row) => ({
      id: row.id,
      symbolId: row.symbolId,
      title: row.title,
      description: row.description,
      priority: row.priority,
      status: row.status,
      targetMilestone: row.targetMilestone,
      estimatedEffort: row.estimatedEffort,
      createdAt: row.createdAt,
      completedAt: row.completedAt,
    }));
  }

  // ========== Responsibility Methods ==========

  /**
   * Get responsibility for a symbol
   * @param symbolId - ID of the symbol
   * @returns Responsibility object or null if not found
   */
  getResponsibility(symbolId: string): {
    description: string;
    shouldDo: string[];
    shouldNotDo: string[];
    pattern: string | null;
    architecture: string | null;
  } | null {
    const row = this.drizzleDb
      .select()
      .from(schema.responsibilities)
      .where(eq(schema.responsibilities.symbolId, symbolId))
      .get();

    if (!row) return null;

    return {
      description: row.description,
      shouldDo: JSON.parse(row.shouldDo),
      shouldNotDo: JSON.parse(row.shouldNotDo),
      pattern: row.pattern,
      architecture: row.architecture,
    };
  }

  // ========== Clear/Delete Methods ==========

  /**
   * Clear all data from the database
   */
  clearAll(): void {
    this.drizzleDb.delete(schema.syncMetadata).run();
    this.drizzleDb.delete(schema.testMappings).run();
    this.drizzleDb.delete(schema.errorExperiences).run();
    this.drizzleDb.delete(schema.contracts).run();
    this.drizzleDb.delete(schema.responsibilities).run();
    this.drizzleDb.delete(schema.decisionRecords).run();
    this.drizzleDb.delete(schema.futurePlans).run();
    this.drizzleDb.delete(schema.unifiedRelationships).run();
    this.drizzleDb.delete(schema.dependencies).run();
    this.drizzleDb.delete(schema.enhancedDocs).run();
    this.drizzleDb.delete(schema.symbols).run();
  }

  /**
   * Delete symbols by file path
   * @param filePath - Path to the file
   * @returns Number of deleted symbols
   */
  deleteSymbolsByFile(filePath: string): number {
    const result = this.drizzleDb
      .delete(schema.symbols)
      .where(eq(schema.symbols.filePath, filePath))
      .run();
    return result.changes;
  }

  /**
   * Get Drizzle DB instance for advanced queries
   */
  getDrizzle() {
    return this.drizzleDb;
  }

  /**
   * Get schema for advanced queries
   */
  getSchema() {
    return schema;
  }

  // ========== Task Methods ==========

  /**
   * Ensure tasks table exists
   * @deprecated Tasks table is now created in schema.sql via initializeSchema()
   * This method is kept for backwards compatibility with existing code.
   */
  ensureTasksTable(): void {
    // No-op: Tasks table is created in schema.sql during initializeSchema()
    // This method is kept for backwards compatibility
  }

  /**
   * Insert a task
   * @param task - Task object to insert
   */
  insertTask(task: {
    id: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    type: string;
    assignedTo?: string;
    symbolId?: string;
    filePath?: string;
    line?: number;
    estimatedHours?: number;
    actualHours?: number;
    dueDate?: string;
    parentId?: string;
    dependencies?: string[];
    tags?: string[];
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
    notes?: string;
  }): void {
    this.drizzleDb.insert(schema.tasks).values({
      id: task.id,
      title: task.title,
      description: task.description ?? null,
      status: task.status,
      priority: task.priority,
      type: task.type,
      assignedTo: task.assignedTo ?? null,
      symbolId: task.symbolId ?? null,
      filePath: task.filePath ?? null,
      line: task.line ?? null,
      estimatedHours: task.estimatedHours ?? null,
      actualHours: task.actualHours ?? null,
      dueDate: task.dueDate ?? null,
      parentId: task.parentId ?? null,
      dependencies: task.dependencies ? JSON.stringify(task.dependencies) : null,
      tags: task.tags ? JSON.stringify(task.tags) : null,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      completedAt: task.completedAt ?? null,
      notes: task.notes ?? null,
    }).run();
  }

  /**
   * Get task by ID
   * @param id - Task ID
   * @returns Task row or null if not found
   */
  getTaskById(id: string): schema.TaskRow | null {
    const row = this.drizzleDb
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.id, id))
      .get();
    return row ?? null;
  }

  /**
   * Update a task
   * @param id - Task ID
   * @param updates - Fields to update
   */
  updateTask(id: string, updates: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    type?: string;
    assignedTo?: string;
    estimatedHours?: number;
    actualHours?: number;
    dueDate?: string;
    tags?: string[];
    updatedAt: string;
    completedAt?: string;
    notes?: string;
  }): void {
    const values: Record<string, unknown> = {
      updatedAt: updates.updatedAt,
    };
    if (updates.title !== undefined) values.title = updates.title;
    if (updates.description !== undefined) values.description = updates.description;
    if (updates.status !== undefined) values.status = updates.status;
    if (updates.priority !== undefined) values.priority = updates.priority;
    if (updates.type !== undefined) values.type = updates.type;
    if (updates.assignedTo !== undefined) values.assignedTo = updates.assignedTo;
    if (updates.estimatedHours !== undefined) values.estimatedHours = updates.estimatedHours;
    if (updates.actualHours !== undefined) values.actualHours = updates.actualHours;
    if (updates.dueDate !== undefined) values.dueDate = updates.dueDate;
    if (updates.tags !== undefined) values.tags = JSON.stringify(updates.tags);
    if (updates.completedAt !== undefined) values.completedAt = updates.completedAt;
    if (updates.notes !== undefined) values.notes = updates.notes;

    this.drizzleDb
      .update(schema.tasks)
      .set(values)
      .where(eq(schema.tasks.id, id))
      .run();
  }

  /**
   * Delete a task
   * @param id - Task ID
   * @returns True if deleted successfully
   */
  deleteTask(id: string): boolean {
    const result = this.drizzleDb
      .delete(schema.tasks)
      .where(eq(schema.tasks.id, id))
      .run();
    return result.changes > 0;
  }

  /**
   * Get all tasks
   */
  getAllTasks(): schema.TaskRow[] {
    return this.drizzleDb
      .select()
      .from(schema.tasks)
      .orderBy(desc(schema.tasks.priority), asc(schema.tasks.dueDate), desc(schema.tasks.createdAt))
      .all();
  }

  /**
   * Get tasks with dynamic filters
   * @param filter - Filter options (status, priority, type, assignedTo, symbolId, due dates)
   * @returns Array of matching task rows
   */
  getTasksWithFilters(filter?: {
    status?: string | string[];
    priority?: string | string[];
    type?: string | string[];
    assignedTo?: string;
    symbolId?: string;
    dueBefore?: string;
    dueAfter?: string;
  }): schema.TaskRow[] {
    let query = this.drizzleDb.select().from(schema.tasks).$dynamic();

    if (filter?.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      query = query.where(inArray(schema.tasks.status, statuses));
    }

    if (filter?.priority) {
      const priorities = Array.isArray(filter.priority) ? filter.priority : [filter.priority];
      query = query.where(inArray(schema.tasks.priority, priorities));
    }

    if (filter?.type) {
      const types = Array.isArray(filter.type) ? filter.type : [filter.type];
      query = query.where(inArray(schema.tasks.type, types));
    }

    if (filter?.assignedTo) {
      query = query.where(eq(schema.tasks.assignedTo, filter.assignedTo));
    }

    if (filter?.symbolId) {
      query = query.where(eq(schema.tasks.symbolId, filter.symbolId));
    }

    if (filter?.dueBefore) {
      query = query.where(lte(schema.tasks.dueDate, filter.dueBefore));
    }

    if (filter?.dueAfter) {
      query = query.where(gte(schema.tasks.dueDate, filter.dueAfter));
    }

    return query
      .orderBy(desc(schema.tasks.priority), asc(schema.tasks.dueDate), desc(schema.tasks.createdAt))
      .all();
  }

  // ==========================================
  // Command Helper Methods
  // ==========================================

  /**
   * Check if symbol exists by ID
   * @param id - Symbol ID
   * @returns True if symbol exists
   */
  symbolExists(id: string): boolean {
    const result = this.drizzleDb
      .select({ id: schema.symbols.id })
      .from(schema.symbols)
      .where(eq(schema.symbols.id, id))
      .get();
    return !!result;
  }

  /**
   * Find symbols by name (exact, case-insensitive, or partial match)
   * @param name - Symbol name to search for
   * @returns Array of matching symbol rows
   */
  findSymbolsByNamePattern(name: string): SymbolRow[] {
    // Try exact match first
    let rows = this.drizzleDb
      .select()
      .from(schema.symbols)
      .where(or(eq(schema.symbols.name, name), like(schema.symbols.name, `${name}.%`)))
      .all();

    // Try case-insensitive match if no results
    if (rows.length === 0) {
      const lowerName = name.toLowerCase();
      rows = this.drizzleDb
        .select()
        .from(schema.symbols)
        .where(or(
          sql`LOWER(${schema.symbols.name}) = ${lowerName}`,
          sql`LOWER(${schema.symbols.name}) LIKE ${lowerName + '.%'}`
        ))
        .all();
    }

    // Try partial match if still no results
    if (rows.length === 0) {
      rows = this.drizzleDb
        .select()
        .from(schema.symbols)
        .where(sql`LOWER(${schema.symbols.name}) LIKE ${'%' + name.toLowerCase() + '%'}`)
        .orderBy(sql`LENGTH(${schema.symbols.name})`)
        .limit(20)
        .all();
    }

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      file_path: row.filePath,
      line: row.line,
      column: row.column,
      is_exported: row.isExported ? 1 : 0,
      is_public: row.isPublic ? 1 : 0,
      summary: row.summary,
      declared_type: row.declaredType,
      inferred_type: row.inferredType,
      generic_params: row.genericParams,
      parameter_types: row.parameterTypes,
      is_constant: row.isConstant ? 1 : 0,
      literal_value: row.literalValue,
      value_type: row.valueType,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
      version: row.version,
      jsonl_line: row.jsonlLine,
    }));
  }

  /**
   * Find methods/functions by partial name match
   * Specifically searches for method and function types
   * @param methodName - Method name to search (can be partial)
   * @returns Array of matching method symbols
   */
  findMethodsByNamePart(methodName: string): SymbolRow[] {
    const lowerName = methodName.toLowerCase();

    // Search for methods/functions where the name ends with the method name
    // e.g., searching "getSymbol" finds "DatabaseManager.getSymbol"
    const rows = this.drizzleDb
      .select()
      .from(schema.symbols)
      .where(
        and(
          or(eq(schema.symbols.type, 'method'), eq(schema.symbols.type, 'function')),
          or(
            sql`LOWER(${schema.symbols.name}) = ${lowerName}`,
            sql`LOWER(${schema.symbols.name}) LIKE ${'%.' + lowerName}`
          )
        )
      )
      .orderBy(schema.symbols.name)
      .limit(50)
      .all();

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      file_path: row.filePath,
      line: row.line,
      column: row.column,
      is_exported: row.isExported ? 1 : 0,
      is_public: row.isPublic ? 1 : 0,
      summary: row.summary,
      declared_type: row.declaredType,
      inferred_type: row.inferredType,
      generic_params: row.genericParams,
      parameter_types: row.parameterTypes,
      is_constant: row.isConstant ? 1 : 0,
      literal_value: row.literalValue,
      value_type: row.valueType,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
      version: row.version,
      jsonl_line: row.jsonlLine,
    }));
  }

  /**
   * Get symbol IDs by file path
   * @param filePath - Path to the source file
   * @returns Array of symbol IDs
   */
  getSymbolIdsByFilePath(filePath: string): string[] {
    const rows = this.drizzleDb
      .select({ id: schema.symbols.id })
      .from(schema.symbols)
      .where(eq(schema.symbols.filePath, filePath))
      .all();
    return rows.map((r) => r.id);
  }

  /**
   * Get symbol file path by ID
   * @param id - Symbol ID
   * @returns File path or null if not found
   */
  getSymbolFilePath(id: string): string | null {
    const result = this.drizzleDb
      .select({ filePath: schema.symbols.filePath })
      .from(schema.symbols)
      .where(eq(schema.symbols.id, id))
      .get();
    return result?.filePath ?? null;
  }

  /**
   * Get dependency targets for a symbol
   * @param symbolId - ID of the symbol
   * @returns Array of target symbol IDs
   */
  getDependencyTargets(symbolId: string): string[] {
    const rows = this.drizzleDb
      .select({ target: schema.dependencies.target })
      .from(schema.dependencies)
      .where(eq(schema.dependencies.symbolId, symbolId))
      .all();
    return rows.map((r) => r.target);
  }

  /**
   * Get all relationships with from/to symbols
   */
  getAllRelationshipsForValidation(): Array<{
    id: string;
    fromSymbols: string;
    toSymbols: string;
  }> {
    return this.drizzleDb
      .select({
        id: schema.unifiedRelationships.id,
        fromSymbols: schema.unifiedRelationships.fromSymbols,
        toSymbols: schema.unifiedRelationships.toSymbols,
      })
      .from(schema.unifiedRelationships)
      .all();
  }

  /**
   * Find duplicate relationships
   */
  findDuplicateRelationships(): Array<{
    type: string;
    fromSymbols: string;
    toSymbols: string;
    count: number;
  }> {
    const rows = this.db
      .prepare(
        `
        SELECT
          type,
          from_symbols,
          to_symbols,
          COUNT(*) as count
        FROM unified_relationships
        GROUP BY type, from_symbols, to_symbols
        HAVING COUNT(*) > 1
      `
      )
      .all() as Array<{
      type: string;
      from_symbols: string;
      to_symbols: string;
      count: number;
    }>;

    return rows.map((r) => ({
      type: r.type,
      fromSymbols: r.from_symbols,
      toSymbols: r.to_symbols,
      count: r.count,
    }));
  }

  /**
   * Get low confidence relationships
   * @param threshold - Maximum confidence value to include
   * @returns Array of relationship objects with low confidence
   */
  getLowConfidenceRelationships(threshold: number): Array<{
    id: string;
    type: string;
    confidence: number;
  }> {
    return this.drizzleDb
      .select({
        id: schema.unifiedRelationships.id,
        type: schema.unifiedRelationships.type,
        confidence: schema.unifiedRelationships.confidence,
      })
      .from(schema.unifiedRelationships)
      .where(lte(schema.unifiedRelationships.confidence, threshold))
      .orderBy(asc(schema.unifiedRelationships.confidence))
      .all();
  }

  /**
   * Get bidirectional relationships
   */
  getBidirectionalRelationships(): Array<{
    id: string;
    type: string;
    fromSymbols: string;
    toSymbols: string;
  }> {
    return this.drizzleDb
      .select({
        id: schema.unifiedRelationships.id,
        type: schema.unifiedRelationships.type,
        fromSymbols: schema.unifiedRelationships.fromSymbols,
        toSymbols: schema.unifiedRelationships.toSymbols,
      })
      .from(schema.unifiedRelationships)
      .where(eq(schema.unifiedRelationships.direction, 'bidirectional'))
      .all();
  }

  /**
   * Check if reverse relationship exists
   * @param type - Relationship type
   * @param fromSymbols - Original from symbols (becomes to)
   * @param toSymbols - Original to symbols (becomes from)
   * @returns True if reverse relationship exists
   */
  hasReverseRelationship(type: string, fromSymbols: string, toSymbols: string): boolean {
    const result = this.drizzleDb
      .select({ id: schema.unifiedRelationships.id })
      .from(schema.unifiedRelationships)
      .where(
        and(
          eq(schema.unifiedRelationships.type, type),
          eq(schema.unifiedRelationships.fromSymbols, toSymbols),
          eq(schema.unifiedRelationships.toSymbols, fromSymbols)
        )
      )
      .get();
    return !!result;
  }

  /**
   * Count incoming calls for a symbol (for dead code detection)
   * @param symbolId - ID of the symbol
   * @returns Number of incoming call relationships
   */
  countIncomingCalls(symbolId: string): number {
    const result = this.drizzleDb
      .select({ count: sql<number>`COUNT(*)` })
      .from(schema.unifiedRelationships)
      .where(
        and(
          eq(schema.unifiedRelationships.type, 'calls'),
          like(schema.unifiedRelationships.toSymbols, `%"${symbolId}"%`)
        )
      )
      .get();
    return result?.count ?? 0;
  }

  /**
   * Count all incoming references for a symbol (for dead code detection)
   * @param symbolId - ID of the symbol
   * @returns Number of incoming reference relationships
   */
  countIncomingReferences(symbolId: string): number {
    const result = this.drizzleDb
      .select({ count: sql<number>`COUNT(*)` })
      .from(schema.unifiedRelationships)
      .where(
        and(
          inArray(schema.unifiedRelationships.type, [
            'code-dependency',
            'calls',
            'inheritance',
            'type-dependency',
          ]),
          like(schema.unifiedRelationships.toSymbols, `%"${symbolId}"%`)
        )
      )
      .get();
    return result?.count ?? 0;
  }

  /**
   * Get caller file paths for a symbol (for dead code detection)
   * @param symbolId - ID of the symbol
   * @returns Array of file paths that call this symbol
   */
  getCallerFilePaths(symbolId: string): string[] {
    const rows = this.db
      .prepare(
        `SELECT s.file_path
         FROM unified_relationships r
         JOIN symbols s ON json_extract(r.from_symbols, '$[0]') = s.id
         WHERE r.type = 'calls' AND r.to_symbols LIKE ?`
      )
      .all(`%"${symbolId}"%`) as Array<{ file_path: string }>;
    return rows.map((r) => r.file_path);
  }

  /**
   * Check if test_mappings table exists
   */
  hasTestMappingsTable(): boolean {
    const result = this.db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='test_mappings'`)
      .get();
    return !!result;
  }

  /**
   * Get test mappings with symbol info
   */
  getTestMappingsWithSymbols(): Array<{
    symbolId: string;
    testFilePath: string;
    testName: string;
  }> {
    return this.drizzleDb
      .select({
        symbolId: schema.testMappings.symbolId,
        testFilePath: schema.testMappings.testFilePath,
        testName: schema.testMappings.testName,
      })
      .from(schema.testMappings)
      .all();
  }

  /**
   * Find symbol by ID with type filter
   * @param symbolId - ID of the symbol
   * @param types - Array of allowed symbol types
   * @returns Symbol or null if not found or type mismatch
   */
  findSymbolByIdWithType(symbolId: string, types: string[]): schema.Symbol | null {
    return (
      this.drizzleDb
        .select()
        .from(schema.symbols)
        .where(and(eq(schema.symbols.id, symbolId), inArray(schema.symbols.type, types)))
        .get() ?? null
    );
  }

  /**
   * Find symbol by name and optional file pattern with type filter
   * @param name - Symbol name
   * @param types - Array of allowed symbol types
   * @param filePattern - Optional file path pattern to filter by
   * @returns Symbol or null if not found
   */
  findSymbolByNameWithType(
    name: string,
    types: string[],
    filePattern?: string
  ): schema.Symbol | null {
    let conditions = and(eq(schema.symbols.name, name), inArray(schema.symbols.type, types));

    if (filePattern) {
      conditions = and(conditions, like(schema.symbols.filePath, `%${filePattern}%`));
    }

    return this.drizzleDb.select().from(schema.symbols).where(conditions).get() ?? null;
  }
}
