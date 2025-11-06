/**
 * Tests for StatsComparator
 */

import { StatsComparator } from '../../analyzer/StatsComparator';
import type {
  DetectableStats,
  ImportanceCriteria,
  StatsHistoryEntry,
  TrackableStatistics,
} from '../../types/analysis';
import type { Symbol } from '../../types/graph';

describe('StatsComparator', () => {
  let comparator: StatsComparator;

  beforeEach(() => {
    comparator = new StatsComparator();
  });

  describe('constructor', () => {
    it('should create StatsComparator', () => {
      expect(comparator).toBeDefined();
    });
  });

  describe('compare', () => {
    it('should compare two stats with no changes', () => {
      const before: DetectableStats = {
        total: 10,
        documented: 5,
        undocumented: 5,
        rate: 50,
      };

      const after: DetectableStats = {
        total: 10,
        documented: 5,
        undocumented: 5,
        rate: 50,
      };

      const result = comparator.compare(before, after);

      expect(result.delta.total).toBe(0);
      expect(result.delta.documented).toBe(0);
      expect(result.delta.undocumented).toBe(0);
      expect(result.delta.rate).toBe(0);
      expect(result.hasWarning).toBe(false);
    });

    it('should detect improvement in documentation', () => {
      const before: DetectableStats = {
        total: 10,
        documented: 5,
        undocumented: 5,
        rate: 50,
      };

      const after: DetectableStats = {
        total: 10,
        documented: 8,
        undocumented: 2,
        rate: 80,
      };

      const result = comparator.compare(before, after);

      expect(result.delta.documented).toBe(3);
      expect(result.delta.undocumented).toBe(-3);
      expect(result.delta.rate).toBe(30);
      expect(result.hasWarning).toBe(false);
    });

    it('should detect decrease in documentation', () => {
      const before: DetectableStats = {
        total: 10,
        documented: 8,
        undocumented: 2,
        rate: 80,
      };

      const after: DetectableStats = {
        total: 10,
        documented: 5,
        undocumented: 5,
        rate: 50,
      };

      const result = comparator.compare(before, after);

      expect(result.delta.documented).toBe(-3);
      expect(result.delta.undocumented).toBe(3);
      expect(result.delta.rate).toBe(-30);
    });

    it('should detect new symbols added', () => {
      const before: DetectableStats = {
        total: 10,
        documented: 5,
        undocumented: 5,
        rate: 50,
      };

      const after: DetectableStats = {
        total: 15,
        documented: 8,
        undocumented: 7,
        rate: 53.3,
      };

      const result = comparator.compare(before, after);

      expect(result.delta.total).toBe(5);
      expect(result.delta.documented).toBe(3);
    });

    it('should detect symbols removed', () => {
      const before: DetectableStats = {
        total: 15,
        documented: 8,
        undocumented: 7,
        rate: 53.3,
      };

      const after: DetectableStats = {
        total: 10,
        documented: 5,
        undocumented: 5,
        rate: 50,
      };

      const result = comparator.compare(before, after);

      expect(result.delta.total).toBe(-5);
      expect(result.delta.documented).toBe(-3);
    });

    it('should warn on critical symbol documentation decrease', () => {
      const before: DetectableStats = {
        total: 10,
        documented: 8,
        undocumented: 2,
        rate: 80,
      };

      const after: DetectableStats = {
        total: 10,
        documented: 5,
        undocumented: 5,
        rate: 50,
      };

      const result = comparator.compare(before, after, true);

      expect(result.hasWarning).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should warn on critical symbol removal', () => {
      const before: DetectableStats = {
        total: 10,
        documented: 8,
        undocumented: 2,
        rate: 80,
      };

      const after: DetectableStats = {
        total: 8,
        documented: 6,
        undocumented: 2,
        rate: 75,
      };

      const result = comparator.compare(before, after, true);

      expect(result.hasWarning).toBe(true);
    });

    it('should warn on significant rate drop for critical', () => {
      const before: DetectableStats = {
        total: 10,
        documented: 9,
        undocumented: 1,
        rate: 90,
      };

      const after: DetectableStats = {
        total: 10,
        documented: 8,
        undocumented: 2,
        rate: 80,
      };

      const result = comparator.compare(before, after, true);

      expect(result.hasWarning).toBe(true);
    });

    it('should warn on major rate drop for overall', () => {
      const before: DetectableStats = {
        total: 100,
        documented: 80,
        undocumented: 20,
        rate: 80,
      };

      const after: DetectableStats = {
        total: 100,
        documented: 70,
        undocumented: 30,
        rate: 70,
      };

      const result = comparator.compare(before, after, false);

      expect(result.hasWarning).toBe(true);
    });

    it('should not warn on minor rate drop', () => {
      const before: DetectableStats = {
        total: 100,
        documented: 80,
        undocumented: 20,
        rate: 80,
      };

      const after: DetectableStats = {
        total: 100,
        documented: 79,
        undocumented: 21,
        rate: 79,
      };

      const result = comparator.compare(before, after, false);

      expect(result.hasWarning).toBe(false);
    });

    it('should round rate delta to one decimal', () => {
      const before: DetectableStats = {
        total: 100,
        documented: 33,
        undocumented: 67,
        rate: 33.333,
      };

      const after: DetectableStats = {
        total: 100,
        documented: 34,
        undocumented: 66,
        rate: 34.567,
      };

      const result = comparator.compare(before, after);

      expect(result.delta.rate.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(1);
    });
  });

  describe('compareWithHistory', () => {
    it('should compare current stats with history', () => {
      const history: StatsHistoryEntry = {
        timestamp: Date.now() - 3600000,
        overall: { total: 10, documented: 5, undocumented: 5, rate: 50 },
        critical: { total: 3, documented: 2, undocumented: 1, rate: 66.7 },
        important: { total: 4, documented: 2, undocumented: 2, rate: 50 },
        normal: { total: 3, documented: 1, undocumented: 2, rate: 33.3 },
        symbolIds: {
          critical: ['sym1', 'sym2'],
          important: ['sym3', 'sym4'],
          normal: ['sym5'],
        },
      };

      const current: TrackableStatistics = {
        timestamp: new Date().toISOString(),
        projectPath: '/test',
        overall: { total: 12, documented: 7, undocumented: 5, rate: 58.3 },
        byImportance: {
          critical: { total: 3, documented: 3, undocumented: 0, rate: 100 },
          important: { total: 5, documented: 3, undocumented: 2, rate: 60 },
          normal: { total: 4, documented: 1, undocumented: 3, rate: 25 },
        },
        symbolImportance: {},
      };

      const currentSymbols: Symbol[] = [];
      const result = comparator.compareWithHistory(
        current,
        history,
        currentSymbols,
        history.symbolIds
      );

      expect(result.comparison).toBeDefined();
      expect(result.comparison?.overall).toBeDefined();
      expect(result.comparison?.critical).toBeDefined();
      expect(result.comparison?.important).toBeDefined();
      expect(result.comparison?.normal).toBeDefined();
    });

    it('should detect symbol changes', () => {
      const history: StatsHistoryEntry = {
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        overall: { total: 5, documented: 3, undocumented: 2, rate: 60 },
        critical: { total: 2, documented: 2, undocumented: 0, rate: 100 },
        important: { total: 2, documented: 1, undocumented: 1, rate: 50 },
        normal: { total: 1, documented: 0, undocumented: 1, rate: 0 },
        symbolIds: {
          critical: ['removed-critical', 'existing-critical'],
          important: ['sym3'],
          normal: ['sym4'],
        },
      };

      const current: TrackableStatistics = {
        timestamp: new Date().toISOString(),
        projectPath: '/test',
        overall: { total: 4, documented: 3, undocumented: 1, rate: 75 },
        byImportance: {
          critical: { total: 1, documented: 1, undocumented: 0, rate: 100 },
          important: { total: 2, documented: 1, undocumented: 1, rate: 50 },
          normal: { total: 1, documented: 1, undocumented: 0, rate: 100 },
        },
        symbolImportance: {
          'existing-critical': { level: 'critical', reasons: ['public'] },
          sym3: { level: 'important', reasons: ['tested'] },
          sym4: { level: 'normal', reasons: ['private'] },
        },
      };

      const currentSymbols: Symbol[] = [
        createSymbol('existing-critical'),
        createSymbol('sym3'),
        createSymbol('sym4'),
      ];

      const result = comparator.compareWithHistory(
        current,
        history,
        currentSymbols,
        history.symbolIds
      );

      expect(result.comparison?.changes).toBeDefined();
      expect(result.comparison?.changes.length).toBeGreaterThan(0);
    });

    it('should track previous timestamp', () => {
      const timestamp = new Date(Date.now() - 7200000).toISOString();
      const history: StatsHistoryEntry = {
        timestamp,
        overall: { total: 10, documented: 5, undocumented: 5, rate: 50 },
        critical: { total: 2, documented: 2, undocumented: 0, rate: 100 },
        important: { total: 4, documented: 2, undocumented: 2, rate: 50 },
        normal: { total: 4, documented: 1, undocumented: 3, rate: 25 },
        symbolIds: { critical: [], important: [], normal: [] },
      };

      const current: TrackableStatistics = {
        timestamp: new Date().toISOString(),
        projectPath: '/test',
        overall: { total: 10, documented: 5, undocumented: 5, rate: 50 },
        byImportance: {
          critical: { total: 2, documented: 2, undocumented: 0, rate: 100 },
          important: { total: 4, documented: 2, undocumented: 2, rate: 50 },
          normal: { total: 4, documented: 1, undocumented: 3, rate: 25 },
        },
        symbolImportance: {},
      };

      const result = comparator.compareWithHistory(current, history, [], history.symbolIds);

      expect(result.comparison?.previousTimestamp).toBe(timestamp);
    });
  });

  describe('formatComparison', () => {
    it('should format comparison with positive delta', () => {
      const comparison = {
        before: { total: 10, documented: 5, undocumented: 5, rate: 50 },
        after: { total: 12, documented: 8, undocumented: 4, rate: 66.7 },
        delta: { total: 2, documented: 3, undocumented: -1, rate: 16.7 },
        hasWarning: false,
        warnings: [],
      };

      const formatted = comparator.formatComparison(comparison, 'Test');

      expect(formatted).toContain('12');
      expect(formatted).toContain('8');
      expect(formatted).toContain('66.7');
    });

    it('should format comparison with negative delta', () => {
      const comparison = {
        before: { total: 12, documented: 8, undocumented: 4, rate: 66.7 },
        after: { total: 10, documented: 5, undocumented: 5, rate: 50 },
        delta: { total: -2, documented: -3, undocumented: 1, rate: -16.7 },
        hasWarning: false,
        warnings: [],
      };

      const formatted = comparator.formatComparison(comparison, 'Test');

      expect(formatted).toContain('10');
      expect(formatted).toContain('5');
    });

    it('should include warnings in formatted output', () => {
      const comparison = {
        before: { total: 10, documented: 8, undocumented: 2, rate: 80 },
        after: { total: 10, documented: 5, undocumented: 5, rate: 50 },
        delta: { total: 0, documented: -3, undocumented: 3, rate: -30 },
        hasWarning: true,
        warnings: ['Warning 1', 'Warning 2'],
      };

      const formatted = comparator.formatComparison(comparison, 'Test');

      expect(formatted).toContain('Warning 1');
      expect(formatted).toContain('Warning 2');
    });

    it('should not include warnings section when none exist', () => {
      const comparison = {
        before: { total: 10, documented: 5, undocumented: 5, rate: 50 },
        after: { total: 10, documented: 6, undocumented: 4, rate: 60 },
        delta: { total: 0, documented: 1, undocumented: -1, rate: 10 },
        hasWarning: false,
        warnings: [],
      };

      const formatted = comparator.formatComparison(comparison, 'Test');

      expect(formatted.split('\n').length).toBeLessThan(6);
    });
  });

  describe('summarizeComparison', () => {
    it('should summarize statistics with comparison', () => {
      const stats: TrackableStatistics = {
        timestamp: new Date().toISOString(),
        projectPath: '/test',
        overall: { total: 10, documented: 7, undocumented: 3, rate: 70 },
        byImportance: {
          critical: { total: 3, documented: 3, undocumented: 0, rate: 100 },
          important: { total: 4, documented: 3, undocumented: 1, rate: 75 },
          normal: { total: 3, documented: 1, undocumented: 2, rate: 33.3 },
        },
        symbolImportance: {},
        comparison: {
          previousTimestamp: new Date(Date.now() - 3600000).toISOString(),
          overall: {
            before: { total: 10, documented: 5, undocumented: 5, rate: 50 },
            after: { total: 10, documented: 7, undocumented: 3, rate: 70 },
            delta: { total: 0, documented: 2, undocumented: -2, rate: 20 },
            hasWarning: false,
            warnings: [],
          },
          critical: {
            before: { total: 3, documented: 2, undocumented: 1, rate: 66.7 },
            after: { total: 3, documented: 3, undocumented: 0, rate: 100 },
            delta: { total: 0, documented: 1, undocumented: -1, rate: 33.3 },
            hasWarning: false,
            warnings: [],
          },
          important: {
            before: { total: 4, documented: 2, undocumented: 2, rate: 50 },
            after: { total: 4, documented: 3, undocumented: 1, rate: 75 },
            delta: { total: 0, documented: 1, undocumented: -1, rate: 25 },
            hasWarning: false,
            warnings: [],
          },
          normal: {
            before: { total: 3, documented: 1, undocumented: 2, rate: 33.3 },
            after: { total: 3, documented: 1, undocumented: 2, rate: 33.3 },
            delta: { total: 0, documented: 0, undocumented: 0, rate: 0 },
            hasWarning: false,
            warnings: [],
          },
          changes: [],
        },
      };

      const summary = comparator.summarizeComparison(stats);

      expect(summary).toContain('Documentation Tracking');
      expect(summary).toContain('Critical');
      expect(summary).toContain('Important');
      expect(summary).toContain('Normal');
    });

    it('should include symbol changes in summary', () => {
      const stats: TrackableStatistics = {
        timestamp: new Date().toISOString(),
        projectPath: '/test',
        overall: { total: 9, documented: 6, undocumented: 3, rate: 66.7 },
        byImportance: {
          critical: { total: 2, documented: 2, undocumented: 0, rate: 100 },
          important: { total: 4, documented: 3, undocumented: 1, rate: 75 },
          normal: { total: 3, documented: 1, undocumented: 2, rate: 33.3 },
        },
        symbolImportance: {},
        comparison: {
          previousTimestamp: new Date(Date.now() - 3600000).toISOString(),
          overall: {
            before: { total: 10, documented: 6, undocumented: 4, rate: 60 },
            after: { total: 9, documented: 6, undocumented: 3, rate: 66.7 },
            delta: { total: -1, documented: 0, undocumented: -1, rate: 6.7 },
            hasWarning: false,
            warnings: [],
          },
          critical: {
            before: { total: 3, documented: 3, undocumented: 0, rate: 100 },
            after: { total: 2, documented: 2, undocumented: 0, rate: 100 },
            delta: { total: -1, documented: -1, undocumented: 0, rate: 0 },
            hasWarning: true,
            warnings: ['Critical symbol removed'],
          },
          important: {
            before: { total: 4, documented: 2, undocumented: 2, rate: 50 },
            after: { total: 4, documented: 3, undocumented: 1, rate: 75 },
            delta: { total: 0, documented: 1, undocumented: -1, rate: 25 },
            hasWarning: false,
            warnings: [],
          },
          normal: {
            before: { total: 3, documented: 1, undocumented: 2, rate: 33.3 },
            after: { total: 3, documented: 1, undocumented: 2, rate: 33.3 },
            delta: { total: 0, documented: 0, undocumented: 0, rate: 0 },
            hasWarning: false,
            warnings: [],
          },
          changes: [
            {
              symbolId: 'removed-sym',
              symbolName: 'RemovedSymbol',
              importance: 'critical',
              changeType: 'removed',
              filePath: '/test.ts',
            },
          ],
        },
      };

      const summary = comparator.summarizeComparison(stats);

      expect(summary).toContain('Detailed Changes');
      expect(summary).toContain('RemovedSymbol');
      expect(summary).toContain('removed');
    });

    it('should handle stats without comparison', () => {
      const stats: TrackableStatistics = {
        timestamp: new Date().toISOString(),
        projectPath: '/test',
        overall: { total: 10, documented: 5, undocumented: 5, rate: 50 },
        byImportance: {
          critical: { total: 2, documented: 2, undocumented: 0, rate: 100 },
          important: { total: 4, documented: 2, undocumented: 2, rate: 50 },
          normal: { total: 4, documented: 1, undocumented: 3, rate: 25 },
        },
        symbolImportance: {},
      };

      const summary = comparator.summarizeComparison(stats);

      expect(summary).toBe('비교 데이터 없음');
    });
  });

  describe('edge cases', () => {
    it('should handle zero totals gracefully', () => {
      const before: DetectableStats = {
        total: 0,
        documented: 0,
        undocumented: 0,
        rate: 0,
      };

      const after: DetectableStats = {
        total: 0,
        documented: 0,
        undocumented: 0,
        rate: 0,
      };

      const result = comparator.compare(before, after);

      expect(result.delta.total).toBe(0);
    });

    it('should handle very large numbers', () => {
      const before: DetectableStats = {
        total: 1000000,
        documented: 500000,
        undocumented: 500000,
        rate: 50,
      };

      const after: DetectableStats = {
        total: 1000001,
        documented: 500001,
        undocumented: 500000,
        rate: 50,
      };

      const result = comparator.compare(before, after);

      expect(result.delta.total).toBe(1);
    });

    it('should handle negative rates gracefully', () => {
      const before: DetectableStats = {
        total: 10,
        documented: 5,
        undocumented: 5,
        rate: 50,
      };

      const after: DetectableStats = {
        total: 10,
        documented: 0,
        undocumented: 10,
        rate: 0,
      };

      const result = comparator.compare(before, after);

      expect(result.delta.rate).toBe(-50);
    });
  });
});

// Helper function
function createSymbol(id: string): Symbol {
  return {
    id,
    name: id,
    type: 'class',
    filePath: '/test.ts',
    line: 1,
    column: 1,
    isExported: true,
    isPublic: true,
    tests: [],
    designDecisions: [],
  };
}
