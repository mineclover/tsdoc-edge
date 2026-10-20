/**
 * Tests for OntologyListCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { OntologyListCommand } from '../../commands/OntologyListCommand';
import { DatabaseManager } from '../../storage/DatabaseManager';
import type { Symbol } from '../../types/graph';

function symbol(id: string, name: string, type: string, line: number): Symbol {
  return {
    id,
    name,
    type,
    filePath: `src/${name.toLowerCase()}.ts`,
    line,
    column: 1,
    isExported: true,
    isPublic: true,
    tests: [],
    designDecisions: [],
  } as Symbol;
}

describe('OntologyListCommand', () => {
  let command: OntologyListCommand;

  beforeEach(() => {
    command = new OntologyListCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('ontology-list');
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

    it('documents --human in the help text', async () => {
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      try {
        await command.execute(['--help']);
        expect(log.mock.calls.flat().join('\n')).toContain('--human');
      } finally {
        log.mockRestore();
      }
    });
  });

  describe('output formats', () => {
    const originalCwd = process.cwd();
    let tempDir: string;
    let log: jest.SpyInstance;

    const output = () => log.mock.calls.flat().join('\n');

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ontology-list-'));
      const db = new DatabaseManager(path.join(tempDir, '.tsdoc.db'));
      db.insertSymbol(symbol('a-class-a', 'A', 'class', 3), 0);
      db.insertSymbol(symbol('b-class-b', 'B', 'class', 4), 1);
      db.insertSymbol(symbol('c-class-c', 'C', 'class', 5), 2);
      db.insertSymbol(symbol('d-function-d', 'D', 'function', 6), 3);
      db.insertUnifiedRelationship({
        id: 'rel-1',
        type: 'code-dependency',
        category: 'structural',
        fromSymbols: ['a-class-a'],
        toSymbols: ['b-class-b', 'c-class-c'],
        direction: 'unidirectional',
        strength: 'strong',
        evidence: [],
        discoveredBy: 'test',
        confidence: 0.9,
        description: 'A uses <B> & C',
      });
      db.close();
      process.chdir(tempDir);
      command = new OntologyListCommand();
      log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    afterEach(() => {
      jest.restoreAllMocks();
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('lists nodes as XML by default', async () => {
      const result = await command.execute(['--nodes', 'class']);

      expect(result.exitCode).toBe(0);
      const xml = output();
      expect(xml.startsWith('<ontology-node-list>')).toBe(true);
      expect(xml.endsWith('</ontology-node-list>')).toBe(true);
      expect(xml).toContain('<nodeType>class</nodeType>');
      expect(xml).toContain('<total>3</total>');
      expect(xml).toContain('<count>3</count>');
      expect(xml).toContain('<hasMore>false</hasMore>');
      expect(xml).not.toContain('<nextOffset>');
      expect(xml).toContain('<nodes count="3">');
      expect(xml).toContain('<id>a-class-a</id>');
      expect(xml).toContain('<filePath>src/a.ts</filePath>');
      expect(xml).not.toContain('\x1b[');
    });

    it('reports pagination in the XML summary', async () => {
      await command.execute(['--nodes', 'class', '--limit', '2']);

      expect(output()).toContain('<count>2</count>');
      expect(output()).toContain('<hasMore>true</hasMore>');
      expect(output()).toContain('<nextOffset>2</nextOffset>');
    });

    it('emits an empty XML document when no node matches', async () => {
      const result = await command.execute(['--nodes', 'nothing']);

      expect(result.exitCode).toBe(0);
      expect(output()).toContain('<total>0</total>');
      expect(output()).toContain('<nodes count="0">');
      expect(output()).not.toContain('No nodes found');
    });

    it('lists relationships as XML by default', async () => {
      const result = await command.execute(['--rels', 'code-dependency']);

      expect(result.exitCode).toBe(0);
      const xml = output();
      expect(xml.startsWith('<ontology-relationship-list>')).toBe(true);
      expect(xml).toContain('<filterType>code-dependency</filterType>');
      expect(xml).not.toContain('<filterCategory>');
      expect(xml).not.toContain('<filterStrength>');
      expect(xml).toContain('<relationships count="1">');
      expect(xml).toContain('<from>a-class-a</from>');
      expect(xml).toContain('<to>b-class-b,c-class-c</to>');
      expect(xml).toContain('<confidence>0.9</confidence>');
      expect(xml).toContain('<inferred>false</inferred>');
      expect(xml).toContain('<description>A uses &lt;B&gt; &amp; C</description>');
      expect(xml).not.toContain('\x1b[');
    });

    it('filters relationships by category and strength', async () => {
      await command.execute(['--category', 'structural', '--strength', 'strong']);

      expect(output()).toContain('<filterCategory>structural</filterCategory>');
      expect(output()).toContain('<filterStrength>strong</filterStrength>');
      expect(output()).toContain('<total>1</total>');
    });

    it('keeps the colored table behind --human', async () => {
      const result = await command.execute(['--nodes', 'class', '--human']);

      expect(result.exitCode).toBe(0);
      expect(output()).toContain('Nodes of type: class');
      expect(output()).toContain('Showing: 3');
      expect(output()).not.toContain('<ontology-node-list>');
    });

    it('keeps the relationship table behind --human', async () => {
      await command.execute(['--human', '--rels', 'code-dependency']);

      expect(output()).toContain('Relationships of type: code-dependency');
      expect(output()).toContain('Category:');
      expect(output()).not.toContain('<ontology-relationship-list>');
    });

    it('keeps the table behind an explicit --format table', async () => {
      await command.execute(['--nodes', 'class', '--format', 'table']);

      expect(output()).toContain('Nodes of type: class');
    });

    it('keeps --format json and --format csv machine formats, even with --human', async () => {
      await command.execute(['--nodes', 'class', '--format', 'json', '--human']);
      const parsed = JSON.parse(output());
      expect(parsed.total).toBe(3);
      expect(parsed.nodes).toHaveLength(3);

      log.mockClear();
      await command.execute(['--nodes', 'class', '--format', 'csv']);
      expect(output().split('\n')[0]).toBe('id,name,type,kind,filePath,line');
    });

    it('still requires something to list in both modes', async () => {
      const result = await command.execute([]);

      expect(result.exitCode).toBe(1);
      expect(output()).toContain('Please specify what to list');
    });
  });
});
