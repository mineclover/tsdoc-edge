/**
 * Tests for CoverageSyncAdapter
 */

import type { Symbol } from '../../types/graph';
import type { CoverageSummary } from '../../analyzer/CoverageParser';
import {
  CoverageSyncer,
  updateSymbolWithCoverage,
  type SymbolCoverage,
  type CoverageSyncResult,
  CoverageAdapter,
} from '../../analyzer/CoverageSyncAdapter';

/**
 * Mock coverage adapter for testing
 */
class MockCoverageAdapter extends CoverageAdapter {
  private data: CoverageSummary;

  constructor(data: CoverageSummary) {
    super();
    this.data = data;
  }

  parseCoverage(): CoverageSummary {
    return this.data;
  }

  getName(): string {
    return 'Mock';
  }
}

/**
 * Helper to create mock symbols
 */
function createSymbol(
  overrides: Partial<Symbol> = {}
): Symbol {
  return {
    id: 'test-symbol',
    name: 'testFunction',
    type: 'function',
    filePath: '/project/src/test.ts',
    line: 10,
    column: 0,
    isExported: true,
    isPublic: true,
    tests: [],
    designDecisions: [],
    ...overrides,
  };
}

/**
 * Helper to create mock coverage summary
 */
function createCoverageSummary(
  files: Map<string, any> = new Map()
): CoverageSummary {
  return {
    totalFiles: files.size,
    statements: 85.5,
    functions: 90.0,
    branches: 75.0,
    lines: 87.3,
    files,
  };
}

