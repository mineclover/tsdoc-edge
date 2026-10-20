/**
 * Output modes of the relationship analysis commands
 * @testScenario Default output is one well-formed XML document
 * @testScenario --human keeps the colored terminal report
 * @testScenario Name auto-selection does not pollute XML output
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { RelationshipClustersCommand } from '../../commands/RelationshipClustersCommand';
import { RelationshipImpactCommand } from '../../commands/RelationshipImpactCommand';
import { RelationshipMetricsCommand } from '../../commands/RelationshipMetricsCommand';
import { RelationshipPathCommand } from '../../commands/RelationshipPathCommand';
import { DatabaseManager } from '../../storage/DatabaseManager';
import type { Symbol } from '../../types/graph';

const ANSI = '\u001b[';

describe('relationship analysis output modes', () => {
  let tempDir: string;
  const originalCwd = process.cwd();

  function symbol(id: string, name: string, type = 'class'): Symbol {
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

  function seed(db: DatabaseManager): void {
    for (const [id, name] of [
      ['a-class', 'Alpha'],
      ['b-class', 'Beta'],
      ['c-class', 'Gamma'],
      ['d-class', 'Delta'],
    ]) {
      db.insertSymbol(symbol(id, name), 0);
    }
    const edges: Array<[string, string, string]> = [
      ['a-class', 'b-class', 'structural'],
      ['b-class', 'c-class', 'structural'],
      ['a-class', 'c-class', 'semantic'],
      ['c-class', 'd-class', 'structural'],
    ];
    edges.forEach(([from, to, category], index) => {
      db.insertUnifiedRelationship({
        id: `rel-${index}`,
        type: 'code-dependency',
        category,
        fromSymbols: [from],
        toSymbols: [to],
        direction: 'unidirectional',
        strength: 'strong',
        evidence: [],
        discoveredBy: 'static-analysis',
        confidence: 1.0,
        properties: {},
      });
    });
  }

  async function run(
    command: { execute(args: string[]): Promise<{ exitCode: number }> },
    args: string[]
  ): Promise<{ exitCode: number; output: string }> {
    const lines: string[] = [];
    const log = jest.spyOn(console, 'log').mockImplementation((...parts: unknown[]) => {
      lines.push(parts.join(' '));
    });
    try {
      const result = await command.execute(args);
      return { exitCode: result.exitCode, output: lines.join('\n') };
    } finally {
      log.mockRestore();
    }
  }

  function expectXmlDocument(output: string, root: string): void {
    expect(output.startsWith(`<${root}>`)).toBe(true);
    expect(output.endsWith(`</${root}>`)).toBe(true);
    expect(output).not.toContain(ANSI);
  }

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'relationship-output-'));
    process.chdir(tempDir);
    const db = new DatabaseManager(path.join(tempDir, '.tsdoc.db'), path.join(tempDir, '.tsdoc'));
    seed(db);
    db.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('relationship-impact', () => {
    it('prints the impact as XML by default', async () => {
      const { exitCode, output } = await run(new RelationshipImpactCommand(), ['a-class']);

      expect(exitCode).toBe(0);
      expectXmlDocument(output, 'relationship-impact');
      expect(output).toContain('<symbolName>Alpha</symbolName>');
      expect(output).toContain('<affectedSymbols>3</affectedSymbols>');
      expect(output).toContain('<symbolId>d-class</symbolId>');
      expect(output).toContain('<riskLevel>Medium</riskLevel>');
    });

    it('keeps the colored report behind --human', async () => {
      const { exitCode, output } = await run(new RelationshipImpactCommand(), [
        'a-class',
        '--human',
      ]);

      expect(exitCode).toBe(0);
      expect(output).toContain('Impact Analysis: Alpha');
      expect(output).toContain('Change Risk Assessment');
      expect(output).not.toContain('<relationship-impact>');
    });

    it('reports an isolated symbol as an empty XML result', async () => {
      const { output } = await run(new RelationshipImpactCommand(), [
        'd-class',
        '--direction',
        'downstream',
      ]);

      expectXmlDocument(output, 'relationship-impact');
      expect(output).toContain('<affectedSymbols>0</affectedSymbols>');
      expect(output).toContain('<riskLevel>Low</riskLevel>');
    });

    it('does not print the auto-selection note into the XML document', async () => {
      const { exitCode, output } = await run(new RelationshipImpactCommand(), ['Alpha']);

      expect(exitCode).toBe(0);
      expectXmlDocument(output, 'relationship-impact');
      expect(output).not.toContain('Selected:');
    });

    it('prints the auto-selection note in --human mode', async () => {
      const { output } = await run(new RelationshipImpactCommand(), ['Alpha', '--human']);

      expect(output).toContain('Selected: Alpha (class)');
    });

    it('still fails with plain text when the symbol is unknown', async () => {
      const { exitCode, output } = await run(new RelationshipImpactCommand(), ['missing']);

      expect(exitCode).toBe(1);
      expect(output).toContain('Symbol not found: missing');
    });
  });

  describe('relationship-path', () => {
    it('prints the paths as XML by default', async () => {
      const { exitCode, output } = await run(new RelationshipPathCommand(), ['a-class', 'd-class']);

      expect(exitCode).toBe(0);
      expectXmlDocument(output, 'relationship-path');
      expect(output).toContain('<totalPaths>2</totalPaths>');
      expect(output).toContain('<shortestLength>2</shortestLength>');
      expect(output).toContain('<iterationLimitReached>false</iterationLimitReached>');
    });

    it('limits the shown paths with --shortest-only', async () => {
      const { output } = await run(new RelationshipPathCommand(), [
        'a-class',
        'd-class',
        '--shortest-only',
      ]);

      expect(output).toContain('<totalPaths>2</totalPaths>');
      expect(output).toContain('<shownPaths>1</shownPaths>');
    });

    it('reports no connection as an empty result', async () => {
      const { exitCode, output } = await run(new RelationshipPathCommand(), ['d-class', 'a-class']);

      expect(exitCode).toBe(0);
      expectXmlDocument(output, 'relationship-path');
      expect(output).toContain('<totalPaths>0</totalPaths>');
    });

    it('keeps the colored report behind --human', async () => {
      const { output } = await run(new RelationshipPathCommand(), [
        'a-class',
        'd-class',
        '--human',
      ]);

      expect(output).toContain('Paths: a-class');
      expect(output).toContain('Connection Paths');
      expect(output).not.toContain('<relationship-path>');
    });
  });

  describe('relationship-clusters', () => {
    it('prints the clusters as XML by default', async () => {
      const { exitCode, output } = await run(new RelationshipClustersCommand(), [
        '--min-size',
        '2',
      ]);

      expect(exitCode).toBe(0);
      expectXmlDocument(output, 'relationship-clusters');
      expect(output).toContain('<graphSymbols>4</graphSymbols>');
      expect(output).toMatch(/<totalClusters>[1-9]\d*<\/totalClusters>/);
      expect(output).toContain('<symbols count=');
    });

    it('lists every member with --detailed', async () => {
      const { output } = await run(new RelationshipClustersCommand(), [
        '--min-size',
        '2',
        '--detailed',
      ]);

      expect(output).toContain('<detailed>true</detailed>');
      for (const id of ['a-class', 'b-class', 'c-class', 'd-class']) {
        expect(output).toContain(`<symbolId>${id}</symbolId>`);
      }
    });

    it('prints an empty document when nothing meets the minimum size', async () => {
      const { exitCode, output } = await run(new RelationshipClustersCommand(), [
        '--min-size',
        '50',
      ]);

      expect(exitCode).toBe(0);
      expectXmlDocument(output, 'relationship-clusters');
      expect(output).toContain('<totalClusters>0</totalClusters>');
    });

    it('keeps the colored report behind --human', async () => {
      const { output } = await run(new RelationshipClustersCommand(), [
        '--min-size',
        '2',
        '--human',
      ]);

      expect(output).toContain('Architectural Cluster Analysis');
      expect(output).not.toContain('<relationship-clusters>');
    });
  });

  describe('relationship-metrics', () => {
    it('prints the ranked symbols as XML by default', async () => {
      const { exitCode, output } = await run(new RelationshipMetricsCommand(), ['--top', '2']);

      expect(exitCode).toBe(0);
      expectXmlDocument(output, 'relationship-metrics');
      expect(output).toContain('<totalSymbols>4</totalSymbols>');
      expect(output).toContain('<totalRelationships>4</totalRelationships>');
      expect(output).toContain('<symbols count="2">');
      expect(output).toContain('<interpretation>');
    });

    it('keeps the colored report behind --human', async () => {
      const { output } = await run(new RelationshipMetricsCommand(), ['--top', '2', '--human']);

      expect(output).toContain('Symbol Importance Analysis');
      expect(output).toContain('Graph Statistics');
      expect(output).not.toContain('<relationship-metrics>');
    });

    it('rejects an unknown metric with plain text', async () => {
      const { exitCode, output } = await run(new RelationshipMetricsCommand(), [
        '--metric',
        'bogus',
      ]);

      expect(exitCode).toBe(1);
      expect(output).toContain('Invalid metric: bogus');
    });
  });
});
