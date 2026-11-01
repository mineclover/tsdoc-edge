/**
 * Tests for OntologyStatsCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { OntologyStatsCommand } from '../../commands/OntologyStatsCommand';
import { ConfigManager } from '../../config/ConfigManager';
import {
  type CanonicalGraphEdge,
  type CanonicalGraphNode,
  type CanonicalProjectGraph,
  canonicalProjectGraphFingerprint,
} from '../../indexer';
import { DatabaseManager } from '../../storage/DatabaseManager';
import { GraphRepository } from '../../storage/GraphRepository';

describe('OntologyStatsCommand', () => {
  let command: OntologyStatsCommand;
  let tempDir: string;
  const originalCwd = process.cwd();
  const originalCanonicalEnv = process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ontology-stats-'));
    process.chdir(tempDir);
    ConfigManager.reset();
    delete process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB;
    command = new OntologyStatsCommand();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalCanonicalEnv === undefined) {
      delete process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB;
    } else {
      process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB = originalCanonicalEnv;
    }
    process.chdir(originalCwd);
    ConfigManager.reset();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('ontology-stats');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toContain('statistics');
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
    });

    it('rejects unknown flags fail-closed', async () => {
      const result = await command.execute(['--unknown-flag']);
      expect(result.exitCode).toBe(1);
    });

    it('combines Canonical @ttsc/graph edges with non-duplicate Enrichment testing relationships', async () => {
      const db = new DatabaseManager(
        path.join(tempDir, '.tsdoc.db'),
        path.join(tempDir, '.tsdoc', 'jsonl')
      );
      db.insertSymbol(
        {
          id: 'test-1',
          name: 'should work',
          type: 'test-case',
          filePath: 'src/a.test.ts',
          line: 5,
          column: 1,
          isExported: false,
          isPublic: false,
          summary: '',
          tests: [],
          designDecisions: [],
          metadata: {},
        },
        1
      );
      db.insertUnifiedRelationship({
        id: 'rel-dup-struct',
        type: 'code-dependency',
        category: 'structural',
        fromSymbols: ['a'],
        toSymbols: ['b'],
        direction: 'unidirectional',
        strength: 'strong',
        discoveredBy: 'legacy',
        confidence: 1,
        evidence: [],
      });
      db.insertUnifiedRelationship({
        id: 'rel-test-1',
        type: 'test-coverage',
        category: 'testing',
        fromSymbols: ['test-1'],
        toSymbols: ['a'],
        direction: 'unidirectional',
        strength: 'strong',
        discoveredBy: 'test-analyzer',
        confidence: 1,
        evidence: [],
      });
      db.close();

      const repo = new GraphRepository(path.join(tempDir, '.tsdoc', 'canonical-graph.db'));
      const nodes: CanonicalGraphNode[] = [
        {
          id: 'src/a.ts#A:class',
          sourceId: 'src/a.ts#A:class',
          kind: 'class',
          name: 'A',
          qualifiedName: 'A',
          file: 'src/a.ts',
          exported: true,
        },
        {
          id: 'src/b.ts#B:class',
          sourceId: 'src/b.ts#B:class',
          kind: 'class',
          name: 'B',
          qualifiedName: 'B',
          file: 'src/b.ts',
          exported: true,
        },
      ];
      const edges: CanonicalGraphEdge[] = [
        {
          kind: 'calls',
          from: 'src/a.ts#A:class',
          to: 'src/b.ts#B:class',
        },
      ];
      const graph: CanonicalProjectGraph = {
        contractVersion: '1.0',
        rootDir: tempDir,
        tsconfigPath: path.join(tempDir, 'tsconfig.json'),
        nodes,
        edges,
        provenance: { adapter: 'fixture', producer: '@ttsc/graph' },
        fingerprint: canonicalProjectGraphFingerprint(nodes, edges),
      };
      repo.replaceActiveRevision(graph);
      repo.close();

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const res = await command.execute(['--json']);
      expect(res.exitCode).toBe(0);
      const payload = JSON.parse(logSpy.mock.calls.flat().join('\n')) as {
        source: string;
        nodes: { total: number; byType: Record<string, number> };
        relationships: {
          total: number;
          canonicalEdges: number;
          enrichmentRelationships: number;
          byType: Record<string, number>;
        };
      };
      expect(payload.source).toBe('canonical-graph+enrichment');
      expect(payload.nodes.total).toBe(3); // 2 canonical classes + 1 test-case
      expect(payload.relationships.canonicalEdges).toBe(1);
      expect(payload.relationships.enrichmentRelationships).toBe(1); // legacy structural skipped
      expect(payload.relationships.total).toBe(2);
      expect(payload.relationships.byType.calls).toBe(1);
      expect(payload.relationships.byType['test-coverage']).toBe(1);
    });
  });
});
