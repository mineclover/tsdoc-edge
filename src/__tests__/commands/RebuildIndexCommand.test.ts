/**
 * Tests for RebuildIndexCommand
 */

import { RebuildIndexCommand } from '../../commands/RebuildIndexCommand';
import type { DatabaseManager } from '../../storage/DatabaseManager';

const ANSI = '\x1b[';

function createDbManager(overrides: Record<string, unknown> = {}): DatabaseManager {
  return {
    getStatistics: jest.fn().mockReturnValue({ totalSymbols: 42 }),
    rebuildFTS5Index: jest.fn().mockReturnValue({ symbolsFts: 42, enhancedDocsFts: 7 }),
    querySymbols: jest.fn().mockReturnValue([{ name: 'Alpha' }]),
    searchSymbols: jest.fn().mockReturnValue([{ name: 'Alpha' }, { name: 'AlphaTwo' }]),
    close: jest.fn(),
    ...overrides,
  } as unknown as DatabaseManager;
}

describe('RebuildIndexCommand', () => {
  let command: RebuildIndexCommand;
  let consoleSpy: jest.SpyInstance;

  const output = (): string => consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n');

  beforeEach(() => {
    command = new RebuildIndexCommand();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('rebuild-index');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
      expect(output()).toContain('--human');
    });
  });

  describe('XML output (default)', () => {
    it('should print only an XML document', async () => {
      const db = createDbManager();

      const result = await new RebuildIndexCommand(db).execute([]);
      const out = output();

      expect(result.exitCode).toBe(0);
      expect(out.startsWith('<rebuild-results>')).toBe(true);
      expect(out.trimEnd().endsWith('</rebuild-results>')).toBe(true);
      expect(out).toContain('<symbolsInDatabase>42</symbolsInDatabase>');
      expect(out).toContain('<symbolsFtsEntries>42</symbolsFtsEntries>');
      expect(out).toContain('<enhancedDocsFtsEntries>7</enhancedDocsFtsEntries>');
      expect(out).toContain('<countsMatch>true</countsMatch>');
      expect(out).toContain('<query>Alpha</query>');
      expect(out).toContain('<resultCount>2</resultCount>');
      expect(out).not.toContain(ANSI);
    });

    it('should report a count mismatch and a skipped search test', async () => {
      const db = createDbManager({
        rebuildFTS5Index: jest.fn().mockReturnValue({ symbolsFts: 40, enhancedDocsFts: 0 }),
        querySymbols: jest.fn().mockReturnValue([]),
      });

      const result = await new RebuildIndexCommand(db).execute([]);
      const out = output();

      expect(result.exitCode).toBe(0);
      expect(out).toContain('<countsMatch>false</countsMatch>');
      expect(out).toContain('<ran>false</ran>');
    });

    it('should keep failing when the search test fails after the rebuild', async () => {
      const db = createDbManager({
        searchSymbols: jest.fn().mockImplementation(() => {
          throw new Error('fts broken');
        }),
      });

      const result = await new RebuildIndexCommand(db).execute([]);

      expect(result.exitCode).toBe(1);
      expect(output()).toContain('Search test failed');
      expect(output()).not.toContain('<rebuild-results>');
    });
  });

  describe('--human output', () => {
    it('should keep the colored terminal report', async () => {
      const db = createDbManager();

      const result = await new RebuildIndexCommand(db).execute(['--human']);
      const out = output();

      expect(result.exitCode).toBe(0);
      expect(out).toContain('TSDoc Edge - Rebuild FTS5 Index');
      expect(out).toContain('Symbols FTS index');
      expect(out).toContain('Index counts match database counts');
      expect(out).toContain('Search test passed (query: "Alpha", results: 2)');
      expect(out).toContain('FTS5 index rebuild complete!');
      expect(out).toContain(ANSI);
      expect(out).not.toContain('<rebuild-results>');
    });

    it('should warn about count mismatches', async () => {
      const db = createDbManager({
        rebuildFTS5Index: jest.fn().mockReturnValue({ symbolsFts: 40, enhancedDocsFts: 0 }),
      });

      await new RebuildIndexCommand(db).execute(['--human']);

      expect(output()).toContain('Symbol count mismatch (DB: 42, FTS: 40)');
    });
  });
});
