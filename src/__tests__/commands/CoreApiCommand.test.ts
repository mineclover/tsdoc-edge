/**
 * Tests for CoreApiCommand
 * @testScenario Default output is an XML document
 * @testScenario --human keeps the colored listing
 */

import { CoreApiCommand } from '../../commands/CoreApiCommand';
import type { DatabaseManager } from '../../storage/DatabaseManager';

const ANSI = '\x1b[';

function symbolRow(overrides: Record<string, unknown>) {
  return {
    id: 'id',
    name: 'name',
    type: 'function',
    file_path: 'src/a.ts',
    line: 1,
    column: 0,
    is_exported: 1,
    is_public: 1,
    summary: null,
    ...overrides,
  };
}

describe('CoreApiCommand', () => {
  let command: CoreApiCommand;
  let logSpy: jest.SpyInstance;

  const symbols = [
    symbolRow({ id: 'api', name: 'publicApi', summary: 'Public <entry> & more' }),
    symbolRow({ id: 'helper', name: 'helper', is_exported: 0, file_path: 'src/h.ts', line: 7 }),
    symbolRow({ id: 'unused', name: 'unused', is_exported: 0, file_path: 'src/u.ts' }),
    symbolRow({ id: 'tested', name: 'tested', file_path: 'src/__tests__/a.test.ts', line: 3 }),
  ];
  const dependencies = [{ symbol_id: 'api', target: 'helper', type: 'dependsOn', import_path: '' }];

  const createDb = () =>
    ({
      getGraphData: jest.fn(() => ({ symbols, dependencies })),
      close: jest.fn(),
    }) as unknown as DatabaseManager;

  const output = () => logSpy.mock.calls.map((call) => call.join(' ')).join('\n');

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  describe('metadata', () => {
    it('should return command name', () => {
      command = new CoreApiCommand();
      expect(command.getName()).toBe('core-api');
    });

    it('should return command description', () => {
      command = new CoreApiCommand();
      expect(command.getDescription()).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      command = new CoreApiCommand();
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
      expect(output()).toContain('--human');
    });

    it('prints an XML document by default', async () => {
      command = new CoreApiCommand(createDb());

      const result = await command.execute([]);
      const xml = output();

      expect(result.exitCode).toBe(0);
      expect(xml).not.toContain(ANSI);
      expect(xml.startsWith('<core-api>')).toBe(true);
      expect(xml.endsWith('</core-api>')).toBe(true);
      expect(xml).toContain('<totalExported>2</totalExported>');
      expect(xml).toContain('<coreApiSize>3</coreApiSize>');
      expect(xml).toContain('<excludeTests>false</excludeTests>');
      expect(xml).toContain('<exportedSymbols count="2">');
      expect(xml).toContain('<summary>Public &lt;entry&gt; &amp; more</summary>');
      // Only the 1-depth dependency of an exported symbol is part of the core API
      expect(xml).toContain('<coreDependencies count="1">');
      expect(xml).toContain('<id>helper</id>');
      expect(xml).not.toContain('<id>unused</id>');
      expect(xml).not.toContain('Core API Symbols');
    });

    it('honours --exclude-tests in the XML output', async () => {
      command = new CoreApiCommand(createDb());

      await command.execute(['--exclude-tests']);
      const xml = output();

      expect(xml).toContain('<excludeTests>true</excludeTests>');
      expect(xml).toContain('<totalExported>1</totalExported>');
      expect(xml).not.toContain('a.test.ts');
    });

    it('prints the colored listing with --human', async () => {
      command = new CoreApiCommand(createDb());

      const result = await command.execute(['--human']);
      const text = output();

      expect(result.exitCode).toBe(0);
      expect(text).toContain('Core API Symbols');
      expect(text).toContain('Exported Symbols');
      expect(text).toContain(ANSI);
      expect(text).not.toContain('<core-api>');
    });
  });
});
