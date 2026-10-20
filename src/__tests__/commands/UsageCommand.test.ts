/**
 * Tests for UsageCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { UsageTracker } from '../../analytics/UsageTracker';
import { UsageCommand } from '../../commands/UsageCommand';
import type { CommandUsageEvent } from '../../types/analytics';

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
  describe('output modes', () => {
    let log: jest.SpyInstance;

    const hasAnsi = (text: string): boolean => text.includes('\x1b[');

    const recordEvent = (overrides: Partial<CommandUsageEvent> = {}): void => {
      tracker.recordEvent({
        command: 'build',
        args: [],
        timestamp: '2026-01-02T03:04:05.000Z',
        duration: 1500,
        success: true,
        cwd: process.cwd(),
        nodeVersion: process.version,
        version: '1.0.0',
        ...overrides,
      });
    };

    const run = async (args: string[]): Promise<{ exitCode: number; output: string }> => {
      log.mockClear();
      const result = await command.execute(args);
      return { exitCode: result.exitCode, output: log.mock.calls.flat().join('\n') };
    };

    beforeEach(() => {
      log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    afterEach(() => {
      log.mockRestore();
    });

    it('prints the report as XML by default', async () => {
      recordEvent();
      recordEvent({ duration: 500 });
      recordEvent({ command: 'stats', success: false, error: 'broke <badly> & loudly' });

      const { exitCode, output } = await run([]);

      expect(exitCode).toBe(0);
      expect(output.startsWith('<usage-report>')).toBe(true);
      expect(output.endsWith('</usage-report>')).toBe(true);
      expect(output).toContain('<totalCommands>3</totalCommands>');
      expect(output).toContain('<totalDurationMs>');
      expect(output).toContain('<command>build</command>');
      expect(output).toContain('<percent>66.7</percent>');
      expect(output).toContain('<avgDurationMs>1000</avgDurationMs>');
      expect(output).toContain('<date>2026-01-02</date>');
      expect(output).toContain('<error>broke &lt;badly&gt; &amp; loudly</error>');
      expect(hasAnsi(output)).toBe(false);
      expect(output).not.toContain('Usage Analytics');
    });

    it('prints a valid empty report when there is no data', async () => {
      const { exitCode, output } = await run(['report']);

      expect(exitCode).toBe(0);
      expect(output).toContain('<totalCommands>0</totalCommands>');
      expect(output).toContain('<topCommands count="0">');
      expect(output).toContain('<recentErrors count="0">');
    });

    it('keeps the formatted report behind --human', async () => {
      recordEvent();

      const { exitCode, output } = await run(['--human']);

      expect(exitCode).toBe(0);
      expect(output).toContain('TSDoc Edge - Usage Analytics');
      expect(output).toContain('Usage Analytics Report');
      expect(output).toContain('TOP COMMANDS');
      expect(output).not.toContain('<usage-report>');
    });

    it('lists recent errors as XML by default and as text with --human', async () => {
      recordEvent({ command: 'stats', success: false, error: 'first line\nsecond line' });

      const xml = await run(['errors']);
      expect(xml.exitCode).toBe(0);
      expect(xml.output).toContain('<usage-errors>');
      expect(xml.output).toContain('<count>1</count>');
      expect(xml.output).toContain('<command>stats</command>');
      expect(hasAnsi(xml.output)).toBe(false);

      const human = await run(['errors', '--human']);
      expect(human.exitCode).toBe(0);
      expect(human.output).toContain('Recent Errors (1):');
      expect(human.output).toContain('first line');
      expect(human.output).not.toContain('second line');
      expect(hasAnsi(human.output)).toBe(true);
    });

    it('prints an empty error document when nothing failed', async () => {
      const { exitCode, output } = await run(['errors']);

      expect(exitCode).toBe(0);
      expect(output).toContain('<count>0</count>');
      expect(output).toContain('<errors count="0">');
    });

    it('reports export and clear results as XML by default', async () => {
      recordEvent();
      const outputPath = path.join(tempDir, 'export.json');

      const exported = await run(['export', outputPath]);
      expect(exported.exitCode).toBe(0);
      expect(exported.output).toContain('<usage-export>');
      expect(exported.output).toContain(`<path>${outputPath}</path>`);
      expect(fs.existsSync(outputPath)).toBe(true);

      const cleared = await run(['clear']);
      expect(cleared.exitCode).toBe(0);
      expect(cleared.output).toContain('<usage-clear>');
      expect(cleared.output).toContain('<cleared>true</cleared>');
      expect(tracker.getEvents()).toHaveLength(0);
    });

    it('keeps the success lines behind --human and accepts the flag anywhere', async () => {
      const outputPath = path.join(tempDir, 'export-human.json');

      const exported = await run(['--human', 'export', outputPath]);
      expect(exported.exitCode).toBe(0);
      expect(exported.output).toContain('Analytics exported to:');
      expect(fs.existsSync(outputPath)).toBe(true);

      const cleared = await run(['clear', '--human']);
      expect(cleared.exitCode).toBe(0);
      expect(cleared.output).toContain('Analytics data cleared');
      expect(cleared.output).not.toContain('<usage-clear>');
    });

    it('keeps unknown subcommands failing in both modes', async () => {
      for (const args of [['unknown'], ['unknown', '--human']]) {
        const { exitCode, output } = await run(args);
        expect(exitCode).toBe(1);
        expect(output).toContain('Unknown subcommand: unknown');
      }
    });

    it('documents --human in the usage text', () => {
      expect((command as unknown as { getUsage(): string }).getUsage()).toContain('--human');
    });
  });
});
