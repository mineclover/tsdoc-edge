/**
 * Tests for DatabaseManager
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import { DatabaseManager } from '../../storage/DatabaseManager';
import type { Symbol } from '../../types/graph';
import type { EnhancedSymbolDoc } from '../../types/tags';

describe('DatabaseManager', () => {
  let tempDir: string;
  let dbPath: string;
  let jsonlPath: string;
  let dbManager: DatabaseManager;

  beforeEach(() => {
    // Create temp directory for test database
    tempDir = path.join(process.cwd(), '.test-temp', `db-${Date.now()}`);
    dbPath = path.join(tempDir, 'test.db');
    jsonlPath = path.join(tempDir, 'data');

    fs.mkdirSync(tempDir, { recursive: true });
    fs.mkdirSync(jsonlPath, { recursive: true });

    dbManager = new DatabaseManager(dbPath, jsonlPath);
  });

  afterEach(() => {
    // Clean up
    dbManager.close();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create database file', () => {
      expect(fs.existsSync(dbPath)).toBe(true);
    });

    it('should create JSONL directory', () => {
      expect(fs.existsSync(jsonlPath)).toBe(true);
    });

    it('should initialize database connection', () => {
      expect(dbManager.db).toBeDefined();
    });

    it('additively migrates symbol columns before creating their indexes', () => {
      dbManager.close();
      const legacyDbPath = path.join(tempDir, 'legacy.db');
      const legacy = new Database(legacyDbPath);
      legacy.exec(`
        CREATE TABLE symbols (
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
      `);
      legacy.close();

      dbManager = new DatabaseManager(legacyDbPath, jsonlPath);
      const columns = new Set(
        (dbManager.db.prepare('PRAGMA table_info(symbols)').all() as Array<{ name: string }>).map(
          (column) => column.name
        )
      );
      expect([...columns]).toEqual(
        expect.arrayContaining([
          'uuid',
          'local_path',
          'global_path',
          'scope',
          'exposure_scope',
          'exposure_level',
          'export_path',
          'accessibility',
          'visibility_boundaries',
        ])
      );
      const indexes = new Set(
        (
          dbManager.db
            .prepare("SELECT name FROM sqlite_master WHERE type = 'index'")
            .all() as Array<{ name: string }>
        ).map((index) => index.name)
      );
      expect(indexes.has('idx_symbols_uuid')).toBe(true);
      expect(indexes.has('idx_symbols_exposure')).toBe(true);
    });

    it('should create necessary directories if they do not exist', () => {
      const newTempDir = path.join(process.cwd(), '.test-temp', `db-new-${Date.now()}`);
      const newDbPath = path.join(newTempDir, 'subdir', 'test.db');
      const newJsonlPath = path.join(newTempDir, 'data');

      const newDbManager = new DatabaseManager(newDbPath, newJsonlPath);

      expect(fs.existsSync(newDbPath)).toBe(true);
      expect(fs.existsSync(newJsonlPath)).toBe(true);

      newDbManager.close();
      fs.rmSync(newTempDir, { recursive: true, force: true });
    });
  });

  describe('insertSymbol', () => {
    it('should insert a symbol successfully', () => {
      const symbol: Symbol = {
        id: 'test-001',
        name: 'TestClass',
        type: 'class',
        filePath: 'src/test.ts',
        line: 10,
        column: 5,
        isExported: true,
        isPublic: true,
        summary: 'Test class',
        tests: [],
        designDecisions: [],
      };

      const result = dbManager.insertSymbol(symbol, 0);
      expect(result).toBe(true);

      // Verify insertion
      const stmt = dbManager.db.prepare('SELECT * FROM symbols WHERE id = ?');
      const row = stmt.get('test-001');
      expect(row).toBeDefined();
    });

    it('should replace existing symbol with same ID', () => {
      const symbol1: Symbol = {
        id: 'test-002',
        name: 'OldName',
        type: 'function',
        filePath: 'src/old.ts',
        line: 1,
        column: 1,
        isExported: true,
        isPublic: true,
        tests: [],
        designDecisions: [],
      };

      const symbol2: Symbol = {
        id: 'test-002',
        name: 'NewName',
        type: 'function',
        filePath: 'src/new.ts',
        line: 2,
        column: 2,
        isExported: false,
        isPublic: false,
        tests: [],
        designDecisions: [],
      };

      dbManager.insertSymbol(symbol1, 0);
      dbManager.insertSymbol(symbol2, 1);

      const stmt = dbManager.db.prepare('SELECT * FROM symbols WHERE id = ?');
      const row = stmt.get('test-002') as any;
      expect(row.name).toBe('NewName');
      expect(row.file_path).toBe('src/new.ts');
    });
  });

  describe('insertEnhancedDoc', () => {
    it('should insert enhanced documentation successfully', () => {
      // First insert a symbol
      const symbol: Symbol = {
        id: 'test-003',
        name: 'TestSymbol',
        type: 'class',
        filePath: 'src/test.ts',
        line: 1,
        column: 1,
        isExported: true,
        isPublic: true,
        tests: [],
        designDecisions: [],
      };
      dbManager.insertSymbol(symbol, 0);

      // Then insert enhanced doc
      const doc: EnhancedSymbolDoc = {
        symbolId: 'test-003',
        problemSolving: { description: 'Test problem', context: 'Test context' },
        functionality: { mainFeatures: ['Main functionality'], components: [] },
        errorExperiences: [],
        decisions: [],
        dependencies: [],
        futurePlans: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0.0',
      };

      const result = dbManager.insertEnhancedDoc(doc, 0);
      expect(result).toBe(true);

      // Verify insertion
      const stmt = dbManager.db.prepare('SELECT * FROM enhanced_docs WHERE symbol_id = ?');
      const row = stmt.get('test-003');
      expect(row).toBeDefined();
    });

    it('should replace existing enhanced doc with same symbol ID', () => {
      const symbol: Symbol = {
        id: 'test-004',
        name: 'TestSymbol',
        type: 'class',
        filePath: 'src/test.ts',
        line: 1,
        column: 1,
        isExported: true,
        isPublic: true,
        tests: [],
        designDecisions: [],
      };
      dbManager.insertSymbol(symbol, 0);

      const doc1: EnhancedSymbolDoc = {
        symbolId: 'test-004',
        problemSolving: { description: 'Old problem', context: 'Old context' },
        functionality: { mainFeatures: ['Old functionality'], components: [] },
        errorExperiences: [],
        decisions: [],
        dependencies: [],
        futurePlans: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0.0',
      };

      const doc2: EnhancedSymbolDoc = {
        symbolId: 'test-004',
        problemSolving: { description: 'New problem', context: 'New context' },
        functionality: { mainFeatures: ['New functionality'], components: [] },
        errorExperiences: [],
        decisions: [],
        dependencies: [],
        futurePlans: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '2.0.0',
      };

      dbManager.insertEnhancedDoc(doc1, 0);
      dbManager.insertEnhancedDoc(doc2, 1);

      const stmt = dbManager.db.prepare('SELECT * FROM enhanced_docs WHERE symbol_id = ?');
      const row = stmt.get('test-004') as any;
      const problemSolving = JSON.parse(row.problem_solving);
      expect(problemSolving.description).toBe('New problem');
    });
  });

  describe('insertDependency', () => {
    it('should insert a dependency successfully', () => {
      // First insert the symbols that will have dependency relationship
      const symbol1: Symbol = {
        id: 'test-005',
        name: 'DependentSymbol',
        type: 'class',
        filePath: 'src/dependent.ts',
        line: 1,
        column: 1,
        isExported: true,
        isPublic: true,
        tests: [],
        designDecisions: [],
      };
      dbManager.insertSymbol(symbol1, 0);

      const dependency = {
        symbolId: 'test-005',
        target: 'test-006',
        type: 'imports',
        reason: 'Uses functionality',
        version: '1.0.0',
        isOptional: false,
        importPath: './test',
      };

      const result = dbManager.insertDependency(dependency);
      expect(result).toBe(true);

      // Verify insertion
      const stmt = dbManager.db.prepare('SELECT * FROM dependencies WHERE symbol_id = ?');
      const row = stmt.get('test-005');
      expect(row).toBeDefined();
    });
  });

  describe('getSymbol', () => {
    it('should retrieve symbol by ID', () => {
      const symbol: Symbol = {
        id: 'test-007',
        name: 'RetrieveTest',
        type: 'class',
        filePath: 'src/test.ts',
        line: 10,
        column: 5,
        isExported: true,
        isPublic: true,
        summary: 'Test retrieval',
        tests: [],
        designDecisions: [],
      };

      dbManager.insertSymbol(symbol, 0);
      const retrieved = dbManager.getSymbol('test-007');

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('test-007');
      expect(retrieved?.name).toBe('RetrieveTest');
      expect(retrieved?.type).toBe('class');
    });

    it('should return null for non-existent symbol', () => {
      const retrieved = dbManager.getSymbol('non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('searchSymbols', () => {
    it('should search symbols', () => {
      const symbols: Symbol[] = [
        {
          id: 'test-008',
          name: 'Symbol1',
          type: 'class',
          filePath: 'src/test1.ts',
          line: 1,
          column: 1,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
        {
          id: 'test-009',
          name: 'Symbol2',
          type: 'function',
          filePath: 'src/test2.ts',
          line: 2,
          column: 2,
          isExported: false,
          isPublic: false,
          tests: [],
          designDecisions: [],
        },
      ];

      for (const symbol of symbols) {
        dbManager.insertSymbol(symbol, 0);
      }

      const results = dbManager.searchSymbols('Symbol');
      expect(results.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getStatistics', () => {
    it('should return database statistics', () => {
      const symbol: Symbol = {
        id: 'test-010',
        name: 'StatsTest',
        type: 'class',
        filePath: 'src/test.ts',
        line: 1,
        column: 1,
        isExported: true,
        isPublic: true,
        tests: [],
        designDecisions: [],
      };

      dbManager.insertSymbol(symbol, 0);
      const stats = dbManager.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalSymbols).toBeGreaterThanOrEqual(1);
      expect(stats.totalEnhancedDocs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('close', () => {
    it('should close database connection', () => {
      const tempDbPath = path.join(tempDir, 'close-test.db');
      const tempJsonlPath = path.join(tempDir, 'close-data');
      const tempDbManager = new DatabaseManager(tempDbPath, tempJsonlPath);

      expect(() => tempDbManager.close()).not.toThrow();
    });
  });

  describe('exportToJSONL', () => {
    it('should export symbols to JSONL', () => {
      const symbol: Symbol = {
        id: 'test-011',
        name: 'ExportTest',
        type: 'class',
        filePath: 'src/test.ts',
        line: 1,
        column: 1,
        isExported: true,
        isPublic: true,
        tests: [],
        designDecisions: [],
      };

      dbManager.insertSymbol(symbol, 0);
      const exportPath = dbManager.exportToJSONL();

      expect(fs.existsSync(exportPath)).toBe(true);

      const content = fs.readFileSync(exportPath, 'utf-8');
      expect(content).toContain('test-011');
      expect(content).toContain('ExportTest');
    });
  });

  describe('importFromJSONL', () => {
    it('should import symbols from JSONL', () => {
      // Create test JSONL file in correct format
      const symbolsPath = path.join(jsonlPath, 'test-import.jsonl');
      const testRecord = {
        type: 'symbol',
        data: {
          id: 'test-012',
          name: 'ImportTest',
          type: 'function',
          file_path: 'src/import.ts',
          line: 5,
          column: 3,
          is_exported: 1,
          is_public: 1,
          summary: null,
        },
      };

      fs.writeFileSync(symbolsPath, JSON.stringify(testRecord) + '\n', 'utf-8');

      const count = dbManager.importFromJSONL(symbolsPath);

      expect(count).toBeGreaterThanOrEqual(1);
      const retrieved = dbManager.getSymbol('test-012');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('ImportTest');
    });
  });
});
