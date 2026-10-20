/**
 * Tests for UntestedCommand
 */

import { UntestedCommand } from '../../commands/UntestedCommand';
import type { DatabaseManager } from '../../storage/DatabaseManager';

const symbolRow = (id: string, type: string, filePath: string) => ({
  id,
  name: id.toUpperCase(),
  type,
  file_path: filePath,
  line: 3,
  column: 0,
  is_exported: 1,
  is_public: 1,
  summary: null,
});

describe('UntestedCommand', () => {
  let command: UntestedCommand;

  beforeEach(() => {
    command = new UntestedCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('untested');
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

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const dbManager = {
        getAllSymbolRows: jest
          .fn()
          .mockReturnValue([
            symbolRow('svc', 'class', 'src/svc.ts'),
            symbolRow('svc-spec', 'function', 'src/__tests__/svc.test.ts'),
            symbolRow('suite', 'test-suite', 'src/__tests__/svc.test.ts'),
          ]),
        close: jest.fn(),
      } as unknown as DatabaseManager;
      command = new UntestedCommand();
      Object.assign(command, { dbManager });
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('prints an XML document by default', async () => {
      const result = await command.execute([]);

      expect(result.exitCode).toBe(0);
      expect(output().startsWith('<untested-symbols>')).toBe(true);
      expect(output()).toContain('<totalFound>2</totalFound>');
      expect(output()).toContain('<id>svc</id>');
      expect(output()).not.toContain('<id>suite</id>');
      expect(output()).not.toContain('\x1b[');
    });

    it('honours --exclude-tests in the XML summary and list', async () => {
      await command.execute(['--exclude-tests']);

      expect(output()).toContain('<totalFound>1</totalFound>');
      expect(output()).toContain('<excludeTests>true</excludeTests>');
      expect(output()).not.toContain('svc-spec');
    });

    it('prints the colored text report with --human', async () => {
      await command.execute(['--human']);

      expect(output()).toContain('Untested Symbols');
      expect(output()).toContain('Found 2 untested symbols:');
      expect(output()).toContain('\x1b[');
      expect(output()).not.toContain('<untested-symbols>');
    });
  });
});
