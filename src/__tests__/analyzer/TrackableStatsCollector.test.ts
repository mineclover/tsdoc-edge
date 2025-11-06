/**
 * Tests for TrackableStatsCollector
 */

import type { Symbol } from '../../types/graph';
import { TrackableStatsCollector } from '../../analyzer/TrackableStatsCollector';

describe('TrackableStatsCollector', () => {
  let collector: TrackableStatsCollector;

  beforeEach(() => {
    collector = new TrackableStatsCollector();
  });

  describe('constructor', () => {
    it('should create TrackableStatsCollector', () => {
      expect(collector).toBeDefined();
      expect(collector).toBeInstanceOf(TrackableStatsCollector);
    });
  });

  describe('collect', () => {
    it('should collect statistics from empty symbols list', () => {
      const stats = collector.collect('/project', [], new Map());

      expect(stats).toBeDefined();
      expect(stats.timestamp).toBeDefined();
      expect(stats.projectPath).toBe('/project');
      expect(stats.overall.total).toBe(0);
      expect(stats.overall.documented).toBe(0);
      expect(stats.overall.undocumented).toBe(0);
      expect(stats.overall.rate).toBe(0);
    });

    it('should collect statistics from single documented symbol', () => {
      const symbols: Symbol[] = [
        {
          id: 'sym-1',
          name: 'MyClass',
          type: 'class',
          filePath: 'src/my-class.ts',
          line: 1,
          column: 0,
          isExported: false,
          isPublic: false,
          summary: 'A sample class',
          tests: [],
          designDecisions: [],
        } as Symbol,
      ];

      const stats = collector.collect('/project', symbols, new Map());

      expect(stats.overall.total).toBe(1);
      expect(stats.overall.documented).toBe(1);
      expect(stats.overall.undocumented).toBe(0);
      expect(stats.overall.rate).toBe(100);
    });

    it('should collect statistics from single undocumented symbol', () => {
      const symbols: Symbol[] = [
        {
          id: 'sym-1',
          name: 'MyClass',
          type: 'class',
          filePath: 'src/my-class.ts',
          line: 1,
          column: 0,
          isExported: false,
          isPublic: false,
          tests: [],
          designDecisions: [],
        },
      ];

      const stats = collector.collect('/project', symbols, new Map());

      expect(stats.overall.total).toBe(1);
      expect(stats.overall.documented).toBe(0);
      expect(stats.overall.undocumented).toBe(1);
      expect(stats.overall.rate).toBe(0);
    });

    it('should collect statistics from mixed symbols', () => {
      const symbols: Symbol[] = [
        {
          id: 'sym-1',
          name: 'Class1',
          type: 'class',
          filePath: 'src/class1.ts',
          line: 1,
          column: 0,
          isExported: false,
          isPublic: false,
          summary: 'Documented class',
          tests: [],
          designDecisions: [],
        },
        {
          id: 'sym-2',
          name: 'Class2',
          type: 'class',
          filePath: 'src/class2.ts',
          line: 1,
          column: 0,
          isExported: false,
          isPublic: false,
          tests: [],
          designDecisions: [],
        },
        {
          id: 'sym-3',
          name: 'Class3',
          type: 'class',
          filePath: 'src/class3.ts',
          line: 1,
          column: 0,
          isExported: false,
          isPublic: false,
          summary: 'Documented class',
          tests: [],
          designDecisions: [],
        },
      ];

      const stats = collector.collect('/project', symbols, new Map());

      expect(stats.overall.total).toBe(3);
      expect(stats.overall.documented).toBe(2);
      expect(stats.overall.undocumented).toBe(1);
      expect(stats.overall.rate).toBe(Number.parseFloat((66.7).toFixed(1)));
    });

    it('should classify symbols by importance', () => {
      const symbols: Symbol[] = [
        {
          id: 'sym-1',
          name: 'PublicAPI',
          type: 'class',
          filePath: 'src/api.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          summary: 'Public API',
          tests: [],
          designDecisions: [],
        },
        {
          id: 'sym-2',
          name: 'Internal',
          type: 'function',
          filePath: 'src/internal.ts',
          line: 1,
          column: 0,
          isExported: false,
          isPublic: false,
          summary: 'Internal function',
          tests: [],
          designDecisions: [],
        },
      ];

      const stats = collector.collect('/project', symbols, new Map());

      expect(stats.byImportance.critical).toBeDefined();
      expect(stats.byImportance.important).toBeDefined();
      expect(stats.byImportance.normal).toBeDefined();
    });

    it('should organize symbol importance mapping', () => {
      const symbols: Symbol[] = [
        {
          id: 'sym-1',
          name: 'MyClass',
          type: 'class',
          filePath: 'src/my-class.ts',
          line: 1,
          column: 0,
          isExported: false,
          isPublic: true,
          summary: 'A class',
          tests: [],
          designDecisions: [],
        },
      ];

      const stats = collector.collect('/project', symbols, new Map());

      expect(stats.symbolImportance['sym-1']).toBeDefined();
      expect(stats.symbolImportance['sym-1'].level).toBeDefined();
      expect(stats.symbolImportance['sym-1'].reasons).toBeDefined();
      expect(Array.isArray(stats.symbolImportance['sym-1'].reasons)).toBe(true);
    });

    it('should use connection counts for classification', () => {
      const symbols: Symbol[] = [
        {
          id: 'sym-1',
          name: 'UsedClass',
          type: 'class',
          filePath: 'src/used.ts',
          line: 1,
          column: 0,
          isExported: false,
          isPublic: false,
          tests: [],
          designDecisions: [],
        },
      ];

      const connectionCounts = new Map<string, number>([['sym-1', 10]]);

      const stats = collector.collect('/project', symbols, connectionCounts);

      expect(stats).toBeDefined();
      expect(stats.symbolImportance['sym-1']).toBeDefined();
    });

    it('should group statistics by importance level', () => {
      const symbols: Symbol[] = [
        {
          id: 'sym-1',
          name: 'PublicAPI',
          type: 'class',
          filePath: 'src/api.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          summary: 'Public API',
          tests: [],
          designDecisions: [],
        },
        {
          id: 'sym-2',
          name: 'Service',
          type: 'class',
          filePath: 'src/service.ts',
          line: 1,
          column: 0,
          isExported: false,
          isPublic: false,
          summary: 'A service',
          tests: [],
          designDecisions: [],
        },
        {
          id: 'sym-3',
          name: 'Helper',
          type: 'function',
          filePath: 'src/helper.ts',
          line: 1,
          column: 0,
          isExported: false,
          isPublic: false,
          tests: [],
          designDecisions: [],
        },
      ];

      const stats = collector.collect('/project', symbols, new Map());

      expect(stats.byImportance.critical.total).toBeGreaterThanOrEqual(0);
      expect(stats.byImportance.important.total).toBeGreaterThanOrEqual(0);
      expect(stats.byImportance.normal.total).toBeGreaterThanOrEqual(0);
    });

    it('should include timestamp in statistics', () => {
      const symbols: Symbol[] = [];
      const stats = collector.collect('/project', symbols, new Map());

      expect(stats.timestamp).toBeDefined();
      const timestampDate = new Date(stats.timestamp);
      expect(timestampDate instanceof Date).toBe(true);
      expect(timestampDate.getTime()).toBeGreaterThan(0);
    });
  });

  describe('getSymbolsByImportance', () => {
    it('should filter critical symbols', () => {
      const symbols: Symbol[] = [
        {
          id: 'sym-1',
          name: 'PublicAPI',
          type: 'class',
          filePath: 'src/api.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
        {
          id: 'sym-2',
          name: 'Internal',
          type: 'function',
          filePath: 'src/internal.ts',
          line: 1,
          column: 0,
          isExported: false,
          isPublic: false,
          tests: [],
          designDecisions: [],
        },
      ];

      const critical = collector.getSymbolsByImportance(symbols, new Map(), 'critical');

      expect(critical).toBeDefined();
      expect(Array.isArray(critical)).toBe(true);
    });

    it('should filter important symbols', () => {
      const symbols: Symbol[] = [
        {
          id: 'sym-1',
          name: 'Class1',
          type: 'class',
          filePath: 'src/class1.ts',
          line: 1,
          column: 0,
          isExported: false,
          isPublic: false,
          tests: [],
          designDecisions: [],
        },
        {
          id: 'sym-2',
          name: 'Function1',
          type: 'function',
          filePath: 'src/function1.ts',
          line: 1,
          column: 0,
          isExported: false,
          isPublic: false,
          tests: [],
          designDecisions: [],
        },
      ];

      const important = collector.getSymbolsByImportance(symbols, new Map(), 'important');

      expect(important).toBeDefined();
      expect(Array.isArray(important)).toBe(true);
    });

    it('should filter normal symbols', () => {
      const symbols: Symbol[] = [
        {
          id: 'sym-1',
          name: 'Helper',
          type: 'function',
          filePath: 'src/helper.ts',
          line: 1,
          column: 0,
          isExported: false,
          isPublic: false,
          tests: [],
          designDecisions: [],
        },
      ];

      const normal = collector.getSymbolsByImportance(symbols, new Map(), 'normal');

      expect(normal).toBeDefined();
      expect(Array.isArray(normal)).toBe(true);
    });

    it('should respect connection counts for importance', () => {
      const symbols: Symbol[] = [
        {
          id: 'sym-1',
          name: 'HighlyConnected',
          type: 'class',
          filePath: 'src/connected.ts',
          line: 1,
          column: 0,
          isExported: false,
          isPublic: false,
          tests: [],
          designDecisions: [],
        },
      ];

      const connectionCounts = new Map<string, number>([['sym-1', 50]]);

      const critical = collector.getSymbolsByImportance(symbols, connectionCounts, 'critical');

      expect(critical).toBeDefined();
    });
  });

  describe('summarize', () => {
    it('should generate summary text for empty statistics', () => {
      const symbols: Symbol[] = [];
      const stats = collector.collect('/project', symbols, new Map());

      const summary = collector.summarize(stats);

      expect(summary).toBeDefined();
      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
    });

    it('should include documentation tracking header', () => {
      const symbols: Symbol[] = [];
      const stats = collector.collect('/project', symbols, new Map());

      const summary = collector.summarize(stats);

      expect(summary).toContain('Documentation Tracking');
    });

    it('should include overall statistics in summary', () => {
      const symbols: Symbol[] = [
        {
          id: 'sym-1',
          name: 'Class1',
          type: 'class',
          filePath: 'src/class1.ts',
          line: 1,
          column: 0,
          isExported: false,
          isPublic: false,
          summary: 'A class',
          tests: [],
          designDecisions: [],
        },
      ];

      const stats = collector.collect('/project', symbols, new Map());
      const summary = collector.summarize(stats);

      expect(summary).toContain('전체 감지 대상');
      expect(summary).toContain('1 symbols');
    });

    it('should include critical symbols section', () => {
      const symbols: Symbol[] = [
        {
          id: 'sym-1',
          name: 'PublicAPI',
          type: 'class',
          filePath: 'src/api.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
      ];

      const stats = collector.collect('/project', symbols, new Map());
      const summary = collector.summarize(stats);

      expect(summary).toContain('Critical');
    });

    it('should include important symbols section', () => {
      const symbols: Symbol[] = [
        {
          id: 'sym-1',
          name: 'Service',
          type: 'class',
          filePath: 'src/service.ts',
          line: 1,
          column: 0,
          isExported: false,
          isPublic: false,
          tests: [],
          designDecisions: [],
        },
      ];

      const stats = collector.collect('/project', symbols, new Map());
      const summary = collector.summarize(stats);

      expect(summary).toContain('Important');
    });

    it('should include normal symbols section', () => {
      const symbols: Symbol[] = [
        {
          id: 'sym-1',
          name: 'Helper',
          type: 'function',
          filePath: 'src/helper.ts',
          line: 1,
          column: 0,
          isExported: false,
          isPublic: false,
          tests: [],
          designDecisions: [],
        },
      ];

      const stats = collector.collect('/project', symbols, new Map());
      const summary = collector.summarize(stats);

      expect(summary).toContain('Normal');
    });

    it('should format documentation rates', () => {
      const symbols: Symbol[] = [
        {
          id: 'sym-1',
          name: 'A',
          type: 'class',
          filePath: 'src/a.ts',
          line: 1,
          column: 0,
          isExported: false,
          isPublic: false,
          summary: 'Doc',
          tests: [],
          designDecisions: [],
        },
        {
          id: 'sym-2',
          name: 'B',
          type: 'class',
          filePath: 'src/b.ts',
          line: 1,
          column: 0,
          isExported: false,
          isPublic: false,
          tests: [],
          designDecisions: [],
        },
      ];

      const stats = collector.collect('/project', symbols, new Map());
      const summary = collector.summarize(stats);

      expect(summary).toMatch(/\d+(\.\d+)?%/);
    });

    it('should include emoji indicators for documentation status', () => {
      const symbols: Symbol[] = [
        {
          id: 'sym-1',
          name: 'Class1',
          type: 'class',
          filePath: 'src/class1.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
      ];

      const stats = collector.collect('/project', symbols, new Map());
      const summary = collector.summarize(stats);

      expect(summary).toMatch(/[✅⚠️❌]/);
    });

    it('should show document count by importance level', () => {
      const symbols: Symbol[] = [
        {
          id: 'sym-1',
          name: 'PublicAPI',
          type: 'class',
          filePath: 'src/api.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          summary: 'Public API',
          tests: [],
          designDecisions: [],
        },
        {
          id: 'sym-2',
          name: 'Helper',
          type: 'function',
          filePath: 'src/helper.ts',
          line: 1,
          column: 0,
          isExported: false,
          isPublic: false,
          tests: [],
          designDecisions: [],
        },
      ];

      const stats = collector.collect('/project', symbols, new Map());
      const summary = collector.summarize(stats);

      expect(summary).toContain('감지 대상');
      expect(summary).toContain('문서화됨');
      expect(summary).toContain('미문서화');
    });
  });

  describe('edge cases', () => {
    it('should handle symbols with multiple documentation types', () => {
      const symbols: Symbol[] = [
        {
          id: 'sym-1',
          name: 'FullyDocumented',
          type: 'class',
          filePath: 'src/full.ts',
          line: 1,
          column: 0,
          isExported: false,
          isPublic: false,
          summary: 'A summary',
          tests: [],
          designDecisions: [],
        } as Symbol,
      ];

      const stats = collector.collect('/project', symbols, new Map());

      expect(stats.overall.documented).toBe(1);
    });

    it('should handle large numbers of symbols', () => {
      const symbols: Symbol[] = [];
      for (let i = 0; i < 1000; i++) {
        symbols.push({
          id: `sym-${i}`,
          name: `Class${i}`,
          type: 'class',
          filePath: `src/class${i}.ts`,
          line: 1,
          column: 0,
          isExported: false,
          isPublic: false,
          summary: i % 2 === 0 ? 'Documented' : undefined,
          tests: [],
          designDecisions: [],
        });
      }

      const stats = collector.collect('/project', symbols, new Map());

      expect(stats.overall.total).toBe(1000);
      expect(stats.overall.documented).toBe(500);
      expect(stats.overall.undocumented).toBe(500);
      expect(stats.overall.rate).toBe(50);
    });

    it('should handle special characters in symbol names', () => {
      const symbols: Symbol[] = [
        {
          id: 'sym-1',
          name: 'Class<T>',
          type: 'class',
          filePath: 'src/generic.ts',
          line: 1,
          column: 0,
          isExported: false,
          isPublic: false,
          summary: 'A generic class',
          tests: [],
          designDecisions: [],
        },
      ];

      const stats = collector.collect('/project', symbols, new Map());

      expect(stats.overall.documented).toBe(1);
    });

    it('should handle zero documentation rate gracefully', () => {
      const symbols: Symbol[] = [
        {
          id: 'sym-1',
          name: 'A',
          type: 'class',
          filePath: 'src/a.ts',
          line: 1,
          column: 0,
          isExported: false,
          isPublic: false,
          tests: [],
          designDecisions: [],
        },
        {
          id: 'sym-2',
          name: 'B',
          type: 'function',
          filePath: 'src/b.ts',
          line: 1,
          column: 0,
          isExported: false,
          isPublic: false,
          tests: [],
          designDecisions: [],
        },
      ];

      const stats = collector.collect('/project', symbols, new Map());

      expect(stats.overall.rate).toBe(0);
      expect(Number.isNaN(stats.overall.rate)).toBe(false);
    });

    it('should handle 100% documentation rate', () => {
      const symbols: Symbol[] = [
        {
          id: 'sym-1',
          name: 'A',
          type: 'class',
          filePath: 'src/a.ts',
          line: 1,
          column: 0,
          isExported: false,
          isPublic: false,
          summary: 'A',
          tests: [],
          designDecisions: [],
        },
        {
          id: 'sym-2',
          name: 'B',
          type: 'class',
          filePath: 'src/b.ts',
          line: 1,
          column: 0,
          isExported: false,
          isPublic: false,
          summary: 'B',
          tests: [],
          designDecisions: [],
        },
      ];

      const stats = collector.collect('/project', symbols, new Map());

      expect(stats.overall.rate).toBe(100);
    });
  });
});
