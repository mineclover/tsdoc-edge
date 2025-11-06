/**
 * Tests for StatsHistoryManager
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { DetectableStats, ImportanceCriteria, TrackableStatistics } from '../../types/analysis';
import { StatsHistoryManager } from '../../analyzer/StatsHistoryManager';

describe('StatsHistoryManager', () => {
  let manager: StatsHistoryManager;
  let tempDir: string;

  beforeEach(() => {
    manager = new StatsHistoryManager();
    tempDir = path.join(process.cwd(), '.test-temp', `stats-history-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create StatsHistoryManager', () => {
      expect(manager).toBeDefined();
      expect(manager).toBeInstanceOf(StatsHistoryManager);
    });
  });

  describe('load', () => {
    it('should load existing history file', () => {
      const historyPath = path.join(tempDir, 'history.json');
      const historyData = {
        version: '1.0.0',
        projectPath: '/project',
        entries: [
          {
            timestamp: new Date().toISOString(),
            overall: { total: 10, documented: 8, undocumented: 2, rate: 80 },
            critical: { total: 5, documented: 5, undocumented: 0, rate: 100 },
            important: { total: 3, documented: 2, undocumented: 1, rate: 66.7 },
            normal: { total: 2, documented: 1, undocumented: 1, rate: 50 },
            symbolIds: { critical: [], important: [], normal: [] },
          },
        ],
      };

      fs.writeFileSync(historyPath, JSON.stringify(historyData), 'utf-8');
      const loaded = manager.load(historyPath);

      expect(loaded).toBeDefined();
      expect(loaded?.version).toBe('1.0.0');
      expect(loaded?.entries.length).toBe(1);
    });

    it('should return null for non-existent file', () => {
      const nonExistent = path.join(tempDir, 'does-not-exist.json');
      const loaded = manager.load(nonExistent);

      expect(loaded).toBeNull();
    });

    it('should use default path when not specified', () => {
      // This test verifies behavior but may not create actual file
      const loaded = manager.load();
      // Will be null if file doesn't exist at default location
      expect(loaded === null || loaded?.version).toBeDefined();
    });

    it('should handle malformed JSON gracefully', () => {
      const historyPath = path.join(tempDir, 'bad.json');
      fs.writeFileSync(historyPath, '{ invalid json }', 'utf-8');

      const loaded = manager.load(historyPath);

      expect(loaded).toBeNull();
    });

    it('should load history with multiple entries', () => {
      const historyPath = path.join(tempDir, 'multi.json');
      const now = new Date();
      const historyData = {
        version: '1.0.0',
        projectPath: '/project',
        entries: [
          {
            timestamp: new Date(now.getTime() - 1000).toISOString(),
            overall: { total: 10, documented: 8, undocumented: 2, rate: 80 },
            critical: { total: 5, documented: 5, undocumented: 0, rate: 100 },
            important: { total: 3, documented: 2, undocumented: 1, rate: 66.7 },
            normal: { total: 2, documented: 1, undocumented: 1, rate: 50 },
            symbolIds: { critical: [], important: [], normal: [] },
          },
          {
            timestamp: new Date(now.getTime() - 2000).toISOString(),
            overall: { total: 9, documented: 7, undocumented: 2, rate: 77.8 },
            critical: { total: 5, documented: 4, undocumented: 1, rate: 80 },
            important: { total: 3, documented: 2, undocumented: 1, rate: 66.7 },
            normal: { total: 1, documented: 1, undocumented: 0, rate: 100 },
            symbolIds: { critical: [], important: [], normal: [] },
          },
        ],
      };

      fs.writeFileSync(historyPath, JSON.stringify(historyData), 'utf-8');
      const loaded = manager.load(historyPath);

      expect(loaded?.entries.length).toBe(2);
    });
  });

  describe('save', () => {
    it('should save statistics to new history file', () => {
      const historyPath = path.join(tempDir, 'new-history.json');
      const stats: TrackableStatistics = {
        timestamp: new Date().toISOString(),
        projectPath: '/project',
        overall: { total: 10, documented: 8, undocumented: 2, rate: 80 },
        byImportance: {
          critical: { total: 5, documented: 5, undocumented: 0, rate: 100 },
          important: { total: 3, documented: 2, undocumented: 1, rate: 66.7 },
          normal: { total: 2, documented: 1, undocumented: 1, rate: 50 },
        },
        symbolImportance: {},
      };

      manager.save(stats, [], historyPath);

      expect(fs.existsSync(historyPath)).toBe(true);
      const loaded = manager.load(historyPath);
      expect(loaded?.entries.length).toBe(1);
    });

    it('should append to existing history', () => {
      const historyPath = path.join(tempDir, 'append.json');
      const stats1: TrackableStatistics = {
        timestamp: new Date(Date.now() - 1000).toISOString(),
        projectPath: '/project',
        overall: { total: 10, documented: 8, undocumented: 2, rate: 80 },
        byImportance: {
          critical: { total: 5, documented: 5, undocumented: 0, rate: 100 },
          important: { total: 3, documented: 2, undocumented: 1, rate: 66.7 },
          normal: { total: 2, documented: 1, undocumented: 1, rate: 50 },
        },
        symbolImportance: {},
      };

      const stats2: TrackableStatistics = {
        timestamp: new Date().toISOString(),
        projectPath: '/project',
        overall: { total: 11, documented: 9, undocumented: 2, rate: 81.8 },
        byImportance: {
          critical: { total: 5, documented: 5, undocumented: 0, rate: 100 },
          important: { total: 4, documented: 3, undocumented: 1, rate: 75 },
          normal: { total: 2, documented: 1, undocumented: 1, rate: 50 },
        },
        symbolImportance: {},
      };

      manager.save(stats1, [], historyPath);
      manager.save(stats2, [], historyPath);

      const loaded = manager.load(historyPath);
      expect(loaded?.entries.length).toBe(2);
    });

    it('should prepend newest entries first', () => {
      const historyPath = path.join(tempDir, 'order.json');
      const now = Date.now();

      const stats1: TrackableStatistics = {
        timestamp: new Date(now - 2000).toISOString(),
        projectPath: '/project',
        overall: { total: 10, documented: 8, undocumented: 2, rate: 80 },
        byImportance: {
          critical: { total: 5, documented: 5, undocumented: 0, rate: 100 },
          important: { total: 3, documented: 2, undocumented: 1, rate: 66.7 },
          normal: { total: 2, documented: 1, undocumented: 1, rate: 50 },
        },
        symbolImportance: {},
      };

      const stats2: TrackableStatistics = {
        timestamp: new Date(now - 1000).toISOString(),
        projectPath: '/project',
        overall: { total: 11, documented: 9, undocumented: 2, rate: 81.8 },
        byImportance: {
          critical: { total: 5, documented: 5, undocumented: 0, rate: 100 },
          important: { total: 4, documented: 3, undocumented: 1, rate: 75 },
          normal: { total: 2, documented: 1, undocumented: 1, rate: 50 },
        },
        symbolImportance: {},
      };

      manager.save(stats1, [], historyPath);
      manager.save(stats2, [], historyPath);

      const loaded = manager.load(historyPath);
      // Most recent (stats2) should be first
      expect(loaded?.entries[0].overall.total).toBe(11);
      expect(loaded?.entries[1].overall.total).toBe(10);
    });

    it('should limit history to 50 entries', () => {
      const historyPath = path.join(tempDir, 'limit.json');
      const now = Date.now();

      // Save 60 entries
      for (let i = 0; i < 60; i++) {
        const stats: TrackableStatistics = {
          timestamp: new Date(now - i * 1000).toISOString(),
          projectPath: '/project',
          overall: { total: 10 + i, documented: 8 + i, undocumented: 2, rate: 80 },
          byImportance: {
            critical: { total: 5, documented: 5, undocumented: 0, rate: 100 },
            important: { total: 3, documented: 2, undocumented: 1, rate: 66.7 },
            normal: { total: 2, documented: 1, undocumented: 1, rate: 50 },
          },
          symbolImportance: {},
        };
        manager.save(stats, [], historyPath);
      }

      const loaded = manager.load(historyPath);
      expect(loaded?.entries.length).toBeLessThanOrEqual(50);
    });

    it('should organize symbol IDs by importance', () => {
      const historyPath = path.join(tempDir, 'symbols.json');
      const mockSymbols = [
        { id: 'sym-1', name: 'PublicAPI', type: 'class' as const, filePath: 'src/api.ts', line: 1, column: 0, isExported: true, isPublic: true, tests: [], designDecisions: [] },
        { id: 'sym-2', name: 'Service', type: 'class' as const, filePath: 'src/service.ts', line: 1, column: 0, isExported: true, isPublic: false, tests: [], designDecisions: [] },
        { id: 'sym-3', name: 'Helper', type: 'function' as const, filePath: 'src/helper.ts', line: 1, column: 0, isExported: false, isPublic: false, tests: [], designDecisions: [] },
      ];

      const stats: TrackableStatistics = {
        timestamp: new Date().toISOString(),
        projectPath: '/project',
        overall: { total: 10, documented: 8, undocumented: 2, rate: 80 },
        byImportance: {
          critical: { total: 5, documented: 5, undocumented: 0, rate: 100 },
          important: { total: 3, documented: 2, undocumented: 1, rate: 66.7 },
          normal: { total: 2, documented: 1, undocumented: 1, rate: 50 },
        },
        symbolImportance: {
          'sym-1': { level: 'critical', reasons: ['public'] },
          'sym-2': { level: 'important', reasons: ['exported'] },
          'sym-3': { level: 'normal', reasons: ['internal'] },
        },
      };

      manager.save(stats, mockSymbols, historyPath);

      const loaded = manager.load(historyPath);
      const entry = loaded?.entries[0];

      expect(entry?.symbolIds.critical).toContain('sym-1');
      expect(entry?.symbolIds.important).toContain('sym-2');
      expect(entry?.symbolIds.normal).toContain('sym-3');
    });
  });

  describe('getLatest', () => {
    it('should get latest entry from history', () => {
      const historyPath = path.join(tempDir, 'latest.json');
      const now = Date.now();

      const stats1: TrackableStatistics = {
        timestamp: new Date(now - 2000).toISOString(),
        projectPath: '/project',
        overall: { total: 10, documented: 8, undocumented: 2, rate: 80 },
        byImportance: {
          critical: { total: 5, documented: 5, undocumented: 0, rate: 100 },
          important: { total: 3, documented: 2, undocumented: 1, rate: 66.7 },
          normal: { total: 2, documented: 1, undocumented: 1, rate: 50 },
        },
        symbolImportance: {},
      };

      const stats2: TrackableStatistics = {
        timestamp: new Date(now - 1000).toISOString(),
        projectPath: '/project',
        overall: { total: 11, documented: 9, undocumented: 2, rate: 81.8 },
        byImportance: {
          critical: { total: 5, documented: 5, undocumented: 0, rate: 100 },
          important: { total: 4, documented: 3, undocumented: 1, rate: 75 },
          normal: { total: 2, documented: 1, undocumented: 1, rate: 50 },
        },
        symbolImportance: {},
      };

      manager.save(stats1, [], historyPath);
      manager.save(stats2, [], historyPath);

      const latest = manager.getLatest(historyPath);

      expect(latest).toBeDefined();
      expect(latest?.overall.total).toBe(11);
    });

    it('should return null when no history exists', () => {
      const nonExistent = path.join(tempDir, 'does-not-exist.json');
      const latest = manager.getLatest(nonExistent);

      expect(latest).toBeNull();
    });

    it('should return null for empty history', () => {
      const historyPath = path.join(tempDir, 'empty.json');
      const historyData = {
        version: '1.0.0',
        projectPath: '/project',
        entries: [],
      };

      fs.writeFileSync(historyPath, JSON.stringify(historyData), 'utf-8');
      const latest = manager.getLatest(historyPath);

      expect(latest).toBeNull();
    });
  });

  describe('getRecent', () => {
    it('should get recent entries within time range', () => {
      const historyPath = path.join(tempDir, 'recent.json');
      const now = Date.now();

      const stats1: TrackableStatistics = {
        timestamp: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        projectPath: '/project',
        overall: { total: 10, documented: 8, undocumented: 2, rate: 80 },
        byImportance: {
          critical: { total: 5, documented: 5, undocumented: 0, rate: 100 },
          important: { total: 3, documented: 2, undocumented: 1, rate: 66.7 },
          normal: { total: 2, documented: 1, undocumented: 1, rate: 50 },
        },
        symbolImportance: {},
      };

      const stats2: TrackableStatistics = {
        timestamp: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        projectPath: '/project',
        overall: { total: 11, documented: 9, undocumented: 2, rate: 81.8 },
        byImportance: {
          critical: { total: 5, documented: 5, undocumented: 0, rate: 100 },
          important: { total: 4, documented: 3, undocumented: 1, rate: 75 },
          normal: { total: 2, documented: 1, undocumented: 1, rate: 50 },
        },
        symbolImportance: {},
      };

      manager.save(stats1, [], historyPath);
      manager.save(stats2, [], historyPath);

      const recent = manager.getRecent(2, historyPath); // Last 2 days

      expect(recent.length).toBe(1);
      expect(recent[0].overall.total).toBe(11);
    });

    it('should return empty array for non-existent history', () => {
      const nonExistent = path.join(tempDir, 'does-not-exist.json');
      const recent = manager.getRecent(7, nonExistent);

      expect(recent).toEqual([]);
    });

    it('should handle days parameter correctly', () => {
      const historyPath = path.join(tempDir, 'days.json');
      const now = Date.now();

      const stats1: TrackableStatistics = {
        timestamp: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
        projectPath: '/project',
        overall: { total: 10, documented: 8, undocumented: 2, rate: 80 },
        byImportance: {
          critical: { total: 5, documented: 5, undocumented: 0, rate: 100 },
          important: { total: 3, documented: 2, undocumented: 1, rate: 66.7 },
          normal: { total: 2, documented: 1, undocumented: 1, rate: 50 },
        },
        symbolImportance: {},
      };

      const stats2: TrackableStatistics = {
        timestamp: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        projectPath: '/project',
        overall: { total: 11, documented: 9, undocumented: 2, rate: 81.8 },
        byImportance: {
          critical: { total: 5, documented: 5, undocumented: 0, rate: 100 },
          important: { total: 4, documented: 3, undocumented: 1, rate: 75 },
          normal: { total: 2, documented: 1, undocumented: 1, rate: 50 },
        },
        symbolImportance: {},
      };

      manager.save(stats1, [], historyPath);
      manager.save(stats2, [], historyPath);

      const recent7 = manager.getRecent(7, historyPath);
      expect(recent7.length).toBe(1); // Only 5 days ago entry

      const recent15 = manager.getRecent(15, historyPath);
      expect(recent15.length).toBe(2); // Both entries
    });
  });

  describe('clear', () => {
    it('should delete history file', () => {
      const historyPath = path.join(tempDir, 'delete.json');
      const stats: TrackableStatistics = {
        timestamp: new Date().toISOString(),
        projectPath: '/project',
        overall: { total: 10, documented: 8, undocumented: 2, rate: 80 },
        byImportance: {
          critical: { total: 5, documented: 5, undocumented: 0, rate: 100 },
          important: { total: 3, documented: 2, undocumented: 1, rate: 66.7 },
          normal: { total: 2, documented: 1, undocumented: 1, rate: 50 },
        },
        symbolImportance: {},
      };

      manager.save(stats, [], historyPath);
      expect(fs.existsSync(historyPath)).toBe(true);

      manager.clear(historyPath);

      expect(fs.existsSync(historyPath)).toBe(false);
    });

    it('should not throw when clearing non-existent file', () => {
      const nonExistent = path.join(tempDir, 'does-not-exist.json');

      expect(() => manager.clear(nonExistent)).not.toThrow();
    });
  });

  describe('export', () => {
    it('should export history to specified file', () => {
      const historyPath = path.join(tempDir, 'source.json');
      const exportPath = path.join(tempDir, 'export.json');

      const stats: TrackableStatistics = {
        timestamp: new Date().toISOString(),
        projectPath: '/project',
        overall: { total: 10, documented: 8, undocumented: 2, rate: 80 },
        byImportance: {
          critical: { total: 5, documented: 5, undocumented: 0, rate: 100 },
          important: { total: 3, documented: 2, undocumented: 1, rate: 66.7 },
          normal: { total: 2, documented: 1, undocumented: 1, rate: 50 },
        },
        symbolImportance: {},
      };

      manager.save(stats, [], historyPath);
      manager.export(exportPath, historyPath);

      expect(fs.existsSync(exportPath)).toBe(true);
      const exported = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
      expect(exported.version).toBe('1.0.0');
    });

    it('should throw when exporting non-existent history', () => {
      const nonExistent = path.join(tempDir, 'does-not-exist.json');
      const exportPath = path.join(tempDir, 'export.json');

      expect(() => manager.export(exportPath, nonExistent)).toThrow('No history to export');
    });
  });

  describe('getSummary', () => {
    it('should calculate summary statistics', () => {
      const historyPath = path.join(tempDir, 'summary.json');
      const now = Date.now();

      const stats1: TrackableStatistics = {
        timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
        projectPath: '/project',
        overall: { total: 10, documented: 8, undocumented: 2, rate: 80 },
        byImportance: {
          critical: { total: 5, documented: 5, undocumented: 0, rate: 100 },
          important: { total: 3, documented: 2, undocumented: 1, rate: 66.7 },
          normal: { total: 2, documented: 1, undocumented: 1, rate: 50 },
        },
        symbolImportance: {},
      };

      const stats2: TrackableStatistics = {
        timestamp: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
        projectPath: '/project',
        overall: { total: 10, documented: 9, undocumented: 1, rate: 90 },
        byImportance: {
          critical: { total: 5, documented: 5, undocumented: 0, rate: 100 },
          important: { total: 3, documented: 3, undocumented: 0, rate: 100 },
          normal: { total: 2, documented: 1, undocumented: 1, rate: 50 },
        },
        symbolImportance: {},
      };

      manager.save(stats1, [], historyPath);
      manager.save(stats2, [], historyPath);

      const summary = manager.getSummary(7, historyPath);

      expect(summary.count).toBe(2);
      expect(summary.avgOverallRate).toBeGreaterThan(80);
      expect(summary.avgOverallRate).toBeLessThan(90);
      expect(summary.avgCriticalRate).toBe(100);
    });

    it('should detect improving trend', () => {
      const historyPath = path.join(tempDir, 'improving.json');
      const now = Date.now();

      // Entries saved newest to oldest will be ordered newest first in the array
      // First half of array = newest entries, second half = oldest entries
      // For improving trend: recentAvg > olderAvg + 2
      for (let i = 0; i < 10; i++) {
        const stats: TrackableStatistics = {
          timestamp: new Date(now - (9 - i) * 1000).toISOString(),
          projectPath: '/project',
          overall: { total: 100, documented: 30 + i * 10, undocumented: 70 - i * 10, rate: 30 + i * 10 },
          byImportance: {
            critical: { total: 50, documented: 50, undocumented: 0, rate: 100 },
            important: { total: 30, documented: 30, undocumented: 0, rate: 100 },
            normal: { total: 20, documented: 10, undocumented: 10, rate: 50 },
          },
          symbolImportance: {},
        };
        manager.save(stats, [], historyPath);
      }

      const summary = manager.getSummary(30, historyPath);

      expect(summary.trend).toBe('improving');
    });

    it('should detect declining trend', () => {
      const historyPath = path.join(tempDir, 'declining.json');
      const now = Date.now();

      // For declining trend: recentAvg < olderAvg - 2
      // So newer entries (first half of array) should have lower rates than older entries
      for (let i = 0; i < 10; i++) {
        const stats: TrackableStatistics = {
          timestamp: new Date(now - (9 - i) * 1000).toISOString(),
          projectPath: '/project',
          overall: { total: 100, documented: 90 - i * 10, undocumented: 10 + i * 10, rate: 90 - i * 10 },
          byImportance: {
            critical: { total: 50, documented: 50, undocumented: 0, rate: 100 },
            important: { total: 30, documented: 30, undocumented: 0, rate: 100 },
            normal: { total: 20, documented: 10, undocumented: 10, rate: 50 },
          },
          symbolImportance: {},
        };
        manager.save(stats, [], historyPath);
      }

      const summary = manager.getSummary(30, historyPath);

      expect(summary.trend).toBe('declining');
    });

    it('should return default summary for non-existent history', () => {
      const nonExistent = path.join(tempDir, 'does-not-exist.json');
      const summary = manager.getSummary(7, nonExistent);

      expect(summary.count).toBe(0);
      expect(summary.avgCriticalRate).toBe(0);
      expect(summary.avgOverallRate).toBe(0);
      expect(summary.trend).toBe('stable');
    });

    it('should detect stable trend when rates do not change significantly', () => {
      const historyPath = path.join(tempDir, 'stable.json');
      const now = Date.now();

      for (let i = 10; i > 0; i--) {
        const stats: TrackableStatistics = {
          timestamp: new Date(now - i * 1000).toISOString(),
          projectPath: '/project',
          overall: { total: 100, documented: 80, undocumented: 20, rate: 80 },
          byImportance: {
            critical: { total: 50, documented: 50, undocumented: 0, rate: 100 },
            important: { total: 30, documented: 24, undocumented: 6, rate: 80 },
            normal: { total: 20, documented: 6, undocumented: 14, rate: 30 },
          },
          symbolImportance: {},
        };
        manager.save(stats, [], historyPath);
      }

      const summary = manager.getSummary(30, historyPath);

      expect(summary.trend).toBe('stable');
    });
  });

  describe('edge cases', () => {
    it('should handle very old history entries', () => {
      const historyPath = path.join(tempDir, 'old.json');
      const veryOldDate = new Date(2020, 0, 1).toISOString();

      const historyData = {
        version: '1.0.0',
        projectPath: '/project',
        entries: [
          {
            timestamp: veryOldDate,
            overall: { total: 10, documented: 8, undocumented: 2, rate: 80 },
            critical: { total: 5, documented: 5, undocumented: 0, rate: 100 },
            important: { total: 3, documented: 2, undocumented: 1, rate: 66.7 },
            normal: { total: 2, documented: 1, undocumented: 1, rate: 50 },
            symbolIds: { critical: [], important: [], normal: [] },
          },
        ],
      };

      fs.writeFileSync(historyPath, JSON.stringify(historyData), 'utf-8');
      const recent = manager.getRecent(7, historyPath);

      expect(recent.length).toBe(0);
    });

    it('should handle zero entries gracefully', () => {
      const historyPath = path.join(tempDir, 'zero.json');
      const stats: TrackableStatistics = {
        timestamp: new Date().toISOString(),
        projectPath: '/project',
        overall: { total: 0, documented: 0, undocumented: 0, rate: 0 },
        byImportance: {
          critical: { total: 0, documented: 0, undocumented: 0, rate: 0 },
          important: { total: 0, documented: 0, undocumented: 0, rate: 0 },
          normal: { total: 0, documented: 0, undocumented: 0, rate: 0 },
        },
        symbolImportance: {},
      };

      manager.save(stats, [], historyPath);
      const loaded = manager.load(historyPath);

      expect(loaded?.entries[0].overall.rate).toBe(0);
    });

    it('should handle fractional rates', () => {
      const historyPath = path.join(tempDir, 'fractional.json');
      const stats: TrackableStatistics = {
        timestamp: new Date().toISOString(),
        projectPath: '/project',
        overall: { total: 3, documented: 1, undocumented: 2, rate: 33.3 },
        byImportance: {
          critical: { total: 3, documented: 1, undocumented: 2, rate: 33.3 },
          important: { total: 0, documented: 0, undocumented: 0, rate: 0 },
          normal: { total: 0, documented: 0, undocumented: 0, rate: 0 },
        },
        symbolImportance: {},
      };

      manager.save(stats, [], historyPath);
      const latest = manager.getLatest(historyPath);

      expect(latest?.overall.rate).toBe(33.3);
    });
  });
});
