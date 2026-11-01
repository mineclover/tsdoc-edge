/**
 * Tests for RelationshipStatsCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { RelationshipStatsCommand } from '../../commands/RelationshipStatsCommand';
import { ConfigManager } from '../../config/ConfigManager';
import {
  type CanonicalGraphEdge,
  type CanonicalGraphNode,
  type CanonicalProjectGraph,
  canonicalProjectGraphFingerprint,
} from '../../indexer';
import { GraphRepository } from '../../storage/GraphRepository';

describe('RelationshipStatsCommand', () => {
  let command: RelationshipStatsCommand;
  let tempDir: string;
  const originalCwd = process.cwd();
  const originalCanonicalEnv = process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'relationship-stats-'));
    process.chdir(tempDir);
    ConfigManager.reset();
    delete process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB;
    command = new RelationshipStatsCommand();
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
      expect(command.getName()).toBe('relationship-stats');
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

    it('rejects unknown flags fail-closed', async () => {
      const result = await command.execute(['--unknown-flag']);
      expect(result.exitCode).toBe(1);
    });

    it('reports Canonical @ttsc/graph edge statistics in --json and human modes', async () => {
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
          id: 'src/b.ts#B:interface',
          sourceId: 'src/b.ts#B:interface',
          kind: 'interface',
          name: 'B',
          qualifiedName: 'B',
          file: 'src/b.ts',
          exported: true,
        },
      ];
      const edges: CanonicalGraphEdge[] = [
        {
          kind: 'implements',
          from: 'src/a.ts#A:class',
          to: 'src/b.ts#B:interface',
        },
        {
          kind: 'type_ref',
          from: 'src/a.ts#A:class',
          to: 'src/b.ts#B:interface',
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
      const jsonRes = await command.execute(['--json']);
      expect(jsonRes.exitCode).toBe(0);
      const payload = JSON.parse(logSpy.mock.calls.flat().join('\n')) as {
        canonicalGraph: { available: boolean; edges: number; byKind: Record<string, number> };
      };
      expect(payload.canonicalGraph.available).toBe(true);
      expect(payload.canonicalGraph.edges).toBe(2);
      expect(payload.canonicalGraph.byKind.implements).toBe(1);
      expect(payload.canonicalGraph.byKind.type_ref).toBe(1);

      logSpy.mockClear();
      const humanRes = await command.execute(['--detailed']);
      expect(humanRes.exitCode).toBe(0);
      expect(logSpy.mock.calls.flat().join('\n')).toContain('[ttsc/graph]');
    });
  });
});
