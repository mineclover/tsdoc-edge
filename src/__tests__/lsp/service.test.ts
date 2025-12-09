/**
 * TSDoc Edge LSP Service Tests
 */

import { TsdocEdgeService, CodeLensInfo, SymbolSearchResult, DiagnosticInfo } from '../../lsp/service';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('TsdocEdgeService', () => {
  let tempDir: string;

  beforeAll(() => {
    // Create a temp directory for test database
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-edge-test-'));
    const tsdocDir = path.join(tempDir, '.tsdoc');
    fs.mkdirSync(tsdocDir, { recursive: true });
  });

  afterAll(() => {
    // Cleanup temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should handle missing database gracefully', () => {
      const nonExistentPath = path.join(tempDir, 'nonexistent');
      const testService = new TsdocEdgeService(nonExistentPath);

      // Should not throw, just log warning
      expect(testService).toBeDefined();

      // Methods should return empty results
      expect(testService.getCodeLenses('/test.ts')).toEqual([]);
      expect(testService.searchSymbols('test')).toEqual([]);
      expect(testService.getDiagnostics('/test.ts')).toEqual([]);
      expect(testService.getHoverInfo('/test.ts', 1, 0)).toBeNull();

      testService.close();
    });
  });

  describe('cache', () => {
    it('should have cache methods', () => {
      const testService = new TsdocEdgeService(tempDir);

      // Should have cache invalidation methods
      expect(typeof testService.invalidateCache).toBe('function');
      expect(typeof testService.invalidateFileCache).toBe('function');

      // Should not throw
      testService.invalidateCache();
      testService.invalidateFileCache('/test.ts');

      testService.close();
    });
  });

  describe('getCodeLenses', () => {
    it('should return empty array when no database', () => {
      const testService = new TsdocEdgeService(tempDir);
      const lenses = testService.getCodeLenses('/src/test.ts');

      expect(Array.isArray(lenses)).toBe(true);
      expect(lenses).toEqual([]);

      testService.close();
    });
  });

  describe('searchSymbols', () => {
    it('should return empty array when no database', () => {
      const testService = new TsdocEdgeService(tempDir);
      const symbols = testService.searchSymbols('test');

      expect(Array.isArray(symbols)).toBe(true);
      expect(symbols).toEqual([]);

      testService.close();
    });
  });

  describe('getDiagnostics', () => {
    it('should return empty array when no database', () => {
      const testService = new TsdocEdgeService(tempDir);
      const diagnostics = testService.getDiagnostics('/src/test.ts');

      expect(Array.isArray(diagnostics)).toBe(true);
      expect(diagnostics).toEqual([]);

      testService.close();
    });
  });

  describe('getHoverInfo', () => {
    it('should return null when no database', () => {
      const testService = new TsdocEdgeService(tempDir);
      const hover = testService.getHoverInfo('/src/test.ts', 10, 5);

      expect(hover).toBeNull();

      testService.close();
    });
  });

  describe('close', () => {
    it('should handle multiple close calls', () => {
      const testService = new TsdocEdgeService(tempDir);

      // Should not throw on multiple closes
      testService.close();
      testService.close();

      expect(true).toBe(true);
    });
  });

  describe('getSymbolAtPosition', () => {
    it('should return null when no database', () => {
      const testService = new TsdocEdgeService(tempDir);
      const symbol = testService.getSymbolAtPosition('/src/test.ts', 10);

      expect(symbol).toBeNull();

      testService.close();
    });
  });

  describe('getImpactAnalysis', () => {
    it('should return empty result when no database', () => {
      const testService = new TsdocEdgeService(tempDir);
      const impact = testService.getImpactAnalysis('test-symbol', 3);

      expect(impact).toEqual({
        downstream: 0,
        upstream: 0,
        symbols: [],
      });

      testService.close();
    });

    it('should accept maxDepth parameter', () => {
      const testService = new TsdocEdgeService(tempDir);
      const impact = testService.getImpactAnalysis('test-symbol', 5);

      expect(impact).toBeDefined();
      expect(impact.symbols).toEqual([]);

      testService.close();
    });
  });

  describe('getRelatedSymbols', () => {
    it('should return empty array when no database', () => {
      const testService = new TsdocEdgeService(tempDir);
      const related = testService.getRelatedSymbols('test-symbol', 10);

      expect(Array.isArray(related)).toBe(true);
      expect(related).toEqual([]);

      testService.close();
    });

    it('should accept limit parameter', () => {
      const testService = new TsdocEdgeService(tempDir);
      const related = testService.getRelatedSymbols('test-symbol', 5);

      expect(related.length).toBeLessThanOrEqual(5);

      testService.close();
    });
  });

  describe('findSymbolByName', () => {
    it('should return null when no database', () => {
      const testService = new TsdocEdgeService(tempDir);
      const symbol = testService.findSymbolByName('TestClass');

      expect(symbol).toBeNull();

      testService.close();
    });

    it('should handle empty string', () => {
      const testService = new TsdocEdgeService(tempDir);
      const symbol = testService.findSymbolByName('');

      expect(symbol).toBeNull();

      testService.close();
    });
  });
});

describe('CodeLensInfo interface', () => {
  it('should have correct structure', () => {
    const lens: CodeLensInfo = {
      line: 10,
      title: '↓5 ↑3',
      symbolId: 'test-symbol',
    };

    expect(lens.line).toBe(10);
    expect(lens.title).toBe('↓5 ↑3');
    expect(lens.symbolId).toBe('test-symbol');
  });
});

describe('SymbolSearchResult interface', () => {
  it('should have correct structure', () => {
    const result: SymbolSearchResult = {
      name: 'TestClass',
      kind: 5, // Class
      filePath: '/src/test.ts',
      line: 1,
    };

    expect(result.name).toBe('TestClass');
    expect(result.kind).toBe(5);
    expect(result.filePath).toBe('/src/test.ts');
    expect(result.line).toBe(1);
  });
});

describe('DiagnosticInfo interface', () => {
  it('should have correct structure', () => {
    const diagnostic: DiagnosticInfo = {
      line: 15,
      message: 'Circular dependency detected',
      severity: 2, // Warning
    };

    expect(diagnostic.line).toBe(15);
    expect(diagnostic.message).toBe('Circular dependency detected');
    expect(diagnostic.severity).toBe(2);
  });
});
