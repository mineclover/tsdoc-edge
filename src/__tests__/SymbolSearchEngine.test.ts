/**
 * Tests for SymbolSearchEngine
 * @testScenario Verify symbol search and query capabilities
 */

import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import { SymbolSearchEngine } from '../graph/SymbolSearchEngine';
import type { Symbol } from '../types/graph';
import type { ContractSpec, ResponsibilitySpec } from '../types/tags';

describe('SymbolSearchEngine', () => {
  let builder: SymbolGraphBuilder;
  let searchEngine: SymbolSearchEngine;

  beforeEach(() => {
    builder = new SymbolGraphBuilder();
    searchEngine = new SymbolSearchEngine(builder);

    // Setup test data
    const contract: ContractSpec = {
      symbolName: 'processData',
      description: 'Process input data',
      preconditions: ['input must not be null'],
      postconditions: ['output is valid'],
      invariants: [],
      filePath: '/test/data.ts',
    };

    const responsibility: ResponsibilitySpec = {
      symbolName: 'DataProcessor',
      description: 'Process and validate data',
      shouldDo: ['validate input', 'transform data'],
      shouldNotDo: ['store data', 'make API calls'],
      pattern: 'Strategy',
      architecture: 'Domain Layer',
    };

    const symbols: Symbol[] = [
      {
        id: 'func1',
        name: 'processData',
        type: 'function',
        filePath: '/test/data.ts',
        line: 10,
        column: 0,
        isExported: true,
        isPublic: true,
        summary: 'Process data function',
        contract,
        tests: [
          {
            symbolName: 'processData',
            testFilePath: '/test/data.test.ts',
            testName: 'processData test',
            scenarios: ['valid input', 'invalid input'],
          },
        ],
        designDecisions: [],
      },
      {
        id: 'class1',
        name: 'DataProcessor',
        type: 'class',
        filePath: '/test/processor.ts',
        line: 20,
        column: 0,
        isExported: true,
        isPublic: true,
        summary: 'Data processor class',
        responsibility,
        tests: [],
        designDecisions: [],
      },
      {
        id: 'func2',
        name: 'helperFunction',
        type: 'function',
        filePath: '/test/helper.ts',
        line: 5,
        column: 0,
        isExported: false,
        isPublic: false,
        tests: [],
        designDecisions: [],
      },
      {
        id: 'interface1',
        name: 'DataInterface',
        type: 'interface',
        filePath: '/test/types.ts',
        line: 1,
        column: 0,
        isExported: true,
        isPublic: true,
        summary: 'Data interface',
        tests: [],
        designDecisions: [],
      },
    ];

    symbols.forEach((s) => builder.addSymbol(s));

    // Add relationships
    builder.addRelationship({
      type: 'dependsOn',
      from: 'class1',
      to: 'func1',
      filePath: '/test/processor.ts',
    });

    builder.addRelationship({
      type: 'dependsOn',
      from: 'func1',
      to: 'interface1',
      filePath: '/test/data.ts',
    });
  });

  describe('Basic Search', () => {
    it('should search symbols by name pattern', () => {
      const result = searchEngine.search({ name: 'process' });
      expect(result.symbols.length).toBeGreaterThan(0);
      expect(result.symbols.some((s) => s.name.toLowerCase().includes('process'))).toBe(true);
    });

    it('should search symbols by exact name', () => {
      const result = searchEngine.search({ name: '^processData$' });
      expect(result.symbols).toHaveLength(1);
      expect(result.symbols[0].name).toBe('processData');
    });

    it('should search symbols by type', () => {
      const result = searchEngine.search({ type: 'function' });
      expect(result.symbols.length).toBe(2);
      expect(result.symbols.every((s) => s.type === 'function')).toBe(true);
    });

    it('should search symbols by file path pattern', () => {
      const result = searchEngine.search({ filePath: 'test' });
      expect(result.symbols.length).toBeGreaterThan(0);
      expect(result.symbols.every((s) => s.filePath.includes('test'))).toBe(true);
    });

    it('should return execution time', () => {
      const result = searchEngine.search({ name: 'process' });
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Advanced Filters', () => {
    it('should filter by contract existence', () => {
      const result = searchEngine.search({ hasContract: true });
      expect(result.symbols.length).toBe(1);
      expect(result.symbols[0].name).toBe('processData');
    });

    it('should filter symbols without contract', () => {
      const result = searchEngine.search({ hasContract: false });
      expect(result.symbols.length).toBeGreaterThan(0);
      expect(result.symbols.every((s) => !s.contract)).toBe(true);
    });

    it('should filter by testing existence', () => {
      const result = searchEngine.search({ hasTesting: true });
      expect(result.symbols.length).toBe(1);
      expect(result.symbols[0].tests.length).toBeGreaterThan(0);
    });

    it('should filter symbols without tests', () => {
      const result = searchEngine.search({ hasTesting: false });
      expect(result.symbols.length).toBeGreaterThan(0);
      expect(result.symbols.every((s) => s.tests.length === 0)).toBe(true);
    });

    it('should filter by public API', () => {
      const result = searchEngine.search({ isPublic: true });
      expect(result.symbols.length).toBeGreaterThan(0);
      expect(result.symbols.every((s) => s.isPublic)).toBe(true);
    });

    it('should filter by private symbols', () => {
      const result = searchEngine.search({ isPublic: false });
      expect(result.symbols.length).toBeGreaterThan(0);
      expect(result.symbols.every((s) => !s.isPublic)).toBe(true);
    });
  });

  describe('Relationship Queries', () => {
    it('should find symbols that depend on another symbol', () => {
      const result = searchEngine.search({ dependsOn: 'processData' });
      expect(result.symbols.length).toBe(1);
      expect(result.symbols[0].name).toBe('DataProcessor');
    });

    it('should find symbols used by another symbol', () => {
      const result = searchEngine.search({ usedBy: 'DataProcessor' });
      expect(result.symbols.length).toBe(1);
      expect(result.symbols[0].name).toBe('processData');
    });

    it('should find symbols with any relationship to another symbol', () => {
      const result = searchEngine.search({ relatedTo: 'processData' });
      expect(result.symbols.length).toBeGreaterThan(0);
    });
  });

  describe('Complex Multi-Criteria Search', () => {
    it('should combine multiple search criteria', () => {
      const result = searchEngine.search({
        type: 'function',
        isPublic: true,
        hasContract: true,
      });

      expect(result.symbols.length).toBe(1);
      expect(result.symbols[0].name).toBe('processData');
      expect(result.symbols[0].type).toBe('function');
      expect(result.symbols[0].isPublic).toBe(true);
      expect(result.symbols[0].contract).toBeDefined();
    });

    it('should search with name pattern and type', () => {
      const result = searchEngine.search({
        name: 'Data',
        type: 'class',
      });

      expect(result.symbols.length).toBe(1);
      expect(result.symbols[0].name).toBe('DataProcessor');
    });
  });

  describe('Find Special Cases', () => {
    it('should find undocumented symbols', () => {
      const undocumented = searchEngine.findUndocumented();
      expect(undocumented.length).toBeGreaterThan(0);
      expect(undocumented.every((s) => !s.summary || s.summary.trim() === '')).toBe(true);
    });

    it('should find untested symbols', () => {
      const untested = searchEngine.findUntested();
      expect(untested.length).toBeGreaterThan(0);
      expect(untested.every((s) => s.tests.length === 0)).toBe(true);
    });

    it('should find symbols without responsibility', () => {
      const noResponsibility = searchEngine.findWithoutResponsibility();
      expect(noResponsibility.length).toBeGreaterThan(0);
      expect(noResponsibility.every((s) => !s.responsibility)).toBe(true);
    });

    it('should find symbols without contract', () => {
      const noContract = searchEngine.findWithoutContract();
      expect(noContract.length).toBeGreaterThan(0);
      expect(noContract.every((s) => !s.contract)).toBe(true);
    });

    it('should find orphaned symbols', () => {
      const orphaned = searchEngine.findOrphaned();
      expect(orphaned.length).toBeGreaterThan(0);
      expect(orphaned.every((s) => !s.isExported)).toBe(true);
    });
  });

  describe('Symbol Path Tracing', () => {
    it('should trace symbol dependency paths', () => {
      const paths = searchEngine.getSymbolPath('interface1');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should return empty array for symbols with no path from root', () => {
      builder.addSymbol({
        id: 'isolated',
        name: 'IsolatedSymbol',
        type: 'function',
        filePath: '/test/isolated.ts',
        line: 1,
        column: 0,
        isExported: false,
        isPublic: false,
        tests: [],
        designDecisions: [],
      });

      const paths = searchEngine.getSymbolPath('isolated');
      expect(paths).toHaveLength(0);
    });
  });
});