describe('CoverageSyncAdapter', () => {
  describe('CoverageSyncer', () => {
    let syncer: CoverageSyncer;

    beforeEach(() => {
      const adapter = new MockCoverageAdapter(createCoverageSummary());
      syncer = new CoverageSyncer(adapter);
    });

    describe('constructor', () => {
      it('should create CoverageSyncer with adapter', () => {
        expect(syncer).toBeDefined();
      });

      it('should store adapter reference', () => {
        const adapter = new MockCoverageAdapter(createCoverageSummary());
        const syncer = new CoverageSyncer(adapter);

        expect(syncer.getAdapter()).toBe(adapter);
      });
    });

    describe('parseCoverage', () => {
      it('should delegate to adapter', () => {
        const coverageData = createCoverageSummary();
        const adapter = new MockCoverageAdapter(coverageData);
        const syncer = new CoverageSyncer(adapter);

        const result = syncer.parseCoverage('coverage.json');

        expect(result).toBe(coverageData);
      });

      it('should return CoverageSummary with correct structure', () => {
        const files = new Map();
        files.set('/project/src/file.ts', {
          path: '/project/src/file.ts',
          statementCoverage: 85.0,
          functionCoverage: 90.0,
          branchCoverage: 75.0,
          lineCoverage: 87.0,
          coveredLines: [1, 2, 3],
          uncoveredLines: [4, 5],
          functions: [],
        });

        const coverageData = createCoverageSummary(files);
        const adapter = new MockCoverageAdapter(coverageData);
        const syncer = new CoverageSyncer(adapter);

        const result = syncer.parseCoverage('coverage.json');

        expect(result.totalFiles).toBe(1);
        expect(result.statements).toBe(85.5);
        expect(result.functions).toBe(90.0);
        expect(result.files.size).toBe(1);
      });
    });

    describe('syncToSymbols', () => {
      it('should return correct structure', () => {
        const symbols = [createSymbol()];
        const coverageSummary = createCoverageSummary();

        const result = syncer.syncToSymbols(symbols, coverageSummary);

        expect(result.totalSymbols).toBe(1);
        expect(result.coveredSymbols).toBeGreaterThanOrEqual(0);
        expect(result.uncoveredSymbols).toBeGreaterThanOrEqual(0);
        expect(result.symbolCoverages).toBeDefined();
        expect(result.overallCoverage).toBeDefined();
      });

      it('should calculate total symbols correctly', () => {
        const symbols = [
          createSymbol({ id: 'sym1', line: 10 }),
          createSymbol({ id: 'sym2', line: 20 }),
          createSymbol({ id: 'sym3', line: 30 }),
        ];
        const coverageSummary = createCoverageSummary();

        const result = syncer.syncToSymbols(symbols, coverageSummary);

        expect(result.totalSymbols).toBe(3);
      });

      it('should calculate overall coverage percentage', () => {
        const symbols = [
          createSymbol({ id: 'sym1', line: 10 }),
          createSymbol({ id: 'sym2', line: 20 }),
        ];
        const coverageSummary = createCoverageSummary();

        const result = syncer.syncToSymbols(symbols, coverageSummary);

        expect(result.overallCoverage).toBeGreaterThanOrEqual(0);
        expect(result.overallCoverage).toBeLessThanOrEqual(100);
      });

      it('should return 0 coverage for empty symbols', () => {
        const symbols: Symbol[] = [];
        const coverageSummary = createCoverageSummary();

        const result = syncer.syncToSymbols(symbols, coverageSummary);

        expect(result.totalSymbols).toBe(0);
        expect(result.overallCoverage).toBe(0);
        expect(result.symbolCoverages).toHaveLength(0);
      });

      it('should include all symbols in result', () => {
        const symbols = [
          createSymbol({ id: 'sym1', filePath: '/project/src/file1.ts', line: 10 }),
          createSymbol({ id: 'sym2', filePath: '/project/src/file2.ts', line: 20 }),
        ];
        const coverageSummary = createCoverageSummary();

        const result = syncer.syncToSymbols(symbols, coverageSummary);

        expect(result.symbolCoverages).toHaveLength(2);
      });

      it('should mark symbols without coverage data as uncovered', () => {
        const symbols = [createSymbol({ id: 'sym1', filePath: '/unknown/path.ts' })];
        const coverageSummary = createCoverageSummary();

        const result = syncer.syncToSymbols(symbols, coverageSummary);

        expect(result.uncoveredSymbols).toBe(1);
        expect(result.symbolCoverages[0].covered).toBe(false);
      });
    });

    describe('syncToSymbols - function coverage', () => {
      it('should detect covered functions', () => {
        const symbol = createSymbol({
          id: 'add-func',
          name: 'add',
          type: 'function',
          filePath: '/project/src/math.ts',
          line: 5,
        });

        const files = new Map();
        files.set('/project/src/math.ts', {
          path: '/project/src/math.ts',
          statementCoverage: 100.0,
          functionCoverage: 100.0,
          branchCoverage: 100.0,
          lineCoverage: 100.0,
          coveredLines: [1, 2, 3, 4, 5, 6, 7],
          uncoveredLines: [],
          functions: [
            {
              name: 'add',
              line: 5,
              covered: true,
              count: 10,
            },
          ],
        });

        const coverageSummary = createCoverageSummary(files);
        const result = syncer.syncToSymbols([symbol], coverageSummary);

        expect(result.coveredSymbols).toBe(1);
        expect(result.symbolCoverages[0].covered).toBe(true);
        expect(result.symbolCoverages[0].executionCount).toBe(10);
      });

      it('should detect uncovered functions', () => {
        const symbol = createSymbol({
          id: 'divide-func',
          name: 'divide',
          type: 'function',
          filePath: '/project/src/math.ts',
          line: 15,
        });

        const files = new Map();
        files.set('/project/src/math.ts', {
          path: '/project/src/math.ts',
          statementCoverage: 50.0,
          functionCoverage: 50.0,
          branchCoverage: 50.0,
          lineCoverage: 50.0,
          coveredLines: [5, 6, 7],
          uncoveredLines: [15, 16, 17],
          functions: [
            {
              name: 'divide',
              line: 15,
              covered: false,
              count: 0,
            },
          ],
        });

        const coverageSummary = createCoverageSummary(files);
        const result = syncer.syncToSymbols([symbol], coverageSummary);

        expect(result.coveredSymbols).toBe(0);
        expect(result.symbolCoverages[0].covered).toBe(false);
      });

      it('should find function by approximate line number', () => {
        const symbol = createSymbol({
          id: 'fn-approx',
          name: 'myFunc',
          type: 'function',
          filePath: '/project/src/utils.ts',
          line: 10,
        });

        const files = new Map();
        files.set('/project/src/utils.ts', {
          path: '/project/src/utils.ts',
          statementCoverage: 100.0,
          functionCoverage: 100.0,
          branchCoverage: 100.0,
          lineCoverage: 100.0,
          coveredLines: [8, 9, 10, 11, 12],
          uncoveredLines: [],
          functions: [
            {
              name: 'otherFunc',
              line: 8,
              covered: true,
              count: 5,
            },
            {
              name: 'myFunc',
              line: 11, // Within 2 line tolerance
              covered: true,
              count: 20,
            },
          ],
        });

        const coverageSummary = createCoverageSummary(files);
        const result = syncer.syncToSymbols([symbol], coverageSummary);

        expect(result.symbolCoverages[0].executionCount).toBe(20);
      });
    });

    describe('syncToSymbols - class coverage', () => {
      it('should mark class as covered if declaration line is covered', () => {
        const symbol = createSymbol({
          id: 'user-class',
          name: 'User',
          type: 'class',
          filePath: '/project/src/models/User.ts',
          line: 5,
        });

        const files = new Map();
        files.set('/project/src/models/User.ts', {
          path: '/project/src/models/User.ts',
          statementCoverage: 100.0,
          functionCoverage: 100.0,
          branchCoverage: 100.0,
          lineCoverage: 100.0,
          coveredLines: [5, 6, 7, 8, 9],
          uncoveredLines: [],
          functions: [
            {
              name: 'constructor',
              line: 6,
              covered: true,
              count: 5,
            },
          ],
        });

        const coverageSummary = createCoverageSummary(files);
        const result = syncer.syncToSymbols([symbol], coverageSummary);

        expect(result.symbolCoverages[0].covered).toBe(true);
      });

      it('should mark class as covered if methods are covered', () => {
        const symbol = createSymbol({
          id: 'product-class',
          name: 'Product',
          type: 'class',
          filePath: '/project/src/Product.ts',
          line: 1,
        });

        const files = new Map();
        files.set('/project/src/Product.ts', {
          path: '/project/src/Product.ts',
          statementCoverage: 100.0,
          functionCoverage: 100.0,
          branchCoverage: 100.0,
          lineCoverage: 100.0,
          coveredLines: [10, 15, 20],
          uncoveredLines: [],
          functions: [
            {
              name: 'constructor',
              line: 2,
              covered: true,
              count: 8,
            },
            {
              name: 'getName',
              line: 10,
              covered: true,
              count: 15,
            },
          ],
        });

        const coverageSummary = createCoverageSummary(files);
        const result = syncer.syncToSymbols([symbol], coverageSummary);

        expect(result.symbolCoverages[0].covered).toBe(true);
      });

      it('should mark class as uncovered if no methods are covered', () => {
        const symbol = createSymbol({
          id: 'unused-class',
          name: 'UnusedClass',
          type: 'class',
          filePath: '/project/src/Unused.ts',
          line: 1,
        });

        const files = new Map();
        files.set('/project/src/Unused.ts', {
          path: '/project/src/Unused.ts',
          statementCoverage: 0.0,
          functionCoverage: 0.0,
          branchCoverage: 0.0,
          lineCoverage: 0.0,
          coveredLines: [],
          uncoveredLines: [1, 2, 3, 4, 5],
          functions: [
            {
              name: 'constructor',
              line: 2,
              covered: false,
              count: 0,
            },
          ],
        });

        const coverageSummary = createCoverageSummary(files);
        const result = syncer.syncToSymbols([symbol], coverageSummary);

        expect(result.symbolCoverages[0].covered).toBe(false);
      });
    });

    describe('syncToSymbols - method coverage', () => {
      it('should detect covered methods', () => {
        const symbol = createSymbol({
          id: 'get-name-method',
          name: 'getName',
          type: 'method',
          filePath: '/project/src/Person.ts',
          line: 12,
        });

        const files = new Map();
        files.set('/project/src/Person.ts', {
          path: '/project/src/Person.ts',
          statementCoverage: 100.0,
          functionCoverage: 100.0,
          branchCoverage: 100.0,
          lineCoverage: 100.0,
          coveredLines: [12, 13, 14],
          uncoveredLines: [],
          functions: [
            {
              name: 'getName',
              line: 12,
              covered: true,
              count: 25,
            },
          ],
        });

        const coverageSummary = createCoverageSummary(files);
        const result = syncer.syncToSymbols([symbol], coverageSummary);

        expect(result.symbolCoverages[0].covered).toBe(true);
        expect(result.symbolCoverages[0].executionCount).toBe(25);
      });
    });

    describe('syncToSymbols - file path matching', () => {
      it('should match exact file paths', () => {
        const symbol = createSymbol({
          id: 'exact-match',
          filePath: '/project/src/exact.ts',
          line: 5,
        });

        const files = new Map();
        files.set('/project/src/exact.ts', {
          path: '/project/src/exact.ts',
          statementCoverage: 100.0,
          functionCoverage: 100.0,
          branchCoverage: 100.0,
          lineCoverage: 100.0,
          coveredLines: [5],
          uncoveredLines: [],
          functions: [],
        });

        const coverageSummary = createCoverageSummary(files);
        const result = syncer.syncToSymbols([symbol], coverageSummary);

        expect(result.coveredSymbols).toBe(1);
      });

      it('should match relative file paths', () => {
        const symbol = createSymbol({
          id: 'relative-match',
          filePath: 'src/relative.ts',
          line: 10,
        });

        const files = new Map();
        files.set('/project/src/relative.ts', {
          path: '/project/src/relative.ts',
          statementCoverage: 100.0,
          functionCoverage: 100.0,
          branchCoverage: 100.0,
          lineCoverage: 100.0,
          coveredLines: [10],
          uncoveredLines: [],
          functions: [],
        });

        const coverageSummary = createCoverageSummary(files);
        const result = syncer.syncToSymbols([symbol], coverageSummary);

        expect(result.coveredSymbols).toBe(1);
      });

      it('should match by path ending', () => {
        const symbol = createSymbol({
          id: 'ending-match',
          filePath: 'src/utils.ts',
          line: 15,
        });

        const files = new Map();
        files.set('/project/src/utils.ts', {
          path: '/project/src/utils.ts',
          statementCoverage: 100.0,
          functionCoverage: 100.0,
          branchCoverage: 100.0,
          lineCoverage: 100.0,
          coveredLines: [15],
          uncoveredLines: [],
          functions: [],
        });

        const coverageSummary = createCoverageSummary(files);
        const result = syncer.syncToSymbols([symbol], coverageSummary);

        expect(result.coveredSymbols).toBe(1);
      });
    });

    describe('syncToSymbols - edge cases', () => {
      it('should handle empty coverage files map', () => {
        const symbols = [createSymbol()];
        const coverageSummary = createCoverageSummary(new Map());

        const result = syncer.syncToSymbols(symbols, coverageSummary);

        expect(result.coveredSymbols).toBe(0);
        expect(result.uncoveredSymbols).toBe(1);
      });

      it('should handle symbols with no file coverage', () => {
        const symbols = [
          createSymbol({ filePath: '/project/src/missing.ts' }),
        ];

        const files = new Map();
        files.set('/project/src/other.ts', {
          path: '/project/src/other.ts',
          statementCoverage: 100.0,
          functionCoverage: 100.0,
          branchCoverage: 100.0,
          lineCoverage: 100.0,
          coveredLines: [1, 2, 3],
          uncoveredLines: [],
          functions: [],
        });

        const coverageSummary = createCoverageSummary(files);
        const result = syncer.syncToSymbols(symbols, coverageSummary);

        expect(result.coveredSymbols).toBe(0);
        expect(result.symbolCoverages[0].covered).toBe(false);
      });

      it('should include coverage metadata when available', () => {
        const symbol = createSymbol({ filePath: '/project/src/file.ts', line: 10 });

        const files = new Map();
        files.set('/project/src/file.ts', {
          path: '/project/src/file.ts',
          statementCoverage: 85.5,
          functionCoverage: 90.0,
          branchCoverage: 75.0,
          lineCoverage: 87.3,
          coveredLines: [10],
          uncoveredLines: [11, 12],
          functions: [],
        });

        const coverageSummary = createCoverageSummary(files);
        const result = syncer.syncToSymbols([symbol], coverageSummary);

        const coverage = result.symbolCoverages[0];
        expect(coverage.lineCoverage).toBe(87.3);
        expect(coverage.statementCoverage).toBe(85.5);
        expect(coverage.coveredLines).toEqual([10]);
        expect(coverage.uncoveredLines).toEqual([11, 12]);
      });

      it('should handle multiple symbols in same file', () => {
        const symbols = [
          createSymbol({
            id: 'sym1',
            filePath: '/project/src/same.ts',
            line: 5,
          }),
          createSymbol({
            id: 'sym2',
            filePath: '/project/src/same.ts',
            line: 15,
          }),
        ];

        const files = new Map();
        files.set('/project/src/same.ts', {
          path: '/project/src/same.ts',
          statementCoverage: 100.0,
          functionCoverage: 100.0,
          branchCoverage: 100.0,
          lineCoverage: 100.0,
          coveredLines: [5, 15],
          uncoveredLines: [],
          functions: [],
        });

        const coverageSummary = createCoverageSummary(files);
        const result = syncer.syncToSymbols(symbols, coverageSummary);

        expect(result.totalSymbols).toBe(2);
        expect(result.coveredSymbols).toBe(2);
      });

      it('should handle interface and type symbols', () => {
        const symbols = [
          createSymbol({
            id: 'user-interface',
            type: 'interface',
            filePath: '/project/src/types.ts',
            line: 5,
          }),
          createSymbol({
            id: 'config-type',
            type: 'type',
            filePath: '/project/src/types.ts',
            line: 15,
          }),
        ];

        const files = new Map();
        files.set('/project/src/types.ts', {
          path: '/project/src/types.ts',
          statementCoverage: 100.0,
          functionCoverage: 100.0,
          branchCoverage: 100.0,
          lineCoverage: 100.0,
          coveredLines: [5, 15],
          uncoveredLines: [],
          functions: [],
        });

        const coverageSummary = createCoverageSummary(files);
        const result = syncer.syncToSymbols(symbols, coverageSummary);

        expect(result.totalSymbols).toBe(2);
        expect(result.coveredSymbols).toBe(2);
      });

      it('should calculate coverage percentage correctly with mixed symbols', () => {
        const symbols = [
          createSymbol({ id: 'sym1', line: 5 }), // Will be uncovered
          createSymbol({ id: 'sym2', filePath: '/project/src/test.ts', line: 10 }),
          createSymbol({ id: 'sym3', filePath: '/project/src/test.ts', line: 20 }),
        ];

        const files = new Map();
        files.set('/project/src/test.ts', {
          path: '/project/src/test.ts',
          statementCoverage: 100.0,
          functionCoverage: 100.0,
          branchCoverage: 100.0,
          lineCoverage: 100.0,
          coveredLines: [10, 20],
          uncoveredLines: [],
          functions: [],
        });

        const coverageSummary = createCoverageSummary(files);
        const result = syncer.syncToSymbols(symbols, coverageSummary);

        expect(result.totalSymbols).toBe(3);
        expect(result.coveredSymbols).toBe(2);
        expect(result.uncoveredSymbols).toBe(1);
        expect(result.overallCoverage).toBeCloseTo((2 / 3) * 100);
      });

      it('should handle high execution counts', () => {
        const symbol = createSymbol({
          name: 'hotFunction',
          type: 'function',
          filePath: '/project/src/hot.ts',
          line: 5,
        });

        const files = new Map();
        files.set('/project/src/hot.ts', {
          path: '/project/src/hot.ts',
          statementCoverage: 100.0,
          functionCoverage: 100.0,
          branchCoverage: 100.0,
          lineCoverage: 100.0,
          coveredLines: [5],
          uncoveredLines: [],
          functions: [
            {
              name: 'hotFunction',
              line: 5,
              covered: true,
              count: 999999,
            },
          ],
        });

        const coverageSummary = createCoverageSummary(files);
        const result = syncer.syncToSymbols([symbol], coverageSummary);

        expect(result.symbolCoverages[0].executionCount).toBe(999999);
      });
    });

    describe('getAdapter', () => {
      it('should return the adapter instance', () => {
        const adapter = new MockCoverageAdapter(createCoverageSummary());
        const syncer = new CoverageSyncer(adapter);

        expect(syncer.getAdapter()).toBe(adapter);
      });

      it('should return correct adapter name', () => {
        const adapter = new MockCoverageAdapter(createCoverageSummary());
        const syncer = new CoverageSyncer(adapter);

        expect(syncer.getAdapter().getName()).toBe('Mock');
      });
    });
  });

  describe('updateSymbolWithCoverage', () => {
    it('should update symbol with coverage data', () => {
      const symbol = createSymbol();
      const coverage: SymbolCoverage = {
        symbolId: 'test-symbol',
        symbolName: 'testFunction',
        filePath: '/project/src/test.ts',
        line: 10,
        covered: true,
        executionCount: 42,
        lineCoverage: 95.5,
        statementCoverage: 92.0,
      };

      const updated = updateSymbolWithCoverage(symbol, coverage);

      expect(updated.metadata?.coverage).toBeDefined();
      expect(updated.metadata?.coverage?.covered).toBe(true);
      expect(updated.metadata?.coverage?.executionCount).toBe(42);
      expect(updated.metadata?.coverage?.lineCoverage).toBe(95.5);
      expect(updated.metadata?.coverage?.statementCoverage).toBe(92.0);
    });

    it('should preserve symbol identity', () => {
      const symbol = createSymbol({ id: 'original-id' });
      const coverage: SymbolCoverage = {
        symbolId: 'original-id',
        symbolName: 'testFunction',
        filePath: '/project/src/test.ts',
        line: 10,
        covered: true,
      };

      const updated = updateSymbolWithCoverage(symbol, coverage);

      expect(updated.id).toBe('original-id');
      expect(updated.name).toBe(symbol.name);
      expect(updated.filePath).toBe(symbol.filePath);
    });

    it('should preserve existing metadata', () => {
      const symbol = createSymbol({
        metadata: {
          custom: 'value',
          nested: { key: 'data' },
        },
      });
      const coverage: SymbolCoverage = {
        symbolId: 'test-symbol',
        symbolName: 'testFunction',
        filePath: '/project/src/test.ts',
        line: 10,
        covered: true,
      };

      const updated = updateSymbolWithCoverage(symbol, coverage);

      expect(updated.metadata?.custom).toBe('value');
      expect(updated.metadata?.nested).toEqual({ key: 'data' });
      expect(updated.metadata?.coverage).toBeDefined();
    });

    it('should not mutate original symbol', () => {
      const symbol = createSymbol();
      const originalMetadata = JSON.stringify(symbol.metadata);
      const coverage: SymbolCoverage = {
        symbolId: 'test-symbol',
        symbolName: 'testFunction',
        filePath: '/project/src/test.ts',
        line: 10,
        covered: true,
      };

      updateSymbolWithCoverage(symbol, coverage);

      expect(JSON.stringify(symbol.metadata)).toBe(originalMetadata);
    });

    it('should handle coverage without execution count', () => {
      const symbol = createSymbol();
      const coverage: SymbolCoverage = {
        symbolId: 'test-symbol',
        symbolName: 'testFunction',
        filePath: '/project/src/test.ts',
        line: 10,
        covered: false,
      };

      const updated = updateSymbolWithCoverage(symbol, coverage);

      expect(updated.metadata?.coverage?.covered).toBe(false);
      expect(updated.metadata?.coverage?.executionCount).toBeUndefined();
    });

    it('should handle coverage with partial percentages', () => {
      const symbol = createSymbol();
      const coverage: SymbolCoverage = {
        symbolId: 'test-symbol',
        symbolName: 'testFunction',
        filePath: '/project/src/test.ts',
        line: 10,
        covered: true,
        lineCoverage: 75.5,
      };

      const updated = updateSymbolWithCoverage(symbol, coverage);

      expect(updated.metadata?.coverage?.lineCoverage).toBe(75.5);
      expect(updated.metadata?.coverage?.statementCoverage).toBeUndefined();
    });

    it('should handle coverage with zero percentages', () => {
      const symbol = createSymbol();
      const coverage: SymbolCoverage = {
        symbolId: 'test-symbol',
        symbolName: 'testFunction',
        filePath: '/project/src/test.ts',
        line: 10,
        covered: false,
        executionCount: 0,
        lineCoverage: 0,
        statementCoverage: 0,
      };

      const updated = updateSymbolWithCoverage(symbol, coverage);

      expect(updated.metadata?.coverage?.executionCount).toBe(0);
      expect(updated.metadata?.coverage?.lineCoverage).toBe(0);
      expect(updated.metadata?.coverage?.statementCoverage).toBe(0);
    });

    it('should handle coverage with 100% coverage', () => {
      const symbol = createSymbol();
      const coverage: SymbolCoverage = {
        symbolId: 'test-symbol',
        symbolName: 'testFunction',
        filePath: '/project/src/test.ts',
        line: 10,
        covered: true,
        executionCount: 100,
        lineCoverage: 100,
        statementCoverage: 100,
      };

      const updated = updateSymbolWithCoverage(symbol, coverage);

      expect(updated.metadata?.coverage?.covered).toBe(true);
      expect(updated.metadata?.coverage?.lineCoverage).toBe(100);
      expect(updated.metadata?.coverage?.statementCoverage).toBe(100);
    });
  });

  describe('CoverageAdapter', () => {
    it('should enforce interface contract on implementations', () => {
      const adapter = new MockCoverageAdapter(createCoverageSummary());

      expect(adapter.parseCoverage).toBeDefined();
      expect(adapter.getName).toBeDefined();
      expect(typeof adapter.parseCoverage).toBe('function');
      expect(typeof adapter.getName).toBe('function');
    });

    it('should have consistent naming across adapters', () => {
      const adapter1 = new MockCoverageAdapter(createCoverageSummary());

      expect(adapter1.getName()).toMatch(/^[A-Z]/);
    });
  });

  describe('integration tests', () => {
    it('should sync full workflow with multiple symbols and coverage types', () => {
      const symbols = [
        createSymbol({
          id: 'add-func',
          name: 'add',
          type: 'function',
          filePath: '/project/src/math.ts',
          line: 5,
        }),
        createSymbol({
          id: 'calculator-class',
          name: 'Calculator',
          type: 'class',
          filePath: '/project/src/math.ts',
          line: 15,
        }),
        createSymbol({
          id: 'multiply-method',
          name: 'multiply',
          type: 'method',
          filePath: '/project/src/math.ts',
          line: 20,
        }),
        createSymbol({
          id: 'unused-type',
          name: 'UnusedType',
          type: 'type',
          filePath: '/project/src/types.ts',
          line: 10,
        }),
      ];

      const files = new Map();
      files.set('/project/src/math.ts', {
        path: '/project/src/math.ts',
        statementCoverage: 90.0,
        functionCoverage: 85.0,
        branchCoverage: 80.0,
        lineCoverage: 90.0,
        coveredLines: [5, 6, 7, 15, 20, 21, 22],
        uncoveredLines: [25, 26],
        functions: [
          {
            name: 'add',
            line: 5,
            covered: true,
            count: 50,
          },
          {
            name: 'multiply',
            line: 20,
            covered: true,
            count: 30,
          },
        ],
      });

      files.set('/project/src/types.ts', {
        path: '/project/src/types.ts',
        statementCoverage: 0.0,
        functionCoverage: 0.0,
        branchCoverage: 0.0,
        lineCoverage: 0.0,
        coveredLines: [],
        uncoveredLines: [10, 11, 12],
        functions: [],
      });

      const coverageSummary = createCoverageSummary(files);
      const adapter = new MockCoverageAdapter(coverageSummary);
      const syncer = new CoverageSyncer(adapter);

      const result = syncer.syncToSymbols(symbols, coverageSummary);

      expect(result.totalSymbols).toBe(4);
      expect(result.coveredSymbols).toBe(3);
      expect(result.uncoveredSymbols).toBe(1);
      expect(result.overallCoverage).toBeCloseTo(75);

      // Verify each symbol
      const addCov = result.symbolCoverages.find(s => s.symbolId === 'add-func');
      expect(addCov?.covered).toBe(true);
      expect(addCov?.executionCount).toBe(50);

      const calcCov = result.symbolCoverages.find(s => s.symbolId === 'calculator-class');
      expect(calcCov?.covered).toBe(true);

      const multCov = result.symbolCoverages.find(s => s.symbolId === 'multiply-method');
      expect(multCov?.covered).toBe(true);
      expect(multCov?.executionCount).toBe(30);

      const typeCov = result.symbolCoverages.find(s => s.symbolId === 'unused-type');
      expect(typeCov?.covered).toBe(false);
    });
  });
});
