/**
 * Tests for UsageCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { UsageTracker } from '../../analytics/UsageTracker';
import { UsageCommand } from '../../commands/UsageCommand';

describe('UsageCommand', () => {
  let command: UsageCommand;
  let tracker: UsageTracker;
  let tempDir: string;

  beforeEach(() => {
    // Create temp directory for test analytics
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-test-'));

    tracker = new UsageTracker({
      enabled: true,
      storagePath: tempDir,
      maxEvents: 100,
      retentionDays: 90,
    });

    command = new UsageCommand(tracker);
  });

  afterEach(() => {
    // Cleanup temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('getName', () => {
    it('should return "usage"', () => {
      expect(command.getName()).toBe('usage');
    });
  });

  describe('getDescription', () => {
    it('should return description', () => {
      expect(command.getDescription()).toContain('analytics');
    });
  });

  describe('execute', () => {
    it('should show report by default', async () => {
      const result = await command.execute([]);

      expect(result.exitCode).toBe(0);
    });

    it('should show report with "report" subcommand', async () => {
      const result = await command.execute(['report']);

      expect(result.exitCode).toBe(0);
    });

    it('should export analytics', async () => {
      const outputPath = path.join(tempDir, 'export.json');

      const result = await command.execute(['export', outputPath]);

      expect(result.exitCode).toBe(0);
      expect(fs.existsSync(outputPath)).toBe(true);

      const data = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
      expect(data).toHaveProperty('statistics');
      expect(data).toHaveProperty('topCommands');
    });

    it('should export to default path if not specified', async () => {
      const exportToJSON = jest.spyOn(tracker, 'exportToJSON').mockReturnValue(true);

      const result = await command.execute(['export']);

      expect(result.exitCode).toBe(0);
      expect(exportToJSON).toHaveBeenCalledWith('usage-analytics.json');
    });

    it('should clear analytics data', async () => {
      // Add some data first
      tracker.recordEvent({
        command: 'test',
        args: [],
        timestamp: new Date().toISOString(),
        duration: 100,
        success: true,
        cwd: process.cwd(),
        nodeVersion: process.version,
        version: '1.0.0',
      });

      const result = await command.execute(['clear']);

      expect(result.exitCode).toBe(0);
      const events = tracker.getEvents();
      expect(events.length).toBe(0);
    });

    it('should show no errors when none exist', async () => {
      const result = await command.execute(['errors']);

      expect(result.exitCode).toBe(0);
      expect(result.message).toContain('No errors');
    });

    it('should show recent errors', async () => {
      // Add error event
      tracker.recordEvent({
        command: 'test',
        args: [],
        timestamp: new Date().toISOString(),
        duration: 100,
        success: false,
        error: 'Test error',
        cwd: process.cwd(),
        nodeVersion: process.version,
        version: '1.0.0',
      });

      const result = await command.execute(['errors']);

      expect(result.exitCode).toBe(0);
      expect(result.message).toContain('1 errors');
    });

    it('should show help message', async () => {
      const result = await command.execute(['help']);

      expect(result.exitCode).toBe(0);
    });

    it('should return error for unknown subcommand', async () => {
      const result = await command.execute(['unknown']);

      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('Unknown subcommand');
    });
  });
});
