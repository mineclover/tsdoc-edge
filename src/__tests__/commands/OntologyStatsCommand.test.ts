/**
 * Tests for OntologyStatsCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { OntologyStatsCommand } from '../../commands/OntologyStatsCommand';
import { DatabaseManager } from '../../storage/DatabaseManager';
import type { Symbol } from '../../types/graph';

function symbol(id: string, name: string, type: string): Symbol {
  return {
    id,
    name,
    type,
    filePath: `src/${name.toLowerCase()}.ts`,
    line: 1,
    column: 1,
    isExported: true,
    isPublic: true,
    tests: [],
    designDecisions: [],
  } as Symbol;
}

describe('OntologyStatsCommand', () => {
  let command: OntologyStatsCommand;

  beforeEach(() => {
    command = new OntologyStatsCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('ontology-stats');
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
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ontology-stats-'));
      const db = new DatabaseManager(path.join(tempDir, '.tsdoc.db'));
      db.insertSymbol(symbol('a-class-a', 'A', 'class'), 0);
      db.insertSymbol(symbol('b-class-b', 'B', 'class'), 1);
      db.insertSymbol(symbol('c-function-c', 'C', 'function'), 2);
      db.insertUnifiedRelationship({
        id: 'rel-1',
        type: 'code-dependency',
        category: 'structural',
        fromSymbols: ['a-class-a'],
        toSymbols: ['b-class-b'],
        direction: 'unidirectional',
        strength: 'strong',
        evidence: [],
        discoveredBy: 'test',
        confidence: 1,
      });
      db.insertUnifiedRelationship({
        id: 'rel-2',
        type: 'calls',
        category: 'behavioral',
        fromSymbols: ['b-class-b'],
        toSymbols: ['c-function-c'],
        direction: 'unidirectional',
        strength: 'medium',
        evidence: [],
        discoveredBy: 'test',
        confidence: 0.8,
        properties: { inferred: true },
      });
      db.close();
      process.chdir(tempDir);
      command = new OntologyStatsCommand();
      log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    afterEach(() => {
      jest.restoreAllMocks();
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('prints the statistics as XML by default', async () => {
      const result = await command.execute([]);

      expect(result.exitCode).toBe(0);
      const xml = output();
      expect(xml.startsWith('<ontology-statistics>')).toBe(true);
      expect(xml.endsWith('</ontology-statistics>')).toBe(true);
      expect(xml).toContain('<totalNodes>3</totalNodes>');
      expect(xml).toContain('<totalRelationships>2</totalRelationships>');
      expect(xml).toContain('<explicitRelationships>1</explicitRelationships>');
      expect(xml).toContain('<inferredPercent>50</inferredPercent>');
      expect(xml).toContain('<nodeTypes count="2">');
      expect(xml).toContain('<type>class</type>');
      expect(xml).toContain('<percent>66.7</percent>');
      expect(xml).toContain('<relationshipCategories count="2">');
      expect(xml).toContain('<relationshipStrengths count="3">');
      expect(xml).toContain('<strength>weak</strength>');
      expect(xml).toContain('<relationshipDirections count="3">');
      expect(xml).not.toContain('<mermaid>');
      expect(xml).not.toContain('\x1b[');
    });

    it('includes the Mermaid diagram in the XML with --mermaid', async () => {
      await command.execute(['--mermaid']);

      expect(output()).toContain('<mermaid>');
      expect(output()).toContain('graph TB');
      expect(output()).toContain('N_class');
    });

    it('keeps the colored report behind --human', async () => {
      const result = await command.execute(['--human']);

      expect(result.exitCode).toBe(0);
      expect(output()).toContain('Ontology Model Statistics');
      expect(output()).toContain('Graph Overview');
      expect(output()).toContain('Node Distribution by Type');
      expect(output()).not.toContain('<ontology-statistics>');
    });

    it('keeps the Mermaid diagram of the colored report with --human --mermaid', async () => {
      await command.execute(['--human', '--mermaid']);

      expect(output()).toContain('Ontology Model Diagram');
      expect(output()).toContain('```mermaid');
      expect(output()).toContain('graph TB');
      expect(output()).toContain('Tip: Copy the Mermaid diagram');
    });

    it('keeps --json as the machine format', async () => {
      await command.execute(['--json']);

      const parsed = JSON.parse(output());
      expect(parsed.nodes.total).toBe(3);
      expect(parsed.relationships.total).toBe(2);
    });
  });
});
