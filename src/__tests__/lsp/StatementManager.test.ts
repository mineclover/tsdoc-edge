/**
 * StatementManager tests
 * @testScenario Prepare and cache statements
 * @testScenario LRU eviction when max size reached
 * @testScenario Handle null database
 * @testScenario One-off statement preparation
 * @testScenario Cache statistics
 */

import { StatementManager } from '../../lsp/statement-manager';
import type { SqliteDatabase } from '../../types/database';

describe('StatementManager', () => {
  // Mock database with required SqliteDatabase properties
  const createMockDb = (): SqliteDatabase =>
    ({
      memory: false,
      readonly: false,
      name: 'test.db',
      open: true,
      inTransaction: false,
      prepare: jest.fn((sql: string) => ({
        database: {} as SqliteDatabase,
        source: sql,
        reader: true,
        readonly: true,
        get: jest.fn(),
        all: jest.fn(),
        run: jest.fn(),
        iterate: jest.fn(),
      })),
      exec: jest.fn().mockReturnThis(),
      close: jest.fn().mockReturnThis(),
      transaction: jest.fn((fn) => fn),
    }) as unknown as SqliteDatabase;

  describe('constructor', () => {
    it('should create manager with default options', () => {
      const db = createMockDb();
      const manager = new StatementManager(db);
      expect(manager.getStats().maxSize).toBe(50);
      manager.dispose();
    });

    it('should create manager with custom maxStatements', () => {
      const db = createMockDb();
      const manager = new StatementManager(db, { maxStatements: 10 });
      expect(manager.getStats().maxSize).toBe(10);
      manager.dispose();
    });

    it('should accept null database', () => {
      const manager = new StatementManager(null);
      expect(manager).toBeDefined();
      manager.dispose();
    });
  });

  describe('prepare', () => {
    it('should create and cache a statement', () => {
      const db = createMockDb();
      const manager = new StatementManager(db);

      const stmt = manager.prepare('selectAll', 'SELECT * FROM symbols');

      expect(stmt).toBeDefined();
      expect(stmt).not.toBeNull();
      expect(stmt!.source).toBe('SELECT * FROM symbols');
      expect(db.prepare).toHaveBeenCalledWith('SELECT * FROM symbols');
      expect(manager.getStats().size).toBe(1);

      manager.dispose();
    });

    it('should return cached statement on subsequent calls', () => {
      const db = createMockDb();
      const manager = new StatementManager(db);

      const stmt1 = manager.prepare('select', 'SELECT * FROM symbols');
      const stmt2 = manager.prepare('select', 'SELECT * FROM symbols');

      expect(stmt1).toBe(stmt2);
      expect(db.prepare).toHaveBeenCalledTimes(1);

      manager.dispose();
    });

    it('should return null when database is null', () => {
      const manager = new StatementManager(null);

      const stmt = manager.prepare('select', 'SELECT * FROM symbols');

      expect(stmt).toBeNull();
      manager.dispose();
    });

    it('should handle prepare error gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const db = createMockDb();
      (db.prepare as jest.Mock).mockImplementation(() => {
        throw new Error('SQL syntax error');
      });
      const manager = new StatementManager(db);

      const stmt = manager.prepare('bad', 'INVALID SQL');

      expect(stmt).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      manager.dispose();
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest statement when maxStatements reached', async () => {
      const db = createMockDb();
      const manager = new StatementManager(db, { maxStatements: 3 });

      // Add 3 statements
      manager.prepare('stmt1', 'SELECT 1');
      await new Promise((r) => setTimeout(r, 10));
      manager.prepare('stmt2', 'SELECT 2');
      await new Promise((r) => setTimeout(r, 10));
      manager.prepare('stmt3', 'SELECT 3');

      expect(manager.getStats().size).toBe(3);
      expect(manager.has('stmt1')).toBe(true);

      // Add 4th statement - should evict stmt1
      await new Promise((r) => setTimeout(r, 10));
      manager.prepare('stmt4', 'SELECT 4');

      expect(manager.getStats().size).toBe(3);
      expect(manager.has('stmt1')).toBe(false);
      expect(manager.has('stmt4')).toBe(true);

      manager.dispose();
    });

    it('should update lastUsed on access', async () => {
      const db = createMockDb();
      const manager = new StatementManager(db, { maxStatements: 3 });

      manager.prepare('stmt1', 'SELECT 1');
      await new Promise((r) => setTimeout(r, 10));
      manager.prepare('stmt2', 'SELECT 2');
      await new Promise((r) => setTimeout(r, 10));
      manager.prepare('stmt3', 'SELECT 3');

      // Access stmt1 to update its lastUsed
      await new Promise((r) => setTimeout(r, 10));
      manager.prepare('stmt1', 'SELECT 1');

      // Add stmt4 - should evict stmt2 (oldest unused)
      await new Promise((r) => setTimeout(r, 10));
      manager.prepare('stmt4', 'SELECT 4');

      expect(manager.has('stmt1')).toBe(true);
      expect(manager.has('stmt2')).toBe(false);

      manager.dispose();
    });
  });

  describe('prepareOnce', () => {
    it('should prepare statement without caching', () => {
      const db = createMockDb();
      const manager = new StatementManager(db);

      const stmt = manager.prepareOnce('SELECT * FROM temp');

      expect(stmt).toBeDefined();
      expect(manager.getStats().size).toBe(0);

      manager.dispose();
    });

    it('should return null when database is null', () => {
      const manager = new StatementManager(null);

      const stmt = manager.prepareOnce('SELECT * FROM temp');

      expect(stmt).toBeNull();
      manager.dispose();
    });

    it('should handle error gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const db = createMockDb();
      (db.prepare as jest.Mock).mockImplementation(() => {
        throw new Error('Error');
      });
      const manager = new StatementManager(db);

      const stmt = manager.prepareOnce('INVALID');

      expect(stmt).toBeNull();
      consoleSpy.mockRestore();
      manager.dispose();
    });
  });

  describe('has', () => {
    it('should return true for cached statement', () => {
      const db = createMockDb();
      const manager = new StatementManager(db);

      manager.prepare('select', 'SELECT 1');

      expect(manager.has('select')).toBe(true);
      manager.dispose();
    });

    it('should return false for non-existent statement', () => {
      const db = createMockDb();
      const manager = new StatementManager(db);

      expect(manager.has('nonexistent')).toBe(false);
      manager.dispose();
    });
  });

  describe('remove', () => {
    it('should remove cached statement', () => {
      const db = createMockDb();
      const manager = new StatementManager(db);

      manager.prepare('select', 'SELECT 1');
      expect(manager.has('select')).toBe(true);

      manager.remove('select');
      expect(manager.has('select')).toBe(false);

      manager.dispose();
    });

    it('should handle removing non-existent statement', () => {
      const db = createMockDb();
      const manager = new StatementManager(db);

      expect(() => manager.remove('nonexistent')).not.toThrow();
      manager.dispose();
    });
  });

  describe('clear', () => {
    it('should clear all cached statements', () => {
      const db = createMockDb();
      const manager = new StatementManager(db);

      manager.prepare('stmt1', 'SELECT 1');
      manager.prepare('stmt2', 'SELECT 2');
      expect(manager.getStats().size).toBe(2);

      manager.clear();
      expect(manager.getStats().size).toBe(0);

      manager.dispose();
    });
  });

  describe('getStats', () => {
    it('should return current size and max size', () => {
      const db = createMockDb();
      const manager = new StatementManager(db, { maxStatements: 25 });

      manager.prepare('stmt1', 'SELECT 1');
      manager.prepare('stmt2', 'SELECT 2');

      const stats = manager.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(25);

      manager.dispose();
    });
  });

  describe('dispose', () => {
    it('should clear statements and nullify database', () => {
      const db = createMockDb();
      const manager = new StatementManager(db);

      manager.prepare('select', 'SELECT 1');
      manager.dispose();

      expect(manager.getStats().size).toBe(0);
      expect(manager.prepare('new', 'SELECT 2')).toBeNull();
    });
  });

  describe('setDatabase', () => {
    it('should update database reference and clear statements', () => {
      const db1 = createMockDb();
      const db2 = createMockDb();
      const manager = new StatementManager(db1);

      manager.prepare('stmt1', 'SELECT 1');
      expect(manager.getStats().size).toBe(1);

      manager.setDatabase(db2);
      expect(manager.getStats().size).toBe(0);

      manager.prepare('stmt2', 'SELECT 2');
      expect(db2.prepare).toHaveBeenCalledWith('SELECT 2');

      manager.dispose();
    });

    it('should accept null database', () => {
      const db = createMockDb();
      const manager = new StatementManager(db);

      manager.setDatabase(null);
      expect(manager.prepare('stmt', 'SELECT 1')).toBeNull();

      manager.dispose();
    });
  });
});
