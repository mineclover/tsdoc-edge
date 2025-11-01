/**
 * Tests for CoverageSyncAdapter
 */

import {
  CoverageSyncer,
  updateSymbolWithCoverage,
  type SymbolCoverage,
} from '../analyzer/CoverageSyncAdapter';
import { IstanbulCoverageAdapter } from '../analyzer/IstanbulCoverageAdapter';
import { CoverageParser } from '../analyzer/CoverageParser';
import type { Symbol } from '../types/graph';
import type { CoverageSummary } from '../analyzer/CoverageParser';

describe('CoverageSyncAdapter', () => {
  describe('IstanbulCoverageAdapter', () => {
    test('should have correct name', () => {
      const adapter = new IstanbulCoverageAdapter();
      expect(adapter.getName()).toBe('Istanbul');
    });

    test('should parse coverage using CoverageParser', () => {
      const adapter = new IstanbulCoverageAdapter();
      const parser = new CoverageParser();

      const data = {
        '/project/src/foo.ts': {
          path: '/project/src/foo.ts',
          s: { '0': 5 },
          f: { '0': 5 },
          b: {},
          statementMap: {
            '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
          },
          fnMap: {
            '0': { name: 'foo', decl: { start: { line: 1 } } },
          },
        },
      };

      const summary = parser.parseData(data);
      expect(summary.totalFiles).toBe(1);
    });
  });

  describe('CoverageSyncer', () => {
    let syncer: CoverageSyncer;
    let mockSummary: CoverageSummary;

    beforeEach(() => {
      const adapter = new IstanbulCoverageAdapter();
      syncer = new CoverageSyncer(adapter);

      // Create mock coverage summary
      const parser = new CoverageParser();
      mockSummary = parser.parseData({
        '/project/src/calculator.ts': {
          path: '/project/src/calculator.ts',
          s: { '0': 10, '1': 5, '2': 0 },
          f: { '0': 10, '1': 0 },
          b: {},
          statementMap: {
            '0': { start: { line: 5, column: 0 }, end: { line: 5, column: 20 } },
            '1': { start: { line: 8, column: 0 }, end: { line: 8, column: 15 } },
            '2': { start: { line: 15, column: 0 }, end: { line: 15, column: 10 } },
          },
          fnMap: {
            '0': { name: 'add', decl: { start: { line: 5 } } },
            '1': { name: 'subtract', decl: { start: { line: 15 } } },
          },
        },
        '/project/src/validator.ts': {
          path: '/project/src/validator.ts',
          s: { '0': 20 },
          f: { '0': 20 },
          b: {},
          statementMap: {
            '0': { start: { line: 3, column: 0 }, end: { line: 3, column: 25 } },
          },
          fnMap: {
            '0': { name: 'validate', decl: { start: { line: 3 } } },
          },
        },
      });
    });

    test('should sync coverage to symbols', () => {
      const symbols: Symbol[] = [
        {
          id: 'add-1',
          name: 'add',
          type: 'function',
          filePath: '/project/src/calculator.ts',
          line: 5,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
        {
          id: 'subtract-1',
          name: 'subtract',
          type: 'function',
          filePath: '/project/src/calculator.ts',
          line: 15,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
        {
          id: 'validate-1',
          name: 'validate',
          type: 'function',
          filePath: '/project/src/validator.ts',
          line: 3,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
      ];

      const result = syncer.syncToSymbols(symbols, mockSummary);

      expect(result.totalSymbols).toBe(3);
      expect(result.coveredSymbols).toBe(2); // add and validate are covered
      expect(result.uncoveredSymbols).toBe(1); // subtract is not covered
      expect(result.symbolCoverages).toHaveLength(3);
      expect(result.overallCoverage).toBeCloseTo(66.67, 1);
    });

    test('should find coverage for function by name', () => {
      const symbols: Symbol[] = [
        {
          id: 'add-1',
          name: 'add',
          type: 'function',
          filePath: '/project/src/calculator.ts',
          line: 5,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
      ];

      const result = syncer.syncToSymbols(symbols, mockSummary);

      const addCoverage = result.symbolCoverages[0];
      expect(addCoverage.covered).toBe(true);
      expect(addCoverage.executionCount).toBe(10);
      expect(addCoverage.symbolName).toBe('add');
    });

    test('should handle symbols with no coverage data', () => {
      const symbols: Symbol[] = [
        {
          id: 'unknown-1',
          name: 'unknownFunction',
          type: 'function',
          filePath: '/project/src/unknown.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
      ];

      const result = syncer.syncToSymbols(symbols, mockSummary);

      expect(result.totalSymbols).toBe(1);
      expect(result.coveredSymbols).toBe(0);
      expect(result.symbolCoverages[0].covered).toBe(false);
    });

    test('should handle class symbols by line coverage', () => {
      const symbols: Symbol[] = [
        {
          id: 'calculator-class',
          name: 'Calculator',
          type: 'class',
          filePath: '/project/src/calculator.ts',
          line: 5, // Same line as 'add' function
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
      ];

      const result = syncer.syncToSymbols(symbols, mockSummary);

      const classCoverage = result.symbolCoverages[0];
      expect(classCoverage.covered).toBe(true); // Line 5 is covered
      expect(classCoverage.coveredLines).toContain(5);
    });

    test('should mark class as covered if methods are covered (even if declaration line is not)', () => {
      const parser = new CoverageParser();
      const data = {
        '/project/src/MyClass.ts': {
          path: '/project/src/MyClass.ts',
          s: { '0': 5, '1': 3 },
          f: { '0': 10, '1': 5 }, // Both methods covered
          b: {},
          statementMap: {
            '0': { start: { line: 10, column: 0 }, end: { line: 10, column: 20 } },
            '1': { start: { line: 15, column: 0 }, end: { line: 15, column: 15 } },
          },
          fnMap: {
            '0': { name: 'constructor', decl: { start: { line: 10 } } },
            '1': { name: 'method1', decl: { start: { line: 15 } } },
          },
        },
      };

      const summary = parser.parseData(data);

      const symbols: Symbol[] = [
        {
          id: 'myclass-1',
          name: 'MyClass',
          type: 'class',
          filePath: '/project/src/MyClass.ts',
          line: 5, // Class declaration line (not tracked by coverage)
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
      ];

      const adapter = new IstanbulCoverageAdapter();
      const syncer = new CoverageSyncer(adapter);
      const result = syncer.syncToSymbols(symbols, summary);

      expect(result.coveredSymbols).toBe(1);
      expect(result.symbolCoverages[0].covered).toBe(true);
    });

    test('should match symbols by relative path', () => {
      const symbols: Symbol[] = [
        {
          id: 'add-1',
          name: 'add',
          type: 'function',
          filePath: 'src/calculator.ts', // Relative path
          line: 5,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
      ];

      const result = syncer.syncToSymbols(symbols, mockSummary);

      expect(result.coveredSymbols).toBe(1);
      expect(result.symbolCoverages[0].covered).toBe(true);
    });

    test('should handle empty symbol list', () => {
      const result = syncer.syncToSymbols([], mockSummary);

      expect(result.totalSymbols).toBe(0);
      expect(result.coveredSymbols).toBe(0);
      expect(result.overallCoverage).toBe(0);
      expect(result.symbolCoverages).toHaveLength(0);
    });
  });

  describe('updateSymbolWithCoverage', () => {
    test('should update symbol with coverage metadata', () => {
      const symbol: Symbol = {
        id: 'foo-1',
        name: 'foo',
        type: 'function',
        filePath: '/project/src/foo.ts',
        line: 5,
        column: 0,
        isExported: true,
        isPublic: true,
        tests: [],
        designDecisions: [],
      };

      const coverage: SymbolCoverage = {
        symbolId: 'foo-1',
        symbolName: 'foo',
        filePath: '/project/src/foo.ts',
        line: 5,
        covered: true,
        executionCount: 10,
        lineCoverage: 85.5,
        statementCoverage: 90.0,
      };

      const updated = updateSymbolWithCoverage(symbol, coverage);

      expect(updated.metadata).toBeDefined();
      expect(updated.metadata?.coverage?.covered).toBe(true);
      expect(updated.metadata?.coverage?.executionCount).toBe(10);
      expect(updated.metadata?.coverage?.lineCoverage).toBe(85.5);
      expect(updated.metadata?.coverage?.statementCoverage).toBe(90.0);
    });

    test('should preserve existing metadata', () => {
      const symbol: Symbol = {
        id: 'foo-1',
        name: 'foo',
        type: 'function',
        filePath: '/project/src/foo.ts',
        line: 5,
        column: 0,
        isExported: true,
        isPublic: true,
        tests: [],
        designDecisions: [],
        metadata: {
          custom: 'value',
        },
      };

      const coverage: SymbolCoverage = {
        symbolId: 'foo-1',
        symbolName: 'foo',
        filePath: '/project/src/foo.ts',
        line: 5,
        covered: true,
      };

      const updated = updateSymbolWithCoverage(symbol, coverage);

      expect(updated.metadata?.custom).toBe('value');
      expect(updated.metadata?.coverage?.covered).toBe(true);
    });
  });
});
