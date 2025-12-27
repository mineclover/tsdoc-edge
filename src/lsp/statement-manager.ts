/**
 * LSP Statement Manager
 *
 * Manages SQLite prepared statements with LRU eviction
 * to prevent unbounded memory growth.
 *
 * @packageDocumentation
 * @module lsp/statement-manager
 * @internal

 * @doc [[statement-manager]] */

import type { SqliteDatabase, SqliteStatement } from '../types/database';

/**
 * Statement entry with usage tracking
 * @internal
 */
interface StatementEntry {
  /** Prepared statement object */
  statement: SqliteStatement;
  /** Last access timestamp for LRU */
  lastUsed: number;
}

/**
 * Configuration options for StatementManager
 * @internal
 */
export interface StatementManagerOptions {
  /** Maximum number of cached statements (default: 50) */
  maxStatements?: number;
}

/**
 * Manages SQLite prepared statements with LRU eviction
 *
 * Prevents memory leaks from unbounded statement caching
 * by enforcing a maximum size and using LRU eviction.
 *
 * @example
 * ```typescript
 * const stmtManager = new StatementManager(db, { maxStatements: 30 });
 * const stmt = stmtManager.prepare('selectSymbol', 'SELECT * FROM symbols WHERE id = ?');
 * const result = stmt.get('symbol-123');
 * stmtManager.dispose();
 * ```
 *
 * @internal
 */
export class StatementManager {
  /** Database connection */
  private db: SqliteDatabase | null;

  /** Maximum cached statements */
  private readonly maxStatements: number;

  /** Statement cache */
  private readonly statements = new Map<string, StatementEntry>();

  /**
   * Creates a new StatementManager instance
   *
   * @param db - SQLite database connection (better-sqlite3)
   * @param options - Configuration options
   */
  constructor(db: SqliteDatabase | null, options: StatementManagerOptions = {}) {
    this.db = db;
    this.maxStatements = options.maxStatements ?? 50;
  }

  /**
   * Get or create a prepared statement
   *
   * @param name - Unique identifier for the statement
   * @param sql - SQL query string
   * @returns Prepared statement or null if database is not connected
   */
  prepare(name: string, sql: string): SqliteStatement | null {
    if (!this.db) return null;

    const existing = this.statements.get(name);
    if (existing) {
      // Update last used time
      existing.lastUsed = Date.now();
      return existing.statement;
    }

    // Enforce size limit before adding
    if (this.statements.size >= this.maxStatements) {
      this.evictLRU();
    }

    try {
      const statement = this.db.prepare(sql);
      this.statements.set(name, {
        statement,
        lastUsed: Date.now(),
      });
      return statement;
    } catch (error) {
      console.error(`Failed to prepare statement "${name}": ${error}`);
      return null;
    }
  }

  /**
   * Execute a one-off query without caching
   *
   * Use this for dynamic queries that shouldn't be cached.
   *
   * @param sql - SQL query string
   * @returns Prepared statement for immediate use, or null
   */
  prepareOnce(sql: string): SqliteStatement | null {
    if (!this.db) return null;

    try {
      return this.db.prepare(sql);
    } catch (error) {
      console.error(`Failed to prepare one-off statement: ${error}`);
      return null;
    }
  }

  /**
   * Check if a statement is cached
   *
   * @param name - Statement name
   * @returns True if statement exists in cache
   */
  has(name: string): boolean {
    return this.statements.has(name);
  }

  /**
   * Remove a specific statement from cache
   *
   * @param name - Statement name to remove
   * @returns void - No return value
   */
  remove(name: string): void {
    this.statements.delete(name);
  }

  /**
   * Get cache statistics
   *
   * @returns Object with cache info
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.statements.size,
      maxSize: this.maxStatements,
    };
  }

  /**
   * Clear all cached statements
   * @returns void - No return value
   */
  clear(): void {
    this.statements.clear();
  }

  /**
   * Dispose the manager and release resources
   * @returns void - No return value
   */
  dispose(): void {
    this.statements.clear();
    this.db = null;
  }

  /**
   * Update database reference (e.g., after reconnection)
   *
   * @param db - New database connection
   * @returns void - No return value
   */
  setDatabase(db: SqliteDatabase | null): void {
    // Clear existing statements as they're bound to old connection
    this.statements.clear();
    this.db = db;
  }

  /**
   * Evict least recently used statement
   * @internal
   */
  private evictLRU(): void {
    if (this.statements.size === 0) return;

    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.statements.entries()) {
      if (entry.lastUsed < oldestTime) {
        oldestTime = entry.lastUsed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.statements.delete(oldestKey);
    }
  }
}
