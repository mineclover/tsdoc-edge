/**
 * TsdocEdgeService Tests
 *
 * @packageDocumentation
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { TsdocEdgeService } from '../lsp/service';

describe('TsdocEdgeService', () => {
  let tempDir: string;
  let dbPath: string;
  let service: TsdocEdgeService | null = null;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-service-test-'));
    const tsdocDir = path.join(tempDir, '.tsdoc');
    fs.mkdirSync(tsdocDir, { recursive: true });
    dbPath = path.join(tsdocDir, 'symbols.db');
  });

  afterEach(() => {
    if (service) {
      service.close();
      service = null;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should initialize without database', () => {
      service = new TsdocEdgeService(tempDir);
      // Should not throw
      expect(service).toBeDefined();
    });

    it('should initialize with database', () => {
      // Create a minimal SQLite database
      const Database = require('better-sqlite3');
      const db = new Database(dbPath);
      db.exec(`
        CREATE TABLE IF NOT EXISTS symbols (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          file_path TEXT NOT NULL,
          line INTEGER NOT NULL,
          column INTEGER NOT NULL,
          is_exported BOOLEAN NOT NULL,
          is_public BOOLEAN NOT NULL,
          summary TEXT,
          declared_type TEXT,
          inferred_type TEXT,
          generic_params TEXT,
          parameter_types TEXT,
          is_constant BOOLEAN DEFAULT 0,
          literal_value TEXT,
          value_type TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          version TEXT NOT NULL,
          jsonl_line INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS unified_relationships (
          id INTEGER PRIMARY KEY,
          from_symbols TEXT,
          to_symbols TEXT,
          type TEXT,
          category TEXT,
          properties TEXT,
          file_path TEXT,
          line INTEGER
        );
      `);
      db.close();

      service = new TsdocEdgeService(tempDir);
      expect(service).toBeDefined();
    });
  });

  describe('with database', () => {
    let db: any;

    beforeEach(() => {
      const Database = require('better-sqlite3');
      db = new Database(dbPath);
      db.exec(`
        CREATE TABLE IF NOT EXISTS symbols (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          file_path TEXT NOT NULL,
          line INTEGER NOT NULL,
          column INTEGER NOT NULL,
          is_exported BOOLEAN NOT NULL,
          is_public BOOLEAN NOT NULL,
          summary TEXT,
          declared_type TEXT,
          inferred_type TEXT,
          generic_params TEXT,
          parameter_types TEXT,
          is_constant BOOLEAN DEFAULT 0,
          literal_value TEXT,
          value_type TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          version TEXT NOT NULL,
          jsonl_line INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS unified_relationships (
          id INTEGER PRIMARY KEY,
          from_symbols TEXT,
          to_symbols TEXT,
          type TEXT,
          category TEXT,
          properties TEXT,
          file_path TEXT,
          line INTEGER
        );
      `);

      // Insert test data
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO symbols (id, name, type, file_path, line, column, is_exported, is_public, summary, created_at, updated_at, version, jsonl_line)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('test-class', 'TestClass', 'class', 'src/test.ts', 10, 1, 1, 1, 'Test class summary', now, now, '1.0.0', 1);

      db.prepare(`
        INSERT INTO symbols (id, name, type, file_path, line, column, is_exported, is_public, summary, created_at, updated_at, version, jsonl_line)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('test-function', 'testFunction', 'function', 'src/test.ts', 20, 1, 1, 1, 'Test function', now, now, '1.0.0', 2);

      db.prepare(`
        INSERT INTO unified_relationships (from_symbols, to_symbols, type, category, file_path, line)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('["test-class"]', '["test-function"]', 'calls', 'behavioral', 'src/test.ts', 15);

      db.close();
    });

    describe('getHoverInfo', () => {
      it('should return hover info for symbol', () => {
        service = new TsdocEdgeService(tempDir);
        const hover = service.getHoverInfo('src/test.ts', 10, 1);

        expect(hover).not.toBeNull();
        expect(hover).toContain('TestClass');
        expect(hover).toContain('class');
      });

      it('should return null for unknown position', () => {
        service = new TsdocEdgeService(tempDir);
        const hover = service.getHoverInfo('src/unknown.ts', 1, 1);

        expect(hover).toBeNull();
      });
    });

    describe('getCodeLenses', () => {
      it('should return code lenses for file', () => {
        service = new TsdocEdgeService(tempDir);
        const lenses = service.getCodeLenses('src/test.ts');

        expect(Array.isArray(lenses)).toBe(true);
      });

      it('should return empty array for unknown file', () => {
        service = new TsdocEdgeService(tempDir);
        const lenses = service.getCodeLenses('src/unknown.ts');

        expect(lenses).toEqual([]);
      });
    });

    describe('searchSymbols', () => {
      it('should find symbols by name', () => {
        service = new TsdocEdgeService(tempDir);
        const results = service.searchSymbols('Test');

        expect(results.length).toBeGreaterThan(0);
        expect(results.some((r) => r.name === 'TestClass')).toBe(true);
      });

      it('should return empty for no matches', () => {
        service = new TsdocEdgeService(tempDir);
        const results = service.searchSymbols('NonExistentSymbol');

        expect(results).toEqual([]);
      });
    });

    describe('getDiagnostics', () => {
      it('should return diagnostics for file', () => {
        service = new TsdocEdgeService(tempDir);
        const diagnostics = service.getDiagnostics('src/test.ts');

        expect(Array.isArray(diagnostics)).toBe(true);
      });
    });

    describe('findSymbolByName', () => {
      it('should find symbol by exact name', () => {
        service = new TsdocEdgeService(tempDir);
        const symbol = service.findSymbolByName('TestClass');

        expect(symbol).not.toBeNull();
        expect(symbol?.name).toBe('TestClass');
        expect(symbol?.type).toBe('class');
      });

      it('should find symbol by case-insensitive match', () => {
        service = new TsdocEdgeService(tempDir);
        const symbol = service.findSymbolByName('testclass');

        expect(symbol).not.toBeNull();
        expect(symbol?.name).toBe('TestClass');
      });

      it('should return null for non-existent symbol', () => {
        service = new TsdocEdgeService(tempDir);
        const symbol = service.findSymbolByName('NonExistent');

        expect(symbol).toBeNull();
      });
    });

    describe('getSymbolAtPosition', () => {
      it('should return symbol at position', () => {
        service = new TsdocEdgeService(tempDir);
        const symbol = service.getSymbolAtPosition('src/test.ts', 10);

        expect(symbol).not.toBeNull();
        expect(symbol?.name).toBe('TestClass');
      });
    });

    describe('getImpactAnalysis', () => {
      it('should return impact analysis', () => {
        service = new TsdocEdgeService(tempDir);
        const impact = service.getImpactAnalysis('test-class');

        expect(impact).toHaveProperty('downstream');
        expect(impact).toHaveProperty('upstream');
        expect(impact).toHaveProperty('symbols');
      });
    });

    describe('getRelatedSymbols', () => {
      it('should return related symbols', () => {
        service = new TsdocEdgeService(tempDir);
        const related = service.getRelatedSymbols('test-class');

        expect(Array.isArray(related)).toBe(true);
      });
    });
  });

  describe('invalidateCache', () => {
    it('should clear all caches', () => {
      service = new TsdocEdgeService(tempDir);
      // Should not throw
      service.invalidateCache();
    });
  });

  describe('invalidateFileCache', () => {
    it('should clear cache for specific file', () => {
      service = new TsdocEdgeService(tempDir);
      // Should not throw
      service.invalidateFileCache('src/test.ts');
    });
  });

  describe('incremental mode', () => {
    beforeEach(() => {
      const Database = require('better-sqlite3');
      const db = new Database(dbPath);
      db.exec(`
        CREATE TABLE IF NOT EXISTS symbols (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          file_path TEXT NOT NULL,
          line INTEGER NOT NULL,
          column INTEGER NOT NULL,
          is_exported BOOLEAN NOT NULL,
          is_public BOOLEAN NOT NULL,
          summary TEXT,
          declared_type TEXT,
          inferred_type TEXT,
          generic_params TEXT,
          parameter_types TEXT,
          is_constant BOOLEAN DEFAULT 0,
          literal_value TEXT,
          value_type TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          version TEXT NOT NULL,
          jsonl_line INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS unified_relationships (
          id INTEGER PRIMARY KEY,
          from_symbols TEXT,
          to_symbols TEXT,
          type TEXT,
          category TEXT,
          properties TEXT,
          file_path TEXT,
          line INTEGER
        );
      `);
      db.close();
    });

    it('should enable incremental mode', () => {
      service = new TsdocEdgeService(tempDir);
      const enabled = service.enableIncrementalMode();

      expect(enabled).toBe(true);
      expect(service.isIncrementalModeEnabled()).toBe(true);
    });

    it('should return false when database not found', () => {
      fs.rmSync(dbPath);
      service = new TsdocEdgeService(tempDir);
      const enabled = service.enableIncrementalMode();

      expect(enabled).toBe(false);
    });

    it('should process file changes in incremental mode', () => {
      // Create a test TypeScript file
      const testFile = path.join(tempDir, 'src', 'incremental.ts');
      fs.mkdirSync(path.dirname(testFile), { recursive: true });
      fs.writeFileSync(testFile, 'export class IncrementalClass {}');

      service = new TsdocEdgeService(tempDir);
      service.enableIncrementalMode();

      const result = service.processFileChange(testFile);

      expect(result).not.toBeNull();
      expect(result?.symbols.length).toBeGreaterThan(0);
    });

    it('should ignore non-TypeScript files', () => {
      service = new TsdocEdgeService(tempDir);
      service.enableIncrementalMode();

      const result = service.processFileChange('/path/to/file.js');

      expect(result).toBeNull();
    });

    it('should handle file deletion', () => {
      service = new TsdocEdgeService(tempDir);
      service.enableIncrementalMode();

      const count = service.handleFileDelete('/path/to/deleted.ts');

      expect(typeof count).toBe('number');
    });
  });

  describe('close', () => {
    it('should cleanup resources', () => {
      service = new TsdocEdgeService(tempDir);
      // Should not throw
      service.close();
      service = null;
    });
  });
});
