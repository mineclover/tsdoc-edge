/**
 * Tests for CoverageReportCommand
 */

import { CoverageReportCommand } from '../../commands/CoverageReportCommand';
import type { DatabaseManager } from '../../storage/DatabaseManager';

describe('CoverageReportCommand', () => {
  let command: CoverageReportCommand;

  beforeEach(() => {
    command = new CoverageReportCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('coverage-report');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toBeDefined();
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

    const symbol = (name: string, type: string, filePath: string) => ({
      id: `${type}-${name}`,
      name,
      type,
      filePath,
      line: 1,
      column: 0,
    });

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const db = {
        getAllSymbols: jest
          .fn()
          .mockResolvedValue([
            symbol('AlphaCommand', 'class', 'src/commands/NoSuchAlphaCommand.ts'),
            symbol('helper', 'function', 'src/utils/NoSuchHelper.ts'),
            symbol('LIMIT', 'variable', 'src/utils/NoSuchLimit.ts'),
          ]),
        close: jest.fn(),
      } as unknown as DatabaseManager;
      command = new CoverageReportCommand(db);
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('prints an XML document by default', async () => {
      const result = await command.execute([]);

      expect(result.exitCode).toBe(0);
      expect(output().startsWith('<coverage-report>')).toBe(true);
      expect(output()).toContain('<total>3</total>');
      expect(output()).toContain('<documented>0</documented>');
      expect(output()).toContain('<coverage>0</coverage>');
      expect(output()).toContain('<mode>doc-tag</mode>');
      expect(output()).toContain('<highPriorityUndocumented>1</highPriorityUndocumented>');
      expect(output()).toContain('<name>commands</name>');
      expect(output()).toContain('<name>AlphaCommand</name>');
      expect(output()).not.toContain('<name>helper</name>');
      expect(output()).not.toContain('\x1b[');
    });

    it('prints the colored text report with --human', async () => {
      await command.execute(['--human']);

      expect(output()).toContain('SSOT Coverage Report');
      expect(output()).toContain('Total symbols: 3');
      expect(output()).toContain('\x1b[');
      expect(output()).not.toContain('<coverage-report>');
    });

    it('keeps --json as the machine format', async () => {
      await command.execute(['--json']);

      expect(output()).toContain('"undocumentedSymbols"');
      expect(output()).not.toContain('<coverage-report>');
    });
  });
});
