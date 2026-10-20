/**
 * Tests for ParallelWorkCommand
 * @testScenario Default output is an XML document for each analysis mode
 * @testScenario --human keeps the colored report
 */

import { ParallelWorkCommand } from '../../commands/ParallelWorkCommand';
import { DatabaseManager } from '../../storage/DatabaseManager';

jest.mock('../../storage/DatabaseManager', () => ({
  DatabaseManager: jest.fn(),
}));

const ANSI = '\x1b[';

function symbolRow(id: string) {
  return {
    id,
    name: id,
    type: 'class',
    file_path: `src/${id}.ts`,
    line: 1,
    column: 0,
    is_exported: 1,
    is_public: 1,
    summary: null,
  };
}

describe('ParallelWorkCommand', () => {
  let command: ParallelWorkCommand;
  let logSpy: jest.SpyInstance;

  const output = () => logSpy.mock.calls.map((call) => call.join(' ')).join('\n');

  beforeEach(() => {
    // a -> b -> c, plus an unrelated d
    (DatabaseManager as unknown as jest.Mock).mockImplementation(() => ({
      getGraphData: () => ({
        symbols: ['a', 'b', 'c', 'd'].map(symbolRow),
        dependencies: [
          { symbol_id: 'a', target: 'b', type: 'dependsOn' },
          { symbol_id: 'b', target: 'c', type: 'dependsOn' },
        ],
      }),
      close: jest.fn(),
    }));
    command = new ParallelWorkCommand();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('parallel-work');
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

    it('keeps the missing --working error as a plain error message', async () => {
      const result = await command.execute([]);

      expect(result.exitCode).toBe(1);
      expect(output()).toContain('No working modules specified');
      expect(output()).not.toContain('<parallel-work>');
    });

    it('prints the full report as XML by default', async () => {
      const result = await command.execute(['--working', 'a,d']);
      const xml = output();

      expect(result.exitCode).toBe(0);
      expect(xml).not.toContain(ANSI);
      expect(xml.startsWith('<parallel-work>')).toBe(true);
      expect(xml.endsWith('</parallel-work>')).toBe(true);
      expect(xml).toContain('<command>full-report</command>');
      expect(xml).toContain('<workingModules>a,d</workingModules>');
      expect(xml).toContain('<availableModules count=');
      expect(xml).toContain('<conflicts count="0">');
      expect(xml).toContain('<parallelZones count=');
      expect(xml).not.toContain('Graph loaded');
    });

    it('reports conflicts with resolution options in XML', async () => {
      const result = await command.execute(['conflicts', '--working', 'a,b']);
      const xml = output();

      expect(result.exitCode).toBe(0);
      expect(xml).toContain('<command>conflicts</command>');
      expect(xml).toContain('<conflicts count="1">');
      expect(xml).toContain('<type>direct</type>');
      expect(xml).toContain('<resolutionOptions count="3">');
      expect(xml).toContain('<option>Work on b first (dependency)</option>');
    });

    it('reports barrier suggestions in XML', async () => {
      const result = await command.execute(['suggest-barriers', '--working', 'a,b']);
      const xml = output();

      expect(result.exitCode).toBe(0);
      expect(xml).toContain('<command>suggest-barriers</command>');
      expect(xml).toContain('<barrierSuggestions count=');
    });

    it('prints the colored report with --human', async () => {
      const result = await command.execute(['conflicts', '--working', 'a,b', '--human']);
      const text = output();

      expect(result.exitCode).toBe(0);
      expect(text).toContain('TSDoc Edge - Parallel Work Detection');
      expect(text).toContain('Resolution options:');
      expect(text).toContain('1. Work on b first (dependency)');
      expect(text).toContain(ANSI);
      expect(text).not.toContain('<parallel-work>');
    });
  });
});
