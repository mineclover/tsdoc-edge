/**
 * Tests for TreeCommand
 * @testScenario Default output is an XML document
 * @testScenario --human keeps the colored tree
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { TreeCommand } from '../../commands/TreeCommand';
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
    ...overrides,
  };
}

describe('TreeCommand', () => {
  let command: TreeCommand;
  let tempDir: string;
  let logSpy: jest.SpyInstance;
  const originalCwd = process.cwd();

  const rows = [
    symbolRow({ id: 'a-class-foo', name: 'Foo', type: 'class', line: 1 }),
    symbolRow({ id: 'a-method-foo-run', name: 'Foo.run', type: 'method', line: 5 }),
    symbolRow({ id: 'a-method-foo-stop', name: 'Foo.stop', type: 'method', line: 3 }),
    symbolRow({ id: 'a-function-helper', name: 'helper & <co>', type: 'function', line: 20 }),
    symbolRow({
      id: 'b-interface-bar',
      name: 'Bar',
      type: 'interface',
      file_path: 'lib/b.ts',
      line: 2,
    }),
  ];

  const createDb = (symbols: unknown[]) =>
    ({
      getAllSymbolRows: jest.fn(() => symbols),
      close: jest.fn(),
    }) as unknown as DatabaseManager;

  const output = () => logSpy.mock.calls.map((call) => call.join(' ')).join('\n');

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-command-'));
    // checkDatabaseExists only looks for the database file
    fs.writeFileSync(path.join(tempDir, '.tsdoc.db'), '');
    process.chdir(tempDir);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('metadata', () => {
    it('should return command name', () => {
      command = new TreeCommand();
      expect(command.getName()).toBe('tree');
    });

    it('should return command description', () => {
      command = new TreeCommand();
      expect(command.getDescription()).toContain('hierarchy');
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      command = new TreeCommand();
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
      expect(output()).toContain('--human');
    });

    it('prints an XML document by default', async () => {
      command = new TreeCommand(createDb(rows));

      const result = await command.execute([]);
      const xml = output();

      expect(result.exitCode).toBe(0);
      expect(xml).not.toContain(ANSI);
      expect(xml.startsWith('<symbol-tree>')).toBe(true);
      expect(xml.endsWith('</symbol-tree>')).toBe(true);
      expect(xml).toContain('<totalSymbols>5</totalSymbols>');
      expect(xml).toContain('<tree count="3">');
      // Special characters in names are escaped
      expect(xml).toContain('<name>helper &amp; &lt;co&gt;</name>');
      // Members are nested under their container, ordered by line
      expect(xml).toContain('<children count="2">');
      expect(xml.indexOf('<name>stop</name>')).toBeLessThan(xml.indexOf('<name>run</name>'));
      expect(xml).not.toContain('Symbol Hierarchy Tree');
    });

    it('reports the path filter in the XML summary', async () => {
      command = new TreeCommand(createDb(rows));

      await command.execute(['lib/']);
      const xml = output();

      expect(xml).toContain('<totalSymbols>1</totalSymbols>');
      expect(xml).toContain('<filter>lib/</filter>');
      expect(xml).toContain('<name>Bar</name>');
      expect(xml).not.toContain('<name>Foo</name>');
    });

    it('does not mistake --human for the path filter', async () => {
      command = new TreeCommand(createDb(rows));

      await command.execute(['--human', 'lib/']);
      const text = output();

      expect(text).toContain('Bar');
      expect(text).not.toContain('Foo');
    });

    it('prints an empty XML document when nothing matches', async () => {
      command = new TreeCommand(createDb(rows));

      const result = await command.execute(['does-not-match']);
      const xml = output();

      expect(result.exitCode).toBe(0);
      expect(xml).toContain('<totalSymbols>0</totalSymbols>');
      expect(xml).toContain('<tree count="0">');
      expect(xml).not.toContain(ANSI);
    });

    it('prints the colored tree with --human', async () => {
      command = new TreeCommand(createDb(rows));

      const result = await command.execute(['--human']);
      const text = output();

      expect(result.exitCode).toBe(0);
      expect(text).toContain('Symbol Hierarchy Tree');
      expect(text).toContain(ANSI);
      expect(text).toContain('└── ');
      expect(text).toContain('Total symbols: ');
      expect(text).not.toContain('<symbol-tree>');
    });

    it('keeps the human messages for empty results', async () => {
      command = new TreeCommand(createDb(rows));

      await command.execute(['does-not-match', '--human']);
      const text = output();

      expect(text).toContain('Filtering by path: does-not-match');
      expect(text).toContain('No symbols found matching: does-not-match');
    });
  });
});
