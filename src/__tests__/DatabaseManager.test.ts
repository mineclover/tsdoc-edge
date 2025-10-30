/**
 * DatabaseManager tests
 * @testScenario Database initialization with schema
 * @testScenario Symbol insertion and retrieval
 * @testScenario Enhanced documentation storage
 * @testScenario Full-text search
 * @testScenario JSONL export and import
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { DatabaseManager } from '../storage/DatabaseManager';
import type { Symbol } from '../types/graph';
import type { EnhancedSymbolDoc } from '../types/tags';

describe('DatabaseManager', () => {
  let tempDir: string;
  let dbPath: string;
  let jsonlPath: string;
  let dbManager: DatabaseManager;

  beforeEach(() => {
    // Create temporary directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-db-test-'));
    dbPath = path.join(tempDir, 'test.db');
    jsonlPath = path.join(tempDir, 'data');
    dbManager = new DatabaseManager(dbPath, jsonlPath);
  });

  afterEach(() => {
    dbManager.close();
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Database Initialization', () => {
    test('should create database file', () => {
      expect(fs.existsSync(dbPath)).toBe(true);
    });

    test('should create jsonl directory', () => {
      expect(fs.existsSync(jsonlPath)).toBe(true);
    });

    test('should initialize schema', () => {
      // If this doesn't throw, schema is initialized
      const stats = dbManager.getStatistics();
      expect(stats).toBeDefined();
      expect(stats.totalSymbols).toBe(0);
    });
  });

  describe('Symbol Operations', () => {
    const testSymbol: Symbol = {
      id: 'test-001',
      name: 'TestFunction',
      type: 'function',
      filePath: 'src/test.ts',
      line: 10,
      column: 0,
      isExported: true,
      isPublic: true,
      summary: 'Test function for unit tests',
      tests: [],
      designDecisions: [],
    };

    test('should insert symbol', () => {
      const result = dbManager.insertSymbol(testSymbol, 0);
      expect(result).toBe(true);
    });

    test('should retrieve symbol by ID', () => {
      dbManager.insertSymbol(testSymbol, 0);

      const retrieved = dbManager.getSymbol('test-001');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('TestFunction');
      expect(retrieved?.type).toBe('function');
      expect(retrieved?.filePath).toBe('src/test.ts');
    });

    test('should return null for non-existent symbol', () => {
      const retrieved = dbManager.getSymbol('non-existent');
      expect(retrieved).toBeNull();
    });

    test('should update existing symbol', () => {
      dbManager.insertSymbol(testSymbol, 0);

      const updated = { ...testSymbol, summary: 'Updated summary' };
      dbManager.insertSymbol(updated, 0);

      const retrieved = dbManager.getSymbol('test-001');
      expect(retrieved?.summary).toBe('Updated summary');
    });

    test('should handle multiple symbols', () => {
      const symbol1: Symbol = { ...testSymbol, id: 'test-001' };
      const symbol2: Symbol = { ...testSymbol, id: 'test-002', name: 'TestClass' };
      const symbol3: Symbol = { ...testSymbol, id: 'test-003', name: 'TestInterface' };

      dbManager.insertSymbol(symbol1, 0);
      dbManager.insertSymbol(symbol2, 1);
      dbManager.insertSymbol(symbol3, 2);

      const stats = dbManager.getStatistics();
      expect(stats.totalSymbols).toBe(3);
    });
  });

  describe('Enhanced Documentation Operations', () => {
    const testSymbol: Symbol = {
      id: 'doc-001',
      name: 'DocumentedFunction',
      type: 'function',
      filePath: 'src/doc.ts',
      line: 10,
      column: 0,
      isExported: true,
      isPublic: true,
      summary: 'Documented function',
      tests: [],
      designDecisions: [],
    };

    const enhancedDoc: EnhancedSymbolDoc = {
      symbolId: 'doc-001',
      problemSolving: {
        description: 'Test problem description',
        context: 'Test context',
      },
      functionality: {
        mainFeatures: ['Test feature 1', 'Test feature 2'],
        components: [],
      },
      errorExperiences: [],
      decisions: [],
      dependencies: [],
      futurePlans: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0.0',
    };

    test('should insert enhanced documentation', () => {
      dbManager.insertSymbol(testSymbol, 0);
      const result = dbManager.insertEnhancedDoc(enhancedDoc, 0);
      expect(result).toBe(true);
    });

    test('should retrieve enhanced documentation', () => {
      dbManager.insertSymbol(testSymbol, 0);
      dbManager.insertEnhancedDoc(enhancedDoc, 0);

      const retrieved = dbManager.getEnhancedDoc('doc-001');
      expect(retrieved).toBeDefined();
      expect(retrieved?.symbolId).toBe('doc-001');
      expect(retrieved?.problemSolving.description).toBe('Test problem description');
    });

    test('should return null for non-existent enhanced doc', () => {
      const retrieved = dbManager.getEnhancedDoc('non-existent');
      expect(retrieved).toBeNull();
    });

    test('should update enhanced documentation', () => {
      dbManager.insertSymbol(testSymbol, 0);
      dbManager.insertEnhancedDoc(enhancedDoc, 0);

      const updated = {
        ...enhancedDoc,
        problemSolving: {
          ...enhancedDoc.problemSolving,
          description: 'Updated description',
        },
      };
      dbManager.insertEnhancedDoc(updated, 0);

      const retrieved = dbManager.getEnhancedDoc('doc-001');
      expect(retrieved?.problemSolving.description).toBe('Updated description');
    });
  });

  describe('Search Operations', () => {
    beforeEach(() => {
      const symbols: Symbol[] = [
        {
          id: 'search-001',
          name: 'parseData',
          type: 'function',
          filePath: 'src/parser.ts',
          line: 10,
          column: 0,
          isExported: true,
          isPublic: true,
          summary: 'Parse JSON data',
          tests: [],
          designDecisions: [],
        },
        {
          id: 'search-002',
          name: 'formatData',
          type: 'function',
          filePath: 'src/formatter.ts',
          line: 20,
          column: 0,
          isExported: true,
          isPublic: true,
          summary: 'Format data for display',
          tests: [],
          designDecisions: [],
        },
        {
          id: 'search-003',
          name: 'DataProcessor',
          type: 'class',
          filePath: 'src/processor.ts',
          line: 30,
          column: 0,
          isExported: true,
          isPublic: true,
          summary: 'Process and transform data',
          tests: [],
          designDecisions: [],
        },
      ];

      symbols.forEach((symbol, index) => {
        dbManager.insertSymbol(symbol, index);
      });
    });

    test('should search by name', () => {
      const results = dbManager.searchSymbols('parseData');
      expect(results.length).toBeGreaterThan(0);
      expect(results).toContain('search-001');
    });

    test('should search by partial name', () => {
      const results = dbManager.searchSymbols('Data');
      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    test('should search in summary', () => {
      const results = dbManager.searchSymbols('JSON');
      expect(results).toContain('search-001');
    });

    test('should return empty array for non-matching query', () => {
      const results = dbManager.searchSymbols('NonExistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('JSONL Export/Import', () => {
    const testSymbol: Symbol = {
      id: 'export-001',
      name: 'ExportTest',
      type: 'function',
      filePath: 'src/export.ts',
      line: 10,
      column: 0,
      isExported: true,
      isPublic: true,
      summary: 'Export test function',
      tests: [],
      designDecisions: [],
    };

    const enhancedDoc: EnhancedSymbolDoc = {
      symbolId: 'export-001',
      problemSolving: {
        description: 'Export problem description',
        context: 'Export context',
      },
      functionality: {
        mainFeatures: ['Export feature 1', 'Export feature 2'],
        components: [],
      },
      errorExperiences: [],
      decisions: [],
      dependencies: [],
      futurePlans: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0.0',
    };

    test('should export to JSONL', () => {
      dbManager.insertSymbol(testSymbol, 0);
      dbManager.insertEnhancedDoc(enhancedDoc, 0);

      const exportPath = dbManager.exportToJSONL();
      expect(fs.existsSync(exportPath)).toBe(true);

      const content = fs.readFileSync(exportPath, 'utf-8');
      expect(content).toContain('export-001');
      expect(content).toContain('ExportTest');
    });

    test('should import from JSONL', () => {
      dbManager.insertSymbol(testSymbol, 0);
      dbManager.insertEnhancedDoc(enhancedDoc, 0);

      const exportPath = dbManager.exportToJSONL();

      // Create new database
      dbManager.close();
      const newDbPath = path.join(tempDir, 'imported.db');
      const newDbManager = new DatabaseManager(newDbPath, jsonlPath);

      const count = newDbManager.importFromJSONL(exportPath);
      expect(count).toBeGreaterThan(0);

      const imported = newDbManager.getSymbol('export-001');
      expect(imported).toBeDefined();
      expect(imported?.name).toBe('ExportTest');

      newDbManager.close();
    });

    test('should handle empty export', () => {
      const exportPath = dbManager.exportToJSONL();
      expect(fs.existsSync(exportPath)).toBe(true);

      const content = fs.readFileSync(exportPath, 'utf-8');
      // Should be empty or have minimal content
      const lines = content
        .trim()
        .split('\n')
        .filter((l) => l.length > 0);
      expect(lines.length).toBe(0);
    });

    test('should throw on non-existent import file', () => {
      expect(() => {
        dbManager.importFromJSONL('/non/existent/file.jsonl');
      }).toThrow();
    });

    test('should verify imported data', () => {
      dbManager.insertSymbol(testSymbol, 0);
      dbManager.insertEnhancedDoc(enhancedDoc, 0);

      const exportPath = dbManager.exportToJSONL();
      const verifyResult = dbManager.verifyImport(exportPath);

      expect(verifyResult.success).toBe(true);
      expect(verifyResult.verifiedSymbols).toBe(1);
      expect(verifyResult.verifiedDocs).toBe(1);
      expect(verifyResult.mismatches).toHaveLength(0);
    });

    test('should detect mismatches in verification', () => {
      dbManager.insertSymbol(testSymbol, 0);
      const exportPath = dbManager.exportToJSONL();

      // Insert additional symbol not in export
      const newSymbol: Symbol = { ...testSymbol, id: 'export-002', name: 'NewSymbol' };
      dbManager.insertSymbol(newSymbol, 1);

      const verifyResult = dbManager.verifyImport(exportPath);

      expect(verifyResult.success).toBe(false);
      expect(verifyResult.mismatches.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    test('should return correct statistics for empty database', () => {
      const stats = dbManager.getStatistics();
      expect(stats.totalSymbols).toBe(0);
      expect(stats.totalEnhancedDocs).toBe(0);
      expect(stats.dbSize).toBeGreaterThan(0);
    });

    test('should update statistics after insertions', () => {
      const symbol: Symbol = {
        id: 'stats-001',
        name: 'StatsTest',
        type: 'function',
        filePath: 'src/stats.ts',
        line: 10,
        column: 0,
        isExported: true,
        isPublic: true,
        summary: 'Stats test',
        tests: [],
        designDecisions: [],
      };

      dbManager.insertSymbol(symbol, 0);

      const stats = dbManager.getStatistics();
      expect(stats.totalSymbols).toBe(1);
    });

    test('should track database file size', () => {
      const stats = dbManager.getStatistics();
      expect(stats.dbSize).toBeGreaterThan(0);
    });
  });

  describe('Connection Management', () => {
    test('should close connection without errors', () => {
      expect(() => dbManager.close()).not.toThrow();
    });

    test('should handle operations after close gracefully', () => {
      dbManager.close();

      // Operations after close should throw or fail gracefully
      expect(() => {
        dbManager.getSymbol('test');
      }).toThrow();
    });
  });
});
