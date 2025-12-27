/**
 * Database type definitions
 *
 * Provides type definitions for SQLite database operations
 * to replace `any` types with more specific types.
 *
 * @packageDocumentation
 */

/**
 * Transaction function type
 * @public
 */
export type SqliteTransactionFunction<T> = () => T;

/**
 * SQLite Database interface (subset of better-sqlite3)
 * @public
 */
export interface SqliteDatabase {
  /** Whether the database is in-memory */
  memory: boolean;
  /** Whether the database is read-only */
  readonly: boolean;
  /** Database file name */
  name: string;
  /** Whether the database is open */
  open: boolean;
  /** Whether currently in a transaction */
  inTransaction: boolean;

  /**
   * Prepare a SQL statement
   * @param source - SQL query string
   * @returns Prepared statement
   */
  prepare(source: string): SqliteStatement;

  /**
   * Execute raw SQL
   * @param source - SQL to execute
   */
  exec(source: string): this;

  /**
   * Close the database connection
   */
  close(): this;

  /**
   * Create a transaction function
   * @param fn - Function to run in transaction
   * @returns Transaction function
   */
  transaction<T>(fn: SqliteTransactionFunction<T>): SqliteTransactionFunction<T>;
}

/**
 * SQLite Statement interface (subset of better-sqlite3)
 * @public
 */
export interface SqliteStatement {
  /** The database this statement belongs to */
  database: SqliteDatabase;
  /** Original SQL source */
  source: string;
  /** Whether this statement returns data */
  reader: boolean;
  /** Whether this statement is read-only */
  readonly: boolean;

  /**
   * Run the statement (for INSERT, UPDATE, DELETE)
   * @param params - Bind parameters
   * @returns Run result with changes count
   */
  run(...params: unknown[]): SqliteRunResult;

  /**
   * Get a single row
   * @param params - Bind parameters
   * @returns Single row or undefined
   */
  get(...params: unknown[]): unknown;

  /**
   * Get all rows
   * @param params - Bind parameters
   * @returns Array of rows
   */
  all(...params: unknown[]): unknown[];

  /**
   * Iterate over rows
   * @param params - Bind parameters
   * @returns Iterator over rows
   */
  iterate(...params: unknown[]): IterableIterator<unknown>;
}

/**
 * Result of running a statement
 * @public
 */
export interface SqliteRunResult {
  /** Number of rows changed */
  changes: number;
  /** Last inserted row ID */
  lastInsertRowid: number | bigint;
}

/**
 * Common symbol row from database queries
 * @public
 */
export interface SymbolRow {
  id: string;
  name: string;
  type: string;
  file_path: string;
  line: number;
  column?: number;
  is_exported?: number;
  is_public?: number;
  summary?: string;
  declared_type?: string;
}

/**
 * Common relationship row from database queries
 * @public
 */
export interface RelationshipRow {
  id: string;
  from_symbol: string;
  to_symbol: string;
  type: string;
  category: string;
  strength: number;
  evidence?: string;
}

/**
 * Count result from aggregate queries
 * @public
 */
export interface CountRow {
  count: number;
}

/**
 * Relationship type count row
 * @public
 */
export interface RelTypeCountRow {
  type: string;
  count: number;
}

/**
 * Unified relationship row for LSP queries
 * @public
 */
export interface UnifiedRelRow {
  id?: string;
  from_symbols: string;
  to_symbols: string;
  type: string;
  properties?: string;
  file_path?: string;
  line?: number;
}

/**
 * High impact symbol row
 * @public
 */
export interface HighImpactRow {
  id: string;
  name: string;
  line?: number;
  count: number;
}
