/**
 * Tests for FindMethodCommand
 */

import { FindMethodCommand } from '../../commands/FindMethodCommand';
import type { SymbolRegistryManager } from '../../storage/SymbolRegistryManager';

describe('FindMethodCommand', () => {
  let command: FindMethodCommand;

  beforeEach(() => {
    command = new FindMethodCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('find-method');
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

  describe('output format (registry)', () => {
    let consoleSpy: jest.SpyInstance;
    const output = () => consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n');

    const entry = (id: string, qualifiedName: string, extra: Record<string, unknown> = {}) => ({
      id,
      sourceRef: {
        filePath: 'src/processor.ts',
        symbolName: qualifiedName.split('.').pop(),
        qualifiedName,
        type: 'method',
        line: 21,
        depth: 1,
        ...extra,
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });

    const parent = entry('processor', 'DataProcessor', { type: 'class', depth: 0 });
    const loadCsv = entry('processor-load-csv', 'DataProcessor.loadCSV', {
      memberOf: 'processor',
      memberType: 'instance',
    });
    const loadJson = entry('processor-load-json', 'DataProcessor.loadJSON');

    const managerFor = (matches: { exact?: unknown; search?: unknown[] }) => {
      const byId = new Map([parent, loadCsv, loadJson].map((e) => [e.id, e]));
      return {
        findByQualifiedName: jest.fn().mockReturnValue(matches.exact),
        search: jest.fn().mockReturnValue(matches.search ?? []),
        findById: jest.fn((id: string) => byId.get(id)),
        getChildren: jest.fn().mockReturnValue([]),
      } as unknown as SymbolRegistryManager;
    };

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('prints one XML document with details for an exact match', async () => {
      command = new FindMethodCommand(managerFor({ exact: loadCsv }));

      const result = await command.execute(['DataProcessor.loadCSV']);

      expect(result.exitCode).toBe(0);
      expect(output().startsWith('<method-search>')).toBe(true);
      expect(output()).toContain('<query>DataProcessor.loadCSV</query>');
      expect(output()).toContain('<source>registry</source>');
      expect(output()).toContain('<totalMatches>1</totalMatches>');
      expect(output()).toContain('<id>processor-load-csv</id>');
      expect(output()).toContain('<parent>processor</parent>');
      expect(output()).toContain('<parentName>DataProcessor</parentName>');
      expect(output()).toContain('<memberType>instance</memberType>');
      expect(output()).toContain('<createdAt>2026-01-01T00:00:00.000Z</createdAt>');
      expect(output()).not.toContain('\x1b[');
    });

    it('omits fields the registry entry does not have instead of printing empty elements', async () => {
      command = new FindMethodCommand(managerFor({ exact: loadJson }));

      await command.execute(['DataProcessor.loadJSON']);

      expect(output()).not.toContain('<parent>');
      expect(output()).not.toContain('<memberType>');
      expect(output()).not.toContain('<tags>');
    });

    it('lists every match for a multi-result search', async () => {
      command = new FindMethodCommand(managerFor({ search: [loadCsv, loadJson] }));

      const result = await command.execute(['load']);

      expect(result.exitCode).toBe(0);
      expect(output()).toContain('<totalMatches>2</totalMatches>');
      expect(output()).toContain('<matches count="2">');
      expect(output()).toContain('<id>processor-load-json</id>');
    });

    it('prints the colored text with --human and still finds the query after the flag', async () => {
      command = new FindMethodCommand(managerFor({ exact: loadCsv }));

      await command.execute(['--human', 'DataProcessor.loadCSV']);

      expect(output()).toContain('Search: DataProcessor.loadCSV');
      expect(output()).toContain('File:       src/processor.ts');
      expect(output()).toContain('Parent:     processor (DataProcessor)');
      expect(output()).toContain('\x1b[');
      expect(output()).not.toContain('<method-search>');
    });

    it('still requires a query in both formats', async () => {
      command = new FindMethodCommand(managerFor({}));

      const xml = await command.execute([]);
      const human = await command.execute(['--human']);

      expect(xml.exitCode).toBe(1);
      expect(human.exitCode).toBe(1);
    });
  });
});
