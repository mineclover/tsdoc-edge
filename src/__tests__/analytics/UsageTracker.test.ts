/**
 * UsageTracker tests
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { UsageTracker } from '../../analytics/UsageTracker';
import type { CommandUsageEvent } from '../../types/analytics';

describe('UsageTracker', () => {
  let tempDir: string;
  let tracker: UsageTracker;

  const createEvent = (overrides: Partial<CommandUsageEvent> = {}): CommandUsageEvent => ({
    command: 'test',
    args: [],
    timestamp: new Date().toISOString(),
    duration: 100,
    success: true,
    cwd: process.cwd(),
    nodeVersion: process.version,
    version: '0.11.0',
    ...overrides,
  });

  beforeEach(() => {
    tempDir = path.join(process.cwd(), '.test-temp', 'analytics-test-' + Math.random());
    tracker = new UsageTracker({
      enabled: true,
      storagePath: tempDir,
      maxEvents: 100,
      retentionDays: 30,
    });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create storage directory', () => {
      expect(fs.existsSync(tempDir)).toBe(true);
    });

    it('should not create directory if disabled', () => {
      const disabledDir = path.join(process.cwd(), '.test-temp', 'disabled-test-' + Math.random());
      new UsageTracker({ enabled: false, storagePath: disabledDir });
      expect(fs.existsSync(disabledDir)).toBe(false);
    });
  });

  describe('recordEvent', () => {
    it('should record event successfully', () => {
      const event = createEvent({ command: 'test', args: ['arg1'] });
      const result = tracker.recordEvent(event);
      expect(result).toBe(true);

      const events = tracker.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].command).toBe('test');
    });

    it('should return false when disabled', () => {
      const disabledTracker = new UsageTracker({ enabled: false });
      const result = disabledTracker.recordEvent(createEvent());
      expect(result).toBe(false);
    });

    it('should record multiple events', () => {
      for (let i = 0; i < 5; i++) {
        tracker.recordEvent(createEvent({ command: 'cmd-' + i, duration: 100 + i }));
      }
      const events = tracker.getEvents();
      expect(events).toHaveLength(5);
    });
  });

  describe('getStatistics', () => {
    it('should return empty stats when no events', () => {
      const stats = tracker.getStatistics();
      expect(stats.totalCommands).toBe(0);
      expect(stats.commandCounts).toEqual({});
    });

    it('should calculate command counts', () => {
      tracker.recordEvent(createEvent({ command: 'build', duration: 100 }));
      tracker.recordEvent(createEvent({ command: 'build', duration: 150 }));
      tracker.recordEvent(createEvent({ command: 'test', duration: 200 }));

      const stats = tracker.getStatistics();
      expect(stats.totalCommands).toBe(3);
      expect(stats.commandCounts.build).toBe(2);
      expect(stats.commandCounts.test).toBe(1);
    });

    it('should calculate average duration', () => {
      tracker.recordEvent(createEvent({ command: 'test', duration: 100 }));
      tracker.recordEvent(createEvent({ command: 'test', duration: 200 }));
      const stats = tracker.getStatistics();
      expect(stats.avgDuration.test).toBe(150);
    });

    it('should calculate success rate', () => {
      tracker.recordEvent(createEvent({ command: 'test', success: true }));
      tracker.recordEvent(createEvent({ command: 'test', success: false }));
      const stats = tracker.getStatistics();
      expect(stats.successRate.test).toBe(50);
    });
  });

  describe('getTopCommands', () => {
    it('should return top commands by usage', () => {
      for (let i = 0; i < 10; i++) tracker.recordEvent(createEvent({ command: 'build' }));
      for (let i = 0; i < 5; i++) tracker.recordEvent(createEvent({ command: 'test' }));

      const top = tracker.getTopCommands(2);
      expect(top).toHaveLength(2);
      expect(top[0].command).toBe('build');
      expect(top[0].count).toBe(10);
    });

    it('should calculate percentage', () => {
      tracker.recordEvent(createEvent({ command: 'cmd1' }));
      tracker.recordEvent(createEvent({ command: 'cmd2' }));
      const top = tracker.getTopCommands();
      expect(top[0].percentage).toBe(50);
    });
  });

  describe('getRecentErrors', () => {
    it('should return only failed events', () => {
      tracker.recordEvent(createEvent({ command: 'success', success: true }));
      tracker.recordEvent(createEvent({ command: 'error', success: false, error: 'Test error' }));
      const errors = tracker.getRecentErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].command).toBe('error');
    });

    it('should limit results', () => {
      for (let i = 0; i < 10; i++) tracker.recordEvent(createEvent({ command: 'error', success: false }));
      const errors = tracker.getRecentErrors(5);
      expect(errors).toHaveLength(5);
    });
  });

  describe('clear', () => {
    it('should clear all events', () => {
      tracker.recordEvent(createEvent());
      expect(tracker.getEvents()).toHaveLength(1);
      const result = tracker.clear();
      expect(result).toBe(true);
      expect(tracker.getEvents()).toHaveLength(0);
    });
  });

  describe('exportToJSON', () => {
    it('should export analytics data', () => {
      tracker.recordEvent(createEvent({ command: 'test' }));
      const outputPath = path.join(tempDir, 'export.json');
      const result = tracker.exportToJSON(outputPath);
      expect(result).toBe(true);
      expect(fs.existsSync(outputPath)).toBe(true);

      const exported = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
      expect(exported.statistics).toBeDefined();
      expect(exported.dailySummaries).toBeDefined();
      expect(exported.topCommands).toBeDefined();
    });
  });

  describe('formatReport', () => {
    it('should generate formatted report', () => {
      tracker.recordEvent(createEvent({ command: 'build' }));
      const report = tracker.formatReport();
      expect(report).toContain('Usage Analytics Report');
      expect(report).toContain('OVERVIEW');
      expect(report).toContain('TOP COMMANDS');
    });
  });
});
