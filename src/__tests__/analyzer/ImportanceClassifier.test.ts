/**
 * Tests for ImportanceClassifier
 */

import { ImportanceClassifier } from '../../analyzer/ImportanceClassifier';
import type { Symbol } from '../../types/graph';

describe('ImportanceClassifier', () => {
  let classifier: ImportanceClassifier;

  beforeEach(() => {
    classifier = new ImportanceClassifier();
  });

  describe('constructor', () => {
    it('should create ImportanceClassifier', () => {
      expect(classifier).toBeDefined();
    });
  });

  describe('classify', () => {
    it('should classify public API as critical', () => {
      const symbol: Symbol = {
        id: 'test-id',
        name: 'PublicAPI',
        type: 'function',
        filePath: '/test.ts',
        line: 1,
        column: 1,
        isExported: true,
        isPublic: true,
        tests: [],
        designDecisions: [],
      };

      const result = classifier.classify(symbol);

      expect(result.level).toBe('critical');
      expect(result.reasons).toContain('public API');
    });

    it('should classify exported symbol as critical', () => {
      const symbol: Symbol = {
        id: 'test-id',
        name: 'ExportedFunc',
        type: 'function',
        filePath: '/test.ts',
        line: 1,
        column: 1,
        isExported: true,
        isPublic: false,
        tests: [],
        designDecisions: [],
      };

      const result = classifier.classify(symbol);

      expect(result.level).toBe('critical');
      expect(result.reasons).toContain('exported');
    });

    it('should classify symbol with contract as critical', () => {
      const symbol: Symbol = {
        id: 'test-id',
        name: 'ContractFunc',
        type: 'function',
        filePath: '/test.ts',
        line: 1,
        column: 1,
        isExported: false,
        isPublic: false,
        contract: {
          symbolName: 'ContractFunc',
          description: 'Must return positive number',
          preconditions: [],
          postconditions: [],
          invariants: [],
          filePath: '/test.ts',
        },
        tests: [],
        designDecisions: [],
      };

      const result = classifier.classify(symbol);

      expect(result.level).toBe('critical');
      expect(result.reasons).toContain('has contract');
    });

    it('should classify symbol with responsibility as critical', () => {
      const symbol: Symbol = {
        id: 'test-id',
        name: 'ResponsibleFunc',
        type: 'function',
        filePath: '/test.ts',
        line: 1,
        column: 1,
        isExported: false,
        isPublic: false,
        responsibility: {
          symbolName: 'ResponsibleFunc',
          description: 'Manages user authentication',
        },
        tests: [],
        designDecisions: [],
      };

      const result = classifier.classify(symbol);

      expect(result.level).toBe('critical');
      expect(result.reasons).toContain('has responsibility');
    });

    it('should classify structural type as important', () => {
      const symbol: Symbol = {
        id: 'test-id',
        name: 'UserInterface',
        type: 'interface',
        filePath: '/test.ts',
        line: 1,
        column: 1,
        isExported: false,
        isPublic: false,
        tests: [],
        designDecisions: [],
      };

      const result = classifier.classify(symbol);

      expect(result.level).toBe('important');
      expect(result.reasons).toContain('structural type');
    });

    it('should classify highly connected symbol as important', () => {
      const symbol: Symbol = {
        id: 'test-id',
        name: 'HubFunc',
        type: 'function',
        filePath: '/test.ts',
        line: 1,
        column: 1,
        isExported: false,
        isPublic: false,
        tests: [],
        designDecisions: [],
      };

      const result = classifier.classify(symbol, 10);

      expect(result.level).toBe('important');
      expect(result.reasons.some((r: string) => r.includes('high connectivity'))).toBe(true);
    });

    it('should classify tested symbol as important', () => {
      const symbol: Symbol = {
        id: 'test-id',
        name: 'TestedFunc',
        type: 'function',
        filePath: '/test.ts',
        line: 1,
        column: 1,
        isExported: false,
        isPublic: false,
        tests: [{ symbolName: 'TestedFunc', testFilePath: '/test.test.ts', testName: 'test1', scenarios: [] }],
        designDecisions: [],
      };

      const result = classifier.classify(symbol);

      expect(result.level).toBe('important');
      expect(result.reasons.some((r: string) => r.includes('tested'))).toBe(true);
    });

    it('should classify class as important', () => {
      const symbol: Symbol = {
        id: 'test-id',
        name: 'UserClass',
        type: 'class',
        filePath: '/test.ts',
        line: 1,
        column: 1,
        isExported: false,
        isPublic: false,
        tests: [],
        designDecisions: [],
      };

      const result = classifier.classify(symbol);

      expect(result.level).toBe('important');
      expect(result.reasons).toContain('core structure');
    });

    it('should classify private helper as normal', () => {
      const symbol: Symbol = {
        id: 'test-id',
        name: 'helperFunc',
        type: 'function',
        filePath: '/test.ts',
        line: 1,
        column: 1,
        isExported: false,
        isPublic: false,
        tests: [],
        designDecisions: [],
      };

      const result = classifier.classify(symbol);

      expect(result.level).toBe('normal');
      expect(result.reasons).toContain('private helper');
    });

    it('should handle connection count of 0', () => {
      const symbol: Symbol = {
        id: 'test-id',
        name: 'IsolatedFunc',
        type: 'function',
        filePath: '/test.ts',
        line: 1,
        column: 1,
        isExported: false,
        isPublic: false,
        tests: [],
        designDecisions: [],
      };

      const result = classifier.classify(symbol, 0);

      expect(result.level).toBe('normal');
    });

    it('should prioritize critical over important conditions', () => {
      const symbol: Symbol = {
        id: 'test-id',
        name: 'CriticalClass',
        type: 'class',
        filePath: '/test.ts',
        line: 1,
        column: 1,
        isExported: true,
        isPublic: true,
        tests: [{ symbolName: 'CriticalClass', testFilePath: '/test.test.ts', testName: 'test1', scenarios: [] }],
        designDecisions: [],
      };

      const result = classifier.classify(symbol, 10);

      expect(result.level).toBe('critical');
      expect(result.reasons.length).toBeGreaterThan(0);
    });
  });

  describe('classifyAll', () => {
    it('should classify multiple symbols', () => {
      const symbols: Symbol[] = [
        {
          id: 'id1',
          name: 'PublicFunc',
          type: 'function',
          filePath: '/test.ts',
          line: 1,
          column: 1,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
        {
          id: 'id2',
          name: 'HelperFunc',
          type: 'function',
          filePath: '/test.ts',
          line: 2,
          column: 1,
          isExported: false,
          isPublic: false,
          tests: [],
          designDecisions: [],
        },
      ];

      const result = classifier.classifyAll(symbols);

      expect(result.size).toBe(2);
      expect(result.get('id1')?.level).toBe('critical');
      expect(result.get('id2')?.level).toBe('normal');
    });

    it('should use connection counts map', () => {
      const symbols: Symbol[] = [
        {
          id: 'hub',
          name: 'HubFunc',
          type: 'function',
          filePath: '/test.ts',
          line: 1,
          column: 1,
          isExported: false,
          isPublic: false,
          tests: [],
          designDecisions: [],
        },
      ];

      const connectionCounts = new Map([['hub', 8]]);
      const result = classifier.classifyAll(symbols, connectionCounts);

      expect(result.get('hub')?.level).toBe('important');
      expect(result.get('hub')?.reasons.some((r: string) => r.includes('high connectivity'))).toBe(true);
    });

    it('should handle empty symbols array', () => {
      const result = classifier.classifyAll([]);

      expect(result.size).toBe(0);
    });

    it('should handle missing connection counts', () => {
      const symbols: Symbol[] = [
        {
          id: 'test',
          name: 'TestFunc',
          type: 'function',
          filePath: '/test.ts',
          line: 1,
          column: 1,
          isExported: false,
          isPublic: false,
          tests: [],
          designDecisions: [],
        },
      ];

      const result = classifier.classifyAll(symbols);

      expect(result.size).toBe(1);
      expect(result.get('test')).toBeDefined();
    });
  });

  describe('groupByImportance', () => {
    it('should group symbols by importance level', () => {
      const symbols: Symbol[] = [
        {
          id: 'critical1',
          name: 'CriticalFunc',
          type: 'function',
          filePath: '/test.ts',
          line: 1,
          column: 1,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
        {
          id: 'important1',
          name: 'ImportantClass',
          type: 'class',
          filePath: '/test.ts',
          line: 2,
          column: 1,
          isExported: false,
          isPublic: false,
          tests: [],
          designDecisions: [],
        },
        {
          id: 'normal1',
          name: 'normalFunc',
          type: 'function',
          filePath: '/test.ts',
          line: 3,
          column: 1,
          isExported: false,
          isPublic: false,
          tests: [],
          designDecisions: [],
        },
      ];

      const importanceMap = classifier.classifyAll(symbols);
      const grouped = classifier.groupByImportance(symbols, importanceMap);

      expect(grouped.critical.length).toBe(1);
      expect(grouped.important.length).toBe(1);
      expect(grouped.normal.length).toBe(1);
      expect(grouped.critical[0].id).toBe('critical1');
      expect(grouped.important[0].id).toBe('important1');
      expect(grouped.normal[0].id).toBe('normal1');
    });

    it('should handle empty symbols array', () => {
      const importanceMap = new Map();
      const grouped = classifier.groupByImportance([], importanceMap);

      expect(grouped.critical.length).toBe(0);
      expect(grouped.important.length).toBe(0);
      expect(grouped.normal.length).toBe(0);
    });

    it('should skip symbols not in importance map', () => {
      const symbols: Symbol[] = [
        {
          id: 'unknown',
          name: 'UnknownFunc',
          type: 'function',
          filePath: '/test.ts',
          line: 1,
          column: 1,
          isExported: false,
          isPublic: false,
          tests: [],
          designDecisions: [],
        },
      ];

      const importanceMap = new Map();
      const grouped = classifier.groupByImportance(symbols, importanceMap);

      expect(grouped.critical.length).toBe(0);
      expect(grouped.important.length).toBe(0);
      expect(grouped.normal.length).toBe(0);
    });
  });

  describe('filterByLevel', () => {
    it('should filter symbols by critical level', () => {
      const symbols: Symbol[] = [
        {
          id: 'critical1',
          name: 'CriticalFunc',
          type: 'function',
          filePath: '/test.ts',
          line: 1,
          column: 1,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
        {
          id: 'normal1',
          name: 'normalFunc',
          type: 'function',
          filePath: '/test.ts',
          line: 2,
          column: 1,
          isExported: false,
          isPublic: false,
          tests: [],
          designDecisions: [],
        },
      ];

      const importanceMap = classifier.classifyAll(symbols);
      const filtered = classifier.filterByLevel(symbols, importanceMap, 'critical');

      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('critical1');
    });

    it('should filter symbols by important level', () => {
      const symbols: Symbol[] = [
        {
          id: 'important1',
          name: 'ImportantClass',
          type: 'class',
          filePath: '/test.ts',
          line: 1,
          column: 1,
          isExported: false,
          isPublic: false,
          tests: [],
          designDecisions: [],
        },
      ];

      const importanceMap = classifier.classifyAll(symbols);
      const filtered = classifier.filterByLevel(symbols, importanceMap, 'important');

      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('important1');
    });

    it('should filter symbols by normal level', () => {
      const symbols: Symbol[] = [
        {
          id: 'normal1',
          name: 'normalFunc',
          type: 'function',
          filePath: '/test.ts',
          line: 1,
          column: 1,
          isExported: false,
          isPublic: false,
          tests: [],
          designDecisions: [],
        },
      ];

      const importanceMap = classifier.classifyAll(symbols);
      const filtered = classifier.filterByLevel(symbols, importanceMap, 'normal');

      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('normal1');
    });

    it('should return empty array when no matches', () => {
      const symbols: Symbol[] = [
        {
          id: 'critical1',
          name: 'CriticalFunc',
          type: 'function',
          filePath: '/test.ts',
          line: 1,
          column: 1,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
      ];

      const importanceMap = classifier.classifyAll(symbols);
      const filtered = classifier.filterByLevel(symbols, importanceMap, 'normal');

      expect(filtered.length).toBe(0);
    });

    it('should handle empty symbols array', () => {
      const importanceMap = new Map();
      const filtered = classifier.filterByLevel([], importanceMap, 'critical');

      expect(filtered.length).toBe(0);
    });
  });
});
