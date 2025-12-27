/**
 * Tests for LSP StatementManager
 */

import { StatementManager } from '../../lsp/statement-manager';
import Database from 'better-sqlite3';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('StatementManager', () => {
  let db: Database.Database;
  let stmtManager: StatementManager;
  let tempDbPath: string;

  beforeEach(() => {
    tempDbPath = path.join(os.tmpdir(), `test-stmt-${Date.now()}.db`);
    db = new Database(tempDbPath);
    db.exec('CREATE TABLE test (id TEXT PRIMARY KEY, value TEXT)');
    stmtManager = new StatementManager(db, { maxStatements: 5 });
  });

  afterEach(() => {
    stmtManager.dispose();
    db.close();
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
  });

  describe('prepare', () => {
    it('should prepare and cache statements', () => {
      const stmt1 = stmtManager.prepare('insert', 'INSERT INTO test (id, value) VALUES (?, ?)');
      const stmt2 = stmtManager.prepare('insert', 'INSERT INTO test (id, value) VALUES (?, ?)');

      // Same key should return cached statement
      expect(stmt1).toBe(stmt2);
    });

    it('should execute prepared statements', () => {
      const insertStmt = stmtManager.prepare('insert', 'INSERT INTO test (id, value) VALUES (?, ?)');
      insertStmt.run('1', 'hello');

      const selectStmt = stmtManager.prepare('select', 'SELECT * FROM test WHERE id = ?');
      const result = selectStmt.get('1') as { id: string; value: string };

      expect(result.id).toBe('1');
      expect(result.value).toBe('hello');
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used statements when max is reached', () => {
      // Create more statements than maxStatements
      for (let i = 0; i < 7; i++) {
        stmtManager.prepare(`stmt${i}`, `SELECT * FROM test WHERE id = '${i}'`);
      }

      // Stats should show evictions or max size enforcement
      const stats = stmtManager.getStats();
      expect(stats.size).toBeLessThanOrEqual(5);
    });
  });

  describe('dispose', () => {
    it('should clear all cached statements', () => {
      stmtManager.prepare('test', 'SELECT 1');
      stmtManager.dispose();

      const stats = stmtManager.getStats();
      expect(stats.size).toBe(0);
    });
  });
});
