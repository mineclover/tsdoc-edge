/**
 * Tests for UndocumentedCommand
 */

import { UndocumentedCommand } from '../../commands/UndocumentedCommand';
import type { DatabaseManager } from '../../storage/DatabaseManager';

const symbolRow = (id: string, name: string, filePath: string, summary: string | null) => ({
  id,
  name,
  type: 'function',
  file_path: filePath,
  line: 7,
  column: 1,
  is_exported: 1,
  is_public: 1,
  summary,
});

describe('UndocumentedCommand', () => {
  let command: UndocumentedCommand;

  beforeEach(() => {
    command = new UndocumentedCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('undocumented');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toContain('undocumented');
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
    });
  });

  describe('output format', () => {
    let consoleSpy: jest.SpyInstance;
    const output = () => consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n');

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const dbManager = {
        getGraphData: jest.fn().mockReturnValue({
          symbols: [
            symbolRow('fn-a', 'alpha', 'src/a.ts', null),
            symbolRow('fn-b', 'beta', 'src/__tests__/b.test.ts', ''),
            symbolRow('fn-c', 'gamma', 'src/c.ts', 'Documented'),
          ],
          dependencies: [],
        }),
        close: jest.fn(),
      } as unknown as DatabaseManager;
      command = new UndocumentedCommand(dbManager);
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('prints an XML document by default', async () => {
      const result = await command.execute([]);

      expect(result.exitCode).toBe(0);
      expect(output().startsWith('<undocumented-symbols>')).toBe(true);
      expect(output()).toContain('<totalFound>2</totalFound>');
      expect(output()).toContain('<excludeTests>false</excludeTests>');
      expect(output()).toContain('<id>fn-a</id>');
      expect(output()).toContain('<filePath>src/a.ts</filePath>');
      expect(output()).not.toContain('fn-c');
      expect(output()).not.toContain('\x1b[');
    });

    it('honours --exclude-tests in the XML summary and list', async () => {
      await command.execute(['--exclude-tests']);

      expect(output()).toContain('<totalFound>1</totalFound>');
      expect(output()).toContain('<excludeTests>true</excludeTests>');
      expect(output()).not.toContain('fn-b');
    });

    it('prints the colored text report with --human', async () => {
      await command.execute(['--human']);

      expect(output()).toContain('Undocumented Symbols');
      expect(output()).toContain('Found 2 undocumented symbols:');
      expect(output()).toContain('Location: src/a.ts:7');
      expect(output()).toContain('\x1b[');
      expect(output()).not.toContain('<undocumented-symbols>');
    });

    it('documents --human in the help text', () => {
      expect((command as unknown as { getUsage(): string }).getUsage()).toContain('--human');
    });
  });
});
